"""NeoLeap / Al Rajhi (Tranportal) payment gateway.

Hosted redirect flow with AES-256-CBC encrypted `trandata` (uppercase hex),
matching the documented NeoLeap merchant integration. Disabled until the
merchant credentials (Tranportal ID/password + 32-byte resource key + 16-byte IV)
are provided via environment variables.
"""
import os
import json
import binascii
from urllib.parse import unquote

import httpx
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

TRANPORTAL_ID = os.environ.get("NEOLEAP_TRANPORTAL_ID")
PASSWORD = os.environ.get("NEOLEAP_PASSWORD")
RESOURCE_KEY = os.environ.get("NEOLEAP_RESOURCE_KEY")
IV = os.environ.get("NEOLEAP_IV")
TOKEN_URL = os.environ.get("NEOLEAP_TOKEN_URL", "https://securepayments.neoleap.com.sa/pg/payment/hosted.htm")
CURRENCY_CODE = "682"  # SAR


def is_configured() -> bool:
    return bool(TRANPORTAL_ID and PASSWORD and RESOURCE_KEY and IV
                and len(RESOURCE_KEY.encode()) == 32 and len(IV.encode()) == 16)


def config_status() -> dict:
    return {
        "tranportal_id": bool(TRANPORTAL_ID),
        "password": bool(PASSWORD),
        "resource_key_valid": bool(RESOURCE_KEY) and len(RESOURCE_KEY.encode()) == 32,
        "iv_valid": bool(IV) and len(IV.encode()) == 16,
        "token_url": TOKEN_URL,
    }


def _pad(b: bytes) -> bytes:
    p = 16 - (len(b) % 16)
    return b + bytes([p]) * p


def _unpad(b: bytes) -> bytes:
    return b[:-b[-1]]


def _encrypt(plaintext: str) -> str:
    enc = Cipher(algorithms.AES(RESOURCE_KEY.encode()), modes.CBC(IV.encode())).encryptor()
    out = enc.update(_pad(plaintext.encode("utf-8"))) + enc.finalize()
    return binascii.hexlify(out).decode().upper()


def _decrypt(hexdata: str) -> dict:
    raw = binascii.unhexlify(hexdata.strip())
    dec = Cipher(algorithms.AES(RESOURCE_KEY.encode()), modes.CBC(IV.encode())).decryptor()
    pt = _unpad(dec.update(raw) + dec.finalize())
    text = unquote(pt.decode("utf-8", "ignore"))
    data = json.loads(text)
    return data[0] if isinstance(data, list) and data else data


def build_trandata(amount, track_id: str, response_url: str, error_url: str, langid: str = "ar", udf: dict = None) -> str:
    udf = udf or {}
    obj = {
        "amt": f"{float(amount):.2f}",
        "action": "1",
        "password": PASSWORD,
        "id": TRANPORTAL_ID,
        "currencyCode": CURRENCY_CODE,
        "trackId": str(track_id),
        "responseURL": response_url,
        "errorURL": error_url,
        "udf1": udf.get("udf1", ""), "udf2": udf.get("udf2", ""), "udf3": udf.get("udf3", ""),
        "udf4": udf.get("udf4", ""), "udf5": udf.get("udf5", ""),
        "langid": langid,
    }
    plaintext = json.dumps([obj], separators=(",", ":"), ensure_ascii=False)
    return _encrypt(plaintext)


async def create_payment(amount, track_id: str, response_url: str, error_url: str, langid: str = "ar", udf: dict = None) -> dict:
    """Returns {'payment_id', 'redirect_url'} for the hosted payment page."""
    trandata = build_trandata(amount, track_id, response_url, error_url, langid, udf)
    body = [{"id": TRANPORTAL_ID, "trandata": trandata, "responseURL": response_url, "errorURL": error_url}]
    async with httpx.AsyncClient(timeout=25) as client:
        r = await client.post(TOKEN_URL, json=body, headers={"Accept": "application/json"})
    r.raise_for_status()
    data = r.json()
    row = data[0] if isinstance(data, list) and data else data
    result = str(row.get("result", ""))
    if str(row.get("status")) != "1" or ":" not in result:
        raise ValueError(f"NeoLeap token generation failed: {row}")
    payment_id, redirect_url = result.split(":", 1)
    return {"payment_id": payment_id, "redirect_url": redirect_url}


def parse_callback(trandata: str) -> dict:
    data = _decrypt(trandata)
    return {
        "success": str(data.get("result", "")).upper() == "CAPTURED",
        "result": data.get("result"),
        "auth": data.get("auth"),
        "ref": data.get("ref"),
        "trackId": data.get("trackId"),
        "paymentId": data.get("paymentId"),
        "amt": data.get("amt"),
        "raw": data,
    }
