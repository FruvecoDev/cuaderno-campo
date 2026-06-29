"""Tests for Visita numero_visita auto-assignment and manual override."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # fallback to frontend/.env
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')

ADMIN_EMAIL = "admin@fruveco.com"
ADMIN_PASSWORD = "admin123"
COT_PARCELA_ID = "6a3e90f77b8cf2eb0d697bc1"  # COT-GUI-25-001


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def created_ids():
    return []


def test_backfill_cot_visits_have_numero(client):
    """Existing 9 visits on COT-GUI-25-001 must have numero_visita 1..9."""
    r = client.get(f"{BASE_URL}/api/visitas?parcela_id={COT_PARCELA_ID}&limit=200", timeout=20)
    assert r.status_code == 200
    visitas = r.json().get("visitas", [])
    assert len(visitas) >= 9, f"Expected >=9 visits, got {len(visitas)}"
    numeros = sorted([v.get("numero_visita") for v in visitas if v.get("numero_visita") is not None])
    # All visits should have numero_visita
    missing = [v["_id"] for v in visitas if v.get("numero_visita") in (None, 0)]
    assert not missing, f"Visits missing numero_visita: {missing}"
    print(f"COT visits numeros: {numeros}")


def test_create_visit_auto_assigns_next_number(client, created_ids):
    """Creating a visit on parcela with existing visits → max+1."""
    r = client.get(f"{BASE_URL}/api/visitas?parcela_id={COT_PARCELA_ID}&limit=500", timeout=20)
    visitas = r.json().get("visitas", [])
    current_max = max([v.get("numero_visita", 0) or 0 for v in visitas])
    expected = current_max + 1

    payload = {
        "objetivo": "Control Rutinario",
        "parcela_id": COT_PARCELA_ID,
        "fecha_visita": "2026-01-15",
        "observaciones": "TEST_auto_numero"
    }
    r = client.post(f"{BASE_URL}/api/visitas", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["numero_visita"] == expected, f"Expected {expected}, got {data['numero_visita']}"
    created_ids.append(data["_id"])


def test_create_visit_with_explicit_numero(client, created_ids):
    """If client sends numero_visita explicitly, respect it."""
    payload = {
        "objetivo": "Informe",
        "parcela_id": COT_PARCELA_ID,
        "fecha_visita": "2026-01-16",
        "observaciones": "TEST_explicit_numero",
        "numero_visita": 555,
    }
    r = client.post(f"{BASE_URL}/api/visitas", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()["data"]
    assert data["numero_visita"] == 555
    created_ids.append(data["_id"])


def test_put_override_numero_visita(client, created_ids):
    """PUT must accept manual override of numero_visita."""
    assert created_ids, "Need at least one created visit"
    visita_id = created_ids[0]
    payload = {
        "objetivo": "Control Rutinario",
        "parcela_id": COT_PARCELA_ID,
        "fecha_visita": "2026-01-15",
        "observaciones": "TEST_auto_numero",
        "numero_visita": 99,
    }
    r = client.put(f"{BASE_URL}/api/visitas/{visita_id}", json=payload, timeout=20)
    assert r.status_code == 200, r.text
    assert r.json()["data"]["numero_visita"] == 99

    # Verify via GET
    g = client.get(f"{BASE_URL}/api/visitas/{visita_id}", timeout=20)
    assert g.status_code == 200
    assert g.json()["numero_visita"] == 99


def test_create_first_visit_on_empty_parcela(client, created_ids):
    """First visit on a brand-new parcela gets numero_visita=1."""
    # Create a temp parcela
    parcela_payload = {
        "proveedor": "TEST_PROV", "cultivo": "Lechuga", "campana": "2025/2026",
        "variedad": "TEST", "superficie_total": 1.0,
        "codigo_plantacion": "TEST-NUMV-001", "num_plantas": 100, "finca": "TEST_FINCA"
    }
    rp = client.post(f"{BASE_URL}/api/parcelas", json=parcela_payload, timeout=20)
    assert rp.status_code in (200, 201), rp.text
    pdata = rp.json()
    parcela_id = pdata.get("data", {}).get("_id") or pdata.get("_id") or pdata.get("id")
    assert parcela_id, f"Could not extract parcela id from {pdata}"

    try:
        payload = {
            "objetivo": "Control Rutinario",
            "parcela_id": parcela_id,
            "fecha_visita": "2026-01-15",
            "observaciones": "TEST_first_visit"
        }
        r = client.post(f"{BASE_URL}/api/visitas", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()["data"]
        assert data["numero_visita"] == 1, f"First visit must be 1, got {data['numero_visita']}"
        created_ids.append(data["_id"])
    finally:
        # cleanup parcela later (after visits cleaned)
        pytest.test_temp_parcela_id = parcela_id


def test_zzz_cleanup(client, created_ids):
    """Cleanup all TEST_ visits created."""
    for vid in created_ids:
        try:
            client.delete(f"{BASE_URL}/api/visitas/{vid}", timeout=20)
        except Exception as e:
            print(f"Cleanup failed for {vid}: {e}")
    pid = getattr(pytest, "test_temp_parcela_id", None)
    if pid:
        try:
            client.delete(f"{BASE_URL}/api/parcelas/{pid}", timeout=20)
        except Exception as e:
            print(f"Cleanup parcela failed: {e}")
