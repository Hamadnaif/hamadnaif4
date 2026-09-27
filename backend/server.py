import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, APIRouter
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

app.include_router(api)

_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
