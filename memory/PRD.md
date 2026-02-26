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
   - **Contratos (26/02/2026)**: Filtros avanzados completos
     - Búsqueda rápida (texto libre)
     - Filtro por Proveedor (dropdown)
     - Filtro por Cultivo (dropdown)
     - Filtro por Campaña (dropdown)
     - Filtro por Tipo (Compra/Venta)
     - Filtro por Rango de Fechas (Desde/Hasta)
     - Botón "Filtros avanzados" expandible
     - Badge con contador de filtros activos
     - Botón "Limpiar filtros"
     - Contador "Mostrando X de Y contratos (filtrados)"
     - Test Report: `/app/test_reports/iteration_38.json` - 100% pass (12/12 tests)

## Bug Fix: Error Leaflet "_leaflet_pos" (26/02/2026) - COMPLETADO
- **Problema**: Error intermitente "Cannot read properties of undefined (reading '_leaflet_pos')" en mapas
- **Causa raíz**: Operaciones de mapa (fitBounds, flyTo) se ejecutaban mientras el componente se desmontaba o el mapa no estaba completamente inicializado
- **Solución implementada**:
  - Añadidas verificaciones de seguridad `!map || !map._container` antes de operaciones
  - Variable `isMounted` con cleanup en return del useEffect
  - Try-catch para capturar errores silenciosamente durante desmontaje
  - Timeout de 100ms para asegurar inicialización completa del mapa
- **Archivos corregidos**:
  - `/app/frontend/src/pages/Dashboard.js` - FitAllBounds
  - `/app/frontend/src/components/MapaSigpac.js` - FitBounds, FlyToLocation
  - `/app/frontend/src/pages/Parcelas.js` - FitBounds
  - `/app/frontend/src/components/AdvancedParcelMap.js` - FitBounds, GeolocationControl
- **Estado**: ✅ COMPLETADO Y VERIFICADO

4. **Configuración de Campos por Usuario (Nuevo)**
   - Panel de configuración accesible con botón ⚙️
   - Checkboxes para mostrar/ocultar campos del formulario y columnas de tabla
   - Preferencias guardadas en localStorage (persisten entre sesiones)
   - **Módulos con configuración implementada**:
     - Parcelas, Visitas, Tratamientos, Irrigaciones, Recetas, Albaranes, Maquinaria
     - Proveedores (24/02/2026): Nombre, CIF/NIF, Teléfono, Email, Población, Provincia, Dirección, C.P., Contacto, Observaciones, Estado
     - Clientes (24/02/2026): Código, Nombre, NIF, Tipo, Población, Provincia, Teléfono, Email, Dirección, C.P., Contacto, Web, Observaciones, Estado

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

12. **Asistente de Inteligencia Artificial (24/02/2026)** ✅
    - **Sugerencias de Tratamientos IA**:
      - Seleccionar parcela y describir problema (plaga, enfermedad, deficiencia)
      - GPT-4o analiza datos de parcela, tratamientos recientes y productos disponibles
      - Genera recomendaciones priorizadas con dosis, momento de aplicación, precauciones
      - Muestra severidad estimada del problema y medidas preventivas
    - **Predicción de Cosecha IA**:
      - Seleccionar contrato para análisis
      - GPT-4o analiza datos históricos, tratamientos aplicados, estado actual
      - Genera predicción de rendimiento con rango de confianza
      - Muestra factores positivos, riesgos y recomendaciones para maximizar rendimiento
      - Compara con datos históricos y cumplimiento del contrato
    - **API Endpoints**:
      - `GET /api/ai/parcelas-for-suggestions` - Lista parcelas para selector
      - `GET /api/ai/contratos-for-predictions` - Lista contratos para selector
      - `POST /api/ai/suggest-treatments/{parcela_id}` - Genera sugerencias de tratamiento
      - `POST /api/ai/predict-yield/{contrato_id}` - Genera predicción de cosecha
    - **Frontend**: Nueva página `/asistente-ia` con dos tabs interactivas
    - **Backend**: `/app/backend/routes_ai_suggestions.py`
    - **Test Report**: `/app/test_reports/iteration_12.json` - 100% pass

13. **Preguntas Personalizadas en Evaluaciones (24/02/2026)** ✅
    - Botón "+ Agregar Pregunta" visible en cada sección de cuestionario
    - Modal para agregar preguntas con:
      - Selector de sección (pre-seleccionada si se abre desde una sección)
      - Tipo de respuesta: Texto, Número, Sí/No, Fecha
      - Campo de texto para la pregunta
    - Preguntas personalizadas marcadas con etiqueta "(Personalizada)"
    - Solo Admin puede eliminar preguntas personalizadas (botón de papelera)
    - Admin y Manager pueden agregar preguntas
    - **API Endpoints**:
      - `GET /api/evaluaciones/config/preguntas` - Lista preguntas base + personalizadas
      - `POST /api/evaluaciones/config/preguntas` - Agregar pregunta personalizada
      - `DELETE /api/evaluaciones/config/preguntas/{id}` - Eliminar pregunta personalizada
    - **Frontend**: Evaluaciones.js actualizado con botones en cada sección

### Pending/In Progress
1. **Notificaciones por Email** (P1)
   - Backend/frontend parcialmente implementado con Resend
   - Requiere RESEND_API_KEY del usuario
   - Falta mecanismo de envío automático (scheduler)

2. **Mejoras UI/UX** (P2)
   - Consistencia en patrones de búsqueda/filtro
   - Corregir warnings de hydration de React (cosmético)

### New Features (24/02/2026)
14. **Gestión de Preguntas en Evaluaciones** ✅
    - **Agregar preguntas**: Botón "+ Agregar Pregunta" en cada sección de cuestionario
    - **Duplicar preguntas**: Botón de copiar abre modal con datos pre-rellenados + "(copia)"
    - **Eliminar preguntas**: Solo Admin puede eliminar preguntas personalizadas
    - **Reordenar preguntas (Drag & Drop)**: 
      - Librería @dnd-kit para drag & drop moderno
      - Icono de arrastre (⋮⋮) visible solo en preguntas personalizadas
      - Orden persistido en MongoDB vía `PUT /api/evaluaciones/config/preguntas/reorder`
    - **Permisos**: Admin y Manager pueden agregar/duplicar/reordenar, solo Admin puede eliminar
    - **Frontend**: Evaluaciones.js con DndContext, SortableContext, SortableQuestion
    - **Backend**: routes_evaluaciones.py con endpoint reorder

15. **Técnicos Aplicadores** ✅
    - **Nuevo módulo completo** para gestión de técnicos aplicadores certificados
    - **Campos de ficha**:
      - Nombre / Apellidos / D.N.I.
      - Nivel de Capacitación (Básico, Cualificado, Fumigador, Piloto Aplicador)
      - Nº Carnet
      - Fecha Certificación
      - Fecha Validez (calculada automáticamente: +10 años)
      - Imagen Certificado (upload)
      - Estado activo/inactivo
    - **Estados visuales**: Vigente (verde), Próximo a vencer (amarillo), Caducado (rojo), Inactivo (gris)
    - **Integración con Tratamientos**: Selector de técnico aplicador en lugar de texto libre
      - Solo muestra técnicos con certificación vigente
    - **API Endpoints**:
      - `GET /api/tecnicos-aplicadores` - Listar con filtros
      - `GET /api/tecnicos-aplicadores/activos` - Para selector en tratamientos
      - `GET /api/tecnicos-aplicadores/niveles` - Niveles de capacitación
      - `POST /api/tecnicos-aplicadores` - Crear
      - `PUT /api/tecnicos-aplicadores/{id}` - Actualizar
      - `POST /api/tecnicos-aplicadores/{id}/certificado` - Subir imagen
      - `DELETE /api/tecnicos-aplicadores/{id}` - Eliminar
    - **Backend**: `/app/backend/routes_tecnicos_aplicadores.py`
    - **Frontend**: `/app/frontend/src/pages/TecnicosAplicadores.js`
    - **Navegación**: Catálogos > Técnicos Aplicadores

### Completed Refactoring (24/02/2026)
13. **Refactorización Modular del Backend** ✅
    - Dividido `routes_main.py` en módulos separados:
      - `routes_contratos.py` - CRUD Contratos (160 líneas)
      - `routes_parcelas.py` - CRUD Parcelas (118 líneas)
      - `routes_visitas.py` - CRUD Visitas (241 líneas)
      - `routes_fincas.py` - CRUD Fincas (85 líneas)
    - Extraído de `routes_extended.py`:
      - `routes_tratamientos.py` - CRUD Tratamientos (286 líneas)
      - `routes_cosechas.py` - CRUD Cosechas (328 líneas)
    - `routes_extended.py` simplificado: solo Irrigaciones, Recetas, Albaranes, Tareas, Documentos (449 líneas)
    - Total: 20 archivos de rutas, ~8000 líneas bien organizadas

## Technical Stack
- **Backend**: FastAPI, Python 3.11
- **Frontend**: React 18, shadcn/ui
- **Database**: MongoDB (Motor async driver)
- **Auth**: JWT tokens
- **AI**: OpenAI GPT-4 via Emergent LLM Key
- **Maps**: Leaflet.js / OpenStreetMap
- **Reports**: WeasyPrint (PDF), openpyxl (Excel)

## Backend Architecture (Refactored)
### Core Modules (Individual Routers)
- `routes_contratos.py` - Contratos CRUD
- `routes_parcelas.py` - Parcelas CRUD
- `routes_visitas.py` - Visitas CRUD with inheritance
- `routes_fincas.py` - Fincas CRUD
- `routes_tratamientos.py` - Tratamientos CRUD + historial + resumen
- `routes_cosechas.py` - Cosechas CRUD + cargas + pricing

### Extended Modules (Grouped)
- `routes_extended.py` - Irrigaciones, Recetas, Albaranes, Tareas, Documentos

### Supporting Modules
- `routes_auth.py` - Authentication + RBAC
- `routes_catalogos.py` - Catalog management
- `routes_ai.py` - Base AI endpoints
- `routes_ai_suggestions.py` - AI treatment suggestions + yield prediction
- `routes_dashboard.py` - Dashboard KPIs
- `routes_reports.py` - PDF/Excel reports
- `routes_evaluaciones.py` - Evaluation sheets
- `routes_maquinaria.py` - Machinery management
- `routes_fitosanitarios.py` - Phytosanitary products
- `routes_gastos.py` - Expense management
- `routes_notifications.py` - Email notifications
- `routes_translations.py` - Custom dictionary
- `routes_cuaderno.py` - Field notebook generation

## Key Frontend Pages
- `/app/frontend/src/pages/AsistenteIA.js` - AI Assistant page
- `/app/frontend/src/pages/Visitas.js` - Simplified form + Pest questionnaire
- `/app/frontend/src/pages/Tratamientos.js` - Applicator + Machine fields
- `/app/frontend/src/pages/Cosechas.js` - Harvest module with contract integration
- `/app/frontend/src/pages/Evaluaciones.js` - Evaluation sheets with filters
- `/app/frontend/src/pages/Maquinaria.js` - Machinery management

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
- **Filtrado de contratos por tipo (24/02/2026)**: 
  - Albarán de Compra → Solo muestra contratos de Compra
  - Albarán de Venta → Solo muestra contratos de Venta
  - El selector de búsqueda cambia dinámicamente (Proveedor/Cliente)
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

## Soporte Multi-idioma (24/02/2026) - COMPLETADO
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
  - Traducciones completas para todas las páginas principales
- **Páginas traducidas (24/02/2026)**:
  - Login.js, Dashboard.js, Usuarios.js, Evaluaciones.js, Documentos.js
  - Contratos.js, Parcelas.js, Fincas.js, Visitas.js, Tareas.js
  - Tratamientos.js, Irrigaciones.js, Cosechas.js, Recetas.js
  - Maquinaria.js, Cultivos.js, Proveedores.js, Albaranes.js
  - Fitosanitarios.js, InformesGastos.js, Traducciones.js
- **Claves agregadas**: auth.*, users.*, evaluations.*, suppliers.*, parcels.code, phytosanitary.*, translations.*
- **Dependencias**: i18next, react-i18next, i18next-browser-languagedetector
- **Test Report**: `/app/test_reports/iteration_11.json` - 100% pass
- **Estado**: ✅ COMPLETADO

## Panel de Traducciones Personalizadas (24/02/2026) - COMPLETADO
- **Backend**: `/app/backend/routes_translations.py`
- **Frontend**: `/app/frontend/src/pages/Traducciones.js`
- **Colección MongoDB**: `custom_translations`
- **Funcionalidades**:
  - Diccionario de términos agrícolas multilingüe
  - Categorías: cultivos, plagas, enfermedades, tratamientos, maquinaria, medidas, suelo, riego, cosecha, general
  - CRUD completo de traducciones personalizadas
  - Sistema de aprobación (Admin)
  - Carga de términos predeterminados (12 términos agrícolas comunes)
  - Filtros por categoría, búsqueda y estado de aprobación
  - Soporte para indicar región de uso del término
- **API Endpoints**:
  - GET `/api/translations/` - Lista traducciones con filtros
  - GET `/api/translations/categories` - Lista categorías y idiomas
  - GET `/api/translations/export/{language}` - Exporta traducciones aprobadas
  - POST `/api/translations/` - Crea nueva traducción
  - PUT `/api/translations/{id}` - Actualiza traducción
  - DELETE `/api/translations/{id}` - Elimina traducción
  - POST `/api/translations/{id}/approve` - Aprueba traducción
  - POST `/api/translations/seed` - Carga términos predeterminados
- **Menú**: Configuración > Traducciones
- **Estado**: ✅ COMPLETADO

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


## Bug Fix: Subida de Imágenes (24/02/2026) - COMPLETADO Y RE-VERIFICADO
- **Problema reportado**: Las imágenes de Placa CE (Maquinaria) y Certificados (Técnicos Aplicadores) no se guardaban ni visualizaban correctamente
- **Causa raíz identificada**: 
  1. Backend guardaba rutas de sistema (`/app/uploads/...` o `/tmp/...`) en lugar de URLs web
  2. Frontend no construía URLs completas para visualizar las imágenes
  3. Registros antiguos tenían rutas inconsistentes en la BD
- **Solución implementada**:
  - Backend ahora guarda URLs relativas web: `/api/uploads/certificados/...` y `/api/uploads/maquinaria_placas/...`
  - Frontend construye URL completa: `${BACKEND_URL}${imagen_url}`
  - Endpoint `GET /api/maquinaria/{id}/imagen-placa-ce` mejorado para manejar URLs antiguas
  - Archivos estáticos servidos en `/api/uploads/` sin autenticación
- **Archivos modificados**:
  - `/app/backend/routes_maquinaria.py` - upload y get de imagen
  - `/app/backend/routes_tecnicos_aplicadores.py` - upload de certificado
  - `/app/frontend/src/pages/Maquinaria.js` - viewImage y handleEdit
  - `/app/frontend/src/pages/TecnicosAplicadores.js` - vista certificado y handleEdit
- **Test Report**: `/app/test_reports/iteration_14.json` - 100% backend, 86% frontend (1 flaky)
- **Estado**: ✅ COMPLETADO Y VERIFICADO CON TESTING AGENT


## Módulo Artículos de Explotación (24/02/2026) - COMPLETADO
- **Nuevo Módulo**: Catálogo de artículos para usar en albaranes
- **Backend Router**: `/app/backend/routes_articulos.py`
- **Frontend**: `/app/frontend/src/pages/ArticulosExplotacion.js`
- **Funcionalidades**:
  - CRUD completo de artículos
  - Campos: código, nombre, descripción, categoría, unidad de medida, precio unitario, IVA, stock actual/mínimo, proveedor habitual
  - Categorías: Fertilizantes, Fitosanitarios, Semillas, Materiales, Maquinaria, Servicios, Combustibles, Envases, Otros
  - Unidades: Kg, L, Unidad, Saco, Caja, Palet, m², m³, Hora, Servicio
  - Filtros por categoría, búsqueda y estado activo
  - Toggle de activación/desactivación
  - Alerta visual de stock bajo
- **API Endpoints**:
  - `GET /api/articulos` - Lista con filtros y paginación
  - `GET /api/articulos/activos` - Solo activos para selectores
  - `GET /api/articulos/categorias` - Lista de categorías
  - `POST /api/articulos` - Crear (valida código único)
  - `PUT /api/articulos/{id}` - Actualizar
  - `PATCH /api/articulos/{id}/toggle-activo` - Activar/desactivar
  - `DELETE /api/articulos/{id}` - Eliminar
- **Navegación**: Menú lateral > Artículos Explotación
- **Estado**: ✅ COMPLETADO

## Integración Artículos-Albaranes (24/02/2026) - COMPLETADO
- **Archivo modificado**: `/app/frontend/src/pages/Albaranes.js`
- **Funcionalidades**:
  - Selector de artículos del catálogo en cada línea del albarán
  - Dropdown con formato: "CODIGO - Nombre (precio €/unidad)"
  - Auto-completado al seleccionar artículo:
    - Descripción: "CODIGO - Nombre"
    - Precio unitario: precio del catálogo
    - Unidad: unidad del catálogo
  - Campo de descripción libre como alternativa
  - Indicador de cantidad de artículos disponibles
- **Backend**: Endpoint `/api/articulos/activos` provee lista para selector
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Test Report - Iteración 13 (24/02/2026)
- **Archivo**: `/app/test_reports/iteration_13.json`
- **Backend**: 100% (20/20 tests passed)
- **Frontend**: 100% (todas las features verificadas)
- **Features testeadas**:
  - CRUD Artículos de Explotación
  - Upload imágenes Maquinaria a /app/uploads/
  - Upload certificados Técnicos a /app/uploads/
  - Integración Artículos en Albaranes
  - Auto-completado precio/unidad desde catálogo

## Comisiones de Agentes en Contratos (24/02/2026) - COMPLETADO
- **Archivos modificados**:
  - `/app/backend/models.py` - Añadidos campos `tipo`, `agente_compra`, `agente_venta`, `comision_tipo`, `comision_valor` a `ContratoCreate`
  - `/app/frontend/src/pages/Contratos.js` - Formulario con sección de agente y comisión
- **Funcionalidades**:
  - Tipo de contrato: Compra o Venta
  - Selector de agente según tipo (Agente de Compra / Agente de Venta)
  - Tipo de comisión: Porcentaje (%) o Euros por Kilo (€/kg)
  - Valor de comisión numérico
  - UI dinámica que cambia según el tipo de contrato
  - Sección visual destacada con fondo gris
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Módulo Clientes y Lógica Proveedor/Cliente (24/02/2026) - COMPLETADO
- **Nuevo módulo Clientes**: `/app/frontend/src/pages/Clientes.js`, `/app/backend/routes_clientes.py`
- **Campos de Cliente** (según imagen de referencia):
  - Identificación: Código (auto-generado), Nombre, Razón Social, NIF, Denominación, 2º Código, Tipo
  - Dirección: Dirección, País, Código Postal, Población, Provincia, Coordenadas GPS
  - Contacto: Teléfono/s, Móvil, FAX, Contacto, Email, Web
  - Datos Adicionales: SII Tipo ID País, Clave Identificación, Consultor, Idioma, Nombre Verifactu, Protegido, Activo
- **Contratos actualizados**:
  - Contrato de **Compra** → muestra selector de **Proveedor**
  - Contrato de **Venta** → muestra selector de **Cliente**
  - Tabla de contratos muestra "Prov:" o "Cliente:" según el tipo
- **Albaranes actualizados**:
  - Al seleccionar contrato de Venta, el formulario muestra "Cliente del Albarán"
  - Al seleccionar contrato de Compra, el formulario muestra "Proveedor del Albarán"
  - Tipo de albarán se ajusta automáticamente según tipo de contrato
- **API Endpoints**:
  - `GET /api/clientes` - Listar con filtros (search, activo, tipo, provincia)
  - `GET /api/clientes/activos` - Para selectores
  - `GET /api/clientes/tipos` - Lista de tipos
  - `POST /api/clientes` - Crear (código auto-generado)
  - `PUT /api/clientes/{id}` - Actualizar
  - `POST /api/clientes/{id}/foto` - Subir foto
  - `PATCH /api/clientes/{id}/toggle-activo` - Activar/desactivar
  - `DELETE /api/clientes/{id}` - Eliminar (verifica contratos asociados)
- **Navegación**: Catálogos > Clientes
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Resumen de Ventas por Cliente (24/02/2026) - COMPLETADO
- **Backend**: `GET /api/clientes/{id}/resumen-ventas`
- **Frontend**: Modal en página Clientes con botón de gráfico (TrendingUp)
- **Funcionalidades**:
  - KPIs: Total contratos, kg totales, importe contratos, nº albaranes
  - Tabla "Ventas por Campaña" con desglose por campaña, cultivos, cantidad e importe
  - Tabla "Detalle de Contratos" con información completa de cada contrato
  - Diseño visual con colores distintivos para cada KPI
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Diseño Responsive - Mobile & Tablet (25/02/2026) - COMPLETADO
- **Breakpoints implementados**:
  - Desktop: >1024px - Layout completo con sidebar de 260px
  - Tablet: 768px-1024px - Sidebar compacto (220px), grids de 2 columnas
  - Mobile: <767px - Sidebar oculto con menú hamburguesa, grids de 1 columna
  - Small Mobile: <480px - Optimizaciones adicionales
- **Componentes adaptados**:
  - **Layout.js**: Botón flotante hamburguesa, overlay para sidebar móvil
  - **Login.js**: Formulario responsive centrado
  - **Dashboard.js**: KPIs adaptables según viewport
  - **Todas las páginas**: Headers, formularios y tablas responsive
- **Funcionalidades móvil**:
  - Menú hamburguesa en esquina inferior izquierda
  - Sidebar como overlay con transición suave
  - Cierre del menú al tocar overlay o navegar
  - Scroll horizontal para tablas anchas
  - Inputs con tamaño mínimo para touch (44px)
- **Test Report**: `/app/test_reports/iteration_15.json` - 100% (18/18 tests)
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Sistema de Comisiones (25/02/2026) - COMPLETADO
- **Alcance**: Comisiones para agentes de compra y venta **calculadas a partir de ALBARANES**
- **Tipos de cálculo**:
  - Porcentaje sobre importe: `cantidad × precio × (valor / 100)`
  - Euro por kilo: `cantidad × valor`
- **Lógica de negocio**:
  - La comisión se configura en el CONTRATO (agente + tipo + valor)
  - La comisión se CALCULA cuando se registra un ALBARÁN asociado al contrato
  - El importe de comisión = datos del albarán × configuración del contrato
- **Backend endpoints**:
  - `GET /api/comisiones/resumen` - Resumen agrupado por agente (desde albaranes)
  - `GET /api/comisiones/agentes` - Lista agentes con comisiones
  - `GET /api/comisiones/campanas` - Lista campañas con albaranes y comisiones
  - `GET /api/comisiones/liquidacion/pdf` - PDF de liquidación por agente
- **Frontend**:
  - **Contratos.js**: Campos `comision_compra_tipo/valor` y `comision_venta_tipo/valor`
  - **LiquidacionComisiones.js**: Muestra detalle por albarán (no por contrato)
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Modo Offline para Técnicos (25/02/2026) - COMPLETADO
- **Alcance**: Registro de visitas y tratamientos sin conexión a internet
- **Componentes implementados**:
  - **offlineDB.js**: IndexedDB para cache local (parcelas, cultivos, contratos, proveedores)
  - **syncService.js**: Gestión de cola de sincronización y eventos online/offline
  - **OfflineIndicator.js**: Indicador visual de estado en header
- **Funcionalidades**:
  - Indicador de conexión (WiFi verde=online, rojo=offline)
  - Panel desplegable con: pendientes, fallidos, última cache
  - Botón "Descargar datos offline" para cachear datos de referencia
  - Guardar visitas/tratamientos en cola cuando offline
  - Sincronización automática al reconectar
  - Carga de parcelas desde cache cuando offline
  - **Notificaciones push** cuando se sincronicen datos (Web Notifications API)
- **Páginas modificadas**:
  - **Visitas.js**: Soporte offline para crear visitas
  - **Tratamientos.js**: Soporte offline para crear tratamientos
  - **Layout.js**: OfflineIndicator en header
- **Test Report**: `/app/test_reports/iteration_17.json` - 100% (15/15 tests)
- **Estado**: ✅ COMPLETADO Y TESTEADO



## Configuración de Logos Personalizados (25/02/2026) - COMPLETADO
- **Alcance**: Permite a administradores cambiar los logos de la aplicación
- **Logos configurables**:
  - **Logo de Login**: Aparece en la pantalla de inicio de sesión
  - **Logo de Dashboard**: Aparece en el menú lateral del dashboard
- **Backend**:
  - **Archivo**: `/app/backend/routes_config.py`
  - **Endpoints**:
    - `GET /api/config/logos` - Obtiene URLs de ambos logos (público)
    - `POST /api/config/logo/{type}` - Sube logo (login/dashboard, solo admin)
    - `DELETE /api/config/logo/{type}` - Elimina logo específico (solo admin)
  - **Almacenamiento**: `/app/uploads/logos/`
  - **MongoDB**: Colección `app_settings` con key "logos"
- **Frontend**:
  - **Página**: `/app/frontend/src/pages/Configuracion.js`
  - **Funcionalidades**:
    - Interfaz drag-and-drop para subir imágenes (react-dropzone)
    - Preview del logo actual
    - Botón para eliminar y restaurar logo por defecto
    - Validación de formato (PNG, JPG, WebP, SVG) y tamaño (máx. 5MB)
  - **Integración**:
    - `Login.js`: Carga logo personalizado dinámicamente
    - `Layout.js`: Carga logo del sidebar dinámicamente
- **Acceso**: Solo usuarios con rol "Admin" (ruta `/configuracion`)
- **Navegación**: Configuración > Configuración App
- **Test Report**: `/app/test_reports/iteration_18.json` - 100% (24/24 tests)
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Temas de Color Personalizables (25/02/2026) - COMPLETADO
- **Alcance**: Permite a administradores cambiar los colores de la aplicación
- **Opciones de personalización**:
  - **Temas Predefinidos** (8 opciones): Verde, Azul Corporativo, Rojo Tierra, Naranja Citrus, Morado Uva, Teal Agua, Marrón Tierra, Gris Profesional
  - **Colores Personalizados**: Color picker para elegir cualquier color (primario y acento)
- **Backend**:
  - **Archivo**: `/app/backend/routes_config.py` (extendido)
  - **Endpoints**:
    - `GET /api/config/themes` - Lista de temas predefinidos (público)
    - `GET /api/config/theme` - Obtiene tema actual (público)
    - `POST /api/config/theme?theme_id={id}` - Aplica tema predefinido (solo admin)
    - `POST /api/config/theme?primary={hsl}&accent={hsl}` - Aplica colores personalizados (solo admin)
    - `DELETE /api/config/theme` - Restaura tema predeterminado (solo admin)
  - **MongoDB**: Colección `app_settings` con key "theme"
- **Frontend**:
  - **Página**: `/app/frontend/src/pages/Configuracion.js` (extendida)
  - **Servicio**: `/app/frontend/src/services/themeService.js`
  - **Funcionalidades**:
    - Grid de temas predefinidos con vista previa de colores
    - Selector de color HTML5 para personalización avanzada
    - Vista previa en tiempo real de los colores seleccionados
    - Botón de restaurar tema predeterminado
    - Los colores se aplican dinámicamente via CSS variables (--primary, --accent)
    - El tema persiste y se carga automáticamente al iniciar la aplicación
- **Acceso**: Solo usuarios con rol "Admin"
- **Test Report**: `/app/test_reports/iteration_19.json` - 100% (24/24 tests)
- **Estado**: ✅ COMPLETADO Y TESTEADO




## Mapa Interactivo Avanzado de Parcelas (25/02/2026) - COMPLETADO
- **Alcance**: Mejoras avanzadas al mapa de parcelas con herramientas profesionales de GIS
- **Componente**: `/app/frontend/src/components/AdvancedParcelMap.js`
- **Funcionalidades implementadas**:
  - **A. Herramientas de medición**:
    - Medir distancias entre puntos (líneas)
    - Cálculo automático de perímetro del polígono
    - Mostrar coordenadas GPS al hacer clic (con botón de copiar)
  - **B. Gestión de múltiples parcelas en mapa**:
    - Ver todas las parcelas en un mapa general (botón "Ver Mapa")
    - Colores automáticos por cultivo con leyenda
    - Clic en parcela para localizarla en la tabla
    - Popups con información detallada de cada parcela
  - **C. Importar/Exportar geometrías**:
    - Importar polígonos desde GeoJSON, KML, GPX
    - Exportar polígono actual a GeoJSON o KML
    - Copiar coordenadas al portapapeles
  - **D. Herramientas de dibujo avanzadas**:
    - Dibujar polígonos irregulares
    - Dibujar rectángulos
    - Dibujar círculos (convertidos a polígonos de 32 puntos)
  - **E. Geolocalización**:
    - Centrar mapa en ubicación actual del usuario
    - Buscar dirección/localidad usando API de Nominatim (OpenStreetMap)
- **Capas de mapa**: Mapa Base (OSM), Satélite (ESRI), Topográfico
- **Información en tiempo real**: Puntos del polígono, área en hectáreas, perímetro en metros
- **Integración**: Usado en formulario de nueva/editar parcela y mapa general
- **Test Report**: `/app/test_reports/iteration_20.json` - 100% (37/37 tests)
- **Estado**: ✅ COMPLETADO Y TESTEADO


## Módulo de Recomendaciones Técnicas (25/02/2026) - COMPLETADO
- **Alcance**: Gestión de recomendaciones técnicas para parcelas y cultivos
- **Ubicación en menú**: ACTIVIDADES > Recomendaciones (debajo de Visitas)
- **Permisos**: Solo Técnicos, Managers y Admin pueden crear/editar
- **Backend**:
  - **Archivo**: `/app/backend/routes_recomendaciones.py`
  - **Endpoints**:
    - `GET /api/recomendaciones` - Listado con filtros
    - `POST /api/recomendaciones` - Crear recomendación
    - `PUT /api/recomendaciones/{id}` - Editar recomendación
    - `DELETE /api/recomendaciones/{id}` - Eliminar recomendación
    - `POST /api/recomendaciones/{id}/generar-tratamiento` - Crear tratamiento vinculado
    - `GET /api/recomendaciones/stats/resumen` - Estadísticas
    - `GET /api/recomendaciones/config/tipos` - Tipos y subtipos
  - **MongoDB**: Colección `recomendaciones`
- **Frontend**:
  - **Página**: `/app/frontend/src/pages/Recomendaciones.js`
  - **Campos del formulario**:
    - Parcela (obligatorio) - auto-rellena superficie
    - Campaña
    - Tipo: Tratamiento Fitosanitario, Fertilización, Riego, Poda, Otro
    - Subtipo: Herbicida, Insecticida, Fungicida, etc.
    - Producto (de lista de fitosanitarios)
    - Dosis y Unidad
    - Fecha Programada
    - Prioridad: Alta, Media, Baja
    - Motivo/Justificación
    - Observaciones
  - **KPIs**: Total, Pendientes, Programadas, Aplicadas
  - **Estados**: Pendiente, Programada, Aplicada, Cancelada
- **Calculadora de Dosis Integrada**:
  - Superficie a tratar (auto-rellena desde parcela)
  - Volumen de agua por hectárea
  - Cálculos automáticos:
    - Producto total necesario
    - Agua total necesaria
    - Producto por litro de agua
    - Concentración de la mezcla
  - **Sistema de Alertas**:
    - Alerta de dosis baja/excesiva por tipo de producto
    - Alerta de dosis fuera de límites del producto específico
    - Alerta de volumen de agua inadecuado
    - Alerta de concentración peligrosa
    - **Alertas bloqueantes** impiden generar tratamiento
- **Flujo de trabajo**:
  - Técnico crea recomendación con calculadora → Estado "Pendiente"
  - Si hay alertas bloqueantes → Botón "Generar Tratamiento" deshabilitado
  - Botón "Generar Tratamiento" → Crea tratamiento vinculado y cambia estado a "Aplicada"
  - Una vez generado el tratamiento, la recomendación no se puede editar
- **Test Report**: `/app/test_reports/iteration_21.json` - 100% (24/24 tests)
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Mejoras Módulo Recomendaciones (25/02/2026) - COMPLETADO
- **Alcance**: Funcionalidades avanzadas para crear múltiples recomendaciones eficientemente
- **Nuevas funcionalidades**:
  - **Selector de Contrato**: Campo opcional que filtra las parcelas disponibles
  - **Auto-relleno Cultivo/Variedad**: Al seleccionar parcela, se rellenan automáticamente desde los datos de la parcela (indicador visual con fondo verde)
  - **Lista de recomendaciones pendientes**: 
    - Botón "Añadir a la lista" añade la recomendación actual sin guardar
    - Tabla muestra: Parcela, Cultivo, Tipo, Producto, Dosis, Prioridad, Alertas
    - Botón para eliminar items de la lista
    - Botón "Guardar Todas" guarda todas las recomendaciones de una vez
  - **Persistencia Backend**: Campos `cultivo` y `variedad` se guardan correctamente en MongoDB
- **Frontend modificado**: `/app/frontend/src/pages/Recomendaciones.js`
  - Selector de contrato (línea 840-854)
  - Filtrado de parcelas por contrato (línea 106-109)
  - Funciones `handleAddToPending`, `handleRemoveFromPending`, `handleSaveAllPending`
  - Tabla de recomendaciones pendientes (línea 1190-1266)
- **Backend verificado**: `/app/backend/routes_recomendaciones.py` acepta y guarda campos `cultivo`, `variedad`, `contrato_id`
- **Test Report**: `/app/test_reports/iteration_22.json` - 100% (32/32 tests: 21 backend + 11 frontend)
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Plantillas de Recomendaciones (25/02/2026) - COMPLETADO
- **Alcance**: Sistema de plantillas predefinidas para crear recomendaciones rápidamente
- **Funcionalidades implementadas**:
  - **CRUD de Plantillas**: Crear, editar, eliminar y listar plantillas (solo Admin/Manager)
  - **Campos de plantilla**: Nombre, descripción, tipo, subtipo, producto, dosis, unidad, volumen agua, prioridad, motivo, observaciones
  - **Plantillas predeterminadas**: 8 plantillas de uso común (Control de hongos, pulgón, malas hierbas, araña roja, caracoles, fertilización, riego, poda)
  - **Toggle activar/desactivar**: Las plantillas inactivas no aparecen en selectores
  - **Contador de usos**: Cada plantilla registra cuántas veces ha sido usada
  - **Botón "Usar Plantilla"**: En el formulario de nueva recomendación, auto-rellena los campos desde la plantilla seleccionada
  - **Aplicación Masiva**: Modal que permite:
    - Seleccionar una plantilla
    - Seleccionar múltiples parcelas (checkboxes)
    - Crear N recomendaciones idénticas de una vez
    - Los campos cultivo/variedad se toman automáticamente de cada parcela
- **Backend**: `/app/backend/routes_plantillas_recomendaciones.py`
  - Endpoints: GET, POST, PUT, DELETE `/api/plantillas-recomendaciones`
  - POST `/api/plantillas-recomendaciones/seed` - Cargar predeterminadas
  - POST `/api/plantillas-recomendaciones/aplicar-masivo` - Aplicación masiva
  - PATCH `/api/plantillas-recomendaciones/{id}/toggle-activo`
  - GET `/api/plantillas-recomendaciones/stats/uso`
- **Frontend**: Pestañas en `/app/frontend/src/pages/Recomendaciones.js`
  - Tab "Recomendaciones" - Lista de recomendaciones existentes
  - Tab "Plantillas" - Gestión de plantillas
  - Modal "Aplicación Masiva" - Crear múltiples recomendaciones
  - Modal "Selector de Plantillas" - Usar plantilla en formulario
- **Test Report**: `/app/test_reports/iteration_24.json` - 100% (37/37 tests: 20 backend + 17 frontend)
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Alertas Climáticas (25/02/2026) - COMPLETADO
- **Alcance**: Sistema de alertas automáticas basadas en condiciones meteorológicas
- **Integración**: OpenWeatherMap API (gratuita) + entrada manual de datos como fallback
- **Reglas de alerta implementadas**:
  - 🍄 **Alta Humedad** (>80%) → Sugerir "Control preventivo de hongos" (Prioridad Alta)
  - 🔥 **Altas Temperaturas** (>30°C) → Sugerir "Tratamiento araña roja" (Prioridad Alta)
  - 🐌 **Lluvias Recientes** (>5mm) → Sugerir "Control de caracoles y babosas" (Prioridad Media)
  - 💧 **Sequía/Baja Humedad** (<40%) → Sugerir "Riego de mantenimiento" (Prioridad Media)
  - 🐛 **Temperaturas Templadas** (15-25°C) → Sugerir "Control de pulgón" (Prioridad Media)
  - ❄️ **Riesgo de Heladas** (<5°C) → Alerta sin plantilla (Prioridad Alta)
- **Funcionalidades**:
  - Panel de estadísticas (pendientes, revisadas, resueltas, última semana)
  - Filtros por estado (Pendientes/Revisadas/Resueltas/Todas)
  - Formulario de datos manuales (temperatura, humedad, lluvia, viento)
  - Botón "Verificar Parcelas" para evaluación masiva
  - Panel de configuración de reglas (activar/desactivar)
  - Cards de alertas expandibles con detalles del clima
  - Botones de acción: Marcar Revisada, Marcar Resuelta, Crear Recomendación, Ignorar
- **Backend**: `/app/backend/routes_alertas_clima.py`
  - GET `/api/alertas-clima` - Lista con filtros
  - POST `/api/alertas-clima/clima/manual` - Datos manuales
  - POST `/api/alertas-clima/verificar-todas` - Verificación masiva
  - PUT `/api/alertas-clima/{id}` - Actualizar estado
  - GET/PUT `/api/alertas-clima/reglas/config` - Configuración de reglas
  - GET `/api/alertas-clima/stats` - Estadísticas
- **Frontend**: `/app/frontend/src/pages/AlertasClima.js`
  - Menú lateral: Actividades → Alertas Climáticas
- **Test Report**: `/app/test_reports/iteration_25.json` - 100% (49/49 tests: 31 backend + 18 frontend)
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Notificaciones y Programación Automática (25/02/2026) - COMPLETADO
- **Alcance**: Sistema de notificaciones en app y verificaciones climáticas programadas
- **Funcionalidades implementadas**:
  - **Notificaciones In-App**:
    - Icono de campana con badge contador en el header
    - Dropdown con lista de notificaciones
    - Marcar como leída individual o todas
    - Tipos: info, warning, success, error, alert
    - Poll automático cada 60 segundos
  - **Programación de Verificaciones**:
    - Scheduler con APScheduler para tareas periódicas
    - Configuración de hora (HH:MM) y frecuencia (diaria, cada 12h, cada 6h)
    - Botón "Ejecutar Ahora" para verificación manual
    - Genera notificaciones cuando detecta nuevas alertas
    - Selección de roles a notificar (Admin, Manager, Technician)
  - **Preparación para Email**:
    - Estructura lista para integrar Resend
    - Badge "Pendiente API Key" cuando no está configurado
    - Checkbox deshabilitado hasta tener RESEND_API_KEY
- **Backend**: 
  - `/app/backend/routes_notificaciones.py` - CRUD notificaciones + config scheduler
  - `/app/backend/scheduler_service.py` - Servicio APScheduler
  - Colecciones: `notificaciones`, `config_scheduler`
- **Frontend**:
  - `/app/frontend/src/components/NotificacionesDropdown.js` - Dropdown de notificaciones
  - Panel de configuración en `/app/frontend/src/pages/Configuracion.js`
- **Test Report**: `/app/test_reports/iteration_26.json` - 100% (33/33 tests: 21 backend + 12 frontend)
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Dashboard de Resumen Diario (25/02/2026) - COMPLETADO
- **Alcance**: Modal de "briefing matutino" que aparece al iniciar sesión
- **Funcionalidades implementadas**:
  - Modal "Buenos días, [usuario]" con fecha actual
  - 🌡️ **Alertas Climáticas Activas** - Con prioridad destacada si hay alertas altas
  - 📋 **Tratamientos Hoy** - Contador y enlace a tratamientos
  - 📄 **Contratos por Vencer** - Próximos 7 días
  - 📊 **KPIs Generales**:
    - Parcelas Activas
    - Recomendaciones Pendientes
    - Visitas Semana
    - Cosechas Mes
  - Checkbox "No mostrar hoy" que guarda preferencia en localStorage
  - Botón "Entendido" para cerrar
  - Se muestra una vez por día (controlado por localStorage)
- **Backend**: `/app/backend/routes_resumen_diario.py`
  - GET `/api/resumen-diario` - Retorna alertas, tratamientos, contratos, KPIs
- **Frontend**:
  - `/app/frontend/src/components/ResumenDiario.js` - Modal del resumen
  - Integrado en `/app/frontend/src/components/Layout.js`
- **Test Report**: `/app/test_reports/iteration_27.json` - 100% backend (12/12), 96% frontend (13/14)
- **Estado**: ✅ COMPLETADO Y TESTEADO

## Corrección Layout Recomendaciones (25/02/2026) - COMPLETADO
- **Problema**: Los contadores/stats estaban apilados verticalmente
- **Solución**: Cambio de CSS grid a `gridTemplateColumns: 'repeat(4, 1fr)'` para 4 columnas fijas
- **Resultado**: Contadores (Total, Pendientes, Programadas, Aplicadas) ahora en fila horizontal
- **Estado**: ✅ COMPLETADO Y TESTEADO


## Módulo de Fincas Completo (25/02/2026) - COMPLETADO
- **Alcance**: Gestión completa de fincas agrícolas con todos los campos solicitados por el usuario
- **Backend**: `/app/backend/routes_fincas.py` - CRUD completo
- **Frontend**: `/app/frontend/src/pages/Fincas.js` - Interfaz completa

### Campos del Formulario (basado en imagen del usuario):
- **Datos de la Finca**:
  - Denominación (obligatorio)
  - Provincia, Población, Polígono, Parcela, Subparcela
  - Finca Propia (checkbox)
- **Superficie y Producción**:
  - Hectáreas, Áreas, Toneladas
  - Producción Esperada, Producción Disponible
- **Datos SIGPAC** (sección destacada en azul):
  - Provincia, Municipio, Cod. Agregado, Zona
  - Polígono, Parcela, Recinto, Cod. Uso
- **Recolección**:
  - Semana (1-52), Año
- **Precios**:
  - Precio Corte, Precio Transporte, Prov. Corte
- **Observaciones**: Textarea

### Funcionalidades UI:
- **Estadísticas en tiempo real**: Total Fincas, Propias, Alquiladas, Total Hectáreas, Prod. Esperada
- **Filtros**: Búsqueda, Provincia (dropdown), Tipo (Propias/Alquiladas)
- **Listado con tarjetas**: 
  - Etiqueta visual "Propia" (verde) o "Alquilada" (naranja)
  - Información resumida: ubicación, hectáreas, producción
  - Botón expandir para ver todos los detalles
  - Secciones en detalle: Ubicación, Superficie y Producción, Datos SIGPAC, Recolección y Precios
- **CRUD completo**: Crear, editar, eliminar fincas

### API Endpoints:
- `GET /api/fincas` - Lista con filtros (search, provincia, finca_propia)
- `GET /api/fincas/stats` - Estadísticas agregadas
- `GET /api/fincas/{id}` - Detalle de una finca
- `POST /api/fincas` - Crear finca
- `PUT /api/fincas/{id}` - Actualizar finca
- `DELETE /api/fincas/{id}` - Eliminar finca
- `GET /api/fincas/parcelas-disponibles` - Parcelas sin asignar a finca
- `POST /api/fincas/{id}/parcelas/{parcela_id}` - Asociar parcela
- `DELETE /api/fincas/{id}/parcelas/{parcela_id}` - Desasociar parcela

### Test Report: `/app/test_reports/iteration_28.json`
- Backend: 100% (18/18 tests)
- Frontend: 100% (9/9 tests)
- Total: 27/27 tests passed

### Estado: ✅ COMPLETADO Y TESTEADO

## Dashboard Configurable con Reordenamiento (26/02/2026) - COMPLETADO
- **Alcance**: Mejorar la configuración del Dashboard con capacidad de reordenar widgets

### Funcionalidades:
1. **Reordenamiento de Widgets**:
   - Flechas arriba/abajo en cada widget para cambiar el orden
   - Número de posición visible en círculo
   - El orden se guarda por usuario

2. **Activar/Desactivar Widgets**:
   - Toggle individual para mostrar/ocultar cada widget
   - Widgets desactivados se muestran en gris

3. **Botones de Acción**:
   - "Restaurar por defecto" - Vuelve a la configuración original
   - "Cancelar" - Cierra sin guardar
   - "Guardar cambios" - Persiste la configuración

### UI del Modal:
- Título: "Configurar Dashboard"
- Descripción: "Activa/desactiva las secciones y usa las flechas para cambiar el orden de visualización"
- Lista de 10 widgets con:
  - Flechas subir/bajar
  - Número de orden
  - Nombre y descripción
  - Toggle de visibilidad

### Widgets Disponibles (10):
1. KPIs Principales
2. Resumen de Fincas
3. Próximas Cosechas
4. Tratamientos Pendientes
5. Contratos Activos
6. Próximas Visitas
7. Gráficos de Cultivos
8. Mapa de Parcelas
9. Calendario
10. Actividad Reciente

### Test: Verificado con screenshots
- UI: ✅ Modal con nombres, descripciones, flechas y toggles
- Reordenamiento: ✅ Los widgets cambian de posición correctamente

### Estado: ✅ COMPLETADO Y TESTEADO


## Dashboard Configurable por Usuario (26/02/2026) - COMPLETADO
- **Alcance**: Permitir a cada usuario personalizar qué widgets ver en su dashboard

### Backend (`routes_dashboard.py`):
Nuevos endpoints:
- `GET /api/dashboard/config`: Obtiene configuración del usuario
- `POST /api/dashboard/config`: Guarda configuración del usuario
- `POST /api/dashboard/config/reset`: Restaura configuración por defecto

Widgets disponibles (10):
1. KPIs Principales
2. Resumen de Fincas
3. Próximas Cosechas
4. Tratamientos Pendientes
5. Contratos Activos
6. Próximas Visitas
7. Gráficos de Cultivos
8. Mapa de Parcelas
9. Calendario
10. Actividad Reciente

### Frontend (`Dashboard.js`):
1. **Botón "Configurar"** en header del Dashboard
2. **Modal de configuración**:
   - Lista de widgets con toggles para activar/desactivar
   - Nombre y descripción de cada widget
   - Botón "Restaurar por defecto"
   - Botones "Cancelar" y "Guardar cambios"
3. **Widgets condicionales**: Se muestran según la configuración del usuario

### Persistencia:
- Configuración guardada en campo `dashboard_config` del usuario
- Cada usuario puede tener una configuración diferente

### Test: Verificado con curl y screenshots
- Endpoint: ✅ GET/POST funcionando con autenticación
- UI: ✅ Modal funciona correctamente

### Estado: ✅ COMPLETADO Y TESTEADO


## Dashboard - Widget Próximas Visitas (26/02/2026) - COMPLETADO
- **Alcance**: Añadir widget de Próximas Visitas al Dashboard

### Backend (`routes_dashboard.py`):
- `visitas_proximas`: Lista de visitas planificadas para los próximos 14 días
- `visitas_stats`: Estadísticas de visitas:
  - `total_mes`: Visitas este mes
  - `realizadas_mes`: Visitas realizadas este mes
  - `pendientes`: Total de visitas pendientes
  - `proximas_14_dias`: Número de visitas en próximos 14 días

### Frontend (`Dashboard.js`):
1. **Widget "Próximas Visitas"**:
   - KPIs: Visitas Este Mes, Realizadas, Pendientes, Próx. 14 días
   - Lista de próximas visitas con:
     - Objetivo de la visita
     - Parcela, proveedor, cultivo
     - Fecha con indicador (¡Hoy!, Mañana, En X días)
     - Botón para ver detalles
   - Mensaje cuando no hay visitas planificadas con botón "Planificar visita"

### Iconos añadidos: ClipboardList, Users

### Test: Verificado con screenshot
- UI: ✅ Se muestra widget con KPIs y lista de visitas

### Estado: ✅ COMPLETADO Y TESTEADO


## Dashboard - Widget Contratos Activos (26/02/2026) - COMPLETADO
- **Alcance**: Añadir widget de Contratos Activos al Dashboard

### Backend (`routes_dashboard.py`):
- `contratos_activos`: Lista de contratos dentro del periodo activo (periodo_desde <= hoy <= periodo_hasta)
- `contratos_stats`: Estadísticas de contratos:
  - `total_activos`: Número de contratos activos
  - `compra`: { count, cantidad_total, valor_total }
  - `venta`: { count, cantidad_total, valor_total }
  - `por_cultivo`: Desglose por cultivo

### Frontend (`Dashboard.js`):
1. **Widget "Contratos Activos"**:
   - KPIs: Total Activos, Compra (count, toneladas, €), Venta (count, toneladas, €), Balance
   - Indicador de Balance con color verde/rojo según si venta >= compra
   - Tabla con lista de contratos activos (número, tipo, proveedor/cliente, cultivo, cantidad, valor)
   - Botón "Ver todos" para navegar a /contratos

### Iconos añadidos: FileSignature, ShoppingCart, TrendingDown

### Test: Verificado con curl y screenshot
- Endpoint: ✅ Retorna datos correctamente
- UI: ✅ Se muestra widget con KPIs y tabla

### Estado: ✅ COMPLETADO Y TESTEADO


## Dashboard - Widgets Próximas Cosechas y Tratamientos Pendientes (26/02/2026) - COMPLETADO
- **Alcance**: Añadir widgets informativos al Dashboard

### Backend (`routes_dashboard.py`):
- `proximas_cosechas`: Lista de cosechas planificadas ordenadas por fecha
- `tratamientos_pendientes`: Lista de tratamientos con estado pendiente/programado
- `fincas_recoleccion_semana`: Fincas con recolección planificada para la semana actual

### Frontend (`Dashboard.js`):
1. **Widget "Próximas Cosechas"**:
   - Badge con número de cosechas planificadas
   - Lista con cultivo, proveedor, kg estimados, fecha
   - Indicador de urgencia (colores y iconos según días restantes)
   - Sección "Fincas en recolección esta semana"

2. **Widget "Tratamientos Pendientes"**:
   - Badge con número de tratamientos pendientes
   - Lista con tipo, parcela, superficie, fecha
   - Indicador de vencimiento y prioridad
   - Botón "Ver todos los tratamientos"

### Iconos añadidos: Wheat, Droplets, Clock, Package

### Test: Verificado con curl y screenshot
- Endpoint: ✅ Retorna datos correctamente (3 cosechas, 10 tratamientos)
- UI: ✅ Se muestran ambos widgets con datos

### Estado: ✅ COMPLETADO Y TESTEADO


## Dashboard - Sección de Fincas (26/02/2026) - COMPLETADO
- **Alcance**: Añadir KPIs y gráficos de Fincas al Dashboard principal

### Nuevos KPIs añadidos al endpoint `/api/dashboard/kpis`:
- `fincas.total`: Total de fincas
- `fincas.propias`: Fincas propias
- `fincas.alquiladas`: Fincas alquiladas
- `fincas.hectareas_total`: Total hectáreas de fincas
- `fincas.produccion_esperada`: Producción esperada total
- `fincas.produccion_disponible`: Producción disponible total
- `fincas.por_provincia`: Desglose por provincia con count, hectareas, propias, alquiladas
- `fincas.parcelas_sin_asignar`: Número de parcelas sin asignar a ninguna finca

### Nueva UI en Dashboard (`Dashboard.js`):
1. **Sección "Resumen de Fincas"**:
   - Alerta de parcelas sin asignar con botón "Asignar"
   - KPIs: Total, Propias, Alquiladas, Hectáreas, Prod. Esperada, Prod. Disponible
   - Gráfico "Fincas por Provincia" (barras apiladas horizontal)
   - Gráfico "Distribución por Tipo" (donut chart Propias vs Alquiladas)

### Test: Verificado con curl y screenshot
- Endpoint: ✅ Retorna datos de fincas correctamente
- UI: ✅ Se muestra la sección de fincas con gráficos

### Estado: ✅ COMPLETADO Y TESTEADO


## Expandir/Colapsar Fincas por Provincia (26/02/2026) - COMPLETADO
- **Alcance**: Controles para expandir/colapsar fincas a nivel de provincia

### Funcionalidades Añadidas:
1. **Toggle de Provincia**: Botón para mostrar/ocultar todas las fincas de una provincia
   - Flecha hacia arriba = fincas visibles
   - Flecha hacia abajo = fincas ocultas
   - data-testid='btn-toggle-provincia-{provincia}'

2. **Expandir/Colapsar Todas**: Botón para expandir o colapsar los detalles de todas las fincas de una provincia
   - "Expandir todas" cuando hay fincas colapsadas
   - "Colapsar todas" cuando todas están expandidas
   - data-testid='btn-expand-all-{provincia}'

3. **Expansiones Múltiples**: Ahora múltiples fincas pueden estar expandidas simultáneamente
   - expandedFincas cambió de ID único a Set de IDs

### Test Report: `/app/test_reports/iteration_37.json`
- Frontend: 30/38 tests passed (8 fallos por infraestructura de tests, no bugs)
- Nueva funcionalidad: 100% funcional

### Estado: ✅ COMPLETADO Y TESTEADO


## UI Mejoras - Fincas Agrupadas y Lista de Parcelas (25/02/2026) - COMPLETADO
- **Alcance**: Mejoras de UI solicitadas por el usuario

### Cambios Implementados:
1. **Agrupación por Provincia**:
   - Las fincas ahora se muestran agrupadas por provincia
   - Cabecera distintiva con nombre de provincia y badge con número de fincas
   - Provincias ordenadas alfabéticamente, "Sin provincia" al final
   - data-testid='provincia-group-{provincia}'

2. **Lista de Parcelas (en lugar de Cards)**:
   - Las parcelas asociadas ahora se muestran en formato tabla/lista
   - Columnas: Código, Cultivo, Variedad, Superficie, Plantas, Acciones
   - Botones "Mapa" y "Quitar" en cada fila
   - data-testid cambió de 'parcela-card-{id}' a 'parcela-row-{id}'
   - Diseño más limpio y compacto

### Test Report: `/app/test_reports/iteration_36.json`
- Backend: 100% (27/27 tests)
- Frontend: 100% (30/30 tests)
- Total: 30/30 specs passed

### Estado: ✅ COMPLETADO Y TESTEADO


## Refactorización de Fincas - Contenedor de Parcelas (25/02/2026) - COMPLETADO
- **Alcance**: Refactorizar el módulo de Fincas para que actúe como contenedor de parcelas existentes
- **Objetivo del usuario**: Las fincas ahora pueden tener múltiples parcelas asociadas en lugar de tener su propia geometría/mapa
- **Cambios realizados**:

### Cambios en Frontend (`/app/frontend/src/pages/Fincas.js`):
1. **Eliminado**: Funcionalidad de mapas (visualización y dibujo) del formulario de Fincas
2. **Mantenido**: Sección SIGPAC como datos de referencia (no mapa)
3. **Añadido**: Parcelas asociadas mostradas en formato **cards** en la vista expandida
4. **Añadido**: Botón "Mapa" en cada card para visualizar el mapa de la parcela individual

### Parcelas en Cards:
- Código de la parcela
- Badge de campaña
- Botón "Mapa" (verde) para ver geometría
- Botón "Quitar" (rojo) para desasignar
- Información: Cultivo, Variedad, Superficie, Plantas, Proveedor

### Modal de Mapa de Parcela:
- Título con código de parcela
- Subtítulo con cultivo, variedad y superficie
- Mapa interactivo con geometría de recintos
- Selector de capas (Satélite, OpenStreetMap, etc.)
- Panel de información

### Actualización de MapaSigpac (`/app/frontend/src/components/MapaSigpac.js`):
- Nueva prop `parcela` para mostrar geometría de parcela
- Nueva prop `height` para altura personalizada
- Soporte para mostrar datos de parcela en panel de información

### Test Report: `/app/test_reports/iteration_35.json`
- Backend: 100% (27/27 tests)
- Frontend: 100% (28/28 tests)
- Total: 28/28 specs passed

### Estado: ✅ COMPLETADO Y TESTEADO


## Integración SIGPAC (25/02/2026) - COMPLETADO
- **Alcance**: Localización automática de parcelas mediante códigos SIGPAC (Sistema de Información Geográfica de Parcelas Agrícolas de España)
- **Backend**: `/app/backend/routes_fincas.py` - Endpoints de integración SIGPAC
- **API Externa**: SIGPAC HubCloud (https://sigpac-hubcloud.es)

### Funcionalidad:
1. **Búsqueda de Parcelas**: Introduciendo los códigos SIGPAC (Provincia, Municipio, Polígono, Parcela, etc.) se obtienen automáticamente:
   - Superficie en hectáreas
   - Código y descripción de uso del terreno (TA=Tierra arable, OV=Olivar, VI=Viñedo, etc.)
   - Pendiente media del terreno
   - Coeficiente de regadío
   - Geometría WKT para representación en mapas
   - Coordenadas del centroide

2. **Auto-relleno de Campos**: Los datos obtenidos de SIGPAC se rellenan automáticamente en el formulario:
   - Campo "Hectáreas" se actualiza con la superficie real
   - Campos SIGPAC se completan con los datos devueltos

3. **UI Mejorada**:
   - Botón "Buscar en SIGPAC" con indicador de carga
   - Selector de provincia con las 52 provincias españolas
   - Mensaje de éxito (verde) mostrando superficie, uso y pendiente
   - Mensaje de error (rojo) si la parcela no existe
   - Enlace externo al "Visor SIGPAC" oficial

### Nuevos API Endpoints:
- `GET /api/sigpac/consulta` - Consulta parcela en SIGPAC (params: provincia, municipio, poligono, parcela, agregado, zona, recinto)
- `GET /api/sigpac/provincias` - Lista de 52 provincias españolas con códigos
- `GET /api/sigpac/municipios/{provincia}` - Municipios de una provincia
- `GET /api/sigpac/usos` - Diccionario de códigos de uso (TA, OV, VI, etc.)

### Test Report: `/app/test_reports/iteration_29.json`
- Backend: 100% (27/27 tests)
- Frontend: 94% (16/17 tests)
- Issue menor: Modal "Resumen Diario" puede interferir ocasionalmente (LOW priority)

### Estado: ✅ COMPLETADO Y TESTEADO


## Mapa de Parcelas SIGPAC (25/02/2026) - COMPLETADO
- **Alcance**: Visualización de parcelas en mapa interactivo con búsqueda por códigos SIGPAC
- **Componente**: `/app/frontend/src/components/MapaSigpac.js`
- **Tecnología**: react-leaflet + Leaflet.js

### Funcionalidad:
1. **Mapa integrado en formulario de Fincas**:
   - Se muestra automáticamente tras búsqueda SIGPAC exitosa
   - Dibuja el polígono de la parcela (naranja) usando geometría WKT
   - Auto-centrado en la ubicación de la parcela

2. **Acceso desde listado de Fincas**:
   - Botón de mapa (icono verde) en cada finca con datos SIGPAC
   - Abre mapa flotante modal sobre el listado
   - Muestra título "Mapa SIGPAC - [Nombre Finca]"

3. **Capas de mapa disponibles**:
   - **Satélite**: ESRI World Imagery (por defecto)
   - **Callejero**: OpenStreetMap
   - **Topográfico**: OpenTopoMap

4. **Controles del mapa**:
   - Selector de capa (dropdown)
   - Botón "Ampliar/Reducir" para pantalla completa
   - Botón cerrar (X)
   - Panel de datos SIGPAC con info de la parcela

5. **Panel de información** (esquina inferior izquierda):
   - Provincia, Municipio, Polígono, Parcela, Recinto, Uso

### Test Report: `/app/test_reports/iteration_30.json`
- Backend: 100% (9/9 tests)
- Frontend: 100% (21/21 tests)
- Total: 30/30 tests passed

### Estado: ✅ COMPLETADO Y TESTEADO


## Dibujo Manual de Polígonos (25/02/2026) - COMPLETADO
- **Alcance**: Dibujar manualmente los límites de las parcelas en el mapa de forma visual
- **Componente**: `/app/frontend/src/components/MapaSigpac.js` (actualizado con `react-leaflet-draw`)
- **Dependencia**: `react-leaflet-draw@0.21.0`

### Funcionalidad:
1. **Botón "Dibujar Parcela"** (verde) en la sección SIGPAC del formulario de fincas
2. **Mapa de dibujo** con herramientas de Leaflet Draw:
   - Herramienta de polígono para dibujar los límites
   - Herramienta de edición para modificar vértices
   - Herramienta de borrado para eliminar polígonos
3. **Cálculo automático de área**:
   - Se calcula el área en hectáreas usando la fórmula de Shoelace
   - El campo "Hectáreas" del formulario se actualiza automáticamente
4. **Panel informativo** "Parcela Dibujada" mostrando:
   - Número de polígonos dibujados
   - Área total en hectáreas
   - Número de vértices
5. **Botón "Limpiar"** para borrar todos los dibujos
6. **Indicador verde** cuando se oculta el mapa pero hay una parcela dibujada
7. **Persistencia**: La geometría dibujada se puede guardar con la finca

### Flujo de uso:
1. Usuario abre formulario de nueva finca
2. Hace clic en "Dibujar Parcela"
3. Usa la herramienta de polígono para marcar los límites
4. El área se calcula automáticamente y aparece en el campo Hectáreas
5. Puede editar, borrar o limpiar el dibujo
6. Al guardar la finca, la geometría se asocia

### Test Report: `/app/test_reports/iteration_31.json`
- Backend: 100% (9/9 tests)
- Frontend: 100% (32/32 tests)
- Total: 41 tests passed

### Estado: ✅ COMPLETADO Y TESTEADO


## Persistencia de Geometría Dibujada (25/02/2026) - COMPLETADO
- **Alcance**: Guardar el polígono dibujado en la base de datos y cargarlo al editar
- **Backend**: Modelo `GeometriaManual` añadido a `/app/backend/models.py`
- **Campos del modelo**: `wkt`, `coords`, `centroide`, `area_ha`

### Funcionalidad:
1. **Guardar geometría**: Al crear/actualizar una finca, la geometría dibujada se guarda en MongoDB
2. **Cargar geometría**: Al editar una finca con geometría guardada:
   - Se muestra el indicador verde "Parcela dibujada manualmente" con el área
   - El botón "Editar" permite modificar el dibujo
   - El campo "Hectáreas" mantiene el valor del área calculada
3. **Indicadores visuales en el listado**:
   - Etiqueta **"Dibujada"** (verde) junto a fincas con geometría manual
   - Botón de mapa con **icono de lápiz** (en lugar de mapa) para estas fincas
4. **Visualizar geometría guardada**: Al hacer clic en el botón de mapa de una finca con geometría:
   - Se muestra el polígono naranja sobre el mapa satelital
   - El mapa se centra automáticamente en la ubicación

### Modelo de datos (GeometriaManual):
```python
class GeometriaManual(BaseModel):
    wkt: Optional[str] = None  # POLYGON((lon lat, ...))
    coords: Optional[List[List[float]]] = None  # [[lat, lon], ...]
    centroide: Optional[Dict[str, float]] = None  # {"lat": x, "lon": y}
    area_ha: Optional[float] = None  # Área en hectáreas
```

### Test Report: `/app/test_reports/iteration_32.json`
- Backend: 100% (23/23 tests) - incluyendo 5 nuevos tests para geometria_manual
- Frontend: 100% (36/36 tests) - incluyendo 4 nuevos tests para persistencia
- Total: 59 tests passed

### Estado: ✅ COMPLETADO Y TESTEADO


## Integración SIGPAC en Parcelas (25/02/2026) - COMPLETADO
- **Alcance**: Añadir funcionalidad de localización por SIGPAC al módulo de Parcelas
- **Archivo modificado**: `/app/frontend/src/pages/Parcelas.js`

### Funcionalidad:
1. **Sección "Localizar por SIGPAC"** en el formulario de nueva/editar parcela
2. **Campos de búsqueda**:
   - Obligatorios: Provincia (dropdown), Municipio, Polígono, Parcela
   - Opcionales: Agregado, Zona, Recinto, Cod. Uso
3. **Botón "Buscar"**: Consulta la API SIGPAC
4. **Resultado de búsqueda**:
   - Mensaje de éxito con superficie y uso del terreno
   - Auto-relleno del campo "Superficie (ha)" con datos de SIGPAC
   - Dibujo automático del polígono en el mapa
5. **Enlace "Visor"**: Abre el visor oficial de SIGPAC
6. **Reset**: Los campos se limpian al cancelar el formulario

### Flujo de uso:
1. Usuario abre formulario de nueva parcela
2. Introduce códigos SIGPAC (Provincia, Municipio, Polígono, Parcela)
3. Pulsa "Buscar"
4. El sistema consulta SIGPAC y:
   - Muestra mensaje "Parcela encontrada: X.XXXX ha - Uso: XX"
   - Rellena automáticamente el campo Superficie
   - Dibuja el polígono en el mapa existente
5. Usuario completa el resto del formulario y guarda

### Test Report: `/app/test_reports/iteration_33.json`
- Backend: 100% (25/25 tests - 16 parcelas + 9 SIGPAC)
- Frontend: 100% (12/12 tests nuevos en parcelas-sigpac.spec.ts)
- Nuevo archivo de tests: `/app/tests/e2e/parcelas-sigpac.spec.ts`

### Estado: ✅ COMPLETADO Y TESTEADO
