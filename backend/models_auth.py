from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "Admin"
    MANAGER = "Manager"
    TECHNICIAN = "Technician"
    VIEWER = "Viewer"

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
    
    # Module access
    modules_access: List[str] = [
        "dashboard", "contratos", "parcelas", "fincas",
        "visitas", "tareas", "tratamientos", "irrigaciones",
        "recetas", "albaranes", "cosechas", "documentos"
    ]
    
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