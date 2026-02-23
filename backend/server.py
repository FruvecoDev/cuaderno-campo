"""
FRUVECO - Agricultural Management System V1
Main server file with all routers included.
Refactored: Dashboard and Reports moved to separate modules.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Import routes
from routes_main import router as main_router
from routes_extended import router as extended_router
from routes_auth import router as auth_router
from routes_catalogos import router as catalogos_router
from routes_ai import router as ai_router
from routes_maquinaria import router as maquinaria_router
from routes_evaluaciones import router as evaluaciones_router
from routes_notifications import router as notifications_router
from routes_dashboard import router as dashboard_router
from routes_reports import router as reports_router

app = FastAPI(title="FRUVECO - Agricultural Management System V1")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routers
app.include_router(auth_router)
app.include_router(main_router)
app.include_router(extended_router)
app.include_router(catalogos_router)
app.include_router(ai_router)
app.include_router(maquinaria_router)
app.include_router(evaluaciones_router)
app.include_router(notifications_router)
app.include_router(dashboard_router)
app.include_router(reports_router)


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
