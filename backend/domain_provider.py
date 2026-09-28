import os
import httpx
import logging

API_KEY = os.environ.get("RESELLERCLUB_API_KEY")
RESELLER_ID = os.environ.get("RESELLERCLUB_RESELLER_ID")
ENV = os.environ["RESELLERCLUB_ENV"]
BASE = os.environ["RESELLERCLUB_BASE_URL"].rstrip("/")
AVAILABILITY_BASE = os.environ["RESELLERCLUB_AVAILABILITY_URL"].rstrip("/")

# ResellerClub authenticates in query parameters; httpx INFO includes the URL.
logging.getLogger("httpx").setLevel(logging.WARNING)

# indicative SAR prices until provider price API is wired
PRICES = {"com": 45, "net": 55, "org": 50, "store": 90, "online": 70, "sa": 120,
          "com.sa": 140, "shop": 95, "site": 75, "io": 180, "co": 140, "me": 120}
SUPPORTED_TLDS = ["com", "net", "org", "sa", "com.sa", "store", "online", "shop", "site", "io", "co", "me"]


def is_configured() -> bool:
    return bool(API_KEY and RESELLER_ID)


def config_status() -> dict:
    return {
        "api_key": bool(API_KEY),
        "reseller_id": bool(RESELLER_ID),
        "env": ENV,
    }


async def _get_provider_json(base: str, path: str, params) -> dict:
    """Fetch read-only data without exposing credential-bearing URLs in errors."""
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            resp = await client.get(f"{base}/{path}", params=params)
    except httpx.HTTPError:
        raise RuntimeError("ResellerClub connection failed") from None
    if resp.is_error:
        raise RuntimeError(f"ResellerClub HTTP {resp.status_code}")
    try:
        data = resp.json()
    except ValueError:
        raise RuntimeError("ResellerClub returned an invalid response") from None
    if not isinstance(data, dict):
        raise RuntimeError("ResellerClub returned an unexpected response")
    if data.get("status") == "ERROR" or data.get("error"):
        raise RuntimeError("ResellerClub rejected the request")
    return data


async def get_pricing(tlds=None) -> dict:
    """Return reseller customer pricing per tld: {tld: {"register": float, "renew": float}}."""
    tlds = tlds or SUPPORTED_TLDS
    params = {"auth-userid": RESELLER_ID, "api-key": API_KEY}
    data = await _get_provider_json(BASE, "products/customer-price.json", params)
    out = {}
    for t in tlds:
        entry = data.get(f"dom{t}") or data.get(t) or {}
        try:
            add = entry.get("addnewdomain", {})
            renew = entry.get("renewdomain", {})
            reg = float(next(iter(add.values()))) if add else None
            ren = float(next(iter(renew.values()))) if renew else None
            if reg is not None:
                out[t] = {"register": reg, "renew": ren or reg}
        except Exception:
            continue
    return out


async def check_availability(sld: str, tlds=None) -> dict:
    """Return confirmed availability or None when the provider cannot confirm."""
    tlds = tlds or SUPPORTED_TLDS
    params = [("auth-userid", RESELLER_ID), ("api-key", API_KEY), ("domain-name", sld)]
    for t in tlds:
        params.append(("tlds", t))
    data = await _get_provider_json(AVAILABILITY_BASE, "domains/available.json", params)
    out = {}
    for t in tlds:
        info = data.get(f"{sld}.{t}") or {}
        status = (info.get("status") or "").lower() if isinstance(info, dict) else ""
        if status == "available":
            out[t] = True
        elif status in {"regthroughus", "regthroughothers"}:
            out[t] = False
        else:
            out[t] = None
    return out
