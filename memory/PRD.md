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

### Generic TabbedModal Component - DONE (2026-04-22)
- New reusable shell `/app/frontend/src/components/TabbedModal.js` (~230 lines)
- Consolidates: overlay + backdrop blur + card (960px/85vh) + header (icon+title+subtitle+close) + tabs row + error banner + form + footer
- Props: open, onClose, icon, iconColor/iconBg, title, subtitle, tabs, activeTab, onTabChange, onSubmit, footer, error, testIdPrefix, maxWidth, showShortcutHints
- UX polish (auto-applied to all adopting modules):
  - **ESC key** closes modal
  - **Ctrl/Cmd+S** shortcut triggers form submit
  - **Entrance animations**: overlay fade-in (160ms) + card scale-in (200ms cubic-bezier)
  - **Shortcut hints** rendered in footer (left side): `<kbd>⌘|Ctrl</kbd> <kbd>S</kbd> guardar · <kbd>Esc</kbd> cerrar`. Auto-detects Mac vs Windows/Linux.
- **Tareas.js** + **Tratamientos.js** migrated as proof-of-concept; remaining modules (Irrigaciones, Proveedores, Clientes, Cultivos, Técnicos, Cosechas, Recetas) can adopt incrementally
- Saves ~50 lines per module on migration; future UX improvements happen once in the shared component

### Contratos: Bulk Delete - DONE (2026-04-22)
- Contratos.js ahora usa `useBulkSelect` + `BulkActionBar` + `bulkDeleteApi('contratos')` del mismo patrón que Albaranes.
- ContratoTable.js acepta props bulk (canBulkDelete, selectedIds, onToggleOne, onToggleAll, allSelected, someSelected) y renderiza BulkCheckboxHeader + BulkCheckboxCell en primera columna cuando canBulkDelete.
- Filas seleccionadas resaltadas sutilmente. Modal de confirmación con mensaje "Se eliminarán N registros".
- Protegido por permiso backend `can_bulk_delete` (ya existente en rbac_guards y /api/bulk-delete/{module}).

### Contratos: Paginación - DONE (2026-04-22)
- Footer con paginación completa: "Mostrando X-Y de Total · Filas: selector (10/25/50/100/200)"
- Botones Primera (««), Anterior (‹), indicador "Página N / Total", Siguiente (›), Última (»»)
- `pageSize` default 25. `useBulkSelect` ahora opera sobre la página visible (paginatedContratos)
- Mismo patrón que Albaranes — data-testid: `select-page-size-contratos`, `pag-first-contratos`, `pag-prev-contratos`, `pag-next-contratos`, `pag-last-contratos`
- Footer solo se muestra cuando filteredContratos.length > 0

### Paginación: Roll-out a todos los módulos - DONE (2026-04-22)
- Creado componente reutilizable `/app/frontend/src/components/PaginationFooter.js` (~100 lines) + hook `usePagination(items, defaultPageSize)`
- Integrado en los 6 módulos restantes: **Visitas, Tratamientos, Cosechas, Tareas, Irrigaciones, Recetas**
- Todos los módulos ahora paginan automáticamente (pageSize default 25) y `useBulkSelect` opera sobre la página visible
- `PaginationFooter` retorna `null` cuando totalItems === 0 para no ocupar espacio en estado vacío
- data-testids consistentes: `pagination-footer-{modulo}`, `select-page-size-{modulo}`, `pag-first/prev/next/last-{modulo}`
- Verificado con Playwright en todos: footer presente, controles funcionales, labels correctos ("visitas", "tratamientos", "cosechas", "tareas", "irrigaciones", "recetas")
- **Total con paginación**: 8 módulos (Albaranes + Contratos + los 6 nuevos)

### Visitas: Bulk Delete - DONE (2026-04-22)
- Visitas.js + VisitasTable.js integrados con el mismo patrón. Nueva prop `bulkBar` en VisitasTable para renderizar la BulkActionBar dentro de la card (encima de la tabla) manteniendo cohesión visual.
- Endpoint `/api/bulk-delete/visitas` ya soportado en routes_bulk.py.
- Verificado: 25 visitas, selección múltiple, barra de acciones y confirmación funcionando.

### Bulk Delete: Roll-out a todos los módulos - DONE (2026-04-22)
- Integración completa del patrón `useBulkSelect + BulkActionBar + bulkDeleteApi` en los 5 módulos restantes:
  - **Recetas.js**: tabla inline, columna de checkboxes
  - **Irrigaciones.js**: tabla inline, columna de checkboxes
  - **Tratamientos.js**: componente externo TratamientosTable.js ampliado con props bulk
  - **Cosechas.js**: layout de cards, checkbox insertado en el header de cada card (junto al icono Package)
  - **Tareas.js**: layout de cards, checkbox a la izquierda del contenido de cada card
- Todos los módulos muestran la barra "N seleccionados — Deseleccionar / Eliminar (N)" con modal de confirmación
- Endpoints `/api/bulk-delete/{modulo}` ya soportados (routes_bulk.py ALLOWED_COLLECTIONS)
- Filas/cards seleccionadas resaltadas en azul claro
- Verificado con Playwright: todos renderizan checkbox header + bar al seleccionar
- Incidencias durante rollout: 2 ediciones search_replace corrompieron archivos (Recetas/Irrigaciones) al inyectar contenido duplicado al final. Se limpiaron con sed y se repitieron los inserts con patrones más pequeños.
- **Módulos ya integrados previamente**: Albaranes, Maquinaria, Parcelas, Clientes, Proveedores, Contratos, Visitas (7 más). Total: 12 módulos con bulk delete.

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

### ESLint Strict Config + Bug Hunt - DONE (2026-04-22)
- Nuevo /app/frontend/eslint.config.js (ESLint 9 flat config) con no-undef: error
- Detectó y corregidos 4 bugs latentes: Albaranes dead code, Cosechas/InformesIngresos key={var_inexistente}, Usuarios alignItems duplicado

### Charts Visual Polish (Informes Gastos + Ingresos) - DONE (2026-04-22)
- Pie charts convertidos en donuts con porcentajes blancos dentro de slices
- Leyenda vertical a la derecha con iconos circulares y nombres truncados
- Bar charts: width Y axis 180px, truncado inteligente, ticks rotados en parcelas
- Tooltips estilo profesional uniforme

### Playwright Visual Smoke Tests for Charts - DONE (2026-02-XX)
- Nuevo /app/tests/e2e/charts-visual.spec.ts (4 tests, 100% pasando, ~31s)
- Valida render de .recharts-wrapper + SVG con boundingBox > 0 en Dashboard, Informes Gastos e Informes Ingresos
- Detecta fallos silenciosos de Recharts (props inválidos) que ESLint no puede capturar
- Incluye assertion inteligente: pasa cuando hay "No hay datos" (empty state) vs fallo real de render
- Monitorea errores de consola relacionados con charts en las 3 páginas
- Script npm: `cd /app/tests && npm run test:charts`

### Pre-Deploy Pipeline - DONE (2026-02-XX)
- /app/scripts/pre-deploy-check.sh: verifica ESLint (errors), backend Python syntax, Playwright chart tests y build producción en un solo comando
- /app/.github/workflows/charts-visual-tests.yml: GitHub Actions que bloquea PRs a main si los chart tests fallan (trigger en cambios a páginas de charts o chartStyles.js)
- /app/docs/PRE_DEPLOY_CHECKLIST.md: documentación de uso + troubleshooting
- Validado end-to-end: los 4 pasos pasan verde localmente contra el backend real

### Production Readiness Audit - DONE (2026-02-XX)
- Auditoría completa con deployment_agent: PASS verde en todas las categorías
- Bug corregido: /api/auth/init-admin creaba admin con email `admin@agrogest.com`, ahora usa `admin@fruveco.com` (coincide con test_credentials.md y pantalla de login)
- Sin hardcoded URLs / secrets, env vars correctas, CORS OK, supervisor config válido, MongoDB via env
- App LISTA para "Deploy to Production" en Emergent

### NFC Admin UI (Asignación de tarjetas a empleados) - DONE (2026-02-XX)
- Backend ya existente (PUT/DELETE /api/rrhh/empleados/{id}/nfc + /api/rrhh/fichajes/nfc) con 17/17 tests pasando
- Nuevo bloque de gestión NFC en pestaña "Datos Laborales" del formulario de empleado (/app/frontend/src/pages/RRHH.js):
  - Input manual de ID de tarjeta
  - Botón "Leer NFC" usando Web NFC API (NDEFReader) si el navegador lo soporta
  - Botón "Asignar" que valida unicidad contra el backend
  - Botón "Eliminar" con confirmación
  - Mensajes inline de éxito/error
  - Aviso "Web NFC no disponible" en navegadores no compatibles (iOS/desktop)
- Solo disponible al editar un empleado ya guardado (backend necesita el ID)
- Test e2e Playwright /app/tests/e2e/rrhh-nfc.spec.ts pasa (asignar + eliminar)

### Code Quality Sweep (FASE 1 + 2 + 3d) - DONE (2026-02-XX)
**Bugs reales corregidos:**
- F601 (4 casos): Claves $ne duplicadas en diccionarios MongoDB en routes_alertas.py (2) y routes_gastos.py (4) → reemplazadas por $nin. La segunda $ne sobrescribía la primera, causando filtros incompletos.
- Admin email mismatch en routes_auth.py (agrogest → fruveco)

**Mejoras React:**
- Array-index keys reemplazados por IDs estables en 13 lugares de Dashboard.js, Recetas.js, Cosechas.js, InformesGastos.js (previene pérdida de estado en re-renders)
- useMemo añadido en 3 componentes críticos: GeoImportModal (suma áreas), MaquinariaHistorial (grouping+sort), ParcelasForm (filter contratos + fincas)

**Empty catch blocks → console.error:**
- 221 catch blocks vacíos arreglados automáticamente en 51 archivos del frontend
- Cada catch ahora emite `console.error('[filename]', errVar)` con contexto para debugging

**Auto-fixes Python (ruff):**
- 10 fixes automáticos aplicados (f-strings sin placeholders, variables no usadas)

**Validación:** 4/4 pasos del pre-deploy-check PASS, 5/5 Playwright, 17/17 backend NFC, ESLint 0 errors.

### Code Quality Sweep Round 2 - DONE (2026-02-XX)
**Production console silencer:**
- /app/frontend/src/index.js: en build de producción se silencian `console.log/info/warn/debug` (evita leaks e ruido a usuarios finales). `console.error` se mantiene activo para que Sentry/devtools muestren errores reales.
- Resuelve el conflicto del reporte previo: en dev los 221 console.error añadidos siguen ayudando al debug; en producción todo queda limpio.

**Array-index keys en 6 archivos nuevos:**
- AsistenteIA.js (11 cambios), Clientes.js (2), Proveedores.js (1), PortalEmpleado.js (3), VisitasForm.js (1), VisitasDetailModal.js (1)
- Reemplazados por combinación de `_id`/contenido + índice → keys estables que preservan estado entre renders.

### Sentry Error Monitoring Integration - DONE (2026-02-XX)
- Nuevo `/app/frontend/src/instrument.js`: SDK de Sentry inicializado solo si `REACT_APP_SENTRY_DSN` está seteado (gracefully no-op sin DSN)
- Configuración minimal: sin performance tracing, sin session replay, sin PII (`sendDefaultPii: false`, headers/cookies stripped en `beforeSend`)
- CaptureConsole integration: captura automáticamente los 221+ `console.error` de los catch blocks sin tocar ningún archivo
- Import como primera línea en `index.js` (hooks del runtime antes de React)
- `<SentryErrorBoundary>` envuelve la App con fallback UI elegante en español para errores de renderizado (solo activo si DSN configurado)
- Env var `REACT_APP_SENTRY_DSN=` añadida vacía en `/app/frontend/.env`
- Bundle impact: +40KB gzipped solo si DSN activo

**Backend (FastAPI):**
- Nuevo `/app/backend/sentry_init.py`: init con StarletteIntegration + FastApiIntegration
- Llamado desde `server.py` ANTES de crear la instancia FastAPI (para instrumentar middleware correctamente)
- Mismo enfoque minimal: sin tracing (traces_sample_rate=0), sin profiling, sin PII
- `before_send` strippa headers `Authorization`, `Cookie`, `X-API-Key` (evita leak de JWT)
- Captura excepciones no manejadas + respuestas HTTP 5xx automáticamente
- Env var `SENTRY_DSN_BACKEND=` vacía en `/app/backend/.env`
- `sentry-sdk==2.58.0` añadido a `requirements.txt`

**Documentación:**
- `/app/docs/SENTRY_SETUP.md` actualizado con instrucciones para ambos proyectos (frontend+backend) — 10 min para activar full-stack
- Validación: pre-deploy 4/4 verde, 5/5 Playwright, backend arranca limpio, DSN vacío en ambos lados = no-op completo

### Code Quality Sweep Round 3 + AlbaranForm refactor - DONE (2026-02-XX)
**Array-index keys en 6 archivos nuevos (13 cambios):**
- Fitosanitarios.js (1), AlbaranForm.js (2), VisitasAnalysisModal.js (3), CalculadoraFitosanitarios.js (1), GeoImportModal.js (3)
- Reemplazados por combinación de `_id`/contenido + índice.

**F632 (Python `is` vs `==`):**
- Verificado: no hay `is "literal_string"` reales en código productivo (solo `is True/False/None` en tests, que son PEP 8 válidos). No requiere cambios.

**AlbaranForm.js refactor (de 951 → 831 líneas):**
- Extraído `/app/frontend/src/components/albaranes/AlbaranPreciosCalidad.js` (58 líneas) — tabla de precios por tenderometría para guisante
- Extraído `/app/frontend/src/components/albaranes/AlbaranLineItem.js` (326 líneas) — cada fila del albarán (destare + producto normal), el componente más complejo del form
- Nuevo test e2e `/app/tests/e2e/albaran-form.spec.ts` valida que el form abre y renderiza correctamente tras el refactor
- Los data-testids existentes (`item-descripcion-N`, `item-cantidad-N`, etc.) mantienen compatibilidad total con tests anteriores
- Ventajas: código más testeable, sub-componentes reusables, archivo principal más legible
- Imports limpiados: eliminados `MinusCircle`, `Check`, `AlertTriangle`, `Search` del AlbaranForm (ahora solo los usa el sub-componente)

**Validación:** pre-deploy 4/4 verde, 6/6 Playwright (charts + NFC + nuevo albaran-form regression)


### Hoja de Evaluación — Pestaña "Impresos" - DONE (2026-06-26)
- Nueva pestaña "Impresos" en `EvaluacionesForm.js` junto a "Cuestionarios" (basada en PDF de referencia "Scan.pdf").
- Nuevo componente `/app/frontend/src/components/evaluaciones/EvaluacionesImpresos.js` con:
  - **Cabecera** auto-rellenable y editable: Comentarios, La plantación (Proveedor), Código Plantación, Finca, Cultivo, Variedad, Superficie + enlace "Ver parcela vinculada".
  - **Sección 1 — Análisis de suelo**: Sí/No archivado, medidas tomadas (texto), envases archivados Sí/No, libre de síntomas (Enfermedades/Plagas/Virus).
  - **Sección 2 — Pasos precampaña desinfección**: observaciones (texto largo).
  - **Sección 3 — Calibración y mantenimiento aparatos medición fito**: Vaso, Peso.
  - **Sección 4 — Calidad de cepellones**: Nº lote, envases archivados, certificado sanidad vegetal, certificado archivado, libre de síntomas.
  - **Sección 5 — Inspección maquinaria** (una sola máquina por evaluación): Tipo, Modelo, Nº serie, Sí/No para 4 verificaciones.
  - **Sección 6 — Observaciones generales** (texto libre).
- Auto-relleno desde Parcela cuando se selecciona (preserva ediciones manuales del usuario).
- Backend ya soportaba `impresos: Dict[str, Any]` en `EvaluacionCreate` (create/update endpoints persisten el campo).
- 30+ `data-testid` añadidos para automatización.
- **Testing**: testing_agent_v3_fork — backend 100%, frontend 100% (iteration_68.json). Pytest creado en `/app/backend/tests/test_evaluaciones_impresos.py`.

### Fix: Cuestionario de Plagas y Enfermedades en PDF Visitas - DONE (2026-06-29)
- **Bug**: la sección "CUESTIONARIO PLAGAS Y ENFERMEDADES" salía vacía en el PDF aunque el cuestionario estuviera relleno. Causa: el código hacía `if value:` lo que descarta `0` (Python falsy), y los valores son tri-estado 0/1/2.
- **Fix**: cambiado a `is not None`, renderizado en tabla 2 columnas, con etiquetas legibles "0 · Sin presencia / 1 · Presencia baja / 2 · Presencia alta" en colores (verde / naranja / rojo) y leyenda.
- **Testing**: análisis OCR del PDF generado (confianza 100%) — los 10 items aparecen con sus valores, leyenda visible, mismatches por visita detectados correctamente (ej. visita #7 muestra Mildiu+Pulgón en presencia baja).

### Aviso trazabilidad: Máquina no asignada al técnico - DONE (2026-06-29)
- Aviso visual amarillo en pestaña Aplicación de Tratamientos (`data-testid="warn-maquina-no-asignada"`) cuando la máquina elegida NO está en `tecnico.maquinas_ids`.
- Al pulsar Guardar/Actualizar, aparece `window.confirm` con mensaje "Esta máquina no está asignada al técnico... ¿Deseas continuar?": Cancel deja el modal abierto en pestaña aplicacion; OK persiste el tratamiento.
- No se muestra el aviso cuando hay match, o el técnico no tiene máquinas asignadas, o no se seleccionó máquina.
- **Testing**: testing_agent_v3_fork iteration_75 — 6/6 escenarios PASS, sin issues bloqueantes.

### Maquina asociada al Aplicador - DONE (2026-06-29)
- **Backend**: Añadido campo `maquinas_ids: List[str]` al modelo `TecnicoAplicadorCreate` (`routes_tecnicos_aplicadores.py`); POST/PUT persisten correctamente; endpoint `/activos` devuelve `maquinas_ids` en la proyección.
- **Frontend Técnicos Aplicadores**: Nueva pestaña "Maquinaria" con grid de checkboxes para asignar máquinas al técnico.
- **Frontend Tratamientos**: Selector "Máquina" ahora siempre visible en pestaña Aplicación. Cuando se selecciona un técnico con `maquinas_ids` asignados, la lista de máquinas se **filtra** a esas; sin asignaciones muestra todas las operativas. Hint contextual.
- **Bug crítico encontrado y resuelto**: `TratamientoCreate` Pydantic model carecía del campo `tecnico_aplicador_id` → Pydantic silenciosamente lo dropeaba del payload. Añadido en `/app/backend/models_tratamientos.py` línea 147. Test pytest específico creado: `test_tratamiento_aplicador_persistence.py` (4/4 PASS).
- **Testing**: testing_agent_v3_fork iteration_74 — backend 0 issues, frontend 0 issues, round-trip persistencia confirmada.

### Fix Vaso/Impresos cabecera — Eval con parcela_id huérfana - DONE (2026-06-29)
- **Causa raíz**: La evaluación COT-GUI-25-001 (id `6a3e4b01e223c5dd1673c04c`) tenía `parcela_id` huérfana apuntando a una parcela borrada → cabecera Impresos se mostraba vacía ("Sin datos en parcela/contrato") y al guardar la sincronización `impresosSync` SOBREESCRIBÍA los campos con strings vacías.
- **Fix 1 (datos)**: script `/app/scripts/relink_orphan_eval_parcela.py` ejecutado → eval COT re-vinculada a parcela existente `6a3e90f77b8cf2eb0d697bc1`.
- **Fix 2 (código defensivo)**: `Evaluaciones.js` `handleSubmit` ahora detecta `parcelaOk = !!parcela`; si la parcela no existe, **preserva** el `currentImp` y los campos top-level en lugar de wiparlos.
- **Testing**: `testing_agent_v3_fork` iteration_72 — backend 6/6 PASS, frontend 0 issues. PDF generado correctamente con cabecera completa (Proveedor=COTO DE MINGUILLO, Variedad=MUCIO, etc.) y Vaso preservado tras múltiples saves.

### Número de Visita correlativo por parcela - DONE (2026-06-26)
- Nuevo campo `numero_visita: Optional[int]` en modelo Visita (`models.py`).
- Auto-asignación en POST `/api/visitas`: si no se envía, calcula `max(numero_visita) + 1` para esa parcela (primera visita → 1).
- PUT `/api/visitas/{id}` permite override manual del número.
- Backfill ejecutado: `/app/scripts/backfill_numero_visita.py` numeró las 9 visitas existentes 1-9 en orden cronológico.
- Frontend: nueva columna "Nº" en tabla de Visitas (`VisitasTable.js`) y nuevo input "Nº Visita" en formulario (`VisitasForm.js` 4-col grid).
- PDF Cuaderno de Campo: índice muestra "Visita #N · Objetivo" y detalle muestra "VISITA #N · fecha".
- **Testing**: testing_agent_v3_fork iteration_71 — backend (POST/PUT/GET auto-assignment + override) y frontend (tabla + form + create→edit flow) PASS.

### Cuaderno de Campo PDF — Refactor completo - DONE (2026-06-26)
- **Orden cronológico ASC**: Visitas y Tratamientos ahora se ordenan de más antiguo a más nuevo (`sort(fecha, 1)`).
- **Tipo de tratamiento real**: Reemplazado el "Sin tipo" por `tipo_tratamiento — subtipo` (ej. "FITOSANITARIOS — Herbicida/Fungicida/Insecticida") tanto en índice como en detalle.
- **Eliminadas Irrigaciones y Cosechas**: removidas del índice, páginas, resumen y footer.
- **Ficha del Aplicador y Maquinaria consolidada**: una única página al FINAL del documento (en vez de 3 páginas por cada tratamiento), con aplicadores y máquinas únicos, fallback de nombres cuando no hay ficha completa, imágenes de certificados y placas CE embebidas.
- **Paginación dinámica**: CSS `@page` con `counter(page) "de" counter(pages)` → footer profesional "Página X de Y" correcto en todas las páginas.
- **Anexo en Impresos Sección 4**: si el anexo es imagen (image/*), se embebe en marco con borde y caption en el PDF.
- **Cabecera de portada profesional**: muestra Proveedor · Cultivo · Campaña.
- Estructura final: Portada+Resumen+Índice → Datos Generales → Plantación → Ubicación parcela → Toma de Datos (cuestionarios) → IMPRESOS (6 secciones) → Visitas (ASC) → Tratamientos (ASC) → Ficha Aplicador y Maquinaria (final).
- **Testing**: testing_agent_v3_fork iteration_70.json → 13/13 backend tests PASS. PDF 94KB, 14 páginas, todas las secciones en orden correcto.

### Adjuntar anexo en Sección 4 (Calidad de cepellones) - DONE (2026-06-26)
- Nuevo endpoint `POST /api/evaluaciones/anexos/upload` (PDF, imagen, Office; máx 15 MB; validación de content-type).
- Endpoint `DELETE /api/evaluaciones/anexos/{stored_name}` para eliminar.
- Archivos persisten en `/app/uploads/evaluaciones/anexos/<uuid>__<filename>` y se sirven vía StaticFiles (`/api/uploads/...`).
- UI en `EvaluacionesImpresos.js` Sección 4: botón "Adjuntar anexo" → muestra card con icono clip, nombre clicable (descargable), tamaño y botón eliminar.
- Metadata persistida en `impresos.calidad_cepellones.anexo = {filename, stored_name, url, size, content_type, uploaded_at, uploaded_by}`.
- PDF export de la evaluación incluye fila "Anexo adjunto" con nombre y tipo del archivo.
- Validado end-to-end: upload UI ✅, persistencia DB ✅, descarga static ✅, delete ✅, rechazo de tipos inválidos ✅.

### Cabecera "Impresos" sincronizada en vivo desde Parcela + Contrato - DONE (2026-06-26)
- Los 6 campos de cabecera (Proveedor, Código Plantación, Finca, Cultivo, Variedad, Superficie) ahora son **read-only** y se computan en vivo desde la Parcela y el Contrato vinculado.
- **Variedad** resuelta con misma lógica que `ParcelasForm`: si la parcela no la tiene, busca en el catálogo de cultivos y auto-selecciona si hay 1 sola variedad disponible (ej. GUISANTE VERDE → MUCIO).
- Al guardar, se sincronizan automáticamente en `impresos.*` y se añaden `parcela_id` y `contrato_id` para trazabilidad.
- PDF export usa `impresos.* OR evaluacion.*` para retro-compatibilidad con evaluaciones antiguas.
- Solo "Comentarios" y las 6 secciones técnicas (Análisis, Cepellones, etc.) siguen siendo editables.

### Fix: Fitosanitarios lista + detalle sin dosis/vol.agua/plazo/usos - DONE (2026-07-01)
- **Bug reportado**: tras importar 2055 productos + 60965 usos MAPA, la lista de Fitosanitarios mostraba columnas Dosis Mín/Máx, Vol. Agua y Plazo Seg. vacías. El modal de edición no mostraba las plagas × cultivos × dosis del producto.
- **Root cause**: la nueva arquitectura almacena dosis/vol.agua/plazo a nivel de USO (colección `fitosanitarios_usos`), no del producto raíz. La lista y el detalle no consultaban esa colección.
- **Fixes**:
  - **`GET /api/fitosanitarios`** ahora hace `$aggregate` sobre `fitosanitarios_usos` para enriquecer cada producto con `min(dosis_min)`, `max(dosis_max)`, `unidad_dosis`, `min/max(volumen_agua)`, `plazo_seguridad` y `usos_count`.
  - **`GET /api/fitosanitarios/{id}`** incluye array `usos` (hasta 500 elementos) + `usos_count`.
  - **Modal edit** (`Fitosanitarios.js`): nueva sección "Usos autorizados MAPA" con badge de count y tabla de 7 columnas (Cultivo, Plaga/Agente, Dosis, Vol. Agua, Plazo Seg., BBCH, Aplicaciones). Se carga en paralelo al abrir edit.
- **Follow-up fixes** (iteración 78):
  - Columna "Plazo Seg." concatenaba "d" en textos → "NO PROCEDEd". Ahora solo añade "d" si el valor es número.
  - Input plazo_seguridad `type=number` perdía "NO PROCEDE" → cambiado a `type=text`, placeholder "Ej: 21 días, NO PROCEDE, N.P.", Pydantic `Optional[int]` → `Optional[str]`.
- **Testing agent** (iteration_77 y 78): **PASS 100% backend + 100% frontend**. MICROTHIOL SPECIAL DISPERSS muestra 163 usos con dosis 0.25-1.25 %, vol.agua 500-1600 L/ha, plazo "NO PROCEDE". Test files creados: `/app/backend/tests/test_fitosanitarios_usos_mapa.py` y `test_fitosanitarios_plazo_string.py`.

### Calculadora Fitosanitaria: búsqueda inteligente por cultivo + plaga (MAPA) - DONE (2026-07-01)
- **Feature**: en la Calculadora de Fitosanitarios de Tratamientos, el técnico ahora puede introducir cultivo + plaga y el selector muestra **solo los productos autorizados oficialmente por el MAPA** con la dosis exacta.
- **Frontend** (`CalculadoraFitosanitarios.js`):
  - Nuevo panel azul "Buscar productos autorizados MAPA por cultivo + plaga" con dos inputs.
  - Cuando ambos rellenos → `GET /api/fitosanitarios/usos/buscar?cultivo=X&plaga=Y&tipo=T` filtra en tiempo real.
  - Al seleccionar producto → `GET /api/fitosanitarios/{id}/usos?cultivo=X&plaga=Y` carga el uso específico y autorrellena dosis, unidad, volumen de agua exactos + muestra badge "Uso MAPA: cultivo · plaga · BBCH · aplicaciones".
  - Pasa `plaga_a_controlar` al form de Tratamiento automáticamente.
- **Backend fix**: `MongoDB regex` no es accent-insensitive por defecto → los datos MAPA contienen "Oídio", "Pulgón", "Ácaro" con tildes pero el usuario escribe sin tildes. Añadido helper `_accent_insensitive_regex(s)` que sustituye vocales por char classes `[aáàäâ]`, `[oóòöô]`, etc. Aplicado a `/usos/buscar` y `/{id}/usos`.
- **Testing**: `?cultivo=Acelga&plaga=Oidio&tipo=Fungicida` devuelve THIOPRON 825, AMYLO-X WG, ARAW con dosis reales. Con `tipo=Insecticida` devuelve 0 (correcto, oidio es fungico). UI renderiza el panel con placeholders "Cultivo (ej. Trigo, Tomate)" y "Plaga (ej. Pulgón, Oidio)".
- data-testids: `input-mapa-cultivo`, `input-mapa-plaga`, `select-producto-mapa`.

### Fitosanitarios MAPA: nuevo modelo con Usos - DONE (2026-07-01)
- **Problema**: un mismo producto fitosanitario tiene decenas o cientos de usos autorizados con dosis distintas según cultivo + plaga. El modelo anterior sólo guardaba dosis única por producto.
- **Nuevo modelo**:
  - `fitosanitarios_collection` — 1 doc por producto único (por `numero_registro`). Metadata general: nombre_comercial, denominacion_comun, empresa, tipo, materia_activa, estado, fecha_caducidad, observaciones, `usos_count`.
  - **Nueva colección `fitosanitarios_usos_collection`** — 1 doc por combinación (producto + cultivo + plaga): `fitosanitario_id`, `numero_registro`, `nombre_comercial`, `cultivo`, `codigo_cultivo`, `plaga`, `codigo_agente`, `dosis_min`, `dosis_max`, `unidad_dosis`, `volumen_agua_min/max`, `volumen_caldo`, `plazo_seguridad`, `bbch`, `aplicaciones`, `intervalo_aplicaciones`, `condicionamiento_especifico`.
- **Nuevos endpoints**:
  - `GET /api/fitosanitarios/{id}/usos?cultivo=X&plaga=Y` — devuelve los usos autorizados del producto, filtrable por cultivo y/o plaga.
  - `GET /api/fitosanitarios/usos/buscar?cultivo=X&plaga=Y&tipo=Fungicida` — devuelve productos únicos autorizados para ese uso, con rango de dosis min/max encontrado (agg pipeline). Útil para calculadora "qué productos puedo usar contra X plaga en Y cultivo".
- **Import batch** `/app/scripts/import_fitosanitarios_mapa.py`:
  - Lee el Excel MAPA (60.966 filas) en streaming con `openpyxl read_only`.
  - Agrupa por `numero_registro` (2.055 productos únicos) y crea usos por fila.
  - `bulk_write` en chunks de 5.000 → **importación completa en 6.2 segundos**.
  - Crea índices: `fitosanitario_id`, `numero_registro`, `(cultivo, plaga)`, `nombre_comercial`, `tipo`.
- **Testing**: `MICROTHIOL SPECIAL DISPERSS` tiene 163 usos autorizados (Acelga/Achicoria/Ajete × Araña roja/Oídios/Ácaros eriófidos × 0.25-0.6%). Búsqueda inversa `?cultivo=Trigo&plaga=Coadyuvante` devuelve 3 productos con rango dosis.
- **Aumentado límite** de `GET /api/fitosanitarios` de 1000 → 10000 (había 2055 productos y solo se veían los 1000 primeros).

### Todos los proveedores marcados como tipo "Agricultor" - DONE (2026-07-01)
- Actualizada la migración masiva: 136 proveedores pasaron de "Materia Prima" (default de importación) a **"Agricultor"** — los 11 restantes ya lo tenían.
- **Import futuro** (`routes_contratos.py::resolve_proveedor`): default cambiado de `"Materia Prima"` → `"Agricultor"`.
- **Testing**: `GET /api/proveedores` devuelve `{'Agricultor': 147}` — 100% homogéneo.

### Fix: proveedores/cultivos importados sin código único y sin activo=True - DONE (2026-07-01)
- **Bug reportado**: los proveedores creados por la importación Excel aparecían todos con el mismo ID (vacío) y sin marca de activo.
- **Root cause**: `resolve_proveedor` insertaba directamente en Mongo sin generar `codigo_proveedor` ni fijar `activo=True`. La UI usa `codigo_proveedor` como "ID" visible.
- **Fix importación**: contador incremental local `codigo_counter` inicializado desde el máximo actual en BD → cada nuevo proveedor recibe `codigo_proveedor` único ("000001", "000002", …) y `activo: True`. Cultivos también con `activo: True`.
- **Backfill** `/app/scripts/backfill_proveedores_codigo_activo.py` ejecutado → 144 proveedores + 42 cultivos migrados.
- **Testing UI**: "Total Proveedores: 147 · Activos: 147", cada uno con ID único (000001..000147) y badge verde "Activo".

### Importación masiva de Contratos desde Excel - DONE (2026-07-01)
- **Nuevo endpoint** `POST /api/contratos/import-excel` acepta un `UploadFile` `.xlsx` con las columnas:
  `Numero Contrato · Tipo Contrato · Campaña · Procedencia · Fecha · Nombre Proveedor · Cultivo · Cantidad (Kg)`.
- **Lógica**:
  - Mapea headers de forma tolerante (normaliza a lowercase alfanumérico → acepta "Campaña"/"campana"/"CAMPAÑA").
  - Parsea `MP-{año}-{numero}` → `serie`, `año`, `numero`, `numero_contrato` (guarda alias `ano` sin tilde para compatibilidad con el frontend).
  - Parsea fecha `dd/mm/yyyy` → ISO `yyyy-mm-dd`.
  - **Auto-crea proveedores y cultivos** que no existen (búsqueda case-insensitive por `nombre`).
  - **Dedup** contra `numero_contrato` existente (evita reimportar).
  - Ignora filas de totales o vacías.
  - Devuelve `{imported, skipped_duplicates, created_proveedores, created_cultivos, errors[]}`.
- **Frontend** (`Contratos.js`): botón "Importar Excel" (icono Upload) junto a "Nuevo Contrato", protegido por `permission="create"`. Abre input file oculto, sube via multipart, muestra toast con resumen.
- **Testing end-to-end** con el fichero `CONTRATOS_MP.xlsx` del cliente (400 filas):
  - Importación 1: 397 importados, 3 duplicados, 144 proveedores nuevos, 42 cultivos nuevos, 0 errores.
  - Bug detectado y corregido: el frontend leía `c.ano` (sin tilde) → añadido alias `ano` en el doc.
  - Importación 2 (tras fix): mismo resultado, todos los números muestran "MP-2025-000001" correctamente en la UI.
- data-testids: `btn-import-excel-contratos`, `input-import-excel-contratos`.

### Duplicar Tratamiento: botón por fila con auto-clonado - DONE (2026-07-01)
- **Nueva acción "Duplicar"** en cada fila de la tabla de Tratamientos (icono `Copy`), entre editar y eliminar.
- **Flujo**: click Duplicar → modal "Crear Tratamiento" prellenado con:
  - Tipo, subtipo, método, aplicación_numero, superficie, caldo, dosis, producto, plaga, aplicador, máquina, materia activa, plazo seguridad, Nº registro → **heredados**.
  - `parcelas_ids` → heredadas pero **con purga de huérfanas** (mismo criterio del save-guard).
  - `fecha_tratamiento` → **hoy** (reseteada). `fecha_aplicacion` → vacía.
  - Estado (realizado/cancelado) → **limpio**, el clon empieza como pendiente.
  - `editingId = null` → POST al guardar.
- Toast: "Tratamiento duplicado. Ajusta los datos y guarda para crear el nuevo."
- Solo visible con permiso `canCreate`. data-testid: `duplicate-tratamiento-{id}`.
- **Testing via Playwright**: 3 botones detectados. Click abre modal "Crear Tratamiento" con datos heredados de ORTIVA y toast verde. Botón inferior es "Guardar Tratamiento" (no "Actualizar").

### Duplicar Visita: botón por fila con auto-clonado de datos - DONE (2026-07-01)
- **Nueva acción "Duplicar"** en cada fila de la tabla de Visitas (icono `Copy` de lucide entre editar y eliminar).
- **Flujo**: click Duplicar → abre modal "Nueva Visita" prellenado con:
  - `objetivo`, `parcela_id`, `observaciones`, `cuestionario_plagas` → **heredados** de la visita origen.
  - `fecha_visita` → **hoy** (reseteada).
  - `fecha_planificada`, `numero_visita` → **vacíos** (el backend asigna `numero_visita` como `max+1` en la parcela).
  - Fotos → **no se copian** (cada visita tiene su propio registro fotográfico).
  - `editingId = null` → al guardar se hace POST (crea nueva).
- **Toast informativo** "Visita duplicada. Ajusta los datos y guarda para crear la nueva."
- **Permisos**: botón solo visible si el usuario tiene `canCreate`.
- data-testid: `duplicate-visita-{id}`.
- **Testing via Playwright**: los 10 botones detectados, click en el primero → modal abierto con `fecha_visita = 2026-07-01`, objetivo "Plagas y Enfermedades", observaciones heredadas y toast verde visible. Botón `Crear Visita` (POST) no "Actualizar".

### Nueva Visita: objetivo predeterminado "Plagas y Enfermedades" - DONE (2026-07-01)
- Cambiado el valor default del campo `objetivo` en el formulario de Visitas de `'Control Rutinario'` a `'Plagas y Enfermedades'` (uso más frecuente).
- Aplicado en 3 lugares: `useState({...objetivo: ...})` inicial, `resetForm` (crear nueva), y fallback en `handleEdit` para visitas legacy sin objetivo.
- Efecto colateral positivo: la pestaña "Plagas" (cuestionario de plagas y enfermedades) aparece automáticamente ya que se muestra condicionalmente cuando `objetivo === 'Plagas y Enfermedades'`.
- **Testing**: Playwright confirma `select-objetivo` con `input_value() === 'Plagas y Enfermedades'` al abrir "Nueva Visita".

### Fix: aplicador duplicado en PDF (ficha vacía + ficha completa) - DONE (2026-07-01)
- **Bug reportado**: en la sección final "TÉCNICOS APLICADORES" del PDF, "Clemente Torres Martín" aparecía dos veces — la primera con todos los campos vacíos ("—") y la segunda con la ficha completa (DNI, Nº carnet, fechas, certificado).
- **Root cause**: el bucle en `routes_evaluaciones.py::PÁGINA FINAL` usaba `setdefault` con dos claves distintas para el mismo técnico: `str(_id)` cuando el tratamiento tenía `tecnico_aplicador_id`, y `"name:<txt>"` cuando solo tenía `aplicador_nombre` (texto libre). Como las keys no coincidían, no había dedup entre las dos fuentes.
- **Fix**: refactorizado a dos pasadas:
  1. Primera pasada recoge todas las fichas completas por `_id` y calcula `nombres_ap_cubiertos` (set de nombres normalizados a lowercase).
  2. Segunda pasada añade la versión "minimal-by-name" solo si el nombre normalizado NO está ya cubierto por una ficha completa.
- Aplicado el mismo patrón a **Maquinaria** (mismo bug potencial).
- **Testing**: PDF regenerado. Página 24 muestra ambos técnicos (Clemente y Antonio) **una sola vez cada uno**, con todos los datos completos (DNI, Nivel, Nº Carnet, Fechas). Confirmado con extracción textual (`count("Clemente Torres Martín") == 1`).

### PDF Tratamientos: Coste Total → Caldo Recomendado + arreglo campos vacíos - DONE (2026-07-01)
- **Cambio pedido**: eliminar "Coste Total", añadir "Caldo Recomendado", y mostrar todos los campos rellenos del tratamiento (varios salían "—" con datos válidos en BD).
- **Bloque DATOS DEL TRATAMIENTO en el PDF** completamente refactorizado:
  - ❌ **Eliminado** "Coste Total".
  - ✅ **Añadido** "Caldo Recomendado" (`caldo_superficie` en L/ha).
  - ✅ **Añadido** "Producto" (`producto_fitosanitario_nombre`) — antes no aparecía.
  - ✅ **Añadido** "Superficie a Tratar" (`superficie_aplicacion` en ha).
  - ✅ **Fix Dosis**: leía de `dosis` (key inexistente); ahora combina `producto_fitosanitario_dosis` + `producto_fitosanitario_unidad` (ej. "1.0 L/ha", "0.3 kg/ha").
  - ✅ **Fix Aplicador/Máquina/Campaña**: `dict.get(k, '—')` fallaba cuando el valor es `None` (no missing). Cambiado a `or '—'` que sí maneja None.
  - ✅ **Realizado**: aplicada misma regla que Visitas → siempre "Sí" (aparecer en el informe implica que fue realizado).
- **Testing**: PDF regenerado y verificado página por página. Página 23 (ORTIVA): "Aplicador: Antonio Sanchez", "Máquina: AGRIFAC", "Producto: ORTIVA", "Dosis: 1.0 L/ha", "Superficie: 13.0 ha", "Caldo Recomendado: 600.0 L/ha", "Realizado: Sí". Todo lo demás (BISMARK página 22, APHOX página 21) también OK.

### Tratamientos: campos "Nº Registro Producto" y "Plaga a Controlar" - DONE (2026-07-01)
- **Nuevos campos añadidos** al modelo `TratamientoCreate`:
  - `producto_fitosanitario_num_registro: Optional[str]` — Nº registro oficial del producto (auto-fill desde catálogo de fitosanitarios).
  - `plaga_a_controlar: Optional[str]` — plaga/enfermedad objetivo de la aplicación (texto libre).
- **Frontend** (`Tratamientos.js` tab "Producto y Dosis"):
  - Inputs editables en `grid-2` justo debajo del panel de la calculadora.
  - Nº Registro se **autorellena** al aplicar producto desde `CalculadoraFitosanitarios` (que ahora emite `producto_fitosanitario_num_registro: selectedProducto?.numero_registro`).
  - También se muestra el Nº Registro en la card verde "Producto Fitosanitario Seleccionado" (`data-testid="producto-num-registro"`).
  - Placeholders informativos: "ES-00123" y "Pulgón, Mildiu, Botrytis...".
  - data-testids: `input-num-registro`, `input-plaga-controlar`.
- **PDF Cuaderno de Campo** (`routes_evaluaciones.py::generate_evaluacion_pdf`): añadidos 2 campos nuevos en la tabla "DATOS DEL TRATAMIENTO" al final del bloque existente. Muestran "—" cuando están vacíos.
- **Testing**: round-trip end-to-end via curl + Playwright screenshot. Backend PUT persiste ambos campos, GET los devuelve, UI de edit los muestra rellenos (Nº=ES-12345, Plaga="Pulgón (Aphis fabae)") y el PDF los imprime correctamente en la página del tratamiento APHOX.

### Fix: contador de parcelas seleccionadas en Tratamientos ignora huérfanas - DONE (2026-07-01)
- **Bug reportado**: al seleccionar 1 parcela real en el editor de Tratamientos, el contador mostraba "2 parcela(s) seleccionada(s)".
- **Root cause**: los tratamientos ORTIVA y BISMARK tenían `parcelas_ids = ['6a3b7f57d9e369edbbc3e5b7', '6a3e90f77b8cf2eb0d697bc1']` donde el primer ID apunta a una parcela borrada (huérfano). El checkbox no se renderizaba (no existe la parcela) pero el contador `selectedParcelas.length` sí lo incluía → discrepancia 1 checkbox / 2 en contador.
- **Fix 1 – Modal editor** (`Tratamientos.js`): contador ahora usa `selectedParcelas.filter(id => parcelas.some(p => p._id === id)).length`. Además muestra un aviso discreto en cursiva "· N referencia(s) huérfana(s) (se limpiarán al guardar)" cuando detecta huérfanos.
- **Fix 2 – Payload al guardar**: se purga `parcelas_ids` para que solo persistan referencias vigentes → auto-cleanup progresivo cada vez que el usuario edita/guarda un tratamiento.
- **Fix 3 – Lista de Tratamientos** (`TratamientosTable.js`): la columna "Parcelas" también filtra huérfanas. Ahora ORTIVA y BISMARK muestran "1 parcela(s)" (antes "2").
- **Testing**: end-to-end via Playwright screenshot — KPI y columna "Parcelas" pasaron de "2 parcela(s)" a "1 parcela(s)". `data-testid="tratamiento-parcelas-count"` añadido para futuros tests.

### Auto-marcar visitas como "Realizado" cuando tienen contenido - DONE (2026-07-01)
- **Regla**: una visita se marca automáticamente como `realizado=True` en BD cuando tiene contenido real registrado (observaciones no vacías, cuestionario_plagas con datos, o fecha_visita rellena). Coherente con el PDF que siempre imprime "Realizado: Sí".
- **Implementación** en `routes_visitas.py`:
  - Helper `_visita_realizada(obs, cp, fv)` centraliza la lógica.
  - POST `/api/visitas` calcula `realizado` en la creación (antes hardcoded `False`).
  - PUT `/api/visitas/{id}` recalcula en cada save mergeando update_data + valores existentes (fetch previo del doc con proyección mínima).
- **Backfill**: `/app/scripts/backfill_visitas_realizado.py` recorre todas las visitas existentes y aplica la regla. Ejecutado en este job → **9/9 visitas actualizadas a `realizado=True`**.
- **Testing**: script `/tmp/test_visita_realizado.py` cubre 4 escenarios (crear vacía → False, añadir obs → True, vaciar obs → False, añadir fecha → True). Todos PASS.

### Fix: Visitas en PDF muestran siempre "Realizado: Sí" - DONE (2026-07-01)
- **Regla de negocio**: si una visita está registrada (aparece en el PDF con observaciones/cuestionario), significa que fue realizada → el campo "Realizado" debe siempre mostrar "Sí".
- **Antes**: `routes_evaluaciones.py:1866` renderizaba `{'Sí' if visita.get('realizado') else 'No'}` — como `realizado` defaultea a `False` al crear la visita y nadie lo togglea, salía "No" aunque la visita tuviera datos completos.
- **Fix**: hardcoded a "Sí" en el HTML del PDF (el campo `realizado` en BD se conserva por si en el futuro se usa para planificación).
- **Testing**: PDF regenerado, las 9 visitas de la evaluación COT muestran "Realizado: Sí" en cada página. Verificado extrayendo texto de cada página del PDF.

### Cuestionario unificado en el PDF: 89 preguntas seguidas bajo "TOMA DE DATOS" - DONE (2026-07-01)
- **Problema reportado**: el PDF dividía las 89 preguntas del cuestionario en 3+ secciones separadas (Toma de datos, Análisis de suelo, Calidad de cepellones, …) con numeración reiniciada 1..N por sección. Además aparecían bandas verdes vacías cuando algunas secciones tenían preguntas sin responder.
- **Fix**: en `generate_evaluacion_pdf` (`routes_evaluaciones.py`) se reemplazó el bucle por-sección por un único bloque **"TOMA DE DATOS"** que concatena todas las respuestas de las 7 secciones internas (`toma_datos`, `analisis_suelo`, `pasos_precampana`, `calidad_cepellones`, `inspeccion_maquinaria`, `observaciones`, `calibracion_mantenimiento`) y las numera 1..N de forma continua. El orden respeta el `orden_global` guardado en `evaluaciones_config` (mismo orden que la vista plana del frontend).
- **Compatibilidad**: los datos siguen guardándose por sección en BD (sin migración). Solo cambia el rendering del PDF.
- **Bug de timsort resuelto**: el `list.index()` dentro del `sort key` fallaba con `ValueError: not in list` porque timsort muta la lista durante la ordenación. Se precomputa un `_fallback = {id(r): i for i,r in ...}` antes del sort.
- **Testing**: PDF regenerado (HTTP 200, 1.2 MB, 23 páginas). Verificado end-to-end: página 3 abre "TOMA DE DATOS" con pregunta 1, la numeración avanza hasta 89 sin reiniciar y sin bandas verdes intermedias. Extracción textual confirma rango 1..89.

### Botones "Marcar todo Sí" / "Marcar todo No" en cuestionario - DONE (2026-07-01)
- Nuevo panel bulk-mark en la pestaña "Cuestionarios" de Evaluaciones, entre el progress bar y el panel "Añadir pregunta".
- Botón verde **"Marcar todo Sí"** + botón rojo **"Marcar todo No"** + contador dinámico `Marcar todas las preguntas Sí/No (N):`.
- **Filtrado**: solo aplica a preguntas de tipo `si_no`. Las preguntas de texto/número/fecha (ej. "Limpios", "Mecanizado") NO se tocan.
- **Ubicación**: `/app/frontend/src/components/evaluaciones/EvaluacionesForm.js` — IIFE que calcula `siNoItems` con `flatItems.filter(p => p.tipo === 'si_no')` y expone `markAllSiNo(valor)` que itera y llama a `handleRespuestaChange`.
- data-testids: `bulk-mark-sino`, `bulk-mark-all-yes`, `bulk-mark-all-no`.
- **Testing**: verificado via Playwright — click "Marcar todo No" → todos los botones Sí/No pasan a rojo, progreso salta a 74/89 (83%). Click "Marcar todo Sí" → invierte a verde manteniendo mismo progreso (74/89) porque las de texto no cambian. Combinado con el fix `?? ''` anterior, el `false` persiste correctamente al guardar.

### Brújula + barra de escala en mapa satelital del PDF (estilo SIGPAC) - DONE (2026-07-01)
- **Overlay cartográfico profesional** añadido al PNG del mapa antes de embeberlo en el PDF:
  - **Brújula** (esquina superior derecha): badge circular blanco semitransparente con borde gris, flecha romboidal roja arriba/gris abajo y letra "N" en negrita.
  - **Barra de escala** (esquina inferior izquierda): barra bicolor negra/blanca con etiquetas "0" y distancia auto-calculada. Fondo blanco semitransparente para legibilidad.
- **Cálculo de escala**: usa la fórmula Web Mercator `mpp = 156543.03392 · cos(lat) / 2^zoom` con el `sm.zoom` elegido por `staticmap` tras el render y la latitud del centro del polígono. Se elige la distancia "bonita" más cercana a 150 px entre {50, 100, 200, 500 m, 1, 2, 5, 10, 20, 50 km}.
- **Fuente**: `LiberationSans-Bold.ttf` (fallback a `ImageFont.load_default()` si no está disponible).
- **Implementación**: bloque try/except después de `sm.render()` y antes de `img.save()` en `routes_evaluaciones.py`. Si el overlay falla, se guarda el mapa sin decoraciones (el resto del PDF sigue funcionando).
- **Testing**: verificado con `analyze_file_tool` sobre el PNG generado → los tres elementos (polígono, brújula, escala) presentes y legibles. Confidence 100%. PDF end-to-end 1.2 MB, HTTP 200.

### Cleanup automático de mapas satelitales del PDF - DONE (2026-07-01)
- **Problema**: cada exportación de Cuaderno de Campo PDF generaba un PNG único (~650 KB) en `/app/uploads/evaluaciones/pdf_maps/map_<uuid>.png` que nunca se borraba → disco crecería sin control.
- **Fix en dos capas**:
  1. **Cleanup inline** (`routes_evaluaciones.py::generate_evaluacion_pdf`): lista `_pdf_temp_files` acumula rutas, y un `finally` post-`write_pdf` borra cada PNG inmediatamente. El PNG solo hace falta mientras WeasyPrint lo lee vía `file://`.
  2. **Job periódico APScheduler** (`scheduler_service.py::cleanup_pdf_map_tempfiles`): cada 1 hora, elimina cualquier PNG con >1h de antigüedad en el directorio. Red de seguridad para orfanatos si el PDF explota antes del `finally`.
- **Testing**: end-to-end verificado — directorio limpio antes → PDF de 1.2 MB con mapa embebido correctamente → directorio vacío tras la petición. Job scheduler verificado con archivo dummy (mtime -2h) borrado, archivo fresco preservado. Log: `[Scheduler] PDF map tempfile cleanup scheduled: every 1h`.

### Fix: Cuestionario perdía respuestas "No" al guardar - DONE (2026-07-01)
- **Bug reportado**: al marcar "No" en una pregunta si_no del cuestionario de evaluación y guardar, la respuesta se perdía (el botón quedaba en blanco tras recargar y en el PDF salía vacío).
- **Root cause**: `/app/frontend/src/pages/Evaluaciones.js` línea 272 usaba `respuesta: respuestas[p.id] || ''`. En JS, `false` es falsy → `false || ''` = `''`. Idéntico al bug de "0-value falsiness" ya corregido en el PDF.
- **Fix**: reemplazado `||` por nullish coalescing `??`, que solo cae al default cuando el valor es null/undefined. Preserva `false` (No) y `0` correctamente y mantiene `''` como default para preguntas de texto/fecha sin responder.
- **Testing**: `testing_agent_v3_fork` iteration_76 → backend 100%, frontend 100%. Ciclo completo verificado (marcar No → save → reload → botón sigue en rojo; PDF muestra "R: No"). Nuevo test de regresión en `/app/backend/tests/test_evaluaciones_no_answer.py`.

### Mapa satelital real en Cuaderno de Campo PDF - DONE (2026-07-01)
- Reemplazado el diagrama SVG básico por un **mapa satelital real** (Esri World Imagery) con el polígono de la parcela dibujado encima, para que el informe sea profesional (misma calidad visual que el editor Leaflet Avanzado).
- Implementación: librería `staticmap` fetching de tiles Esri + Pillow para renderizar el polígono (fill `#4CAF5066` translúcido, outline `#2E7D32`) y marcador central azul/blanco tipo Leaflet.
- **Bug corregido**: `staticmap`/PIL no acepta `rgba(r,g,b,0.85)` con alpha decimal → convertidos todos los colores a formato hex (`#rrggbbaa`).
- Fallback SVG legacy sigue activo si falla la descarga de tiles (sin red).
- Los archivos generados se guardan en `/app/uploads/evaluaciones/pdf_maps/map_<uuid>.png` (900x540) y se embeben en el PDF vía `file://`.
- **Testing**: PDF regenerado end-to-end (HTTP 200, 1.2MB, 24 páginas). Imagen 900x540 embebida verificada con `PyPDF2` y `analyze_file_tool` (satélite real de campo agrícola con pivote central + polígono verde encima). Sin errores en logs post-restart.

### Export PDF — Impresos completos en `/api/evaluaciones/{id}/pdf` - DONE (2026-06-26)
- Reemplazado el bloque legacy "IMPRESOS" del PDF (solo mostraba fecha_inicio/fecha_fin/tecnico) por:
  - **Cabecera Plantación** (Proveedor, Código, Finca, Cultivo, Variedad, Superficie, Comentarios).
  - 6 secciones (Análisis de suelo, Pasos precampaña, Calibración fito, Calidad cepellones, Inspección maquinaria, Observaciones generales) con formato Sí/No coloreado y checkboxes de síntomas (Enfermedades/Plagas/Virus).
- Validado: PDF generado correctamente (49KB), todas las secciones presentes (verificado con análisis OCR).
- Los técnicos pueden ahora descargar/imprimir la hoja completa lista para archivar o entregar al cliente.





