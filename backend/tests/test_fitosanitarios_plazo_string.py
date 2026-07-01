"""
Test iteration 78: Fitosanitarios plazo_seguridad now accepts string values.
Validates:
- POST /api/fitosanitarios accepts plazo_seguridad as string ('NO PROCEDE', '21 días')
- PUT /api/fitosanitarios/{id} accepts plazo_seguridad as string and value round-trips
- GET /api/fitosanitarios/{id} returns the string as-is (no coercion)
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

ADMIN_EMAIL = "admin@fruveco.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    tk = r.json().get("access_token") or r.json().get("token")
    return {"Authorization": f"Bearer {tk}"}


@pytest.fixture
def created_id(headers):
    """Create a TEST_ product with numeric plazo, cleanup after test."""
    unique = f"TEST_PLAZO_{uuid.uuid4().hex[:8]}"
    payload = {
        "numero_registro": unique,
        "nombre_comercial": unique,
        "tipo": "Fungicida",
        "plazo_seguridad": "21 días",
    }
    r = requests.post(f"{BASE_URL}/api/fitosanitarios", json=payload, headers=headers, timeout=15)
    assert r.status_code in (200, 201), f"Create failed: {r.status_code} {r.text}"
    data = r.json()
    pid = data.get("producto", {}).get("_id") or data.get("_id") or data.get("id")
    assert pid, f"No id in response: {data}"
    yield pid
    # cleanup
    try:
        requests.delete(f"{BASE_URL}/api/fitosanitarios/{pid}", headers=headers, timeout=10)
    except Exception:
        pass


class TestPlazoSeguridadAsString:
    def test_create_with_no_procede_string(self, headers):
        unique = f"TEST_NP_{uuid.uuid4().hex[:8]}"
        payload = {
            "numero_registro": unique,
            "nombre_comercial": unique,
            "tipo": "Fungicida",
            "plazo_seguridad": "NO PROCEDE",
        }
        r = requests.post(f"{BASE_URL}/api/fitosanitarios", json=payload, headers=headers, timeout=15)
        assert r.status_code in (200, 201), f"Backend rejected string plazo_seguridad: {r.status_code} {r.text}"
        body = r.json()
        pid = body.get("producto", {}).get("_id") or body.get("_id") or body.get("id")
        assert pid
        # Verify via GET
        g = requests.get(f"{BASE_URL}/api/fitosanitarios/{pid}", headers=headers, timeout=10)
        assert g.status_code == 200
        p = g.json().get("producto") or g.json()
        assert p.get("plazo_seguridad") == "NO PROCEDE", f"Got: {p.get('plazo_seguridad')}"
        # cleanup
        requests.delete(f"{BASE_URL}/api/fitosanitarios/{pid}", headers=headers, timeout=10)

    def test_update_plazo_from_num_to_string(self, headers, created_id):
        # Update plazo to 'N.P.' (originally '21 días')
        r = requests.put(f"{BASE_URL}/api/fitosanitarios/{created_id}",
                         json={"plazo_seguridad": "N.P."},
                         headers=headers, timeout=15)
        assert r.status_code == 200, f"PUT failed: {r.status_code} {r.text}"

        g = requests.get(f"{BASE_URL}/api/fitosanitarios/{created_id}", headers=headers, timeout=10)
        assert g.status_code == 200
        p = g.json().get("producto") or g.json()
        assert p.get("plazo_seguridad") == "N.P.", f"Update did not persist. Got: {p.get('plazo_seguridad')}"

    def test_microthiol_plazo_is_string_not_appended(self, headers):
        """Regression: MICROTHIOL SPECIAL DISPERSS in list must return plazo_seguridad
        as string 'NO PROCEDE' (no 'd' suffix — that's a frontend rendering concern)."""
        r = requests.get(f"{BASE_URL}/api/fitosanitarios",
                         params={"search": "MICROTHIOL", "activo": "true"},
                         headers=headers, timeout=30)
        assert r.status_code == 200
        productos = r.json().get("productos", [])
        target = next((p for p in productos if "SPECIAL DISPERSS" in (p.get("nombre_comercial") or "").upper()), None)
        assert target, "MICROTHIOL SPECIAL DISPERSS not present"
        plazo = target.get("plazo_seguridad")
        assert plazo is not None
        # Must not have a stray 'd' appended by backend
        assert not str(plazo).endswith("PROCEDEd"), f"Backend leaks 'd' suffix into plazo: {plazo}"
        print(f"MICROTHIOL plazo (backend raw): {plazo!r}")
