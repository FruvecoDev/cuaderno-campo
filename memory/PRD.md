# FRUVECO - PRD (Product Requirements Document)

## Problem Statement
Desarrollar una aplicacion de Cuaderno de Campo para el sector agricola que permita gestionar:
Contratos, Parcelas, Mapas, Fincas, Visitas, Tareas, Cosechas, Tratamientos, Irrigaciones, Recetas, Albaranes, Dashboard, Generacion de informes PDF/Excel, RBAC, Autenticacion, Integraciones IA, RRHH completo.

## Ultima Actualizacion: 1 Abril 2026 (Sesion 12)

### Completadas en esta sesion:

#### 1. Fix Bug Cosechas PDF Export (P0 - Completado)
- Anadido import `StreamingResponse` faltante en `routes_cosechas.py`
- Verificados 6 endpoints de exportacion (PDF/Excel) para Cosechas, Recetas y Tareas
- Testing: 17/17 backend (iteration_48.json)

#### 2. AI Contract Summary Feature (P1 - Completado)
- Nuevo endpoint `POST /api/ai/summarize-contract/{contrato_id}` 
- Genera resumen ejecutivo, analisis financiero, estado cumplimiento, riesgos y recomendaciones
- Tercera pestana en AsistenteIA.js: "Resumen de Contratos"
- Testing: 100% (iteration_48.json)

#### 3. AI Dashboard - Historial y Metricas (Nuevo - Completado)
- Persistencia automatica: todos los resultados IA se guardan en `ai_reports` collection
- `GET /api/ai/dashboard`: metricas agregadas (total, por tipo, tiempo medio, actividad 30 dias)
- `GET /api/ai/report-detail/{id}`: detalle completo de informe guardado
- 4a pestana "Historial y Metricas" en AsistenteIA.js:
  - KPIs: total informes, tratamientos, predicciones, resumenes
  - Grafico de barras de actividad (ultimos 30 dias, por tipo, recharts)
  - Tabla de historial con tipo, titulo, entidad, tiempo, fecha
  - Modal de detalle con contenido JSON completo
  - Actualizacion automatica tras cada generacion
- Testing: 9/9 backend + 100% frontend (iteration_49.json)

### Completadas en sesiones anteriores:
- Soporte Multi-Zona en Parcelas (iteration_46.json)
- Campo Codigo Plantacion readonly
- Refactorizacion Dashboard.js (2168 -> 788 lineas)
- Refactorizacion routes_rrhh.py (1905 -> 270 lineas)
- Refactorizacion Contratos.js (1917 -> 388 lineas)
- Exportaciones PDF/Excel para Recetas y Tareas
- Asistente IA: Sugerencias Tratamientos + Prediccion Cosecha

---

## Architecture
```
/app/
  backend/
    server.py
    ai_service.py (AI report generation)
    routes_ai.py (AI reports: parcels, costs, recommendations)
    routes_ai_suggestions.py (AI: treatments, predictions, contract summaries, dashboard, history)
    routes_cosechas.py (Cosechas CRUD + PDF/Excel export)
    routes_tareas.py (Tareas CRUD + PDF/Excel export)
    routes_extended.py (Recetas, Albaranes + exports)
    routes/
      routes_rrhh.py, rrhh_fichajes.py, rrhh_productividad.py,
      rrhh_documentos.py, rrhh_ausencias.py, rrhh_prenominas.py
  frontend/src/
    pages/
      AsistenteIA.js (4 tabs: Treatments, Predictions, Contract Summary, History & Metrics)
      Dashboard.js (788 lines, refactored)
      Contratos.js (refactored with subcomponents)
      Parcelas.js (multi-zona)
      Cosechas.js, Tareas.js, Recetas.js (with export buttons)
    components/
      dashboard/ (5 widget subcomponents)
      contratos/ (form, filters, table subcomponents)
      AdvancedParcelMap.js (multi-polygon drawing)
```

## AI Features Status
| Feature | Status | Endpoint |
|---------|--------|----------|
| Sugerencias Tratamientos | DONE | POST /api/ai/suggest-treatments/{parcela_id} |
| Prediccion Cosecha | DONE | POST /api/ai/predict-yield/{contrato_id} |
| Resumen Contratos | DONE | POST /api/ai/summarize-contract/{contrato_id} |
| Dashboard IA | DONE | GET /api/ai/dashboard |
| Detalle Informe | DONE | GET /api/ai/report-detail/{report_id} |
| Informe Parcela | DONE | POST /api/ai/report/parcel/{parcela_id} |
| Analisis Costes | DONE | POST /api/ai/analysis/costs |
| Recomendaciones | DONE | POST /api/ai/recommendations |

## Test Credentials
- Admin: admin@fruveco.com / admin123

## Pending/Blocked Issues
- Notificaciones por Email (P2) - BLOCKED: Necesita RESEND_API_KEY

## Upcoming Tasks
- P1: NFC para RRHH (identificacion NFC para fichajes de empleados) - Opcion D del usuario
- P2: Generalizar PDF/Excel a modulos restantes
- P2: Refactorizar Parcelas.js (~1500 lineas)

## Future/Backlog
- P2: Notificaciones por Email (necesita RESEND_API_KEY)
- P2: OpenWeatherMap (necesita API key)
