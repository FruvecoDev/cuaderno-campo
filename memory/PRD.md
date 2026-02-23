# FRUVECO - PRD (Product Requirements Document)

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

5. **Buscador de Parcelas/Contratos en Formularios (Nuevo)**
   - En Visitas: buscar parcela por Proveedor, Cultivo, Campaña
   - En Tratamientos: buscar parcelas por Proveedor, Cultivo, Campaña
   - En Parcelas: buscar contrato por Proveedor, Cultivo, Campaña
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

6. **Módulo Maquinaria (Nuevo - 23/02/2026)**
   - CRUD completo de maquinaria agrícola
   - Campos: nombre, tipo, marca, modelo, matrícula, nº serie, año fabricación, capacidad, estado, observaciones
   - Tipos predefinidos: Tractor, Pulverizador, Cosechadora, etc.
   - Estados: Operativo, En mantenimiento, Averiado, Fuera de servicio
   - Filtros por Tipo y Estado
   - Configuración de campos/columnas (localStorage)
   - Navegación en sidebar (sección Catálogos)

7. **Integración Maquinaria-Tratamientos (Nuevo - 23/02/2026)**
   - Campo "Aplicador" (texto libre) en formulario de Tratamientos
   - Campo "Máquina" (dropdown) - solo muestra máquinas operativas
   - Columnas Aplicador y Máquina en tabla de Tratamientos
   - Backend denormaliza maquina_nombre automáticamente

8. **Módulo Hoja de Evaluación (Nuevo - 23/02/2026)**
   - Formulario multi-sección con cuestionarios dinámicos
   - Secciones: Toma de Datos, Análisis de Suelo, Pasos Precampaña, Calidad Cepellones, Inspección Maquinaria, Observaciones, Calibración
   - Tipos de respuesta: Sí/No, Texto, Número, Fecha
   - Preguntas personalizables (Admin/Manager pueden agregar)
   - Hereda datos automáticamente de la parcela seleccionada
   - **PDF Cuaderno de Campo Completo** (actualizado 23/02/2026):
     - Página 1: Resumen + **Índice de Contenidos** completo
     - Páginas de Visitas (azul): Una por cada visita registrada
     - Páginas de Tratamientos (naranja): Una por cada tratamiento
     - Páginas de Irrigaciones (azul agua): Una por cada riego
     - Páginas de Cosechas (verde): Una por cada cosecha con tabla de registros
   - Acceso rápido desde Parcelas (botón "Crear Evaluación")

9. **Filtros Hoja de Evaluación (Nuevo - 23/02/2026)**
   - Filtrar por: Parcela, Cultivo, Proveedor, Campaña, Contrato, Estado
   - Botón "Limpiar filtros" cuando hay filtros activos
   - Filtros combinados funcionan correctamente
   - Actualización dinámica de la lista

10. **Formulario Plagas y Enfermedades en Visitas (Nuevo - 23/02/2026)**
    - Cuestionario condicional cuando objetivo="Plagas y Enfermedades"
    - Preguntas dinámicas guardadas en campo formulario_plagas

11. **Módulo Cosechas Rediseñado (Nuevo - 23/02/2026)**
    - **Asociación a Contratos**: Hereda proveedor, cultivo, precio automáticamente
    - **Planificación de Recolección**: Fechas planificadas y kilos estimados
    - **Registro de Cargas**:
      - ID de carga único
      - Kilos reales recolectados
      - Precio automático (del contrato)
      - Importe calculado (kilos × precio)
    - **Descuentos**: Líneas negativas para destare/calidad con tipo especificado
    - **Totales automáticos**:
      - Kilos brutos, descuentos, netos
      - Importe bruto, descuentos, neto
    - **Estados**: Planificada → En Curso → Completada
    - **API Endpoints**:
      - POST /api/cosechas - Crear cosecha (requiere contrato_id)
      - POST /api/cosechas/{id}/cargas - Añadir carga positiva o descuento
      - DELETE /api/cosechas/{id}/cargas/{id_carga} - Eliminar carga
      - PUT /api/cosechas/{id}/completar - Marcar como completada
    - **Frontend**: Lista expandible con planificaciones, cargas y acciones

### Pending/In Progress
1. **Frontend IA** (P0)
   - Página para generar y ver reportes IA
   - Formularios para seleccionar parámetros

2. **Mejoras UI/UX** (P2)
   - Consistencia en patrones de búsqueda/filtro
   - Corregir warnings de hydration de React (cosmético)

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
- `/app/backend/routes_extended.py` - CRUD Tratamientos, Irrigaciones, Recetas, Albaranes, Tareas, **Cosechas (rediseñado)**
- `/app/backend/routes_maquinaria.py` - CRUD Maquinaria
- `/app/backend/routes_evaluaciones.py` - CRUD Evaluaciones + PDF generation
- `/app/backend/routes_ai.py` - Endpoints IA
- `/app/frontend/src/pages/Maquinaria.js` - Gestión de maquinaria
- `/app/frontend/src/pages/Evaluaciones.js` - Hojas de Evaluación con filtros completos
- `/app/frontend/src/pages/Visitas.js` - Formulario simplificado + Plagas/Enfermedades
- `/app/frontend/src/pages/Tratamientos.js` - Formulario con Aplicador y Máquina
- `/app/frontend/src/pages/Cosechas.js` - **Nuevo módulo de cosechas asociado a contratos**

## Test Credentials
- **Admin**: `admin@fruveco.com` / `admin123`
- **Manager**: `manager@test.com` / (check DB)
- **Technician**: `technician@test.com` / (check DB)
- **Viewer**: `viewer@test.com` / (check DB)

## Test Reports
- `/app/test_reports/iteration_9.json` - Latest test results (100% pass - PDF con Visitas y Tratamientos)
- `/app/test_reports/iteration_8.json` - (100% pass - Filtros Hoja de Evaluación)
- `/app/test_reports/iteration_7.json` - (100% pass - Maquinaria + Tratamientos integration)
