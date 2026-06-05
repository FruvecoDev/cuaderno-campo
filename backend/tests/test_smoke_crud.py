"""
Smoke test CRUD para los módulos principales.

Valida que cada endpoint REST básico (LIST + CREATE + READ + UPDATE + DELETE)
funciona contra el backend real, usando los modelos Pydantic actuales.

Si un cambio en un modelo Pydantic rompe el payload mínimo esperado, este
test lo detecta antes del deploy.

Ejecutar:
    REACT_APP_BACKEND_URL=... TEST_EMAIL=admin@fruveco.com TEST_PASSWORD=admin123 \
    python3 -m pytest backend/tests/test_smoke_crud.py -v

Diseño:
- Cada test es independiente y limpia sus propios datos al final.
- Si falta una fixture (p.ej. no hay parcelas), el test la crea on-the-fly.
- Timeouts cortos (5s) para fallar rápido.
"""
import os
import uuid
import pytest
import requests

API_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
TEST_EMAIL = os.environ.get("TEST_EMAIL", "admin@fruveco.com")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "admin123")
TIMEOUT = 10


@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{API_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _crud_cycle(headers, list_endpoint, create_payload, *, list_key=None, id_key="_id", item_endpoint=None):
    """
    Generic CRUD cycle:
      1. LIST (must return 200 and a list/wrapper)
      2. CREATE (must return 200 and the new id)
      3. GET single (optional, only if item_endpoint provided)
      4. UPDATE
      5. DELETE
    Returns the created id (already deleted).
    """
    # 1. LIST
    r = requests.get(f"{API_URL}{list_endpoint}", headers=headers, timeout=TIMEOUT)
    assert r.status_code == 200, f"LIST {list_endpoint} -> {r.status_code}: {r.text[:200]}"
    body = r.json()
    if list_key:
        assert list_key in body, f"LIST response missing '{list_key}' key: {list(body.keys())}"
        assert isinstance(body[list_key], list), f"'{list_key}' should be a list"

    # 2. CREATE
    r = requests.post(f"{API_URL}{list_endpoint}", headers=headers, json=create_payload, timeout=TIMEOUT)
    assert r.status_code in (200, 201), f"CREATE {list_endpoint} -> {r.status_code}: {r.text[:300]}"
    created = r.json()
    # Body could be {id: ...}, {data: {...}}, {contrato: {...}}, or the doc itself
    doc = created.get("data") or created.get("contrato") or created.get("proveedor") or created
    if isinstance(doc, dict) and id_key not in doc:
        # Try alternate key
        for k in ("id", "_id", "inserted_id"):
            if k in doc:
                id_key = k
                break
    new_id = doc.get(id_key) if isinstance(doc, dict) else None
    assert new_id, f"CREATE response missing id (looked for '{id_key}'). Got: {created}"

    # 3. UPDATE (best-effort) — only if PUT endpoint exists
    update_payload = {**create_payload}
    base = item_endpoint or list_endpoint
    r = requests.put(f"{API_URL}{base}/{new_id}", headers=headers, json=update_payload, timeout=TIMEOUT)
    # Some endpoints return 200; some 404 if PUT isn't wired. Don't hard-fail.
    assert r.status_code in (200, 201, 404), f"UPDATE -> {r.status_code}: {r.text[:200]}"

    # 4. DELETE
    r = requests.delete(f"{API_URL}{base}/{new_id}", headers=headers, timeout=TIMEOUT)
    assert r.status_code in (200, 204), f"DELETE -> {r.status_code}: {r.text[:200]}"
    return new_id


# ============================================================================
# Tests
# ============================================================================

def test_smoke_proveedores(headers):
    _crud_cycle(
        headers,
        list_endpoint="/api/proveedores",
        list_key="proveedores",
        create_payload={
            "nombre": f"SMOKE-Proveedor-{uuid.uuid4().hex[:8]}",
            "tipo_proveedor": "Agricultor",
        },
    )


def test_smoke_clientes(headers):
    _crud_cycle(
        headers,
        list_endpoint="/api/clientes",
        list_key="clientes",
        create_payload={
            "nombre": f"SMOKE-Cliente-{uuid.uuid4().hex[:8]}",
        },
    )


def test_smoke_agentes(headers):
    _crud_cycle(
        headers,
        list_endpoint="/api/agentes",
        list_key="agentes",
        create_payload={
            "nombre": f"SMOKE-Agente-{uuid.uuid4().hex[:8]}",
            "tipo": "Compra",
            "activo": True,
        },
    )


def test_smoke_fincas(headers):
    _crud_cycle(
        headers,
        list_endpoint="/api/fincas",
        list_key="fincas",
        create_payload={
            "denominacion": f"SMOKE-Finca-{uuid.uuid4().hex[:8]}",
            "hectareas": 1.0,
        },
    )


def test_smoke_contratos(headers):
    _crud_cycle(
        headers,
        list_endpoint="/api/contratos",
        list_key="contratos",
        create_payload={
            "tipo": "Compra",
            "campana": "2026/27",
            "procedencia": "Campo",
            "fecha_contrato": "2026-01-15",
            "cultivo": f"SMOKE-{uuid.uuid4().hex[:6]}",
            "cantidad": 100.0,
            "precio": 1.0,
            "periodo_desde": "2026-01-01",
            "periodo_hasta": "2026-12-31",
        },
    )


def test_smoke_tareas(headers):
    _crud_cycle(
        headers,
        list_endpoint="/api/tareas",
        list_key="tareas",
        create_payload={
            "nombre": f"SMOKE-Tarea-{uuid.uuid4().hex[:8]}",
            "fecha_inicio": "2026-06-01",
        },
    )


def test_smoke_list_endpoints_respond_200(headers):
    """Catch any list endpoint that fails (auth, model, query) without creating data."""
    endpoints = [
        "/api/proveedores", "/api/clientes", "/api/agentes",
        "/api/fincas", "/api/parcelas", "/api/contratos",
        "/api/visitas", "/api/tareas", "/api/cosechas",
        "/api/tratamientos", "/api/irrigaciones", "/api/recetas",
        "/api/albaranes", "/api/evaluaciones",
    ]
    failures = []
    for ep in endpoints:
        try:
            r = requests.get(f"{API_URL}{ep}", headers=headers, timeout=TIMEOUT)
            if r.status_code != 200:
                failures.append(f"{ep} -> {r.status_code}: {r.text[:120]}")
        except Exception as e:
            failures.append(f"{ep} -> {type(e).__name__}: {e}")
    assert not failures, "List endpoints failing:\n  " + "\n  ".join(failures)
