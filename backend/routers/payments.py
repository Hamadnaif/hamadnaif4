import json
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from pymongo import ReturnDocument

from db import db, to_oid
from auth import get_current_user
from payment_orders import PaymentOrder, now, owned_order, require_enabled, settle, status_response, validate_charge
import tap_service

router = APIRouter(prefix="/payments", tags=["payments"])


async def _retrieve(charge_id):
    try:
        return await tap_service.retrieve_charge(charge_id)
    except tap_service.TapError as exc:
        raise HTTPException(exc.status_code, str(exc)) from None


async def _start_charge(order, user):
    current = datetime.now(timezone.utc)
    if order.creation_started_at and current - datetime.fromisoformat(order.creation_started_at) >= timedelta(hours=23):
        raise HTTPException(409, "انتهت مهلة إعادة المحاولة الآمنة لهذا الطلب. راجع الدعم قبل إنشاء دفعة جديدة.")
    cutoff = (current - timedelta(seconds=60)).isoformat()
    claimed = await db.orders.find_one_and_update(
        {"_id": to_oid(order.id), "payment_id": None, "$or": [
            {"status": {"$in": ["pending_payment", "verification_required"]}},
            {"status": "creating", "creation_locked_at": {"$lt": cutoff}},
        ]},
        {"$set": {"status": "creating", "creation_started_at": order.creation_started_at or now(),
                  "creation_locked_at": now()}}, return_document=ReturnDocument.AFTER,
    )
    if not claimed:
        raise HTTPException(409, "جارٍ تجهيز أو التحقق من نفس الطلب. انتظر قليلًا ثم أعد المحاولة.")
    try:
        charge = await tap_service.create_charge(order, user)
        validate_charge(order.model_copy(update={"payment_id": charge["id"]}), charge)
        url = tap_service.checkout_url(charge) if charge.get("status") == "INITIATED" else None
        await db.orders.update_one({"_id": to_oid(order.id), "payment_id": None}, {"$set": {
            "payment_id": charge["id"], "checkout_url": url, "status": "redirect", "updated_at": now(),
        }})
        return charge
    except (tap_service.TapError, HTTPException) as exc:
        await db.orders.update_one({"_id": to_oid(order.id), "payment_id": None},
                                  {"$set": {"status": "verification_required", "updated_at": now()}})
        if isinstance(exc, tap_service.TapError):
            raise HTTPException(exc.status_code, str(exc)) from None
        raise


@router.post("/tap/start/{order_id}")
async def tap_start(order_id: str, user: dict = Depends(get_current_user)):
    await require_enabled()
    order = await owned_order(order_id, user["id"])
    if order.fulfilled_at:
        raise HTTPException(409, "تم دفع هذا الطلب مسبقًا.")
    charge = await _retrieve(order.payment_id) if order.payment_id else await _start_charge(order, user)
    order = await owned_order(order_id, user["id"])
    result = await settle(order, charge)
    if result["status"] == "paid":
        return {"completed": True, "order_id": order.id, "mode": "test"}
    if result["status"] in {"failed", "cancelled"}:
        raise HTTPException(409, "لم تكتمل هذه الدفعة. يمكنك اختيار الباقة مجددًا لإنشاء طلب جديد.")
    try:
        url = tap_service.checkout_url(charge)
    except tap_service.TapError as exc:
        raise HTTPException(exc.status_code, str(exc)) from None
    return {"redirect_url": url, "charge_id": charge["id"], "order_id": order.id, "mode": "test"}


class VerifyBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tap_id: str = Field(pattern=r"^chg_[A-Za-z0-9_-]{1,160}$")


@router.post("/tap/verify")
async def tap_verify(body: VerifyBody, user: dict = Depends(get_current_user)):
    doc = await db.orders.find_one({"payment_id": body.tap_id, "owner_id": user["id"], "provider": "tap"})
    if not doc:
        raise HTTPException(404, "عملية الدفع غير موجودة لهذا الحساب.")
    order = PaymentOrder.from_mongo(doc)
    return await settle(order, await _retrieve(body.tap_id))


@router.post("/tap/webhook")
async def tap_webhook(request: Request):
    raw = await request.body()
    if len(raw) > 65536:
        raise HTTPException(413, "حجم الإشعار غير مسموح.")
    try:
        event = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(400, "إشعار دفع غير صالح.") from None
    # Authenticate the actual posted event before looking up or fetching any charge.
    if not tap_service.valid_tap_hash(event, request.headers.get("hashstring")):
        raise HTTPException(400, "توقيع إشعار الدفع غير صالح.")
    if event.get("live_mode") is not False or not tap_service.valid_charge_id(event.get("id")):
        raise HTTPException(400, "إشعار غير تابع للدفع التجريبي.")
    doc = await db.orders.find_one({"payment_id": event["id"], "provider": "tap"})
    if not doc:
        raise HTTPException(404, "الطلب غير موجود.")
    order = PaymentOrder.from_mongo(doc)
    validate_charge(order, event)
    await settle(order, await _retrieve(event["id"]))
    return {"received": True}


@router.get("/order-status/{order_id}")
async def order_status(order_id: str, user: dict = Depends(get_current_user)):
    order = await owned_order(order_id, user["id"])
    if not order.payment_id:
        return status_response(order)
    return await settle(order, await _retrieve(order.payment_id))
