# plan.md

## 1) Objectives
- Entregar un **Cuaderno de Campo** completo por **Parcela + Cultivo + Contrato/Campaña** con trazabilidad: visitas, tareas, tratamientos, riegos, cosechas, documentos, costes.
- Asegurar que los módulos operativos (**Visitas** y **Tratamientos**) queden **vinculados de forma consistente** al contexto agronómico correcto (**Contrato → Parcela → Cultivo → Campaña**), evitando datos “sueltos” y duplicidades.
- Gestión integral de módulos: **Contratos, Fincas, Parcelas (SIGPAC manual + polígonos), Visitas, Tareas, Tratamientos, Irrigaciones, Recetas, Albaranes, Cosechas, Documentos**.
- **Dashboard KPI** (producción, costes, tratamientos, cumplimiento) + **informes PDF/Excel**.
- **IA** para **reportes personalizados** y **análisis de datos** (resúmenes, alertas, insights, comparativas).
- **Seguridad end-to-end**: autenticación + **roles/permisos (RBAC)** por módulo/acción y (futuro) por campo/sección.
- **Gestión de usuarios** (Admins) y gobernanza básica: activación/desactivación y edición de rol.
- **Calidad/operación**: suite smoke/E2E multi-rol y hardening de dependencias (PDF/WeasyPrint) para despliegues estables.

> Estado actual (resumen actualizado):
> - ✅ Fase 1 (POC): completada.
> - ✅ Fase 2 (V1 Build): completada.
> - ✅ Fase 3A (Autenticación): completada y verificada E2E.
> - ✅ Fase 3B-1 (RBAC por módulo/acción): completada (backend + frontend).
> - ✅ Fase 3B-2 (Gestión de usuarios): completada (panel Admin + creación/rol/estado).
> - ✅ Catálogos de **Proveedores** y **Cultivos**: creados (backend + frontend).
> - ✅ **Contratos**: formulario **reparado** y funcionando con dropdowns y referencias `proveedor_id` / `cultivo_id`.
> - ⏳ **Visitas/Tratamientos**: pendiente consolidar el **vínculo obligatorio** a **Parcela + Cultivo + Campaña** (preferiblemente derivado del contrato).
> - ⚠️ **Hardening WeasyPrint**: se detectó que faltaban libs (p.ej. `libpangoft2-1.0-0`) y se reinstalaron; queda como tarea de hardening para evitar regresiones.
> - ⏳ Próximo foco: integridad de datos Visitas/Tratamientos, hardening, permisos por campo/sección, mejora de UX/consistencia y expansión IA.

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
- ⚠️ Reincidencia detectada en entorno: falta de `libpangoft2-1.0-0` → reinstalado + restart backend.
- ⏳ Recomendación: consolidarlo en la imagen/infra (ver Phase 6).

---

### Phase 3 — Seguridad, permisos y configuración (Auth + RBAC + usuarios) ✅ COMPLETADA
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
- ✅ Frontend:
  - Sidebar filtrado por `modules_access` y secciones dinámicas
  - Botones/acciones condicionadas por permisos (`can_create`, `can_edit`, `can_delete`, `can_export`)
  - Utilidades de permisos reutilizables (`src/utils/permissions.js`)

**3B-2 Gestión de usuarios ✅ COMPLETADA (P1)**
- ✅ Página **/usuarios** (solo Admin): listar, crear, editar rol, activar/desactivar.

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

### Phase 4 — Estabilización de Contratos + Relación Operativa (Visitas/Tratamientos)
**Meta:** asegurar integridad y UX del flujo crítico: **Contrato → Parcela → Cultivo → Campaña → (Visitas/Tratamientos)**.

#### Phase 4A — Reparar formulario de Contratos (P0 — Crítico) ✅ COMPLETADA
- ✅ Reescritura limpia del formulario en `frontend/src/pages/Contratos.js`.
- ✅ Dropdowns conectados a catálogos:
  - Proveedor: `proveedor_id`
  - Cultivo: `cultivo_id`
- ✅ `articulo_mp` queda como opcional (compatibilidad temporal).
- ✅ Actualización backend: `ContratoCreate` acepta `proveedor_id`/`cultivo_id` y legacy opcional.
- ✅ Flujo verificado por API: crear y listar contratos correctamente (con nombres poblados en backend).

**Criterio de salida Phase 4A (cumplido):**
- ✅ No hay JSX duplicado/roto.
- ✅ Se puede crear contrato con IDs.
- ✅ La tabla puede mostrar nombres legibles mediante campos poblados.

#### Phase 4B — Vincular Visitas y Tratamientos a Parcela + Cultivo + Campaña (P1 — Alto) ⏳ EN CURSO
- Definir/confirmar el **modelo de vínculo** (mínimo recomendado):
  - `contrato_id` (recomendado)
  - `parcela_id` (obligatorio)
  - `cultivo_id` (obligatorio)
  - `campana` (obligatorio; si viene `contrato_id`, derivar/validar)
- Backend:
  - Actualizar modelos Pydantic de Visitas y Tratamientos para incluir IDs y campos requeridos.
  - Actualizar endpoints CRUD para aceptar/validar estos campos.
  - Añadir validaciones de consistencia:
    - Si `contrato_id` existe → forzar que `campana`, `cultivo_id` y (si aplica) `proveedor_id` coincidan.
    - `parcela_id` debe existir y pertenecer al mismo contexto (campaña/proveedor) cuando aplique.
  - Ajustar listados para soportar filtros (`campana`, `parcela_id`, `cultivo_id`, `contrato_id`).
- Frontend:
  - Rediseñar formularios Visitas/Tratamientos con flujo guiado:
    1) Contrato (o Campaña) → 2) Parcela → 3) Cultivo → 4) Campaña (autocompletada/bloqueada si viene del contrato).
  - Mejorar UX: filtros por campaña/parcela; preselecciones desde páginas de detalle.

**Criterio de salida Phase 4B:**
- Visitas/Tratamientos quedan inequívocamente asociados a Parcela + Cultivo + Campaña.
- Se puede generar cuaderno/reportes sin ambigüedades por campaña.

#### Phase 4C — Testing integral del flujo (P1) ⏳ PENDIENTE
- Smoke tests multi-rol (Admin/Manager/Technician/Viewer) para:
  - Contratos (ya estable)
  - Visitas/Tratamientos (nuevo modelo)
- Verificar respuestas 401/403 y mensajes consistentes.
- Verificar que cambios no rompen exportaciones (PDF/Excel) si consumen estos datos.

---

### Phase 5 — IA en producto (reportes, análisis, asistentes) ⏳ PRÓXIMO
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

### Phase 6 — Hardening, rendimiento y calidad de datos ⏳ PRÓXIMO
- Consolidar dependencias de WeasyPrint en build/infra (evitar fallos por libs faltantes como `libpangoft2-1.0-0`).
- Validaciones (unidades, rangos, fechas), catálogos (productos, variedades, maquinaria).
- Importación CSV/Excel (parcelas, eventos) + deduplicación.
- Optimización dashboard (agregaciones, índices).
- Regeneración de PDFs versionados y firma/folio (si requerido).
- Suite de tests regresión + checklist de “nada se rompe”.

---

## 3) Next Actions

### P0 (inmediato) ✅
1. ✅ **Reparar formulario de Contratos**
   - ✅ Eliminar JSX duplicado y dejar un formulario único.
   - ✅ Dropdowns para `proveedor_id` y `cultivo_id`.
   - ✅ Crear/listar contratos verificado.

### P1 (siguiente) 🔄
2. **Vincular Visitas/Tratamientos al contexto agronómico (Parcela + Cultivo + Campaña)**
   - Actualizar modelos + endpoints backend.
   - Actualizar formularios frontend con flujo guiado.
   - Añadir validaciones de consistencia y filtros.
3. **Testing integral multi-rol del flujo Contratos→Operaciones**
   - Smoke tests de permisos y de integridad de datos.

### P2
4. Permisos por campo/sección + auditoría mínima de cambios
5. Hardening de despliegue (WeasyPrint + env)
6. Mejoras de consistencia de datos y simplificación de formularios (Irrigaciones/Recetas/Albaranes)
7. Flujo de cambio/reset de password

---

## 4) Success Criteria
- ✅ Autenticación robusta: **login/logout**, rutas protegidas, `/me` estable.
- ✅ RBAC funciona sin filtrar datos ni permitir acciones indebidas (backend + UI).
- ✅ Panel Admin permite gestionar usuarios y roles sin intervención técnica.
- ✅ Contratos: formulario estable (crear/editar/borrar) usando **proveedor_id/cultivo_id**.
- ⏳ Visitas/Tratamientos: quedan vinculados a **Parcela + Cultivo + Campaña** con integridad.
- ✅ Subida/visualización de documentos estable (PDF/imagen) y vinculada a entidades.
- ⏳ PDF/Excel export estable en despliegue (sin fallos por dependencias runtime) y con datos consistentes.
- ⏳ IA genera reportes **útiles, reproducibles y guardables** a partir de datos reales.
