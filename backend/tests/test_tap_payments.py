"""Tap payments-focused backend tests (iteration 12).

Covers:
- Tap config visibility from /api/account/overview (payment_config).
- /api/account/subscribe: idempotency, conflict on plan/cycle mismatch, inactive plan 404,
  extra field rejection (extra="forbid" implies amount tampering rejection).
- Ownership isolation on payment-session, /payments/tap/start, /payments/tap/verify,
  /payments/order-status (anonymous 401, cross-owner 404).
- Webhook signature enforcement (missing / bad JSON / bad signature).
- Tap adapter unit-level helpers (amount_text, valid_tap_hash, valid_charge_id, is_configured).
- No legacy Moyasar/NeoLeap routes exposed.
"""
import hmac
import hashlib
import os
import sys
import uuid
import time

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

# Add backend to path for direct helper testing and load its .env for helper env
sys.path.insert(0, "/app/backend")
from dotenv import load_dotenv  # noqa: E402
load_dotenv("/app/backend/.env")


# ---------- Fixtures ----------

def _register(email, password="Passw0rd!123", name="Tap Tester"):
    s = requests.Session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": password, "name": name})
    if r.status_code not in (200, 201):
        # Fall back to login (already exists)
        r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code in (200, 201), f"auth failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def customer_a():
    email = f"TEST_tap_a_{uuid.uuid4().hex[:8]}@example.com"
    s = _register(email)
    return {"session": s, "email": email}


@pytest.fixture(scope="module")
def customer_b():
    email = f"TEST_tap_b_{uuid.uuid4().hex[:8]}@example.com"
    s = _register(email)
    return {"session": s, "email": email}


@pytest.fixture(scope="module")
def public_plans():
    r = requests.get(f"{API}/public/plans")
    assert r.status_code == 200, r.text
    plans = r.json()
    # Skip if no paid plan available
    paid = [p for p in plans if float(p.get("price_monthly") or 0) > 0]
    if not paid:
        pytest.skip("No paid plans available for testing")
    return paid


# ---------- Config / overview ----------

class TestPaymentConfig:
    def test_overview_reports_tap_provider(self, customer_a):
        r = customer_a["session"].get(f"{API}/account/overview")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "payment" in data
        assert data["payment"]["provider"] == "tap"
        assert data["payment"]["mode"] == "test"
        assert isinstance(data["payment"]["configured"], bool)
        assert isinstance(data["payment"]["enabled"], bool)

    def test_overview_requires_auth(self):
        r = requests.get(f"{API}/account/overview")
        assert r.status_code in (401, 403), r.status_code


# ---------- Subscribe endpoint ----------

class TestSubscribe:
    def test_subscribe_creates_pending_tap_order(self, customer_a, public_plans):
        plan = public_plans[0]
        r = customer_a["session"].post(f"{API}/account/subscribe",
                                        json={"plan_id": plan["id"], "cycle": "monthly"})
        # If Tap disabled by admin -> 503
        if r.status_code == 503:
            pytest.skip("Tap disabled by admin; skipping order tests")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["provider"] == "tap"
        assert data["mode"] == "test"
        order = data["order"]
        assert order["status"] == "pending_payment"
        assert order["plan_id"] == plan["id"]
        assert order["cycle"] == "monthly"
        assert order["amount"] == plan["price_monthly"]
        assert order["currency"] == plan["currency"]
        assert order["provider"] == "tap"
        # No mongo _id leak
        assert "_id" not in order

    def test_subscribe_idempotent_same_request_id(self, customer_a, public_plans):
        plan = public_plans[0]
        req_id = str(uuid.uuid4())
        payload = {"plan_id": plan["id"], "cycle": "monthly", "request_id": req_id}
        r1 = customer_a["session"].post(f"{API}/account/subscribe", json=payload)
        if r1.status_code == 503:
            pytest.skip("Tap disabled")
        assert r1.status_code == 200, r1.text
        r2 = customer_a["session"].post(f"{API}/account/subscribe", json=payload)
        assert r2.status_code == 200
        assert r1.json()["order"]["id"] == r2.json()["order"]["id"]

    def test_subscribe_conflict_on_plan_change_same_request_id(self, customer_a, public_plans):
        if len(public_plans) < 2:
            pytest.skip("Need >=2 plans")
        req_id = str(uuid.uuid4())
        r1 = customer_a["session"].post(f"{API}/account/subscribe",
            json={"plan_id": public_plans[0]["id"], "cycle": "monthly", "request_id": req_id})
        if r1.status_code == 503:
            pytest.skip("Tap disabled")
        assert r1.status_code == 200
        r2 = customer_a["session"].post(f"{API}/account/subscribe",
            json={"plan_id": public_plans[1]["id"], "cycle": "monthly", "request_id": req_id})
        assert r2.status_code == 409, r2.text

    def test_subscribe_conflict_on_cycle_change_same_request_id(self, customer_a, public_plans):
        plan = public_plans[0]
        req_id = str(uuid.uuid4())
        r1 = customer_a["session"].post(f"{API}/account/subscribe",
            json={"plan_id": plan["id"], "cycle": "monthly", "request_id": req_id})
        if r1.status_code == 503:
            pytest.skip("Tap disabled")
        assert r1.status_code == 200
        r2 = customer_a["session"].post(f"{API}/account/subscribe",
            json={"plan_id": plan["id"], "cycle": "yearly", "request_id": req_id})
        assert r2.status_code == 409, r2.text

    def test_subscribe_rejects_extra_fields(self, customer_a, public_plans):
        plan = public_plans[0]
        r = customer_a["session"].post(f"{API}/account/subscribe",
            json={"plan_id": plan["id"], "cycle": "monthly", "amount": 1})
        assert r.status_code == 422, r.text

    def test_subscribe_rejects_invalid_plan(self, customer_a):
        r = customer_a["session"].post(f"{API}/account/subscribe",
            json={"plan_id": "000000000000000000000000", "cycle": "monthly"})
        # Either 503 (tap disabled) evaluated first (require_enabled) or 404
        assert r.status_code in (404, 503), r.text

    def test_subscribe_requires_auth(self, public_plans):
        r = requests.post(f"{API}/account/subscribe",
            json={"plan_id": public_plans[0]["id"], "cycle": "monthly"})
        assert r.status_code in (401, 403)


# ---------- Ownership isolation ----------

class TestOwnership:
    @pytest.fixture(scope="class")
    def order_a(self, customer_a, public_plans):
        r = customer_a["session"].post(f"{API}/account/subscribe",
            json={"plan_id": public_plans[0]["id"], "cycle": "monthly"})
        if r.status_code == 503:
            pytest.skip("Tap disabled")
        assert r.status_code == 200
        return r.json()["order"]

    def test_payment_session_owner(self, customer_a, order_a):
        r = customer_a["session"].get(f"{API}/account/payment-session/{order_a['id']}")
        assert r.status_code == 200
        data = r.json()
        assert data["provider"] == "tap"
        assert data["mode"] == "test"
        assert data["order_id"] == order_a["id"]
        assert data["amount"] == order_a["amount"]
        assert data["currency"] == order_a["currency"]

    def test_payment_session_other_owner_404(self, customer_b, order_a):
        r = customer_b["session"].get(f"{API}/account/payment-session/{order_a['id']}")
        assert r.status_code == 404, r.text

    def test_payment_session_anonymous_401(self, order_a):
        r = requests.get(f"{API}/account/payment-session/{order_a['id']}")
        assert r.status_code in (401, 403)

    def test_order_status_other_owner_404(self, customer_b, order_a):
        r = customer_b["session"].get(f"{API}/payments/order-status/{order_a['id']}")
        assert r.status_code == 404

    def test_tap_start_other_owner_404(self, customer_b, order_a):
        r = customer_b["session"].post(f"{API}/payments/tap/start/{order_a['id']}")
        assert r.status_code == 404

    def test_tap_verify_wrong_owner_404(self, customer_b):
        r = customer_b["session"].post(f"{API}/payments/tap/verify",
            json={"tap_id": "chg_nonexistent_test_123"})
        assert r.status_code == 404

    def test_tap_verify_anon_401(self):
        r = requests.post(f"{API}/payments/tap/verify", json={"tap_id": "chg_test_abcd"})
        assert r.status_code in (401, 403)

    def test_tap_verify_rejects_bad_id_format(self, customer_a):
        r = customer_a["session"].post(f"{API}/payments/tap/verify",
            json={"tap_id": "not-a-tap-charge"})
        assert r.status_code == 422

    def test_order_status_bad_id_404(self, customer_a):
        r = customer_a["session"].get(f"{API}/payments/order-status/deadbeefdeadbeefdeadbeef")
        assert r.status_code == 404


# ---------- Webhook ----------

class TestWebhook:
    def test_webhook_missing_signature(self):
        r = requests.post(f"{API}/payments/tap/webhook", json={"id": "chg_x", "status": "CAPTURED",
                                                                "amount": 1, "currency": "SAR",
                                                                "live_mode": False})
        assert r.status_code == 400, r.text

    def test_webhook_bad_json(self):
        r = requests.post(f"{API}/payments/tap/webhook", data="not-json",
                          headers={"content-type": "application/json", "hashstring": "x" * 64})
        assert r.status_code == 400

    def test_webhook_bad_signature(self):
        payload = {"id": "chg_fake_forgery", "status": "CAPTURED", "amount": 1, "currency": "SAR",
                   "live_mode": False, "reference": {"gateway": "g", "payment": "p"},
                   "transaction": {"created": "2026-01-01"}}
        r = requests.post(f"{API}/payments/tap/webhook", json=payload,
                          headers={"hashstring": "0" * 64})
        assert r.status_code == 400

    def test_webhook_rejects_live_mode(self):
        # Even with any signature, live_mode true should be rejected. Uses valid signature computed
        # against the secret so we can reach the live_mode gate.
        secret = os.environ.get("TAP_SECRET_KEY", "")
        if not secret.startswith("sk_test_"):
            pytest.skip("Non-test Tap secret unavailable in env")
        payload = {"id": "chg_live_check_123", "status": "CAPTURED", "amount": 1, "currency": "SAR",
                   "live_mode": True, "reference": {"gateway": "g1", "payment": "p1"},
                   "transaction": {"created": "2026-01-01T00:00:00Z"}}
        material = (f"x_id{payload['id']}x_amount1.00x_currencySAR"
                    f"x_gateway_referenceg1x_payment_referencep1"
                    f"x_statusCAPTUREDx_created2026-01-01T00:00:00Z")
        sig = hmac.new(secret.encode(), material.encode(), hashlib.sha256).hexdigest()
        r = requests.post(f"{API}/payments/tap/webhook", json=payload,
                          headers={"hashstring": sig})
        assert r.status_code == 400


# ---------- Unit tests for tap_service ----------

class TestTapServiceHelpers:
    def test_is_configured_true_with_test_key(self):
        import tap_service
        # Requires sk_test_ + LIVE_ALLOWED=false + https URLs
        assert tap_service.is_configured() is True

    def test_amount_text_two_decimals_sar(self):
        import tap_service
        assert tap_service.amount_text(19.9, "SAR") == "19.90"
        assert tap_service.amount_text(19.995, "SAR") == "20.00"

    def test_amount_text_three_decimals_bhd(self):
        import tap_service
        assert tap_service.amount_text(1.2345, "BHD") == "1.235"

    def test_valid_charge_id(self):
        import tap_service
        assert tap_service.valid_charge_id("chg_abc_DEF-123")
        assert not tap_service.valid_charge_id("charge_bad")
        assert not tap_service.valid_charge_id(None)
        assert not tap_service.valid_charge_id("chg_" + "x" * 200)

    def test_valid_tap_hash_true_for_correct_signature(self):
        import tap_service
        secret = os.environ["TAP_SECRET_KEY"]
        payload = {"id": "chg_sig_ok", "amount": 25, "currency": "SAR",
                   "status": "CAPTURED", "reference": {"gateway": "g", "payment": "p"},
                   "transaction": {"created": "2026-01-01T00:00:00Z"}}
        material = ("x_idchg_sig_okx_amount25.00x_currencySAR"
                    "x_gateway_referencegx_payment_referencep"
                    "x_statusCAPTUREDx_created2026-01-01T00:00:00Z")
        sig = hmac.new(secret.encode(), material.encode(), hashlib.sha256).hexdigest()
        assert tap_service.valid_tap_hash(payload, sig) is True
        assert tap_service.valid_tap_hash(payload, "0" * 64) is False
        assert tap_service.valid_tap_hash(payload, None) is False

    def test_valid_tap_hash_rejects_tampered_amount(self):
        import tap_service
        secret = os.environ["TAP_SECRET_KEY"]
        payload = {"id": "chg_tamper", "amount": 25, "currency": "SAR",
                   "status": "CAPTURED", "reference": {"gateway": "g", "payment": "p"},
                   "transaction": {"created": "2026-01-01T00:00:00Z"}}
        material = ("x_idchg_tamperx_amount25.00x_currencySAR"
                    "x_gateway_referencegx_payment_referencep"
                    "x_statusCAPTUREDx_created2026-01-01T00:00:00Z")
        sig = hmac.new(secret.encode(), material.encode(), hashlib.sha256).hexdigest()
        # Tamper amount
        payload["amount"] = 1
        assert tap_service.valid_tap_hash(payload, sig) is False


# ---------- Legacy provider endpoints removed ----------

class TestLegacyRemoved:
    @pytest.mark.parametrize("path", [
        "/payments/moyasar/webhook",
        "/payments/moyasar/create",
        "/payments/neoleap/start",
        "/payments/neoleap/callback",
        "/payments/create",
    ])
    def test_legacy_routes_absent(self, path):
        r = requests.post(f"{API}{path}", json={})
        # 404 = route removed, or 405 method. Reject 200/2xx which would imply live legacy handler.
        assert r.status_code in (404, 405, 401, 403), f"Legacy route {path} still active: {r.status_code}"
