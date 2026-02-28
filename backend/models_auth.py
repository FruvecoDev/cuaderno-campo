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