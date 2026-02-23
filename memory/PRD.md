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
- `/app/test_reports/iteration_9.json` - (100% pass - PDF con Visitas y Tratamientos)
- `/app/test_reports/iteration_8.json` - (100% pass - Filtros Hoja de Evaluación)
- `/app/test_reports/iteration_7.json` - (100% pass - Maquinaria + Tratamientos integration)

## UI/UX Consistency Updates (23/02/2026)
Módulos actualizados para seguir patrón consistente:
- **Fincas**: Filtros (buscar, campaña, provincia), resumen KPIs, tabla mejorada con editar/eliminar
- **Tareas**: Filtros (buscar, estado), 5 KPIs, toggle de estado con click, tabla mejorada

## Branding Update (23/02/2026)
- **Logo en Sidebar**: Reemplazado texto "FRUVECO" por imagen del logo corporativo
- **Logo en Login**: Añadido logo y subtítulo "Cuaderno de Campo"
- Archivo: `/app/frontend/src/assets/logo.png`
- Componentes: `/app/frontend/src/components/Layout.js`, `/app/frontend/src/pages/Login.js`

## Mapa Interactivo Mejorado (23/02/2026)
- **Vista Satélite**: Por defecto se muestra vista satelital (Esri World Imagery)
- **Selector de capas**: Botones para cambiar entre Mapa Base (OSM), Satélite y Topográfico
- **Edición de parcelas mejorada**: 
  - Polígonos editables al editar una parcela existente
  - Centrado automático en el polígono existente
  - Indicador visual del estado del polígono
  - Botón para limpiar polígono dibujado
- Archivo: `/app/frontend/src/pages/Parcelas.js`

## Mapa de Parcelas en Dashboard (23/02/2026)
- **Mapa General**: Visualización de todas las parcelas con geometría en el Dashboard
- **Vista Satélite por defecto**: Toggle para cambiar entre satélite y mapa base
- **Colores por cultivo**: Cada parcela tiene un color según su cultivo
- **Popups informativos**: Click en parcela muestra info completa (código, cultivo, proveedor, finca, superficie)
- **Leyenda de cultivos**: Identificación visual de cada cultivo
- **Auto-ajuste de bounds**: El mapa se ajusta automáticamente para mostrar todas las parcelas
- Archivo: `/app/frontend/src/pages/Dashboard.js`

## Planificador de Visitas y Notificaciones (23/02/2026)
- **Panel en Dashboard**: Sección "Visitas Planificadas" mostrando próximas visitas
- **Campo fecha_planificada**: Nuevo campo en el modelo de Visitas para planificar fechas futuras
- **Indicadores visuales**:
  - Rojo: Visitas urgentes (menos de 2 días)
  - Naranja: Visitas próximas (2-7 días)
  - Verde: Visitas con más tiempo
- **Cálculo de días restantes**: Muestra "¡Hoy!", "Mañana", "En X días" o "Vencida"
- **Endpoint nuevo**: `GET /api/visitas/planificadas` - Devuelve visitas con fecha_planificada
- **Integración con módulo Visitas**: Campo fecha_planificada en formulario de visitas
- Archivos: `/app/frontend/src/pages/Dashboard.js`, `/app/frontend/src/pages/Visitas.js`, `/app/backend/routes_main.py`, `/app/backend/models.py`

## Notificaciones por Email (23/02/2026)
- **Servicio de Email**: Integración con Resend para envío de notificaciones
- **Recordatorios de Visitas**: Emails automáticos para visitas próximas con diseño responsive
- **Panel en Dashboard**: Sección "Notificaciones por Email" con estado de configuración
- **Endpoints nuevos**:
  - `GET /api/notifications/status` - Estado del servicio
  - `POST /api/notifications/test` - Email de prueba
  - `POST /api/notifications/send-visit-reminders` - Enviar recordatorios
  - `POST /api/notifications/send-daily-summary` - Resumen diario
  - `GET /api/notifications/upcoming-visits` - Preview de visitas a notificar
- **Templates HTML**: Emails con diseño profesional y branding FRUVECO
- Archivos: `/app/backend/email_service.py`, `/app/backend/routes_notifications.py`
- **Configuración**: Añadir RESEND_API_KEY en .env para activar

## Refactorización Backend (23/02/2026)
- **server.py optimizado**: Reducido de 556 líneas a 61 líneas
- **Nuevos routers**:
  - `routes_dashboard.py` - KPIs y estadísticas del dashboard
  - `routes_reports.py` - Generación de reportes AI, PDF y Excel
- **Arquitectura modular**: 10 routers independientes para mejor mantenibilidad
- Archivos: `/app/backend/server.py`, `/app/backend/routes_dashboard.py`, `/app/backend/routes_reports.py`

## Corrección React Hydration Warnings (23/02/2026)
- **Problema corregido**: Patrones `{condition && <element>}` en tablas que causaban mismatch servidor/cliente
- **Solución aplicada**: Reemplazo por `{condition ? <element> : null}` en todos los archivos afectados
- **Archivos corregidos**: Contratos.js, Parcelas.js, Visitas.js, Tratamientos.js, Irrigaciones.js, Recetas.js, Albaranes.js, Maquinaria.js
- **Resultado**: Eliminación completa de warnings de hidratación en la consola

## Calculadora de Fitosanitarios (23/02/2026)
- **Ubicación**: Componente `CalculadoraFitosanitarios` en `/app/frontend/src/pages/Tratamientos.js` (líneas 12-600+)
- **Funcionalidades implementadas**:
  - **Campos de entrada**: Tipo de fitosanitario (Insecticida/Herbicida/Fungicida/Fertilizante), Nombre del producto, Superficie (Ha/m²), Volumen agua, Dosis producto, Concentración, Plaga objetivo
  - **Integración con Base de Datos**: Selector de productos registrados que auto-rellena campos con dosis recomendadas
  - **Cálculos automáticos**: Superficie en Ha, cantidad producto, volumen total agua, producto por litro, concentración mezcla
  - **Sistema de alertas**: Rojas para valores excesivos, amarillas para valores bajos
  - **Botones**: "Restablecer" (limpia campos), "Aplicar al Tratamiento" (transfiere valores al formulario)
- **Test IDs**: `btn-calculadora`, `btn-reset-calculadora`
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Albaranes vinculados a Contratos (23/02/2026)
- **Archivo modificado**: `/app/frontend/src/pages/Albaranes.js` (reescrito completamente)
- **Modelo actualizado**: `/app/backend/models_tratamientos.py` - `AlbaranCreate`
- **Cambios principales**:
  - Albaranes ahora se vinculan obligatoriamente a un Contrato
  - Al seleccionar un contrato, se heredan automáticamente:
    - Proveedor (referencia)
    - Cultivo
    - Parcela
    - Campaña
  - Panel verde "Datos del Contrato (referencia)" muestra los datos heredados
  - Filtros de búsqueda de contratos: Proveedor, Cultivo, Campaña, Parcela
  - Filtros de búsqueda de albaranes: Tipo, Contrato, Proveedor, Cultivo
  - Líneas del albarán con unidades (kg, ud, L, cajas, pallets)
  - Cálculo automático de totales por línea y total del albarán
- **Proveedor alternativo (24/02/2026)**:
  - Checkbox "Usar otro proveedor" permite seleccionar un proveedor diferente al del contrato
  - El albarán puede ser de una compra a otro proveedor pero el gasto repercute en el contrato
  - Dropdown de proveedores disponibles (registrados + de contratos existentes)
  - Indicador visual (fondo amarillo) cuando se usa un proveedor diferente
  - Mensaje informativo: "Este proveedor es diferente al del contrato. El gasto aún se imputará al contrato X"
- **Estado**: ✅ COMPLETADO

## Informes de Gastos (24/02/2026)
- **Nuevo Módulo**: `/app/frontend/src/pages/InformesGastos.js`
- **Backend Router**: `/app/backend/routes_gastos.py`
- **Funcionalidades**:
  - Dashboard con KPIs: Total Gastos, Albaranes, Proveedores, Cultivos
  - Filtros por fecha (desde/hasta) y campaña
  - **Vista Tabla** (por defecto):
    - Gastos por Proveedor: Tabla con nombre, nº albaranes, total y porcentaje
    - Gastos por Contrato: Tabla con contrato, proveedor, cultivo, albaranes y total
    - Gastos por Cultivo: Tabla con cultivo, nº albaranes, total y porcentaje
    - Gastos por Parcela: Tabla con parcela, cultivo, albaranes, total y coste/ha
    - Secciones expandibles/colapsables (acordeón)
    - Detalle de albaranes: Al hacer clic en cualquier fila, muestra panel lateral con listado
  - **Vista Gráficos** (toggle en header):
    - Gráfico de barras horizontal: Gastos por Proveedor
    - Gráfico de pie: Distribución por Cultivo con leyenda
    - Gráfico de barras vertical: Gastos por Parcela (Top 10)
    - Usando librería Recharts
  - **Exportación**:
    - Excel (.xlsx): 5 hojas (Resumen, Por Proveedor, Por Cultivo, Por Parcela, Detalle Albaranes)
    - PDF: Informe formateado con KPIs, tablas por dimensión y footer
- **Endpoints API**:
  - `GET /api/gastos/resumen` - Resumen general con totales por dimensión
  - `GET /api/gastos/por-proveedor` - Detalle por proveedor
  - `GET /api/gastos/por-contrato` - Detalle por contrato
  - `GET /api/gastos/por-cultivo` - Detalle por cultivo
  - `GET /api/gastos/por-parcela` - Detalle por parcela (con coste/ha)
  - `GET /api/gastos/detalle-albaranes` - Lista filtrada de albaranes
  - `GET /api/gastos/campanas` - Lista de campañas disponibles
  - `GET /api/gastos/export/excel` - Exporta a Excel
  - `GET /api/gastos/export/pdf` - Exporta a PDF
- **Navegación**: Administración > Informes Gastos
- **Estado**: ✅ COMPLETADO

## Soporte Multi-idioma (24/02/2026)
- **Configuración i18n**: `/app/frontend/src/i18n/index.js`
- **Archivos de traducción**:
  - `/app/frontend/src/i18n/locales/es.json` - Español (predeterminado)
  - `/app/frontend/src/i18n/locales/en.json` - English
  - `/app/frontend/src/i18n/locales/fr.json` - Français
  - `/app/frontend/src/i18n/locales/de.json` - Deutsch
  - `/app/frontend/src/i18n/locales/it.json` - Italiano
- **Componente**: `/app/frontend/src/components/LanguageSelector.js`
- **Funcionalidades**:
  - Selector de idioma con banderas en la página de login (esquina superior derecha)
  - Selector de idioma compacto en el sidebar (junto al perfil de usuario)
  - Persistencia del idioma seleccionado en localStorage
  - Traducciones para:
    - Menú de navegación completo
    - Página de login
    - Mensajes comunes (guardar, cancelar, eliminar, etc.)
    - Nombres de módulos y campos
- **Dependencias añadidas**: i18next, react-i18next, i18next-browser-languagedetector
- **Estado**: ✅ COMPLETADO (estructura base, algunas páginas pendientes de traducir)

## Historial de Tratamientos por Parcela (23/02/2026)
- **Ubicación**: Modal en `/app/frontend/src/pages/Parcelas.js`
- **Backend**: Endpoint `/api/tratamientos/parcela/{parcela_id}/historial`
- **Funcionalidades**:
  - Botón de historial (icono reloj verde) en cada fila de parcela
  - Modal con información completa de la parcela
  - KPIs: Total tratamientos, Productos diferentes, Tipos de tratamiento
  - Tabla cronológica de todos los tratamientos:
    - Fecha de tratamiento y aplicación
    - Producto fitosanitario aplicado
    - Tipo de tratamiento (Herbicida/Insecticida/Fungicida/etc.)
    - Dosis aplicada
    - Superficie tratada
    - Nombre del aplicador
  - Lista de productos utilizados (badges)
  - Endpoint adicional `/api/tratamientos/resumen-campana/{campana}` para informes
- **Uso**: Cumplimiento normativo del cuaderno de campo
- **Estado**: ✅ COMPLETADO

## Base de Datos de Productos Fitosanitarios (23/02/2026)
- **Nuevo Módulo**: `/app/frontend/src/pages/Fitosanitarios.js`
- **Backend Router**: `/app/backend/routes_fitosanitarios.py`
- **Funcionalidades**:
  - CRUD completo de productos fitosanitarios
  - Filtros por tipo, búsqueda, estado
  - KPIs visuales por tipo de producto
  - Columnas configurables en tabla
  - Datos pre-cargados de productos oficiales españoles (32 productos)
  - Endpoint `/api/fitosanitarios/seed` para cargar datos iniciales
  - **Importación desde Excel/CSV**: Endpoint `/api/fitosanitarios/import`
    - Soporta archivos .xlsx, .xls, .csv
    - Mapeo automático de columnas comunes
    - Validación de datos y reporte de errores
    - Detección de duplicados por numero_registro
  - **Exportación a Excel**: Endpoint `/api/fitosanitarios/export`
  - **Plantilla de importación**: Endpoint `/api/fitosanitarios/template`
  - **Enlace al Registro MAPA**: Botón para acceder al registro oficial del Ministerio
- **Modelo de datos**:
  - `numero_registro`, `nombre_comercial`, `denominacion_comun`, `empresa`
  - `tipo`: Herbicida/Insecticida/Fungicida/Acaricida/Molusquicida/Fertilizante
  - `materia_activa`, `dosis_min`, `dosis_max`, `unidad_dosis`
  - `volumen_agua_min`, `volumen_agua_max`, `plagas_objetivo`, `plazo_seguridad`
- **Integración con Tratamientos**:
  - Al seleccionar producto en calculadora, se transfiere al formulario de tratamiento
  - Se muestra tarjeta verde con: Producto, Materia Activa, Dosis, Plazo Seguridad
  - Los datos se guardan en el tratamiento: `producto_fitosanitario_id`, `producto_fitosanitario_nombre`, etc.
- **Enlace en menú**: Catálogos > Fitosanitarios
- **Estado**: ✅ COMPLETADO
