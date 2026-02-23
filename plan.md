# plan.md

## 1) Objectives
- Entregar un **Cuaderno de Campo** completo por **Parcela + Cultivo + Contrato** con trazabilidad: visitas, tareas, tratamientos, riegos, cosechas, documentos, costes.
- Gestión integral de módulos: **Contratos, Fincas, Parcelas (SIGPAC manual + polígonos), Visitas, Tareas, Tratamientos, Irrigaciones, Recetas, Albaranes, Cosechas**.
- **Dashboard KPI** (producción, costes, tratamientos, cumplimiento) + **informes PDF/Excel**.
- **IA** para **reportes personalizados** y **análisis de datos** (resúmenes, alertas, insights, comparativas).
- **Usuarios/roles** (Admin/Manager/Technician/Viewer) con **permisos por sección y campos** + autenticación email/password.
- **Subida de documentos** (PDF/imagenes) vinculados a finca/parcela/contrato.

## 2) Implementation Steps (Phases)

### Phase 1 — Core POC (aislado) “Cuaderno de Campo generable”
**Meta:** probar lo más frágil: **IA + exportación PDF/Excel + agregación de datos** y una **parcela con polígono**.
- Web research rápido: mejores prácticas para
  - generación PDF server-side (plantillas HTML→PDF) y Excel (XLSX)
  - prompts/estructura para reportes agrícolas con LLM (costes, incidencias, cumplimiento)
- Definir **modelo mínimo** (POC): Parcela, Cultivo, Contrato, Tratamiento, Riego, Cosecha, Visita, Documento, Coste.
- Script(s) de prueba (Python/Node) para:
  - Llamada IA: generar **resumen de campaña** a partir de JSON agregado.
  - Generar **PDF “Cuaderno de Campo”** (plantilla simple) y **Excel** con tablas.
- POC UI mínima (sin auth):
  - Crear Parcela + dibujar polígono en Google Maps
  - Añadir 1 Contrato + Cultivo + 2-3 eventos (tratamiento/riego/visita/cosecha)
  - Botón: **Generar PDF/Excel** + **Reporte IA**
- Criterio de salida: exporta correctamente y el reporte IA es estable/repetible con guardado.

**User stories (Phase 1)**
1. Como técnico, quiero crear una parcela y dibujar su polígono para ubicarla en el mapa.
2. Como manager, quiero registrar un contrato asociado a parcela y cultivo para iniciar campaña.
3. Como técnico, quiero añadir tratamientos/riegos/visitas rápidamente para tener trazabilidad.
4. Como manager, quiero generar un PDF de cuaderno de campo descargable para auditorías.
5. Como usuario, quiero un reporte IA que resuma la campaña y destaque anomalías/costes.

---

### Phase 2 — V1 App Development (MVP sin auth, modular básico)
**Meta:** construir la app funcional end-to-end alrededor del core probado.
- Backend:
  - CRUD de módulos: Fincas, Parcelas (SIGPAC manual), Contratos, Cultivos, Visitas, Tareas, Tratamientos, Irrigaciones, Recetas, Albaranes, Cosechas, Documentos.
  - Relaciones:
    - Contrato → (Parcela, Cultivo)
    - Parcela → Finca; muchos: Visitas/Tareas/Tratamientos/Riegos/Cosechas/Docs
    - Tratamiento ↔ Receta (opcional) y materiales
    - Albarán ligado a entradas/salidas de materiales o cosecha (definición abajo)
  - Costes: mano de obra, maquinaria, insumos, riego; agregación por campaña/parcela/cultivo.
- Frontend:
  - Navegación por módulos + vistas: listado, detalle, crear/editar.
  - Vista Parcela: mapa (Google Maps) + capa polígono + ficha SIGPAC manual.
  - Vista “Campaña” (Contrato): timeline de eventos + costes + acciones export.
- Export:
  - PDF cuaderno por Contrato/Parcela/Cultivo (plantilla V1)
  - Excel: export de tratamientos/riegos/tareas/cosechas/costes.
- Documentos:
  - Subida (PDF/imagen), preview, tags, vínculo a entidad.
- Dashboard V1:
  - KPIs básicos: ha por cultivo, nº tratamientos, consumo agua, kg cosecha, coste/ha, margen estimado.
- Testing: 1 ronda E2E sobre el flujo principal (crear finca→parcela→contrato→eventos→export→dashboard).

**Campos propuestos (V1) para módulos “abiertos”**
- Irrigaciones: fecha, sistema, duración, volumen (m³), fuente, coste, observaciones.
- Recetas: nombre, cultivo objetivo, lista productos (materia activa, dosis, unidad), instrucciones, plazo seguridad, PPE.
- Albaranes: tipo (entrada/salida), fecha, proveedor/cliente, items (producto/lote/cantidad/ud/precio), parcela/contrato (opcional), adjuntos.

**User stories (Phase 2)**
1. Como manager, quiero ver por contrato una línea temporal con todos los eventos para controlar la campaña.
2. Como técnico, quiero registrar un tratamiento con productos/dosis y coste para cumplir normativa.
3. Como técnico, quiero adjuntar fotos/PDFs a la parcela para centralizar evidencias.
4. Como manager, quiero exportar Excel de tratamientos y riegos para análisis externo.
5. Como manager, quiero un dashboard con KPIs por finca/cultivo para decidir prioridades.

---

### Phase 3 — Seguridad, permisos y configuración (Auth + RBAC + campos)
**Meta:** activar autenticación y control fino sin romper el core.
- Auth email/password: registro (solo Admin), login, reset password.
- Roles: Admin/Manager/Technician/Viewer.
- Permisos:
  - por módulo (ver/crear/editar/borrar/exportar)
  - por campo (ocultar/solo lectura) + “secciones” configurables.
- Multi-empresa (si aplica) ligero: separar datos por organización.
- Auditoría: log de cambios en eventos críticos (tratamientos, cosechas, albaranes).
- Testing E2E multi-rol (viewer solo lectura, technician sin borrar, etc.).

**User stories (Phase 3)**
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

**User stories (Phase 4)**
1. Como manager, quiero un informe IA mensual por finca para presentarlo a dirección.
2. Como técnico, quiero que IA me resuma la última visita y pendientes de la parcela.
3. Como manager, quiero detectar costes anómalos por parcela para corregir desviaciones.
4. Como usuario, quiero hacer preguntas en lenguaje natural sobre mi campaña y obtener tablas.
5. Como admin, quiero controlar el acceso a IA por rol y limitar consumo.

---

### Phase 5 — Hardening, rendimiento y calidad de datos
- Validaciones (unidades, rangos, fechas), catálogos (productos, variedades, maquinaria).
- Importación CSV/Excel (parcelas, eventos) + deduplicación.
- Optimización dashboard (agregaciones, índices).
- Regeneración de PDFs versionados y firma/folio (si requerido).
- Suite de tests regresión + checklist de “nada se rompe”.

**User stories (Phase 5)**
1. Como técnico, quiero importar tratamientos desde Excel para ahorrar tiempo.
2. Como manager, quiero que el dashboard cargue rápido aunque tenga muchas parcelas.
3. Como admin, quiero catálogos de productos para evitar errores de escritura.
4. Como manager, quiero PDFs versionados por campaña para mantener histórico.
5. Como usuario, quiero validaciones claras para no registrar datos incorrectos.

## 3) Next Actions
1. Confirmar stack objetivo (p.ej. React/Next + API + DB) y despliegue (1 entorno).
2. Ejecutar Phase 1 POC: IA + PDF/Excel + mapa polígono + agregación mínima.
3. Congelar plantilla V1 del PDF/Excel (estructura mínima) tras validar POC.
4. Construir Phase 2 V1 end-to-end sin auth y pasar testing E2E.
5. Pedir OK para activar Phase 3 (auth/roles) ya con core estable.

## 4) Success Criteria
- Flujo principal completo: **Finca→Parcela (mapa)→Contrato+Cultivo→eventos→costes→PDF/Excel→dashboard**.
- PDF “Cuaderno de Campo” descargable por contrato con datos correctos y consistentes.
- Excel export con tablas utilizables (filtros/columnas estables).
- IA genera reportes **útiles, reproducibles y guardables** a partir de datos reales.
- Roles/permisos funcionan sin filtrar datos ni permitir acciones indebidas.
- Subida/visualización de documentos estable (PDF/imagen) y vinculada a entidades.
