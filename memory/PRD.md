# FRUVECO - PRD (Product Requirements Document)

## Problem Statement
Desarrollar una aplicacion de Cuaderno de Campo para el sector agricola que permita gestionar:
Contratos, Parcelas, Mapas, Fincas, Visitas, Tareas, Cosechas, Tratamientos, Irrigaciones, Recetas, Albaranes, Dashboard, Generacion de informes PDF/Excel, RBAC, Autenticacion, Integraciones IA, RRHH completo.

## Ultima Actualizacion: 2 Abril 2026 (Sesion 12)

### Completadas en esta sesion:

#### 1. Fix Bug Cosechas PDF Export (P0)
- Import StreamingResponse en routes_cosechas.py
- 6 endpoints exportacion verificados (iteration_48)

#### 2. AI Contract Summary (P1)
- POST /api/ai/summarize-contract/{contrato_id}
- 3a pestana en AsistenteIA.js (iteration_48)

#### 3. AI Dashboard - Historial y Metricas (Nuevo)
- Persistencia automatica de resultados IA en ai_reports
- GET /api/ai/dashboard, GET /api/ai/report-detail/{id}
- 4a pestana con KPIs, grafico actividad, tabla historial, modal detalle (iteration_49)

#### 4. Chat Agronomo IA (Nuevo)
- POST /api/ai/chat (conversacion con contexto agricola)
- GET /api/ai/chat/sessions, GET /api/ai/chat/history/{id}
- DELETE /api/ai/chat/session/{id}
- 5a pestana con sidebar sesiones, burbujas chat, preguntas sugeridas
- Contexto automatico: parcelas, contratos, tratamientos, cosechas, visitas
- Historial de conversacion persistente (iteration_50)

### Sesiones anteriores:
- Multi-Zona Parcelas, Codigo Plantacion readonly
- Refactorizacion Dashboard, routes_rrhh, Contratos
- Exportaciones PDF/Excel Recetas y Tareas
- AI Sugerencias Tratamientos + Prediccion Cosecha

---

## Architecture
```
/app/
  backend/
    server.py
    ai_service.py
    routes_ai.py (parcel reports, costs, recommendations)
    routes_ai_suggestions.py (treatments, predictions, summaries, dashboard)
    routes_ai_chat.py (chat agronomo IA)
    routes_cosechas.py, routes_tareas.py, routes_extended.py
    routes/ (RRHH sub-routers)
  frontend/src/
    pages/
      AsistenteIA.js (5 tabs: Treatments, Predictions, Summaries, History, Chat)
      Dashboard.js, Contratos.js, Parcelas.js
      Cosechas.js, Tareas.js, Recetas.js
    components/
      dashboard/, contratos/, AdvancedParcelMap.js
```

## AI Features Status (All DONE)
| Feature | Endpoint |
|---------|----------|
| Sugerencias Tratamientos | POST /api/ai/suggest-treatments/{parcela_id} |
| Prediccion Cosecha | POST /api/ai/predict-yield/{contrato_id} |
| Resumen Contratos | POST /api/ai/summarize-contract/{contrato_id} |
| Dashboard IA | GET /api/ai/dashboard |
| Detalle Informe | GET /api/ai/report-detail/{id} |
| Chat Agronomo | POST /api/ai/chat |
| Sesiones Chat | GET /api/ai/chat/sessions |
| Historial Chat | GET /api/ai/chat/history/{id} |
| Borrar Sesion | DELETE /api/ai/chat/session/{id} |

## Test Credentials
- Admin: admin@fruveco.com / admin123

## Pending/Blocked
- Email (P2) - BLOCKED: RESEND_API_KEY

## Upcoming Tasks
- P1: NFC para RRHH (Opcion D del usuario)
- P2: Generalizar PDF/Excel a modulos restantes
- P2: Refactorizar Parcelas.js (~1500 lineas)

## Future/Backlog
- Notificaciones por Email (necesita RESEND_API_KEY)
- OpenWeatherMap (necesita API key)
