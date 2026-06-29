"""
Tests for: maquinas_ids field on TecnicoAplicador
- POST /api/tecnicos-aplicadores accepts maquinas_ids
- PUT /api/tecnicos-aplicadores/{id} updates maquinas_ids
- GET /api/tecnicos-aplicadores returns maquinas_ids
- GET /api/tecnicos-aplicadores/activos returns maquinas_ids (used by Tratamientos)
"""
import os
import requests
import pytest
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback for local execution - read from frontend .env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

ADMIN_EMAIL = "admin@fruveco.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
    })
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    return data.get("access_token") or data.get("token")


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def maquinaria_ids(headers):
    r = requests.get(f"{BASE_URL}/api/maquinaria", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    items = body.get("maquinaria") or body.get("items") or body if isinstance(body, list) else body
    if isinstance(items, dict):
        items = items.get("maquinaria") or items.get("items") or []
    ids = [m.get("_id") or m.get("id") for m in items]
    ids = [i for i in ids if i]
    assert len(ids) >= 1, f"No maquinaria found. response: {body}"
    return ids


class TestTecnicoMaquinasIds:
    """Verify maquinas_ids field is accepted and persisted."""

    created_id = None

    def test_create_tecnico_with_maquinas(self, headers, maquinaria_ids):
        payload = {
            "nombre": "TEST_AGENT",
            "apellidos": "MaquinasTest",
            "dni": f"TEST{datetime.now().strftime('%H%M%S')}",
            "nivel_capacitacion": "Cualificado",
            "num_carnet": "TST-001",
            "fecha_certificacion": "2024-01-01",
            "observaciones": "test",
            "maquinas_ids": [maquinaria_ids[0]]
        }
        r = requests.post(f"{BASE_URL}/api/tecnicos-aplicadores", json=payload, headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()["data"]
        assert data["maquinas_ids"] == [maquinaria_ids[0]], f"got {data.get('maquinas_ids')}"
        TestTecnicoMaquinasIds.created_id = data["_id"]

    def test_get_list_contains_maquinas_ids(self, headers):
        r = requests.get(f"{BASE_URL}/api/tecnicos-aplicadores", headers=headers)
        assert r.status_code == 200
        tecnicos = r.json()["tecnicos"]
        ours = next((t for t in tecnicos if t["_id"] == TestTecnicoMaquinasIds.created_id), None)
        assert ours is not None
        assert "maquinas_ids" in ours
        assert isinstance(ours["maquinas_ids"], list)

    def test_get_activos_contains_maquinas_ids(self, headers):
        """CRITICAL: /activos is consumed by Tratamientos.js to filter machines.
        Endpoint MUST include maquinas_ids in projection."""
        r = requests.get(f"{BASE_URL}/api/tecnicos-aplicadores/activos", headers=headers)
        assert r.status_code == 200
        tecnicos = r.json()["tecnicos"]
        ours = next((t for t in tecnicos if t["_id"] == TestTecnicoMaquinasIds.created_id), None)
        assert ours is not None, "Created tecnico not in /activos"
        assert "maquinas_ids" in ours, (
            f"/activos endpoint MUST include maquinas_ids so Tratamientos can filter. "
            f"Keys: {list(ours.keys())}"
        )

    def test_update_tecnico_change_maquinas(self, headers, maquinaria_ids):
        tid = TestTecnicoMaquinasIds.created_id
        # Set multiple
        new_ids = maquinaria_ids[:2] if len(maquinaria_ids) >= 2 else maquinaria_ids
        payload = {
            "nombre": "TEST_AGENT",
            "apellidos": "MaquinasTest",
            "dni": f"TEST{datetime.now().strftime('%H%M%S')}X",
            "nivel_capacitacion": "Cualificado",
            "num_carnet": "TST-001",
            "fecha_certificacion": "2024-01-01",
            "observaciones": "test",
            "maquinas_ids": new_ids
        }
        r = requests.put(f"{BASE_URL}/api/tecnicos-aplicadores/{tid}", json=payload, headers=headers)
        assert r.status_code == 200, r.text
        data = r.json()["data"]
        assert set(data["maquinas_ids"]) == set(new_ids)

        # Verify via GET
        r2 = requests.get(f"{BASE_URL}/api/tecnicos-aplicadores/{tid}", headers=headers)
        assert r2.status_code == 200
        assert set(r2.json()["maquinas_ids"]) == set(new_ids)

    def test_update_remove_maquinas(self, headers):
        tid = TestTecnicoMaquinasIds.created_id
        payload = {
            "nombre": "TEST_AGENT",
            "apellidos": "MaquinasTest",
            "dni": f"TEST{datetime.now().strftime('%H%M%S')}Z",
            "nivel_capacitacion": "Cualificado",
            "num_carnet": "TST-001",
            "fecha_certificacion": "2024-01-01",
            "observaciones": "test",
            "maquinas_ids": []
        }
        r = requests.put(f"{BASE_URL}/api/tecnicos-aplicadores/{tid}", json=payload, headers=headers)
        assert r.status_code == 200
        assert r.json()["data"]["maquinas_ids"] == []

    def test_cleanup(self, headers):
        tid = TestTecnicoMaquinasIds.created_id
        if tid:
            requests.delete(f"{BASE_URL}/api/tecnicos-aplicadores/{tid}", headers=headers)
