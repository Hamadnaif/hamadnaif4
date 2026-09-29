from typing import Literal
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from pymongo.errors import DuplicateKeyError

from db import db, serialize, to_oid
from auth import get_current_user
from payment_orders import PaymentOrder, owned_order, payment_config, require_enabled
import tap_service

router = APIRouter(prefix="/account", tags=["account"])


@router.get("/overview")
async def overview(user: dict = Depends(get_current_user)):
    plan = None
    if user.get("plan_id"):
        p = await db.plans.find_one({"_id": to_oid(user["plan_id"])})
        plan = serialize(p) if p else None
    sites_count = await db.sites.count_documents({"owner_id": user["id"]})
    domains = await db.domain_orders.find({"owner_id": user["id"]}).sort("created_at", -1).to_list(100)
    orders = await db.orders.find({"owner_id": user["id"]}).sort("created_at", -1).to_list(100)
    last_payment = await db.orders.find_one({"_id": to_oid(user.get("subscription_payment_order"))}) if user.get("subscription_payment_order") else None
    return {
        "paid_amount": (last_payment or {}).get("amount"),
        "paid_currency": (last_payment or {}).get("currency"),
        "plan": plan,
        "plan_cycle": user.get("plan_cycle"),
        "subscription_status": user.get("subscription_status"),
        "auto_renew": False,
        "expiry_policy": "عند انتهاء الفترة تتوقف المزايا المدفوعة وتبقى بيانات مواقعك محفوظة. التجديد يدوي.",
        "subscription_renews_at": user.get("subscription_renews_at"),
        "sites_count": sites_count,
        "domains": [serialize(d) for d in domains],
        "orders": [PaymentOrder.from_mongo(o).model_dump(mode="json") if o.get("provider") == "tap" else serialize(o) for o in orders],
        "payment": await payment_config(),
        "subscription_payment_mode": user.get("subscription_payment_mode"),
    }


@router.get("/store-orders")
async def store_orders(user: dict = Depends(get_current_user)):
    docs = await db.store_orders.find({"owner_id": user["id"]}).sort("created_at", -1).to_list(500)
    return [serialize({k: v for k, v in d.items() if k != "payment_token"}) for d in docs]


class SubscribeBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    plan_id: str
    cycle: Literal["monthly", "yearly"] = "monthly"
    request_id: UUID = Field(default_factory=uuid4)


@router.post("/subscribe")
async def subscribe(body: SubscribeBody, user: dict = Depends(get_current_user)):
    await require_enabled()
    oid = to_oid(body.plan_id)
    plan = await db.plans.find_one({"_id": oid, "is_active": True}) if oid else None
    if not plan:
        raise HTTPException(404, "الباقة غير موجودة")
    price = plan.get("price_yearly" if body.cycle == "yearly" else "price_monthly")
    if not isinstance(price, (int, float)) or not 0 < price < 1000000:
        raise HTTPException(422, "سعر الباقة غير صالح للدفع.")
    currency = plan.get("currency")
    if not isinstance(currency, str) or len(currency) != 3 or not currency.isupper():
        raise HTTPException(422, "عملة الباقة غير صالحة.")
    if float(tap_service.amount_text(price, currency)) != price:
        raise HTTPException(422, "سعر الباقة يتجاوز الدقة المسموحة للعملة.")
    order = PaymentOrder(owner_id=user["id"], plan_id=str(plan["_id"]), plan_name=plan["name"],
                         cycle=body.cycle, amount=price, currency=currency, request_id=str(body.request_id))
    try:
        await db.orders.insert_one(order.to_mongo())
    except DuplicateKeyError:
        existing = await db.orders.find_one({"owner_id": user["id"], "request_id": str(body.request_id), "provider": "tap"})
        if not existing:
            raise HTTPException(409, "يوجد تعارض في مرجع الطلب؛ أعد المحاولة.") from None
        order = PaymentOrder.from_mongo(existing)
        if order.plan_id != body.plan_id or order.cycle != body.cycle:
            raise HTTPException(409, "مرجع الطلب مستخدم لباقة مختلفة.") from None
    return {"payment_enabled": True, "provider": "tap", "mode": "test", "order": order.model_dump(mode="json")}


@router.get("/payment-session/{order_id}")
async def payment_session(order_id: str, user: dict = Depends(get_current_user)):
    order = await owned_order(order_id, user["id"])
    config = await payment_config()
    return {"enabled": config["enabled"], "provider": "tap", "mode": "test",
            "order_id": order.id, "amount": order.amount, "currency": order.currency,
            "description": f"اشتراك {order.plan_name}", "status": order.status,
            "message": "اختبار فقط — لن يتم خصم أي مبلغ حقيقي."}
