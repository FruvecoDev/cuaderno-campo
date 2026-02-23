# plan.md

## 1) Objectives
- Entregar un **Cuaderno de Campo** completo por **Parcela + Cultivo + Contrato** con trazabilidad: visitas, tareas, tratamientos, riegos, cosechas, documentos, costes.
- Gestión integral de módulos: **Contratos, Fincas, Parcelas (SIGPAC manual + polígonos), Visitas, Tareas, Tratamientos, Irrigaciones, Recetas, Albaranes, Cosechas**.
- **Dashboard KPI** (producción, costes, tratamientos, cumplimiento) + **informes PDF/Excel**.
- **IA** para **reportes personalizados** y **análisis de datos** (resúmenes, alertas, insights, comparativas).
- **Seguridad end-to-end**: autenticación + **roles/permisos (RBAC)** por módulo/acción y (futuro) por campo/sección.
- **Gestión de usuarios** (Admins) y gobernanza básica: activación/desactivación, auditoría mínima.
- **Subida de documentos** (PDF/imagenes) vinculados a finca/parcela/contrato.

> Estado actual (resumen):
> - ✅ Fase 1 (POC): completada.
> - ✅ Fase 2 (V1 Build): completada.
> - ✅ Autenticación (Fase 3 - parte 1): **implementada y verificada E2E** (login, logout, /me, rutas protegidas, init-admin).

---

## 2) Implementation Steps (Phases)

### Phase 1 — Core POC (aislado) “Cuaderno de Campo generable” ✅ COMPLETADA
**Meta:** probar lo más frágil: **IA + exportación PDF/Excel + agregación de datos** y una **parcela con polígono**.
- Web research rápido: mejores prácticas para
  - generación PDF server-side (plantillas HTML→PDF) y Excel (XLSX)
  - prompts/estructura para reportes agrícolas con LLM (costes, incidencias, cumplimiento)
- Definir **modelo mínimo** (POC): Parcela, Cultivo, Contrato, Tratamiento, Riego, Cosecha, Visita, Documento, Coste.
- Script(s) de prueba (Python/Node) para:
  - Llamada IA: generar **resumen de campaña** a partir de JSON agregado.
  - Generar **PDF “Cuaderno de Campo”** (plantilla simple) y **Excel** con tablas.
- POC UI mínima (sin auth):
  - Crear Parcela + dibujar polígono
  - Añadir 1 Contrato + Cultivo + 2-3 eventos (tratamiento/riego/visita/cosecha)
  - Botón: **Generar PDF/Excel** + **Reporte IA**
- Criterio de salida: exporta correctamente y el reporte IA es estable/repetible con guardado.

**User stories (Phase 1)**
1. ✅ Como técnico, quiero crear una parcela y dibujar su polígono para ubicarla en el mapa.
2. ✅ Como manager, quiero registrar un contrato asociado a parcela y cultivo para iniciar campaña.
3. ✅ Como técnico, quiero añadir tratamientos/riegos/visitas rápidamente para tener trazabilidad.
4. ✅ Como manager, quiero generar un PDF de cuaderno de campo descargable para auditorías.
5. ✅ Como usuario, quiero un reporte IA que resuma la campaña y destaque anomalías/costes.

---

### Phase 2 — V1 App Development (MVP completo y funcional) ✅ COMPLETADO
**Meta:** construir la app funcional end-to-end alrededor del core probado.

**IMPLEMENTADO COMPLETAMENTE:**

**Backend FastAPI + MongoDB:**
- ✅ 10+ colecciones MongoDB con modelos completos
- ✅ CRUD APIs para TODOS los módulos (histórico: ~95% test success)
- ✅ Dashboard KPIs endpoint con agregaciones
- ✅ AI report generation
- ✅ PDF generation (WeasyPrint)
- ✅ Excel export (openpyxl)
- ✅ File upload system (documentos)
- ✅ Módulos implementados:
  - Contratos
  - Parcelas (con recintos SIGPAC)
  - Fincas
  - Visitas
  - Tareas
  - Tratamientos
  - Irrigaciones
  - Recetas
  - Albaranes
  - Cosechas
  - Documentos

**Frontend React + Leaflet:**
- ✅ Navegación completa con sidebar profesional (12 módulos)
- ✅ Dashboard con KPIs + gráficas
- ✅ Páginas por módulo funcionales con CRUD
- ✅ Diseño profesional

**Notas de estabilidad (actualización):**
- Se resolvió un bloqueo del backend al instalar dependencias runtime necesarias para WeasyPrint (libs del sistema). Se recomienda consolidarlo en la imagen/infra (ver Phase 5).

---

### Phase 3 — Seguridad, permisos y configuración (Auth + RBAC + campos)
**Meta:** activar autenticación y control fino sin romper el core.

#### Phase 3A — Autenticación (email/password + sesiones) ✅ COMPLETADA Y VERIFICADA
- ✅ Login (JWT)
- ✅ Logout (limpia token en cliente)
- ✅ `/api/auth/me` (sesión vigente)
- ✅ Rutas protegidas en frontend (redirige a `/login` si no autenticado)
- ✅ Inicialización Admin (`/api/auth/init-admin`) y credenciales por defecto
- ✅ Registro de usuarios (endpoint existente; creación solo Admin)
- ✅ Corrección warning React Hook (AuthContext) con `useCallback`

**User stories (Phase 3A)**
1. ✅ Como usuario, quiero iniciar sesión para acceder a la app.
2. ✅ Como usuario, quiero cerrar sesión y que se elimine mi token.
3. ✅ Como usuario, quiero que al entrar a rutas protegidas sin sesión me lleve al login.

#### Phase 3B — RBAC por módulo/acción + Gestión de usuarios (P0/P1) ⏳ PRÓXIMO
- Permisos por acción (ver/crear/editar/borrar/exportar) aplicados en:
  - Backend: dependencias/guards por endpoint
  - Frontend: ocultar/inhabilitar acciones (botones, formularios)
- Panel Admin: gestión de usuarios
  - listar usuarios
  - crear usuario (Admin only)
  - editar rol/estado (activar/desactivar)
  - reset password / cambio de password (definir enfoque)
- Alinear modelo de permisos:
  - fuente de verdad en backend
  - reflejo en UI desde `/me`
- Testing E2E multi-rol (Admin/Manager/Technician/Viewer)

#### Phase 3C — Permisos por campo/sección (P2) ⏳ FUTURO
- Ocultar campos sensibles (p.ej., costes) por rol
- Secciones configurables por rol
- (Opcional) Multi-empresa ligero: separar datos por organización
- Auditoría mínima (log de cambios) en eventos críticos

**User stories (Phase 3B/3C)**
1. Como admin, quiero crear usuarios y asignar roles para controlar accesos.
2. Como manager, quiero que un técnico solo edite tratamientos y riegos, no contratos.
3. Como viewer, quiero consultar informes sin poder modificar datos.
4. Como admin, quiero ocultar campos sensibles (costes) para ciertos roles.
5. Como manager, quiero trazabilidad de cambios en tratamientos para auditoría.

---

### Phase 4 — IA en producto (reportes, análisis, asistentes)
**Meta:** convertir la IA en funcionalidad recurrente y accionable.
- Reportes IA guardables por contrato/parcela/finca:
  - resumen ejecutivo, incidencias, desviaciones de coste, comparativas campañas.
- “Preguntar a tus datos” (RAG ligero sobre datos estructurados):
  - consultas tipo: “coste/ha por cultivo”, “tratamientos por materia activa”.
- Alertas/insights:
  - anomalías (exceso de riego, costes atípicos), cumplimiento (plazo seguridad).
- Controles: límites de tokens, plantillas de prompt, redacción segura, trazas.
- Testing: calidad de outputs + estabilidad + costes.

---

### Phase 5 — Hardening, rendimiento y calidad de datos
- Consolidar dependencias de WeasyPrint en build/infra (evitar fallos por libs faltantes).
- Validaciones (unidades, rangos, fechas), catálogos (productos, variedades, maquinaria).
- Importación CSV/Excel (parcelas, eventos) + deduplicación.
- Optimización dashboard (agregaciones, índices).
- Regeneración de PDFs versionados y firma/folio (si requerido).
- Suite de tests regresión + checklist de “nada se rompe”.

---

## 3) Next Actions
### P0 (inmediato)
1. **Corregir issues menores pendientes**
   - Inconsistencia en modelo backend de `albaranes` (definir/normalizar esquema y ajustar endpoints + UI si aplica).
   - Warnings menores de React/webpack dev-server (si quedan) y limpieza de lint.
2. **RBAC por módulo/acción (mínimo viable)**
   - Definir matriz permisos por rol.
   - Implementar guards backend para acciones críticas (create/update/delete/export).
   - Implementar control UI (botones/acciones) usando `user.can_*` + `modules_access`.

### P1
3. **Panel Admin de usuarios**
   - Vista lista + edición de rol/estado.
   - Crear usuario (Admin only) usando endpoint `/api/auth/register`.
   - Desactivar usuario y validar login bloqueado.
4. **E2E multi-rol**
   - Scripts Playwright/cypress (o smoke tests) para: Viewer read-only, Technician sin delete, Manager sin admin.

### P2
5. Permisos por campo/sección + auditoría mínima de cambios
6. Mejoras módulos simplificados (Irrigaciones, Recetas, Albaranes) y consistencia de datos

---

## 4) Success Criteria
- ✅ Flujo principal completo: **Finca→Parcela (mapa)→Contrato+Cultivo→eventos→costes→PDF/Excel→dashboard**.
- ✅ Autenticación robusta: **login/logout**, rutas protegidas, `/me` estable.
- RBAC funciona sin filtrar datos ni permitir acciones indebidas (backend + UI).
- Panel Admin permite gestionar usuarios y roles sin intervención técnica.
- PDF/Excel export estable (sin fallos por dependencias runtime) y con datos consistentes.
- IA genera reportes **útiles, reproducibles y guardables** a partir de datos reales.
- Subida/visualización de documentos estable (PDF/imagen) y vinculada a entidades.
