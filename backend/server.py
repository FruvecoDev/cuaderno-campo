"""
FRUVECO - Agricultural Management System V1
Main server file with modular routers architecture.
Refactored: All modules split into individual router files for maintainability.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

# Load environment
load_dotenv()

# Import routes - Core modules (refactored)
from routes_contratos import router as contratos_router
from routes_parcelas import router as parcelas_router
from routes_visitas import router as visitas_router
from routes_fincas import router as fincas_router
from routes_tratamientos import router as tratamientos_router
from routes_cosechas import router as cosechas_router

# Import routes - Extended modules (smaller, kept together)
from routes_extended import router as extended_router

# Import routes - Supporting modules
from routes_auth import router as auth_router
from routes_catalogos import router as catalogos_router
from routes_ai import router as ai_router
from routes_ai_suggestions import router as ai_suggestions_router
from routes_ai_chat import router as ai_chat_router
from routes_maquinaria import router as maquinaria_router
from routes_evaluaciones import router as evaluaciones_router
from routes_notifications import router as notifications_router
from routes_dashboard import router as dashboard_router
from routes_reports import router as reports_router
from routes_fitosanitarios import router as fitosanitarios_router
from routes_gastos import router as gastos_router
from routes_ingresos import router as ingresos_router
from routes_translations import router as translations_router
from routes_cuaderno import router as cuaderno_router
from routes_tecnicos_aplicadores import router as tecnicos_aplicadores_router
from routes_articulos import router as articulos_router
from routes_agentes import router as agentes_router
from routes_clientes import router as clientes_router
from routes_comisiones import router as comisiones_router
from routes_albaranes_comision import router as albaranes_comision_router
from routes_config import router as config_router
from routes_recomendaciones import router as recomendaciones_router
from routes_plantillas_recomendaciones import router as plantillas_recomendaciones_router
from routes_bulk import router as bulk_router
from routes_alertas_clima import router as alertas_clima_router
from routes_notificaciones import router as notificaciones_router
from routes_resumen_diario import router as resumen_diario_router
from routes_tareas import router as tareas_router
from routes_irrigaciones import router as irrigaciones_router
from routes_uploads import router as uploads_router
from routes_cuaderno_campo import router as cuaderno_campo_router
from routes_geo_import import router as geo_import_router
from routes_audit import router as audit_router
from routes.routes_rrhh import router as rrhh_router, set_database as set_rrhh_db
from routes.routes_portal_empleado import router as portal_empleado_router
from routes.rrhh_ausencias import router as ausencias_router
from routes.rrhh_prenominas import router as prenominas_router
from routes.rrhh_fichajes import router as fichajes_router
from routes.rrhh_productividad import router as productividad_router
from routes.rrhh_documentos import router as documentos_router
from routes_erp_integration import router as erp_router
from routes_erp_sync import router as erp_sync_router
from routes_sigpac import router as sigpac_router
from routes_exports import router as exports_router
from routes_alertas import router as alertas_router
from routes_user_config import router as user_config_router
from scheduler_service import init_scheduler, shutdown_scheduler
from database import db

app = FastAPI(title="FRUVECO - Agricultural Management System V1")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup/Shutdown events
@app.on_event("startup")
async def startup_event():
    init_scheduler()
    # Initialize RRHH routes with database
    set_rrhh_db(db)
    # Seed tipos_cultivo if empty
    if await db['tipos_cultivo'].count_documents({}) == 0:
        from datetime import datetime as dt
        defaults = ["Horticola", "Frutal", "Cereal", "Leguminosa", "Industrial", "Viticola", "Olivar", "Citrico", "Otro"]
        await db['tipos_cultivo'].insert_many([{"nombre": n, "created_at": dt.now()} for n in defaults])
    # Seed categorias_articulo if empty
    if await db['categorias_articulo'].count_documents({}) == 0:
        from datetime import datetime as dt
        cats = ["Fertilizantes", "Fitosanitarios", "Semillas", "Materiales", "Maquinaria", "Servicios", "Combustibles", "Envases", "Otros"]
        await db['categorias_articulo'].insert_many([{"nombre": n, "created_at": dt.now()} for n in cats])

@app.on_event("shutdown")
async def shutdown_event():
    shutdown_scheduler()

# Include routers - Core modules
app.include_router(auth_router)
app.include_router(contratos_router)
app.include_router(parcelas_router)
app.include_router(visitas_router)
app.include_router(fincas_router)
app.include_router(tratamientos_router)
app.include_router(cosechas_router)

# Include routers - Extended modules
app.include_router(extended_router)

# Include routers - Supporting modules
app.include_router(catalogos_router)
app.include_router(ai_router)
app.include_router(ai_suggestions_router)
app.include_router(ai_chat_router)
app.include_router(maquinaria_router)
app.include_router(evaluaciones_router)
app.include_router(notifications_router)
app.include_router(dashboard_router)
app.include_router(reports_router)
app.include_router(fitosanitarios_router)
app.include_router(gastos_router)
app.include_router(ingresos_router)
app.include_router(translations_router)
app.include_router(cuaderno_router)
app.include_router(tecnicos_aplicadores_router)
app.include_router(articulos_router)
app.include_router(agentes_router)
app.include_router(clientes_router)
app.include_router(comisiones_router)
app.include_router(albaranes_comision_router)
app.include_router(config_router)
app.include_router(recomendaciones_router)
app.include_router(plantillas_recomendaciones_router)
app.include_router(alertas_clima_router)
app.include_router(notificaciones_router)
app.include_router(resumen_diario_router)
app.include_router(tareas_router)
app.include_router(irrigaciones_router)
app.include_router(uploads_router)
app.include_router(cuaderno_campo_router)
app.include_router(geo_import_router)
app.include_router(rrhh_router)
app.include_router(ausencias_router)
app.include_router(prenominas_router)
app.include_router(fichajes_router)
app.include_router(productividad_router)
app.include_router(documentos_router)
app.include_router(portal_empleado_router)
app.include_router(audit_router)

# ERP Integration API
app.include_router(erp_router)
app.include_router(erp_sync_router)
app.include_router(sigpac_router)
app.include_router(exports_router)
app.include_router(alertas_router)
app.include_router(user_config_router)
app.include_router(bulk_router)

# Mount static files for uploaded images
uploads_dir = "/app/uploads"
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/")
async def root():
    return {
        "message": "FRUVECO - Agricultural Management System V1 API",
        "version": "1.0.0",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
