# AgroGest Pro - PRD (Product Requirements Document)

## Problem Statement
Desarrollar una aplicación de Cuaderno de Campo para el sector agrícola que permita gestionar:
- Contratos, Parcelas, Mapas, Fincas, Visitas, Tareas, Cosechas, Tratamientos, Irrigaciones, Recetas, Albaranes
- Dashboard con KPIs
- Generación de informes en PDF y Excel
- Panel de configuración de usuarios y permisos (RBAC)
- Autenticación con usuario y contraseña
- Integraciones con IA

## Data Model (User Clarified - IMPLEMENTED)
```
Contrato → tiene un → Proveedor & Cultivo
    ↓
Parcela → asociada a un → Contrato
    ↓
Visita/Tratamiento → realizados sobre → Parcela
```

**Modelo Simplificado (IMPLEMENTADO):**
- Al crear una **Visita**: Solo se requiere `parcela_id`. El backend hereda automáticamente: `contrato_id`, `proveedor`, `cultivo`, `campana`, `variedad`, `codigo_plantacion`, `finca`
- Al crear un **Tratamiento**: Solo se requiere `parcelas_ids`. El backend hereda automáticamente: `contrato_id`, `cultivo_id`, `campana` (de la primera parcela)

## User Personas
- **Admin**: Acceso completo, gestión de usuarios
- **Manager**: CRUD completo excepto eliminar
- **Technician**: Operaciones de campo (visitas, tratamientos)
- **Viewer**: Solo lectura y exportación

## Core Requirements

### Implemented ✅
1. **Authentication & RBAC**
   - Login/logout con JWT
   - Roles: Admin, Manager, Technician, Viewer
   - Permisos por módulo y acción

2. **Módulos CRUD Completos**
   - Usuarios
   - Proveedores
   - Cultivos
   - Contratos
   - Parcelas (con mapa interactivo)
   - Visitas (modelo simplificado)
   - Tratamientos (modelo simplificado)
   - Irrigaciones (CRUD, filtros, config campos)
   - Recetas (CRUD, filtros, config campos)
   - Albaranes (CRUD con líneas, filtros, config campos)

3. **Filtros de Búsqueda (Nuevo)**
   - Parcelas: filtrar por Proveedor, Cultivo, Campaña, Parcela
   - Visitas: filtrar por Proveedor, Cultivo, Campaña, Parcela
   - Tratamientos: filtrar por Proveedor, Cultivo, Campaña, Tipo

4. **Configuración de Campos por Usuario (Nuevo)**
   - Panel de configuración accesible con botón ⚙️
   - Checkboxes para mostrar/ocultar campos del formulario y columnas de tabla
   - Preferencias guardadas en localStorage (persisten entre sesiones)

5. **Buscador de Parcelas en Formularios (Nuevo)**
   - En Visitas: buscar parcela por Proveedor, Cultivo, Campaña
   - En Tratamientos: buscar parcelas por Proveedor, Cultivo, Campaña
   - Filtros dentro del formulario que reducen las opciones del selector
   - Contador de resultados filtrados

3. **Dashboard**
   - KPIs: Contratos, Parcelas, Superficie, Tratamientos, Producción
   - Gráficos: Superficie por Cultivo, Distribución de Costes
   - Actividad reciente

4. **Backend IA**
   - Endpoint `/api/ai/reports` para generar reportes con GPT-4
   - Tipos: parcel_campaign, contract_summary, cost_analysis, recommendations

5. **Generación de Reportes**
   - PDF con WeasyPrint
   - Excel con openpyxl

### Pending/In Progress
1. **Frontend IA** (P0)
   - Página para generar y ver reportes IA
   - Formularios para seleccionar parámetros

2. **Módulos Placeholder** (P1)
   - Irrigaciones (CRUD completo)
   - Recetas (CRUD completo)
   - Albaranes (CRUD completo)

3. **Mejoras UI/UX** (P2)
   - Consistencia en patrones de búsqueda/filtro
   - Corregir warnings de hydration de React

## Technical Stack
- **Backend**: FastAPI, Python 3.11
- **Frontend**: React 18, shadcn/ui
- **Database**: MongoDB (Motor async driver)
- **Auth**: JWT tokens
- **AI**: OpenAI GPT-4 via Emergent LLM Key
- **Maps**: Leaflet.js / OpenStreetMap
- **Reports**: WeasyPrint (PDF), openpyxl (Excel)

## Key Files
- `/app/backend/routes_main.py` - CRUD Contratos, Parcelas, Visitas, Fincas
- `/app/backend/routes_extended.py` - CRUD Tratamientos, Irrigaciones, Recetas, Albaranes, Tareas, Cosechas
- `/app/backend/routes_ai.py` - Endpoints IA
- `/app/frontend/src/pages/Visitas.js` - Formulario simplificado
- `/app/frontend/src/pages/Tratamientos.js` - Formulario simplificado

## Test Credentials
- **Admin**: `testadmin@agrogest.com` / `Test123!`
- **Manager**: `manager@test.com` / (check DB)
- **Technician**: `technician@test.com` / (check DB)
- **Viewer**: `viewer@test.com` / (check DB)

## Test Reports
- `/app/test_reports/iteration_4.json` - Latest test results (100% pass)
