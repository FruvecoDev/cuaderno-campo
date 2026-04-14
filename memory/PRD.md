# PRD - Cuaderno de Campo / Agricultural Field Management App

## Original Problem Statement
Desarrollar una aplicación de campo para el sector de agricultura que permita realizar un Cuaderno de Campo completo; Contratos, Parcelas, Mapas, Fincas, Visitas, Tareas, Cosechas, Tratamientos, Irrigaciones, Recetas y Albaranes… Dashboard, Generación de informes en pdf y Excel, panel de configuración de usuarios y permisos de aplicación. Acceso a la aplicación con usuario y login. Aplicar integraciones con IA.

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
- Generic `ColumnConfigModal` component and `useColumnConfig` hook
- Applied to ALL 12 table-based modules: Contratos, Proveedores, Clientes, Cultivos, ArticulosExplotacion, TecnicosAplicadores, Usuarios, RRHH, Albaranes, Fitosanitarios, Agentes, Maquinaria
- Features: Toggle column visibility, reorder columns with up/down arrows, Restaurar/Cancelar/Guardar buttons
- **Server-side persistence**: Column config saved per user in MongoDB (`user_column_config` collection) via API endpoints `GET/PUT /api/user-config/columns/{module}`
- localStorage used as cache with server as source of truth
- Parcelas and Tratamientos excluded (map/detail views, no tables)

### Code Quality Cleanup (2026-04-14)
- **Hardcoded secrets removed**: All 12+ test files now use `os.environ.get()` for credentials
- **Console statements removed**: 361 console.log/error/warn/debug removed from production code
- **Hook dependencies fixed**: All 160+ `useEffect` missing dependency warnings resolved (0 warnings)
- **Array index as key**: Fixed critical instances (chart cells, table rows) with stable keys
- Frontend compiles with **0 errors, 0 warnings**
- Added 3 missing items to ALL_MENU_ITEMS: Consulta SIGPAC, Comisiones Auto, Integración ERP
- Updated all 5 permission profiles (Técnico de Campo, Gestor Administrativo, Responsable RRHH, Supervisor Completo, Solo Consulta)
- Total: General (2), Gestión Principal (6), Actividades (7), Administración (10), Catálogos (8), Configuración (4) = 37 items

### Mobile UI Optimization - DONE
- MobileBottomNav, responsive headers, KPI grids, mobile CSS layout

### Dashboard Config Modal - DONE
- Widget visibility/ordering, styled action buttons

### Visitas Refactoring - DONE
- Reduced from 1921 to 447 lines, extracted subcomponents

### Spanish Number Formatting - DONE
- Contratos uses Spanish locale for EUR formatting (e.g., 4.250.000,00)

## Pending/Blocked
- **Email Notifications (Resend)**: Blocked - waiting for RESEND_API_KEY from user
- **Weather Integration (OpenWeatherMap)**: Blocked - waiting for API key from user

## Upcoming Tasks
- P0: Preparar Despliegue a Producción
- P1: Identificación NFC para fichajes RRHH
- P1: App móvil nativa (React Native) - PWA already optimized

## Credentials
- Admin: admin@fruveco.com / admin123
