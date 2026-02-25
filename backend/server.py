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
from routes_config import router as config_router

app = FastAPI(title="FRUVECO - Agricultural Management System V1")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.include_router(config_router)

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
