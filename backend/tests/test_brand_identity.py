"""Brand identity regression: public settings palette+logo+version, template independence,
and static brand assets availability."""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break
API = f"{BASE_URL}/api"

NEW_PRIMARY = "#071D32"
NEW_SECONDARY = "#2563EB"


class TestBrandSettings:
    def test_public_settings_has_new_identity(self):
        r = requests.get(f"{API}/public/settings")
        assert r.status_code == 200
        s = r.json()
        assert s.get("logo_url") == "/brand/logo.webp", f"logo_url={s.get('logo_url')}"
        colors = s.get("colors") or {}
        assert colors.get("primary", "").upper() == NEW_PRIMARY
        assert colors.get("secondary", "").upper() == NEW_SECONDARY
        assert s.get("brand_identity_version") == 1, f"version={s.get('brand_identity_version')}"
        assert s.get("font") == "Tajawal"

    def test_brand_logo_is_valid_webp(self):
        r = requests.get(f"{BASE_URL}/brand/logo.webp")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/"), r.headers
        assert len(r.content) > 1000

    def test_brand_light_logo_present(self):
        r = requests.get(f"{BASE_URL}/brand/logo-light.webp")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")

    def test_favicon_png_valid(self):
        r = requests.get(f"{BASE_URL}/brand/icon.png")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png"), r.headers.get("content-type")
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n", "Not a valid PNG signature"


class TestTemplateIndependence:
    """Ensure template palettes are NOT overwritten by platform navy/blue."""

    def test_templates_keep_diverse_palettes(self):
        r = requests.get(f"{API}/public/templates")
        assert r.status_code == 200
        tpls = r.json()
        assert len(tpls) >= 6
        # None of the templates should have the exact platform palette
        def _primary(t):
            cfg = t.get("config") or {}
            return ((cfg.get("brand") or {}).get("colors") or cfg.get("theme") or {}).get("primary", "").upper()
        for t in tpls:
            assert _primary(t), f"template {t['name']} missing primary color"
        primaries = {_primary(t) for t in tpls}
        assert len(primaries) >= 5, f"Templates palettes too uniform: {primaries}"
        # And the majority must NOT be the new platform navy
        navy_count = sum(1 for p in primaries if p == NEW_PRIMARY)
        assert navy_count <= 1, f"Too many templates share platform navy: {navy_count}"
