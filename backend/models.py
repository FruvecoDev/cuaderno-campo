from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

# Helper for MongoDB ObjectId
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, _schema_generator):
        return {"type": "string"}

# ============================================================================
# CONTRATOS
# ============================================================================

class ContratoPrecios(BaseModel):
    calidad: str
    min_tenderometria: Optional[float] = None
    max_tenderometria: Optional[float] = None
    precio: float

class ContratoBase(BaseModel):
    # Serie automática: MP-{año}-{número}
    serie: str = "MP"
    año: int = Field(default_factory=lambda: datetime.now().year)
    numero: int
    
    # Campos principales
    tipo_contrato: str = "Por Kilos"
    campana: str
    procedencia: str  # Campo / Almacén con tratamiento / Almacén sin tratamiento
    fecha_contrato: str
    fecha_baja: Optional[str] = None
    
    # Proveedor y cultivo (referencias a catálogos)
    proveedor_id: str  # ObjectId ref a proveedores collection
    cultivo_id: str    # ObjectId ref a cultivos collection
    
    # Campos legacy (mantener por compatibilidad temporal)
    proveedor: Optional[str] = None  # Deprecated
    cultivo: Optional[str] = None    # Deprecated
    articulo_mp: Optional[str] = None  # Deprecated - usar cultivo_id
    cantidad: float
    precio: float
    moneda: str = "EUR"
    cambio: float = 1.0
    
    # Periodo entrega
    periodo_desde: str
    periodo_hasta: str
    
    # Agente
    agente_compra: Optional[str] = None
    comision_agente: Optional[float] = None
    tipo_comision: Optional[str] = None  # Porcentaje / por Kilos
    
    # Condiciones
    forma_pago: Optional[str] = None
    cond_entrega: Optional[str] = None
    su_referencia: Optional[str] = None
    planta_produccion: Optional[str] = None
    
    # Logística
    descuento_destare: Optional[float] = None
    transporte_granel: bool = False
    transporte_cuenta: Optional[str] = None  # Empresa / Proveedor
    envases_cuenta: Optional[str] = None  # Empresa / Proveedor
    precio_transporte_kg: Optional[float] = None
    
    # Precios por calidad
    precios_calidad: List[ContratoPrecios] = []
    parametro_calidad: Optional[str] = None  # ej: Tenderometria
    
    # Observaciones
    observaciones: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class ContratoCreate(BaseModel):
    campana: str
    procedencia: str
    fecha_contrato: str
    
    # Nuevos campos (catálogos)
    proveedor_id: Optional[str] = None  # ObjectId ref a proveedores
    cultivo_id: Optional[str] = None    # ObjectId ref a cultivos
    
    # Campos legacy (mantener compatibilidad temporal)
    proveedor: Optional[str] = None
    cultivo: Optional[str] = None
    articulo_mp: Optional[str] = None
    
    cantidad: float
    precio: float
    periodo_desde: str
    periodo_hasta: str
    moneda: str = "EUR"
    observaciones: Optional[str] = None

class ContratoInDB(ContratoBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ============================================================================
# PARCELAS
# ============================================================================

class ParcelaRecinto(BaseModel):
    geometria: List[Dict[str, float]]  # [{lat, lng}]
    sigpac: Optional[str] = None
    superficie_recinto: Optional[float] = None
    num_plantas_recinto: Optional[int] = None
    superficie_sigpac: Optional[float] = None
    provincia_sigpac: Optional[str] = None
    municipio_sigpac: Optional[str] = None
    agregado_sigpac: Optional[str] = None
    zona_sigpac: Optional[str] = None
    poligono_sigpac: Optional[str] = None
    parcela_sigpac: Optional[str] = None
    recinto_sigpac: Optional[str] = None
    pendiente_sigpac: Optional[str] = None
    uso_sigpac: Optional[str] = None
    red_natura: Optional[bool] = None

class ParcelaBase(BaseModel):
    # Información principal
    proveedor: str
    proveedor_id: Optional[str] = None
    cultivo: str
    campana: str
    activo: bool = True
    numero_contrato: Optional[str] = None
    productor: Optional[str] = None
    variedad: str
    superficie_total: float  # ha o m2
    unidad_medida: str = "ha"
    codigo_plantacion: str
    num_plantas: int
    finca: str
    finca_id: Optional[str] = None
    
    # Información SIEX
    cultivo_siex: Optional[str] = None
    variedad_siex: Optional[str] = None
    
    # Información para cálculos
    num_goteros_planta: Optional[int] = None
    caudal_gotero: Optional[float] = None  # l/h
    
    # Fechas
    fecha_plantacion: Optional[str] = None
    fecha_primer_riego: Optional[str] = None
    fecha_primer_riego_real: Optional[str] = None
    fecha_inicio_recoleccion: Optional[str] = None
    fecha_fin_recoleccion: Optional[str] = None
    fecha_prevista_siega: Optional[str] = None
    
    # Recintos (múltiples polígonos)
    recintos: List[ParcelaRecinto] = []
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class ParcelaCreate(BaseModel):
    proveedor: str
    cultivo: str
    campana: str
    variedad: str
    superficie_total: float
    codigo_plantacion: str
    num_plantas: int
    finca: str
    recintos: List[ParcelaRecinto]
    contrato_id: Optional[str] = None  # Referencia al contrato asociado

class ParcelaInDB(ParcelaBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ============================================================================
# FINCAS
# ============================================================================

class FincaBase(BaseModel):
    campana: str
    nombre: str
    superficie_total: float
    num_plantas: int
    
    # Ubicación
    provincia: Optional[str] = None
    poblacion: Optional[str] = None
    poligono: Optional[str] = None
    parcela: Optional[str] = None
    subparcela: Optional[str] = None
    
    # Producción
    hectareas: Optional[float] = None
    areas: Optional[float] = None
    toneladas: Optional[float] = None
    cantidad_producto_esperado: Optional[float] = None
    cantidad_producto_recolectado: Optional[float] = None
    
    # Datos SIGPAC (similar a parcela)
    geometria: Optional[List[Dict[str, float]]] = None
    sigpac: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class FincaCreate(BaseModel):
    campana: str
    nombre: str
    superficie_total: float
    num_plantas: int
    provincia: Optional[str] = None
    poblacion: Optional[str] = None

class FincaInDB(FincaBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ============================================================================
# VISITAS
# ============================================================================

class VisitaBase(BaseModel):
    objetivo: str  # Control Rutinario, Informe, Evaluación, etc.
    realizado: bool = False
    planificado: bool = False
    fecha_visita: Optional[str] = None
    hora_visita: Optional[str] = None
    
    # Vínculos obligatorios al contexto agronómico
    contrato_id: Optional[str] = None  # ObjectId ref a contratos (recomendado)
    parcela_id: str  # ObjectId ref a parcelas (OBLIGATORIO)
    cultivo_id: str  # ObjectId ref a cultivos (OBLIGATORIO)
    campana: str  # OBLIGATORIO - campaña asociada
    
    # Campos legacy/adicionales (mantener compatibilidad)
    proveedor: Optional[str] = None  # Nombre (se puede poblar desde contrato)
    productor: Optional[str] = None
    cultivo: Optional[str] = None  # Nombre (se puede poblar desde cultivo_id)
    variedad: Optional[str] = None
    codigo_plantacion: Optional[str] = None
    finca: Optional[str] = None
    
    # Observaciones y documentos
    observaciones: Optional[str] = None
    documentos: List[str] = []  # IDs de documentos
    formularios: List[Dict[str, Any]] = []
    
    # Cuestionario de Plagas y Enfermedades
    cuestionario_plagas: Optional[Dict[str, int]] = None
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class VisitaCreate(BaseModel):
    objetivo: str
    
    # MODELO SIMPLIFICADO: solo parcela_id obligatorio
    # El resto se hereda automáticamente desde la parcela y su contrato
    parcela_id: str  # OBLIGATORIO - el contexto se hereda de aquí
    
    # Campos opcionales editables por el usuario
    fecha_visita: Optional[str] = None
    observaciones: Optional[str] = None
    
    # Cuestionario de Plagas y Enfermedades (solo cuando objetivo = "Plagas y Enfermedades")
    cuestionario_plagas: Optional[Dict[str, int]] = None

class VisitaInDB(VisitaBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ============================================================================
# TAREAS
# ============================================================================

class TareaMaterial(BaseModel):
    tipo: str  # Alquiler Maquinaria, Combustible, Transporte
    nombre: str
    precio: float
    cantidad: float
    unidad: str
    stock: Optional[float] = None
    almacen: Optional[str] = None
    num_albaran: Optional[str] = None
    num_lote: Optional[str] = None

class TareaBase(BaseModel):
    nombre: str
    realizada: bool = False
    planificada: bool = False
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    
    superficie_tratar: float


# ============================================================================
# AI REPORTS
# ============================================================================

class AIReportBase(BaseModel):
    report_type: str  # "parcel_campaign", "contract_summary", "cost_analysis", "recommendations"
    entity_type: str  # "parcela", "contrato", "finca"
    entity_id: str  # ObjectId of the entity
    entity_name: Optional[str] = None  # Nombre legible para referencia
    
    # Context
    campana: Optional[str] = None
    cultivo: Optional[str] = None
    
    # Report content
    title: str
    summary: str  # Executive summary
    content: Dict[str, Any]  # Full structured report
    insights: List[str] = []  # Key insights/findings
    recommendations: List[str] = []  # Actionable recommendations
    anomalies: List[str] = []  # Detected anomalies
    
    # Metadata
    tokens_used: int = 0
    model_used: str = "gpt-4o"
    generation_time_seconds: float = 0.0
    
    created_at: datetime = Field(default_factory=datetime.now)
    created_by: Optional[str] = None  # User email

class AIReportCreate(BaseModel):
    report_type: str
    entity_type: str
    entity_id: str
    campana: Optional[str] = None

class AIReportInDB(AIReportBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

    unidad_medida: str = "ha"
    num_plantas: Optional[int] = None
    observaciones: Optional[str] = None
    
    # Materiales
    materiales: List[TareaMaterial] = []
    
    # Parcelas asociadas
    parcelas_ids: List[str] = []
    
    # Costes
    coste_tareas: float = 0.0
    coste_materiales: float = 0.0
    coste_personas: float = 0.0
    coste_maquinaria: float = 0.0
    coste_total: float = 0.0
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class TareaCreate(BaseModel):
    nombre: str
    superficie_tratar: float
    parcelas_ids: List[str]
    fecha_inicio: Optional[str] = None
    observaciones: Optional[str] = None

class TareaInDB(TareaBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ============================================================================
# COSECHAS - Asociadas a Contratos
# ============================================================================

class CargaCosecha(BaseModel):
    """Registro individual de carga de cosecha"""
    id_carga: str  # ID único de la carga
    fecha: str  # Fecha de la carga
    kilos_reales: float  # Kilos realmente recolectados
    precio: float  # Precio por kilo (del contrato o ajustado por tenderometría)
    importe: float  # kilos_reales * precio
    es_descuento: bool = False  # True si es línea negativa (destare/calidad)
    tipo_descuento: Optional[str] = None  # "destare", "calidad", etc.
    valor_tenderometria: Optional[float] = None  # Solo para guisante
    num_albaran: Optional[str] = None
    observaciones: Optional[str] = None

class PlanificacionRecoleccion(BaseModel):
    """Planificación de fecha y kilos a recolectar"""
    fecha_planificada: str
    kilos_estimados: float
    observaciones: Optional[str] = None

class CosechaBase(BaseModel):
    """Cosecha asociada a un contrato"""
    # Relación con contrato (obligatorio)
    contrato_id: str
    
    # Datos heredados del contrato (denormalizados para facilitar consultas)
    proveedor: Optional[str] = None
    cultivo: Optional[str] = None
    variedad: Optional[str] = None
    parcela: Optional[str] = None
    campana: Optional[str] = None
    precio_contrato: float = 0.0  # Precio por kg del contrato
    
    # Estado
    estado: str = "planificada"  # planificada, en_curso, completada
    
    # Planificación de recolección
    planificaciones: List[PlanificacionRecoleccion] = []
    kilos_totales_estimados: float = 0.0
    
    # Registros de cargas
    cargas: List[CargaCosecha] = []
    
    # Totales calculados
    kilos_totales_reales: float = 0.0  # Suma de kilos_reales (positivos)
    kilos_descuentos: float = 0.0  # Suma de descuentos (negativos)
    kilos_netos: float = 0.0  # kilos_totales_reales - kilos_descuentos
    importe_bruto: float = 0.0
    importe_descuentos: float = 0.0
    importe_neto: float = 0.0
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class CosechaCreate(BaseModel):
    """Para crear una nueva cosecha"""
    contrato_id: str
    planificaciones: List[PlanificacionRecoleccion] = []

class CargaCosechaCreate(BaseModel):
    """Para añadir una carga a la cosecha"""
    id_carga: str
    fecha: str
    kilos_reales: float
    es_descuento: bool = False
    tipo_descuento: Optional[str] = None
    num_albaran: Optional[str] = None
    observaciones: Optional[str] = None

class CosechaInDB(CosechaBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}