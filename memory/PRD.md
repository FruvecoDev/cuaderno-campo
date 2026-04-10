# FRUVECO - PRD (Product Requirements Document)

## Problema
Aplicacion de campo para agricultura: Cuaderno de Campo completo con modulos de gestion.

## Modulos Implementados (COMPLETOS)
- Dashboard (KPIs, DnD reordenable, alertas inteligentes, centro exportacion)
- Contratos, Parcelas, Fincas, Mapas
- Visitas, Tareas, Cosechas, Tratamientos, Irrigaciones
- Recetas, Albaranes, Proveedores, Cultivos
- Maquinaria, Evaluaciones, Tecnicos Aplicadores
- Articulos Finca, Agentes Compra/Venta, Clientes
- RRHH (Fichajes, Productividad, Documentos, Ausencias, Portal Empleado)
- Cuaderno de Campo, Asistente IA
- Configuracion App, Usuarios y Permisos (RBAC)
- Integracion ERP Bidireccional (API Keys, Webhooks, Export bulk, Historial sync)
- Consulta SIGPAC con Mapa Interactivo (WMS oficial, click-to-identify, importacion)
- PWA (Progressive Web App - instalable en moviles)

## Funcionalidades Core
- Autenticacion JWT con RBAC
- Dashboard drag-and-drop personalizable (@dnd-kit)
- Exportacion PDF/Excel en todos los modulos
- Centro de exportacion centralizado
- Alertas inteligentes (ITV, mantenimiento, certificados)
- Auto-generacion de tareas desde alertas
- Asistente IA (GPT-4o via Emergent LLM Key)
- API REST completa para integracion ERP (import + export + webhooks HMAC)
- SIGPAC: mapa WMS interactivo, click-to-identify (OGC API), importacion
- PWA: manifest, service worker, offline support, install prompt

## Stack Tecnico
- Frontend: React + Leaflet + react-leaflet (WMSTileLayer) + @dnd-kit
- Backend: FastAPI + Motor (MongoDB async)
- DB: MongoDB
- AI: OpenAI GPT-4o (Emergent LLM Key)
- SIGPAC APIs: REST + OGC + WMS

## Integraciones 3rd Party
- OpenAI GPT-4o (Emergent LLM Key) - ACTIVO
- SIGPAC WMS/REST/OGC (API gobierno espanol) - ACTIVO
- Resend (Email) - BLOQUEADO (necesita RESEND_API_KEY)
- OpenWeatherMap - BLOQUEADO (necesita API_KEY)

## Credenciales
- Admin: admin@fruveco.com / admin123

## Refactoring Completado
- Dashboard.js: 2168 → 788 lineas (5 subcomponentes)
- Contratos.js: 1917 → 388 lineas (form, filters, table)
- routes_rrhh.py: 1905 → 270 lineas (4 sub-routers)
- Evaluaciones.js: 1405 → 502 lineas (filters, table, form)
- Maquinaria.js: 1309 → 325 lineas (table, historial, form)
- Tratamientos.js: 2631 → 1785 lineas (calculadora, kpis, filters, table)

## Backlog
- P2: Email (Resend) - Bloqueado API Key
- P2: Meteorologia (OpenWeatherMap) - Bloqueado API Key
