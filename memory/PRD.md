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
- Consulta SIGPAC con Mapa Interactivo (WMS oficial, consulta, importacion)

## Funcionalidades Core Completadas
- Autenticacion JWT con RBAC
- Dashboard drag-and-drop personalizable (@dnd-kit)
- Exportacion PDF/Excel en todos los modulos
- Centro de exportacion centralizado
- Alertas inteligentes (ITV, mantenimiento, certificados)
- Auto-generacion de tareas desde alertas
- Asistente IA (GPT-4o via Emergent LLM Key)
- API REST completa para integracion ERP (import + export)
- Webhooks con firma HMAC para notificaciones en tiempo real
- Integracion SIGPAC con mapa WMS interactivo (Ministerio de Agricultura)
- Mapa interactivo con capa WMS oficial, 3 capas base, expansion a pantalla completa

## Stack Tecnico
- Frontend: React + Leaflet + react-leaflet (WMSTileLayer) + @dnd-kit
- Backend: FastAPI + Motor (MongoDB async)
- DB: MongoDB
- AI: OpenAI GPT-4o (Emergent LLM Key)

## Integraciones 3rd Party
- OpenAI GPT-4o (Emergent LLM Key) - ACTIVO
- SIGPAC WMS/REST (API gobierno espanol) - ACTIVO
- Resend (Email) - Implementado, BLOQUEADO (necesita RESEND_API_KEY)
- OpenWeatherMap - Implementado, BLOQUEADO (necesita API_KEY)

## Credenciales
- Admin: admin@fruveco.com / admin123

## Backlog
- P2: App movil nativa (React Native) - Pendiente clarificacion
- P2: Email (Resend) - Bloqueado API Key
- P2: Meteorologia (OpenWeatherMap) - Bloqueado API Key
- P3: Refactoring Parcelas.js (~1500 lineas)
