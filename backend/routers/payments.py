import os
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException
from pymongo import ReturnDocument

from db import db, to_oid
import moyasar_service

router = APIRouter(prefix="/payments", tags=["payments"])


def _now():
    return datetime.now(timezone.utc).isoformat()


async def _activate_subscription(order: dict):
    days = 365 if order.get("cycle") == "yearly" else 30
    renews = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    await db.users.update_one({"_id": to_oid(order["owner_id"])}, {"$set": {
        "plan_id": order["plan_id"], "plan_cycle": order.get("cycle"),
        "subscription_status": "active", "subscription_renews_at": renews,
    }})


async def verify_and_fulfill(order_ref: str, payment_id: str) -> dict:
    payment = await moyasar_service.get_payment(payment_id)
    order = await db.orders.find_one({"_id": to_oid(order_ref)})
    if not order:
        raise HTTPException(status_code=404, detail="طلب غير معروف")
    expected_amount = int(round(float(order["amount"]) * 100))
    meta_ref = (payment.get("metadata") or {}).get("order_ref")
    if not (payment.get("status") == "paid"
            and payment.get("amount") == expected_amount
            and payment.get("currency") == order.get("currency", "SAR")
            and meta_ref == order_ref):
        raise HTTPException(status_code=400, detail="الدفعة لا تطابق الطلب")
    # Atomic idempotency: only the first successful callback/webhook fulfills.
    claimed = await db.orders.find_one_and_update(
        {"_id": to_oid(order_ref), "status": {"$ne": "paid"}},
        {"$set": {"status": "paid", "payment_id": payment_id, "paid_at": _now()}},
        return_document=ReturnDocument.AFTER,
    )
    if claimed is None:
        return {"status": "already_processed"}
    if claimed.get("type") == "subscription":
        await _activate_subscription(claimed)
    return {"status": "fulfilled"}


@router.get("/verify")
async def verify(id: str):
    payment = await moyasar_service.get_payment(id)
    order_ref = (payment.get("metadata") or {}).get("order_ref")
    if not order_ref:
        raise HTTPException(status_code=400, detail="لا يوجد مرجع للطلب")
    result = await verify_and_fulfill(order_ref, id)
    return {"ok": result["status"] != "failed", **result}


@router.post("/webhook")
async def webhook(request: Request):
    body = await request.json()
    if not secrets.compare_digest(str(body.get("secret_token", "")),
                                  str(moyasar_service.WEBHOOK_SECRET or "")):
        raise HTTPException(status_code=401, detail="Invalid webhook secret")
    if body.get("type") != "payment_paid":
        return {"received": True}
    payment = body.get("data") or {}
    payment_id = payment.get("id")
    order_ref = (payment.get("metadata") or {}).get("order_ref")
    if not payment_id or not order_ref:
        raise HTTPException(status_code=400, detail="Malformed event")
    await verify_and_fulfill(order_ref, payment_id)
    return {"received": True}
