"""
Tests for the Vaso/Impresos cabecera save bug fix (iteration 72).
Validates:
  1. Eval 6a3e4b01... is correctly linked to existing COT parcela 6a3e90f7...
  2. Cabecera fields are populated (proveedor, finca, cultivo, etc.)
  3. PUT updating impresos.calibracion_aparatos.vaso persists and does NOT
     wipe other impresos fields or top-level cabecera fields
  4. PDF generation succeeds and is > 50KB
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "admin@fruveco.com")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "admin123")
EVAL_ID = "6a3e4b01e223c5dd1673c04c"
EXPECTED_PARCELA_ID = "6a3e90f77b8cf2eb0d697bc1"


@pytest.fixture(scope="module")
def token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture
def original_evaluation(auth):
    r = requests.get(f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=auth, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


# 1) Eval is linked to existing COT parcela ---------------------------------
class TestEvalRelinked:
    def test_parcela_id_points_to_existing_cot_parcela(self, original_evaluation):
        assert original_evaluation.get("parcela_id") == EXPECTED_PARCELA_ID

    def test_cabecera_top_level_fields_present(self, original_evaluation):
        assert original_evaluation.get("codigo_plantacion") == "COT-GUI-25-001"
        assert original_evaluation.get("proveedor") == "COTO DE MINGUILLO, S.L."
        assert original_evaluation.get("finca") == "Cinco Casas"
        assert original_evaluation.get("cultivo") == "GUISANTE VERDE"
        assert float(original_evaluation.get("superficie") or 0) == 13.0

    def test_referenced_parcela_exists_with_variedad(self, auth):
        r = requests.get(
            f"{BASE_URL}/api/parcelas/{EXPECTED_PARCELA_ID}", headers=auth, timeout=15
        )
        assert r.status_code == 200, r.text
        p = r.json()
        assert p.get("codigo_plantacion") == "COT-GUI-25-001"
        assert p.get("variedad") == "MUCIO"


# 2) PUT vaso → persists + cabecera not wiped -------------------------------
class TestImpresosVasoSavePreservesCabecera:
    NEW_VASO = "VASO_FIX_2026_TESTAGENT"

    def test_update_vaso_and_verify_persistence(self, auth, original_evaluation):
        payload = dict(original_evaluation)
        # Frontend writes to impresos.calibracion (data-testid impresos-calibracion-vaso)
        impresos = dict(payload.get("impresos") or {})
        cal = dict(impresos.get("calibracion") or {})
        original_vaso = cal.get("vaso")
        cal["vaso"] = self.NEW_VASO
        impresos["calibracion"] = cal
        # Strip any stray calibracion_aparatos key created by earlier runs
        impresos.pop("calibracion_aparatos", None)
        payload["impresos"] = impresos

        # Drop forbidden update fields
        for k in ("_id", "id", "created_at", "updated_at"):
            payload.pop(k, None)

        r = requests.put(
            f"{BASE_URL}/api/evaluaciones/{EVAL_ID}",
            headers=auth,
            json=payload,
            timeout=20,
        )
        assert r.status_code == 200, r.text

        # GET to verify persistence
        g = requests.get(
            f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=auth, timeout=15
        )
        assert g.status_code == 200
        d = g.json()
        assert ((d.get("impresos") or {}).get("calibracion") or {}).get(
            "vaso"
        ) == self.NEW_VASO

        # Cabecera top-level fields must still be populated
        assert d.get("codigo_plantacion") == "COT-GUI-25-001"
        assert d.get("proveedor") == "COTO DE MINGUILLO, S.L."
        assert d.get("finca") == "Cinco Casas"
        assert d.get("cultivo") == "GUISANTE VERDE"
        assert float(d.get("superficie") or 0) == 13.0
        assert d.get("parcela_id") == EXPECTED_PARCELA_ID

        # Restore previous vaso value to keep the eval clean
        d2 = dict(d)
        for k in ("_id", "id", "created_at", "updated_at"):
            d2.pop(k, None)
        imp2 = dict(d2.get("impresos") or {})
        cal2 = dict(imp2.get("calibracion") or {})
        cal2["vaso"] = original_vaso
        imp2["calibracion"] = cal2
        d2["impresos"] = imp2
        requests.put(
            f"{BASE_URL}/api/evaluaciones/{EVAL_ID}",
            headers=auth,
            json=d2,
            timeout=20,
        )


# 3) Regression: changing comentario / sintoma persists & cabecera intact ----
class TestRegressionImpresosOtherFields:
    def test_update_comentarios_general_preserves_everything(self, auth):
        g = requests.get(
            f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=auth, timeout=15
        )
        d = g.json()
        impresos = dict(d.get("impresos") or {})
        original_obs = impresos.get("observaciones_generales")
        marker = "TEST_AGENT_OBS_2026"
        impresos["observaciones_generales"] = marker
        d["impresos"] = impresos
        for k in ("_id", "id", "created_at", "updated_at"):
            d.pop(k, None)
        r = requests.put(
            f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=auth, json=d, timeout=20
        )
        assert r.status_code == 200, r.text

        g2 = requests.get(
            f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=auth, timeout=15
        ).json()
        assert (g2.get("impresos") or {}).get("observaciones_generales") == marker
        # Cabecera intact
        assert g2.get("codigo_plantacion") == "COT-GUI-25-001"
        assert g2.get("proveedor") == "COTO DE MINGUILLO, S.L."

        # Restore
        d2 = dict(g2)
        for k in ("_id", "id", "created_at", "updated_at"):
            d2.pop(k, None)
        imp = dict(d2.get("impresos") or {})
        imp["observaciones_generales"] = original_obs
        d2["impresos"] = imp
        requests.put(
            f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=auth, json=d2, timeout=20
        )


# 4) PDF generation ----------------------------------------------------------
class TestPdfGenerationContainsCabeceraAndVaso:
    NEW_VASO = "VASO_FIX_2026_PDFAGENT"

    def test_pdf_renders_with_vaso_and_cabecera(self, auth):
        # First set a recognisable vaso value
        g = requests.get(
            f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=auth, timeout=15
        ).json()
        original_vaso = ((g.get("impresos") or {}).get("calibracion") or {}).get("vaso")
        imp = dict(g.get("impresos") or {})
        cal = dict(imp.get("calibracion") or {})
        cal["vaso"] = self.NEW_VASO
        imp["calibracion"] = cal
        imp.pop("calibracion_aparatos", None)
        g["impresos"] = imp
        for k in ("_id", "id", "created_at", "updated_at"):
            g.pop(k, None)
        requests.put(
            f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=auth, json=g, timeout=20
        )

        # Now download the PDF
        h = {"Authorization": auth["Authorization"]}
        r = requests.get(
            f"{BASE_URL}/api/evaluaciones/{EVAL_ID}/pdf", headers=h, timeout=60
        )
        assert r.status_code == 200, r.text[:500]
        assert r.content[:4] == b"%PDF", "Response is not a PDF"
        size = len(r.content)
        assert size > 50_000, f"PDF too small: {size} bytes"

        out = "/tmp/eval_cot_pdf.pdf"
        with open(out, "wb") as f:
            f.write(r.content)

        # Try a text extraction to verify content
        try:
            from pypdf import PdfReader
            text = "\n".join(p.extract_text() or "" for p in PdfReader(out).pages)
        except Exception:
            import subprocess
            text = subprocess.run(
                ["pdftotext", out, "-"], capture_output=True, text=True
            ).stdout

        # Cabecera tokens
        for token in [
            "COT-GUI-25-001",
            "COTO DE MINGUILLO",
            "Cinco Casas",
            "GUISANTE VERDE",
            "MUCIO",
        ]:
            assert token in text, f"PDF missing cabecera token '{token}'. PDF saved at {out}"

        # Vaso value
        assert self.NEW_VASO in text, f"PDF missing latest vaso value. PDF saved at {out}"

        # Restore vaso
        g2 = requests.get(
            f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=auth, timeout=15
        ).json()
        imp = dict(g2.get("impresos") or {})
        cal = dict(imp.get("calibracion") or {})
        cal["vaso"] = original_vaso
        imp["calibracion"] = cal
        imp.pop("calibracion_aparatos", None)
        g2["impresos"] = imp
        for k in ("_id", "id", "created_at", "updated_at"):
            g2.pop(k, None)
        requests.put(
            f"{BASE_URL}/api/evaluaciones/{EVAL_ID}", headers=auth, json=g2, timeout=20
        )
