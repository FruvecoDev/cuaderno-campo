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
