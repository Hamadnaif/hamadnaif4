import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import db, serialize, to_oid
from auth import get_current_user
import moyasar_service

router = APIRouter(prefix="/account", tags=["account"])


def _now():
    return datetime.now(timezone.utc).isoformat()


@router.get("/overview")
async def overview(user: dict = Depends(get_current_user)):
    plan = None
    if user.get("plan_id"):
        p = await db.plans.find_one({"_id": to_oid(user["plan_id"])})
        plan = serialize(p) if p else None
    sites_count = await db.sites.count_documents({"owner_id": user["id"]})
    domains = await db.domain_orders.find({"owner_id": user["id"]}).sort("created_at", -1).to_list(100)
    orders = await db.orders.find({"owner_id": user["id"]}).sort("created_at", -1).to_list(100)
    return {
        "plan": plan,
        "plan_cycle": user.get("plan_cycle"),
        "subscription_status": user.get("subscription_status"),
        "subscription_renews_at": user.get("subscription_renews_at"),
        "sites_count": sites_count,
        "domains": [serialize(d) for d in domains],
        "orders": [serialize(o) for o in orders],
    }


@router.get("/store-orders")
async def store_orders(user: dict = Depends(get_current_user)):
    docs = await db.store_orders.find({"owner_id": user["id"]}).sort("created_at", -1).to_list(500)
    return [serialize(d) for d in docs]


class SubscribeBody(BaseModel):
    plan_id: str
    cycle: str = "monthly"


@router.post("/subscribe")
async def subscribe(body: SubscribeBody, user: dict = Depends(get_current_user)):
    plan = await db.plans.find_one({"_id": to_oid(body.plan_id)})
    if not plan:
        raise HTTPException(status_code=404, detail="الباقة غير موجودة")
    price = plan.get("price_yearly") if body.cycle == "yearly" else plan.get("price_monthly")
    order = {
        "owner_id": user["id"], "type": "subscription", "plan_id": body.plan_id,
        "plan_name": plan.get("name"), "cycle": body.cycle, "amount": price,
        "currency": plan.get("currency", "SAR"),
        "status": "pending_payment", "created_at": _now(),
    }
    res = await db.orders.insert_one(order)
    order["_id"] = res.inserted_id
    if not moyasar_service.is_configured():
        return {"payment_enabled": False,
                "message": "بوابة الدفع (Moyasar) غير مربوطة بعد. لتفعيل الاشتراك الحقيقي يلزم إضافة مفاتيح التاجر. تم تسجيل الطلب كمسودة.",
                "order": serialize(order)}
    return {"payment_enabled": True, "order": serialize(order)}


@router.get("/payment-session/{order_id}")
async def payment_session(order_id: str, user: dict = Depends(get_current_user)):
    if not moyasar_service.is_configured():
        raise HTTPException(status_code=503, detail="بوابة الدفع غير مفعّلة")
    order = await db.orders.find_one({"_id": to_oid(order_id)})
    if not order or order["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if order.get("status") == "paid":
        raise HTTPException(status_code=409, detail="تم دفع هذا الطلب مسبقًا")
    frontend = os.environ.get("FRONTEND_URL", "").rstrip("/")
    return {
        "order_ref": order_id,
        "amount": int(round(float(order["amount"]) * 100)),  # halalas
        "currency": order.get("currency", "SAR"),
        "publishable_key": moyasar_service.PUBLISHABLE,
        "callback_url": f"{frontend}/payment/result",
        "description": f"اشتراك باقة {order.get('plan_name')} ({order.get('cycle')})",
    }
