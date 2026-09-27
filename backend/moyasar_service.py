import os
import httpx
from fastapi import HTTPException

SECRET = os.environ.get("MOYASAR_SECRET_KEY")
PUBLISHABLE = os.environ.get("MOYASAR_PUBLISHABLE_KEY")
BASE = os.environ.get("MOYASAR_API_BASE", "https://api.moyasar.com").rstrip("/")
WEBHOOK_SECRET = os.environ.get("MOYASAR_WEBHOOK_SECRET")


def is_configured() -> bool:
    return bool(SECRET and PUBLISHABLE)


async def get_payment(payment_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{BASE}/v1/payments/{payment_id}", auth=(SECRET, ""))
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="تعذّر التحقق من الدفعة")
    return r.json()
