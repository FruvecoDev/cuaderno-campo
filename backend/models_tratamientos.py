from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

# ============================================================================
# TRATAMIENTOS
# ============================================================================

class TratamientoAplicador(BaseModel):
    nombre: str
    apellidos: str
    dni: str
    num_carnet: str
    fecha_validacion: str
    fecha_fin: str  # 10 años después
    documento_id: Optional[str] = None

class TratamientoMaquinaria(BaseModel):
    fabricante: str
    placa_ce: bool
    tipo: str
    modelo: str
    serial_num: str
    approval_num: Optional[str] = None
    mma: Optional[str] = None
    documento_id: Optional[str] = None

class TratamientoProducto(BaseModel):
    nombre_comercial: str
    composicion: str
    num_registro: str
    dosis_superficie: float
    unidad_medida: str
    concentracion: Optional[float] = None
    dosis_cuba: Optional[float] = None
    justificacion: str
    coste: float
    plazo_seguridad: int  # días
    aplicaciones_max: Optional[int] = None
    codigo_inventario: Optional[str] = None
    almacen: Optional[str] = None
    num_albaran: Optional[str] = None
    num_lote: Optional[str] = None

class TratamientoCuestionario(BaseModel):
    fecha_inicio: str
    fecha_fin: str
    tecnico: str
    # Plagas y enfermedades
    trips: Optional[str] = None
    mosca_blanca: Optional[str] = None
    minador: Optional[str] = None
    arana_roja: Optional[str] = None
    oruga: Optional[str] = None
    pulgon: Optional[str] = None
    botrytis: Optional[str] = None
    mildiu: Optional[str] = None
    oidio: Optional[str] = None
    ascochyta: Optional[str] = None
    phytophthora: Optional[str] = None

class TratamientoCondicionesAmbientales(BaseModel):
    temperatura: Optional[float] = None
    estado_cielo: Optional[str] = None
    viento: Optional[str] = None

class TratamientoBase(BaseModel):
    # Tipo
    tipo_tratamiento: str  # FITOSANITARIOS, NUTRICIÓN, etc.
    subtipo: Optional[str] = None  # Insecticida, Fungicida, etc.
    
    # Vínculos obligatorios al contexto agronómico
    contrato_id: Optional[str] = None  # ObjectId ref a contratos (recomendado)
    parcela_id: Optional[str] = None  # Se puede derivar de parcelas_ids, pero mejor explícito
    cultivo_id: Optional[str] = None  # ObjectId ref a cultivos (OBLIGATORIO si no hay parcela_id clara)
    campana: Optional[str] = None  # OBLIGATORIO - campaña asociada
    
    # Info general
    aplicacion_numero: int
    realizado: bool = False
    planificado: bool = False
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    tecnico: Optional[str] = None
    metodo_aplicacion: str
    
    # Costes
    coste_superficie: float = 0.0
    coste_total: float = 0.0
    
    # Aplicador y maquinaria (versión simplificada)
    aplicador_nombre: Optional[str] = None  # Texto libre con nombre del aplicador
    maquina_id: Optional[str] = None  # ObjectId ref a maquinaria
    maquina_nombre: Optional[str] = None  # Nombre de la máquina (denormalizado para display)
    
    # Aplicador y maquinaria (versión completa - legacy)
    aplicador: Optional[TratamientoAplicador] = None
    maquinaria: Optional[TratamientoMaquinaria] = None
    
    # Parcelas asociadas (lista para tratamientos multi-parcela)
    parcelas_ids: List[str] = []
    
    # Cuestionarios
    cuestionarios: List[TratamientoCuestionario] = []
    
    # Productos
    superficie_aplicacion: float
    caldo_superficie: float  # L
    caldo_total: float  # L
    volumen_cuba: float  # L
    velocidad: Optional[str] = None
    presion: Optional[str] = None
    productos: List[TratamientoProducto] = []
    
    # Condiciones ambientales
    condiciones: Optional[TratamientoCondicionesAmbientales] = None
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class TratamientoCreate(BaseModel):
    tipo_tratamiento: str
    subtipo: Optional[str] = None
    aplicacion_numero: int
    metodo_aplicacion: str
    superficie_aplicacion: float
    caldo_superficie: float
    
    # MODELO SIMPLIFICADO: solo parcelas_ids obligatorio
    # El resto (cultivo_id, campana, contrato_id) se hereda desde la primera parcela
    parcelas_ids: List[str]  # OBLIGATORIO
    
    # Nuevos campos para Aplicador y Máquina
    aplicador_nombre: Optional[str] = None  # Nombre del aplicador (texto libre)
    maquina_id: Optional[str] = None  # ObjectId ref a maquinaria

class TratamientoInDB(TratamientoBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ============================================================================
# MAQUINARIA (Catálogo de Maquinaria Agrícola)
# ============================================================================

class MaquinariaBase(BaseModel):
    nombre: str  # Nombre identificativo de la máquina
    tipo: str  # Tractor, Pulverizador, Cosechadora, etc.
    modelo: Optional[str] = None
    marca: Optional[str] = None
    matricula: Optional[str] = None
    num_serie: Optional[str] = None
    año_fabricacion: Optional[int] = None
    capacidad: Optional[str] = None  # Ej: "1000L", "150CV"
    estado: str = "Operativo"  # Operativo, En mantenimiento, Averiado
    observaciones: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class MaquinariaCreate(BaseModel):
    nombre: str
    tipo: str
    modelo: Optional[str] = None
    marca: Optional[str] = None
    matricula: Optional[str] = None
    num_serie: Optional[str] = None
    año_fabricacion: Optional[int] = None
    capacidad: Optional[str] = None
    estado: str = "Operativo"
    observaciones: Optional[str] = None

class MaquinariaInDB(MaquinariaBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ============================================================================
# IRRIGACIONES
# ============================================================================

class IrrigacionBase(BaseModel):
    fecha: str
    sistema: str  # Goteo, Aspersión, etc.
    duracion: float  # horas
    volumen: float  # m³
    fuente: Optional[str] = None
    coste: float
    observaciones: Optional[str] = None
    
    # Parcelas - optional for flexibility
    parcela_id: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class IrrigacionCreate(BaseModel):
    fecha: str
    sistema: str
    duracion: float
    volumen: float
    coste: float
    parcela_id: Optional[str] = ""  # Optional - frontend can send empty string

class IrrigacionInDB(IrrigacionBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ============================================================================
# RECETAS
# ============================================================================

class RecetaProducto(BaseModel):
    materia_activa: str
    dosis: float
    unidad: str

class RecetaBase(BaseModel):
    nombre: str
    cultivo_objetivo: str
    productos: List[RecetaProducto] = []
    instrucciones: Optional[str] = None
    plazo_seguridad: int  # días
    ppe_requerido: Optional[str] = None  # Equipo de protección personal
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class RecetaCreate(BaseModel):
    nombre: str
    cultivo_objetivo: str
    plazo_seguridad: int
    instrucciones: Optional[str] = None

class RecetaInDB(RecetaBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ============================================================================
# ALBARANES
# ============================================================================

class AlbaranItem(BaseModel):
    # Simplified model for frontend - descripcion maps to producto
    descripcion: Optional[str] = None  # Frontend uses descripcion 
    producto: Optional[str] = None  # Backend can use producto
    lote: Optional[str] = None
    cantidad: float
    unidad: Optional[str] = None  # Made optional for frontend compatibility
    precio_unitario: float
    total: float

class AlbaranBase(BaseModel):
    tipo: str  # Entrada / Salida
    fecha: str
    proveedor_cliente: str
    items: List[AlbaranItem] = []
    parcela_id: Optional[str] = None
    contrato_id: Optional[str] = None
    adjuntos: List[str] = []  # IDs de documentos
    observaciones: Optional[str] = None
    
    total_general: float = 0.0
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class AlbaranCreate(BaseModel):
    tipo: str
    fecha: str
    proveedor_cliente: str
    items: List[AlbaranItem]

class AlbaranInDB(AlbaranBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ============================================================================
# DOCUMENTOS
# ============================================================================

class DocumentoBase(BaseModel):
    nombre: str
    tipo: str  # PDF, imagen, etc.
    size: int  # bytes
    url: str  # GridFS file_id o path
    tags: List[str] = []
    
    # Vinculación
    entidad_tipo: str  # parcela, finca, contrato, etc.
    entidad_id: str
    
    created_at: datetime = Field(default_factory=datetime.now)

class DocumentoInDB(DocumentoBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}