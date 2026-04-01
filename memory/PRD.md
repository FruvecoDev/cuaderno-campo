# FRUVECO - PRD (Product Requirements Document)

## Problem Statement
Desarrollar una aplicacion de Cuaderno de Campo para el sector agricola que permita gestionar:
- Contratos, Parcelas, Mapas, Fincas, Visitas, Tareas, Cosechas, Tratamientos, Irrigaciones, Recetas, Albaranes
- Dashboard con KPIs
- Generacion de informes en PDF y Excel
- Panel de configuracion de usuarios y permisos (RBAC)
- Autenticacion con usuario y contrasena
- Integraciones con IA
- RRHH: Gestion de personal, fichajes, productividad, documentos, ausencias, prenomina

## Ultima Actualizacion: 1 Abril 2026 (Sesion 11)

### Completadas en esta sesion:

#### 1. Soporte Multi-Zona en Parcelas (P0 - Completado)
- **Problema**: Solo se podia dibujar un unico poligono por parcela, reemplazando el anterior
- **Solucion implementada**:
  - Modificado `AdvancedDrawControl` en `AdvancedParcelMap.js` para NO borrar capas existentes al dibujar nuevo poligono
  - Estado cambiado de `polygon` (array unico) a `zones` (array de arrays) en `Parcelas.js`
  - Cada zona tiene colores distintos para diferenciarlas visualmente
  - Panel informativo muestra: numero de zonas, puntos totales, area total, y detalle por zona
  - `handleSubmit` construye `recintos` desde todas las zonas dibujadas
  - `handleEdit` carga TODAS las zonas/recintos existentes (antes solo la primera)
  - Nueva columna "Zonas" en la tabla de parcelas mostrando count de recintos
  - FitBounds actualizado para ajustar vista a todas las zonas
  - Vista general del mapa ("Ver Mapa") ahora renderiza TODOS los recintos por parcela
  - Exportacion GeoJSON/KML actualizada para exportar multiples zonas
  - Importacion de archivos ahora anade zonas en vez de reemplazar
- **Archivos modificados**:
  - `/app/frontend/src/components/AdvancedParcelMap.js` - AdvancedDrawControl multi-zona, FitBounds multi-zona
  - `/app/frontend/src/pages/Parcelas.js` - Estado zones[], handleZonesChanged, tabla con columna Zonas
- **Verificado**: Testing agent - 29/29 backend tests, 100% frontend (iteration_46.json)

---

## Sesiones Anteriores Completadas

### Sesion 10 (3 Marzo 2026):
- Correccion de "Precios por Tenderometria" en Contratos
- Verificacion de persistencia de base de datos
- Generacion de datos de prueba completos
- Componente ProvinciaSelect implementado
- Reparacion modal Configuracion Dashboard (React Portals)
- Documentacion tecnica y PDF descargable
- API integracion ERP (contratos, fincas, parcelas)

### Sesion 9 (2 Marzo 2026):
- Selector de busqueda de articulos en albaranes

### Sesion 8:
- Modificacion logica destare en albaranes
- Generacion PDF de albaran

### Sesion 6:
- Nuevos campos en contratos (forma pago/cobro, descuento destare)
- Sistema de auditoria para contratos
- Logica destare y comisiones automaticas
- Pagina comisiones generadas
- Formato espanol en PDF liquidacion

### Sesion 5:
- Bug fix poligono visual en formulario crear parcela
- Mejoras formulario parcelas (codigo auto, finca/variedad selectores)

### Sesion 4:
- Bug critico "Objects not valid as React child" en Dashboard
- Modulo mapas con poligonos
- Importacion poligonos KML/GeoJSON
- Modulo cuaderno de campo PDF

### Sesion 3:
- Historial maquinaria, clientes, proveedores
- Permisos de menu completos
- Perfiles predefinidos de permisos
- Mejora modulos tratamientos y cosechas
- Modulo irrigaciones completo
- Modulo mapas

### Sesiones 1-2:
- Autenticacion JWT + RBAC
- Todos los modulos CRUD base
- Dashboard con KPIs
- Generacion reportes PDF/Excel
- IA: Sugerencias tratamientos, prediccion cosecha
- Multi-idioma (ES/EN/FR/DE/IT)
- RRHH completo con portal empleado
- Fitosanitarios, articulos, comisiones
- Albaranes vinculados a contratos

## Technical Stack
- Backend: FastAPI, Python 3.11
- Frontend: React 18, shadcn/ui
- Database: MongoDB (Motor async driver)
- Auth: JWT tokens
- AI: OpenAI GPT-4 via Emergent LLM Key
- Maps: Leaflet.js / OpenStreetMap / react-leaflet-draw
- Reports: WeasyPrint (PDF), openpyxl (Excel)

## Test Credentials
- Admin: admin@fruveco.com / admin123

## Pending/Blocked Issues
1. Notificaciones por Email (P2) - BLOCKED: Necesita RESEND_API_KEY del usuario

## Upcoming Tasks
- P1: Refactorizar componentes grandes (Dashboard.js, Contratos.js, routes_rrhh.py)
- P2: Implementar modulos restantes cuaderno de campo (Recetas, Tareas, Cosechas mejorados)

## Future/Backlog Tasks
- P2: Integraciones IA avanzadas (resumenes contratos, predicciones cosecha)
- P2: Identificacion NFC para control horario (RRHH)
- P2: Generalizar informes PDF/Excel para modulos restantes
