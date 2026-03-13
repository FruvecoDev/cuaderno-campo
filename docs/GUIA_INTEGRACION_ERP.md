# Guía de Integración ERP - FRUVECO

## API de Sincronización Automática

**Versión:** 1.0  
**Fecha:** Marzo 2026  
**Base URL:** `https://harvest-hub-345.preview.emergentagent.com/api/erp`

---

## 1. INTRODUCCIÓN

Esta API permite sincronizar automáticamente los datos de tu ERP con el sistema FRUVECO. 
Cuando grabes un contrato, proveedor, cliente o cultivo en tu ERP, puedes enviar una 
petición HTTP a esta API para que se registre automáticamente en FRUVECO.

### Características:
- **Autenticación** mediante API Key
- **Creación automática** de proveedores/clientes si no existen
- **Referencia ERP** para vincular registros entre sistemas
- **Validación de duplicados** automática

---

## 2. AUTENTICACIÓN

Todas las peticiones requieren una **API Key** en el header HTTP.

### Header requerido:
```
X-API-Key: fruveco-erp-key-2026
```

### Ejemplo de petición autenticada:
```bash
curl -X GET "https://harvest-hub-345.preview.emergentagent.com/api/erp/health" \
  -H "X-API-Key: fruveco-erp-key-2026"
```

### Respuesta si la API Key es inválida:
```json
{
  "detail": "API Key inválida. Contacte al administrador para obtener una API Key válida."
}
```

---

## 3. CREAR CONTRATO DESDE ERP

### Endpoint
```
POST /api/erp/contratos
```

### Headers
```
Content-Type: application/json
X-API-Key: fruveco-erp-key-2026
```

### Campos del Contrato

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `referencia_erp` | String | **SÍ** | Código único del contrato en tu ERP |
| `tipo` | String | **SÍ** | "Compra" o "Venta" |
| `campana` | String | **SÍ** | Campaña (ej: "2025/26") |
| `procedencia` | String | No | "Campo", "Almacén con tratamiento", "Almacén sin tratamiento" |
| `fecha_contrato` | String | **SÍ** | Fecha formato YYYY-MM-DD |
| `periodo_desde` | String | **SÍ** | Fecha inicio entregas YYYY-MM-DD |
| `periodo_hasta` | String | **SÍ** | Fecha fin entregas YYYY-MM-DD |
| `proveedor_cif` | String | *Compra* | CIF/NIF del proveedor |
| `proveedor_nombre` | String | No | Nombre del proveedor |
| `cliente_cif` | String | *Venta* | CIF/NIF del cliente |
| `cliente_nombre` | String | No | Nombre del cliente |
| `cultivo_nombre` | String | **SÍ** | Nombre del cultivo |
| `cultivo_codigo` | String | No | Código del cultivo en FRUVECO |
| `cantidad` | Float | **SÍ** | Cantidad en kg |
| `precio` | Float | **SÍ** | Precio en €/kg |
| `moneda` | String | No | "EUR" (default), "USD", "GBP" |
| `forma_pago` | String | No | Forma de pago |
| `descuento_destare` | Float | No | % de destare (default: 0) |
| `condiciones_entrega` | String | No | "FCA", "DDP", "EXW", "FOB", "CFR" |
| `transporte_por_cuenta` | String | No | "Empresa", "Proveedor", "Cliente" |
| `envases_por_cuenta` | String | No | "Empresa", "Proveedor", "Cliente" |
| `cargas_granel` | Boolean | No | Si es carga a granel |
| `precios_calidad` | Array | No | Precios por tenderometría (guisante) |
| `observaciones` | String | No | Notas adicionales |

### Ejemplo Completo - Contrato de Compra

```bash
curl -X POST "https://harvest-hub-345.preview.emergentagent.com/api/erp/contratos" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: fruveco-erp-key-2026" \
  -d '{
    "referencia_erp": "ERP-2026-00001",
    "tipo": "Compra",
    "campana": "2025/26",
    "procedencia": "Campo",
    "fecha_contrato": "2026-01-15",
    "periodo_desde": "2026-02-01",
    "periodo_hasta": "2026-06-30",
    "proveedor_cif": "B12345678",
    "proveedor_nombre": "Agrícola San Juan",
    "cultivo_nombre": "Guisante",
    "cantidad": 50000,
    "precio": 0.85,
    "forma_pago": "Transferencia 30 días",
    "descuento_destare": 2.5,
    "condiciones_entrega": "FCA",
    "transporte_por_cuenta": "Empresa",
    "envases_por_cuenta": "Proveedor",
    "precios_calidad": [
      {"calidad": "premium", "min_tenderometria": 90, "max_tenderometria": 100, "precio": 0.95},
      {"calidad": "standard", "min_tenderometria": 100, "max_tenderometria": 110, "precio": 0.85},
      {"calidad": "industrial", "min_tenderometria": 110, "max_tenderometria": 120, "precio": 0.77}
    ],
    "observaciones": "Contrato importado desde ERP"
  }'
```

### Respuesta Exitosa (201)
```json
{
  "success": true,
  "message": "Contrato creado correctamente",
  "data": {
    "id": "65f1a2b3c4d5e6f7890abcde",
    "numero_contrato": "MP-2026-000125",
    "referencia_erp": "ERP-2026-00001",
    "proveedor_id": "65f1a2b3c4d5e6f7890abcd1",
    "cliente_id": null,
    "cultivo_id": "65f1a2b3c4d5e6f7890abcd2"
  }
}
```

### Errores Posibles

**409 - Contrato duplicado:**
```json
{
  "detail": "Ya existe un contrato con referencia ERP: ERP-2026-00001"
}
```

**401 - API Key inválida:**
```json
{
  "detail": "API Key inválida. Contacte al administrador para obtener una API Key válida."
}
```

---

## 4. ACTUALIZAR CONTRATO

### Endpoint
```
PUT /api/erp/contratos/{referencia_erp}
```

### Ejemplo
```bash
curl -X PUT "https://harvest-hub-345.preview.emergentagent.com/api/erp/contratos/ERP-2026-00001" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: fruveco-erp-key-2026" \
  -d '{
    "referencia_erp": "ERP-2026-00001",
    "tipo": "Compra",
    "campana": "2025/26",
    "fecha_contrato": "2026-01-15",
    "periodo_desde": "2026-02-01",
    "periodo_hasta": "2026-06-30",
    "proveedor_cif": "B12345678",
    "cultivo_nombre": "Guisante",
    "cantidad": 60000,
    "precio": 0.88,
    "observaciones": "Cantidad actualizada desde ERP"
  }'
```

---

## 5. CONSULTAR CONTRATO

### Endpoint
```
GET /api/erp/contratos/{referencia_erp}
```

### Ejemplo
```bash
curl -X GET "https://harvest-hub-345.preview.emergentagent.com/api/erp/contratos/ERP-2026-00001" \
  -H "X-API-Key: fruveco-erp-key-2026"
```

---

## 6. ELIMINAR (CANCELAR) CONTRATO

### Endpoint
```
DELETE /api/erp/contratos/{referencia_erp}
```

### Ejemplo
```bash
curl -X DELETE "https://harvest-hub-345.preview.emergentagent.com/api/erp/contratos/ERP-2026-00001" \
  -H "X-API-Key: fruveco-erp-key-2026"
```

**Nota:** El contrato no se elimina físicamente, se marca como "Cancelado".

---

## 7. CREAR PROVEEDOR

### Endpoint
```
POST /api/erp/proveedores
```

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `referencia_erp` | String | **SÍ** | Código único en el ERP |
| `nombre` | String | **SÍ** | Nombre o razón social |
| `cif_nif` | String | **SÍ** | CIF/NIF |
| `direccion` | String | No | Dirección |
| `localidad` | String | No | Localidad |
| `provincia` | String | No | Provincia |
| `codigo_postal` | String | No | Código postal |
| `telefono` | String | No | Teléfono |
| `email` | String | No | Email |
| `tipo` | String | No | "Agricultor", "Cooperativa", "Mayorista" |
| `iban` | String | No | Cuenta bancaria |

### Ejemplo
```bash
curl -X POST "https://harvest-hub-345.preview.emergentagent.com/api/erp/proveedores" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: fruveco-erp-key-2026" \
  -d '{
    "referencia_erp": "PROV-001",
    "nombre": "Agrícola San Juan S.L.",
    "cif_nif": "B12345678",
    "direccion": "Ctra. Nacional 340, km 52",
    "localidad": "Murcia",
    "provincia": "Murcia",
    "codigo_postal": "30001",
    "telefono": "968111222",
    "email": "contacto@agricolasanjuan.es",
    "tipo": "Agricultor"
  }'
```

---

## 8. CREAR CLIENTE

### Endpoint
```
POST /api/erp/clientes
```

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `referencia_erp` | String | **SÍ** | Código único en el ERP |
| `nombre` | String | **SÍ** | Nombre o razón social |
| `cif_nif` | String | **SÍ** | CIF/NIF |
| `direccion` | String | No | Dirección |
| `localidad` | String | No | Localidad |
| `provincia` | String | No | Provincia |
| `pais` | String | No | País (default: "España") |
| `telefono` | String | No | Teléfono |
| `email` | String | No | Email |
| `persona_contacto` | String | No | Nombre del contacto |

### Ejemplo
```bash
curl -X POST "https://harvest-hub-345.preview.emergentagent.com/api/erp/clientes" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: fruveco-erp-key-2026" \
  -d '{
    "referencia_erp": "CLI-001",
    "nombre": "Supermercados Norte S.A.",
    "cif_nif": "A11111111",
    "direccion": "Pol. Ind. Central, nave 1-5",
    "localidad": "Madrid",
    "provincia": "Madrid",
    "pais": "España",
    "telefono": "911222333",
    "email": "compras@supernorte.es"
  }'
```

---

## 9. CREAR CULTIVO

### Endpoint
```
POST /api/erp/cultivos
```

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `codigo` | String | **SÍ** | Código único del cultivo |
| `nombre` | String | **SÍ** | Nombre del cultivo |
| `variedad` | String | No | Variedad |
| `descripcion` | String | No | Descripción |

### Ejemplo
```bash
curl -X POST "https://harvest-hub-345.preview.emergentagent.com/api/erp/cultivos" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: fruveco-erp-key-2026" \
  -d '{
    "codigo": "GUI01",
    "nombre": "Guisante",
    "variedad": "Verde",
    "descripcion": "Guisante verde para congelado"
  }'
```

---

## 10. CONSULTAR CATÁLOGOS

### Obtener Cultivos Disponibles
```bash
curl -X GET "https://harvest-hub-345.preview.emergentagent.com/api/erp/catalogos/cultivos" \
  -H "X-API-Key: fruveco-erp-key-2026"
```

### Obtener Agentes Disponibles
```bash
curl -X GET "https://harvest-hub-345.preview.emergentagent.com/api/erp/catalogos/agentes" \
  -H "X-API-Key: fruveco-erp-key-2026"
```

---

## 11. FLUJO DE INTEGRACIÓN RECOMENDADO

### Paso 1: Sincronizar Catálogos (una vez)
1. Crear cultivos que no existan
2. Crear proveedores base
3. Crear clientes base

### Paso 2: Sincronización de Contratos (automática)
Cuando se cree un contrato en el ERP, enviar petición POST a `/api/erp/contratos`

### Diagrama de Flujo:
```
┌─────────────┐     POST /api/erp/contratos     ┌──────────────┐
│   TU ERP    │ ─────────────────────────────►  │   FRUVECO    │
│             │                                  │              │
│ Al grabar   │     { referencia_erp: "...",    │ Valida datos │
│ contrato    │       proveedor_cif: "...",     │ Busca/Crea   │
│             │       cultivo_nombre: "...",    │ proveedor    │
│             │       cantidad: 50000,          │ Asigna núm.  │
│             │       precio: 0.85 }            │ Guarda       │
└─────────────┘                                  └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Respuesta   │
                    │ { success,   │
                    │   id,        │
                    │   numero }   │
                    └──────────────┘
```

---

## 12. EJEMPLO CÓDIGO COMPLETO (Python)

```python
import requests
import json

class FruvecoERPClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            "Content-Type": "application/json",
            "X-API-Key": api_key
        }
    
    def crear_contrato(self, datos_erp):
        """
        Sincronizar un contrato desde el ERP a FRUVECO
        
        Args:
            datos_erp: dict con los datos del contrato
        
        Returns:
            dict con el resultado de la operación
        """
        payload = {
            "referencia_erp": datos_erp["numero_contrato_erp"],
            "tipo": "Compra",
            "campana": datos_erp["campana"],
            "procedencia": "Campo",
            "fecha_contrato": datos_erp["fecha"],
            "periodo_desde": datos_erp["fecha_inicio"],
            "periodo_hasta": datos_erp["fecha_fin"],
            "proveedor_cif": datos_erp["proveedor_cif"],
            "proveedor_nombre": datos_erp["proveedor_nombre"],
            "cultivo_nombre": datos_erp["producto"],
            "cantidad": datos_erp["kilos"],
            "precio": datos_erp["precio_kg"],
            "forma_pago": datos_erp.get("forma_pago"),
            "descuento_destare": datos_erp.get("destare", 0),
            "observaciones": f"Importado desde ERP - {datos_erp['numero_contrato_erp']}"
        }
        
        response = requests.post(
            f"{self.base_url}/api/erp/contratos",
            headers=self.headers,
            json=payload
        )
        
        return response.json()
    
    def verificar_conexion(self):
        """Verificar que la conexión con FRUVECO funciona"""
        response = requests.get(
            f"{self.base_url}/api/erp/health",
            headers=self.headers
        )
        return response.json()


# === USO ===
if __name__ == "__main__":
    # Configuración
    cliente = FruvecoERPClient(
        base_url="https://harvest-hub-345.preview.emergentagent.com",
        api_key="fruveco-erp-key-2026"
    )
    
    # Verificar conexión
    print("Verificando conexión...")
    resultado = cliente.verificar_conexion()
    print(f"Conexión: {resultado}")
    
    # Ejemplo: Crear contrato
    contrato_erp = {
        "numero_contrato_erp": "MI-ERP-2026-001",
        "campana": "2025/26",
        "fecha": "2026-03-11",
        "fecha_inicio": "2026-04-01",
        "fecha_fin": "2026-07-31",
        "proveedor_cif": "B12345678",
        "proveedor_nombre": "Agrícola San Juan",
        "producto": "Guisante",
        "kilos": 50000,
        "precio_kg": 0.85,
        "forma_pago": "Transferencia 30 días",
        "destare": 2.5
    }
    
    print("\nCreando contrato...")
    resultado = cliente.crear_contrato(contrato_erp)
    print(f"Resultado: {json.dumps(resultado, indent=2)}")
```

---

## 13. CÓDIGOS DE RESPUESTA HTTP

| Código | Significado |
|--------|-------------|
| 200 | Operación exitosa |
| 201 | Recurso creado |
| 400 | Error en los datos enviados |
| 401 | API Key inválida |
| 404 | Recurso no encontrado |
| 409 | Conflicto (duplicado) |
| 500 | Error interno del servidor |

---

## 14. SOPORTE

**API Key actual:** `fruveco-erp-key-2026`

**Documentación interactiva (Swagger):**
`https://harvest-hub-345.preview.emergentagent.com/api/docs`

---

*Documento generado el 11 de Marzo de 2026*
