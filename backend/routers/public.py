import re
import os
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID, uuid4
from typing import Literal
import secrets
from pymongo.errors import DuplicateKeyError
from bson import ObjectId

from db import db, serialize, to_oid
from email_service import send_contact_notification
import domain_provider

router = APIRouter(prefix="/public", tags=["public"])
logger = logging.getLogger("public")


def _now():
    return datetime.now(timezone.utc).isoformat()


@router.get("/settings")
async def public_settings():
    s = await db.settings.find_one({"_key": "platform"}, {"_id": 0})
    return s or {}


@router.get("/plans")
async def public_plans():
    docs = await db.plans.find({"is_active": True}).sort("order", 1).to_list(50)
    return [serialize(d) for d in docs]


@router.get("/templates")
async def public_templates():
    docs = await db.templates.find({"is_active": True}).sort("created_at", 1).to_list(300)
    return [serialize(d) for d in docs]


@router.get("/templates/{template_id}")
async def public_template(template_id: str):
    doc = await db.templates.find_one({"_id": to_oid(template_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="القالب غير موجود")
    return serialize(doc)


@router.get("/site/{subdomain}")
async def public_site(subdomain: str):
    site = await db.sites.find_one({"subdomain": subdomain})
    if not site or site.get("status") != "published":
        raise HTTPException(status_code=404, detail="الموقع غير متاح")
    from publishing import published_content
    out = published_content(site)
    merchant = await db.merchant_accounts.find_one({"owner_id": site["owner_id"]})
    import tap_commerce
    out["online_payments"] = bool(tap_commerce.is_configured() and merchant and merchant.get("is_acceptance_allowed") is True)
    return out


class ContactBody(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    message: str


@router.post("/site/{subdomain}/contact")
async def site_contact(subdomain: str, body: ContactBody):
    site = await db.sites.find_one({"subdomain": subdomain})
    if not site or site.get("status") != "published":
        raise HTTPException(status_code=404, detail="الموقع غير متاح")
    await db.contact_submissions.insert_one({
        "site_id": str(site["_id"]), "owner_id": site["owner_id"], "type": "site",
        "name": body.name.strip(), "email": body.email.lower(),
        "phone": (body.phone or "").strip(), "message": body.message.strip(),
        "read": False, "created_at": _now(),
    })
    owner = await db.users.find_one({"_id": to_oid(site["owner_id"])})
    if owner and owner.get("email"):
        await send_contact_notification(owner["email"], f"موقعك «{site.get('name')}»",
                                        body.name.strip(), body.email.lower(),
                                        (body.phone or "").strip(), body.message.strip())
    return {"ok": True, "message": "تم إرسال رسالتك بنجاح"}


@router.post("/contact")
async def platform_contact(body: ContactBody):
    await db.contact_submissions.insert_one({
        "site_id": None, "owner_id": None, "type": "platform",
        "name": body.name.strip(), "email": body.email.lower(),
        "phone": (body.phone or "").strip(), "message": body.message.strip(),
        "read": False, "created_at": _now(),
    })
    admin_email = os.environ.get("ADMIN_EMAIL")
    if admin_email:
        await send_contact_notification(admin_email, "نموذج تواصل المنصة",
                                        body.name.strip(), body.email.lower(),
                                        (body.phone or "").strip(), body.message.strip())
    return {"ok": True, "message": "تم إرسال رسالتك، سنتواصل معك قريبًا"}


class OrderItem(BaseModel):
    product_ref: str | None = None
    name: str = Field(default="", max_length=200)
    price: float | None = None  # Legacy clients; never trusted.
    qty: int = Field(ge=1, le=100, strict=True)


class StoreOrderBody(BaseModel):
    customer_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=8, max_length=20)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=1000)
    note: str | None = Field(default=None, max_length=2000)
    items: list[OrderItem] = Field(min_length=1, max_length=100)
    total: float | None = None  # Computed from the published catalog instead.
    currency: Literal["SAR"] = "SAR"
    payment_method: Literal["offline", "tap"] = "offline"
    request_id: UUID = Field(default_factory=uuid4)


@router.post("/site/{subdomain}/order")
async def create_store_order(subdomain: str, body: StoreOrderBody, background_tasks: BackgroundTasks):
    from store_catalog import price_cart
    from routers.commerce import start_store_payment
    import tap_commerce
    import tap_service
    site = await db.sites.find_one({"subdomain": subdomain, "status": "published"})
    if not site:
        raise HTTPException(404, "الموقع غير متاح")
    items, total = price_cart(site, body.items)
    owner_query = {"site_id": str(site["_id"]), "request_id": str(body.request_id)}
    order = await db.store_orders.find_one(owner_query)
    if order and (order["items"] != items or order.get("payment_method") != body.payment_method):
        raise HTTPException(409, "تغيّرت السلة. أعد فتح صفحة المتجر لإنشاء طلب جديد.")
    if body.payment_method == "tap":
        merchant = await db.merchant_accounts.find_one({"owner_id": site["owner_id"]})
        if not tap_commerce.is_configured() or not merchant or merchant.get("is_acceptance_allowed") is not True:
            raise HTTPException(503, "الدفع الإلكتروني غير متاح لهذا المتجر حاليًا.")
        if not body.email:
            raise HTTPException(422, "البريد الإلكتروني مطلوب للدفع.")
    newly_created = False
    if not order:
        order = {
            **owner_query, "owner_id": site["owner_id"], "site_name": site.get("name"),
            "customer_name": body.customer_name.strip(), "phone": body.phone.strip(),
            "email": str(body.email) if body.email else None,
            "address": (body.address or "").strip(), "note": (body.note or "").strip(),
            "items": items, "total": total, "currency": "SAR", "status": "new",
            "payment_method": body.payment_method, "payment_status": "pending" if body.payment_method == "tap" else "unpaid",
            "created_at": _now(), "payment_token": secrets.token_urlsafe(32),
        }
        if body.payment_method == "tap":
            order.update(tap_merchant_id=merchant['tap_merchant_id'], tap_platform_id=os.environ['TAP_PLATFORM_ID'], mode='test')
        try:
            result = await db.store_orders.insert_one(order)
            order['_id'] = result.inserted_id
            newly_created = True
        except DuplicateKeyError:
            order = await db.store_orders.find_one(owner_query)
            if order['items'] != items or order.get('payment_method') != body.payment_method:
                raise HTTPException(409, 'مرجع الطلب مستخدم لسلة مختلفة.') from None
    if newly_created and body.payment_method == "offline":
        owner = await db.users.find_one({"_id": to_oid(site["owner_id"])})
        if owner and owner.get("email"):
            message = "طلب جديد: " + "، ".join(f"{i['name']} ×{i['qty']}" for i in items) + f". الإجمالي: {total} SAR"
            background_tasks.add_task(send_contact_notification, owner['email'], f"متجر {site.get('name')}", body.customer_name, owner['email'], body.phone, message)
    if body.payment_method == "tap":
        try:
            result = await start_store_payment(order)
            return {"ok": True, **result}
        except tap_service.TapError as exc:
            raise HTTPException(exc.status_code, str(exc)) from None
    return {"ok": True, "order_id": str(order['_id']), "total": order['total'], "payment_status": "unpaid",
            "message": "تم استلام طلبك بنجاح، سنتواصل معك لتأكيد الطلب."}


@router.get("/domain/search")
async def domain_search(q: str):
    q = q.lower().strip()
    q = re.sub(r"[^a-z0-9-]", "", q.split(".")[0])
    if not q:
        raise HTTPException(status_code=400, detail="أدخل اسم نطاق صالح")

    tlds = domain_provider.SUPPORTED_TLDS
    prices = domain_provider.PRICES
    availability = {}
    pricing = {}
    enabled = domain_provider.is_configured()
    provider_error = False
    message = None

    if enabled:
        try:
            availability = await domain_provider.check_availability(q, tlds)
            try:
                pricing = await domain_provider.get_pricing(tlds)
            except Exception:
                pricing = {}
        except Exception as e:
            enabled = False
            provider_error = True
            # keep the technical diagnosis server-side only (never shown to visitors)
            status = domain_provider.config_status()
            logger.warning("ResellerClub connection failed (env=%s): %s", status.get("env"), e)
            try:
                await db.domain_diagnostics.insert_one({
                    "query": q, "error": str(e)[:500],
                    "provider_env": status.get("env"),
                    "api_key_set": status.get("api_key"), "reseller_id_set": status.get("reseller_id"),
                    "created_at": _now(),
                })
            except Exception:
                pass
            message = "تعذّر التحقق من توفّر النطاق حاليًا. يرجى إعادة المحاولة بعد قليل."
    else:
        message = "خدمة البحث عن النطاقات قيد التفعيل حاليًا. الأسعار المعروضة تقديرية وغير مؤكدة."

    results = []
    for t in tlds:
        confirmed = enabled and (t in pricing) and os.environ.get("RESELLERCLUB_PRICE_CURRENCY") == "SAR"
        results.append({
            "domain": f"{q}.{t}",
            "tld": t,
            "price": (pricing.get(t, {}).get("register") if confirmed else prices.get(t)),
            "renew_price": (pricing.get(t, {}).get("renew") if confirmed else prices.get(t)),
            "currency": "SAR",
            "price_source": "provider" if confirmed else "indicative",
            "available": availability.get(t) if enabled else None,
        })

    return {"query": q, "enabled": enabled, "provider_error": provider_error,
            "results": results, "message": message}
