"""Verify bug: Impresos fields persistence on save/update of Evaluaciones."""
import os
import requests
import pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL") or open("/app/frontend/.env").read().split("REACT_APP_BACKEND_URL=")[1].split("\n")[0].strip()
BASE = BASE.rstrip("/")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE}/api/auth/login", json={"email": "admin@fruveco.com", "password": "admin123"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def parcela_id(headers):
    r = requests.get(f"{BASE}/api/parcelas?limit=1", headers=headers, timeout=30)
    assert r.status_code == 200
    data = r.json()
    parcelas = data if isinstance(data, list) else data.get("parcelas", [])
    assert parcelas, "no parcelas to test with"
    return parcelas[0]["_id"]


FULL_IMPRESOS = {
    "comentarios": "TESTBUG2026 comentario cabecera",
    "analisis_suelo": {
        "hoja_archivada": True,
        "medidas_tomadas": "TESTBUG2026 medidas",
        "envases_archivados": False,
        "libre_sintomas": {"enfermedades": True, "plagas": False, "virus": True},
    },
    "pasos_precampana": {"observaciones": "TESTBUG2026 pasos"},
    "calibracion": {"vaso": "TESTBUG2026 vaso", "peso": "TESTBUG2026 peso"},
    "calidad_cepellones": {
        "numero_lote": "TESTBUG2026-LOTE-1",
        "anexo": None,
        "envases_archivados": True,
        "certificado_sanidad": False,
        "certificado_archivado": True,
        "libre_sintomas": {"enfermedades": False, "plagas": True, "virus": False},
    },
    "inspeccion_maquinaria": {
        "tipo": "TESTBUG2026 tipo",
        "modelo": "TESTBUG2026 modelo",
        "numero_serie": "TESTBUG2026-SERIE",
        "limpieza_filtros": True,
        "estado_manguera": False,
        "diafragmas_cambiados": True,
        "conexiones_revisadas": False,
    },
    "observaciones_generales": "TESTBUG2026 observ gen",
}


def _assert_impresos_match(imp, expected):
    # top-level
    assert imp.get("comentarios") == expected["comentarios"]
    assert imp.get("observaciones_generales") == expected["observaciones_generales"]
    # nested S1
    a = imp.get("analisis_suelo") or {}
    e = expected["analisis_suelo"]
    assert a.get("hoja_archivada") == e["hoja_archivada"]
    assert a.get("envases_archivados") == e["envases_archivados"]
    assert a.get("medidas_tomadas") == e["medidas_tomadas"]
    assert (a.get("libre_sintomas") or {}) == e["libre_sintomas"]
    # nested S2
    assert (imp.get("pasos_precampana") or {}).get("observaciones") == expected["pasos_precampana"]["observaciones"]
    # nested S3
    cal = imp.get("calibracion") or {}
    assert cal.get("vaso") == expected["calibracion"]["vaso"]
    assert cal.get("peso") == expected["calibracion"]["peso"]
    # nested S4
    cc = imp.get("calidad_cepellones") or {}
    ce = expected["calidad_cepellones"]
    assert cc.get("numero_lote") == ce["numero_lote"]
    assert cc.get("envases_archivados") == ce["envases_archivados"]
    assert cc.get("certificado_sanidad") == ce["certificado_sanidad"]
    assert cc.get("certificado_archivado") == ce["certificado_archivado"]
    assert (cc.get("libre_sintomas") or {}) == ce["libre_sintomas"]
    # nested S5
    m = imp.get("inspeccion_maquinaria") or {}
    em = expected["inspeccion_maquinaria"]
    for k in ["tipo", "modelo", "numero_serie", "limpieza_filtros", "estado_manguera", "diafragmas_cambiados", "conexiones_revisadas"]:
        assert m.get(k) == em[k], f"campo {k}: got={m.get(k)} expected={em[k]}"


class TestImpresosPersistence:

    def test_create_with_full_impresos_persists(self, headers, parcela_id):
        payload = {
            "parcela_id": parcela_id,
            "fecha_inicio": "2026-01-15",
            "tecnico": "TESTBUG2026",
            "impresos": FULL_IMPRESOS,
        }
        r = requests.post(f"{BASE}/api/evaluaciones", headers=headers, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        created = r.json()["data"]
        eval_id = created["_id"]
        _assert_impresos_match(created.get("impresos") or {}, FULL_IMPRESOS)
        # GET re-fetch
        g = requests.get(f"{BASE}/api/evaluaciones/{eval_id}", headers=headers, timeout=30)
        assert g.status_code == 200
        _assert_impresos_match(g.json().get("impresos") or {}, FULL_IMPRESOS)
        # cleanup
        requests.delete(f"{BASE}/api/evaluaciones/{eval_id}", headers=headers, timeout=30)

    def test_update_existing_impresos_persists(self, headers, parcela_id):
        # create with empty impresos
        r = requests.post(f"{BASE}/api/evaluaciones", headers=headers, json={"parcela_id": parcela_id, "fecha_inicio": "2026-01-15", "tecnico": "TESTBUG2026", "impresos": {}}, timeout=30)
        assert r.status_code == 200
        eval_id = r.json()["data"]["_id"]
        # PUT with full payload
        put_payload = {"parcela_id": parcela_id, "fecha_inicio": "2026-01-15", "tecnico": "TESTBUG2026", "impresos": FULL_IMPRESOS}
        u = requests.put(f"{BASE}/api/evaluaciones/{eval_id}", headers=headers, json=put_payload, timeout=30)
        assert u.status_code == 200, u.text
        _assert_impresos_match(u.json()["data"].get("impresos") or {}, FULL_IMPRESOS)
        # GET re-fetch
        g = requests.get(f"{BASE}/api/evaluaciones/{eval_id}", headers=headers, timeout=30)
        assert g.status_code == 200
        _assert_impresos_match(g.json().get("impresos") or {}, FULL_IMPRESOS)
        # cleanup
        requests.delete(f"{BASE}/api/evaluaciones/{eval_id}", headers=headers, timeout=30)

    def test_tri_state_si_no_false_persists(self, headers, parcela_id):
        """Critical: ensure False (the 'No' state) persists, not just True."""
        impresos = {"analisis_suelo": {"hoja_archivada": False, "envases_archivados": False}}
        r = requests.post(f"{BASE}/api/evaluaciones", headers=headers, json={"parcela_id": parcela_id, "fecha_inicio": "2026-01-15", "tecnico": "T", "impresos": impresos}, timeout=30)
        assert r.status_code == 200
        eval_id = r.json()["data"]["_id"]
        g = requests.get(f"{BASE}/api/evaluaciones/{eval_id}", headers=headers, timeout=30)
        a = g.json().get("impresos", {}).get("analisis_suelo", {})
        assert a.get("hoja_archivada") is False
        assert a.get("envases_archivados") is False
        requests.delete(f"{BASE}/api/evaluaciones/{eval_id}", headers=headers, timeout=30)
