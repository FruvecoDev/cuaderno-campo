"""
Tests de "data-freshness" en el PDF de la Hoja de Evaluación.

Objetivo:
- Verificar que el endpoint `GET /api/evaluaciones/{id}/pdf` lee en vivo:
    (a) nombre del Aplicador (colección tecnicos_aplicadores)
    (b) nombre de la Máquina (colección maquinaria)
    (c) campos heredados de la Parcela (proveedor, cultivo, variedad, finca,
        campaña, codigo_plantacion) — se sobrescriben en TODAS las visitas y
        tratamientos del PDF, no sólo en la primera.
- Verificar regresión: la Ficha final del Aplicador/Maquinaria sigue
  deduplicando (una entrada por técnico/máquina, no una por tratamiento).

Los tests restauran los datos originales al terminar cada test.
Requiere: pymupdf (fitz) para extracción de texto del PDF.
"""

import os
import io
import time
import pytest
import requests
import fitz  # PyMuPDF

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://campo-export-pro.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@fruveco.com"
ADMIN_PASS = "admin123"

# Evaluación conocida con 3 tratamientos vinculados a técnico + máquina
EVAL_ID = "6a3e4b01e223c5dd1673c04c"
PARCELA_ID = "6a3e90f77b8cf2eb0d697bc1"
TECNICO_ID = "6a3e350d40b2b1b51493e703"
MAQUINA_ID = "6a3e364d40b2b1b51493e704"


# ---------------------------------------------------------------------------
# Fixtures compartidas
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASS},
        timeout=30,
    )
    assert r.status_code == 200, f"Login falló: {r.status_code} {r.text[:300]}"
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, f"Sin token en respuesta login: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def H(token):
    return {"Authorization": f"Bearer {token}"}


def _download_pdf_text(H, eval_id=EVAL_ID):
    r = requests.get(f"{BASE_URL}/api/evaluaciones/{eval_id}/pdf", headers=H, timeout=120)
    assert r.status_code == 200, f"PDF {eval_id} status={r.status_code} body={r.text[:300]}"
    assert r.headers.get("content-type", "").startswith("application/pdf"), \
        f"content-type inesperado: {r.headers.get('content-type')}"
    assert len(r.content) > 20_000, f"PDF sospechosamente pequeño: {len(r.content)} bytes"
    doc = fitz.open(stream=r.content, filetype="pdf")
    text = "\n".join(p.get_text() for p in doc)
    npages = doc.page_count
    doc.close()
    return text, npages, r.content


# ---------------------------------------------------------------------------
# TEST 1 — REGRESIÓN PDF: descarga OK, aplicador/máquina en vivo
# ---------------------------------------------------------------------------
def test_pdf_regression_download_ok(H):
    text, npages, content = _download_pdf_text(H)
    assert npages >= 5, f"PDF con muy pocas páginas: {npages}"
    # secciones habituales (case-insensitive porque el PDF puede usar mayúsculas)
    text_upper = text.upper()
    for anchor in ("HOJA DE EVALUACIÓN", "APLICADOR", "MÁQUINA"):
        assert anchor in text_upper, f"Falta sección '{anchor}' en PDF"

    # Aplicador ACTUAL: leído en vivo (nombre + apellidos)
    r_tec = requests.get(f"{BASE_URL}/api/tecnicos-aplicadores/{TECNICO_ID}", headers=H, timeout=30)
    assert r_tec.status_code == 200
    tec = r_tec.json()
    full_name = f"{tec['nombre']} {tec['apellidos']}".strip()
    assert full_name in text, f"Nombre en vivo del técnico '{full_name}' no aparece en PDF"

    # Máquina ACTUAL: leído en vivo
    r_mq = requests.get(f"{BASE_URL}/api/maquinaria/{MAQUINA_ID}", headers=H, timeout=30)
    assert r_mq.status_code == 200
    mq = r_mq.json()
    assert mq["nombre"] in text, f"Nombre en vivo de máquina '{mq['nombre']}' no aparece en PDF"


# ---------------------------------------------------------------------------
# TEST 2 — FRESHNESS TÉCNICO APLICADOR
# ---------------------------------------------------------------------------
def test_pdf_freshness_tecnico_aplicador(H):
    r = requests.get(f"{BASE_URL}/api/tecnicos-aplicadores/{TECNICO_ID}", headers=H, timeout=30)
    assert r.status_code == 200
    original = r.json()
    original_name = original["nombre"]

    # Baseline: PDF con el nombre original
    text_before, _, _ = _download_pdf_text(H)
    assert original_name in text_before, f"Nombre original '{original_name}' no aparece en PDF base"

    # Editar el técnico con nombre distinto
    new_nombre = f"TESTFRESH_{int(time.time())}"
    payload = {
        "nombre": new_nombre,
        "apellidos": original["apellidos"],
        "dni": original["dni"],
        "nivel_capacitacion": original["nivel_capacitacion"],
        "num_carnet": original["num_carnet"],
        "fecha_certificacion": original["fecha_certificacion"],
        "observaciones": original.get("observaciones", "") or "",
        "maquinas_ids": original.get("maquinas_ids", []) or [],
    }
    try:
        put = requests.put(
            f"{BASE_URL}/api/tecnicos-aplicadores/{TECNICO_ID}",
            headers=H, json=payload, timeout=30,
        )
        assert put.status_code == 200, f"PUT técnico falló: {put.status_code} {put.text[:300]}"

        # PDF #2 con el nombre NUEVO
        text_after, _, _ = _download_pdf_text(H)
        assert new_nombre in text_after, (
            f"El PDF NO refleja el nombre nuevo del técnico '{new_nombre}'. "
            "El endpoint sigue mostrando el snapshot antiguo."
        )
    finally:
        # Restaurar SIEMPRE el nombre original
        restore = {
            "nombre": original_name,
            "apellidos": original["apellidos"],
            "dni": original["dni"],
            "nivel_capacitacion": original["nivel_capacitacion"],
            "num_carnet": original["num_carnet"],
            "fecha_certificacion": original["fecha_certificacion"],
            "observaciones": original.get("observaciones", "") or "",
            "maquinas_ids": original.get("maquinas_ids", []) or [],
        }
        r_restore = requests.put(
            f"{BASE_URL}/api/tecnicos-aplicadores/{TECNICO_ID}",
            headers=H, json=restore, timeout=30,
        )
        assert r_restore.status_code == 200, f"No se pudo restaurar técnico: {r_restore.text[:200]}"


# ---------------------------------------------------------------------------
# TEST 3 — FRESHNESS MÁQUINA
# ---------------------------------------------------------------------------
def test_pdf_freshness_maquina(H):
    r = requests.get(f"{BASE_URL}/api/maquinaria/{MAQUINA_ID}", headers=H, timeout=30)
    assert r.status_code == 200
    original = r.json()
    original_name = original["nombre"]

    text_before, _, _ = _download_pdf_text(H)
    assert original_name in text_before, f"Nombre original máquina '{original_name}' no aparece en PDF base"

    new_nombre = f"TESTMAQ_{int(time.time())}"

    def _payload(nombre_val):
        # Enviar sólo campos aceptados por MaquinariaCreate
        return {
            "nombre": nombre_val,
            "tipo": original.get("tipo") or "Pulverizador",
            "modelo": original.get("modelo"),
            "marca": original.get("marca"),
            "matricula": original.get("matricula") or "",
            "num_serie": original.get("num_serie") or "",
            "numero_bastidor": original.get("numero_bastidor"),
            "registro_roma": original.get("registro_roma"),
            "año_fabricacion": original.get("año_fabricacion"),
            "capacidad": original.get("capacidad"),
            "estado": original.get("estado") or "Operativo",
            "observaciones": original.get("observaciones"),
            "imagen_placa_ce_url": original.get("imagen_placa_ce_url"),
            "fecha_proxima_itv": original.get("fecha_proxima_itv") or "",
            "fecha_ultimo_mantenimiento": original.get("fecha_ultimo_mantenimiento") or "",
            "intervalo_mantenimiento_dias": original.get("intervalo_mantenimiento_dias"),
        }

    try:
        put = requests.put(
            f"{BASE_URL}/api/maquinaria/{MAQUINA_ID}",
            headers=H, json=_payload(new_nombre), timeout=30,
        )
        assert put.status_code == 200, f"PUT máquina falló: {put.status_code} {put.text[:300]}"

        text_after, _, _ = _download_pdf_text(H)
        assert new_nombre in text_after, (
            f"El PDF NO refleja el nombre nuevo de máquina '{new_nombre}'. "
            "El endpoint sigue mostrando el snapshot antiguo."
        )
    finally:
        r_restore = requests.put(
            f"{BASE_URL}/api/maquinaria/{MAQUINA_ID}",
            headers=H, json=_payload(original_name), timeout=30,
        )
        assert r_restore.status_code == 200, f"No se pudo restaurar máquina: {r_restore.text[:200]}"


# ---------------------------------------------------------------------------
# TEST 4 — FRESHNESS PARCELA: variedad se propaga a TODAS las visitas/tratamientos
# ---------------------------------------------------------------------------
def test_pdf_freshness_parcela_variedad(H):
    r = requests.get(f"{BASE_URL}/api/parcelas/{PARCELA_ID}", headers=H, timeout=30)
    assert r.status_code == 200
    original = r.json()
    original_variedad = original.get("variedad") or ""

    new_variedad = f"NUEVA_VARIEDAD_TEST_{int(time.time())}"

    try:
        put = requests.put(
            f"{BASE_URL}/api/parcelas/{PARCELA_ID}",
            headers=H, json={"variedad": new_variedad}, timeout=30,
        )
        assert put.status_code == 200, f"PUT parcela falló: {put.status_code} {put.text[:300]}"

        # Verificar en el PDF
        text, npages, content = _download_pdf_text(H)
        assert new_variedad in text, (
            f"La variedad nueva '{new_variedad}' NO aparece en el PDF (parcela no propagada)."
        )

        # Contar cuántas veces aparece: debe aparecer al menos una vez por
        # cada visita+tratamiento (>=2 confirma que se propaga más allá de la
        # primera). En esta parcela hay 3 tratamientos con datos completos.
        occurrences = text.count(new_variedad)
        # Como mínimo esperamos >1 (varias visitas/tratamientos).
        assert occurrences >= 2, (
            f"La variedad nueva aparece sólo {occurrences} vez/veces en el PDF. "
            "Debe aparecer en TODAS las visitas/tratamientos, no sólo en la primera."
        )
    finally:
        r_restore = requests.put(
            f"{BASE_URL}/api/parcelas/{PARCELA_ID}",
            headers=H, json={"variedad": original_variedad}, timeout=30,
        )
        assert r_restore.status_code == 200, f"No se pudo restaurar parcela: {r_restore.text[:200]}"


# ---------------------------------------------------------------------------
# TEST 5 — REGRESIÓN Ficha final dedup: técnico/máquina UNA sola vez
# ---------------------------------------------------------------------------
def test_pdf_ficha_final_deduplicada(H):
    text, npages, _ = _download_pdf_text(H)

    # Localizar el bloque de la ficha final
    # (según routes_evaluaciones el título es "FICHA DEL APLICADOR" y contiene
    # ambos, aplicadores y máquinas)
    lower = text.upper()
    idx = lower.find("FICHA DEL APLICADOR")
    if idx == -1:
        # posible variante
        idx = lower.find("APLICADOR Y MAQUINARIA")
    assert idx >= 0, "No se localiza la sección final 'FICHA DEL APLICADOR' en el PDF"

    ficha_text = text[idx:]

    # El técnico y la máquina deben aparecer una única vez en la ficha final.
    tec = requests.get(f"{BASE_URL}/api/tecnicos-aplicadores/{TECNICO_ID}", headers=H).json()
    full_tec = f"{tec['nombre']} {tec['apellidos']}".strip()
    mq = requests.get(f"{BASE_URL}/api/maquinaria/{MAQUINA_ID}", headers=H).json()
    mq_name = mq["nombre"]

    # Nombre puede repetirse dentro de una misma ficha (título + campo). Basta
    # con verificar que NO se repite tantas veces como hay tratamientos (>=3).
    tec_count = ficha_text.count(full_tec)
    mq_count = ficha_text.count(mq_name)

    assert tec_count <= 2, (
        f"El técnico '{full_tec}' aparece {tec_count} veces en la ficha final "
        "(esperado ≤2). Se está duplicando por tratamiento."
    )
    assert mq_count <= 2, (
        f"La máquina '{mq_name}' aparece {mq_count} veces en la ficha final "
        "(esperado ≤2). Se está duplicando por tratamiento."
    )
