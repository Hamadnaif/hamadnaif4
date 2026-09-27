import re
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from bson import ObjectId

from db import db, serialize, to_oid
from email_service import send_contact_notification

router = APIRouter(prefix="/public", tags=["public"])


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
    docs = await db.templates.find({"is_active": True}).sort("created_at", 1).to_list(50)
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
    out = serialize(site)
    # strip owner reference from public payload
    out.pop("owner_id", None)
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
    name: str
    price: float
    qty: int


class StoreOrderBody(BaseModel):
    customer_name: str
    phone: str
    address: str | None = None
    note: str | None = None
    items: list[OrderItem]
    total: float
    currency: str = "SAR"


@router.post("/site/{subdomain}/order")
async def create_store_order(subdomain: str, body: StoreOrderBody):
    site = await db.sites.find_one({"subdomain": subdomain})
    if not site or site.get("status") != "published":
        raise HTTPException(status_code=404, detail="الموقع غير متاح")
    if not body.items:
        raise HTTPException(status_code=400, detail="السلة فارغة")
    order = {
        "site_id": str(site["_id"]), "owner_id": site["owner_id"],
        "site_name": site.get("name"), "customer_name": body.customer_name.strip(),
        "phone": body.phone.strip(), "address": (body.address or "").strip(),
        "note": (body.note or "").strip(),
        "items": [i.model_dump() for i in body.items],
        "total": body.total, "currency": body.currency,
        "status": "new", "payment_status": "unpaid", "created_at": _now(),
    }
    res = await db.store_orders.insert_one(order)
    owner = await db.users.find_one({"_id": to_oid(site["owner_id"])})
    if owner and owner.get("email"):
        lines = "، ".join([f"{i.name} ×{i.qty}" for i in body.items])
        msg = f"طلب جديد من {body.customer_name} (هاتف {body.phone}). المنتجات: {lines}. الإجمالي: {body.total} {body.currency}. العنوان: {body.address or '-'}"
        await send_contact_notification(owner["email"], f"طلب جديد على متجر «{site.get('name')}»",
                                        body.customer_name.strip(), owner["email"], body.phone.strip(), msg)
    return {"ok": True, "order_id": str(res.inserted_id),
            "message": "تم استلام طلبك بنجاح، سنتواصل معك لتأكيد الطلب."}


@router.get("/domain/search")
async def domain_search(q: str):
    q = q.lower().strip()
    q = re.sub(r"[^a-z0-9-]", "", q.split(".")[0])
    if not q:
        raise HTTPException(status_code=400, detail="أدخل اسم نطاق صالح")
    settings = await db.settings.find_one({"_key": "platform"})
    enabled = bool(settings and settings.get("integrations", {}).get("domain_reseller_enabled"))
    tlds = [".com", ".net", ".sa", ".com.sa", ".store", ".online"]
    prices = {".com": 45, ".net": 55, ".sa": 120, ".com.sa": 140, ".store": 90, ".online": 70}
    results = [{
        "domain": f"{q}{tld}",
        "tld": tld,
        "price": prices.get(tld),
        "renew_price": prices.get(tld),
        "currency": "SAR",
        "available": None,  # unknown until real provider connected
    } for tld in tlds]
    return {
        "query": q,
        "enabled": enabled,
        "results": results,
        "message": None if enabled else "البحث الحقيقي والشراء معطّلان حتى ربط مزوّد النطاقات (ResellerClub). الأسعار تجريبية.",
    }
