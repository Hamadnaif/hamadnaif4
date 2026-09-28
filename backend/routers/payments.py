import os
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse
from pymongo import ReturnDocument

from db import db, to_oid
from auth import get_current_user
import neoleap_service

router = APIRouter(prefix="/payments", tags=["payments"])


def _now():
    return datetime.now(timezone.utc).isoformat()


def _frontend() -> str:
    return os.environ.get("FRONTEND_URL", "").rstrip("/")


async def _activate_subscription(order: dict):
    days = 365 if order.get("cycle") == "yearly" else 30
    renews = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    await db.users.update_one({"_id": to_oid(order["owner_id"])}, {"$set": {
        "plan_id": order["plan_id"], "plan_cycle": order.get("cycle"),
        "subscription_status": "active", "subscription_renews_at": renews,
    }})


async def _fulfill(order_ref: str, callback: dict) -> str:
    """Verify the decrypted NeoLeap callback against the order and fulfill idempotently.
    Returns 'success' | 'failed'."""
    order = await db.orders.find_one({"_id": to_oid(order_ref)})
    if not order:
        return "failed"
    amt_ok = abs(float(callback.get("amt") or 0) - float(order["amount"])) < 0.01
    if not (callback.get("success") and amt_ok):
        await db.orders.update_one({"_id": to_oid(order_ref), "status": {"$ne": "paid"}},
                                   {"$set": {"status": "failed", "gateway_result": callback.get("result"), "updated_at": _now()}})
        return "failed"
    claimed = await db.orders.find_one_and_update(
        {"_id": to_oid(order_ref), "status": {"$ne": "paid"}},
        {"$set": {"status": "paid", "payment_id": callback.get("paymentId"),
                  "gateway_ref": callback.get("ref"), "gateway_auth": callback.get("auth"),
                  "paid_at": _now()}},
        return_document=ReturnDocument.AFTER,
    )
    if claimed is None:
        return "success"  # already processed
    if claimed.get("type") == "subscription":
        await _activate_subscription(claimed)
    return "success"


@router.get("/neoleap/start/{order_id}")
async def neoleap_start(order_id: str, user: dict = Depends(get_current_user)):
    if not neoleap_service.is_configured():
        raise HTTPException(status_code=503, detail="بوابة الدفع غير مفعّلة")
    order = await db.orders.find_one({"_id": to_oid(order_id)})
    if not order or order["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if order.get("status") == "paid":
        raise HTTPException(status_code=409, detail="تم دفع هذا الطلب مسبقًا")
    base = _frontend()
    callback = f"{base}/api/payments/neoleap/callback"
    try:
        res = await neoleap_service.create_payment(
            amount=order["amount"], track_id=order_id,
            response_url=callback, error_url=callback,
            udf={"udf1": order_id},
        )
    except Exception:
        raise HTTPException(status_code=502, detail="تعذّر بدء الدفع مع بوابة NeoLeap، حاول مرة أخرى.")
    await db.orders.update_one({"_id": to_oid(order_id)},
                               {"$set": {"payment_id": res["payment_id"], "status": "redirect", "updated_at": _now()}})
    return {"redirect_url": res["redirect_url"]}


async def _handle_callback(request: Request):
    form = {}
    try:
        form = dict(await request.form())
    except Exception:
        form = {}
    trandata = form.get("trandata") or request.query_params.get("trandata")
    frontend = _frontend()
    if not trandata:
        return RedirectResponse(url=f"{frontend}/payment/result?status=failed", status_code=303)
    try:
        parsed = neoleap_service.parse_callback(str(trandata))
    except Exception:
        return RedirectResponse(url=f"{frontend}/payment/result?status=failed", status_code=303)
    order_ref = str(parsed.get("trackId") or "")
    status = await _fulfill(order_ref, parsed)
    return RedirectResponse(url=f"{frontend}/payment/result?order={order_ref}&status={status}", status_code=303)


@router.post("/neoleap/callback")
async def neoleap_callback(request: Request):
    return await _handle_callback(request)


@router.get("/neoleap/callback")
async def neoleap_callback_get(request: Request):
    return await _handle_callback(request)


@router.get("/order-status/{order_id}")
async def order_status(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"_id": to_oid(order_id)})
    if not order or order["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    return {"status": order.get("status"), "amount": order.get("amount"),
            "currency": order.get("currency", "SAR"), "plan_name": order.get("plan_name")}
