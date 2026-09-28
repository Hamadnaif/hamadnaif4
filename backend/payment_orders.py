"""Owned Tap payment orders and retry-safe subscription fulfilment."""
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Literal

from fastapi import HTTPException
from pydantic import Field
from pymongo import ReturnDocument

from db import BaseDocument, PyObjectId, db, to_oid
import tap_service


def now():
    return datetime.now(timezone.utc).isoformat()


class PaymentOrder(BaseDocument):
    owner_id: PyObjectId
    plan_id: PyObjectId
    plan_name: str
    cycle: Literal["monthly", "yearly"]
    amount: float = Field(gt=0, allow_inf_nan=False)
    currency: str
    request_id: str
    provider: Literal["tap"] = "tap"
    mode: Literal["test"] = "test"
    type: Literal["subscription"] = "subscription"
    status: str = "pending_payment"
    created_at: str = Field(default_factory=now)
    payment_id: str | None = None
    paid_at: str | None = None
    fulfilled_at: str | None = None
    gateway_status: str | None = None
    checkout_url: str | None = None
    creation_started_at: str | None = None
    creation_locked_at: str | None = None


async def payment_config():
    settings = await db.settings.find_one({"_key": "platform"}, {"integrations.tap_enabled": 1}) or {}
    configured = tap_service.is_configured()
    enabled = configured and settings.get("integrations", {}).get("tap_enabled") is True
    return {"provider": "tap", "mode": "test", "configured": configured, "enabled": enabled}


async def require_enabled():
    if not (await payment_config())["enabled"]:
        raise HTTPException(503, "الدفع التجريبي عبر Tap غير مفعّل حاليًا.")


async def owned_order(order_id, owner_id):
    oid = to_oid(order_id)
    doc = await db.orders.find_one({"_id": oid, "owner_id": owner_id, "provider": "tap"}) if oid else None
    if not doc:
        raise HTTPException(404, "طلب Tap غير موجود.")
    return PaymentOrder.from_mongo(doc)


def status_response(order):
    return {"order_id": order.id, "status": "paid" if order.fulfilled_at else
            ("pending" if order.status in {"paid", "creating", "redirect", "pending_payment", "verification_required"} else order.status),
            "gateway_status": order.gateway_status, "amount": order.amount,
            "currency": order.currency, "plan_name": order.plan_name, "mode": "test",
            "activated": bool(order.fulfilled_at)}


def validate_charge(order, charge):
    ref = charge.get("reference") or {}
    metadata = charge.get("metadata") or {}
    try:
        matches = (charge.get("object") == "charge" and charge.get("live_mode") is False
                   and charge.get("id") == order.payment_id
                   and ref.get("order") == order.id and ref.get("transaction") == order.id
                   and metadata.get("order_id") == order.id and metadata.get("plan_id") == order.plan_id
                   and charge.get("currency") == order.currency
                   and Decimal(str(charge.get("amount"))) == Decimal(str(order.amount)))
    except (InvalidOperation, TypeError, AttributeError):
        matches = False
    if not matches:
        raise HTTPException(409, "بيانات دفعة Tap لا تطابق الطلب. لم يتم تفعيل الاشتراك.")


async def _grant_subscription(order):
    """Stable paid_at makes retries non-extending; an older payment cannot undo a newer one."""
    end = (datetime.fromisoformat(order.paid_at) + timedelta(days=365 if order.cycle == "yearly" else 30)).isoformat()
    owner = to_oid(order.owner_id)
    await db.users.update_one({"_id": owner, "$or": [
        {"subscription_payment_at": {"$exists": False}},
        {"subscription_payment_at": {"$lte": order.paid_at}},
    ]}, {"$set": {"plan_id": order.plan_id, "plan_cycle": order.cycle,
                   "subscription_status": "active", "subscription_renews_at": end,
                   "subscription_payment_at": order.paid_at, "subscription_payment_order": order.id,
                   "subscription_payment_mode": "test"}})
    if not await db.users.find_one({"_id": owner}, {"_id": 1}):
        raise HTTPException(409, "حساب صاحب الدفعة غير موجود؛ لم يكتمل التفعيل.")
    await db.orders.update_one({"_id": to_oid(order.id), "fulfilled_at": None}, {"$set": {"fulfilled_at": now()}})


async def settle(order, charge):
    validate_charge(order, charge)
    state = charge.get("status")
    if state == "CAPTURED":
        claimed = await db.orders.find_one_and_update(
            {"_id": to_oid(order.id), "paid_at": None},
            {"$set": {"status": "paid", "paid_at": now(), "gateway_status": state}},
            return_document=ReturnDocument.AFTER,
        )
        order = PaymentOrder.from_mongo(claimed or await db.orders.find_one({"_id": to_oid(order.id)}))
        if not order.fulfilled_at:
            # Run also on already-paid retries: recover if the previous worker died between writes.
            await _grant_subscription(order)
    else:
        failed = state in {"FAILED", "DECLINED", "RESTRICTED", "VOID", "TIMEDOUT", "CANCELLED", "ABANDONED"}
        status = "cancelled" if state in {"CANCELLED", "ABANDONED"} else ("failed" if failed else "redirect")
        await db.orders.update_one({"_id": to_oid(order.id), "paid_at": None},
                                   {"$set": {"status": status, "gateway_status": state, "updated_at": now()}})
    latest = PaymentOrder.from_mongo(await db.orders.find_one({"_id": to_oid(order.id)}))
    return status_response(latest)
