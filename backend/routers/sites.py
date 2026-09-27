import re
import random
import string
from datetime import datetime, timezone
from typing import Optional, List, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId

from db import db, serialize, to_oid
from auth import get_current_user

router = APIRouter(prefix="/sites", tags=["sites"])


def _now():
    return datetime.now(timezone.utc).isoformat()


def _slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"[\s-]+", "-", s).strip("-")
    return s or "site"


async def _unique_subdomain(name: str) -> str:
    base = _slugify(name)
    for _ in range(20):
        cand = f"{base}-{''.join(random.choices(string.ascii_lowercase + string.digits, k=4))}"
        if not await db.sites.find_one({"subdomain": cand}):
            return cand
    return "site-" + "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


async def _get_plan_limits(user: dict) -> dict:
    if user.get("plan_id"):
        plan = await db.plans.find_one({"_id": to_oid(user["plan_id"])})
        if plan:
            return plan.get("limits", {})
    return {"sites": 1, "pages": 5, "storage_mb": 200, "custom_domain": False}


async def _owned_site(site_id: str, user: dict) -> dict:
    oid = to_oid(site_id)
    if not oid:
        raise HTTPException(status_code=404, detail="الموقع غير موجود")
    site = await db.sites.find_one({"_id": oid})
    if not site:
        raise HTTPException(status_code=404, detail="الموقع غير موجود")
    if str(site["owner_id"]) != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="لا تملك صلاحية على هذا الموقع")
    return site


class CreateSiteBody(BaseModel):
    name: str
    template_id: str


class UpdateSiteBody(BaseModel):
    name: Optional[str] = None
    brand: Optional[dict] = None
    pages: Optional[List[Any]] = None
    seo: Optional[dict] = None


class DomainBody(BaseModel):
    custom_domain: str


@router.get("")
async def list_sites(user: dict = Depends(get_current_user)):
    docs = await db.sites.find({"owner_id": user["id"]}).sort("created_at", -1).to_list(200)
    return [serialize(d) for d in docs]


@router.post("")
async def create_site(body: CreateSiteBody, user: dict = Depends(get_current_user)):
    limits = await _get_plan_limits(user)
    count = await db.sites.count_documents({"owner_id": user["id"]})
    if count >= limits.get("sites", 1):
        raise HTTPException(status_code=403, detail="وصلت للحد الأقصى من المواقع في باقتك. قم بالترقية.")
    tpl = await db.templates.find_one({"_id": to_oid(body.template_id)})
    if not tpl:
        raise HTTPException(status_code=404, detail="القالب غير موجود")
    config = tpl.get("config", {})
    subdomain = await _unique_subdomain(body.name)
    doc = {
        "owner_id": user["id"],
        "name": body.name.strip(),
        "template_id": body.template_id,
        "template_name": tpl.get("name"),
        "subdomain": subdomain,
        "custom_domain": None,
        "custom_domain_status": None,
        "custom_domain_records": None,
        "status": "draft",
        "brand": config.get("brand", {"colors": {"primary": "#0A2540", "secondary": "#D4AF37", "accent": "#2563EB"}, "font": "Tajawal", "logo": None}),
        "pages": config.get("pages", []),
        "published_at": None,
        "created_at": _now(),
        "updated_at": _now(),
    }
    res = await db.sites.insert_one(doc)
    doc["_id"] = res.inserted_id
    return serialize(doc)


@router.get("/{site_id}")
async def get_site(site_id: str, user: dict = Depends(get_current_user)):
    return serialize(await _owned_site(site_id, user))


@router.put("/{site_id}")
async def update_site(site_id: str, body: UpdateSiteBody, user: dict = Depends(get_current_user)):
    site = await _owned_site(site_id, user)
    updates = {"updated_at": _now()}
    if body.name is not None:
        updates["name"] = body.name.strip()
    if body.brand is not None:
        updates["brand"] = body.brand
    if body.seo is not None:
        updates["seo"] = body.seo
    if body.pages is not None:
        limits = await _get_plan_limits(user)
        if len(body.pages) > limits.get("pages", 5):
            raise HTTPException(status_code=403, detail=f"عدد الصفحات يتجاوز حد باقتك ({limits.get('pages', 5)})")
        updates["pages"] = body.pages
    await db.sites.update_one({"_id": site["_id"]}, {"$set": updates})
    return serialize(await db.sites.find_one({"_id": site["_id"]}))


@router.delete("/{site_id}")
async def delete_site(site_id: str, user: dict = Depends(get_current_user)):
    site = await _owned_site(site_id, user)
    await db.sites.delete_one({"_id": site["_id"]})
    return {"ok": True}


@router.post("/{site_id}/publish")
async def publish_site(site_id: str, user: dict = Depends(get_current_user)):
    site = await _owned_site(site_id, user)
    await db.sites.update_one({"_id": site["_id"]},
                             {"$set": {"status": "published", "published_at": _now(), "updated_at": _now()}})
    return serialize(await db.sites.find_one({"_id": site["_id"]}))


@router.post("/{site_id}/unpublish")
async def unpublish_site(site_id: str, user: dict = Depends(get_current_user)):
    site = await _owned_site(site_id, user)
    await db.sites.update_one({"_id": site["_id"]}, {"$set": {"status": "draft", "updated_at": _now()}})
    return serialize(await db.sites.find_one({"_id": site["_id"]}))


@router.post("/{site_id}/domain")
async def connect_domain(site_id: str, body: DomainBody, user: dict = Depends(get_current_user)):
    site = await _owned_site(site_id, user)
    limits = await _get_plan_limits(user)
    if not limits.get("custom_domain"):
        raise HTTPException(status_code=403, detail="ربط النطاق الخاص متاح في الباقات الأعلى. قم بالترقية.")
    domain = body.custom_domain.lower().strip().replace("https://", "").replace("http://", "").strip("/")
    if not re.match(r"^[a-z0-9.-]+\.[a-z]{2,}$", domain):
        raise HTTPException(status_code=400, detail="صيغة النطاق غير صحيحة")
    records = [
        {"type": "A", "name": "@", "value": "76.76.21.21", "note": "وجّه النطاق الرئيسي إلى خادم المنصة"},
        {"type": "CNAME", "name": "www", "value": f"{site['subdomain']}.manasati.sa", "note": "للنطاق الفرعي www"},
    ]
    await db.sites.update_one({"_id": site["_id"]}, {"$set": {
        "custom_domain": domain, "custom_domain_status": "pending",
        "custom_domain_records": records, "updated_at": _now()}})
    return {"domain": domain, "status": "pending", "records": records,
            "message": "أضف سجلات DNS التالية لدى مزوّد النطاق ثم اضغط تحقّق."}


@router.post("/{site_id}/domain/verify")
async def verify_domain(site_id: str, user: dict = Depends(get_current_user)):
    site = await _owned_site(site_id, user)
    if not site.get("custom_domain"):
        raise HTTPException(status_code=400, detail="لا يوجد نطاق مربوط")
    # Real DNS verification requires production DNS + wildcard setup (disabled).
    await db.sites.update_one({"_id": site["_id"]}, {"$set": {"custom_domain_status": "verifying", "updated_at": _now()}})
    return {"status": "verifying",
            "message": "التحقق الحقيقي من DNS وتفعيل SSL يتطلب إعداد النطاق الرئيسي و wildcard DNS للمنصة. سيتم تفعيله بعد توفير إعدادات DNS.",
            "disabled": True}


@router.get("/{site_id}/messages")
async def site_messages(site_id: str, user: dict = Depends(get_current_user)):
    site = await _owned_site(site_id, user)
    docs = await db.contact_submissions.find({"site_id": str(site["_id"])}).sort("created_at", -1).to_list(500)
    return [serialize(d) for d in docs]
