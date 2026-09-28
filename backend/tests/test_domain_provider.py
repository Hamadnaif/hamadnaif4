"""Unit tests for domain_provider using mocked upstream (ResellerClub).

These tests DO NOT hit the live provider. They validate:
- availability status mapping (available -> True; regthroughus/regthroughothers -> False;
  unknown/missing/error -> None)
- error sanitization: HTTP 403, transport timeout, malformed JSON, non-dict body,
  and provider status=ERROR all raise RuntimeError with NO credentials/URL leaked.
Live upstream is currently blocked (Cloudflare 403); see test_domain_search_live
in the other file for the live integration assertion.
"""
import os
import re
import asyncio
import httpx
import pytest

# Ensure required envs exist before importing module (module reads them at import).
os.environ.setdefault("RESELLERCLUB_ENV", "test")
os.environ.setdefault("RESELLERCLUB_BASE_URL", "https://mock.invalid")
os.environ.setdefault("RESELLERCLUB_AVAILABILITY_URL", "https://mock-avail.invalid")
os.environ.setdefault("RESELLERCLUB_API_KEY", "TESTKEY_ABCDEF")
os.environ.setdefault("RESELLERCLUB_RESELLER_ID", "999999")

import domain_provider  # noqa: E402

SECRET_KEY = os.environ["RESELLERCLUB_API_KEY"]


def _assert_sanitized(exc_msg: str):
    """Error text must never contain the api key, reseller id or a full URL."""
    assert SECRET_KEY not in exc_msg
    assert "api-key" not in exc_msg.lower()
    assert "auth-userid" not in exc_msg.lower()
    assert not re.search(r"https?://", exc_msg)


class _FakeResp:
    def __init__(self, status_code=200, json_data=None, raise_json=False):
        self.status_code = status_code
        self._json = json_data
        self._raise_json = raise_json
        self.is_error = status_code >= 400

    def json(self):
        if self._raise_json:
            raise ValueError("not json")
        return self._json


class _FakeClient:
    def __init__(self, resp=None, exc=None):
        self._resp = resp
        self._exc = exc

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def get(self, url, params=None):
        if self._exc:
            raise self._exc
        return self._resp


# ---------- availability status mapping ----------

@pytest.mark.asyncio
async def test_availability_maps_available_true(monkeypatch):
    resp = _FakeResp(200, {"example.com": {"status": "available"}})
    monkeypatch.setattr(domain_provider.httpx, "AsyncClient",
                        lambda *a, **k: _FakeClient(resp=resp))
    out = await domain_provider.check_availability("example", ["com"])
    assert out == {"com": True}


@pytest.mark.asyncio
async def test_availability_maps_regthroughus_false(monkeypatch):
    resp = _FakeResp(200, {"example.com": {"status": "regthroughus"}})
    monkeypatch.setattr(domain_provider.httpx, "AsyncClient",
                        lambda *a, **k: _FakeClient(resp=resp))
    out = await domain_provider.check_availability("example", ["com"])
    assert out == {"com": False}


@pytest.mark.asyncio
async def test_availability_maps_regthroughothers_false(monkeypatch):
    resp = _FakeResp(200, {"example.com": {"status": "regthroughothers"}})
    monkeypatch.setattr(domain_provider.httpx, "AsyncClient",
                        lambda *a, **k: _FakeClient(resp=resp))
    out = await domain_provider.check_availability("example", ["com"])
    assert out == {"com": False}


@pytest.mark.asyncio
async def test_availability_unknown_status_none(monkeypatch):
    resp = _FakeResp(200, {"example.com": {"status": "someweirdstate"}})
    monkeypatch.setattr(domain_provider.httpx, "AsyncClient",
                        lambda *a, **k: _FakeClient(resp=resp))
    out = await domain_provider.check_availability("example", ["com"])
    assert out == {"com": None}


@pytest.mark.asyncio
async def test_availability_missing_entry_none(monkeypatch):
    resp = _FakeResp(200, {})  # provider omitted the tld
    monkeypatch.setattr(domain_provider.httpx, "AsyncClient",
                        lambda *a, **k: _FakeClient(resp=resp))
    out = await domain_provider.check_availability("example", ["com", "net"])
    assert out == {"com": None, "net": None}


@pytest.mark.asyncio
async def test_availability_entry_error_none(monkeypatch):
    # Provider status ERROR at top level -> RuntimeError (whole call fails).
    resp = _FakeResp(200, {"status": "ERROR", "message": "bad"})
    monkeypatch.setattr(domain_provider.httpx, "AsyncClient",
                        lambda *a, **k: _FakeClient(resp=resp))
    with pytest.raises(RuntimeError) as ei:
        await domain_provider.check_availability("example", ["com"])
    _assert_sanitized(str(ei.value))


# ---------- error sanitization ----------

@pytest.mark.asyncio
async def test_http_403_sanitized(monkeypatch):
    resp = _FakeResp(403, {"error": "forbidden"})
    monkeypatch.setattr(domain_provider.httpx, "AsyncClient",
                        lambda *a, **k: _FakeClient(resp=resp))
    with pytest.raises(RuntimeError) as ei:
        await domain_provider.check_availability("example", ["com"])
    msg = str(ei.value)
    assert "403" in msg
    _assert_sanitized(msg)


@pytest.mark.asyncio
async def test_transport_timeout_sanitized(monkeypatch):
    monkeypatch.setattr(domain_provider.httpx, "AsyncClient",
                        lambda *a, **k: _FakeClient(exc=httpx.ConnectTimeout("boom")))
    with pytest.raises(RuntimeError) as ei:
        await domain_provider.check_availability("example", ["com"])
    _assert_sanitized(str(ei.value))


@pytest.mark.asyncio
async def test_malformed_json_sanitized(monkeypatch):
    resp = _FakeResp(200, None, raise_json=True)
    monkeypatch.setattr(domain_provider.httpx, "AsyncClient",
                        lambda *a, **k: _FakeClient(resp=resp))
    with pytest.raises(RuntimeError) as ei:
        await domain_provider.check_availability("example", ["com"])
    _assert_sanitized(str(ei.value))


@pytest.mark.asyncio
async def test_non_dict_response_sanitized(monkeypatch):
    resp = _FakeResp(200, ["not", "a", "dict"])
    monkeypatch.setattr(domain_provider.httpx, "AsyncClient",
                        lambda *a, **k: _FakeClient(resp=resp))
    with pytest.raises(RuntimeError) as ei:
        await domain_provider.check_availability("example", ["com"])
    _assert_sanitized(str(ei.value))


@pytest.mark.asyncio
async def test_provider_status_error_sanitized(monkeypatch):
    resp = _FakeResp(200, {"status": "ERROR", "message": "quota"})
    monkeypatch.setattr(domain_provider.httpx, "AsyncClient",
                        lambda *a, **k: _FakeClient(resp=resp))
    with pytest.raises(RuntimeError) as ei:
        await domain_provider.get_pricing(["com"])
    _assert_sanitized(str(ei.value))


# ---------- config wiring ----------

def test_env_urls_used_no_hardcode():
    # Availability + pricing must resolve to the configured env URLs (rstripped).
    assert domain_provider.AVAILABILITY_BASE == \
        os.environ["RESELLERCLUB_AVAILABILITY_URL"].rstrip("/")
    assert domain_provider.BASE == \
        os.environ["RESELLERCLUB_BASE_URL"].rstrip("/")


def test_httpx_logger_at_warning():
    import logging
    assert logging.getLogger("httpx").level >= logging.WARNING
