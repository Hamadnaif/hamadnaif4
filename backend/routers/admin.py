from datetime import datetime, timezone
from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId

from db import db, serialize, to_oid
from auth import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


def _now():
    return datetime.now(timezone.utc).isoformat()


async def _audit(admin: dict, action: str, target: str = ""):
    await db.audit_logs.insert_one({
        "admin_id": admin["id"], "admin_email": admin["email"],
        "action": action, "target": target, "created_at": _now(),
    })


@router.get("/stats")
async def stats(admin: dict = Depends(require_admin)):
    customers = await db.users.count_documents({"role": "customer"})
    sites_total = await db.sites.count_documents({})
    sites_pub = await db.sites.count_documents({"status": "published"})
    subs = await db.users.count_documents({"subscription_status": "active"})
    contacts = await db.contact_submissions.count_documents({})
    domains = await db.domain_orders.count_documents({})
    return {"customers": customers, "sites_total": sites_total, "sites_published": sites_pub,
            "active_subscriptions": subs, "contacts": contacts, "domain_orders": domains}


@router.get("/customers")
async def customers(admin: dict = Depends(require_admin)):
    docs = await db.users.find({"role": "customer"}, {"password_hash": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for d in docs:
        s = serialize(d)
        s["sites_count"] = await db.sites.count_documents({"owner_id": s["id"]})
        result.append(s)
    return result


class CustomerUpdate(BaseModel):
    account_status: Optional[str] = None
    plan_id: Optional[str] = None
    subscription_status: Optional[str] = None


@router.put("/customers/{user_id}")
async def update_customer(user_id: str, body: CustomerUpdate, admin: dict = Depends(require_admin)):
    oid = to_oid(user_id)
    if not oid:
        raise HTTPException(status_code=404, detail="غير موجود")
    updates = {}
    if body.account_status:
        updates["account_status"] = body.account_status
    if body.plan_id is not None:
        updates["plan_id"] = body.plan_id or None
    if body.subscription_status:
        updates["subscription_status"] = body.subscription_status
    if updates:
        await db.users.update_one({"_id": oid}, {"$set": updates})
        await _audit(admin, "update_customer", user_id)
    doc = await db.users.find_one({"_id": oid}, {"password_hash": 0})
    return serialize(doc)


@router.get("/sites")
async def all_sites(admin: dict = Depends(require_admin)):
    docs = await db.sites.find({}).sort("created_at", -1).to_list(1000)
    result = []
    for d in docs:
        s = serialize(d)
        s.pop("pages", None)
        owner = await db.users.find_one({"_id": to_oid(s["owner_id"])}, {"email": 1, "name": 1})
        s["owner_email"] = owner.get("email") if owner else None
        result.append(s)
    return result


class SiteStatusBody(BaseModel):
    status: str


@router.put("/sites/{site_id}/status")
async def set_site_status(site_id: str, body: SiteStatusBody, admin: dict = Depends(require_admin)):
    oid = to_oid(site_id)
    if not oid or body.status not in ("draft", "published", "suspended"):
        raise HTTPException(status_code=400, detail="حالة غير صالحة")
    await db.sites.update_one({"_id": oid}, {"$set": {"status": body.status, "updated_at": _now()}})
    await _audit(admin, "set_site_status", f"{site_id}:{body.status}")
    return {"ok": True}


# ---- Templates ----
@router.get("/templates")
async def admin_templates(admin: dict = Depends(require_admin)):
    docs = await db.templates.find({}).sort("created_at", 1).to_list(100)
    return [serialize(d) for d in docs]


class TemplateBody(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    is_active: Optional[bool] = None
    config: Optional[dict] = None


@router.post("/templates")
async def create_template(body: TemplateBody, admin: dict = Depends(require_admin)):
    doc = {"name": body.name or "قالب جديد", "category": body.category or "عام",
           "description": body.description or "", "thumbnail": body.thumbnail or "",
           "is_active": body.is_active if body.is_active is not None else True,
           "config": body.config or {"brand": {}, "pages": []}, "created_at": _now()}
    res = await db.templates.insert_one(doc)
    await _audit(admin, "create_template", str(res.inserted_id))
    doc["_id"] = res.inserted_id
    return serialize(doc)


@router.put("/templates/{template_id}")
async def update_template(template_id: str, body: TemplateBody, admin: dict = Depends(require_admin)):
    oid = to_oid(template_id)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.templates.update_one({"_id": oid}, {"$set": updates})
        await _audit(admin, "update_template", template_id)
    return serialize(await db.templates.find_one({"_id": oid}))


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, admin: dict = Depends(require_admin)):
    await db.templates.delete_one({"_id": to_oid(template_id)})
    await _audit(admin, "delete_template", template_id)
    return {"ok": True}


# ---- Plans ----
@router.get("/plans")
async def admin_plans(admin: dict = Depends(require_admin)):
    docs = await db.plans.find({}).sort("order", 1).to_list(50)
    return [serialize(d) for d in docs]


class PlanBody(BaseModel):
    name: Optional[str] = None
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    currency: Optional[str] = None
    features: Optional[List[str]] = None
    limits: Optional[dict] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    highlight: Optional[bool] = None


@router.post("/plans")
async def create_plan(body: PlanBody, admin: dict = Depends(require_admin)):
    doc = {"name": body.name or "باقة جديدة", "price_monthly": body.price_monthly or 0,
           "price_yearly": body.price_yearly or 0, "currency": body.currency or "SAR",
           "features": body.features or [], "limits": body.limits or {"sites": 1, "pages": 5, "storage_mb": 200, "custom_domain": False},
           "order": body.order or 99, "is_active": body.is_active if body.is_active is not None else True,
           "highlight": body.highlight or False, "created_at": _now()}
    res = await db.plans.insert_one(doc)
    await _audit(admin, "create_plan", str(res.inserted_id))
    doc["_id"] = res.inserted_id
    return serialize(doc)


@router.put("/plans/{plan_id}")
async def update_plan(plan_id: str, body: PlanBody, admin: dict = Depends(require_admin)):
    oid = to_oid(plan_id)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.plans.update_one({"_id": oid}, {"$set": updates})
        await _audit(admin, "update_plan", plan_id)
    return serialize(await db.plans.find_one({"_id": oid}))


@router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str, admin: dict = Depends(require_admin)):
    await db.plans.delete_one({"_id": to_oid(plan_id)})
    await _audit(admin, "delete_plan", plan_id)
    return {"ok": True}


# ---- Settings ----
@router.get("/settings")
async def get_settings(admin: dict = Depends(require_admin)):
    s = await db.settings.find_one({"_key": "platform"}, {"_id": 0})
    return s or {}


@router.put("/settings")
async def update_settings(body: dict, admin: dict = Depends(require_admin)):
    body.pop("_key", None)
    body.pop("_id", None)
    await db.settings.update_one({"_key": "platform"}, {"$set": body}, upsert=True)
    await _audit(admin, "update_settings", "platform")
    return await db.settings.find_one({"_key": "platform"}, {"_id": 0})


# ---- Contacts / Domains / Audit ----
@router.get("/contacts")
async def admin_contacts(admin: dict = Depends(require_admin)):
    docs = await db.contact_submissions.find({}).sort("created_at", -1).to_list(1000)
    return [serialize(d) for d in docs]


@router.get("/domains")
async def admin_domains(admin: dict = Depends(require_admin)):
    docs = await db.domain_orders.find({}).sort("created_at", -1).to_list(1000)
    return [serialize(d) for d in docs]


@router.get("/audit")
async def admin_audit(admin: dict = Depends(require_admin)):
    docs = await db.audit_logs.find({}).sort("created_at", -1).to_list(500)
    return [serialize(d) for d in docs]
