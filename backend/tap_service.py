"""Tap hosted checkout. Only test keys and test charges are accepted."""
import hashlib
import hmac
import os
import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from urllib.parse import urlencode, urlsplit

import httpx

SECRET = os.environ.get("TAP_SECRET_KEY")
BASE = os.environ.get("TAP_API_BASE")
WEBHOOK_URL = os.environ.get("TAP_WEBHOOK_URL")
REDIRECT_URL = os.environ.get("TAP_REDIRECT_URL")
LIVE_ALLOWED = os.environ.get("TAP_LIVE_ALLOWED")


class TapError(Exception):
    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.status_code = status_code


def is_configured():
    return bool(SECRET and SECRET.startswith("sk_test_") and LIVE_ALLOWED == "false"
                and all(value and urlsplit(value).scheme == "https"
                        for value in (BASE, WEBHOOK_URL, REDIRECT_URL)))


def amount_text(value, currency):
    places = 3 if currency in {"BHD", "KWD", "OMR", "JOD"} else 2
    amount = Decimal(str(value))
    if not amount.is_finite():
        raise ValueError("Invalid amount")
    return format(amount.quantize(Decimal(1).scaleb(-places), rounding=ROUND_HALF_UP), f".{places}f")


def valid_charge_id(value):
    return isinstance(value, str) and bool(re.fullmatch(r"chg_[A-Za-z0-9_-]{1,160}", value))


def valid_tap_hash(payload, signature, secret=None):
    secret = secret if secret is not None else SECRET
    if not secret or not isinstance(payload, dict) or not isinstance(signature, str):
        return False
    try:
        ref, transaction = payload.get("reference") or {}, payload.get("transaction") or {}
        material = (f"x_id{payload['id']}x_amount{amount_text(payload['amount'], payload['currency'])}"
                    f"x_currency{payload['currency']}x_gateway_reference{ref.get('gateway') or ''}"
                    f"x_payment_reference{ref.get('payment') or ''}x_status{payload['status']}"
                    f"x_created{transaction['created']}")
        expected = hmac.new(secret.encode(), material.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature.lower())
    except (KeyError, TypeError, ValueError, AttributeError, InvalidOperation):
        return False


async def _request(method, path, body=None):
    if not is_configured():
        raise TapError("الدفع التجريبي عبر Tap غير مهيّأ حاليًا.", 503)
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.request(method, f"{BASE.rstrip('/')}/{path}", json=body,
                headers={"Authorization": f"Bearer {SECRET}", "accept": "application/json", "lang_code": "ar"})
    except httpx.HTTPError:
        raise TapError("تعذّر الاتصال بـ Tap. لم نؤكد أي دفعة؛ يمكنك إعادة التحقق.") from None
    if response.status_code in (401, 403):
        raise TapError("تعذّر توثيق بوابة Tap. يرجى مراجعة إعدادات بوابة الدفع.", 503)
    if response.is_error:
        raise TapError("لم تقبل Tap طلب الدفع. حاول لاحقًا أو تواصل مع الدعم.")
    try:
        data = response.json()
    except ValueError:
        raise TapError("تعذّر قراءة نتيجة Tap.") from None
    if not isinstance(data, dict) or data.get("object") != "charge" or not valid_charge_id(data.get("id")):
        raise TapError("استجابة دفع غير صالحة من Tap.")
    if data.get("live_mode") is not False:
        raise TapError("الدفع الحقيقي معطّل؛ تقبل المنصة عمليات الاختبار فقط.", 409)
    return data


async def create_charge(order, user):
    name = user.get("name", "").strip().split(maxsplit=1)
    if not name or not user.get("email"):
        raise TapError("أكمل الاسم والبريد في ملفك الشخصي قبل الدفع.", 422)
    body = {
        "amount": order.amount, "currency": order.currency,
        "customer_initiated": True, "threeDSecure": True, "save_card": False,
        "description": f"اشتراك {order.plan_name} — {order.cycle} (اختبار)",
        "metadata": {"order_id": order.id, "plan_id": order.plan_id},
        "reference": {"transaction": order.id, "order": order.id, "idempotent": order.id},
        "customer": {"first_name": name[0], "email": user["email"]},
        "source": {"id": "src_all"}, "post": {"url": WEBHOOK_URL},
        "redirect": {"url": f"{REDIRECT_URL}?{urlencode({'order': order.id})}"},
    }
    if len(name) > 1:
        body["customer"]["last_name"] = name[1]
    return await _request("POST", "charges/", body)


async def retrieve_charge(charge_id):
    if not valid_charge_id(charge_id):
        raise TapError("مرجع الدفع غير صالح.", 400)
    data = await _request("GET", f"charges/{charge_id}")
    if data["id"] != charge_id:
        raise TapError("مرجع نتيجة Tap لا يطابق عملية الدفع.", 409)
    return data


def checkout_url(charge):
    url = (charge.get("transaction") or {}).get("url")
    parsed = urlsplit(url or "")
    # Hosted Tap URLs only; never redirect the browser to arbitrary upstream data.
    if parsed.scheme != "https" or not parsed.hostname or not (parsed.hostname == "tap.company" or parsed.hostname.endswith(".tap.company")):
        raise TapError("رابط الدفع الآمن غير متاح. أعد التحقق من الطلب.")
    return url
