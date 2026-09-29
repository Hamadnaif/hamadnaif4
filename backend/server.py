import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from db import client
from seed import run_seed
from auth import router as auth_router
from routers.sites import router as sites_router
from routers.media import router as media_router
from routers.public import router as public_router
from routers.admin import router as admin_router
from routers.account import router as account_router
from routers.ai import router as ai_router
from routers.payments import router as payments_router
from routers.commerce import router as commerce_router
from routers.payouts import router as payouts_router

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_seed()
    logger.info("Seed complete")
    yield
    client.close()


app = FastAPI(title="Manasati API", lifespan=lifespan)

api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "Manasati API", "status": "ok"}


api.include_router(auth_router)
api.include_router(sites_router)
api.include_router(media_router)
api.include_router(public_router)
api.include_router(admin_router)
api.include_router(account_router)
api.include_router(ai_router)
api.include_router(payments_router)
api.include_router(commerce_router)
api.include_router(payouts_router)

app.include_router(api)

_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def same_origin_cookie_writes(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        cookie_auth = any(request.cookies.get(k) for k in ("access_token", "refresh_token", "session_token"))
        origin = request.headers.get("origin")
        trusted = set(_origins) | {str(request.base_url).rstrip("/")}
        app_origin = os.environ.get("PUBLIC_APP_URL", "").rstrip("/")
        if app_origin:
            trusted.add(app_origin)
        if cookie_auth and origin and origin not in trusted:
            return JSONResponse({"detail": "مصدر الطلب غير مسموح"}, status_code=403)
    response = await call_next(request)
    if request.url.path.startswith(("/api/commerce", "/api/payouts", "/api/account", "/api/auth")):
        response.headers["Cache-Control"] = "no-store"
    return response
