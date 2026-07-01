"""
Backend tests for the "Índice clicable" feature (iteration 83).

Verifies that the Cuaderno de Campo PDF generated at
GET /api/evaluaciones/{id}/pdf contains internal PDF navigation links from
the index page(s) to the actual Visita and Tratamiento sections:

  - HTML side:  the pre-render HTML has <a href="#visita-N"> in the index
                and <div class="page-break" id="visita-N"> at the target.
  - PDF side:   PyMuPDF `page.get_links()` reports at least one internal
                link whose target lies on a later page than the index link.
"""
import io
import os
import re

import pytest
import requests
import fitz  # PyMuPDF

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "admin@fruveco.com"
ADMIN_PASSWORD = "admin123"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text[:200]}")
    tok = r.json().get("access_token") or r.json().get("token")
    if not tok:
        pytest.skip("No auth token in response")
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def eval_with_visits_and_tratamientos(auth_headers):
    """Locate an evaluación that has both visitas and tratamientos.
    Falls back to any evaluación with tratamientos if none has both."""
    r = requests.get(f"{BASE_URL}/api/evaluaciones", headers=auth_headers, timeout=30)
    assert r.status_code == 200, r.text[:200]
    body = r.json()
    evals = body.get("evaluaciones") or body.get("data") or body if isinstance(body, list) else body.get("evaluaciones", [])
    if isinstance(body, dict) and "evaluaciones" in body:
        evals = body["evaluaciones"]
    elif isinstance(body, list):
        evals = body

    # For each evaluation, load its visitas + tratamientos to find one with both
    best = None
    fallback = None
    for e in evals[:40]:
        eid = e.get("_id") or e.get("id")
        if not eid:
            continue
        vr = requests.get(f"{BASE_URL}/api/evaluaciones/{eid}/visitas", headers=auth_headers, timeout=30)
        tr = requests.get(f"{BASE_URL}/api/evaluaciones/{eid}/tratamientos", headers=auth_headers, timeout=30)
        n_v = 0
        n_t = 0
        if vr.status_code == 200:
            vj = vr.json()
            n_v = len(vj.get("visitas") or vj if isinstance(vj, list) else vj.get("data", []))
        if tr.status_code == 200:
            tj = tr.json()
            n_t = len(tj.get("tratamientos") or tj if isinstance(tj, list) else tj.get("data", []))
        if n_v >= 1 and n_t >= 1:
            best = eid
            break
        if fallback is None and (n_v >= 1 or n_t >= 1):
            fallback = eid

    eid = best or fallback
    if not eid:
        # Try known-good ID from previous PDF test
        eid = "6a3e4b01e223c5dd1673c04c"
    return eid


@pytest.fixture(scope="module")
def pdf_bytes(auth_headers, eval_with_visits_and_tratamientos):
    r = requests.get(
        f"{BASE_URL}/api/evaluaciones/{eval_with_visits_and_tratamientos}/pdf",
        headers=auth_headers,
        timeout=180,
    )
    assert r.status_code == 200, f"PDF status {r.status_code}: {r.text[:200]}"
    assert r.content[:4] == b"%PDF", "Response is not a valid PDF"
    assert len(r.content) > 20_000, f"PDF too small: {len(r.content)} bytes"
    return r.content


# ---------------- Tests ----------------
class TestPDFDownload:
    def test_pdf_downloads_ok(self, pdf_bytes):
        assert pdf_bytes.startswith(b"%PDF")
        assert len(pdf_bytes) > 20_000


class TestPDFInternalLinks:
    """The PDF must contain at least one internal link (destination on a later
    page) — evidence that WeasyPrint converted the HTML anchors."""

    def test_pdf_has_internal_links(self, pdf_bytes):
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        total_internal = 0
        cross_page_internal = 0
        for pno in range(len(doc)):
            page = doc[pno]
            for link in page.get_links():
                # LINK_GOTO = internal, LINK_NAMED = internal named dest
                if link.get("kind") in (fitz.LINK_GOTO, fitz.LINK_NAMED):
                    total_internal += 1
                    tgt_page = link.get("page", -1)
                    if tgt_page > pno:
                        cross_page_internal += 1
        doc.close()
        assert total_internal > 0, "No internal links found in the PDF"
        assert cross_page_internal > 0, (
            f"Internal links exist ({total_internal}) but none navigate to a later "
            f"page — index links are not effectively clicable"
        )

    def test_pdf_page1_index_has_link_targets(self, pdf_bytes):
        """The FIRST page (índice) must contain the clickable link rectangles."""
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        links_page1 = [
            l for l in doc[0].get_links()
            if l.get("kind") in (fitz.LINK_GOTO, fitz.LINK_NAMED)
        ]
        doc.close()
        assert links_page1, "No internal links on the index (page 1)"


class TestHTMLStructure:
    """Introspect the routes_evaluaciones module to verify the HTML template
    contains both the anchor targets and the href references (regression
    against silent template edits)."""

    def test_source_contains_anchor_targets(self):
        path = "/app/backend/routes_evaluaciones.py"
        with open(path, encoding="utf-8") as f:
            src = f.read()
        assert 'id="visita-{idx}"' in src, "Anchor target id=visita-{idx} missing"
        assert 'id="tratamiento-{idx}"' in src, "Anchor target id=tratamiento-{idx} missing"

    def test_source_contains_href_references(self):
        path = "/app/backend/routes_evaluaciones.py"
        with open(path, encoding="utf-8") as f:
            src = f.read()
        assert 'href="#visita-{idx}"' in src, "Index href #visita-{idx} missing"
        assert 'href="#tratamiento-{idx}"' in src, "Index href #tratamiento-{idx} missing"

    def test_source_has_index_item_link_class(self):
        path = "/app/backend/routes_evaluaciones.py"
        with open(path, encoding="utf-8") as f:
            src = f.read()
        assert ".index-item-link" in src, "CSS class .index-item-link missing"
        assert "class=\"index-item-link\"" in src, "class=index-item-link not applied to anchors"


class TestBackwardsCompatIndex:
    """Verify the index still renders the same textual items (VISITA / TRATAMIENTO)
    — only the wrapping <a> tag is new."""

    def test_index_still_shows_visita_and_tratamiento_labels(self, pdf_bytes):
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text_page1 = doc[0].get_text() or ""
        # Also look at page 2 in case the index spans two pages
        text_page2 = doc[1].get_text() if len(doc) > 1 else ""
        doc.close()
        joined = (text_page1 + "\n" + text_page2).upper()
        has_visita = bool(re.search(r"VISITA\s*#?\s*\d", joined))
        has_tratam = bool(re.search(r"TRATAMIENTO\s*#?\s*\d", joined))
        assert has_visita or has_tratam, (
            "Neither VISITA nor TRATAMIENTO entries visible in the index pages"
        )
