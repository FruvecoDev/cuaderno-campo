"""Regression tests for Cultivos with multiple variedades (list) support."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://campo-export-pro.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@fruveco.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"No token in response: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def created_cultivo(headers):
    payload = {
        "nombre": "TEST_Cultivo_Multi_Var",
        "variedades": ["Variedad A", "Variedad B", "Variedad C"],
        "variedad": "Variedad A",
        "tipo": "",
        "unidad_medida": "kg",
        "activo": True,
    }
    r = requests.post(f"{BASE_URL}/api/cultivos", headers=headers, json=payload, timeout=30)
    assert r.status_code in (200, 201), r.text
    data = r.json()
    cid = data.get("_id") or (data.get("cultivo") or {}).get("_id")
    assert cid, f"Missing _id: {data}"
    yield cid
    # teardown
    requests.delete(f"{BASE_URL}/api/cultivos/{cid}", headers=headers, timeout=30)


def _unwrap(payload):
    if isinstance(payload, dict) and "cultivo" in payload and isinstance(payload["cultivo"], dict):
        return payload["cultivo"]
    return payload


def test_create_persists_variedades_list(headers, created_cultivo):
    r = requests.get(f"{BASE_URL}/api/cultivos/{created_cultivo}", headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    doc = _unwrap(r.json())
    assert doc.get("nombre") == "TEST_Cultivo_Multi_Var"
    variedades = doc.get("variedades")
    assert isinstance(variedades, list) and len(variedades) == 3, f"Expected 3 variedades, got {variedades}"
    assert variedades == ["Variedad A", "Variedad B", "Variedad C"]
    # retrocompat: singular field mirrors first entry
    assert doc.get("variedad") == "Variedad A"


def test_put_updates_variedades_list(headers, created_cultivo):
    payload = {
        "nombre": "TEST_Cultivo_Multi_Var",
        "variedades": ["Variedad A", "Variedad D"],
        "variedad": "Variedad A",
        "tipo": "",
        "unidad_medida": "kg",
        "activo": True,
    }
    r = requests.put(f"{BASE_URL}/api/cultivos/{created_cultivo}", headers=headers, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    # verify
    g = requests.get(f"{BASE_URL}/api/cultivos/{created_cultivo}", headers=headers, timeout=30)
    assert g.status_code == 200
    doc = _unwrap(g.json())
    assert doc.get("variedades") == ["Variedad A", "Variedad D"]
    assert doc.get("variedad") == "Variedad A"


def test_list_contains_cultivo(headers, created_cultivo):
    r = requests.get(f"{BASE_URL}/api/cultivos?limit=500", headers=headers, timeout=30)
    assert r.status_code == 200
    items = r.json().get("cultivos", [])
    found = [c for c in items if c.get("_id") == created_cultivo]
    assert found, "Created cultivo not in list"
    c = found[0]
    assert isinstance(c.get("variedades"), list)
    assert len(c.get("variedades")) >= 2


def test_add_variedad_endpoint_idempotent(headers, created_cultivo):
    r = requests.post(f"{BASE_URL}/api/cultivos/{created_cultivo}/variedades", headers=headers, json={"variedad": "Variedad E"}, timeout=30)
    assert r.status_code == 200, r.text
    vs = r.json().get("variedades", [])
    assert "Variedad E" in vs
    # idempotent
    r2 = requests.post(f"{BASE_URL}/api/cultivos/{created_cultivo}/variedades", headers=headers, json={"variedad": "variedad e"}, timeout=30)
    assert r2.status_code == 200
    vs2 = r2.json().get("variedades", [])
    lower = [v.lower() for v in vs2]
    assert lower.count("variedad e") == 1
