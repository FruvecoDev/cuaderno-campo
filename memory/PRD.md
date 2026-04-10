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
- Notificaciones In-App con badge y auto-generacion de alertas

## Funcionalidades Core
- Autenticacion JWT con RBAC
- Dashboard drag-and-drop personalizable (@dnd-kit)
- Exportacion PDF/Excel en todos los modulos
- Alertas inteligentes + notificaciones automaticas (ITV, mantenimiento, certificados, tareas vencidas, contratos por vencer)
- Asistente IA (GPT-4o via Emergent LLM Key)
- API REST completa para integracion ERP bidireccional
- SIGPAC: mapa WMS interactivo, click-to-identify (OGC API)
- PWA: manifest, service worker, offline cache, install prompt

## Stack Tecnico
- Frontend: React + Leaflet + @dnd-kit
- Backend: FastAPI + Motor (MongoDB async)
- DB: MongoDB
- AI: OpenAI GPT-4o (Emergent LLM Key)

## Integraciones 3rd Party
- OpenAI GPT-4o (Emergent LLM Key) - ACTIVO
- SIGPAC WMS/REST/OGC (API gobierno espanol) - ACTIVO
- Resend (Email) - BLOQUEADO (necesita RESEND_API_KEY)
- OpenWeatherMap - BLOQUEADO (necesita API_KEY)

## Credenciales
- Admin: admin@fruveco.com / admin123

## Backlog
- P2: Email (Resend) - Bloqueado API Key
- P2: Meteorologia (OpenWeatherMap) - Bloqueado API Key
