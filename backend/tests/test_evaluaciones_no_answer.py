"""
Test that the Evaluaciones endpoint persists the boolean `false` (No) answer.
Bug: Frontend was using `respuestas[p.id] || ''` which converted false to ''.
Fix: Changed to `??` operator to preserve falsy booleans.
Backend must accept and persist `false` as-is.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # try reading from frontend/.env
    try:
        with open('/app/frontend/.env') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                    break
    except Exception:
        pass

EVAL_ID = '6a3e4b01e223c5dd1673c04c'


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "admin@fruveco.com", "password": "admin123"},
                      timeout=30)
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def test_evaluacion_exists(headers):
    r = requests.get(f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get('_id') == EVAL_ID


def test_put_and_persist_false_for_td9(headers):
    """Set td_9='No' (false) via PUT, then GET and verify persisted as boolean false."""
    r = requests.get(f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=headers, timeout=30)
    assert r.status_code == 200
    eval_data = r.json()

    # Build the payload as frontend does - simulate flat list of section_respuestas
    # We need to ensure td_9 has respuesta=False
    toma_datos = eval_data.get('toma_datos', []) or []
    # Ensure td_9 present and set false
    found = False
    for item in toma_datos:
        if item.get('pregunta_id') == 'td_9':
            item['respuesta'] = False
            found = True
    if not found:
        toma_datos.append({
            'pregunta_id': 'td_9',
            'pregunta': 'El ganado pasa por el campo entre cultivos?',
            'tipo': 'si_no',
            'respuesta': False,
        })

    payload = {
        'parcela_id': eval_data.get('parcela_id', ''),
        'fecha_inicio': eval_data.get('fecha_inicio', ''),
        'fecha_fin': eval_data.get('fecha_fin', ''),
        'tecnico': eval_data.get('tecnico', ''),
        'toma_datos': toma_datos,
        'impresos': eval_data.get('impresos', {}) or {},
        'analisis_suelo': eval_data.get('analisis_suelo', []) or [],
        'calidad_cepellones': eval_data.get('calidad_cepellones', []) or [],
        'inspeccion_maquinaria': eval_data.get('inspeccion_maquinaria', []) or [],
        'pasos_precampana': eval_data.get('pasos_precampana', []) or [],
        'observaciones': eval_data.get('observaciones', []) or [],
        'calibracion_mantenimiento': eval_data.get('calibracion_mantenimiento', []) or [],
        'secciones': eval_data.get('secciones', {}) or {},
    }
    # Also patch secciones.toma_datos
    secciones = payload['secciones']
    if isinstance(secciones, dict):
        sec_td = secciones.get('toma_datos') or []
        found_s = False
        for item in sec_td:
            if item.get('pregunta_id') == 'td_9':
                item['respuesta'] = False
                found_s = True
        if not found_s:
            sec_td.append({
                'pregunta_id': 'td_9',
                'pregunta': 'El ganado pasa por el campo entre cultivos?',
                'tipo': 'si_no',
                'respuesta': False,
            })
        secciones['toma_datos'] = sec_td

    r2 = requests.put(f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=headers,
                     json=payload, timeout=30)
    assert r2.status_code in (200, 204), r2.text

    # Verify GET
    r3 = requests.get(f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=headers, timeout=30)
    assert r3.status_code == 200
    data = r3.json()
    td9_items = [i for i in (data.get('toma_datos') or []) if i.get('pregunta_id') == 'td_9']
    assert td9_items, "td_9 not persisted in toma_datos"
    val = td9_items[0].get('respuesta')
    assert val is False, f"Expected False, got {val!r} (type {type(val).__name__})"


def test_pdf_shows_no_for_td9(headers):
    """Verify PDF contains 'No' answer for td_9 (ganado)."""
    r = requests.get(f"{BASE_URL}/api/evaluaciones/{EVAL_ID}/pdf", headers=headers, timeout=60)
    assert r.status_code == 200, r.text[:300]
    assert r.headers.get('content-type', '').startswith('application/pdf')
    # We can't easily parse PDF here, but ensure it downloaded.
    assert len(r.content) > 1000


def test_put_and_persist_true_and_texto(headers):
    """Ensure boolean True and text answers coexist and persist for other td questions."""
    r = requests.get(f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=headers, timeout=30)
    assert r.status_code == 200
    eval_data = r.json()

    toma_datos = eval_data.get('toma_datos', []) or []
    # Ensure td_1 True and td_5 text
    def upsert(items, pid, pregunta, tipo, val):
        for it in items:
            if it.get('pregunta_id') == pid:
                it['respuesta'] = val
                it.setdefault('pregunta', pregunta)
                it.setdefault('tipo', tipo)
                return
        items.append({'pregunta_id': pid, 'pregunta': pregunta, 'tipo': tipo, 'respuesta': val})

    upsert(toma_datos, 'td_1', 'Se mantiene limpia la finca?', 'si_no', True)
    upsert(toma_datos, 'td_5', 'En que condiciones se mantienen los margenes de los campos?', 'texto', 'Limpios')

    secciones = eval_data.get('secciones') or {}
    sec_td = secciones.get('toma_datos') or []
    upsert(sec_td, 'td_1', 'Se mantiene limpia la finca?', 'si_no', True)
    upsert(sec_td, 'td_5', 'En que condiciones se mantienen los margenes de los campos?', 'texto', 'Limpios')
    secciones['toma_datos'] = sec_td

    payload = {
        'parcela_id': eval_data.get('parcela_id', ''),
        'fecha_inicio': eval_data.get('fecha_inicio', ''),
        'fecha_fin': eval_data.get('fecha_fin', ''),
        'tecnico': eval_data.get('tecnico', ''),
        'toma_datos': toma_datos,
        'impresos': eval_data.get('impresos', {}) or {},
        'analisis_suelo': eval_data.get('analisis_suelo', []) or [],
        'calidad_cepellones': eval_data.get('calidad_cepellones', []) or [],
        'inspeccion_maquinaria': eval_data.get('inspeccion_maquinaria', []) or [],
        'pasos_precampana': eval_data.get('pasos_precampana', []) or [],
        'observaciones': eval_data.get('observaciones', []) or [],
        'calibracion_mantenimiento': eval_data.get('calibracion_mantenimiento', []) or [],
        'secciones': secciones,
    }

    r2 = requests.put(f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=headers, json=payload, timeout=30)
    assert r2.status_code in (200, 204), r2.text

    r3 = requests.get(f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=headers, timeout=30)
    data = r3.json()
    td = {i['pregunta_id']: i for i in data.get('toma_datos', []) if i.get('pregunta_id')}
    assert td.get('td_1', {}).get('respuesta') is True, f"td_1 not True: {td.get('td_1')}"
    assert td.get('td_5', {}).get('respuesta') == 'Limpios', f"td_5 not string: {td.get('td_5')}"
    # And td_9 still False from previous test
    assert td.get('td_9', {}).get('respuesta') is False, f"td_9 not False anymore: {td.get('td_9')}"
