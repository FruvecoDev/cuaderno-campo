"""
Modelos para Proveedores y Cultivos
Módulos maestros para gestionar catálogos
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ============================================================================
# PROVEEDORES
# ============================================================================

class TelefonoItem(BaseModel):
    valor: str = ''
    etiqueta: str = ''

class EmailItem(BaseModel):
    valor: str = ''
    etiqueta: str = ''

class ContactoItem(BaseModel):
    nombre: str = ''
    cargo: str = ''
    telefono: str = ''
    email: str = ''

class ProveedorBase(BaseModel):
    nombre: str
    codigo_proveedor: Optional[str] = None
    cif_nif: Optional[str] = None
    direccion: Optional[str] = None
    poblacion: Optional[str] = None
    provincia: Optional[str] = None
    pais: Optional[str] = 'España'
    codigo_postal: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    persona_contacto: Optional[str] = None
    telefonos: Optional[List[TelefonoItem]] = []
    emails: Optional[List[EmailItem]] = []
    contactos: Optional[List[ContactoItem]] = []
    observaciones: Optional[str] = None
    activo: bool = True

class ProveedorCreate(ProveedorBase):
    pass

class ProveedorInDB(ProveedorBase):
    id: str = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


# ============================================================================
# CULTIVOS
# ============================================================================

class CultivoBase(BaseModel):
    nombre: str  # Ej: Tomate, Pimiento, Melón
    variedad: Optional[str] = None  # Ej: RAF, Piquillo, Galia
    tipo: Optional[str] = None  # Ej: Hortícola, Frutal, Cereal
    unidad_medida: str = "kg"  # kg, toneladas, unidades
    ciclo_cultivo: Optional[str] = None  # Corto, Medio, Largo
    observaciones: Optional[str] = None
    activo: bool = True

class CultivoCreate(CultivoBase):
    pass

class CultivoInDB(CultivoBase):
    id: str = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
