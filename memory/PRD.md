# PRD - Cuaderno de Campo / Agricultural Field Management App

## Original Problem Statement
Desarrollar una aplicacion de campo para el sector de agricultura que permita realizar un Cuaderno de Campo completo; Contratos, Parcelas, Mapas, Fincas, Visitas, Tareas, Cosechas, Tratamientos, Irrigaciones, Recetas y Albaranes... Dashboard, Generacion de informes en pdf y Excel, panel de configuracion de usuarios y permisos de aplicacion. Acceso a la aplicacion con usuario y login. Aplicar integraciones con IA.

## Architecture
- **Frontend**: React (CRA) + Shadcn UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: OpenAI GPT-4o via Emergent LLM Key
- **Maps**: Leaflet + SIGPAC integration
- **PWA**: Service worker enabled for mobile

## Core Modules (All Implemented)
- Dashboard, Contratos, Parcelas, Fincas, Visitas, Tareas, Cosechas, Tratamientos, Irrigaciones, Recetas, Albaranes, Proveedores, Cultivos, Maquinaria, Fitosanitarios, TecnicosAplicadores, ArticulosExplotacion, Agentes, Clientes, RRHH, Usuarios

## Completed Features

### Column Configuration (P0) - DONE (2026-04-13)
- Generic ColumnConfigModal component and useColumnConfig hook
- Applied to ALL 12 table-based modules
- Server-side persistence in MongoDB per user

### Code Quality Cleanup - DONE (2026-04-14)
- Hardcoded secrets removed, 361 console.log removed, 160+ hook dependency warnings fixed
- Frontend compiles with 0 errors, 0 warnings

### Overhaul Modal Proveedores - DONE (2026-04-14)
- Professional tabbed modal (960px, 6 tabs)
- Dynamic arrays (Telefonos, Emails, Contactos)
- Nested CRUDs: Tipos Proveedor, Tipos Operacion, Formas de Pago, Tipos IVA
- Auto-incremental codigo_proveedor, Changelog automatico

### Overhaul Modal Clientes - DONE (2026-04-14)
- Same tabbed pattern as Proveedores (6 tabs)
- Tipos Cliente CRUD, Tipos Operacion, Formas de Pago, Tipos IVA (dynamic with gear icons)
- Changelog automatico

### Overhaul Modal Cultivos - DONE (2026-04-14)
- Converted from inline form to professional tabbed modal (3 tabs: Datos Generales, Detalles Tecnicos, Historial)
- Dynamic Tipos de Cultivo dropdown with gear icon management modal
- Auto-incremental codigo_cultivo
- Extended model: familia_botanica, nombre_cientifico, marco_plantacion, densidad_plantacion, profundidad_siembra, necesidades_riego, temperatura_optima, ph_suelo, temporada
- Changelog automatico (cultivo_changelog collection)
- Backend: /api/tipos-cultivo CRUD, /api/cultivos/{id}/changelog

### Formas de Pago & Tipos IVA (Shared Catalogs) - DONE (2026-04-14)
- Dynamic CRUD for Formas de Pago and Tipos de IVA
- Shared between Proveedores and Clientes modules
- Backend: /api/formas-pago, /api/tipos-iva
- Seeded defaults: 8 payment methods, 4 VAT types

### Other Completed
- Mobile UI Optimization, Dashboard Config Modal, Visitas Refactoring
- Spanish Number Formatting, RBAC system, Delete User functionality
- Map overlay fix, PWA optimization

### Overhaul Modal TecnicosAplicadores - DONE (2026-04-22)
- Converted inline form to professional tabbed modal (960px) with 3 tabs: Datos Personales, Datos Profesionales, Certificado
- Drag-and-drop certificate upload preserved inside dedicated tab
- Auto-calculated Fecha Validez (cert + 10 years) shown in Vigencia section

### Overhaul Modal Irrigaciones - DONE (2026-04-22)
- Converted "Nuevo Riego" inline form to professional tabbed modal (960px, 85vh)
- 5 tabs: General, Volumen y Coste, Datos Tecnicos, Planificacion, Observaciones
- Header with droplet icon and dynamic subtitle (cultivo + sistema)
- Standard footer with Cancelar / Crear Riego buttons
- Verified visually - all tabs render correctly

### Dashboard Widget "Proximos Riegos" - DONE (2026-04-22)
- New widget `DashboardProximosRiegosWidget.js` registered in dashboard config system
- Backend: added `proximos_riegos` to DEFAULT_WIDGETS (routes_dashboard.py, order 13)
- Consumes existing endpoint `/api/irrigaciones/planificadas?dias=7`
- 3 urgency tiers: Inminente (<=24h red) / Pronto (<=72h amber) / Programado (green)
- Badge "N en 24h" when there are imminent irrigations
- Clickable cards navigate to filtered /irrigaciones by parcela
- Empty state with CTA "Planificar riego"

### Modal Standardization Batch 2 - DONE (2026-04-22)
- **Tareas.js**: inline form converted to tabbed modal (960px, 85vh). 4 tabs: General, Parcelas y Descripción, Subtareas, Costes.
- **Tratamientos.js**: inline full-page form (`isFormMode` URL-based flow at /tratamientos/nuevo and /tratamientos/editar/:id) ELIMINATED. Now uses single tabbed modal (960px, 85vh) on /tratamientos. 4 tabs: General, Parcelas, Producto y Dosis, Aplicación. Deleted ~490 lines of duplicated full-page form. `handleNewTratamiento`, `handleEdit`, `handleCancelEdit` no longer navigate. Legacy URL /tratamientos/editar/:id still auto-opens edit modal via useEffect for bookmarks.
- Error banner rendered INSIDE modal (not behind overlay); auto-switches to Parcelas tab when parcelas validation fails.
- **Cosechas.js** and **Recetas.js**: already used the modal tabbed pattern (no changes needed).
- Tested with testing agent - 100% pass on frontend critical flows.

### Albaranes de Comision Module - DONE (2026-04-22)
- Auto-generates ACMs from purchase/sale albaranes (routes_albaranes_comision.py)
- Factura-Resumen PDF, Historico Liquidaciones, cross-linking to contracts & albaranes
- Reusable ColumnSettings.js (drag-and-drop, numeric position inputs, visibility toggles)
- Albaranes: column sorting, pagination, bulk delete with cascade to ACMs
- Contratos <-> Albaranes traceability via URL query filters
- Centralized numeric formatters: frontend utils/format.js + backend utils/formatters.py
- ComisionesGeneradas/Liquidaciones: Liquidar Pendientes bulk action, collapsible cards

## Pending/Blocked
- **Email Notifications (Resend)**: Blocked - waiting for RESEND_API_KEY
- **Weather Integration (OpenWeatherMap)**: Blocked - waiting for API key

## Upcoming Tasks
- P0: Preparar Despliegue a Produccion
- P1: Identificacion NFC para fichajes RRHH

## Credentials
- Admin: admin@fruveco.com / admin123
