# plan.md

## 1) Objectives
- Entregar un **Cuaderno de Campo** completo por **Parcela + Cultivo + Contrato/Campaña** con trazabilidad: visitas, tareas, tratamientos, riegos, cosechas, documentos, costes.
- Garantizar que los módulos operativos (**Visitas** y **Tratamientos**) quedan **vinculados de forma consistente** al contexto agronómico (**Contrato → Parcela → Cultivo → Campaña**), evitando datos “sueltos”, duplicidades y problemas de auditoría.
- Mantener un flujo estable de **Gestión** (Contratos) y **Operación** (Visitas/Tratamientos) con validaciones y UX guiada, respetando RBAC.
- Mejorar progresivamente la **legibilidad** de listados (mostrar nombres vs IDs) y la **calidad de datos** (migración/compatibilidad con registros legacy).
- **Hardening operativo**: asegurar estabilidad de dependencias de exportación (WeasyPrint) y reducir warnings UI no bloqueantes.
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
> - ✅ **Fase 4 (Contratos + Visitas/Tratamientos)**: completada al **100%** (backend + frontend).
> - ✅ **Testing E2E/Manual**: completado con éxito (overall **95.8%**; backend **96.6%**, frontend **95.0%**).
> - ⚠️ Issues menores:
>   - (LOW) warnings de hidratación/estructura en tablas.
>   - (MEDIUM) registros legacy muestran `N/A` en `cultivo/campaña` (sin migración).
> - ⚠️ **Hardening WeasyPrint**: se detectó falta de libs (p.ej. `libpangoft2-1.0-0`) y se reinstaló; queda como tarea de hardening para evitar regresiones.
> - ⏳ Próximo foco: migración/compatibilidad legacy, legibilidad (nombres vs IDs), hardening despliegue y testing multi-rol ampliado.

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

### Phase 4 — Estabilización de Contratos + Relación Operativa (Visitas/Tratamientos) ✅ COMPLETADA
**Meta:** asegurar integridad y UX del flujo crítico: **Contrato → Parcela → Cultivo → Campaña → (Visitas/Tratamientos)**.

#### Phase 4A — Reparar formulario de Contratos (P0 — Crítico) ✅ COMPLETADA
- ✅ Reescritura limpia del formulario en `frontend/src/pages/Contratos.js`.
- ✅ Dropdowns conectados a catálogos:
  - Proveedor: `proveedor_id`
  - Cultivo: `cultivo_id`
- ✅ `articulo_mp` queda como opcional (compatibilidad temporal).
- ✅ Backend: `ContratoCreate` acepta `proveedor_id`/`cultivo_id` y legacy opcional.
- ✅ Flujo verificado por API y UI.

#### Phase 4B — Vincular Visitas y Tratamientos a Parcela + Cultivo + Campaña (P1 — Alto) ✅ COMPLETADA
**Modelo implementado:**
- Visitas:
  - `parcela_id` (obligatorio)
  - `cultivo_id` (obligatorio)
  - `campana` (obligatorio)
  - `contrato_id` (opcional recomendado; si existe, se valida consistencia)
- Tratamientos:
  - `parcelas_ids` (multi-parcela)
  - `cultivo_id` (obligatorio para contexto)
  - `campana` (obligatorio)
  - `contrato_id` (opcional recomendado; si existe, se valida consistencia)

**Backend:**
- ✅ Modelos Pydantic actualizados.
- ✅ Endpoints POST con validación de existencia + consistencia con contrato.
- ✅ Listados GET soportan filtros: `campana`, `parcela_id`, `cultivo_id`, `contrato_id`.

**Frontend:**
- ✅ Formularios guiados con selector de contrato opcional.
- ✅ Tratamientos: selección múltiple de parcelas.
- ✅ Validación client-side + manejo de errores.

#### Phase 4C — Testing integral del flujo (P1) ✅ COMPLETADA
- ✅ Testing E2E/Manual completado:
  - Overall: **95.8%**
  - Backend: **96.6%** (sin bugs críticos)
  - Frontend: **95.0%** (sin bugs funcionales)
- ⚠️ Issues menores detectados (ver Phase 6/Next Actions):
  - warnings no bloqueantes en tablas
  - datos legacy sin migrar

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
- Migración/compatibilidad de datos legacy:
  - Backfill de `cultivo_id`/`campana` en tratamientos/visitas antiguos cuando sea posible.
  - Estrategia: script de migración + fallback de display en UI.
- Mejoras de legibilidad en UI:
  - Mostrar nombres de parcela/cultivo (no IDs) en tablas de Visitas/Tratamientos.
- Resolver warnings no bloqueantes de tablas (estructura/hidratación).
- Validaciones (unidades, rangos, fechas), catálogos (productos, variedades, maquinaria).
- Importación CSV/Excel (parcelas, eventos) + deduplicación.
- Optimización dashboard (agregaciones, índices).
- Regeneración de PDFs versionados y firma/folio (si requerido).
- Suite de tests regresión + checklist de “nada se rompe”.

---

## 3) Next Actions

### P0 ✅ (completado)
1. ✅ Contratos estables con `proveedor_id`/`cultivo_id`.
2. ✅ Visitas/Tratamientos vinculados a Parcela+Cultivo+Campaña (backend+frontend).
3. ✅ Testing E2E/Manual completado para el flujo nuevo.

### P1 (siguiente) 🔄
4. **Migración de registros legacy** (MEDIUM)
   - Identificar registros sin `cultivo_id/campana` y proponer estrategia (script + fallback).
5. **Legibilidad en tablas** (MEDIUM)
   - Mostrar nombres en listados (parcela/cultivo) en lugar de IDs.
6. **Reducir warnings UI no bloqueantes** (LOW)
   - Revisar estructura DOM en tablas.

### P2
7. Permisos por campo/sección + auditoría mínima de cambios.
8. Hardening de despliegue (WeasyPrint + env).
9. Mejoras de consistencia de datos y simplificación de formularios (Irrigaciones/Recetas/Albaranes).
10. Flujo de cambio/reset de password.

---

## 4) Success Criteria
- ✅ Autenticación robusta: **login/logout**, rutas protegidas, `/me` estable.
- ✅ RBAC funciona sin filtrar datos ni permitir acciones indebidas (backend + UI).
- ✅ Panel Admin permite gestionar usuarios y roles sin intervención técnica.
- ✅ Contratos: formulario estable (crear/editar/borrar) usando **proveedor_id/cultivo_id**.
- ✅ Visitas/Tratamientos: modelo y formularios garantizan vínculo a **Parcela + Cultivo + Campaña**.
- ✅ Testing: pruebas manuales/E2E completadas y documentadas para el flujo nuevo.
- ✅ La aplicación está lista para uso en producción con las nuevas funcionalidades.
- ⏳ Migración legacy completada o fallback de display implementado (sin `N/A` en tablas relevantes).
- ⏳ PDF/Excel export estable en despliegue (sin fallos por dependencias runtime) y con datos consistentes.
- ⏳ IA genera reportes **útiles, reproducibles y guardables** a partir de datos reales.
