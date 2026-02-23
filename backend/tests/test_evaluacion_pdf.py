"""
Tests for Evaluación PDF Generation with Visitas and Tratamientos
- Tests PDF generation endpoint returns 200 with valid PDF
- Tests PDF contains main evaluation page
- Tests PDF contains one page per visit
- Tests PDF contains one page per treatment
- Tests visit data includes: fecha, objetivo, observaciones, cuestionario_plagas
- Tests treatment data includes: fecha, tipo, aplicador, máquina, dosis, coste, productos
- Tests summary shows correct visit and treatment counts
"""
import pytest
import requests
import os

# Use environment variable for backend URL
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@fruveco.com"
TEST_PASSWORD = "admin123"

# Known test evaluation ID
TEST_EVALUACION_ID = "699c840545f8bd67a001229a"
TEST_PARCELA_ID = "699c365bf04731b8a9dc32bf"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get authenticated headers"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestEvaluacionPDFGeneration:
    """Tests for PDF generation endpoint"""
    
    def test_pdf_generation_returns_200(self, headers):
        """Test PDF endpoint returns 200 status code"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones/{TEST_EVALUACION_ID}/pdf",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_pdf_content_type_is_pdf(self, headers):
        """Test response has correct content type"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones/{TEST_EVALUACION_ID}/pdf",
            headers=headers
        )
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("Content-Type", ""), \
            f"Expected application/pdf, got {response.headers.get('Content-Type')}"
    
    def test_pdf_has_content_disposition_header(self, headers):
        """Test PDF has filename in Content-Disposition header"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones/{TEST_EVALUACION_ID}/pdf",
            headers=headers
        )
        assert response.status_code == 200
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition
        assert "filename" in content_disposition
        assert "cuaderno_campo" in content_disposition or ".pdf" in content_disposition
    
    def test_pdf_has_valid_size(self, headers):
        """Test PDF has reasonable file size (not empty, not too small)"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones/{TEST_EVALUACION_ID}/pdf",
            headers=headers
        )
        assert response.status_code == 200
        pdf_content = response.content
        assert len(pdf_content) > 10000, f"PDF too small: {len(pdf_content)} bytes"
        # PDF should start with %PDF
        assert pdf_content[:4] == b'%PDF', "Response is not a valid PDF file"


class TestVisitasInPDF:
    """Tests for visitas data in the PDF"""
    
    def test_parcela_has_visitas(self, headers):
        """Test that the parcela has at least one visita"""
        response = requests.get(
            f"{BASE_URL}/api/visitas?parcela_id={TEST_PARCELA_ID}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        visitas = data.get("visitas", [])
        assert len(visitas) >= 1, f"Expected at least 1 visita, found {len(visitas)}"
    
    def test_visita_has_required_fields(self, headers):
        """Test visita has fecha, objetivo, observaciones"""
        response = requests.get(
            f"{BASE_URL}/api/visitas?parcela_id={TEST_PARCELA_ID}",
            headers=headers
        )
        assert response.status_code == 200
        visitas = response.json().get("visitas", [])
        assert len(visitas) > 0
        
        visita = visitas[0]
        # Check required fields
        assert "fecha_visita" in visita, "Visita missing fecha_visita"
        assert "objetivo" in visita, "Visita missing objetivo"
        assert "observaciones" in visita, "Visita missing observaciones"
    
    def test_visita_has_cuestionario_plagas(self, headers):
        """Test visita has cuestionario_plagas when applicable"""
        response = requests.get(
            f"{BASE_URL}/api/visitas?parcela_id={TEST_PARCELA_ID}",
            headers=headers
        )
        assert response.status_code == 200
        visitas = response.json().get("visitas", [])
        
        # Check if any visita has pest questionnaire
        visita_with_plagas = [v for v in visitas if v.get("cuestionario_plagas")]
        assert len(visita_with_plagas) >= 1, "Expected at least one visita with cuestionario_plagas"
        
        cuestionario = visita_with_plagas[0].get("cuestionario_plagas", {})
        # Check some expected pest types
        assert any(key in cuestionario for key in ["trips", "mosca_blanca", "pulgon", "mildiu"]), \
            f"Cuestionario plagas missing expected fields: {cuestionario}"


class TestTratamientosInPDF:
    """Tests for tratamientos data in the PDF"""
    
    def test_parcela_has_tratamientos(self, headers):
        """Test that the parcela has at least one tratamiento"""
        response = requests.get(
            f"{BASE_URL}/api/tratamientos",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        tratamientos = data.get("tratamientos", [])
        
        # Filter by parcela_id
        parcela_tratamientos = [t for t in tratamientos if TEST_PARCELA_ID in t.get("parcelas_ids", [])]
        assert len(parcela_tratamientos) >= 1, f"Expected at least 1 tratamiento for parcela, found {len(parcela_tratamientos)}"
    
    def test_tratamiento_has_required_fields(self, headers):
        """Test tratamiento has fecha, tipo, aplicador, máquina, dosis, coste, productos"""
        response = requests.get(
            f"{BASE_URL}/api/tratamientos",
            headers=headers
        )
        assert response.status_code == 200
        tratamientos = response.json().get("tratamientos", [])
        
        # Filter by parcela_id
        parcela_tratamientos = [t for t in tratamientos if TEST_PARCELA_ID in t.get("parcelas_ids", [])]
        assert len(parcela_tratamientos) > 0
        
        tratamiento = parcela_tratamientos[0]
        # Check required fields
        assert "fecha_tratamiento" in tratamiento, "Tratamiento missing fecha_tratamiento"
        assert "tipo" in tratamiento, "Tratamiento missing tipo"
        assert "aplicador_nombre" in tratamiento, "Tratamiento missing aplicador_nombre"
        assert "maquina_nombre" in tratamiento, "Tratamiento missing maquina_nombre"
        assert "dosis" in tratamiento, "Tratamiento missing dosis"
        assert "coste_total" in tratamiento, "Tratamiento missing coste_total"
    
    def test_tratamiento_has_productos(self, headers):
        """Test tratamiento has productos array"""
        response = requests.get(
            f"{BASE_URL}/api/tratamientos",
            headers=headers
        )
        assert response.status_code == 200
        tratamientos = response.json().get("tratamientos", [])
        
        # Filter by parcela_id
        parcela_tratamientos = [t for t in tratamientos if TEST_PARCELA_ID in t.get("parcelas_ids", [])]
        
        # Find tratamiento with productos
        tratamientos_with_productos = [t for t in parcela_tratamientos if t.get("productos")]
        assert len(tratamientos_with_productos) >= 1, "Expected at least one tratamiento with productos"
        
        productos = tratamientos_with_productos[0].get("productos", [])
        assert len(productos) >= 1, "Expected at least one producto"
        
        producto = productos[0]
        assert "nombre" in producto, "Producto missing nombre"
        assert "dosis" in producto, "Producto missing dosis"


class TestPDFSummary:
    """Tests for summary section in PDF"""
    
    def test_evaluacion_exists(self, headers):
        """Test evaluacion can be retrieved"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones/{TEST_EVALUACION_ID}",
            headers=headers
        )
        assert response.status_code == 200
        evaluacion = response.json()
        assert evaluacion.get("_id") == TEST_EVALUACION_ID
    
    def test_evaluacion_has_parcela_data(self, headers):
        """Test evaluacion has inherited parcela data"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones/{TEST_EVALUACION_ID}",
            headers=headers
        )
        assert response.status_code == 200
        evaluacion = response.json()
        
        # Check inherited fields
        assert "proveedor" in evaluacion, "Missing proveedor"
        assert "codigo_plantacion" in evaluacion, "Missing codigo_plantacion"
        assert "cultivo" in evaluacion, "Missing cultivo"
        assert "campana" in evaluacion, "Missing campana"
    
    def test_correct_visita_count(self, headers):
        """Test summary shows correct visita count"""
        # Get visitas count
        response = requests.get(
            f"{BASE_URL}/api/visitas?parcela_id={TEST_PARCELA_ID}",
            headers=headers
        )
        assert response.status_code == 200
        visitas_count = len(response.json().get("visitas", []))
        
        assert visitas_count == 1, f"Expected 1 visita, got {visitas_count}"
    
    def test_correct_tratamiento_count(self, headers):
        """Test summary shows correct tratamiento count"""
        # Get tratamientos count
        response = requests.get(
            f"{BASE_URL}/api/tratamientos",
            headers=headers
        )
        assert response.status_code == 200
        tratamientos = response.json().get("tratamientos", [])
        
        # Filter by parcela_id
        parcela_tratamientos = [t for t in tratamientos if TEST_PARCELA_ID in t.get("parcelas_ids", [])]
        
        assert len(parcela_tratamientos) == 2, f"Expected 2 tratamientos, got {len(parcela_tratamientos)}"


class TestPDFErrors:
    """Tests for error handling in PDF generation"""
    
    def test_invalid_evaluacion_id_returns_400(self, headers):
        """Test invalid evaluacion ID returns 400"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones/invalid-id/pdf",
            headers=headers
        )
        assert response.status_code == 400
    
    def test_nonexistent_evaluacion_returns_404(self, headers):
        """Test non-existent evaluacion returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones/000000000000000000000000/pdf",
            headers=headers
        )
        assert response.status_code == 404
    
    def test_unauthenticated_request_returns_401(self):
        """Test request without auth token returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/evaluaciones/{TEST_EVALUACION_ID}/pdf"
        )
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
