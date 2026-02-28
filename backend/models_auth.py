from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "Admin"
    MANAGER = "Manager"
    TECHNICIAN = "Technician"
    VIEWER = "Viewer"
    EMPLEADO = "Empleado"  # Portal del empleado - acceso limitado

# All available menu items with their paths
ALL_MENU_ITEMS = [
    # General
    {"path": "/dashboard", "label": "Dashboard", "section": "General"},
    {"path": "/asistente-ia", "label": "Asistente IA", "section": "General"},
    # Gestión Principal
    {"path": "/contratos", "label": "Contratos", "section": "Gestión Principal"},
    {"path": "/parcelas", "label": "Parcelas", "section": "Gestión Principal"},
    {"path": "/fincas", "label": "Fincas", "section": "Gestión Principal"},
    # Actividades
    {"path": "/visitas", "label": "Visitas", "section": "Actividades"},
    {"path": "/recomendaciones", "label": "Recomendaciones", "section": "Actividades"},
    {"path": "/alertas-clima", "label": "Alertas Climáticas", "section": "Actividades"},
    {"path": "/tareas", "label": "Tareas", "section": "Actividades"},
    {"path": "/tratamientos", "label": "Tratamientos", "section": "Actividades"},
    {"path": "/irrigaciones", "label": "Irrigaciones", "section": "Actividades"},
    {"path": "/evaluaciones", "label": "Evaluaciones", "section": "Actividades"},
    # Administración
    {"path": "/recetas", "label": "Recetas", "section": "Administración"},
    {"path": "/albaranes", "label": "Albaranes", "section": "Administración"},
    {"path": "/cosechas", "label": "Cosechas", "section": "Administración"},
    {"path": "/documentos", "label": "Documentos", "section": "Administración"},
    {"path": "/rrhh", "label": "Recursos Humanos", "section": "Administración"},
    {"path": "/portal-empleado", "label": "Portal Empleado", "section": "Administración"},
    {"path": "/informes-gastos", "label": "Informes Gastos", "section": "Administración"},
    {"path": "/informes-ingresos", "label": "Informes Ingresos", "section": "Administración"},
    {"path": "/liquidacion-comisiones", "label": "Liquidación Comisiones", "section": "Administración"},
    # Catálogos
    {"path": "/proveedores", "label": "Proveedores", "section": "Catálogos"},
    {"path": "/clientes", "label": "Clientes", "section": "Catálogos"},
    {"path": "/cultivos", "label": "Cultivos", "section": "Catálogos"},
    {"path": "/maquinaria", "label": "Maquinaria", "section": "Catálogos"},
    {"path": "/fitosanitarios", "label": "Fitosanitarios", "section": "Catálogos"},
    {"path": "/tecnicos-aplicadores", "label": "Técnicos Aplicadores", "section": "Catálogos"},
    {"path": "/articulos-explotacion", "label": "Artículos Explotación", "section": "Catálogos"},
    {"path": "/agentes", "label": "Agentes", "section": "Catálogos"},
    # Configuración
    {"path": "/usuarios", "label": "Usuarios", "section": "Configuración"},
    {"path": "/traducciones", "label": "Traducciones", "section": "Configuración"},
    {"path": "/configuracion", "label": "Configuración App", "section": "Configuración"},
]

# Default menu permissions - all enabled
DEFAULT_MENU_PERMISSIONS = {item["path"]: True for item in ALL_MENU_ITEMS}

# Predefined permission profiles
PERMISSION_PROFILES = {
    "tecnico_campo": {
        "name": "Técnico de Campo",
        "description": "Acceso a parcelas, visitas, tratamientos y evaluaciones. Ideal para técnicos agrícolas.",
        "icon": "Leaf",
        "permissions": {
            "/dashboard": True,
            "/asistente-ia": True,
            "/contratos": False,
            "/parcelas": True,
            "/fincas": True,
            "/visitas": True,
            "/recomendaciones": True,
            "/alertas-clima": True,
            "/tareas": True,
            "/tratamientos": True,
            "/irrigaciones": True,
            "/evaluaciones": True,
            "/recetas": True,
            "/albaranes": False,
            "/cosechas": True,
            "/documentos": False,
            "/rrhh": False,
            "/portal-empleado": False,
            "/informes-gastos": False,
            "/informes-ingresos": False,
            "/liquidacion-comisiones": False,
            "/proveedores": True,
            "/clientes": False,
            "/cultivos": True,
            "/maquinaria": True,
            "/fitosanitarios": True,
            "/tecnicos-aplicadores": True,
            "/articulos-explotacion": True,
            "/agentes": False,
            "/usuarios": False,
            "/traducciones": False,
            "/configuracion": False,
        }
    },
    "gestor_administrativo": {
        "name": "Gestor Administrativo",
        "description": "Acceso completo a contratos, albaranes, informes y gestión documental.",
        "icon": "FileText",
        "permissions": {
            "/dashboard": True,
            "/asistente-ia": True,
            "/contratos": True,
            "/parcelas": True,
            "/fincas": True,
            "/visitas": False,
            "/recomendaciones": False,
            "/alertas-clima": False,
            "/tareas": False,
            "/tratamientos": False,
            "/irrigaciones": False,
            "/evaluaciones": False,
            "/recetas": False,
            "/albaranes": True,
            "/cosechas": True,
            "/documentos": True,
            "/rrhh": False,
            "/portal-empleado": False,
            "/informes-gastos": True,
            "/informes-ingresos": True,
            "/liquidacion-comisiones": True,
            "/proveedores": True,
            "/clientes": True,
            "/cultivos": True,
            "/maquinaria": False,
            "/fitosanitarios": False,
            "/tecnicos-aplicadores": False,
            "/articulos-explotacion": True,
            "/agentes": True,
            "/usuarios": False,
            "/traducciones": False,
            "/configuracion": False,
        }
    },
    "responsable_rrhh": {
        "name": "Responsable RRHH",
        "description": "Gestión de recursos humanos, fichajes, productividad y prenóminas.",
        "icon": "Users",
        "permissions": {
            "/dashboard": True,
            "/asistente-ia": False,
            "/contratos": False,
            "/parcelas": False,
            "/fincas": False,
            "/visitas": False,
            "/recomendaciones": False,
            "/alertas-clima": False,
            "/tareas": False,
            "/tratamientos": False,
            "/irrigaciones": False,
            "/evaluaciones": False,
            "/recetas": False,
            "/albaranes": False,
            "/cosechas": False,
            "/documentos": True,
            "/rrhh": True,
            "/portal-empleado": False,
            "/informes-gastos": False,
            "/informes-ingresos": False,
            "/liquidacion-comisiones": False,
            "/proveedores": False,
            "/clientes": False,
            "/cultivos": False,
            "/maquinaria": False,
            "/fitosanitarios": False,
            "/tecnicos-aplicadores": False,
            "/articulos-explotacion": False,
            "/agentes": False,
            "/usuarios": False,
            "/traducciones": False,
            "/configuracion": False,
        }
    },
    "supervisor_completo": {
        "name": "Supervisor Completo",
        "description": "Acceso a todas las áreas operativas sin permisos de configuración.",
        "icon": "Shield",
        "permissions": {
            "/dashboard": True,
            "/asistente-ia": True,
            "/contratos": True,
            "/parcelas": True,
            "/fincas": True,
            "/visitas": True,
            "/recomendaciones": True,
            "/alertas-clima": True,
            "/tareas": True,
            "/tratamientos": True,
            "/irrigaciones": True,
            "/evaluaciones": True,
            "/recetas": True,
            "/albaranes": True,
            "/cosechas": True,
            "/documentos": True,
            "/rrhh": True,
            "/portal-empleado": False,
            "/informes-gastos": True,
            "/informes-ingresos": True,
            "/liquidacion-comisiones": True,
            "/proveedores": True,
            "/clientes": True,
            "/cultivos": True,
            "/maquinaria": True,
            "/fitosanitarios": True,
            "/tecnicos-aplicadores": True,
            "/articulos-explotacion": True,
            "/agentes": True,
            "/usuarios": False,
            "/traducciones": False,
            "/configuracion": False,
        }
    },
    "solo_consulta": {
        "name": "Solo Consulta",
        "description": "Acceso de solo lectura al dashboard e informes básicos.",
        "icon": "Eye",
        "permissions": {
            "/dashboard": True,
            "/asistente-ia": False,
            "/contratos": True,
            "/parcelas": True,
            "/fincas": True,
            "/visitas": False,
            "/recomendaciones": False,
            "/alertas-clima": True,
            "/tareas": False,
            "/tratamientos": False,
            "/irrigaciones": False,
            "/evaluaciones": False,
            "/recetas": False,
            "/albaranes": False,
            "/cosechas": True,
            "/documentos": False,
            "/rrhh": False,
            "/portal-empleado": False,
            "/informes-gastos": False,
            "/informes-ingresos": False,
            "/liquidacion-comisiones": False,
            "/proveedores": False,
            "/clientes": False,
            "/cultivos": True,
            "/maquinaria": False,
            "/fitosanitarios": False,
            "/tecnicos-aplicadores": False,
            "/articulos-explotacion": False,
            "/agentes": False,
            "/usuarios": False,
            "/traducciones": False,
            "/configuracion": False,
        }
    }
}

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.VIEWER
    is_active: bool = True
    
    # Permissions
    can_create: bool = True
    can_edit: bool = True
    can_delete: bool = False
    can_export: bool = True
    
    # Module access (legacy)
    modules_access: List[str] = [
        "dashboard", "contratos", "parcelas", "fincas",
        "visitas", "tareas", "tratamientos", "irrigaciones",
        "recetas", "albaranes", "cosechas", "documentos"
    ]
    
    # Menu permissions - dict with path as key and boolean as value
    menu_permissions: Dict[str, bool] = Field(default_factory=lambda: DEFAULT_MENU_PERMISSIONS.copy())
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.VIEWER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    
    class Config:
        populate_by_name = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class TokenData(BaseModel):
    email: Optional[str] = None