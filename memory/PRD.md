# FRUVECO - PRD (Product Requirements Document)

## Ultima Actualizacion: 10 Abril 2026

## Progreso: P0 DONE, P1 DONE, P2 DONE, Refactoring DONE, Alertas DONE

---

### Sistema de Alertas Inteligente (Nuevo):
- Widget "Alertas y Avisos" en Dashboard con secciones expandibles
- Certificados Tecnicos: detecta vencidos y proximos a vencer (30/60/90 dias)
- ITV Maquinaria: detecta ITV vencida y proxima a vencer (30 dias)
- Mantenimiento Maquinaria: detecta revisiones pendientes basado en intervalo configurable
- Campos nuevos en Maquinaria: fecha_proxima_itv, fecha_ultimo_mantenimiento, intervalo_mantenimiento_dias
- Backend: GET /api/alertas/resumen
- Testing: iteration_57 (12/12 backend, frontend 100%)

### Refactoring Completado:
- Evaluaciones.js: 1405 -> 502 lineas (3 subcomponentes)
- Maquinaria.js: 1309 -> 325 lineas (3 subcomponentes)
- Dashboard, Contratos, Parcelas, RRHH: previamente refactorizados

### Centro de Exportacion Centralizado (Dashboard):
- 13 modulos, toggle PDF/Excel, informe combinado

### P2 Completado: Exportaciones PDF/Excel todos los modulos
### P1 Completado: Responsive, Paginacion, Dashboard KPIs
### P0 Completado: AI, NFC, Refactoring, Exports

### Test Totals: 130+ tests, 0 failures

## Test Credentials
- Admin: admin@fruveco.com / admin123

## Upcoming / Future Backlog
- Agregar mas datos de ITV/mantenimiento a las maquinarias existentes
- Dashboard: alerta de proximas visitas programadas
- Mejoras UX: notificaciones push en navegador para alertas criticas

## Blocked
- Email (RESEND_API_KEY)
- Meteorologia (OpenWeatherMap key)
