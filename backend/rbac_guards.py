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
