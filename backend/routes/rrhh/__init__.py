"""
RRHH Routes - Archivo Principal
Importa todos los sub-routers del módulo de Recursos Humanos
"""
from fastapi import APIRouter
from .rrhh_empleados import router as empleados_router
from .rrhh_fichajes import router as fichajes_router
from .rrhh_productividad import router as productividad_router
from .rrhh_documentos import router as documentos_router
from .rrhh_prenominas import router as prenominas_router
from .rrhh_ausencias import router as ausencias_router

# Router principal de RRHH
router = APIRouter(prefix="/api/rrhh", tags=["RRHH"])

# Incluir todos los sub-routers
router.include_router(empleados_router)
router.include_router(fichajes_router)
router.include_router(productividad_router)
router.include_router(documentos_router)
router.include_router(prenominas_router)
router.include_router(ausencias_router)

# Database injection
db = None

def set_database(database):
    """Inyecta la base de datos en todos los sub-routers"""
    global db
    db = database
    
    # Importar y configurar cada módulo
    from . import rrhh_empleados, rrhh_fichajes, rrhh_productividad
    from . import rrhh_documentos, rrhh_prenominas, rrhh_ausencias
    
    rrhh_empleados.set_database(database)
    rrhh_fichajes.set_database(database)
    rrhh_productividad.set_database(database)
    rrhh_documentos.set_database(database)
    rrhh_prenominas.set_database(database)
    rrhh_ausencias.set_database(database)
