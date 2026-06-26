import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/') or 'http://localhost:8001'


@pytest.fixture(scope='module')
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@fruveco.com", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json().get('token') or r.json().get('access_token')


@pytest.fixture(scope='module')
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope='module')
def parcela_id(headers):
    r = requests.get(f"{BASE_URL}/api/parcelas?limit=1", headers=headers)
    assert r.status_code == 200, r.text
    data = r.json()
    parcelas = data if isinstance(data, list) else data.get('parcelas', [])
    assert len(parcelas) > 0, 'No parcelas seeded'
    return parcelas[0]['_id']


IMPRESOS_PAYLOAD = {
    "comentarios": "TEST_comentarios_round_trip",
    "proveedor": "TEST Proveedor",
    "codigo_plantacion": "TEST-001",
    "finca": "TEST Finca",
    "cultivo": "TEST Cultivo",
    "variedad": "TEST Variedad",
    "superficie": "12.5",
    "analisis_suelo": {
        "hoja_archivada": True,
        "medidas_tomadas": "TEST medidas",
        "envases_archivados": False,
        "libre_sintomas": {"enfermedades": True, "plagas": False, "virus": True}
    },
    "pasos_precampana": {"observaciones": "TEST pasos obs"},
    "calibracion": {"vaso": "TEST vaso", "peso": "TEST peso"},
    "calidad_cepellones": {
        "numero_lote": "TEST-LOTE-1",
        "envases_archivados": True,
        "certificado_sanidad": False,
        "certificado_archivado": True,
        "libre_sintomas": {"enfermedades": False, "plagas": True, "virus": False}
    },
    "inspeccion_maquinaria": {
        "tipo": "TEST tipo", "modelo": "TEST modelo", "numero_serie": "TEST-SN-1",
        "limpieza_filtros": True, "estado_manguera": False,
        "diafragmas_cambiados": True, "conexiones_revisadas": False
    },
    "observaciones_generales": "TEST obs grales"
}


def test_create_evaluacion_with_impresos(headers, parcela_id):
    payload = {"parcela_id": parcela_id, "impresos": IMPRESOS_PAYLOAD}
    r = requests.post(f"{BASE_URL}/api/evaluaciones", headers=headers, json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    data = body.get('data') or body
    eval_id = data.get('_id') or data.get('id')
    assert eval_id, f'no id in {body}'
    assert data['impresos']['comentarios'] == "TEST_comentarios_round_trip"
    assert data['impresos']['analisis_suelo']['hoja_archivada'] is True
    assert data['impresos']['calidad_cepellones']['libre_sintomas']['plagas'] is True
    assert data['impresos']['inspeccion_maquinaria']['numero_serie'] == "TEST-SN-1"

    # GET verify
    g = requests.get(f"{BASE_URL}/api/evaluaciones/{eval_id}", headers=headers)
    assert g.status_code == 200
    got = g.json()
    assert got['impresos']['observaciones_generales'] == "TEST obs grales"
    assert got['impresos']['calibracion']['vaso'] == "TEST vaso"

    # PUT update
    upd = dict(IMPRESOS_PAYLOAD)
    upd['comentarios'] = "TEST_updated"
    put = requests.put(f"{BASE_URL}/api/evaluaciones/{eval_id}", headers=headers, json={"parcela_id": parcela_id, "impresos": upd})
    assert put.status_code == 200, put.text
    g2 = requests.get(f"{BASE_URL}/api/evaluaciones/{eval_id}", headers=headers)
    assert g2.json()['impresos']['comentarios'] == "TEST_updated"

    # cleanup
    requests.delete(f"{BASE_URL}/api/evaluaciones/{eval_id}", headers=headers)
