"""Iteration 13 — deep Tap settlement / idempotency / validate_charge / _start_charge coverage.

Directly exercises payment_orders.settle, _grant_subscription, validate_charge,
routers.payments._start_charge and tap_service.is_configured with in-process
async calls against the same Mongo backend the server uses. HTTP paths for the
webhook are hit via requests. All test-only data is prefixed TEST_ and cleaned
up. No real Tap network calls (tap_service.create_charge / retrieve_charge is
monkeypatched where needed).
"""
import asyncio
import hashlib
import hmac
import importlib
import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
import requests
from bson import ObjectId

sys.path.insert(0, "/app/backend")
from dotenv import load_dotenv  # noqa: E402

load_dotenv("/app/backend/.env")

from db import db as _db_module_ref, to_oid  # noqa: E402
import db as _db_mod  # noqa: E402
db = _db_module_ref
import payment_orders  # noqa: E402
import tap_service  # noqa: E402
from payment_orders import (  # noqa: E402
    PaymentOrder,
    _grant_subscription,
    now,
    settle,
    status_response,
    validate_charge,
)
from routers import payments as payments_router  # noqa: E402

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
TAP_SECRET = os.environ.get("TAP_SECRET_KEY", "")

# Share one event loop across the module so motor's client stays bound.
pytestmark = pytest.mark.asyncio(loop_scope="module")


@pytest_asyncio.fixture(autouse=True, loop_scope="module")
async def _rebind_motor_to_current_loop(monkeypatch):
    """Motor caches the loop on first use. Rebind db/payment_orders/routers to a
    fresh client bound to the current test's loop so each test can run isolated."""
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    fresh = client[os.environ["DB_NAME"]]
    global db
    db = fresh
    monkeypatch.setattr(_db_mod, "db", fresh)
    monkeypatch.setattr(payment_orders, "db", fresh)
    monkeypatch.setattr(payments_router, "db", fresh)
    yield
    client.close()


# --------------------------- helpers ---------------------------

def _iso(dt):
    return dt.astimezone(timezone.utc).isoformat()


def _canonical_material(payload):
    ref = payload.get("reference") or {}
    tx = payload.get("transaction") or {}
    return (
        f"x_id{payload['id']}"
        f"x_amount{tap_service.amount_text(payload['amount'], payload['currency'])}"
        f"x_currency{payload['currency']}"
        f"x_gateway_reference{ref.get('gateway') or ''}"
        f"x_payment_reference{ref.get('payment') or ''}"
        f"x_status{payload['status']}"
        f"x_created{tx['created']}"
    )


def _sign(payload):
    return hmac.new(TAP_SECRET.encode(),
                    _canonical_material(payload).encode(),
                    hashlib.sha256).hexdigest()


def _canonical_captured(order, charge_id, extra=None):
    """Charge dict shaped exactly as Tap's canonical CAPTURED payload."""
    payload = {
        "object": "charge",
        "id": charge_id,
        "status": "CAPTURED",
        "amount": order.amount,
        "currency": order.currency,
        "live_mode": False,
        "reference": {"order": order.id, "transaction": order.id,
                      "gateway": "gw_" + charge_id[-6:], "payment": "pm_" + charge_id[-6:]},
        "metadata": {"order_id": order.id, "plan_id": order.plan_id},
        "transaction": {"created": "2026-01-15T10:00:00Z", "url": "https://x.tap.company/pay/x"},
    }
    if extra:
        payload.update(extra)
    return payload


async def _mk_user(name="TEST settlement user"):
    email = f"TEST_settle_{uuid.uuid4().hex[:8]}@example.com"
    doc = {"email": email, "name": name, "role": "customer",
           "password_hash": "$2b$12$invalidhashfortestingonly.................",
           "created_at": now()}
    r = await db.users.insert_one(doc)
    return str(r.inserted_id), email


async def _mk_plan(name="TEST Plan", price=25.0, currency="SAR"):
    doc = {"name": name, "price_monthly": price, "price_yearly": price * 10,
           "currency": currency, "is_active": True, "order": 999,
           "features": [], "created_at": now()}
    r = await db.plans.insert_one(doc)
    return str(r.inserted_id)


async def _mk_order(user_id, plan_id, plan_name="TEST Plan", amount=25.0, currency="SAR",
                    payment_id=None, cycle="monthly"):
    order = PaymentOrder(owner_id=user_id, plan_id=plan_id, plan_name=plan_name,
                         cycle=cycle, amount=amount, currency=currency,
                         request_id=str(uuid.uuid4()), payment_id=payment_id)
    await db.orders.insert_one(order.to_mongo())
    return order


async def _cleanup_user(user_id):
    oid = ObjectId(user_id)
    await db.orders.delete_many({"owner_id": user_id})
    await db.users.delete_one({"_id": oid})


async def _cleanup_plan(plan_id):
    await db.plans.delete_one({"_id": ObjectId(plan_id)})


# --------------------------- module-level fixture ---------------------------

@pytest_asyncio.fixture(loop_scope="module")
async def scenario():
    """Fresh user + plan + pristine order per test."""
    user_id, email = await _mk_user()
    plan_id = await _mk_plan()
    order = await _mk_order(user_id, plan_id, payment_id=f"chg_test_{uuid.uuid4().hex[:12]}")
    yield {"user_id": user_id, "email": email, "plan_id": plan_id, "order": order}
    await _cleanup_user(user_id)
    await _cleanup_plan(plan_id)


# --------------------------- settle / grant / idempotency ---------------------------

class TestSettleCaptured:
    @pytest.mark.asyncio
    async def test_captured_grants_subscription_end_to_end(self, scenario):
        order = scenario["order"]
        charge = _canonical_captured(order, order.payment_id)
        result = await settle(order, charge)
        assert result["status"] == "paid"
        assert result["activated"] is True
        assert result["mode"] == "test"
        user = await db.users.find_one({"_id": ObjectId(scenario["user_id"])})
        assert user["plan_id"] == order.plan_id
        assert user["plan_cycle"] == "monthly"
        assert user["subscription_status"] == "active"
        assert user["subscription_payment_mode"] == "test"
        assert user["subscription_payment_order"] == order.id
        # renews_at ~ paid_at + 30d
        paid_at = datetime.fromisoformat(user["subscription_payment_at"])
        renews = datetime.fromisoformat(user["subscription_renews_at"])
        assert timedelta(days=29) < (renews - paid_at) < timedelta(days=31)
        odoc = await db.orders.find_one({"_id": to_oid(order.id)})
        assert odoc["paid_at"] and odoc["fulfilled_at"]
        assert odoc["status"] == "paid"

    @pytest.mark.asyncio
    async def test_captured_twice_is_idempotent_expiry_stable(self, scenario):
        order = scenario["order"]
        charge = _canonical_captured(order, order.payment_id)
        await settle(order, charge)
        u1 = await db.users.find_one({"_id": ObjectId(scenario["user_id"])})
        first_renews = u1["subscription_renews_at"]
        first_paid_at = u1["subscription_payment_at"]
        # replay
        odoc = await db.orders.find_one({"_id": to_oid(order.id)})
        order_after = PaymentOrder.from_mongo(odoc)
        await settle(order_after, charge)
        u2 = await db.users.find_one({"_id": ObjectId(scenario["user_id"])})
        assert u2["subscription_renews_at"] == first_renews, "second CAPTURED must not extend expiry"
        assert u2["subscription_payment_at"] == first_paid_at

    @pytest.mark.asyncio
    async def test_crash_recovery_paid_at_set_fulfilled_absent(self, scenario):
        order = scenario["order"]
        # Simulate crash: order was marked paid but grant never ran.
        paid_at_iso = _iso(datetime.now(timezone.utc))
        await db.orders.update_one({"_id": to_oid(order.id)},
                                   {"$set": {"status": "paid", "paid_at": paid_at_iso,
                                             "gateway_status": "CAPTURED"}})
        odoc = await db.orders.find_one({"_id": to_oid(order.id)})
        stale = PaymentOrder.from_mongo(odoc)
        assert stale.paid_at and not stale.fulfilled_at
        charge = _canonical_captured(order, order.payment_id)
        result = await settle(stale, charge)
        assert result["activated"] is True
        user = await db.users.find_one({"_id": ObjectId(scenario["user_id"])})
        assert user["subscription_status"] == "active"
        assert user["plan_id"] == order.plan_id

    @pytest.mark.asyncio
    async def test_grant_exception_then_retry_completes(self, scenario):
        order = scenario["order"]
        # delete the user so _grant_subscription raises 409
        await db.users.delete_one({"_id": ObjectId(scenario["user_id"])})
        charge = _canonical_captured(order, order.payment_id)
        with pytest.raises(Exception):
            await settle(order, charge)
        odoc = await db.orders.find_one({"_id": to_oid(order.id)})
        assert odoc["paid_at"] and not odoc.get("fulfilled_at"), \
            "paid_at claimed but fulfilled_at must remain None after grant failure"
        # Restore user, retry
        await db.users.insert_one({"_id": ObjectId(scenario["user_id"]),
                                    "email": scenario["email"], "name": "restored",
                                    "role": "customer", "created_at": now()})
        stale = PaymentOrder.from_mongo(odoc)
        result = await settle(stale, charge)
        assert result["activated"] is True
        user = await db.users.find_one({"_id": ObjectId(scenario["user_id"])})
        assert user["plan_id"] == order.plan_id

    @pytest.mark.asyncio
    async def test_older_payment_does_not_override_newer_plan(self, scenario):
        """User already on newer plan (subscription_payment_at in future) — older order settlement
        must NOT overwrite plan_id / renews_at, though it can still mark the order fulfilled."""
        order = scenario["order"]
        newer_paid_at = _iso(datetime.now(timezone.utc) + timedelta(days=30))
        newer_plan_id = str(ObjectId())
        await db.users.update_one({"_id": ObjectId(scenario["user_id"])},
            {"$set": {"plan_id": newer_plan_id, "plan_cycle": "yearly",
                      "subscription_status": "active",
                      "subscription_renews_at": _iso(datetime.now(timezone.utc) + timedelta(days=365)),
                      "subscription_payment_at": newer_paid_at,
                      "subscription_payment_order": "newer_order_id",
                      "subscription_payment_mode": "test"}})
        charge = _canonical_captured(order, order.payment_id)
        await settle(order, charge)
        user = await db.users.find_one({"_id": ObjectId(scenario["user_id"])})
        assert user["plan_id"] == newer_plan_id, "older order must not override newer plan"
        assert user["subscription_payment_at"] == newer_paid_at

    @pytest.mark.asyncio
    async def test_failed_status_after_captured_does_not_downgrade(self, scenario):
        order = scenario["order"]
        # settle CAPTURED
        await settle(order, _canonical_captured(order, order.payment_id))
        u1 = await db.users.find_one({"_id": ObjectId(scenario["user_id"])})
        odoc = await db.orders.find_one({"_id": to_oid(order.id)})
        fulfilled_at = odoc["fulfilled_at"]
        after_paid = PaymentOrder.from_mongo(odoc)
        # feed FAILED for same order
        failed_charge = _canonical_captured(order, order.payment_id, extra={"status": "FAILED"})
        await settle(after_paid, failed_charge)
        u2 = await db.users.find_one({"_id": ObjectId(scenario["user_id"])})
        odoc2 = await db.orders.find_one({"_id": to_oid(order.id)})
        assert u2["plan_id"] == u1["plan_id"]
        assert u2["subscription_status"] == "active"
        assert odoc2["fulfilled_at"] == fulfilled_at, "successful fulfilment must not be reverted"
        # order.status may remain 'paid' since update filter requires paid_at:null
        assert odoc2["status"] == "paid"

    @pytest.mark.asyncio
    async def test_pending_initiated_after_captured_does_not_downgrade(self, scenario):
        order = scenario["order"]
        await settle(order, _canonical_captured(order, order.payment_id))
        after = PaymentOrder.from_mongo(await db.orders.find_one({"_id": to_oid(order.id)}))
        await settle(after, _canonical_captured(order, order.payment_id, extra={"status": "INITIATED"}))
        odoc = await db.orders.find_one({"_id": to_oid(order.id)})
        assert odoc["status"] == "paid"
        assert odoc["fulfilled_at"]


# --------------------------- validate_charge full binding ---------------------------

class TestValidateCharge:
    def _base(self, order):
        return {
            "object": "charge", "id": order.payment_id, "live_mode": False,
            "amount": order.amount, "currency": order.currency,
            "reference": {"order": order.id, "transaction": order.id},
            "metadata": {"order_id": order.id, "plan_id": order.plan_id},
        }

    @pytest.mark.asyncio
    async def test_valid_charge_passes(self, scenario):
        order = scenario["order"]
        # Must not raise
        validate_charge(order, self._base(order))
        user = await db.users.find_one({"_id": ObjectId(scenario["user_id"])})
        # validate_charge alone must not write anything on the user
        assert "plan_id" not in user or user.get("subscription_status") != "active"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("mutation", [
        ("amount", 26.0),
        ("amount", 25.001),
        ("amount", "25.00abc"),
        ("currency", "USD"),
        ("id", "chg_someone_else"),
        ("live_mode", True),
        ("object", "authorization"),
    ])
    async def test_top_level_mismatch_blocks_entitlement(self, scenario, mutation):
        order = scenario["order"]
        charge = self._base(order)
        charge[mutation[0]] = mutation[1]
        with pytest.raises(Exception):
            validate_charge(order, charge)
        user = await db.users.find_one({"_id": ObjectId(scenario["user_id"])})
        assert user.get("subscription_status") != "active"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("path,val", [
        (("metadata", "order_id"), "wrong_order"),
        (("metadata", "plan_id"), "wrong_plan"),
        (("reference", "order"), "wrong_ref"),
        (("reference", "transaction"), "wrong_tx"),
    ])
    async def test_nested_mismatch_blocks_entitlement(self, scenario, path, val):
        order = scenario["order"]
        charge = self._base(order)
        charge[path[0]][path[1]] = val
        with pytest.raises(Exception):
            validate_charge(order, charge)
        user = await db.users.find_one({"_id": ObjectId(scenario["user_id"])})
        assert user.get("subscription_status") != "active"

    def test_amount_with_matching_extra_decimals_ok(self):
        order = PaymentOrder(owner_id=str(ObjectId()), plan_id=str(ObjectId()),
                             plan_name="p", cycle="monthly", amount=19.90, currency="SAR",
                             request_id="r", payment_id="chg_x")
        charge = {"object": "charge", "id": "chg_x", "live_mode": False,
                  "amount": 19.9, "currency": "SAR",
                  "reference": {"order": order.id, "transaction": order.id},
                  "metadata": {"order_id": order.id, "plan_id": order.plan_id}}
        validate_charge(order, charge)  # 19.90 == 19.9 as Decimal

    def test_amount_mismatch_extra_decimals_blocked(self):
        order = PaymentOrder(owner_id=str(ObjectId()), plan_id=str(ObjectId()),
                             plan_name="p", cycle="monthly", amount=19.90, currency="SAR",
                             request_id="r", payment_id="chg_x")
        charge = {"object": "charge", "id": "chg_x", "live_mode": False,
                  "amount": 19.91, "currency": "SAR",
                  "reference": {"order": order.id, "transaction": order.id},
                  "metadata": {"order_id": order.id, "plan_id": order.plan_id}}
        with pytest.raises(Exception):
            validate_charge(order, charge)


# --------------------------- is_configured variants ---------------------------

class TestIsConfigured:
    def test_configured_true_with_sandbox_env(self):
        # Reload from actual env
        importlib.reload(tap_service)
        assert tap_service.is_configured() is True

    def test_live_secret_rejected(self, monkeypatch):
        monkeypatch.setattr(tap_service, "SECRET", "sk_live_deadbeef")
        monkeypatch.setattr(tap_service, "LIVE_ALLOWED", "false")
        assert tap_service.is_configured() is False

    @pytest.mark.parametrize("val", ["true", "True", "TRUE", "1", "", None, "yes"])
    def test_live_allowed_variants_all_disable(self, monkeypatch, val):
        monkeypatch.setattr(tap_service, "LIVE_ALLOWED", val)
        assert tap_service.is_configured() is False, f"LIVE_ALLOWED={val!r} must not enable Tap"

    def test_missing_urls_disable(self, monkeypatch):
        monkeypatch.setattr(tap_service, "WEBHOOK_URL", "")
        assert tap_service.is_configured() is False

    def test_http_url_disables(self, monkeypatch):
        monkeypatch.setattr(tap_service, "BASE", "http://api.tap.company/v2")
        assert tap_service.is_configured() is False


# --------------------------- _start_charge idempotency / lock ---------------------------

class TestStartCharge:
    @pytest.mark.asyncio
    async def test_concurrent_start_second_gets_409(self, scenario, monkeypatch):
        order = await _mk_order(scenario["user_id"], scenario["plan_id"])  # fresh order no payment_id
        captured = []

        async def slow_create(o, u):
            captured.append(o.id)
            await asyncio.sleep(0.3)
            return {"object": "charge", "id": f"chg_slow_{o.id[-8:]}",
                    "status": "INITIATED", "live_mode": False,
                    "amount": o.amount, "currency": o.currency,
                    "reference": {"order": o.id, "transaction": o.id},
                    "metadata": {"order_id": o.id, "plan_id": o.plan_id},
                    "transaction": {"url": "https://checkout.tap.company/x"}}

        monkeypatch.setattr(tap_service, "create_charge", slow_create)
        monkeypatch.setattr(tap_service, "checkout_url", lambda c: c["transaction"]["url"])
        user = {"id": scenario["user_id"], "email": scenario["email"], "name": "Test User"}

        # Fire two concurrent starts on the same order
        r = await asyncio.gather(
            payments_router._start_charge(order, user),
            payments_router._start_charge(order, user),
            return_exceptions=True,
        )
        successes = [x for x in r if isinstance(x, dict)]
        errors = [x for x in r if isinstance(x, Exception)]
        assert len(successes) == 1, f"only one create allowed, got {r}"
        assert len(errors) == 1 and getattr(errors[0], "status_code", None) == 409
        assert len(captured) == 1, "second caller must not invoke Tap create"

    @pytest.mark.asyncio
    async def test_start_charge_reference_idempotent_equals_order_id(self, scenario, monkeypatch):
        order = await _mk_order(scenario["user_id"], scenario["plan_id"])
        sent_body = {}

        async def fake_request(method, path, body=None):
            sent_body.update(body or {})
            return {"object": "charge", "id": "chg_fake_ref_check",
                    "status": "INITIATED", "live_mode": False,
                    "amount": body["amount"], "currency": body["currency"],
                    "reference": body["reference"], "metadata": body["metadata"],
                    "transaction": {"url": "https://checkout.tap.company/z"}}

        monkeypatch.setattr(tap_service, "_request", fake_request)
        # Call create_charge directly (not going through _start_charge locking)
        user = {"id": scenario["user_id"], "email": scenario["email"], "name": "First Last"}
        await tap_service.create_charge(order, user)
        assert sent_body["reference"]["idempotent"] == order.id
        assert sent_body["reference"]["order"] == order.id
        assert sent_body["reference"]["transaction"] == order.id
        assert sent_body["metadata"]["order_id"] == order.id
        assert sent_body["metadata"]["plan_id"] == order.plan_id

    @pytest.mark.asyncio
    async def test_start_charge_lost_response_sets_verification_required(self, scenario, monkeypatch):
        order = await _mk_order(scenario["user_id"], scenario["plan_id"])

        async def timeout_create(o, u):
            raise tap_service.TapError("تعذّر الاتصال بـ Tap. لم نؤكد أي دفعة؛ يمكنك إعادة التحقق.")

        monkeypatch.setattr(tap_service, "create_charge", timeout_create)
        user = {"id": scenario["user_id"], "email": scenario["email"], "name": "Test User"}
        with pytest.raises(Exception):
            await payments_router._start_charge(order, user)
        odoc = await db.orders.find_one({"_id": to_oid(order.id)})
        assert odoc["status"] == "verification_required"
        assert odoc["payment_id"] is None
        # creation_started_at set so subsequent retry reuses same reference/order
        assert odoc["creation_started_at"]

        # Retry: succeeds, order.id (reference) unchanged
        seen = {}

        async def ok_create(o, u):
            seen["order_id"] = o.id
            return {"object": "charge", "id": f"chg_retry_{o.id[-6:]}",
                    "status": "INITIATED", "live_mode": False,
                    "amount": o.amount, "currency": o.currency,
                    "reference": {"order": o.id, "transaction": o.id},
                    "metadata": {"order_id": o.id, "plan_id": o.plan_id},
                    "transaction": {"url": "https://checkout.tap.company/y"}}

        monkeypatch.setattr(tap_service, "create_charge", ok_create)
        monkeypatch.setattr(tap_service, "checkout_url", lambda c: c["transaction"]["url"])
        retry_order = PaymentOrder.from_mongo(odoc)
        await payments_router._start_charge(retry_order, user)
        assert seen["order_id"] == order.id, "retry must reuse SAME order.id as idempotent reference"

    @pytest.mark.asyncio
    async def test_start_charge_23h_expiry_blocks_retry(self, scenario):
        old = _iso(datetime.now(timezone.utc) - timedelta(hours=24))
        order = await _mk_order(scenario["user_id"], scenario["plan_id"])
        await db.orders.update_one({"_id": to_oid(order.id)},
            {"$set": {"creation_started_at": old, "status": "verification_required"}})
        stale = PaymentOrder.from_mongo(await db.orders.find_one({"_id": to_oid(order.id)}))
        user = {"id": scenario["user_id"], "email": scenario["email"], "name": "Test User"}
        with pytest.raises(Exception) as exc:
            await payments_router._start_charge(stale, user)
        assert getattr(exc.value, "status_code", None) == 409


# --------------------------- Webhook (HTTP) with a computed valid signature ---------------------------

class TestWebhookRealSignature:
    """These hit the running FastAPI service via HTTP. Uses real TAP_SECRET_KEY
    to compute a valid signature but crafts payloads that fail at other gates
    (reference mismatch → 409, unknown id → 404) so no live Tap retrieve is
    triggered."""

    @pytest_asyncio.fixture(loop_scope="module")
    async def owned_order_with_payment(self):
        user_id, email = await _mk_user()
        plan_id = await _mk_plan()
        pid = f"chg_wh_{uuid.uuid4().hex[:12]}"
        order = await _mk_order(user_id, plan_id, payment_id=pid)
        yield {"user_id": user_id, "plan_id": plan_id, "order": order, "payment_id": pid}
        await _cleanup_user(user_id)
        await _cleanup_plan(plan_id)

    async def test_valid_sig_reference_mismatch_returns_409_and_no_entitlement(self, owned_order_with_payment):
        if not TAP_SECRET.startswith("sk_test_"):
            pytest.skip("Tap sandbox secret not configured")
        ctx = owned_order_with_payment
        order = ctx["order"]
        # Valid signature payload, but reference.order != order.id
        payload = {"object": "charge", "id": ctx["payment_id"], "status": "CAPTURED",
                   "amount": order.amount, "currency": order.currency, "live_mode": False,
                   "reference": {"gateway": "g", "payment": "p",
                                 "order": "TAMPERED", "transaction": order.id},
                   "metadata": {"order_id": order.id, "plan_id": order.plan_id},
                   "transaction": {"created": "2026-01-15T10:00:00Z"}}
        sig = _sign(payload)
        r = requests.post(f"{API}/payments/tap/webhook", json=payload,
                          headers={"hashstring": sig})
        assert r.status_code == 409, r.text
        # user unchanged
        user = await db.users.find_one({"_id": ObjectId(ctx["user_id"])})
        assert user.get("subscription_status") != "active"

    async def test_valid_sig_unknown_charge_returns_404(self):
        if not TAP_SECRET.startswith("sk_test_"):
            pytest.skip("Tap sandbox secret not configured")
        pid = f"chg_wh_unknown_{uuid.uuid4().hex[:10]}"
        payload = {"object": "charge", "id": pid, "status": "CAPTURED",
                   "amount": 1, "currency": "SAR", "live_mode": False,
                   "reference": {"gateway": "g", "payment": "p", "order": "x", "transaction": "y"},
                   "transaction": {"created": "2026-01-15T10:00:00Z"}}
        sig = _sign(payload)
        r = requests.post(f"{API}/payments/tap/webhook", json=payload,
                          headers={"hashstring": sig})
        assert r.status_code == 404, r.text

    async def test_signature_verified_before_lookup(self):
        # If signature is bad, we expect 400 without ever needing a db lookup.
        payload = {"object": "charge", "id": "chg_never_looked_up_xyz", "status": "CAPTURED",
                   "amount": 1, "currency": "SAR", "live_mode": False,
                   "reference": {"gateway": "g", "payment": "p", "order": "x", "transaction": "y"},
                   "transaction": {"created": "2026-01-15T10:00:00Z"}}
        r = requests.post(f"{API}/payments/tap/webhook", json=payload,
                          headers={"hashstring": "0" * 64})
        assert r.status_code == 400
