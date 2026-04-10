# FRUVECO - PRD (Product Requirements Document)

## Ultima Actualizacion: 10 Abril 2026

## Progreso: P0 DONE, P1 DONE, P2 DONE, Refactoring DONE, Alertas+Tareas DONE

---

### Sistema de Alertas con Auto-Tareas (Nuevo):
- Widget "Alertas y Avisos" en Dashboard con secciones expandibles
- Certificados Tecnicos: detecta vencidos y proximos (30/60/90 dias)
- ITV Maquinaria: detecta vencida y proxima (30 dias)
- Mantenimiento Maquinaria: detecta revisiones pendientes
- Boton "Crear Tarea" en cada alerta genera tarea automatica en modulo Tareas
- Prevencion de duplicados: no crea otra tarea si ya existe una activa
- Indicador "Tarea creada" cuando la alerta ya tiene tarea asociada
- Backend: GET /api/alertas/resumen, POST /api/alertas/crear-tarea, GET /api/alertas/tareas-existentes
- Testing: iteration_57 (12/12) + iteration_58 (17/17) = 100%

### Refactoring Completado:
- Evaluaciones.js: 1405 -> 502 lineas (3 subcomponentes)
- Maquinaria.js: 1309 -> 325 lineas (3 subcomponentes)
- Dashboard, Contratos, Parcelas, RRHH

### Centro de Exportacion Centralizado: 13 modulos, PDF/Excel
### P2: Exportaciones todos los modulos
### P1: Responsive, Paginacion, Dashboard KPIs
### P0: AI, NFC, Refactoring, Exports

### Test Totals: 150+ tests, 0 failures

## Test Credentials
- Admin: admin@fruveco.com / admin123

## Upcoming / Future Backlog
- Alertas de proximas visitas programadas
- Notificaciones push en navegador para alertas criticas
- Agregar mas datos ITV/mantenimiento a maquinarias existentes

## Blocked
- Email (RESEND_API_KEY)
- Meteorologia (OpenWeatherMap key)
