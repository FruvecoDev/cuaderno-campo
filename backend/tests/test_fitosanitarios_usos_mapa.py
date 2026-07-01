"""
Test: Fitosanitarios MAPA usos enrichment
Verifies that:
- GET /api/fitosanitarios enriches products with dosis_min/max, volumen_agua, plazo_seguridad from usos collection
- GET /api/fitosanitarios/{id} includes usos array and usos_count
Iteration 77 scope: bug fix for empty columns / missing usos section
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to reading frontend env directly
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

ADMIN_EMAIL = "admin@fruveco.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                      timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    tk = data.get("access_token") or data.get("token")
    assert tk, f"No token in login response: {data}"
    return tk


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


class TestFitosanitariosListEnrichment:
    def test_search_microthiol_returns_enriched_fields(self, headers):
        r = requests.get(f"{BASE_URL}/api/fitosanitarios",
                         params={"search": "MICROTHIOL", "activo": "true"},
                         headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        productos = data.get("productos", [])
        assert len(productos) > 0, "No MICROTHIOL products returned"

        # Look specifically for MICROTHIOL SPECIAL DISPERSS
        target = None
        for p in productos:
            if "SPECIAL DISPERSS" in (p.get("nombre_comercial") or "").upper():
                target = p
                break
        assert target is not None, f"MICROTHIOL SPECIAL DISPERSS not found. Got: {[p.get('nombre_comercial') for p in productos]}"

        # Verify enriched fields are present and populated
        assert target.get("dosis_min") is not None, f"dosis_min missing: {target}"
        assert target.get("dosis_max") is not None, f"dosis_max missing: {target}"
        assert target.get("volumen_agua_min") is not None, f"volumen_agua_min missing"
        assert target.get("volumen_agua_max") is not None, f"volumen_agua_max missing"
        assert target.get("plazo_seguridad") is not None, f"plazo_seguridad missing"
        assert target.get("usos_count", 0) > 0, f"usos_count zero: {target.get('usos_count')}"

        # Sanity ranges from problem statement
        print(f"MICROTHIOL SPECIAL DISPERSS: dosis {target.get('dosis_min')}-{target.get('dosis_max')} {target.get('unidad_dosis')}, "
              f"vol_agua {target.get('volumen_agua_min')}-{target.get('volumen_agua_max')}, "
              f"plazo {target.get('plazo_seguridad')}, usos_count {target.get('usos_count')}")

        # Store id for next test
        pytest.MICROTHIOL_ID = target["_id"]

    def test_general_list_has_many_enriched(self, headers):
        r = requests.get(f"{BASE_URL}/api/fitosanitarios",
                         params={"activo": "true"},
                         headers=headers, timeout=60)
        assert r.status_code == 200
        productos = r.json().get("productos", [])
        assert len(productos) > 100, f"Expected >100 products, got {len(productos)}"
        enriched = [p for p in productos if p.get("dosis_min") is not None and p.get("dosis_max") is not None]
        ratio = len(enriched) / len(productos)
        print(f"Enrichment ratio: {len(enriched)}/{len(productos)} = {ratio:.1%}")
        assert ratio > 0.5, f"Less than 50% of products enriched with dosis: {ratio:.1%}"


class TestFitosanitarioDetailUsos:
    def test_get_producto_by_id_includes_usos(self, headers):
        producto_id = getattr(pytest, "MICROTHIOL_ID", None)
        if not producto_id:
            # Fetch it
            r = requests.get(f"{BASE_URL}/api/fitosanitarios",
                             params={"search": "MICROTHIOL SPECIAL DISPERSS"},
                             headers=headers, timeout=15)
            productos = r.json().get("productos", [])
            producto_id = productos[0]["_id"]

        r = requests.get(f"{BASE_URL}/api/fitosanitarios/{producto_id}",
                         headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        producto = data.get("producto")
        assert producto is not None
        assert "usos" in producto, "usos array missing in producto detail"
        assert "usos_count" in producto, "usos_count missing"
        usos = producto["usos"]
        assert isinstance(usos, list)
        assert len(usos) > 0, "usos list is empty"
        # MICROTHIOL SPECIAL DISPERSS expected ~163 usos
        assert producto["usos_count"] == len(usos)
        print(f"Producto {producto.get('nombre_comercial')} has {len(usos)} usos")

        # Validate uso shape
        sample = usos[0]
        for key in ("cultivo", "plaga"):
            assert key in sample, f"Missing key '{key}' in uso: {sample.keys()}"
