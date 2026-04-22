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

## Pending/Blocked
- **Email Notifications (Resend)**: Blocked - waiting for RESEND_API_KEY
- **Weather Integration (OpenWeatherMap)**: Blocked - waiting for API key

## Upcoming Tasks
- P0: Preparar Despliegue a Produccion
- P1: Identificacion NFC para fichajes RRHH

## Credentials
- Admin: admin@fruveco.com / admin123
