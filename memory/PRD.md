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
- Integracion ERP Bidireccional
- Consulta SIGPAC con Mapa Interactivo
- PWA (Progressive Web App)
- Notificaciones In-App con badge y auto-generacion de alertas
- Historial de Tratamientos por Parcela

## Experiencia Movil (PWA Optimizada)
- Header movil: hamburger + logo + notificaciones
- Bottom Navigation Bar: Inicio, Parcelas, +FAB, Visitas, Tratamientos, Mas
- FAB (Floating Action Button): acciones rapidas para crear (Visita, Tratamiento, Tarea, Cosecha, Contrato, Irrigacion)
- KPIs en 2 columnas en movil
- Tablas con scroll horizontal
- Modales full-screen en movil
- Touch targets optimizados (min 44px)
- CSS transitions y animaciones tactiles
- Safe area insets para dispositivos con notch

## Refactorizaciones Completadas
- Dashboard.js: 2168 -> 788 lineas
- Contratos.js: 1917 -> 388 lineas
- routes_rrhh.py: 1905 -> 270 lineas
- Tratamientos.js: 2631 -> 1785 lineas
- Visitas.js: 1921 -> 447 lineas (5 subcomponentes)

## Stack Tecnico
- Frontend: React + Leaflet + @dnd-kit
- Backend: FastAPI + Motor (MongoDB async)
- DB: MongoDB
- AI: OpenAI GPT-4o (Emergent LLM Key)

## Integraciones 3rd Party
- OpenAI GPT-4o (Emergent LLM Key) - ACTIVO
- SIGPAC WMS/REST/OGC - ACTIVO
- Resend (Email) - BLOQUEADO (necesita RESEND_API_KEY)
- OpenWeatherMap - BLOQUEADO (necesita API_KEY)

## Credenciales
- Admin: admin@fruveco.com / admin123

## Backlog
- P1: Integraciones IA avanzadas (resumenes contratos, predicciones cosechas) - YA IMPLEMENTADO
- P1: Identificacion NFC para fichajes RRHH
- P2: Email (Resend) - Bloqueado API Key
- P2: Meteorologia (OpenWeatherMap) - Bloqueado API Key
