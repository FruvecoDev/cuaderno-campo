# FRUVECO - PRD (Product Requirements Document)

## Problem Statement
Desarrollar una aplicacion de Cuaderno de Campo para el sector agricola que permita gestionar:
Contratos, Parcelas, Mapas, Fincas, Visitas, Tareas, Cosechas, Tratamientos, Irrigaciones, Recetas, Albaranes, Dashboard, Generacion de informes PDF/Excel, RBAC, Autenticacion, Integraciones IA, RRHH completo.

## Ultima Actualizacion: 1 Abril 2026 (Sesion 11)

### Completadas en esta sesion:

#### 1. Soporte Multi-Zona en Parcelas (P0 - Completado)
- Multiples poligonos independientes por parcela con cualquier numero de puntos
- Colores distintos por zona, panel info con detalle por zona
- Exportacion/importacion multi-zona (GeoJSON/KML)
- Columna "Zonas" en tabla de parcelas
- Archivos: `AdvancedParcelMap.js`, `Parcelas.js`
- Testing: 29/29 backend + 100% frontend (iteration_46.json)

#### 2. Campo Codigo Plantacion readonly (Bug Fix)
- Campo siempre readonly y auto-generado

#### 3. Refactorizacion P1 Dashboard.js (2168 -> 788 lineas, -64%)
- Extraidos: VisitasCalendar, DashboardConfigModal, DashboardFincasWidget, DashboardContratosWidget, DashboardMapWidget
- Ubicacion: `/app/frontend/src/components/dashboard/`
- Testing: 100% (iteration_47.json)

#### 4. Refactorizacion P1 routes_rrhh.py (1905 -> 270 lineas, -86%)
- Extraidos: rrhh_fichajes.py (549 lineas), rrhh_productividad.py (201 lineas), rrhh_documentos.py (386 lineas)
- Ubicacion: `/app/backend/routes/`
- Testing: 15/15 backend (iteration_47.json)

---

## Architecture
```
/app/
  backend/
    server.py
    models.py
    routes/
      routes_rrhh.py (270 lines - Empleados + Portal)
      rrhh_fichajes.py (549 lines)
      rrhh_productividad.py (201 lines)
      rrhh_documentos.py (386 lines)
      rrhh_ausencias.py (159 lines)
      rrhh_prenominas.py (859 lines)
      routes_erp_integration.py
    routes_parcelas.py
    routes_uploads.py
  frontend/src/
    pages/
      Dashboard.js (788 lines)
      Parcelas.js (multi-zona)
      Contratos.js (1917 lines - candidato a refactorizar)
    components/
      dashboard/
        VisitasCalendar.js
        DashboardConfigModal.js
        DashboardFincasWidget.js
        DashboardContratosWidget.js
        DashboardMapWidget.js
      AdvancedParcelMap.js (multi-zona)
      ProvinciaSelect.js
```

## Test Credentials
- Admin: admin@fruveco.com / admin123

## Pending/Blocked Issues
- Notificaciones por Email (P2) - BLOCKED: Necesita RESEND_API_KEY

## Upcoming Tasks
- P1: Refactorizar Contratos.js (1917 lineas)
- P2: Mejorar modulos Recetas, Tareas, Cosechas

## Future/Backlog
- P2: Integraciones IA avanzadas
- P2: NFC para RRHH
- P2: Informes PDF/Excel generalizados
