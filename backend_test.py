import requests
import sys
import json
from datetime import datetime
import time

class AgriculturalAPITester:
    def __init__(self, base_url="https://agri-field-suite.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            print(f"   Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"   ✅ Passed")
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                print(f"   ❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"   ❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root(self):
        """Test root endpoint"""
        success, response = self.run_test(
            "Root Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_dashboard_kpis(self):
        """Test dashboard KPIs endpoint"""
        success, response = self.run_test(
            "Dashboard KPIs",
            "GET", 
            "api/dashboard/kpis",
            200
        )
        return success and "totales" in response

    def test_contratos_crud(self):
        """Test contratos CRUD operations"""
        print("\n📋 Testing Contratos CRUD...")
        
        # 1. Test GET empty list
        success, response = self.run_test(
            "Get Contratos (Empty)",
            "GET",
            "api/contratos",
            200
        )
        if not success:
            return False
        
        # 2. Test CREATE contrato
        contrato_data = {
            "campana": "2025/26",
            "procedencia": "Campo",
            "fecha_contrato": "2025-01-15",
            "proveedor": "Test Proveedor",
            "cultivo": "Test Cultivo",
            "articulo_mp": "Test Articulo",
            "cantidad": 1000.50,
            "precio": 2.75,
            "periodo_desde": "2025-02-01",
            "periodo_hasta": "2025-12-31",
            "moneda": "EUR",
            "observaciones": "Test contrato"
        }
        
        success, response = self.run_test(
            "Create Contrato",
            "POST",
            "api/contratos",
            200,
            contrato_data
        )
        if not success:
            return False
        
        contrato_id = response.get("data", {}).get("_id")
        if contrato_id:
            self.created_ids["contrato"] = contrato_id
            print(f"   Created contrato ID: {contrato_id}")
        else:
            print("   ⚠️  No contrato ID returned")
        
        # 3. Test GET by ID
        if contrato_id:
            success, _ = self.run_test(
                "Get Contrato by ID",
                "GET",
                f"api/contratos/{contrato_id}",
                200
            )
            if not success:
                return False
        
        # 4. Test UPDATE
        if contrato_id:
            update_data = contrato_data.copy()
            update_data["observaciones"] = "Updated contrato"
            success, _ = self.run_test(
                "Update Contrato",
                "PUT", 
                f"api/contratos/{contrato_id}",
                200,
                update_data
            )
            if not success:
                return False
        
        return True

    def test_parcelas_crud(self):
        """Test parcelas CRUD operations"""
        print("\n🗺️  Testing Parcelas CRUD...")
        
        # 1. Test GET empty list
        success, response = self.run_test(
            "Get Parcelas (Empty)",
            "GET",
            "api/parcelas",
            200
        )
        if not success:
            return False
        
        # 2. Test CREATE parcela
        parcela_data = {
            "proveedor": "Test Proveedor",
            "cultivo": "Test Cultivo", 
            "campana": "2025/26",
            "variedad": "Test Variedad",
            "superficie_total": 5.25,
            "codigo_plantacion": "TEST001",
            "num_plantas": 2500,
            "finca": "Test Finca",
            "recintos": [{"geometria": [{"lat": 37.0886, "lng": -2.3170}]}]
        }
        
        success, response = self.run_test(
            "Create Parcela",
            "POST",
            "api/parcelas",
            200,
            parcela_data
        )
        if not success:
            return False
        
        parcela_id = response.get("data", {}).get("_id")
        if parcela_id:
            self.created_ids["parcela"] = parcela_id
            print(f"   Created parcela ID: {parcela_id}")
        
        return True

    def test_fincas_crud(self):
        """Test fincas CRUD operations"""
        print("\n🏡 Testing Fincas CRUD...")
        
        # Test CREATE finca
        finca_data = {
            "campana": "2025/26",
            "nombre": "Test Finca",
            "superficie_total": 100.0,
            "num_plantas": 5000,
            "provincia": "Test Province",
            "poblacion": "Test Population"
        }
        
        success, response = self.run_test(
            "Create Finca",
            "POST",
            "api/fincas",
            200,
            finca_data
        )
        if not success:
            return False
        
        finca_id = response.get("data", {}).get("_id")
        if finca_id:
            self.created_ids["finca"] = finca_id
        
        # Test GET list
        success, _ = self.run_test(
            "Get Fincas",
            "GET",
            "api/fincas",
            200
        )
        
        return success

    def test_visitas_crud(self):
        """Test visitas CRUD operations"""
        print("\n👥 Testing Visitas CRUD...")
        
        parcela_id = self.created_ids.get("parcela", "test_id")
        
        visita_data = {
            "objetivo": "Test Visit",
            "proveedor": "Test Provider",
            "campana": "2025/26", 
            "cultivo": "Test Cultivo",
            "parcela_id": parcela_id,
            "fecha_visita": "2025-01-20",
            "observaciones": "Test visit observations"
        }
        
        success, response = self.run_test(
            "Create Visita",
            "POST",
            "api/visitas",
            200,
            visita_data
        )
        if not success:
            return False
        
        visita_id = response.get("data", {}).get("_id")
        if visita_id:
            self.created_ids["visita"] = visita_id
        
        # Test GET list
        success, _ = self.run_test(
            "Get Visitas",
            "GET",
            "api/visitas",
            200
        )
        
        return success

    def test_tratamientos_crud(self):
        """Test tratamientos CRUD operations"""
        print("\n🌿 Testing Tratamientos CRUD...")
        
        parcela_id = self.created_ids.get("parcela", "test_id")
        
        tratamiento_data = {
            "parcelas_ids": [parcela_id],
            "fecha_inicio": "2025-01-15",
            "tipo_tratamiento": "Herbicida",
            "subtipo": "Pre-emergencia",
            "metodo_aplicacion": "Pulverización",
            "superficie_aplicacion": 2.5
        }
        
        success, response = self.run_test(
            "Create Tratamiento", 
            "POST",
            "api/tratamientos",
            200,
            tratamiento_data
        )
        if not success:
            return False
        
        tratamiento_id = response.get("data", {}).get("_id")
        if tratamiento_id:
            self.created_ids["tratamiento"] = tratamiento_id
        
        # Test GET list
        success, _ = self.run_test(
            "Get Tratamientos",
            "GET", 
            "api/tratamientos",
            200
        )
        
        return success

    def test_irrigaciones_crud(self):
        """Test irrigaciones CRUD operations"""
        print("\n💧 Testing Irrigaciones CRUD...")
        
        parcela_id = self.created_ids.get("parcela", "test_id")
        
        irrigacion_data = {
            "parcela_id": parcela_id,
            "fecha": "2025-01-18",
            "sistema": "Goteo",
            "duracion": 2.5,
            "volumen": 150,
            "coste": 25.50
        }
        
        success, response = self.run_test(
            "Create Irrigacion",
            "POST",
            "api/irrigaciones", 
            200,
            irrigacion_data
        )
        if not success:
            return False
        
        irrigacion_id = response.get("data", {}).get("_id")
        if irrigacion_id:
            self.created_ids["irrigacion"] = irrigacion_id
        
        # Test GET list
        success, _ = self.run_test(
            "Get Irrigaciones",
            "GET",
            "api/irrigaciones",
            200
        )
        
        return success

    def test_extended_modules(self):
        """Test other modules (recetas, albaranes, tareas, cosechas)"""
        print("\n📦 Testing Extended Modules...")
        
        # Test Recetas
        receta_data = {
            "nombre": "Test Recipe",
            "descripcion": "Test recipe description",
            "tipo": "Herbicida",
            "dosis_ha": 2.5
        }
        
        success, _ = self.run_test(
            "Create Receta",
            "POST",
            "api/recetas",
            200,
            receta_data
        )
        if not success:
            return False
        
        # Test Albaranes
        albaran_data = {
            "numero": "ALB001",
            "fecha": "2025-01-20",
            "tipo": "Entrada",
            "proveedor": "Test Provider",
            "items": [
                {"descripcion": "Test Item", "cantidad": 10, "precio": 5.0, "total": 50.0}
            ]
        }
        
        success, _ = self.run_test(
            "Create Albaran",
            "POST",
            "api/albaranes",
            200,
            albaran_data
        )
        if not success:
            return False
        
        # Test Tareas
        tarea_data = {
            "nombre": "Test Task",
            "descripcion": "Test task description",
            "fecha_inicio": "2025-01-20",
            "tipo": "Mantenimiento"
        }
        
        success, _ = self.run_test(
            "Create Tarea",
            "POST",
            "api/tareas",
            200,
            tarea_data
        )
        if not success:
            return False
        
        # Test Cosechas
        cosecha_data = {
            "nombre": "Test Harvest",
            "fecha_inicio": "2025-06-01",
            "parcelas_ids": [self.created_ids.get("parcela", "test_id")],
            "superficie_total": 5.0,
            "unidad_medida": "ha"
        }
        
        success, _ = self.run_test(
            "Create Cosecha",
            "POST",
            "api/cosechas",
            200,
            cosecha_data
        )
        
        return success

def main():
    print("🚀 Starting Agricultural Management API Testing...")
    tester = AgriculturalAPITester()
    
    # Run all tests
    tests = [
        ("Root Endpoint", tester.test_root),
        ("Dashboard KPIs", tester.test_dashboard_kpis),
        ("Contratos CRUD", tester.test_contratos_crud),
        ("Parcelas CRUD", tester.test_parcelas_crud),
        ("Fincas CRUD", tester.test_fincas_crud), 
        ("Visitas CRUD", tester.test_visitas_crud),
        ("Tratamientos CRUD", tester.test_tratamientos_crud),
        ("Irrigaciones CRUD", tester.test_irrigaciones_crud),
        ("Extended Modules", tester.test_extended_modules)
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"🧪 Running: {test_name}")
        print(f"{'='*50}")
        
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ Test {test_name} failed with exception: {e}")
            failed_tests.append(test_name)
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"📊 TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Total Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed Test Categories: {', '.join(failed_tests)}")
    else:
        print(f"\n✅ All test categories passed!")
    
    print(f"\n🆔 Created Test Data IDs:")
    for entity, entity_id in tester.created_ids.items():
        print(f"   {entity}: {entity_id}")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())