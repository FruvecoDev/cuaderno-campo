"""
Verifies the bug fix for tecnico_aplicador_id persistence on /api/tratamientos.

Background: TratamientoCreate Pydantic model was missing `tecnico_aplicador_id`
so it was silently dropped on POST/PUT. Fix added in models_tratamientos.py:147.
This test asserts the field round-trips on both POST and PUT.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://campo-export-pro.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@fruveco.com"
ADMIN_PASSWORD = "admin123"

# Known IDs from prior seed (iteration_73)
ANTONIO_ID = "6a27edb2c7c8f845aea00124"
CLEMENTE_ID = "6a3e350d40b2b1b51493e703"
AGRIFAC_ID = "6a3e364d40b2b1b51493e704"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token") or r.json().get("token")
    assert token
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def parcela_id(auth_headers):
    """Pick any existing parcela_id for tratamiento creation."""
    r = requests.get(f"{BASE_URL}/api/parcelas", headers=auth_headers, params={"limit": 5})
    assert r.status_code == 200, r.text
    body = r.json()
    parcelas = body.get("parcelas") or body.get("data") or body
    if isinstance(parcelas, dict):
        parcelas = parcelas.get("parcelas", [])
    assert len(parcelas) > 0, "No parcelas available"
    pid = parcelas[0].get("_id") or parcelas[0].get("id")
    assert pid
    return pid


@pytest.fixture(scope="module")
def created_tratamiento(auth_headers, parcela_id):
    payload = {
        "tipo_tratamiento": "Fitosanitario",
        "aplicacion_numero": 1,
        "metodo_aplicacion": "Pulverización",
        "superficie_aplicacion": 1.0,
        "caldo_superficie": 100.0,
        "parcelas_ids": [parcela_id],
        "tecnico_aplicador_id": ANTONIO_ID,
        "maquina_id": AGRIFAC_ID,
        "aplicador_nombre": "TEST_ROUNDTRIP"
    }
    r = requests.post(f"{BASE_URL}/api/tratamientos", json=payload, headers=auth_headers)
    assert r.status_code == 200, f"POST failed: {r.status_code} {r.text}"
    data = r.json()["data"]
    tid = data.get("_id") or data.get("id")
    assert tid
    yield {"id": tid, "data": data}
    # Cleanup
    requests.delete(f"{BASE_URL}/api/tratamientos/{tid}", headers=auth_headers)


def test_post_persists_tecnico_aplicador_id(created_tratamiento):
    """The new field must be present in the POST response data."""
    data = created_tratamiento["data"]
    assert data.get("tecnico_aplicador_id") == ANTONIO_ID, \
        f"POST did not persist tecnico_aplicador_id. Got: {data.get('tecnico_aplicador_id')!r}"
    assert data.get("maquina_id") == AGRIFAC_ID


def test_get_returns_tecnico_aplicador_id(auth_headers, created_tratamiento):
    """GET by id must return tecnico_aplicador_id as set."""
    tid = created_tratamiento["id"]
    r = requests.get(f"{BASE_URL}/api/tratamientos/{tid}", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    # endpoint may return raw doc or {data:...}
    doc = body.get("data") if isinstance(body, dict) and "data" in body else body
    assert doc.get("tecnico_aplicador_id") == ANTONIO_ID, \
        f"GET did not return tecnico_aplicador_id. Got: {doc.get('tecnico_aplicador_id')!r}"


def test_put_updates_tecnico_aplicador_id(auth_headers, created_tratamiento, parcela_id):
    """PUT changing tecnico_aplicador_id from Antonio→Clemente must persist."""
    tid = created_tratamiento["id"]
    update_payload = {
        "tipo_tratamiento": "Fitosanitario",
        "aplicacion_numero": 1,
        "metodo_aplicacion": "Pulverización",
        "superficie_aplicacion": 1.0,
        "caldo_superficie": 100.0,
        "parcelas_ids": [parcela_id],
        "tecnico_aplicador_id": CLEMENTE_ID,  # CHANGED
        "maquina_id": AGRIFAC_ID,
        "aplicador_nombre": "TEST_ROUNDTRIP_UPDATED"
    }
    r = requests.put(f"{BASE_URL}/api/tratamientos/{tid}", json=update_payload, headers=auth_headers)
    assert r.status_code == 200, f"PUT failed: {r.status_code} {r.text}"
    put_data = r.json()["data"]
    assert put_data.get("tecnico_aplicador_id") == CLEMENTE_ID, \
        f"PUT response missing updated tecnico_aplicador_id. Got: {put_data.get('tecnico_aplicador_id')!r}"

    # Re-fetch to confirm DB persistence (the actual bug scenario)
    r2 = requests.get(f"{BASE_URL}/api/tratamientos/{tid}", headers=auth_headers)
    assert r2.status_code == 200
    body = r2.json()
    doc = body.get("data") if isinstance(body, dict) and "data" in body else body
    assert doc.get("tecnico_aplicador_id") == CLEMENTE_ID, \
        f"DB did not persist updated tecnico_aplicador_id. Got: {doc.get('tecnico_aplicador_id')!r}"


def test_put_can_clear_tecnico_aplicador_id(auth_headers, created_tratamiento, parcela_id):
    """PUT with tecnico_aplicador_id=null clears it."""
    tid = created_tratamiento["id"]
    update_payload = {
        "tipo_tratamiento": "Fitosanitario",
        "aplicacion_numero": 1,
        "metodo_aplicacion": "Pulverización",
        "superficie_aplicacion": 1.0,
        "caldo_superficie": 100.0,
        "parcelas_ids": [parcela_id],
        "tecnico_aplicador_id": None,
        "maquina_id": None
    }
    r = requests.put(f"{BASE_URL}/api/tratamientos/{tid}", json=update_payload, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()["data"]
    assert data.get("tecnico_aplicador_id") in (None, ""), \
        f"Expected null after clearing, got: {data.get('tecnico_aplicador_id')!r}"
