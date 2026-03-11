# Documentación Técnica - FRUVECO Cuaderno de Campo

**Versión:** 2.0  
**Fecha:** Marzo 2026  
**Aplicación:** Sistema de Gestión Agrícola y Cuaderno de Campo

---

## ÍNDICE

1. [Arquitectura del Sistema](#1-arquitectura-del-sistema)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [Base de Datos - Colecciones y Esquemas](#3-base-de-datos---colecciones-y-esquemas)
4. [API REST - Endpoints](#4-api-rest---endpoints)
5. [Autenticación](#5-autenticación)
6. [Guía de Integración con ERP](#6-guía-de-integración-con-erp)
7. [Ejemplos de Código](#7-ejemplos-de-código)
8. [Configuración del Entorno](#8-configuración-del-entorno)

---

## 1. ARQUITECTURA DEL SISTEMA

### 1.1 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend** | React.js | 18.x |
| **Backend** | FastAPI (Python) | 0.100+ |
| **Base de Datos** | MongoDB | 6.x |
| **Autenticación** | JWT (JSON Web Tokens) | - |
| **Mapas** | Leaflet + React-Leaflet | 4.x |
| **Gráficos** | Recharts | 2.x |
| **PDF** | WeasyPrint / ReportLab | - |
| **Excel** | OpenPyXL | - |
| **IA** | OpenAI GPT-4o | - |

### 1.2 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    React Frontend                        │    │
│  │  - Componentes UI (Shadcn/UI)                           │    │
│  │  - Estado global (Context API)                          │    │
│  │  - Routing (React Router)                               │    │
│  │  - Mapas (Leaflet)                                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (REST API)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVIDOR                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    FastAPI Backend                       │    │
│  │  - Routers organizados por módulo                       │    │
│  │  - Modelos Pydantic para validación                     │    │
│  │  - Middleware de autenticación JWT                      │    │
│  │  - Integración OpenAI para IA                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      MongoDB                             │    │
│  │  - Base de datos: agricultural_management               │    │
│  │  - Colecciones NoSQL                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Flujo de Datos

```
Usuario → React UI → API Call (axios) → FastAPI Router → MongoDB → Response → React State → UI Update
```

---

## 2. ESTRUCTURA DEL PROYECTO

```
/app/
├── backend/
│   ├── server.py              # Punto de entrada principal FastAPI
│   ├── database.py            # Conexión a MongoDB
│   ├── models.py              # Modelos Pydantic (validación de datos)
│   ├── requirements.txt       # Dependencias Python
│   ├── .env                   # Variables de entorno (MONGO_URL, etc.)
│   ├── routes/
│   │   ├── routes_rrhh.py     # Endpoints de Recursos Humanos
│   │   ├── routes_portal_empleado.py
│   │   ├── rrhh_ausencias.py
│   │   └── rrhh_prenominas.py
│   ├── uploads/               # Archivos subidos
│   └── tests/                 # Tests unitarios
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js             # Componente raíz
│   │   ├── index.js           # Punto de entrada
│   │   ├── index.css          # Estilos globales
│   │   ├── services/
│   │   │   └── api.js         # Cliente axios configurado
│   │   ├── contexts/
│   │   │   └── AuthContext.js # Contexto de autenticación
│   │   ├── components/
│   │   │   ├── ui/            # Componentes Shadcn/UI
│   │   │   └── ProvinciaSelect.js
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── Contratos.js
│   │   │   ├── Parcelas.js
│   │   │   ├── Proveedores.js
│   │   │   ├── Clientes.js
│   │   │   ├── Fincas.js
│   │   │   ├── Visitas.js
│   │   │   ├── Tratamientos.js
│   │   │   ├── Albaranes.js
│   │   │   ├── Evaluaciones.js
│   │   │   ├── Maquinaria.js
│   │   │   ├── RRHH.js
│   │   │   └── ...
│   │   └── utils/
│   │       └── permissions.js
│   ├── package.json
│   └── .env                   # REACT_APP_BACKEND_URL
│
├── docs/                      # Documentación
└── memory/
    └── PRD.md                 # Requisitos del producto
```

---

## 3. BASE DE DATOS - COLECCIONES Y ESQUEMAS

### 3.1 Conexión a MongoDB

```python
# /app/backend/database.py
from pymongo import MongoClient
import os

client = MongoClient(os.environ.get('MONGO_URL'))
db = client[os.environ.get('DB_NAME', 'agricultural_management')]
```

**Variables de entorno requeridas:**
- `MONGO_URL`: URI de conexión a MongoDB (ej: `mongodb://localhost:27017`)
- `DB_NAME`: Nombre de la base de datos (default: `agricultural_management`)

---

### 3.2 COLECCIÓN: `contratos`

Gestiona los contratos de compra y venta de productos agrícolas.

#### Esquema Completo

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `serie` | String | Sí | Serie del contrato (ej: "MP") |
| `año` | Integer | Sí | Año del contrato |
| `numero` | Integer | Sí | Número secuencial |
| `numero_contrato` | String | Sí | Código completo (ej: "MP-2026-000100") |
| `tipo` | String | Sí | "Compra" o "Venta" |
| `tipo_contrato` | String | No | "Por Kilos" o "Por Hectáreas" |
| `campana` | String | Sí | Campaña (ej: "2025/26") |
| `procedencia` | String | Sí | "Campo", "Almacén con tratamiento", "Almacén sin tratamiento" |
| `fecha_contrato` | String | Sí | Fecha (formato: "YYYY-MM-DD") |
| `fecha_baja` | String | No | Fecha de baja del contrato |
| `proveedor_id` | String | Sí* | ObjectId ref a `proveedores` (si tipo="Compra") |
| `cliente_id` | String | Sí* | ObjectId ref a `clientes` (si tipo="Venta") |
| `proveedor` | String | No | Nombre del proveedor (legacy/denormalizado) |
| `cultivo_id` | String | Sí | ObjectId ref a `cultivos` |
| `cultivo` | String | No | Nombre del cultivo (legacy/denormalizado) |
| `cantidad` | Float | Sí | Cantidad en kg |
| `precio` | Float | Sí | Precio por kg |
| `moneda` | String | No | Moneda (default: "EUR") |
| `cambio` | Float | No | Tipo de cambio (default: 1.0) |
| `periodo_desde` | String | Sí | Fecha inicio entrega ("YYYY-MM-DD") |
| `periodo_hasta` | String | Sí | Fecha fin entrega ("YYYY-MM-DD") |
| `agente_compra` | String | No | ObjectId ref a `agentes` (tipo Compra) |
| `agente_venta` | String | No | ObjectId ref a `agentes` (tipo Venta) |
| `comision_compra_tipo` | String | No | "porcentaje" o "euro_kilo" |
| `comision_compra_valor` | Float | No | Valor de la comisión |
| `comision_venta_tipo` | String | No | "porcentaje" o "euro_kilo" |
| `comision_venta_valor` | Float | No | Valor de la comisión |
| `forma_pago` | String | No | Forma de pago (Compra) |
| `forma_cobro` | String | No | Forma de cobro (Venta) |
| `descuento_destare` | Float | No | % de destare a aplicar |
| `condiciones_entrega` | String | No | "FCA", "DDP", "EXW", "FOB", "CFR" |
| `transporte_por_cuenta` | String | No | "Empresa", "Proveedor", "Cliente" |
| `envases_por_cuenta` | String | No | "Empresa", "Proveedor", "Cliente" |
| `cargas_granel` | Boolean | No | Si las cargas son a granel |
| `precios_calidad` | Array | No | Precios por tenderometría (ver subesquema) |
| `observaciones` | String | No | Observaciones adicionales |
| `estado` | String | No | "Activo", "Completado", "Cancelado" |
| `created_at` | DateTime | Auto | Fecha de creación |
| `updated_at` | DateTime | Auto | Fecha de última actualización |

#### Subesquema: `precios_calidad` (para guisante)

```json
{
  "calidad": "premium",
  "min_tenderometria": 90,
  "max_tenderometria": 100,
  "precio": 0.95
}
```

#### Ejemplo de Documento

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "serie": "MP",
  "año": 2026,
  "numero": 100,
  "numero_contrato": "MP-2026-000100",
  "tipo": "Compra",
  "campana": "2025/26",
  "procedencia": "Campo",
  "fecha_contrato": "2026-01-15",
  "proveedor_id": "507f1f77bcf86cd799439012",
  "proveedor": "Agrícola San Juan",
  "cultivo_id": "507f1f77bcf86cd799439013",
  "cultivo": "Guisante (Verde)",
  "cantidad": 50000,
  "precio": 0.85,
  "moneda": "EUR",
  "periodo_desde": "2026-02-01",
  "periodo_hasta": "2026-06-30",
  "agente_compra": "507f1f77bcf86cd799439014",
  "comision_compra_tipo": "porcentaje",
  "comision_compra_valor": 2.5,
  "forma_pago": "Transferencia",
  "descuento_destare": 2.5,
  "condiciones_entrega": "FCA",
  "transporte_por_cuenta": "Empresa",
  "envases_por_cuenta": "Proveedor",
  "cargas_granel": false,
  "precios_calidad": [
    {"calidad": "premium", "min_tenderometria": 90, "max_tenderometria": 100, "precio": 0.95},
    {"calidad": "standard", "min_tenderometria": 100, "max_tenderometria": 110, "precio": 0.85},
    {"calidad": "industrial", "min_tenderometria": 110, "max_tenderometria": 120, "precio": 0.77}
  ],
  "observaciones": "Contrato de compra campaña 2025/26",
  "estado": "Activo",
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-01-15T10:30:00Z"
}
```

---

### 3.3 COLECCIÓN: `proveedores`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `nombre` | String | Sí | Nombre o razón social |
| `cif_nif` | String | Sí | CIF/NIF |
| `direccion` | String | No | Dirección completa |
| `localidad` | String | No | Localidad |
| `provincia` | String | No | Provincia |
| `codigo_postal` | String | No | Código postal |
| `telefono` | String | No | Teléfono de contacto |
| `email` | String | No | Email de contacto |
| `tipo` | String | No | "Agricultor", "Cooperativa", "Mayorista" |
| `iban` | String | No | Cuenta bancaria |
| `activo` | Boolean | No | Estado activo (default: true) |
| `observaciones` | String | No | Notas adicionales |
| `created_at` | DateTime | Auto | Fecha de creación |
| `updated_at` | DateTime | Auto | Fecha de última actualización |

#### Ejemplo

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "nombre": "Agrícola San Juan",
  "cif_nif": "B12345678",
  "direccion": "Ctra. Nacional 340, km 52",
  "localidad": "Murcia",
  "provincia": "Murcia",
  "codigo_postal": "30001",
  "telefono": "968111222",
  "email": "contacto@agricolasanjuan.es",
  "tipo": "Agricultor",
  "activo": true
}
```

---

### 3.4 COLECCIÓN: `clientes`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `nombre` | String | Sí | Nombre o razón social |
| `cif_nif` | String | Sí | CIF/NIF |
| `direccion` | String | No | Dirección |
| `localidad` | String | No | Localidad |
| `provincia` | String | No | Provincia |
| `codigo_postal` | String | No | Código postal |
| `pais` | String | No | País |
| `telefono` | String | No | Teléfono |
| `email` | String | No | Email |
| `tipo` | String | No | "Gran Distribución", "Industria", "Hostelería", "Exportador" |
| `persona_contacto` | String | No | Nombre del contacto |
| `activo` | Boolean | No | Estado activo |
| `created_at` | DateTime | Auto | Fecha de creación |

---

### 3.5 COLECCIÓN: `cultivos`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `nombre` | String | Sí | Nombre del cultivo |
| `variedad` | String | No | Variedad |
| `codigo` | String | No | Código interno |
| `descripcion` | String | No | Descripción |
| `activo` | Boolean | No | Estado activo |

---

### 3.6 COLECCIÓN: `agentes`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `codigo` | String | Sí | Código (ej: "AC001") |
| `nombre` | String | Sí | Nombre completo |
| `tipo` | String | Sí | "Compra" o "Venta" |
| `telefono` | String | No | Teléfono |
| `email` | String | No | Email |
| `comision_defecto` | Float | No | Comisión por defecto (%) |
| `activo` | Boolean | No | Estado activo |

---

### 3.7 COLECCIÓN: `parcelas`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `codigo` | String | Sí | Código de parcela (ej: "PAR-001") |
| `nombre` | String | No | Nombre descriptivo |
| `proveedor` | String | Sí | Nombre del proveedor |
| `proveedor_id` | String | No | ObjectId ref a `proveedores` |
| `cultivo` | String | Sí | Nombre del cultivo |
| `cultivo_id` | String | No | ObjectId ref a `cultivos` |
| `variedad` | String | No | Variedad del cultivo |
| `campana` | String | Sí | Campaña |
| `contrato_id` | String | No | ObjectId ref a `contratos` |
| `numero_contrato` | String | No | Código del contrato |
| `finca` | String | No | Nombre de la finca |
| `finca_id` | String | No | ObjectId ref a `fincas` |
| `superficie` | Float | Sí | Superficie en hectáreas |
| `superficie_unidad` | String | No | "ha" o "m2" |
| `plantas_hectarea` | Integer | No | Plantas por hectárea |
| `sistema_riego` | String | No | "Goteo", "Aspersión", "Pivot" |
| `fecha_siembra` | String | No | Fecha de siembra |
| `fecha_cosecha_prevista` | String | No | Fecha prevista de cosecha |
| `estado` | String | No | "Activa", "Cosechada", "Baja" |
| `geometry` | Object | No | Polígono GeoJSON de la parcela |
| `recintos` | Array | No | Recintos SIGPAC asociados |
| `activo` | Boolean | No | Estado activo |
| `created_at` | DateTime | Auto | Fecha de creación |

#### Subesquema: `geometry` (GeoJSON)

```json
{
  "type": "Polygon",
  "coordinates": [[
    [-1.13, 37.98],
    [-1.12, 37.98],
    [-1.12, 37.99],
    [-1.13, 37.99],
    [-1.13, 37.98]
  ]]
}
```

---

### 3.8 COLECCIÓN: `fincas`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `codigo` | String | No | Código de finca |
| `denominacion` | String | Sí | Nombre de la finca |
| `provincia` | String | No | Provincia |
| `poblacion` | String | No | Población |
| `poligono` | String | No | Polígono catastral |
| `parcela` | String | No | Parcela catastral |
| `hectareas` | Float | No | Superficie total |
| `propietario` | String | No | Nombre del propietario |
| `finca_propia` | Boolean | No | Si es propiedad de la empresa |
| `sigpac` | Object | No | Datos SIGPAC |
| `geometria_manual` | Object | No | Geometría dibujada |
| `activo` | Boolean | No | Estado activo |

---

### 3.9 COLECCIÓN: `albaranes`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `numero_albaran` | String | Sí | Código de albarán |
| `tipo_albaran` | String | Sí | "Compra" o "Venta" |
| `fecha_albaran` | String | Sí | Fecha del albarán |
| `contrato_id` | String | No | ObjectId ref a `contratos` |
| `numero_contrato` | String | No | Código del contrato |
| `proveedor_id` | String | No | ObjectId ref a `proveedores` |
| `proveedor` | String | No | Nombre del proveedor |
| `cultivo_id` | String | No | ObjectId ref a `cultivos` |
| `cultivo` | String | No | Nombre del cultivo |
| `parcela_id` | String | No | ObjectId ref a `parcelas` |
| `campana` | String | No | Campaña |
| `lineas` | Array | Sí | Líneas del albarán |
| `kilos_brutos` | Float | Sí | Kilos brutos totales |
| `kilos_destare` | Float | No | Kilos de destare |
| `kilos_netos` | Float | Sí | Kilos netos |
| `precio_kg` | Float | Sí | Precio por kg |
| `total_albaran` | Float | Sí | Importe total |
| `estado` | String | No | "Borrador", "Confirmado", "Facturado" |
| `observaciones` | String | No | Observaciones |

---

### 3.10 COLECCIÓN: `visitas`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `parcela_id` | String | Sí | ObjectId ref a `parcelas` |
| `parcela_codigo` | String | No | Código de la parcela |
| `contrato_id` | String | No | ObjectId ref a `contratos` |
| `cultivo` | String | No | Nombre del cultivo |
| `proveedor` | String | No | Nombre del proveedor |
| `fecha_visita` | String | Sí | Fecha de la visita |
| `hora_visita` | String | No | Hora de la visita |
| `tipo_visita` | String | No | Tipo de visita |
| `tecnico_id` | String | No | ObjectId ref a `tecnicos_aplicadores` |
| `tecnico_nombre` | String | No | Nombre del técnico |
| `estado_cultivo` | String | No | Estado observado |
| `presencia_plagas` | String | No | "Sí" o "No" |
| `plagas_detectadas` | String | No | Plagas encontradas |
| `observaciones` | String | No | Observaciones |
| `recomendaciones` | String | No | Recomendaciones |
| `estado` | String | No | "Planificada", "Completada" |

---

### 3.11 COLECCIÓN: `tratamientos`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `parcela_id` | String | Sí | ObjectId ref a `parcelas` |
| `parcela_codigo` | String | No | Código de la parcela |
| `contrato_id` | String | No | ObjectId ref a `contratos` |
| `cultivo` | String | No | Nombre del cultivo |
| `proveedor` | String | No | Nombre del proveedor |
| `fecha_tratamiento` | String | Sí | Fecha del tratamiento |
| `hora_inicio` | String | No | Hora de inicio |
| `hora_fin` | String | No | Hora de fin |
| `tipo_tratamiento` | String | Sí | "Fitosanitario", "Herbicida", "Fungicida", etc. |
| `producto_nombre` | String | Sí | Nombre del producto |
| `materia_activa` | String | No | Materia activa |
| `dosis_aplicada` | String | No | Dosis aplicada |
| `superficie_tratada` | Float | No | Superficie tratada (ha) |
| `cantidad_producto` | String | No | Cantidad total utilizada |
| `tecnico_aplicador_id` | String | No | ObjectId ref a `tecnicos_aplicadores` |
| `tecnico_aplicador` | String | No | Nombre del técnico |
| `numero_carnet` | String | No | Carnet ROPO del técnico |
| `maquinaria_id` | String | No | ObjectId ref a `maquinaria` |
| `maquinaria_nombre` | String | No | Nombre de la maquinaria |
| `condiciones_climaticas` | Object | No | Temperatura, humedad, viento |
| `plazo_seguridad_dias` | Integer | No | Días de plazo de seguridad |
| `justificacion` | String | No | Justificación del tratamiento |
| `estado` | String | No | "Planificado", "Completado" |

---

### 3.12 COLECCIÓN: `tecnicos_aplicadores`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `codigo` | String | Sí | Código del técnico |
| `nombre` | String | Sí | Nombre |
| `apellidos` | String | Sí | Apellidos |
| `dni` | String | No | DNI |
| `numero_carnet` | String | Sí | Número carnet ROPO |
| `tipo_carnet` | String | No | "Básico" o "Cualificado" |
| `fecha_expedicion` | String | No | Fecha expedición carnet |
| `fecha_caducidad` | String | No | Fecha caducidad carnet |
| `telefono` | String | No | Teléfono |
| `email` | String | No | Email |
| `especialidad` | String | No | Especialidad |
| `certificaciones` | Array | No | Lista de certificaciones |
| `activo` | Boolean | No | Estado activo |

---

### 3.13 COLECCIÓN: `maquinaria`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `codigo` | String | Sí | Código de la máquina |
| `nombre` | String | Sí | Nombre descriptivo |
| `tipo` | String | Sí | "Tractor", "Pulverizador", "Cosechadora", etc. |
| `marca` | String | No | Marca |
| `modelo` | String | No | Modelo |
| `matricula` | String | No | Matrícula |
| `año_fabricacion` | Integer | No | Año de fabricación |
| `potencia_cv` | Integer | No | Potencia en CV |
| `numero_serie` | String | No | Número de serie |
| `fecha_adquisicion` | String | No | Fecha de adquisición |
| `estado` | String | No | "Operativo", "En Mantenimiento", "Baja" |
| `ubicacion` | String | No | Ubicación actual |
| `proxima_revision` | String | No | Fecha próxima revisión |
| `horas_uso` | Float | No | Horas de uso acumuladas |
| `activo` | Boolean | No | Estado activo |

---

### 3.14 COLECCIÓN: `empleados`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `codigo` | String | Sí | Código del empleado |
| `nombre` | String | Sí | Nombre |
| `apellidos` | String | Sí | Apellidos |
| `dni_nie` | String | Sí | DNI/NIE |
| `fecha_nacimiento` | String | No | Fecha de nacimiento |
| `direccion` | String | No | Dirección |
| `localidad` | String | No | Localidad |
| `provincia` | String | No | Provincia |
| `telefono` | String | No | Teléfono |
| `email` | String | No | Email |
| `fecha_alta` | String | Sí | Fecha de alta |
| `fecha_baja` | String | No | Fecha de baja |
| `tipo_contrato` | String | No | "Temporal", "Indefinido", "Fijo-Discontinuo" |
| `puesto` | String | No | Puesto de trabajo |
| `departamento` | String | No | Departamento |
| `salario_hora` | Float | No | Salario por hora |
| `qr_code` | String | No | Código QR para fichaje |
| `nfc_id` | String | No | ID tarjeta NFC |
| `foto_url` | String | No | URL de foto |
| `activo` | Boolean | No | Estado activo |

---

### 3.15 COLECCIÓN: `users` (Usuarios del Sistema)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `_id` | ObjectId | Auto | Identificador único |
| `email` | String | Sí | Email (único) |
| `hashed_password` | String | Sí | Contraseña hasheada (bcrypt) |
| `nombre` | String | No | Nombre del usuario |
| `rol` | String | No | "admin", "tecnico", "operario" |
| `activo` | Boolean | No | Estado activo |
| `permisos` | Array | No | Permisos específicos |
| `dashboard_config` | Object | No | Configuración del dashboard |

---

## 4. API REST - ENDPOINTS

### 4.1 Base URL

```
https://[tu-dominio]/api
```

### 4.2 Autenticación

Todos los endpoints (excepto `/auth/login`) requieren un token JWT en el header:

```
Authorization: Bearer <token>
```

---

### 4.3 Endpoints de Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/register` | Registrar usuario |
| GET | `/auth/me` | Obtener usuario actual |
| PUT | `/auth/change-password` | Cambiar contraseña |

#### POST `/auth/login`

**Request:**
```json
{
  "email": "admin@empresa.com",
  "password": "tu_contraseña"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "email": "admin@empresa.com",
    "nombre": "Administrador",
    "rol": "admin"
  }
}
```

---

### 4.4 Endpoints de Contratos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/contratos` | Listar contratos (con filtros) |
| GET | `/contratos/{id}` | Obtener contrato por ID |
| POST | `/contratos` | Crear nuevo contrato |
| PUT | `/contratos/{id}` | Actualizar contrato |
| DELETE | `/contratos/{id}` | Eliminar contrato |
| GET | `/contratos/pdf` | Exportar a PDF |
| GET | `/contratos/excel` | Exportar a Excel |

#### GET `/contratos`

**Query Parameters:**
- `tipo`: "Compra" o "Venta"
- `campana`: Filtrar por campaña
- `proveedor_id`: Filtrar por proveedor
- `cultivo_id`: Filtrar por cultivo
- `estado`: "Activo", "Completado", "Cancelado"
- `skip`: Paginación - registros a saltar
- `limit`: Paginación - máximo de registros

**Response:**
```json
{
  "items": [...],
  "total": 100,
  "skip": 0,
  "limit": 50
}
```

#### POST `/contratos`

**Request:**
```json
{
  "tipo": "Compra",
  "campana": "2025/26",
  "procedencia": "Campo",
  "fecha_contrato": "2026-01-15",
  "proveedor_id": "507f1f77bcf86cd799439012",
  "cultivo_id": "507f1f77bcf86cd799439013",
  "cantidad": 50000,
  "precio": 0.85,
  "periodo_desde": "2026-02-01",
  "periodo_hasta": "2026-06-30",
  "forma_pago": "Transferencia",
  "descuento_destare": 2.5,
  "condiciones_entrega": "FCA",
  "transporte_por_cuenta": "Empresa",
  "envases_por_cuenta": "Proveedor",
  "precios_calidad": [
    {"calidad": "premium", "min_tenderometria": 90, "max_tenderometria": 100, "precio": 0.95}
  ]
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "numero_contrato": "MP-2026-000100",
  "message": "Contrato creado correctamente"
}
```

---

### 4.5 Endpoints de Proveedores

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/proveedores` | Listar proveedores |
| GET | `/proveedores/{id}` | Obtener proveedor por ID |
| POST | `/proveedores` | Crear proveedor |
| PUT | `/proveedores/{id}` | Actualizar proveedor |
| DELETE | `/proveedores/{id}` | Eliminar proveedor |

#### POST `/proveedores`

**Request:**
```json
{
  "nombre": "Agrícola San Juan",
  "cif_nif": "B12345678",
  "direccion": "Ctra. Nacional 340, km 52",
  "localidad": "Murcia",
  "provincia": "Murcia",
  "codigo_postal": "30001",
  "telefono": "968111222",
  "email": "contacto@agricolasanjuan.es",
  "tipo": "Agricultor"
}
```

---

### 4.6 Endpoints de Clientes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/clientes` | Listar clientes |
| GET | `/clientes/{id}` | Obtener cliente por ID |
| POST | `/clientes` | Crear cliente |
| PUT | `/clientes/{id}` | Actualizar cliente |
| DELETE | `/clientes/{id}` | Eliminar cliente |

---

### 4.7 Endpoints de Cultivos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/cultivos` | Listar cultivos |
| POST | `/cultivos` | Crear cultivo |
| PUT | `/cultivos/{id}` | Actualizar cultivo |
| DELETE | `/cultivos/{id}` | Eliminar cultivo |

---

### 4.8 Endpoints de Parcelas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/parcelas` | Listar parcelas |
| GET | `/parcelas/{id}` | Obtener parcela por ID |
| POST | `/parcelas` | Crear parcela |
| PUT | `/parcelas/{id}` | Actualizar parcela |
| DELETE | `/parcelas/{id}` | Eliminar parcela |

---

### 4.9 Endpoints de Albaranes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/albaranes` | Listar albaranes |
| GET | `/albaranes/{id}` | Obtener albarán por ID |
| POST | `/albaranes` | Crear albarán |
| PUT | `/albaranes/{id}` | Actualizar albarán |
| DELETE | `/albaranes/{id}` | Eliminar albarán |

---

### 4.10 Otros Endpoints Disponibles

| Prefijo | Descripción |
|---------|-------------|
| `/fincas` | Gestión de fincas |
| `/visitas` | Gestión de visitas |
| `/tratamientos` | Gestión de tratamientos |
| `/cosechas` | Gestión de cosechas |
| `/evaluaciones` | Hojas de evaluación |
| `/maquinaria` | Gestión de maquinaria |
| `/tecnicos-aplicadores` | Técnicos aplicadores |
| `/agentes` | Agentes de compra/venta |
| `/articulos` | Artículos/productos |
| `/rrhh/empleados` | Gestión de empleados |
| `/rrhh/fichajes` | Control horario |
| `/rrhh/productividad` | Registros de productividad |
| `/dashboard/config` | Configuración del dashboard |
| `/ai/report` | Informes con IA |

---

## 5. AUTENTICACIÓN

### 5.1 Flujo de Autenticación

1. El usuario envía credenciales a `/auth/login`
2. El servidor valida y devuelve un JWT
3. El cliente incluye el token en todas las peticiones
4. El servidor valida el token en cada petición

### 5.2 Estructura del Token JWT

```json
{
  "sub": "admin@empresa.com",
  "rol": "admin",
  "exp": 1709251200,
  "iat": 1709164800
}
```

### 5.3 Configuración de Seguridad

```python
# Configuración en backend
SECRET_KEY = os.environ.get("SECRET_KEY", "tu-clave-secreta")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas
```

---

## 6. GUÍA DE INTEGRACIÓN CON ERP

### 6.1 Arquitectura de Integración

```
┌────────────┐      ┌────────────────┐      ┌─────────────────┐
│    ERP     │──────│  Middleware/   │──────│   FRUVECO API   │
│  (Origen)  │ API  │   Script Sync  │ REST │   (Destino)     │
└────────────┘      └────────────────┘      └─────────────────┘
```

### 6.2 Pasos para Sincronización

1. **Obtener Token de Acceso**
2. **Mapear Datos del ERP a Formato API**
3. **Sincronizar Catálogos Base** (Cultivos, Proveedores, Clientes)
4. **Sincronizar Entidades Principales** (Contratos, Parcelas)
5. **Manejar Errores y Reintentos**

### 6.3 Orden Recomendado de Sincronización

1. `cultivos` (sin dependencias)
2. `proveedores` (sin dependencias)
3. `clientes` (sin dependencias)
4. `agentes` (sin dependencias)
5. `fincas` (sin dependencias)
6. `contratos` (depende de: proveedores, clientes, cultivos, agentes)
7. `parcelas` (depende de: contratos, fincas, proveedores, cultivos)
8. `albaranes` (depende de: contratos, proveedores, parcelas)

---

## 7. EJEMPLOS DE CÓDIGO

### 7.1 Python - Sincronizar Contratos desde ERP

```python
import requests
from datetime import datetime

# Configuración
API_URL = "https://tu-dominio.com/api"
ERP_CONTRATOS = [...]  # Datos de tu ERP

class FruvecoSync:
    def __init__(self, email, password):
        self.api_url = API_URL
        self.token = self._login(email, password)
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def _login(self, email, password):
        """Obtener token de autenticación"""
        response = requests.post(
            f"{self.api_url}/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        return response.json()["access_token"]
    
    def get_proveedor_id(self, cif_nif):
        """Buscar proveedor por CIF/NIF"""
        response = requests.get(
            f"{self.api_url}/proveedores",
            headers=self.headers,
            params={"cif_nif": cif_nif}
        )
        data = response.json()
        if data.get("items"):
            return data["items"][0]["_id"]
        return None
    
    def get_cultivo_id(self, nombre):
        """Buscar cultivo por nombre"""
        response = requests.get(
            f"{self.api_url}/cultivos",
            headers=self.headers,
            params={"nombre": nombre}
        )
        data = response.json()
        if data.get("items"):
            return data["items"][0]["_id"]
        return None
    
    def crear_proveedor(self, datos_erp):
        """Crear proveedor si no existe"""
        proveedor = {
            "nombre": datos_erp["razon_social"],
            "cif_nif": datos_erp["cif"],
            "direccion": datos_erp.get("direccion"),
            "localidad": datos_erp.get("poblacion"),
            "provincia": datos_erp.get("provincia"),
            "telefono": datos_erp.get("telefono"),
            "email": datos_erp.get("email"),
            "tipo": "Agricultor"
        }
        response = requests.post(
            f"{self.api_url}/proveedores",
            headers=self.headers,
            json=proveedor
        )
        response.raise_for_status()
        return response.json()["id"]
    
    def sincronizar_contrato(self, contrato_erp):
        """
        Sincronizar un contrato desde el ERP
        
        Args:
            contrato_erp: Dict con datos del contrato del ERP
                - numero_erp: Número del contrato en ERP
                - proveedor_cif: CIF del proveedor
                - cultivo_nombre: Nombre del cultivo
                - cantidad_kg: Cantidad en kg
                - precio_kg: Precio por kg
                - fecha_inicio: Fecha inicio (YYYY-MM-DD)
                - fecha_fin: Fecha fin (YYYY-MM-DD)
                - campana: Campaña (ej: "2025/26")
        """
        # Buscar o crear proveedor
        proveedor_id = self.get_proveedor_id(contrato_erp["proveedor_cif"])
        if not proveedor_id:
            proveedor_id = self.crear_proveedor(contrato_erp["proveedor_datos"])
        
        # Buscar cultivo
        cultivo_id = self.get_cultivo_id(contrato_erp["cultivo_nombre"])
        if not cultivo_id:
            raise ValueError(f"Cultivo no encontrado: {contrato_erp['cultivo_nombre']}")
        
        # Crear contrato
        contrato = {
            "tipo": "Compra",
            "campana": contrato_erp["campana"],
            "procedencia": "Campo",
            "fecha_contrato": contrato_erp.get("fecha_contrato", datetime.now().strftime("%Y-%m-%d")),
            "proveedor_id": proveedor_id,
            "cultivo_id": cultivo_id,
            "cantidad": float(contrato_erp["cantidad_kg"]),
            "precio": float(contrato_erp["precio_kg"]),
            "periodo_desde": contrato_erp["fecha_inicio"],
            "periodo_hasta": contrato_erp["fecha_fin"],
            "forma_pago": contrato_erp.get("forma_pago", "Transferencia"),
            "descuento_destare": float(contrato_erp.get("destare", 0)),
            "observaciones": f"Importado desde ERP - Ref: {contrato_erp['numero_erp']}"
        }
        
        # Precios por tenderometría (solo para guisante)
        if "guisante" in contrato_erp["cultivo_nombre"].lower():
            if contrato_erp.get("precios_tenderometria"):
                contrato["precios_calidad"] = [
                    {
                        "calidad": p["calidad"],
                        "min_tenderometria": p["min"],
                        "max_tenderometria": p["max"],
                        "precio": p["precio"]
                    }
                    for p in contrato_erp["precios_tenderometria"]
                ]
        
        response = requests.post(
            f"{self.api_url}/contratos",
            headers=self.headers,
            json=contrato
        )
        response.raise_for_status()
        return response.json()


# Uso
if __name__ == "__main__":
    sync = FruvecoSync("admin@empresa.com", "password123")
    
    # Ejemplo de contrato del ERP
    contrato_erp = {
        "numero_erp": "ERP-2026-001",
        "proveedor_cif": "B12345678",
        "proveedor_datos": {
            "razon_social": "Agrícola San Juan",
            "cif": "B12345678",
            "direccion": "Ctra. Nacional 340",
            "poblacion": "Murcia",
            "provincia": "Murcia"
        },
        "cultivo_nombre": "Guisante",
        "cantidad_kg": 50000,
        "precio_kg": 0.85,
        "fecha_inicio": "2026-02-01",
        "fecha_fin": "2026-06-30",
        "campana": "2025/26",
        "forma_pago": "Transferencia",
        "destare": 2.5,
        "precios_tenderometria": [
            {"calidad": "premium", "min": 90, "max": 100, "precio": 0.95},
            {"calidad": "standard", "min": 100, "max": 110, "precio": 0.85}
        ]
    }
    
    resultado = sync.sincronizar_contrato(contrato_erp)
    print(f"Contrato creado: {resultado}")
```

### 7.2 JavaScript/Node.js - Cliente API

```javascript
const axios = require('axios');

class FruvecoAPI {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.token = null;
    }

    async login(email, password) {
        const response = await axios.post(`${this.baseURL}/auth/login`, {
            email,
            password
        });
        this.token = response.data.access_token;
        return this.token;
    }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    // Contratos
    async getContratos(filtros = {}) {
        const response = await axios.get(`${this.baseURL}/contratos`, {
            headers: this.getHeaders(),
            params: filtros
        });
        return response.data;
    }

    async createContrato(contrato) {
        const response = await axios.post(`${this.baseURL}/contratos`, contrato, {
            headers: this.getHeaders()
        });
        return response.data;
    }

    // Proveedores
    async getProveedores(filtros = {}) {
        const response = await axios.get(`${this.baseURL}/proveedores`, {
            headers: this.getHeaders(),
            params: filtros
        });
        return response.data;
    }

    async createProveedor(proveedor) {
        const response = await axios.post(`${this.baseURL}/proveedores`, proveedor, {
            headers: this.getHeaders()
        });
        return response.data;
    }
}

// Uso
async function main() {
    const api = new FruvecoAPI('https://tu-dominio.com/api');
    
    await api.login('admin@empresa.com', 'password123');
    
    // Crear proveedor
    const proveedor = await api.createProveedor({
        nombre: 'Nuevo Proveedor',
        cif_nif: 'B99999999',
        provincia: 'Murcia'
    });
    
    // Crear contrato
    const contrato = await api.createContrato({
        tipo: 'Compra',
        campana: '2025/26',
        procedencia: 'Campo',
        fecha_contrato: '2026-01-15',
        proveedor_id: proveedor.id,
        cultivo_id: '507f1f77bcf86cd799439013',
        cantidad: 30000,
        precio: 1.20,
        periodo_desde: '2026-02-01',
        periodo_hasta: '2026-06-30'
    });
    
    console.log('Contrato creado:', contrato);
}

main().catch(console.error);
```

### 7.3 cURL - Ejemplos Rápidos

```bash
# Login
curl -X POST "https://tu-dominio.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"password123"}'

# Obtener contratos
curl -X GET "https://tu-dominio.com/api/contratos?tipo=Compra&campana=2025/26" \
  -H "Authorization: Bearer TU_TOKEN"

# Crear proveedor
curl -X POST "https://tu-dominio.com/api/proveedores" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Agrícola Test",
    "cif_nif": "B11111111",
    "provincia": "Murcia"
  }'

# Crear contrato
curl -X POST "https://tu-dominio.com/api/contratos" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "Compra",
    "campana": "2025/26",
    "procedencia": "Campo",
    "fecha_contrato": "2026-01-15",
    "proveedor_id": "ID_PROVEEDOR",
    "cultivo_id": "ID_CULTIVO",
    "cantidad": 50000,
    "precio": 0.85,
    "periodo_desde": "2026-02-01",
    "periodo_hasta": "2026-06-30"
  }'
```

---

## 8. CONFIGURACIÓN DEL ENTORNO

### 8.1 Variables de Entorno - Backend

```env
# /app/backend/.env
MONGO_URL=mongodb://localhost:27017
DB_NAME=agricultural_management
SECRET_KEY=tu-clave-secreta-muy-larga-y-segura
OPENAI_API_KEY=sk-...  # Para funcionalidades de IA
```

### 8.2 Variables de Entorno - Frontend

```env
# /app/frontend/.env
REACT_APP_BACKEND_URL=https://tu-dominio.com
```

### 8.3 Dependencias Principales

**Backend (Python):**
```
fastapi>=0.100.0
uvicorn>=0.23.0
pymongo>=4.5.0
pydantic>=2.0.0
python-jose>=3.3.0
passlib>=1.7.4
bcrypt>=4.0.0
python-multipart>=0.0.6
weasyprint>=60.0
openpyxl>=3.1.0
```

**Frontend (Node.js):**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.0.0",
    "axios": "^1.6.0",
    "recharts": "^2.10.0",
    "react-leaflet": "^4.2.0",
    "leaflet": "^1.9.4",
    "lucide-react": "^0.300.0"
  }
}
```

---

## CONTACTO Y SOPORTE

Para soporte técnico o consultas sobre la integración:

- **Documentación API**: `/api/docs` (Swagger UI automático de FastAPI)
- **Esquemas OpenAPI**: `/api/openapi.json`

---

*Documento generado el 4 de Marzo de 2026*
