"""
Test suite for Export endpoints (PDF/Excel) and AI features
Tests: Cosechas, Recetas, Tareas exports + AI treatment suggestions, yield predictions, contract summaries
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@fruveco.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


# ============================================================================
# COSECHAS EXPORT TESTS
# ============================================================================

class TestCosechasExport:
    """Tests for Cosechas PDF and Excel export endpoints"""
    
    def test_cosechas_export_pdf_returns_200(self, api_client):
        """Test GET /api/cosechas/export/pdf returns PDF file"""
        response = api_client.get(f"{BASE_URL}/api/cosechas/export/pdf")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is PDF
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected PDF content type, got: {content_type}"
        
        # Verify content disposition header
        content_disp = response.headers.get('Content-Disposition', '')
        assert 'attachment' in content_disp or 'filename' in content_disp, f"Missing filename in Content-Disposition: {content_disp}"
        
        # Verify we got actual content
        assert len(response.content) > 0, "PDF content is empty"
        print(f"Cosechas PDF export: {len(response.content)} bytes")
    
    def test_cosechas_export_pdf_with_filters(self, api_client):
        """Test GET /api/cosechas/export/pdf with query filters"""
        response = api_client.get(f"{BASE_URL}/api/cosechas/export/pdf?campana=2024-2025")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert 'application/pdf' in response.headers.get('Content-Type', '')
        print(f"Cosechas PDF export with filter: {len(response.content)} bytes")
    
    def test_cosechas_export_excel_returns_200(self, api_client):
        """Test GET /api/cosechas/export/excel returns JSON data for Excel"""
        response = api_client.get(f"{BASE_URL}/api/cosechas/export/excel")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "data" in data, "Response missing 'data' field"
        assert "columns" in data, "Response missing 'columns' field"
        assert "total_rows" in data, "Response missing 'total_rows' field"
        assert "filename" in data, "Response missing 'filename' field"
        
        print(f"Cosechas Excel export: {data['total_rows']} rows, {len(data['columns'])} columns")


# ============================================================================
# RECETAS EXPORT TESTS
# ============================================================================

class TestRecetasExport:
    """Tests for Recetas PDF and Excel export endpoints"""
    
    def test_recetas_export_pdf_returns_200(self, api_client):
        """Test GET /api/recetas/export/pdf returns PDF file"""
        response = api_client.get(f"{BASE_URL}/api/recetas/export/pdf")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected PDF content type, got: {content_type}"
        
        assert len(response.content) > 0, "PDF content is empty"
        print(f"Recetas PDF export: {len(response.content)} bytes")
    
    def test_recetas_export_excel_returns_200(self, api_client):
        """Test GET /api/recetas/export/excel returns Excel file"""
        response = api_client.get(f"{BASE_URL}/api/recetas/export/excel")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type.lower(), f"Expected Excel content type, got: {content_type}"
        
        assert len(response.content) > 0, "Excel content is empty"
        print(f"Recetas Excel export: {len(response.content)} bytes")


# ============================================================================
# TAREAS EXPORT TESTS
# ============================================================================

class TestTareasExport:
    """Tests for Tareas PDF and Excel export endpoints"""
    
    def test_tareas_export_pdf_returns_200(self, api_client):
        """Test GET /api/tareas/export/pdf returns PDF file"""
        response = api_client.get(f"{BASE_URL}/api/tareas/export/pdf")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        content_type = response.headers.get('Content-Type', '')
        assert 'application/pdf' in content_type, f"Expected PDF content type, got: {content_type}"
        
        assert len(response.content) > 0, "PDF content is empty"
        print(f"Tareas PDF export: {len(response.content)} bytes")
    
    def test_tareas_export_pdf_with_filters(self, api_client):
        """Test GET /api/tareas/export/pdf with query filters"""
        response = api_client.get(f"{BASE_URL}/api/tareas/export/pdf?estado=pendiente")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert 'application/pdf' in response.headers.get('Content-Type', '')
        print(f"Tareas PDF export with filter: {len(response.content)} bytes")
    
    def test_tareas_export_excel_returns_200(self, api_client):
        """Test GET /api/tareas/export/excel returns Excel file"""
        response = api_client.get(f"{BASE_URL}/api/tareas/export/excel")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        content_type = response.headers.get('Content-Type', '')
        assert 'spreadsheet' in content_type or 'excel' in content_type.lower(), f"Expected Excel content type, got: {content_type}"
        
        assert len(response.content) > 0, "Excel content is empty"
        print(f"Tareas Excel export: {len(response.content)} bytes")


# ============================================================================
# AI ENDPOINTS - LIST DATA
# ============================================================================

class TestAIListEndpoints:
    """Tests for AI helper endpoints that list parcelas and contratos"""
    
    def test_ai_parcelas_list_returns_200(self, api_client):
        """Test GET /api/ai/parcelas-for-suggestions returns parcelas list"""
        response = api_client.get(f"{BASE_URL}/api/ai/parcelas-for-suggestions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "parcelas" in data, "Response missing 'parcelas' field"
        assert isinstance(data["parcelas"], list), "parcelas should be a list"
        
        if len(data["parcelas"]) > 0:
            parcela = data["parcelas"][0]
            assert "_id" in parcela, "Parcela missing _id"
            assert "codigo_plantacion" in parcela, "Parcela missing codigo_plantacion"
            assert "cultivo" in parcela, "Parcela missing cultivo"
        
        print(f"AI Parcelas list: {len(data['parcelas'])} parcelas available")
    
    def test_ai_contratos_list_returns_200(self, api_client):
        """Test GET /api/ai/contratos-for-predictions returns contratos list"""
        response = api_client.get(f"{BASE_URL}/api/ai/contratos-for-predictions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "contratos" in data, "Response missing 'contratos' field"
        assert isinstance(data["contratos"], list), "contratos should be a list"
        
        if len(data["contratos"]) > 0:
            contrato = data["contratos"][0]
            assert "_id" in contrato, "Contrato missing _id"
            assert "proveedor" in contrato, "Contrato missing proveedor"
            assert "cultivo" in contrato, "Contrato missing cultivo"
        
        print(f"AI Contratos list: {len(data['contratos'])} contratos available")


# ============================================================================
# AI TREATMENT SUGGESTIONS
# ============================================================================

class TestAITreatmentSuggestions:
    """Tests for AI treatment suggestions endpoint"""
    
    @pytest.fixture
    def parcela_id(self, api_client):
        """Get a valid parcela ID for testing"""
        response = api_client.get(f"{BASE_URL}/api/ai/parcelas-for-suggestions")
        if response.status_code == 200:
            data = response.json()
            if data.get("parcelas") and len(data["parcelas"]) > 0:
                return data["parcelas"][0]["_id"]
        pytest.skip("No parcelas available for AI testing")
    
    def test_ai_suggest_treatments_returns_200(self, api_client, parcela_id):
        """Test POST /api/ai/suggest-treatments/{parcela_id} returns suggestions"""
        # AI endpoints may take 5-15 seconds
        response = api_client.post(
            f"{BASE_URL}/api/ai/suggest-treatments/{parcela_id}?problema=plagas&cultivo=limon",
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got: {data}"
        assert "suggestions" in data, "Response missing 'suggestions' field"
        assert "metadata" in data, "Response missing 'metadata' field"
        
        # Verify suggestions structure
        suggestions = data["suggestions"]
        assert "problema_identificado" in suggestions, "Missing problema_identificado"
        assert "severidad_estimada" in suggestions, "Missing severidad_estimada"
        assert "sugerencias" in suggestions, "Missing sugerencias list"
        
        print(f"AI Treatment suggestions: {len(suggestions.get('sugerencias', []))} suggestions generated")
        print(f"Generation time: {data['metadata'].get('generation_time_seconds')}s")
    
    def test_ai_suggest_treatments_invalid_parcela(self, api_client):
        """Test POST /api/ai/suggest-treatments with invalid parcela_id"""
        response = api_client.post(
            f"{BASE_URL}/api/ai/suggest-treatments/invalid_id?problema=test",
            timeout=10
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid ID, got {response.status_code}"


# ============================================================================
# AI YIELD PREDICTION
# ============================================================================

class TestAIYieldPrediction:
    """Tests for AI yield prediction endpoint"""
    
    @pytest.fixture
    def contrato_id(self, api_client):
        """Get a valid contrato ID for testing"""
        response = api_client.get(f"{BASE_URL}/api/ai/contratos-for-predictions")
        if response.status_code == 200:
            data = response.json()
            if data.get("contratos") and len(data["contratos"]) > 0:
                return data["contratos"][0]["_id"]
        pytest.skip("No contratos available for AI testing")
    
    def test_ai_predict_yield_returns_200(self, api_client, contrato_id):
        """Test POST /api/ai/predict-yield/{contrato_id} returns prediction"""
        # AI endpoints may take 5-15 seconds
        response = api_client.post(
            f"{BASE_URL}/api/ai/predict-yield/{contrato_id}",
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got: {data}"
        assert "prediction" in data, "Response missing 'prediction' field"
        assert "metadata" in data, "Response missing 'metadata' field"
        
        # Verify prediction structure
        prediction = data["prediction"]
        assert "prediccion_rendimiento" in prediction, "Missing prediccion_rendimiento"
        assert "factores_positivos" in prediction, "Missing factores_positivos"
        assert "factores_riesgo" in prediction, "Missing factores_riesgo"
        
        print(f"AI Yield prediction generated")
        print(f"Generation time: {data['metadata'].get('generation_time_seconds')}s")
    
    def test_ai_predict_yield_invalid_contrato(self, api_client):
        """Test POST /api/ai/predict-yield with invalid contrato_id"""
        response = api_client.post(
            f"{BASE_URL}/api/ai/predict-yield/invalid_id",
            timeout=10
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid ID, got {response.status_code}"


# ============================================================================
# AI CONTRACT SUMMARY (NEW FEATURE)
# ============================================================================

class TestAIContractSummary:
    """Tests for AI contract summary endpoint - NEW FEATURE"""
    
    @pytest.fixture
    def contrato_id(self, api_client):
        """Get a valid contrato ID for testing"""
        response = api_client.get(f"{BASE_URL}/api/ai/contratos-for-predictions")
        if response.status_code == 200:
            data = response.json()
            if data.get("contratos") and len(data["contratos"]) > 0:
                return data["contratos"][0]["_id"]
        pytest.skip("No contratos available for AI testing")
    
    def test_ai_summarize_contract_returns_200(self, api_client, contrato_id):
        """Test POST /api/ai/summarize-contract/{contrato_id} returns summary"""
        # AI endpoints may take 5-15 seconds
        response = api_client.post(
            f"{BASE_URL}/api/ai/summarize-contract/{contrato_id}",
            timeout=30
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got: {data}"
        assert "summary" in data, "Response missing 'summary' field"
        assert "metadata" in data, "Response missing 'metadata' field"
        
        # Verify summary structure
        summary = data["summary"]
        assert "titulo" in summary, "Missing titulo"
        assert "resumen_ejecutivo" in summary, "Missing resumen_ejecutivo"
        assert "datos_clave" in summary, "Missing datos_clave"
        assert "estado_cumplimiento" in summary, "Missing estado_cumplimiento"
        assert "analisis_financiero" in summary, "Missing analisis_financiero"
        assert "puntos_fuertes" in summary, "Missing puntos_fuertes"
        assert "riesgos" in summary, "Missing riesgos"
        assert "recomendaciones" in summary, "Missing recomendaciones"
        
        print(f"AI Contract summary generated: {summary.get('titulo')}")
        print(f"Generation time: {data['metadata'].get('generation_time_seconds')}s")
    
    def test_ai_summarize_contract_invalid_id(self, api_client):
        """Test POST /api/ai/summarize-contract with invalid contrato_id"""
        response = api_client.post(
            f"{BASE_URL}/api/ai/summarize-contract/invalid_id",
            timeout=10
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid ID, got {response.status_code}"
    
    def test_ai_summarize_contract_not_found(self, api_client):
        """Test POST /api/ai/summarize-contract with non-existent contrato_id"""
        # Valid ObjectId format but doesn't exist
        response = api_client.post(
            f"{BASE_URL}/api/ai/summarize-contract/507f1f77bcf86cd799439011",
            timeout=10
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent ID, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
