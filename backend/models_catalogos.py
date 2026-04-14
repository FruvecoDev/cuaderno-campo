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

class DatosGestion(BaseModel):
    forma_pago: Optional[str] = None
    dias_pago: Optional[str] = None
    moneda: Optional[str] = 'EUR'
    iva: Optional[str] = None
    irpf: Optional[str] = None
    subcuenta: Optional[str] = None
    subcuenta_gastos: Optional[str] = None
    tipo_operacion: Optional[str] = None

class DatosBancarios(BaseModel):
    banco: Optional[str] = None
    sucursal: Optional[str] = None
    iban: Optional[str] = None
    entidad: Optional[str] = None
    sucursal_num: Optional[str] = None
    dc: Optional[str] = None
    cuenta: Optional[str] = None
    swift_bic: Optional[str] = None

class CertificacionItem(BaseModel):
    nombre: str = ''
    fecha_emision: Optional[str] = None
    fecha_validez: Optional[str] = None
    observaciones: Optional[str] = None

class CentroDescargaItem(BaseModel):
    nombre: str = ''
    direccion: Optional[str] = None
    poblacion: Optional[str] = None
    provincia: Optional[str] = None
    codigo_postal: Optional[str] = None
    contacto: Optional[str] = None
    telefono: Optional[str] = None

class ProveedorBase(BaseModel):
    nombre: str
    codigo_proveedor: Optional[str] = None
    tipo_proveedor: Optional[str] = 'Agricultor'
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
    datos_gestion: Optional[DatosGestion] = None
    datos_bancarios: Optional[DatosBancarios] = None
    certificaciones: Optional[List[CertificacionItem]] = []
    centros_descarga: Optional[List[CentroDescargaItem]] = []
    observaciones: Optional[str] = None
    avisos: Optional[str] = None
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
