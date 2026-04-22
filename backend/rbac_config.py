"""
Role-Based Access Control (RBAC) Configuration
Defines permissions matrix for different user roles
"""

from models_auth import UserRole

# Permission matrix by role
PERMISSIONS_MATRIX = {
    UserRole.ADMIN: {
        "can_create": True,
        "can_edit": True,
        "can_delete": True,
        "can_export": True,
        "can_bulk_delete": True,
        "can_manage_users": True,
        "can_view_costs": True,
        "modules_access": [
            "dashboard", "contratos", "parcelas", "fincas",
            "visitas", "tareas", "tratamientos", "irrigaciones",
            "recetas", "albaranes", "cosechas", "documentos"
        ]
    },
    UserRole.MANAGER: {
        "can_create": True,
        "can_edit": True,
        "can_delete": False,
        "can_export": True,
        "can_bulk_delete": False,
        "can_manage_users": False,
        "can_view_costs": True,
        "modules_access": [
            "dashboard", "contratos", "parcelas", "fincas",
            "visitas", "tareas", "tratamientos", "irrigaciones",
            "recetas", "albaranes", "cosechas", "documentos"
        ]
    },
    UserRole.TECHNICIAN: {
        "can_create": True,
        "can_edit": True,
        "can_delete": False,
        "can_export": False,
        "can_bulk_delete": False,
        "can_manage_users": False,
        "can_view_costs": False,
        "modules_access": [
            "dashboard", "parcelas",
            "visitas", "tareas", "tratamientos", "irrigaciones",
            "cosechas", "documentos"
        ]
    },
    UserRole.VIEWER: {
        "can_create": False,
        "can_edit": False,
        "can_delete": False,
        "can_export": True,
        "can_bulk_delete": False,
        "can_manage_users": False,
        "can_view_costs": False,
        "modules_access": [
            "dashboard", "contratos", "parcelas", "fincas",
            "visitas", "tareas", "tratamientos", "irrigaciones",
            "recetas", "albaranes", "cosechas", "documentos"
        ]
    }
}

def get_role_permissions(role: str) -> dict:
    """Get permissions for a specific role"""
    return PERMISSIONS_MATRIX.get(role, PERMISSIONS_MATRIX[UserRole.VIEWER])

def check_permission(user: dict, permission: str) -> bool:
    """Check if user has a specific permission"""
    return user.get(permission, False)

def check_module_access(user: dict, module: str) -> bool:
    """Check if user has access to a specific module"""
    modules = user.get("modules_access", [])
    return module in modules
