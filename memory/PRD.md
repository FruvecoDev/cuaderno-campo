# FRUVECO - PRD (Product Requirements Document)

## Problem Statement
Desarrollar una aplicacion de Cuaderno de Campo para el sector agricola que permita gestionar:
Contratos, Parcelas, Mapas, Fincas, Visitas, Tareas, Cosechas, Tratamientos, Irrigaciones, Recetas, Albaranes, Dashboard, Generacion de informes PDF/Excel, RBAC, Autenticacion, Integraciones IA, RRHH completo.

## Ultima Actualizacion: 2 Abril 2026 (Sesion 12)

## Secuencia del usuario: A -> B -> C -> D (TODAS COMPLETADAS)

### Opcion A: Refactorizar Contratos - DONE
### Opcion B: Cuaderno de Campo (Exports PDF/Excel) - DONE
### Opcion C: Integraciones IA - DONE
### Opcion D: NFC para RRHH - DONE

---

### Completadas en esta sesion:

#### 1. Fix Bug Cosechas PDF Export (P0)
- Import StreamingResponse en routes_cosechas.py (iteration_48)

#### 2. AI Contract Summary (P1)
- POST /api/ai/summarize-contract/{contrato_id} (iteration_48)

#### 3. AI Dashboard - Historial y Metricas
- Persistencia automatica de resultados IA en ai_reports
- GET /api/ai/dashboard, GET /api/ai/report-detail/{id}
- 4a pestana con KPIs, grafico, historial (iteration_49)

#### 4. Chat Agronomo IA
- POST /api/ai/chat + sessions + history + delete
- 5a pestana con sidebar sesiones, burbujas chat, preguntas sugeridas (iteration_50)

#### 5. NFC para RRHH (Opcion D)
- Backend: PUT/DELETE /api/rrhh/empleados/{id}/nfc (assign/remove)
- Backend: GET /api/rrhh/empleados/nfc-lookup/{nfc_id}
- Backend: POST /api/rrhh/fichajes/nfc (ya existia, ahora funcional e2e)
- Frontend ControlHorarioTab: Web NFC API + fallback manual input
- Frontend RRHH.js: Gestion NFC en ficha de empleado (assign/remove)
- Proteccion contra duplicados NFC (409)
- Testing: 17/17 (iteration_51)

---

## Architecture
```
/app/
  backend/
    server.py
    ai_service.py, routes_ai.py, routes_ai_suggestions.py, routes_ai_chat.py
    routes_cosechas.py, routes_tareas.py, routes_extended.py
    routes/
      routes_rrhh.py (empleados + NFC assign/remove/lookup)
      rrhh_fichajes.py (fichajes CRUD + QR/NFC/facial + informes)
      rrhh_productividad.py, rrhh_documentos.py, rrhh_ausencias.py, rrhh_prenominas.py
  frontend/src/
    pages/
      AsistenteIA.js (5 tabs: Treatments, Predictions, Summaries, History, Chat)
      RRHH.js (NFC management in employee detail)
      RRHH/ControlHorarioTab.js (NFC scan + manual input)
```

## AI Features (All DONE)
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

## NFC RRHH Endpoints
| Endpoint | Descripcion |
|----------|-------------|
| PUT /api/rrhh/empleados/{id}/nfc | Asignar NFC |
| DELETE /api/rrhh/empleados/{id}/nfc | Eliminar NFC |
| GET /api/rrhh/empleados/nfc-lookup/{nfc_id} | Buscar por NFC |
| POST /api/rrhh/fichajes/nfc | Fichar por NFC |

## Test Credentials
- Admin: admin@fruveco.com / admin123

## Pending/Blocked
- Email (P2) - BLOCKED: RESEND_API_KEY
- OpenWeatherMap - BLOCKED: API key

## Remaining Tasks (Backlog)
- P2: Generalizar PDF/Excel a modulos restantes
- P2: Refactorizar Parcelas.js (~1500 lineas)
