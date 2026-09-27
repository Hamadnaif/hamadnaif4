import os
import jwt
import bcrypt
import secrets
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from bson import ObjectId

from db import db, serialize

JWT_ALGORITHM = "HS256"
router = APIRouter(prefix="/auth", tags=["auth"])


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(minutes=60)}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=3600, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


def set_session_cookie(response: Response, token: str):
    response.set_cookie("session_token", token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


async def _load_user_from_token(token: str):
    payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="نوع الرمز غير صالح")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    return user


async def _load_user_from_session(session_token: str):
    sess = await db.user_sessions.find_one({"session_token": session_token})
    if not sess:
        return None
    expires_at = sess["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    return await db.users.find_one({"_id": ObjectId(sess["user_id"])})


async def get_current_user(request: Request) -> dict:
    # Try JWT access token cookie / bearer
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    user = None
    if token:
        try:
            user = await _load_user_from_token(token)
        except jwt.ExpiredSignatureError:
            user = None
        except jwt.InvalidTokenError:
            user = None
    # Try Emergent session token
    if not user:
        session_token = request.cookies.get("session_token")
        if not session_token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                session_token = auth_header[7:]
        if session_token:
            user = await _load_user_from_session(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="غير مصرح")
    if user.get("account_status") == "suspended":
        raise HTTPException(status_code=403, detail="تم إيقاف الحساب")
    out = serialize(user)
    out.pop("password_hash", None)
    return out


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="هذه الصفحة مخصصة للإدارة")
    return user


# ---- Brute force helpers ----
async def _check_lockout(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("count", 0) >= 5:
        locked_until = rec.get("locked_until")
        if locked_until:
            if isinstance(locked_until, str):
                locked_until = datetime.fromisoformat(locked_until)
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if locked_until > datetime.now(timezone.utc):
                raise HTTPException(status_code=429, detail="محاولات كثيرة. حاول بعد 15 دقيقة")


async def _record_fail(identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    count = (rec.get("count", 0) if rec else 0) + 1
    update = {"count": count}
    if count >= 5:
        update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)


async def _clear_fails(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


# ---- Schemas ----
class RegisterBody(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class ForgotBody(BaseModel):
    email: EmailStr


class ResetBody(BaseModel):
    token: str
    password: str


class ProfileBody(BaseModel):
    name: str | None = None


class PasswordChangeBody(BaseModel):
    current_password: str
    new_password: str


def _public_user(user: dict) -> dict:
    out = serialize(user)
    out.pop("password_hash", None)
    return out


@router.post("/register")
async def register(body: RegisterBody, response: Response):
    email = body.email.lower().strip()
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="هذا البريد مسجّل مسبقًا")
    doc = {
        "email": email,
        "name": body.name.strip(),
        "password_hash": hash_password(body.password),
        "role": "customer",
        "auth_provider": "password",
        "picture": None,
        "plan_id": None,
        "plan_cycle": None,
        "subscription_status": "none",
        "subscription_renews_at": None,
        "account_status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    set_auth_cookies(response, create_access_token(uid, email), create_refresh_token(uid))
    doc["_id"] = res.inserted_id
    return _public_user(doc)


@router.post("/login")
async def login(body: LoginBody, request: Request, response: Response):
    email = body.email.lower().strip()
    ip = request.client.host if request.client else "?"
    identifier = f"{ip}:{email}"
    await _check_lockout(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        await _record_fail(identifier)
        raise HTTPException(status_code=401, detail="البريد أو كلمة المرور غير صحيحة")
    await _clear_fails(identifier)
    uid = str(user["_id"])
    set_auth_cookies(response, create_access_token(uid, email), create_refresh_token(uid))
    return _public_user(user)


@router.post("/logout")
async def logout(response: Response):
    for name in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(name, path="/")
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="غير مصرح")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="نوع الرمز غير صالح")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="غير مصرح")
        if user.get("account_status") == "suspended":
            raise HTTPException(status_code=403, detail="تم إيقاف الحساب")
        response.set_cookie("access_token", create_access_token(str(user["_id"]), user["email"]),
                            httponly=True, secure=True, samesite="none", max_age=3600, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")


@router.post("/forgot-password")
async def forgot_password(body: ForgotBody):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": str(user["_id"]),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "used": False,
        })
        print(f"[PASSWORD RESET] {email} -> token: {token}")
    return {"ok": True, "message": "إن كان البريد مسجّلًا فستصلك رسالة لإعادة التعيين"}


@router.post("/reset-password")
async def reset_password(body: ResetBody):
    rec = await db.password_reset_tokens.find_one({"token": body.token})
    if not rec or rec.get("used"):
        raise HTTPException(status_code=400, detail="رابط غير صالح أو مستخدم")
    expires_at = rec["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="انتهت صلاحية الرابط")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    await db.users.update_one({"_id": ObjectId(rec["user_id"])},
                             {"$set": {"password_hash": hash_password(body.password)}})
    await db.password_reset_tokens.update_one({"token": body.token}, {"$set": {"used": True}})
    return {"ok": True}


@router.put("/profile")
async def update_profile(body: ProfileBody, user: dict = Depends(get_current_user)):
    updates = {}
    if body.name:
        updates["name"] = body.name.strip()
    if updates:
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": updates})
    fresh = await db.users.find_one({"_id": ObjectId(user["id"])})
    return _public_user(fresh)


@router.put("/change-password")
async def change_password(body: PasswordChangeBody, user: dict = Depends(get_current_user)):
    full = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not full.get("password_hash"):
        raise HTTPException(status_code=400, detail="حسابك يستخدم تسجيل الدخول عبر Google")
    if not verify_password(body.current_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور يجب أن تكون 6 أحرف على الأقل")
    await db.users.update_one({"_id": ObjectId(user["id"])},
                             {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"ok": True}


# ---- Emergent Google Auth ----
class SessionBody(BaseModel):
    session_id: str


@router.post("/session")
async def process_session(body: SessionBody, response: Response):
    async with httpx.AsyncClient() as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="فشل التحقق من الجلسة")
    data = r.json()
    email = data["email"].lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        doc = {
            "email": email,
            "name": data.get("name", email),
            "password_hash": None,
            "role": "customer",
            "auth_provider": "google",
            "picture": data.get("picture"),
            "plan_id": None,
            "plan_cycle": None,
            "subscription_status": "none",
            "subscription_renews_at": None,
            "account_status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        res = await db.users.insert_one(doc)
        doc["_id"] = res.inserted_id
        user = doc
    else:
        await db.users.update_one({"_id": user["_id"]},
                                 {"$set": {"picture": data.get("picture")}})
    session_token = data.get("session_token") or str(uuid.uuid4())
    await db.user_sessions.insert_one({
        "user_id": str(user["_id"]),
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    set_session_cookie(response, session_token)
    return _public_user(user)
