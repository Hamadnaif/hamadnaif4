import base64
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import Response
from bson import ObjectId

from db import db, to_oid
from auth import get_current_user
from storage_quota import reserve_storage, release_storage

router = APIRouter(prefix="/media", tags=["media"])

ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"}
MAX_BYTES = 5 * 1024 * 1024


@router.post("")
async def upload_media(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=400, detail="نوع الملف غير مدعوم. استخدم صورة JPG/PNG/WEBP/GIF/SVG")
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="حجم الصورة يتجاوز 5 ميجابايت")
    doc = {
        "owner_id": user["id"],
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(data),
        "data_b64": base64.b64encode(data).decode("ascii"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await reserve_storage(user, len(data))
    try:
        res = await db.media.insert_one(doc)
    except Exception:
        await release_storage(user["id"], len(data))
        raise
    return {"id": str(res.inserted_id), "url": f"/api/media/{res.inserted_id}",
            "size": len(data), "content_type": file.content_type}


@router.get("/{media_id}")
async def get_media(media_id: str):
    oid = to_oid(media_id)
    if not oid:
        raise HTTPException(status_code=404, detail="غير موجود")
    doc = await db.media.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="غير موجود")
    data = base64.b64decode(doc["data_b64"])
    return Response(content=data, media_type=doc["content_type"],
                    headers={"Cache-Control": "public, max-age=31536000", "X-Content-Type-Options": "nosniff",
                             "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'"})


@router.get("")
async def list_media(user: dict = Depends(get_current_user)):
    docs = await db.media.find({"owner_id": user["id"]}, {"data_b64": 0}).sort("created_at", -1).to_list(300)
    return [{"id": str(d["_id"]), "url": f"/api/media/{d['_id']}", "filename": d.get("filename"),
             "size": d.get("size"), "content_type": d.get("content_type"), "source": d.get("source", "upload")} for d in docs]


@router.delete("/{media_id}")
async def delete_media(media_id: str, user: dict = Depends(get_current_user)):
    doc = await db.media.find_one({"_id": to_oid(media_id)})
    if not doc or doc.get("owner_id") != user["id"]:
        raise HTTPException(status_code=404, detail="الصورة غير موجودة")
    deleted = await db.media.delete_one({"_id": to_oid(media_id), "owner_id": user["id"]})
    if deleted.deleted_count:
        await release_storage(user["id"], doc.get("size", 0))
    return {"ok": True}
