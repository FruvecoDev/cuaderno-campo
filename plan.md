# plan.md

## 1) Objectives
- Entregar un **Cuaderno de Campo** completo por **Parcela + Cultivo + Contrato** con trazabilidad: visitas, tareas, tratamientos, riegos, cosechas, documentos, costes.
- Gestión integral de módulos: **Contratos, Fincas, Parcelas (SIGPAC manual + polígonos), Visitas, Tareas, Tratamientos, Irrigaciones, Recetas, Albaranes, Cosechas**.
- **Dashboard KPI** (producción, costes, tratamientos, cumplimiento) + **informes PDF/Excel**.
- **IA** para **reportes personalizados** y **análisis de datos** (resúmenes, alertas, insights, comparativas).
- **Seguridad end-to-end**: autenticación + **roles/permisos (RBAC)** por módulo/acción y (futuro) por campo/sección.
- **Gestión de usuarios** (Admins) y gobernanza básica: activación/desactivación y edición de rol.
- **Subida de documentos** (PDF/imagenes) vinculados a finca/parcela/contrato.
- **Calidad/operación**: suite smoke/E2E multi-rol y hardening de dependencias (PDF/WeasyPrint) para despliegues estables.

> Estado actual (resumen actualizado):
> - ✅ Fase 1 (POC): completada.
> - ✅ Fase 2 (V1 Build): completada.
> - ✅ Fase 3A (Autenticación): completada y verificada E2E.
> - ✅ Fase 3B-1 (RBAC por módulo/acción): completada (backend + frontend).
> - ✅ Fase 3B-2 (Gestión de usuarios): completada (panel Admin + creación/rol/estado).
> - ✅ Testing multi-rol: completado (Admin/Manager/Technician/Viewer).
> - ⏳ Próximo foco: hardening, permisos por campo/sección, mejora de UX/consistencia y expansión IA.

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
- ✅ Colecciones MongoDB y modelos completos
- ✅ CRUD APIs para todos los módulos
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
- ✅ Navegación completa con sidebar profesional
- ✅ Dashboard con KPIs + gráficas
- ✅ Páginas por módulo funcionales con CRUD
- ✅ Diseño profesional

**Notas de estabilidad (actualización):**
- ✅ Se resolvió un bloqueo del backend instalando dependencias runtime necesarias para WeasyPrint.
- ⏳ Recomendación: consolidarlo en la imagen/infra (ver Phase 5).

---

### Phase 3 — Seguridad, permisos y configuración (Auth + RBAC + usuarios)
**Meta:** activar autenticación y control fino sin romper el core.

#### Phase 3A — Autenticación (email/password + sesiones) ✅ COMPLETADA Y VERIFICADA
- ✅ Login (JWT)
- ✅ Logout (limpia token en cliente)
- ✅ `/api/auth/me` (sesión vigente)
- ✅ Rutas protegidas en frontend (redirige a `/login` si no autenticado)
- ✅ Inicialización Admin (`/api/auth/init-admin`) y credenciales por defecto
- ✅ Registro de usuarios (creación solo Admin)
- ✅ Corrección warning React Hook (AuthContext) con `useCallback`

**User stories (Phase 3A)**
1. ✅ Como usuario, quiero iniciar sesión para acceder a la app.
2. ✅ Como usuario, quiero cerrar sesión y que se elimine mi token.
3. ✅ Como usuario, quiero que al entrar a rutas protegidas sin sesión me lleve al login.

#### Phase 3B — RBAC por módulo/acción + Gestión de usuarios ✅ COMPLETADA

**3B-1 RBAC por módulo/acción ✅ COMPLETADO**
- ✅ Matriz de permisos por rol centralizada (backend) (`rbac_config.py`)
- ✅ Guards/dependencies aplicados a endpoints CRUD (FastAPI) (`rbac_guards.py`)
- ✅ Verificación funcional:
  - Sin token → 401/"Not authenticated"
  - Con token y rol adecuado → 200
- ✅ Frontend:
  - Sidebar filtrado por `modules_access` y secciones dinámicas
  - Botones/acciones condicionadas por permisos (`can_create`, `can_edit`, `can_delete`, `can_export`)
  - Utilidades de permisos reutilizables (`src/utils/permissions.js`)

**3B-2 Gestión de usuarios ✅ COMPLETADA (P1)**
- ✅ Nueva página **/usuarios** (solo Admin)
  - ✅ Listar usuarios
  - ✅ Crear usuario (Admin only) usando `/api/auth/register`
  - ✅ Editar rol
  - ✅ Activar/desactivar usuario
- ✅ Enlace “Usuarios” en sidebar solo para Admin
- ✅ Ajuste/migración: asegurar que Admin tenga `can_manage_users` (consistencia de permisos)

#### Phase 3C — Permisos por campo/sección + auditoría mínima (P2) ⏳ FUTURO
- Ocultar campos sensibles (p.ej., costes) por rol
- Secciones configurables por rol
- (Opcional) Multi-empresa ligero: separar datos por organización
- Auditoría mínima (log de cambios) en eventos críticos

**User stories (Phase 3B/3C)**
1. ✅ Como admin/manager/viewer, quiero que el sistema respete permisos por acción (crear/editar/borrar/exportar).
2. ✅ Como usuario, quiero que el menú muestre solo los módulos permitidos.
3. ✅ Como admin, quiero crear usuarios y asignar roles para controlar accesos.
4. ✅ Como manager, quiero que un técnico solo edite operaciones de campo y no contratos.
5. ✅ Como viewer, quiero consultar informes sin poder modificar datos.
6. Como admin, quiero ocultar campos sensibles (costes) para ciertos roles.
7. Como manager, quiero trazabilidad de cambios en tratamientos para auditoría.

---

### Phase 4 — IA en producto (reportes, análisis, asistentes) ⏳ PRÓXIMO
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

### Phase 5 — Hardening, rendimiento y calidad de datos ⏳ PRÓXIMO
- Consolidar dependencias de WeasyPrint en build/infra (evitar fallos por libs faltantes).
- Validaciones (unidades, rangos, fechas), catálogos (productos, variedades, maquinaria).
- Importación CSV/Excel (parcelas, eventos) + deduplicación.
- Optimización dashboard (agregaciones, índices).
- Regeneración de PDFs versionados y firma/folio (si requerido).
- Suite de tests regresión + checklist de “nada se rompe”.

---

## 3) Next Actions

### P0 (inmediato) ✅ COMPLETADO
1. ✅ **Corregir issues menores**
   - ✅ Albaranes: modelo consistente (`proveedor_cliente`).
   - ✅ Warnings menores React/dev-server: no bloqueantes.
2. ✅ **Seguridad completa (Auth + RBAC + UI)**
   - ✅ Autenticación verificada E2E.
   - ✅ RBAC backend (guards) y frontend (visibilidad + acciones).
3. ✅ **Gestión de usuarios**
   - ✅ Panel Admin /usuarios
   - ✅ Crear/editar rol/activar-desactivar
4. ✅ **Testing multi-rol**
   - ✅ Admin/Manager/Technician/Viewer con verificación de UI y permisos.

### P1 (siguiente)
5. **Hardening de despliegue (WeasyPrint + env)**
   - Incluir libs del sistema en imagen/infra.
   - Añadir verificación de arranque (healthcheck) y logs claros.
6. **Mejorar UX de permisos**
   - Deshabilitar acciones no permitidas con tooltip/feedback.
   - Mensajes consistentes cuando backend responde 403.
7. **Flujo de cambio/reset de password**
   - Definir enfoque: reset por admin vs. self-service.
   - Implementar endpoint(s) y UI.

### P2
8. Permisos por campo/sección + auditoría mínima de cambios
9. Mejoras de consistencia de datos y simplificación de formularios (Irrigaciones/Recetas/Albaranes)

---

## 4) Success Criteria
- ✅ Flujo principal completo: **Finca→Parcela (mapa)→Contrato+Cultivo→eventos→costes→PDF/Excel→dashboard**.
- ✅ Autenticación robusta: **login/logout**, rutas protegidas, `/me` estable.
- ✅ RBAC funciona sin filtrar datos ni permitir acciones indebidas (backend + UI).
- ✅ Panel Admin permite gestionar usuarios y roles sin intervención técnica.
- ⏳ PDF/Excel export estable en despliegue (sin fallos por dependencias runtime) y con datos consistentes.
- ⏳ IA genera reportes **útiles, reproducibles y guardables** a partir de datos reales.
- ✅ Subida/visualización de documentos estable (PDF/imagen) y vinculada a entidades.
