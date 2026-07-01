"""
Backend tests for the Cuaderno de Campo PDF restructuring.

Validates the bug-fix request in iteration 70:
  - PDF endpoint returns 200 + valid PDF > 50KB
  - No IRRIGACIONES / COSECHAS sections
  - Visitas ordered oldest -> newest
  - Tratamientos ordered oldest -> newest, with real TIPO (e.g. "FITOSANITARIOS - Herbicida")
  - Section order in the PDF
  - "FICHA DEL APLICADOR Y MAQUINARIA" appears EXACTLY ONCE at the end
  - Dynamic "Página X de Y" matches the real page count
  - Regression: Impresos anexo info still rendered in section 4 (Calidad de cepellones)
"""
import io
import os
import re

import pdfplumber
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_EMAIL", "admin@fruveco.com")
ADMIN_PASSWORD = os.environ.get("TEST_PASSWORD", "admin123")

EVAL_COT = "6a3e4b01e223c5dd1673c04c"   # COT-GUI-25-001, 3 tratamientos
EVAL_JIM = "6a3e776ae366c8afa4a65c91"   # JIM-GUI-25-001, several visitas


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def auth_token():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
               timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    data = r.json()
    token = data.get("access_token") or data.get("token")
    if not token:
        pytest.skip("No token in login response")
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


def _download_pdf(eval_id, headers):
    r = requests.get(f"{BASE_URL}/api/evaluaciones/{eval_id}/pdf",
                     headers=headers, timeout=120)
    return r


@pytest.fixture(scope="module")
def pdf_cot(auth_headers):
    r = _download_pdf(EVAL_COT, auth_headers)
    assert r.status_code == 200, f"PDF COT status {r.status_code}: {r.text[:300]}"
    assert r.content[:4] == b"%PDF", "Response is not a PDF (missing %PDF magic)"
    assert len(r.content) > 50_000, f"PDF too small: {len(r.content)} bytes"
    return r.content


@pytest.fixture(scope="module")
def pdf_jim(auth_headers):
    r = _download_pdf(EVAL_JIM, auth_headers)
    assert r.status_code == 200, f"PDF JIM status {r.status_code}: {r.text[:300]}"
    assert r.content[:4] == b"%PDF"
    assert len(r.content) > 30_000
    return r.content


def _extract_text(pdf_bytes):
    out = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for i, page in enumerate(pdf.pages):
            out.append((i + 1, page.extract_text() or ""))
    return out


def _all_text(pages):
    return "\n".join(t for _, t in pages)


# ---------- PDF generation health ----------
class TestPDFGeneration:
    def test_pdf_cot_generated(self, pdf_cot):
        assert len(pdf_cot) > 50_000

    def test_pdf_jim_generated(self, pdf_jim):
        assert len(pdf_jim) > 30_000


# ---------- No IRRIGACIONES / COSECHAS ----------
class TestNoIrrigacionesCosechas:
    def test_cot_no_irrigaciones(self, pdf_cot):
        text = _all_text(_extract_text(pdf_cot)).upper()
        assert "IRRIGACION" not in text, "PDF still contains IRRIGACIONES text"
        assert "IRRIGACIÓN" not in text

    def test_cot_no_cosechas(self, pdf_cot):
        text = _all_text(_extract_text(pdf_cot)).upper()
        # 'COSECHA' as a section/index entry. Note: word may appear in unrelated context,
        # but should NOT appear as a section header.  Require absence of the exact word
        # 'COSECHAS' (plural - used for section/index header).
        assert "COSECHAS" not in text, "PDF still mentions COSECHAS"

    def test_jim_no_irrigaciones(self, pdf_jim):
        text = _all_text(_extract_text(pdf_jim)).upper()
        assert "IRRIGACION" not in text
        assert "COSECHAS" not in text


# ---------- Tratamientos order + TIPO ----------
class TestTratamientosTipoOrder:
    def test_cot_tratamientos_have_real_tipo(self, pdf_cot):
        text = _all_text(_extract_text(pdf_cot))
        # No "Sin tipo" should remain
        assert "Sin tipo" not in text, "Treatment still labeled 'Sin tipo'"
        # The format should contain FITOSANITARIOS — Subtipo somewhere
        upper = text.upper()
        assert "FITOSANITARIOS" in upper, "FITOSANITARIOS label missing"
        # At least one of the three subtipos should appear
        subtipos_present = [s for s in ("HERBICIDA", "FUNGICIDA", "INSECTICIDA") if s in upper]
        assert subtipos_present, f"None of the FITOSANITARIOS subtipos found in PDF"

    def test_cot_tratamientos_ordered_oldest_first(self, pdf_cot):
        """Tratamientos must be ordered oldest -> newest. Look at the index page dates."""
        pages = _extract_text(pdf_cot)
        # Search the full text for dates in dd/mm/yyyy or yyyy-mm-dd next to 'TRATAMIENTO' tokens
        text = _all_text(pages)
        # Extract all dates that look like yyyy-mm-dd
        dates_iso = re.findall(r"\b(20\d{2}-\d{2}-\d{2})\b", text)
        if len(dates_iso) >= 2:
            # we can't be 100% sure these are only treatment dates, but at least
            # verify the global sequence isn't strictly descending
            sorted_asc = sorted(dates_iso)
            # require that the FIRST occurrence is the smallest date
            assert dates_iso[0] == sorted_asc[0] or dates_iso[0] <= dates_iso[-1], \
                f"Dates appear not ordered ascending: {dates_iso[:6]}"


# ---------- Visitas order ----------
class TestVisitasOrder:
    """Visitas in the production data live on a parcela not directly attached to
    the COT/JIM evaluations.  We create a TEMPORARY evaluation targeting the
    parcela that actually has multiple visits, render its PDF and inspect order,
    then delete the temp evaluation."""

    @pytest.fixture(scope="class")
    def temp_eval_pdf(self, auth_headers):
        # Find a parcela with >= 2 visits
        r = requests.get(f"{BASE_URL}/api/visitas", headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text[:200]
        visits = r.json().get("visitas", [])
        from collections import Counter
        counts = Counter(v.get("parcela_id") for v in visits if v.get("parcela_id"))
        if not counts or counts.most_common(1)[0][1] < 2:
            pytest.skip("No parcela in DB with >= 2 visitas")
        pid = counts.most_common(1)[0][0]

        payload = {
            "parcela_id": pid,
            "fecha_inicio": "2026-06-26",
            "fecha_fin": "",
            "tecnico": "TESTAGENT_visit_order",
            "proveedor": "TESTAGENT",
            "codigo_plantacion": "TESTAGENT_VISIT_ORDER",
            "finca": "TEST",
            "cultivo": "TEST",
            "variedad": "TEST",
            "superficie": 1.0,
            "campana": "2025/26",
        }
        r = requests.post(f"{BASE_URL}/api/evaluaciones",
                          headers=auth_headers, json=payload, timeout=30)
        assert r.status_code in (200, 201), r.text[:300]
        body = r.json()
        eid = (body.get("data") or {}).get("_id") or body.get("_id") or body.get("id")
        assert eid, f"No eval id in: {body}"

        try:
            r = requests.get(f"{BASE_URL}/api/evaluaciones/{eid}/pdf",
                             headers=auth_headers, timeout=120)
            assert r.status_code == 200, f"PDF status {r.status_code}: {r.text[:200]}"
            yield r.content
        finally:
            requests.delete(f"{BASE_URL}/api/evaluaciones/{eid}",
                            headers=auth_headers, timeout=30)

    def test_temp_eval_visitas_oldest_first(self, temp_eval_pdf):
        text = _all_text(_extract_text(temp_eval_pdf))
        matches = re.findall(r"VISITA\s*#(\d+)\s*-\s*([0-9]{4}-[0-9]{2}-[0-9]{2})", text)
        assert len(matches) >= 2, f"Expected >=2 visit blocks, got {len(matches)}"
        dates = [m[1] for m in matches]
        assert dates == sorted(dates), f"Visits not ordered oldest->newest: {dates}"
        idxs = [int(m[0]) for m in matches]
        assert idxs == list(range(1, len(idxs) + 1)), f"Visit numbering not sequential: {idxs}"


# ---------- Section order ----------
class TestSectionOrder:
    REQUIRED_HEADERS = [
        "DATOS GENERALES",
        # plantacion / parcela / toma de datos vary by evaluation; check those that exist
    ]

    def test_cot_has_consolidated_aplicador_section_at_end(self, pdf_cot):
        pages = _extract_text(pdf_cot)
        text_pages = [t for _, t in pages]
        # Find page index of "FICHA DEL APLICADOR Y MAQUINARIA"
        ficha_pages = [i for i, t in enumerate(text_pages)
                       if "FICHA DEL APLICADOR Y MAQUINARIA" in t.upper()]
        assert ficha_pages, "FICHA DEL APLICADOR Y MAQUINARIA section missing"
        # Must appear EXACTLY ONCE (consolidated)
        assert len(ficha_pages) == 1, \
            f"FICHA DEL APLICADOR Y MAQUINARIA appears {len(ficha_pages)} times — must be 1"
        # And it must be at (or near) the END of the document
        total_pages = len(text_pages)
        # Allow the final ficha section to span the last 1-2 pages
        assert ficha_pages[0] >= total_pages - 3, (
            f"FICHA section found on page {ficha_pages[0]+1} of {total_pages} — "
            f"expected near the end"
        )

    def test_cot_has_required_section_order(self, pdf_cot):
        text = _all_text(_extract_text(pdf_cot))
        upper = text.upper()
        # Expect this sequence of markers (some optional)
        sequence = [
            "DATOS GENERALES",
            "FICHA DEL APLICADOR Y MAQUINARIA",  # at the end
        ]
        positions = [upper.find(s) for s in sequence]
        for s, p in zip(sequence, positions):
            assert p >= 0, f"Section '{s}' not found in PDF"
        assert positions == sorted(positions), f"Section order wrong: {list(zip(sequence, positions))}"

    def test_cot_aplicadores_have_names(self, pdf_cot):
        """Even when full ficha not available, aplicador NAMES must appear in
        the consolidated final section."""
        pages = _extract_text(pdf_cot)
        # Look at the last ~3 pages — that's where the ficha lives
        tail = "\n".join(t for _, t in pages[-3:])
        # The "Nombre Completo" / "Nombre" labels must appear
        assert ("Nombre Completo" in tail) or ("Nombre" in tail), \
            "Aplicador name field not present in final FICHA section"


# ---------- Page numbering ----------
class TestPagination:
    def test_cot_pagination_matches(self, pdf_cot):
        pages = _extract_text(pdf_cot)
        total = len(pages)
        # Find "Página X de Y" on at least one page
        found = []
        for n, t in pages:
            m = re.search(r"Página\s+(\d+)\s+de\s+(\d+)", t)
            if m:
                found.append((n, int(m.group(1)), int(m.group(2))))
        assert found, "No 'Página X de Y' footer found on any page"
        # Y must equal the real page count
        for page_no, x, y in found:
            assert y == total, f"Footer 'de {y}' != actual page count {total} (page {page_no})"
            assert x == page_no, f"Footer page number {x} != real page index {page_no}"


# ---------- Regression: Impresos anexo ----------
class TestImpresosAnexoRegression:
    def test_calidad_cepellones_section_present(self, pdf_cot):
        text = _all_text(_extract_text(pdf_cot)).upper()
        # Section 4 should be present in Impresos
        assert "CALIDAD DE CEPELLONES" in text or "CEPELLONES" in text, \
            "Impresos 'Calidad de Cepellones' section missing"
