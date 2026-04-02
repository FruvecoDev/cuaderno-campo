# FRUVECO - PRD (Product Requirements Document)

## Ultima Actualizacion: 2 Abril 2026 (Sesion 12)

## Secuencia del usuario: A -> B -> C -> D (COMPLETADAS)
## P0 Calidad y Robustez: COMPLETADO

---

### P0 Completado en esta sesion:

#### 1. Refactorizacion Parcelas.js (1572 -> 397 lineas)
- Extraidos 5 subcomponentes: ParcelasFilters, ParcelasTable, ParcelasForm, ParcelasHistorial, ParcelasGeneralMap
- Funcionalidad preservada al 100% (iteration_52)

#### 2. Generalizacion Exports PDF/Excel
Nuevos endpoints:
- GET /api/visitas/export/excel + pdf
- GET /api/parcelas/export/excel + pdf
- GET /api/tratamientos/export/pdf (Excel ya existia)
- GET /api/irrigaciones/export/pdf (Excel ya existia)
Total endpoints export: 30+ (iteration_52)

#### 3. Fix Bug + AI Features (anteriores)
- Fix Cosechas PDF export, AI Contract Summary, AI Dashboard, AI Chat Agronomo, NFC RRHH

---

## Complete Export Coverage
| Modulo | Excel | PDF |
|--------|-------|-----|
| Contratos | Y | Y |
| Parcelas | Y | Y |
| Cosechas | Y | Y |
| Recetas | Y | Y |
| Tareas | Y | Y |
| Tratamientos | Y | Y |
| Irrigaciones | Y | Y |
| Visitas | Y | Y |
| Albaranes | Y | - |
| Maquinaria | Y | - |
| Proveedores | Y | - |
| Clientes | Y | - |
| Gastos | Y | Y |
| Ingresos | Y | Y |
| RRHH Fichajes | Y | Y |
| RRHH Documentos | Y | Y |
| RRHH Prenominas | Y | Y |

## Test Credentials
- Admin: admin@fruveco.com / admin123

## Upcoming: P1 Funcionalidades Pendientes
- Notificaciones Email (RESEND_API_KEY requerida)
- Datos meteorologicos (OpenWeatherMap API key requerida)
- Sync ERP API

## Upcoming: P1 Mejoras UX/Produccion
- Lazy loading y paginacion tablas grandes
- Responsive/Mobile para uso en campo
- Mejoras Dashboard KPIs

## Upcoming: P2 Backlog Avanzado
- Hojas de Evaluacion (modulo completo)
- Tecnicos Aplicadores (gestion certificados)
- Maquinaria (seguimiento uso/mantenimiento)
