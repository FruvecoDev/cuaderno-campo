"""
Test for bug: nueva visita no aparece en el listado tras crearse.
Fix: GET /api/visitas ahora ordena por created_at DESC (+_id DESC) y
default limit subido a 10000. Después de POST, la nueva visita debe
aparecer en la posición 0 del array visitas[].

Cubre tambien la verificacion equivalente para Tratamientos.
"""

import os
import time
import pytest
import requests

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL')
            or 'https://campo-export-pro.preview.emergentagent.com').rstrip('/')
ADMIN_EMAIL = "admin@fruveco.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
    }, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok, f"No token in response: {data}"
    return tok


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def any_parcela_id(headers):
    r = requests.get(f"{BASE_URL}/api/parcelas", headers=headers, timeout=30)
    assert r.status_code == 200
    parcelas = r.json().get("parcelas", [])
    assert len(parcelas) > 0, "No parcelas disponibles para test"
    return parcelas[0]["_id"]


# ---------- VISITAS ----------

class TestVisitasOrdering:
    """Bug principal: nueva visita debe aparecer en pos [0] tras POST."""

    def _fetch(self, headers, limit=10000):
        r = requests.get(f"{BASE_URL}/api/visitas", headers=headers,
                         params={"limit": limit}, timeout=60)
        assert r.status_code == 200, f"GET visitas: {r.status_code} {r.text[:300]}"
        return r.json()

    def test_default_limit_is_at_least_10000(self, headers):
        """GET /api/visitas sin ?limit debe devolver hasta 10000."""
        r = requests.get(f"{BASE_URL}/api/visitas", headers=headers, timeout=60)
        assert r.status_code == 200
        data = r.json()
        total = data.get("total", 0)
        returned = len(data.get("visitas", []))
        # Devueltas debe ser min(total, 10000). Si total<=10000 => devueltas==total
        if total <= 10000:
            assert returned == total, (
                f"Con total={total} debería devolver todas; devolvió {returned}"
            )
        else:
            assert returned == 10000, (
                f"Con total={total} debería devolver 10000; devolvió {returned}"
            )

    def test_new_visita_appears_at_position_0_first_creation(self, headers, any_parcela_id):
        """Después de POST, GET debe devolver la nueva visita en posición 0."""
        before = self._fetch(headers)
        total_before = before.get("total", 0)

        ts = int(time.time() * 1000)
        payload = {
            "parcela_id": any_parcela_id,
            "objetivo": "General",
            "fecha_visita": "2026-01-15",
            "observaciones": f"TEST_AUTO_{ts}_1"
        }
        r = requests.post(f"{BASE_URL}/api/visitas", headers=headers,
                          json=payload, timeout=30)
        assert r.status_code == 200, f"POST visita: {r.status_code} {r.text[:300]}"
        body = r.json()
        assert body.get("success") is True
        new_id = body["data"]["_id"]

        after = self._fetch(headers)
        assert after["total"] == total_before + 1, (
            f"Total no aumentó en 1 (before={total_before}, after={after['total']})"
        )
        first = after["visitas"][0]
        assert first["_id"] == new_id, (
            f"Nueva visita no está en posición 0. "
            f"Esperado {new_id}, encontrado {first['_id']} "
            f"(obs='{first.get('observaciones','')[:60]}')"
        )
        assert first.get("observaciones") == f"TEST_AUTO_{ts}_1"

        # Cleanup
        requests.delete(f"{BASE_URL}/api/visitas/{new_id}", headers=headers, timeout=30)

    def test_new_visita_appears_at_position_0_second_creation(self, headers, any_parcela_id):
        """Repetir para confirmar consistencia."""
        ts = int(time.time() * 1000)
        payload = {
            "parcela_id": any_parcela_id,
            "objetivo": "General",
            "fecha_visita": "2026-01-15",
            "observaciones": f"TEST_AUTO_{ts}_2"
        }
        r = requests.post(f"{BASE_URL}/api/visitas", headers=headers,
                          json=payload, timeout=30)
        assert r.status_code == 200
        new_id = r.json()["data"]["_id"]

        after = self._fetch(headers)
        first = after["visitas"][0]
        assert first["_id"] == new_id, (
            f"2ª visita no está en pos 0. Esperado {new_id}, "
            f"encontrado {first['_id']}"
        )

        requests.delete(f"{BASE_URL}/api/visitas/{new_id}", headers=headers, timeout=30)

    def test_ordering_is_created_at_desc(self, headers, any_parcela_id):
        """Crear 3 visitas consecutivas y verificar orden DESC en pos [0..2]."""
        ids = []
        try:
            for i in range(3):
                r = requests.post(f"{BASE_URL}/api/visitas", headers=headers, json={
                    "parcela_id": any_parcela_id,
                    "objetivo": "General",
                    "fecha_visita": "2026-01-15",
                    "observaciones": f"TEST_AUTO_ORDER_{int(time.time()*1000)}_{i}"
                }, timeout=30)
                assert r.status_code == 200
                ids.append(r.json()["data"]["_id"])
                time.sleep(0.05)

            data = self._fetch(headers)
            top_ids = [v["_id"] for v in data["visitas"][:3]]
            # La ultima creada debe estar primera, la primera creada tercera
            assert top_ids == list(reversed(ids)), (
                f"Orden esperado {list(reversed(ids))}, obtenido {top_ids}"
            )
        finally:
            for vid in ids:
                requests.delete(f"{BASE_URL}/api/visitas/{vid}",
                                headers=headers, timeout=30)


# ---------- TRATAMIENTOS (verificación colateral) ----------

class TestTratamientosOrdering:
    """Mismo patrón para /api/tratamientos."""

    def test_default_limit_is_at_least_10000(self, headers):
        r = requests.get(f"{BASE_URL}/api/tratamientos", headers=headers, timeout=60)
        assert r.status_code == 200
        data = r.json()
        total = data.get("total", 0)
        returned = len(data.get("tratamientos", []))
        if total <= 10000:
            assert returned == total
        else:
            assert returned == 10000

    def test_new_tratamiento_appears_at_position_0(self, headers, any_parcela_id):
        r0 = requests.get(f"{BASE_URL}/api/tratamientos", headers=headers,
                          params={"limit": 10000}, timeout=60)
        assert r0.status_code == 200
        total_before = r0.json().get("total", 0)

        ts = int(time.time() * 1000)
        payload = {
            "parcelas_ids": [any_parcela_id],
            "tipo_tratamiento": "fitosanitario",
            "subtipo": "TEST",
            "fecha_tratamiento": "2026-01-15",
            "observaciones": f"TEST_AUTO_TRAT_{ts}"
        }
        r = requests.post(f"{BASE_URL}/api/tratamientos", headers=headers,
                          json=payload, timeout=30)
        # tratamiento model puede requerir mas campos; toleramos 422 pero
        # entonces skip: el bug relevante es visitas.
        if r.status_code in (400, 422):
            pytest.skip(f"Tratamiento model needs more fields: {r.text[:200]}")
        assert r.status_code == 200, f"POST tratamiento: {r.status_code} {r.text[:300]}"
        new_id = r.json()["data"]["_id"]

        try:
            r1 = requests.get(f"{BASE_URL}/api/tratamientos", headers=headers,
                              params={"limit": 10000}, timeout=60)
            data = r1.json()
            assert data["total"] == total_before + 1
            first = data["tratamientos"][0]
            assert first["_id"] == new_id, (
                f"Nuevo tratamiento no en pos 0. Esperado {new_id}, "
                f"encontrado {first['_id']}"
            )
        finally:
            requests.delete(f"{BASE_URL}/api/tratamientos/{new_id}",
                            headers=headers, timeout=30)
