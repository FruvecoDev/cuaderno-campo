# FRUVECO - PRD (Product Requirements Document)

## Ultima Actualizacion: 10 Abril 2026

## Progreso: P0 DONE, P1 DONE, P2 DONE, Refactoring DONE

---

### Refactoring Completado:
- `Evaluaciones.js` refactorizado: 1405 -> 502 lineas (64% reduccion)
  - Subcomponentes: EvaluacionesFilters, EvaluacionesTable, EvaluacionesForm
- `Maquinaria.js` refactorizado: 1309 -> 325 lineas (75% reduccion)
  - Subcomponentes: MaquinariaTable, MaquinariaForm, MaquinariaHistorial
- Testing: iteration_56 (100% backend + frontend, 0 regressions)

### Centro de Exportacion Centralizado (Dashboard):
- Widget interactivo con seleccion de 13 modulos, toggle PDF/Excel
- Backend: GET /api/exports/modules + POST /api/exports/combined
- Testing: iteration_55 (100%)

### P2 Completado:
- Exportaciones PDF/Excel para Evaluaciones, Tecnicos Aplicadores, Maquinaria (6 endpoints)
- Testing: iteration_54 (100%)

### P1 Completado:
- Responsive/Mobile, Paginacion Frontend, Dashboard Avanzado con KPIs

### P0 Completado:
- Refactorizacion Parcelas.js, Exports generalizados, AI Contract Summary, AI Dashboard, AI Chat, NFC RRHH

### Refactoring History:
- Dashboard.js: 2168 -> 788 lineas (5 widgets)
- Contratos.js: 1917 -> 388 lineas (form, filters, table)
- Parcelas.js: 1572 -> 397 lineas (5 subcomponentes)
- routes_rrhh.py: 1905 -> 270 lineas (4 sub-routers)
- Evaluaciones.js: 1405 -> 502 lineas (3 subcomponentes)
- Maquinaria.js: 1309 -> 325 lineas (3 subcomponentes)

### Test Totals: 120+ tests, 0 failures

## Test Credentials
- Admin: admin@fruveco.com / admin123

## Upcoming / Future Backlog
- Funcionalidades avanzadas: seguimiento certificados Tecnicos Aplicadores (alertas caducidad)
- Funcionalidades avanzadas: seguimiento mantenimiento Maquinaria (registro revisiones, alertas ITV)

## Blocked
- Email (RESEND_API_KEY)
- Meteorologia (OpenWeatherMap key)
