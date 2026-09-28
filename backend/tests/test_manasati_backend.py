"""
Manasati (منصتي) Phase-1 backend tests.
Covers: auth (register/login/me/logout), public marketing, sites CRUD+publish,
public site rendering + contact, admin RBAC, admin CRUD (customers/templates/plans/settings),
data isolation and disabled integrations (payment/domain reseller).
"""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: reads frontend/.env directly
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"

ADMIN_EMAIL = "hamad6668@gmail.com"
ADMIN_PASSWORD = "Manasati@2026"


def _new_email():
    return f"TEST_{uuid.uuid4().hex[:10]}@example.com"


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("role") == "admin", f"expected admin role, got {data.get('role')}"
    return s


@pytest.fixture(scope="session")
def customer_session():
    s = requests.Session()
    email = _new_email()
    r = s.post(f"{API}/auth/register", json={"name": "Test Customer", "email": email, "password": "pass1234"})
    assert r.status_code == 200, f"Register failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == email.lower()
    assert data["role"] == "customer"
    s._email = email
    s._user_id = data["id"]
    return s


@pytest.fixture(scope="session")
def customer_session_2():
    s = requests.Session()
    email = _new_email()
    r = s.post(f"{API}/auth/register", json={"name": "Test Customer 2", "email": email, "password": "pass1234"})
    assert r.status_code == 200
    s._email = email
    s._user_id = r.json()["id"]
    return s


# ---------- Health ----------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ---------- Public marketing ----------
class TestPublic:
    def test_templates(self):
        r = requests.get(f"{API}/public/templates")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 6, f"Expected >=6 templates, got {len(data)}"
        assert all("id" in t and "name" in t and "config" in t for t in data)
        names = {t["name"] for t in data}
        assert "شركة ناشئة" in names, f"missing startup template, got {names}"
        assert "مطعم وكافيه" in names, f"missing restaurant template, got {names}"

    def test_new_templates_have_new_sections(self):
        r = requests.get(f"{API}/public/templates")
        data = r.json()
        startup = next(t for t in data if t["name"] == "شركة ناشئة")
        types = {s["type"] for p in startup["config"]["pages"] for s in p["sections"]}
        assert {"team", "pricing", "cta"}.issubset(types), f"startup missing sections, got {types}"

    def test_plans(self):
        r = requests.get(f"{API}/public/plans")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 3, f"Expected >=3 plans, got {len(data)}"

    def test_settings(self):
        r = requests.get(f"{API}/public/settings")
        assert r.status_code == 200
        s = r.json()
        assert isinstance(s, dict)

    def test_domain_search_disabled(self):
        r = requests.get(f"{API}/public/domain/search", params={"q": "mystore"})
        assert r.status_code == 200
        data = r.json()
        assert data["enabled"] is False, "Domain reseller should be DISABLED"
        assert data["message"], "Should include a disabled-notice message"
        assert isinstance(data["results"], list) and len(data["results"]) > 0

    def test_platform_contact(self):
        r = requests.post(f"{API}/contact" if False else f"{API}/public/contact",
                          json={"name": "Ali", "email": "TEST_contact@example.com",
                                "phone": "0500", "message": "Hello platform"})
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- Email + forgot-password (Phase-2) ----------
class TestEmailAndForgot:
    def test_forgot_password_existing_user(self, customer_session):
        # customer_session was registered earlier
        r = requests.post(f"{API}/auth/forgot-password",
                          json={"email": customer_session._email})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_forgot_password_unknown_user(self):
        # Should still return ok (do not leak whether email exists)
        r = requests.post(f"{API}/auth/forgot-password",
                          json={"email": "TEST_nonexistent_zzz@example.com"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_platform_contact_still_persists(self, admin_session):
        # trigger a fresh platform contact and verify it appears in /admin/contacts
        unique_msg = f"TEST_email_check_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/public/contact",
                          json={"name": "Bob", "email": "TEST_bob@example.com",
                                "phone": "0555", "message": unique_msg})
        assert r.status_code == 200
        r2 = admin_session.get(f"{API}/admin/contacts")
        assert r2.status_code == 200
        msgs = r2.json()
        found = any(m.get("message") == unique_msg for m in msgs)
        assert found, "platform contact submission not persisted in /admin/contacts"


# ---------- Auth ----------
class TestAuth:
    def test_me_customer(self, customer_session):
        r = customer_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == customer_session._email.lower()

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": "TEST_no@example.com", "password": "wrong"})
        assert r.status_code == 401

    def test_register_duplicate(self, customer_session):
        r = requests.post(f"{API}/auth/register",
                          json={"name": "x", "email": customer_session._email, "password": "pass1234"})
        assert r.status_code == 400

    def test_logout_login_again(self):
        # register a new one, logout, login
        s = requests.Session()
        email = _new_email()
        r = s.post(f"{API}/auth/register", json={"name": "n", "email": email, "password": "pass1234"})
        assert r.status_code == 200
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # after logout, /me should fail
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401
        # login again
        r = s.post(f"{API}/auth/login", json={"email": email, "password": "pass1234"})
        assert r.status_code == 200

    def test_unauth_me(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Sites CRUD + Publish ----------
@pytest.fixture(scope="session")
def created_site(customer_session):
    r = requests.get(f"{API}/public/templates")
    template_id = r.json()[0]["id"]
    r = customer_session.post(f"{API}/sites",
                              json={"name": "TEST Site", "template_id": template_id})
    assert r.status_code == 200, f"create site failed: {r.status_code} {r.text}"
    site = r.json()
    assert site["status"] == "draft"
    assert site["subdomain"]
    assert site["template_id"] == template_id
    return site


class TestSites:
    def test_list_sites(self, customer_session, created_site):
        r = customer_session.get(f"{API}/sites")
        assert r.status_code == 200
        ids = [s["id"] for s in r.json()]
        assert created_site["id"] in ids

    def test_get_site(self, customer_session, created_site):
        r = customer_session.get(f"{API}/sites/{created_site['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == created_site["id"]

    def test_update_site_brand_and_pages(self, customer_session, created_site):
        site = created_site
        new_brand = {"colors": {"primary": "#123456", "secondary": "#654321", "accent": "#abcdef"},
                     "font": "Cairo", "logo": None}
        pages = site.get("pages") or []
        r = customer_session.put(f"{API}/sites/{site['id']}",
                                 json={"brand": new_brand, "pages": pages})
        assert r.status_code == 200, r.text
        updated = r.json()
        assert updated["brand"]["colors"]["primary"] == "#123456"
        # persistence check
        r2 = customer_session.get(f"{API}/sites/{site['id']}")
        assert r2.json()["brand"]["colors"]["primary"] == "#123456"

    def test_publish_and_public_render(self, customer_session, created_site):
        r = customer_session.post(f"{API}/sites/{created_site['id']}/publish")
        assert r.status_code == 200
        assert r.json()["status"] == "published"
        # public renderer (no auth)
        r2 = requests.get(f"{API}/public/site/{created_site['subdomain']}")
        assert r2.status_code == 200, r2.text
        pub = r2.json()
        assert pub["status"] == "published"
        assert "owner_id" not in pub, "owner_id must be stripped from public payload"

    def test_public_contact_submission(self, created_site):
        r = requests.post(f"{API}/public/site/{created_site['subdomain']}/contact",
                          json={"name": "Visitor", "email": "TEST_visitor@example.com",
                                "phone": "0500000000", "message": "Hi from public"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_site_messages_visible_to_owner(self, customer_session, created_site):
        r = customer_session.get(f"{API}/sites/{created_site['id']}/messages")
        assert r.status_code == 200
        msgs = r.json()
        assert isinstance(msgs, list) and len(msgs) >= 1

    def test_plan_limit_prevents_second_site(self, customer_session):
        # Default plan limit sites=1
        r = requests.get(f"{API}/public/templates")
        template_id = r.json()[0]["id"]
        r = customer_session.post(f"{API}/sites",
                                  json={"name": "TEST Second", "template_id": template_id})
        assert r.status_code == 403, f"Expected plan-limit 403, got {r.status_code}"


# ---------- Data isolation / RBAC ----------
class TestIsolationRBAC:
    def test_customer_cannot_access_admin(self, customer_session):
        for path in ("/admin/stats", "/admin/customers", "/admin/templates",
                     "/admin/plans", "/admin/settings", "/admin/contacts", "/admin/audit"):
            r = customer_session.get(f"{API}{path}")
            assert r.status_code == 403, f"{path} expected 403 got {r.status_code}"

    def test_customer_cannot_read_other_customer_site(self, customer_session, customer_session_2, created_site):
        # customer_session owns created_site; customer_session_2 must not
        r = customer_session_2.get(f"{API}/sites/{created_site['id']}")
        assert r.status_code in (403, 404), f"expected 403/404, got {r.status_code}"

    def test_customer_cannot_update_other_site(self, customer_session_2, created_site):
        r = customer_session_2.put(f"{API}/sites/{created_site['id']}",
                                   json={"name": "hack"})
        assert r.status_code in (403, 404)

    def test_unauth_cannot_list_sites(self):
        r = requests.get(f"{API}/sites")
        assert r.status_code == 401


# ---------- Admin ----------
class TestAdmin:
    def test_stats(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ("customers", "sites_total", "sites_published"):
            assert k in d

    def test_customers_list_and_plan_change(self, admin_session, customer_session):
        r = admin_session.get(f"{API}/admin/customers")
        assert r.status_code == 200
        customers = r.json()
        me = [c for c in customers if c["id"] == customer_session._user_id]
        assert me, "customer not found in admin list"
        # get a plan id
        plans = admin_session.get(f"{API}/admin/plans").json()
        if plans:
            plan_id = plans[0]["id"]
            r2 = admin_session.put(f"{API}/admin/customers/{customer_session._user_id}",
                                   json={"plan_id": plan_id, "subscription_status": "active"})
            assert r2.status_code == 200
            assert r2.json()["plan_id"] == plan_id

    def test_suspend_and_activate_customer(self, admin_session, customer_session_2):
        uid = customer_session_2._user_id
        r = admin_session.put(f"{API}/admin/customers/{uid}",
                              json={"account_status": "suspended"})
        assert r.status_code == 200
        # suspended user should get 403 on /me
        r2 = customer_session_2.get(f"{API}/auth/me")
        assert r2.status_code == 403
        # reactivate
        r = admin_session.put(f"{API}/admin/customers/{uid}",
                              json={"account_status": "active"})
        assert r.status_code == 200
        r2 = customer_session_2.get(f"{API}/auth/me")
        assert r2.status_code == 200

    def test_toggle_template_active(self, admin_session):
        tpls = admin_session.get(f"{API}/admin/templates").json()
        assert tpls
        t = tpls[0]
        original = t["is_active"]
        r = admin_session.put(f"{API}/admin/templates/{t['id']}", json={"is_active": not original})
        assert r.status_code == 200
        assert r.json()["is_active"] == (not original)
        # restore
        admin_session.put(f"{API}/admin/templates/{t['id']}", json={"is_active": original})

    def test_edit_plan(self, admin_session):
        plans = admin_session.get(f"{API}/admin/plans").json()
        assert plans
        p = plans[0]
        new_features = list(p.get("features", [])) + ["TEST_feature"]
        r = admin_session.put(f"{API}/admin/plans/{p['id']}",
                              json={"price_monthly": p["price_monthly"], "features": new_features})
        assert r.status_code == 200
        assert "TEST_feature" in r.json()["features"]
        # cleanup
        admin_session.put(f"{API}/admin/plans/{p['id']}", json={"features": p.get("features", [])})

    def test_update_settings_platform_name(self, admin_session):
        cur = admin_session.get(f"{API}/admin/settings").json()
        new_name = "منصتي TEST"
        payload = dict(cur or {})
        payload["platform_name"] = new_name
        r = admin_session.put(f"{API}/admin/settings", json=payload)
        assert r.status_code == 200
        assert r.json().get("platform_name") == new_name
        # public reflects
        pub = requests.get(f"{API}/public/settings").json()
        assert pub.get("platform_name") == new_name
        # restore original if existed
        if cur and cur.get("platform_name"):
            admin_session.put(f"{API}/admin/settings",
                              json={**cur, "platform_name": cur["platform_name"]})

    def test_contacts_list_includes_submissions(self, admin_session):
        r = admin_session.get(f"{API}/admin/contacts")
        assert r.status_code == 200
        msgs = r.json()
        assert isinstance(msgs, list)
        # verify types present
        types = {m.get("type") for m in msgs}
        # at least platform or site should exist from previous tests
        assert types & {"platform", "site"}, f"expected platform/site contacts, got {types}"

    def test_audit_log(self, admin_session):
        r = admin_session.get(f"{API}/admin/audit")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------- Store orders (Phase-3) ----------
class TestStoreOrders:
    def test_templates_include_store(self):
        r = requests.get(f"{API}/public/templates")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 7, f"Expected >=7 templates, got {len(data)}"
        names = {t["name"] for t in data}
        assert "متجر إلكتروني" in names, f"missing store template, names={names}"

    def test_store_template_has_store_section(self):
        r = requests.get(f"{API}/public/templates")
        store_tpl = next(t for t in r.json() if t["name"] == "متجر إلكتروني")
        types = {s["type"] for p in store_tpl["config"]["pages"] for s in p["sections"]}
        assert "store" in types, f"store template missing store section, got {types}"
        assert "logos" in types, f"store template missing logos section, got {types}"

    def test_store_order_flow_and_isolation(self, customer_session, customer_session_2, created_site):
        # created_site already published in TestSites.test_publish_and_public_render (session scope)
        subdomain = created_site["subdomain"]
        # Post an order (public, no auth)
        order_body = {
            "customer_name": "TEST_Buyer",
            "phone": "0501234567",
            "address": "TEST street 5, Riyadh",
            "items": [
                {"name": "منتج 1", "price": 50.0, "qty": 2},
                {"name": "منتج 2", "price": 25.0, "qty": 1},
            ],
            "total": 125.0, "currency": "SAR",
        }
        r = requests.post(f"{API}/public/site/{subdomain}/order", json=order_body)
        assert r.status_code == 200, f"order failed: {r.status_code} {r.text}"
        data = r.json()
        assert data["ok"] is True
        assert data.get("order_id"), "order_id missing in response"
        order_id = data["order_id"]

        # Owner sees it
        r2 = customer_session.get(f"{API}/account/store-orders")
        assert r2.status_code == 200, r2.text
        orders = r2.json()
        assert isinstance(orders, list)
        found = [o for o in orders if o.get("id") == order_id]
        assert found, f"owner does not see order {order_id} in list"
        o = found[0]
        assert o["customer_name"] == "TEST_Buyer"
        assert o["phone"] == "0501234567"
        assert abs(o["total"] - 125.0) < 0.001
        assert len(o["items"]) == 2
        assert "_id" not in o, "raw _id must not leak"

        # Data isolation: second customer must NOT see this order
        r3 = customer_session_2.get(f"{API}/account/store-orders")
        assert r3.status_code == 200
        ids2 = {o.get("id") for o in r3.json()}
        assert order_id not in ids2, "data leak: other customer sees owner's order"

    def test_store_order_empty_cart_rejected(self, created_site):
        r = requests.post(f"{API}/public/site/{created_site['subdomain']}/order",
                          json={"customer_name": "x", "phone": "0500", "items": [], "total": 0})
        assert r.status_code == 400

    def test_store_order_unpublished_site_404(self):
        r = requests.post(f"{API}/public/site/nonexistent-sub-zzz/order",
                          json={"customer_name": "x", "phone": "0500",
                                "items": [{"name": "a", "price": 1, "qty": 1}], "total": 1})
        assert r.status_code == 404

    def test_store_orders_requires_auth(self):
        r = requests.get(f"{API}/account/store-orders")
        assert r.status_code == 401


# ---------- Disabled integrations ----------
class TestDisabledIntegrations:
    def test_subscribe_payment_disabled(self, customer_session):
        # get a plan id
        plans = requests.get(f"{API}/public/plans").json()
        if not plans:
            pytest.skip("no plans")
        plan_id = plans[0]["id"]
        r = customer_session.post(f"{API}/account/subscribe",
                                  json={"plan_id": plan_id, "cycle": "monthly"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("payment_enabled") is False, f"expected payment_enabled=false, got {data}"


# ---------- AI template generation + from-ai (Phase-4) ----------
class TestAIGenerateTemplate:
    def test_generate_template_unauth(self):
        r = requests.post(f"{API}/ai/generate-template", json={"prompt": "cafe"})
        assert r.status_code == 401

    def test_generate_template_empty_prompt(self, customer_session_2):
        # empty prompt -> 400
        r = customer_session_2.post(f"{API}/ai/generate-template", json={"prompt": "   "})
        assert r.status_code == 400

    def test_ai_full_site_creation_e2e(self):
        # Fresh customer with 0 sites so plan limit doesn't block
        s = requests.Session()
        email = _new_email()
        r = s.post(f"{API}/auth/register", json={"name": "AI Tester", "email": email, "password": "pass1234"})
        assert r.status_code == 200
        # Generate template via AI (may take 10-30s)
        r = s.post(f"{API}/ai/generate-template",
                   json={"prompt": "مقهى مختص بالقهوة في الرياض"}, timeout=90)
        assert r.status_code == 200, f"generate-template failed: {r.status_code} {r.text}"
        gen = r.json()
        assert "name" in gen and "config" in gen
        assert isinstance(gen["config"], dict)
        pages = gen["config"].get("pages") or []
        assert len(pages) >= 1
        assert len(pages[0].get("sections") or []) >= 1
        # Create site from AI result
        r2 = s.post(f"{API}/sites/from-ai",
                    json={"name": gen["name"], "config": gen["config"]})
        assert r2.status_code == 200, f"from-ai failed: {r2.status_code} {r2.text}"
        site = r2.json()
        assert site["status"] == "draft"
        assert site["subdomain"]
        assert site["template_name"] == "بالذكاء الاصطناعي"
        assert "_id" not in site
        assert len(site.get("pages") or []) >= 1

    def test_from_ai_unauth(self):
        r = requests.post(f"{API}/sites/from-ai",
                          json={"name": "x", "config": {"pages": []}})
        assert r.status_code == 401
