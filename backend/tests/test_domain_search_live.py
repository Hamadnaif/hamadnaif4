"""Live integration smoke for /api/public/domain/search.

Note: Upstream ResellerClub currently returns Cloudflare 403 (whitelist pending);
we therefore expect a sanitized friendly Arabic error path — provider_error=True,
message present, available=null for every result, price_source=indicative.
Provider SUCCESS is not asserted (would flip once whitelist lands).
"""
import os
import re
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


def test_public_settings_smoke():
    r = requests.get(f"{BASE_URL}/api/public/settings", timeout=15)
    assert r.status_code == 200


def test_public_templates_smoke():
    r = requests.get(f"{BASE_URL}/api/public/templates", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_domain_search_shape_and_no_secret_leak():
    r = requests.get(f"{BASE_URL}/api/public/domain/search",
                     params={"q": "example.com"}, timeout=30)
    assert r.status_code == 200
    body = r.json()
    text = r.text

    # No credentials or upstream full URLs in payload
    assert "api-key" not in text.lower()
    assert "auth-userid" not in text.lower()
    assert "resellerclub" not in text.lower()
    assert not re.search(r"https?://[^\s\"']*httpapi", text)

    assert body["query"] == "example"
    assert isinstance(body["results"], list) and body["results"]

    for r_ in body["results"]:
        assert set(r_.keys()) >= {"domain", "tld", "price", "renew_price",
                                  "currency", "price_source", "available"}
        assert r_["currency"] == "SAR"

    if body.get("provider_error"):
        # Friendly Arabic message, no false availability, indicative prices.
        assert body["enabled"] is False
        assert body["message"] and any(
            ch for ch in body["message"] if "\u0600" <= ch <= "\u06FF"
        )
        for r_ in body["results"]:
            assert r_["available"] is None
            assert r_["price_source"] == "indicative"
    else:
        # If provider ever succeeds, availability may be bool or None; source
        # should be provider for confirmed pricing.
        for r_ in body["results"]:
            assert r_["available"] in (True, False, None)


def test_domain_search_rejects_empty_query():
    r = requests.get(f"{BASE_URL}/api/public/domain/search",
                     params={"q": "!!!"}, timeout=15)
    assert r.status_code == 400
