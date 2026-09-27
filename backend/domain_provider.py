import os
import httpx

API_KEY = os.environ.get("RESELLERCLUB_API_KEY")
RESELLER_ID = os.environ.get("RESELLERCLUB_RESELLER_ID")
ENV = os.environ.get("RESELLERCLUB_ENV", "test")
BASE = "https://httpapi.com/api" if ENV == "live" else "https://test.httpapi.com/api"

# indicative SAR prices until provider price API is wired
PRICES = {"com": 45, "net": 55, "org": 50, "store": 90, "online": 70, "sa": 120, "com.sa": 140}
SUPPORTED_TLDS = ["com", "net", "org", "store", "online"]


def is_configured() -> bool:
    return bool(API_KEY and RESELLER_ID)


def config_status() -> dict:
    return {
        "api_key": bool(API_KEY),
        "reseller_id": bool(RESELLER_ID),
        "env": ENV,
    }


async def check_availability(sld: str, tlds=None) -> dict:
    """Return {tld: available_bool} using ResellerClub domains/available.json."""
    tlds = tlds or SUPPORTED_TLDS
    params = [("auth-userid", RESELLER_ID), ("api-key", API_KEY), ("domain-name", sld)]
    for t in tlds:
        params.append(("tlds", t))
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(f"{BASE}/domains/available.json", params=params)
    resp.raise_for_status()
    data = resp.json()
    out = {}
    for t in tlds:
        key = f"{sld}.{t}"
        info = data.get(key) or {}
        status = (info.get("status") or "").lower()
        out[t] = status == "available"
    return out
