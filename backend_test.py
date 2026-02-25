import requests
import sys
import json
from datetime import datetime
import time

class AgriculturalAPITester:
    def __init__(self, base_url="https://harvest-log-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_ids = {}
        self.catalog_ids = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

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

    def test_login(self):
        """Test login with admin credentials"""
        print("\n🔐 Testing Authentication...")
        
        login_data = {
            "email": "admin@agrogest.com",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            200,
            login_data
        )
        
        if success and response.get("access_token"):
            self.token = response["access_token"]
            print(f"   🎯 Token obtained successfully")
            return True
        else:
            print(f"   ❌ Login failed: {response}")
            return False

    def setup_test_catalogs(self):
        """Setup required catalog data for testing"""
        print("\n📚 Setting up test catalogs...")
        
        # Check if proveedores exist, create if needed
        success, response = self.run_test(
            "Get Proveedores",
            "GET",
            "api/proveedores?activo=true",
            200
        )
        
        if success:
            proveedores = response.get("proveedores", [])
            if proveedores:
                self.catalog_ids["proveedor_id"] = proveedores[0]["_id"]
                print(f"   Using existing proveedor: {proveedores[0].get('nombre')}")
            else:
                # Create test proveedor
                proveedor_data = {
                    "nombre": "Test Agricultural Provider",
                    "cif_nif": "TEST123456",
                    "telefono": "123456789",
                    "email": "test@provider.com",
                    "activo": True
                }
                success, response = self.run_test(
                    "Create Test Proveedor",
                    "POST",
                    "api/proveedores",
                    200,
                    proveedor_data
                )
                if success and response.get("data"):
                    self.catalog_ids["proveedor_id"] = response["data"]["_id"]
                    print(f"   Created test proveedor")
        
        # Check if cultivos exist, create if needed
        success, response = self.run_test(
            "Get Cultivos",
            "GET", 
            "api/cultivos?activo=true",
            200
        )
        
        if success:
            cultivos = response.get("cultivos", [])
            if cultivos:
                self.catalog_ids["cultivo_id"] = cultivos[0]["_id"]
                print(f"   Using existing cultivo: {cultivos[0].get('nombre')}")
            else:
                # Create test cultivo
                cultivo_data = {
                    "nombre": "Tomate Test",
                    "tipo": "Hortaliza",
                    "variedad": "RAF Test",
                    "activo": True
                }
                success, response = self.run_test(
                    "Create Test Cultivo",
                    "POST",
                    "api/cultivos",
                    200,
                    cultivo_data
                )
                if success and response.get("data"):
                    self.catalog_ids["cultivo_id"] = response["data"]["_id"]
                    print(f"   Created test cultivo")
        
        return bool(self.catalog_ids.get("proveedor_id") and self.catalog_ids.get("cultivo_id"))

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
        """Test contratos CRUD operations with new model (proveedor_id, cultivo_id)"""
        print("\n📋 Testing Contratos CRUD (New Model)...")
        
        # Ensure we have catalog IDs
        if not self.catalog_ids.get("proveedor_id") or not self.catalog_ids.get("cultivo_id"):
            print("   ❌ Missing catalog IDs for testing")
            return False
        
        # 1. Test GET list
        success, response = self.run_test(
            "Get Contratos",
            "GET",
            "api/contratos",
            200
        )
        if not success:
            return False
        
        # 2. Test CREATE contrato with new model (articulo_mp field removed)
        contrato_data = {
            "campana": "2025/26",
            "procedencia": "Campo",
            "fecha_contrato": "2025-01-15",
            "proveedor_id": self.catalog_ids["proveedor_id"],  # New: using catalog reference
            "cultivo_id": self.catalog_ids["cultivo_id"],      # New: using catalog reference
            "cantidad": 1000.50,
            "precio": 2.75,
            "periodo_desde": "2025-02-01",
            "periodo_hasta": "2025-12-31",
            "moneda": "EUR",
            "observaciones": "Test contrato with catalog references"
        }
        
        success, response = self.run_test(
            "Create Contrato (New Model)",
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
            
            # Store for testing consistency in visitas/tratamientos
            self.catalog_ids["contrato_id"] = contrato_id
        else:
            print("   ⚠️  No contrato ID returned")
            return False
        
        # 3. Test GET by ID
        success, _ = self.run_test(
            "Get Contrato by ID",
            "GET",
            f"api/contratos/{contrato_id}",
            200
        )
        if not success:
            return False
        
        # 4. Test UPDATE with new model
        update_data = contrato_data.copy()
        update_data["observaciones"] = "Updated contrato with catalog references"
        success, _ = self.run_test(
            "Update Contrato (New Model)",
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
        """Test visitas CRUD operations with new obligatory fields"""
        print("\n👥 Testing Visitas CRUD (New Model)...")
        
        parcela_id = self.created_ids.get("parcela")
        cultivo_id = self.catalog_ids.get("cultivo_id") 
        contrato_id = self.catalog_ids.get("contrato_id")
        
        if not parcela_id or not cultivo_id:
            print("   ❌ Missing required parcela_id or cultivo_id for testing")
            return False
        
        # Test CREATE visita with new obligatory fields
        visita_data = {
            "objetivo": "Control Rutinario",
            "parcela_id": parcela_id,        # OBLIGATORIO
            "cultivo_id": cultivo_id,        # OBLIGATORIO 
            "campana": "2025/26",            # OBLIGATORIO
            "contrato_id": contrato_id,      # Opcional - para consistency validation
            "fecha_visita": "2025-01-20",
            "observaciones": "Test visita with new obligatory fields"
        }
        
        success, response = self.run_test(
            "Create Visita (New Model)",
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
            print(f"   Created visita ID: {visita_id}")
        
        # Test consistency validation - wrong campana should fail
        bad_visita_data = visita_data.copy()
        bad_visita_data["campana"] = "2024/25"  # Different from contrato
        
        success, response = self.run_test(
            "Create Visita (Bad Consistency)",
            "POST", 
            "api/visitas",
            400,  # Should fail validation
            bad_visita_data
        )
        if not success:
            print("   ⚠️  Consistency validation might not be working")
        
        # Test missing obligatory field
        incomplete_visita = {
            "objetivo": "Control Rutinario", 
            "fecha_visita": "2025-01-20"
            # Missing parcela_id, cultivo_id, campana
        }
        
        success, response = self.run_test(
            "Create Visita (Missing Required Fields)",
            "POST",
            "api/visitas", 
            422,  # Should fail validation
            incomplete_visita
        )
        if not success:
            print("   ⚠️  Field validation might not be working")
        
        # Test GET list with filters
        success, _ = self.run_test(
            "Get Visitas",
            "GET",
            "api/visitas",
            200
        )
        if not success:
            return False
            
        # Test GET with campaign filter (new feature)
        success, _ = self.run_test(
            "Get Visitas by Campaign", 
            "GET",
            "api/visitas?campana=2025/26",
            200
        )
        if not success:
            return False
        
        return True

    def test_tratamientos_crud(self):
        """Test tratamientos CRUD operations with new obligatory fields"""
        print("\n🌿 Testing Tratamientos CRUD (New Model)...")
        
        parcela_id = self.created_ids.get("parcela")
        cultivo_id = self.catalog_ids.get("cultivo_id")
        contrato_id = self.catalog_ids.get("contrato_id")
        
        if not parcela_id or not cultivo_id:
            print("   ❌ Missing required parcela_id or cultivo_id for testing")
            return False
        
        # Test CREATE tratamiento with new obligatory fields
        tratamiento_data = {
            "tipo_tratamiento": "FITOSANITARIOS",
            "subtipo": "Insecticida",
            "aplicacion_numero": 1,
            "metodo_aplicacion": "Pulverización",
            "superficie_aplicacion": 2.5,
            "caldo_superficie": 300.0,
            "cultivo_id": cultivo_id,         # OBLIGATORIO
            "campana": "2025/26",             # OBLIGATORIO
            "parcelas_ids": [parcela_id],     # OBLIGATORIO (lista)
            "contrato_id": contrato_id        # Opcional - para consistency validation
        }
        
        success, response = self.run_test(
            "Create Tratamiento (New Model)", 
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
            print(f"   Created tratamiento ID: {tratamiento_id}")
        
        # Test consistency validation - wrong cultivo should fail
        bad_tratamiento_data = tratamiento_data.copy()
        bad_tratamiento_data["cultivo_id"] = "invalid_cultivo_id"
        
        success, response = self.run_test(
            "Create Tratamiento (Bad Cultivo)",
            "POST",
            "api/tratamientos",
            400,  # Should fail validation
            bad_tratamiento_data
        )
        if not success:
            print("   ⚠️  Cultivo validation might not be working")
        
        # Test missing obligatory fields
        incomplete_tratamiento = {
            "tipo_tratamiento": "FITOSANITARIOS",
            "aplicacion_numero": 1,
            "metodo_aplicacion": "Pulverización"
            # Missing cultivo_id, campana, parcelas_ids
        }
        
        success, response = self.run_test(
            "Create Tratamiento (Missing Required Fields)",
            "POST",
            "api/tratamientos", 
            422,  # Should fail validation
            incomplete_tratamiento
        )
        if not success:
            print("   ⚠️  Field validation might not be working")
        
        # Test GET list with filters (new features)
        success, _ = self.run_test(
            "Get Tratamientos",
            "GET", 
            "api/tratamientos",
            200
        )
        if not success:
            return False
            
        # Test GET with campaign filter
        success, _ = self.run_test(
            "Get Tratamientos by Campaign",
            "GET",
            "api/tratamientos?campana=2025/26", 
            200
        )
        if not success:
            return False
            
        # Test GET with cultivo filter
        success, _ = self.run_test(
            "Get Tratamientos by Cultivo",
            "GET",
            f"api/tratamientos?cultivo_id={cultivo_id}",
            200
        )
        if not success:
            return False
        
        return True

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
            "cultivo_objetivo": "Test Cultivo",
            "plazo_seguridad": 7,
            "instrucciones": "Test recipe instructions"
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
            "tipo": "Entrada",
            "fecha": "2025-01-20", 
            "proveedor_cliente": "Test Provider",
            "items": [
                {"producto": "Test Item", "cantidad": 10, "unidad": "kg", "precio_unitario": 5.0, "total": 50.0}
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
    def test_contratos_edit_functionality(self):
        """Test specific edit functionality for contratos"""
        print("\n✏️  Testing Contratos Edit Functionality...")
        
        # First create a contrato to edit
        if not self.created_ids.get("contrato"):
            print("   ❌ No contrato available for edit testing")
            return False
            
        contrato_id = self.created_ids["contrato"]
        
        # Test editing with updated data
        updated_data = {
            "campana": "2025/26",
            "procedencia": "Almacén con tratamiento",  # Changed
            "fecha_contrato": "2025-01-20",  # Changed
            "proveedor_id": self.catalog_ids["proveedor_id"],
            "cultivo_id": self.catalog_ids["cultivo_id"],
            "cantidad": 2000.75,  # Changed
            "precio": 3.50,  # Changed
            "periodo_desde": "2025-02-01",
            "periodo_hasta": "2025-12-31", 
            "moneda": "EUR",
            "observaciones": "EDITED: Test contrato updated via PUT endpoint"  # Changed
        }
        
        success, response = self.run_test(
            "Edit Contrato via PUT",
            "PUT",
            f"api/contratos/{contrato_id}",
            200,
            updated_data
        )
        
        if not success:
            return False
            
        # Verify the changes were saved
        success, response = self.run_test(
            "Get Edited Contrato",
            "GET", 
            f"api/contratos/{contrato_id}",
            200
        )
        
        if success and response:
            if (response.get("observaciones") == "EDITED: Test contrato updated via PUT endpoint" and
                response.get("procedencia") == "Almacén con tratamiento" and
                response.get("cantidad") == 2000.75):
                print(f"   ✅ Edit changes verified successfully")
                return True
            else:
                print(f"   ❌ Edit changes not reflected in database")
                return False
        
        return False
        
    def test_contratos_delete_functionality(self):
        """Test delete functionality for contratos"""
        print("\n🗑️  Testing Contratos Delete Functionality...")
        
        # Create a temporary contrato to delete
        temp_contrato = {
            "campana": "2025/26",
            "procedencia": "Campo",
            "fecha_contrato": "2025-01-15",
            "proveedor_id": self.catalog_ids["proveedor_id"],
            "cultivo_id": self.catalog_ids["cultivo_id"],
            "cantidad": 500.0,
            "precio": 2.00,
            "periodo_desde": "2025-02-01",
            "periodo_hasta": "2025-12-31",
            "moneda": "EUR",
            "observaciones": "Temporary contrato for deletion test"
        }
        
        success, response = self.run_test(
            "Create Temp Contrato for Deletion",
            "POST",
            "api/contratos",
            200,
            temp_contrato
        )
        
        if not success:
            return False
            
        temp_id = response.get("data", {}).get("_id")
        if not temp_id:
            print("   ❌ No ID returned from temp contrato creation")
            return False
            
        # Test deletion
        success, response = self.run_test(
            "Delete Contrato",
            "DELETE",
            f"api/contratos/{temp_id}",
            200
        )
        
        if not success:
            return False
            
        # Verify deletion - should return 404
        success, response = self.run_test(
            "Verify Contrato Deleted",
            "GET",
            f"api/contratos/{temp_id}",
            404
        )
        
        # For 404 verification, success means we got the expected 404 
        if success:
            print(f"   ✅ Contrato successfully deleted (404 confirmed)")
            return True
        else:
            print(f"   ❌ Contrato still exists after deletion (should be 404)")
            return False

    def test_parcelas_edit_functionality(self):
        """Test specific edit functionality for parcelas"""
        print("\n✏️  Testing Parcelas Edit Functionality...")
        
        # First check if we have a parcela to edit
        if not self.created_ids.get("parcela"):
            print("   ❌ No parcela available for edit testing")
            return False
            
        parcela_id = self.created_ids["parcela"]
        contrato_id = self.catalog_ids.get("contrato_id")
        
        # Test editing with updated data including contract assignment
        updated_data = {
            "contrato_id": contrato_id,  # Assign contract to parcela
            "proveedor": "EDITED: Updated Proveedor",  # Changed
            "cultivo": "EDITED: Updated Cultivo",  # Changed 
            "campana": "2025/26",
            "variedad": "EDITED: Updated Variedad",  # Changed
            "superficie_total": 10.50,  # Changed
            "codigo_plantacion": "EDIT001",  # Changed
            "num_plantas": 5000,  # Changed
            "finca": "EDITED: Updated Finca",  # Changed
            "recintos": [{"geometria": [{"lat": 37.0886, "lng": -2.3170}]}]  # Required field
        }
        
        success, response = self.run_test(
            "Edit Parcela via PUT",
            "PUT",
            f"api/parcelas/{parcela_id}",
            200,
            updated_data
        )
        
        if not success:
            return False
            
        # Verify the changes were saved
        success, response = self.run_test(
            "Get Edited Parcela",
            "GET", 
            f"api/parcelas/{parcela_id}",
            200
        )
        
        if success and response:
            if (response.get("proveedor") == "EDITED: Updated Proveedor" and
                response.get("contrato_id") == contrato_id and
                response.get("superficie_total") == 10.50):
                print(f"   ✅ Edit changes and contract assignment verified")
                return True
            else:
                print(f"   ❌ Edit changes not reflected in database")
                return False
        
        return False

    def test_parcelas_delete_functionality(self):
        """Test delete functionality for parcelas"""
        print("\n🗑️  Testing Parcelas Delete Functionality...")
        
        # Create a temporary parcela to delete
        temp_parcela = {
            "proveedor": "Temp Proveedor",
            "cultivo": "Temp Cultivo", 
            "campana": "2025/26",
            "variedad": "Temp Variedad",
            "superficie_total": 2.5,
            "codigo_plantacion": "TEMP001",
            "num_plantas": 1000,
            "finca": "Temp Finca",
            "recintos": [{"geometria": [{"lat": 37.0886, "lng": -2.3170}]}]
        }
        
        success, response = self.run_test(
            "Create Temp Parcela for Deletion",
            "POST",
            "api/parcelas",
            200,
            temp_parcela
        )
        
        if not success:
            return False
            
        temp_id = response.get("data", {}).get("_id")
        if not temp_id:
            print("   ❌ No ID returned from temp parcela creation")
            return False
            
        # Test deletion
        success, response = self.run_test(
            "Delete Parcela",
            "DELETE",
            f"api/parcelas/{temp_id}",
            200
        )
        
        if not success:
            return False
            
        # Verify deletion - should return 404
        success, response = self.run_test(
            "Verify Parcela Deleted",
            "GET",
            f"api/parcelas/{temp_id}",
            404
        )
        
        # For 404 verification, success means we got the expected 404
        if success:
            print(f"   ✅ Parcela successfully deleted (404 confirmed)")
            return True
        else:
            print(f"   ❌ Parcela still exists after deletion (should be 404)")
            return False

    def test_contratos_search_functionality(self):
        """Test contract search functionality used in parcelas form"""
        print("\n🔍 Testing Contratos Search Functionality...")
        
        # Test GET contratos for search (this endpoint is used by parcela form)
        success, response = self.run_test(
            "Get All Contratos for Search",
            "GET",
            "api/contratos",
            200
        )
        
        if not success:
            return False
            
        contratos = response.get("contratos", [])
        if len(contratos) > 0:
            print(f"   ✅ Found {len(contratos)} contratos available for search")
            
            # Verify each contract has required search fields
            first_contrato = contratos[0]
            required_fields = ["serie", "año", "numero", "proveedor", "cultivo", "campana"]
            missing_fields = [field for field in required_fields if not first_contrato.get(field)]
            
            if missing_fields:
                print(f"   ❌ Missing search fields: {missing_fields}")
                return False
            else:
                print(f"   ✅ All required search fields present")
                return True
        else:
            print(f"   ❌ No contratos found for search")
            return False

def main():
    print("🚀 Starting Agricultural Management API Testing (Refactored Model)...")
    tester = AgriculturalAPITester()
    
    # Step 1: Authenticate
    if not tester.test_login():
        print("❌ Authentication failed - cannot proceed with protected endpoint testing")
        return 1
    
    # Step 2: Setup required catalogs
    if not tester.setup_test_catalogs():
        print("❌ Catalog setup failed - cannot proceed with CRUD testing") 
        return 1
    
    # Run all tests
    tests = [
        ("Root Endpoint", tester.test_root),
        ("Dashboard KPIs", tester.test_dashboard_kpis),
        ("Contratos CRUD (New Model)", tester.test_contratos_crud),
        ("Contratos Edit Functionality", tester.test_contratos_edit_functionality),
        ("Contratos Delete Functionality", tester.test_contratos_delete_functionality),
        ("Contratos Search Functionality", tester.test_contratos_search_functionality),
        ("Parcelas CRUD", tester.test_parcelas_crud),
        ("Parcelas Edit Functionality", tester.test_parcelas_edit_functionality),
        ("Parcelas Delete Functionality", tester.test_parcelas_delete_functionality),
        ("Fincas CRUD", tester.test_fincas_crud), 
        ("Visitas CRUD (New Model)", tester.test_visitas_crud),
        ("Tratamientos CRUD (New Model)", tester.test_tratamientos_crud),
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
        
    print(f"\n📚 Catalog IDs Used:")
    for catalog, catalog_id in tester.catalog_ids.items():
        print(f"   {catalog}: {catalog_id}")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())