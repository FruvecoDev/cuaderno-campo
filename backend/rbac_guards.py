"""
RBAC Permission Guards for FastAPI
Dependencies to check user permissions on endpoints
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Callable
from routes_auth import get_current_user
from rbac_config import check_permission, check_module_access

security = HTTPBearer()

# Permission checkers
def require_permission(permission: str) -> Callable:
    """Decorator factory to require a specific permission"""
    async def permission_checker(current_user: dict = Depends(get_current_user)):
        if not check_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission} required"
            )
        return current_user
    return permission_checker

def require_module_access(module: str) -> Callable:
    """Decorator factory to require access to a specific module"""
    async def module_checker(current_user: dict = Depends(get_current_user)):
        if not check_module_access(current_user, module):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied to module: {module}"
            )
        return current_user
    return module_checker

# Common permission dependencies (shortcuts)
RequireCreate = require_permission("can_create")
RequireEdit = require_permission("can_edit")
RequireDelete = require_permission("can_delete")
RequireExport = require_permission("can_export")
RequireUserManagement = require_permission("can_manage_users")

# Module access dependencies
RequireContratosAccess = require_module_access("contratos")
RequireParcelasAccess = require_module_access("parcelas")
RequireFincasAccess = require_module_access("fincas")
RequireVisitasAccess = require_module_access("visitas")
RequireTareasAccess = require_module_access("tareas")
RequireTratamientosAccess = require_module_access("tratamientos")
RequireIrrigacionesAccess = require_module_access("irrigaciones")
RequireRecetasAccess = require_module_access("recetas")
RequireAlbaranesAccess = require_module_access("albaranes")
RequireCosechasAccess = require_module_access("cosechas")
RequireAIAccess = require_permission("can_create")  # AI reports require create permission


def check_tipo_operacion(current_user: dict, tipo: str) -> bool:
    """Devuelve True si el usuario puede realizar operaciones del `tipo` dado.

    `tipo` es el tipo del documento (Contrato/Albaran): "Compra" o "Venta".
    `current_user["tipo_operacion"]` puede ser "compra", "venta" o "ambos".
    Si el usuario no tiene `tipo_operacion`, por defecto se permite ("ambos").
    """
    user_tipo = (current_user or {}).get("tipo_operacion") or "ambos"
    user_tipo = str(user_tipo).strip().lower()
    if user_tipo == "ambos":
        return True
    if not tipo:
        # Si el documento no especifica tipo, se considera Compra por defecto
        return user_tipo == "compra"
    return user_tipo == str(tipo).strip().lower()


def ensure_tipo_operacion(current_user: dict, tipo: str):
    """Lanza 403 si el usuario no puede realizar operaciones de ese tipo."""
    if not check_tipo_operacion(current_user, tipo):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permiso denegado: el usuario solo puede operar con tipo '{(current_user or {}).get('tipo_operacion','ambos')}'",
        )
