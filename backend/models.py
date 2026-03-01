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
    
    # Tipo de contrato: Compra o Venta
    tipo: str = "Compra"  # Compra o Venta
    
    # Campos principales
    tipo_contrato: str = "Por Kilos"
    campana: str
    procedencia: str  # Campo / Almacén con tratamiento / Almacén sin tratamiento
    fecha_contrato: str
    fecha_baja: Optional[str] = None
    
    # Agentes según tipo de contrato
    agente_compra: Optional[str] = None  # Solo si tipo = "Compra"
    agente_venta: Optional[str] = None   # Solo si tipo = "Venta"
    
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
    
    # Tipo de contrato: Compra o Venta
    tipo: str = "Compra"
    
    # Nuevos campos (catálogos)
    proveedor_id: Optional[str] = None  # ObjectId ref a proveedores (Compra)
    cliente_id: Optional[str] = None    # ObjectId ref a clientes (Venta)
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
    
    # Agentes según tipo de contrato
    agente_compra: Optional[str] = None  # Solo si tipo = "Compra"
    agente_venta: Optional[str] = None   # Solo si tipo = "Venta"
    
    # Comisión del agente de COMPRA
    comision_compra_tipo: Optional[str] = None  # "porcentaje" o "euro_kilo"
    comision_compra_valor: Optional[float] = None  # Valor de la comisión
    
    # Comisión del agente de VENTA
    comision_venta_tipo: Optional[str] = None  # "porcentaje" o "euro_kilo"
    comision_venta_valor: Optional[float] = None  # Valor de la comisión
    
    # Campos legacy de comisión (para compatibilidad)
    comision_tipo: Optional[str] = None
    comision_valor: Optional[float] = None
    
    # Forma de pago/cobro según tipo de contrato
    forma_pago: Optional[str] = None   # Solo para contratos de Compra
    forma_cobro: Optional[str] = None  # Solo para contratos de Venta
    
    # Descuento destare (% sobre kilos, solo para contratos de Compra)
    descuento_destare: Optional[float] = None
    
    # Tabla de precios por calidad/tenderometría (para guisante)
    precios_calidad: List[ContratoPrecios] = []

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

class ParcelaUpdate(BaseModel):
    """Model for partial updates - all fields optional"""
    proveedor: Optional[str] = None
    cultivo: Optional[str] = None
    campana: Optional[str] = None
    variedad: Optional[str] = None
    superficie_total: Optional[float] = None
    codigo_plantacion: Optional[str] = None
    num_plantas: Optional[int] = None
    finca: Optional[str] = None
    finca_id: Optional[str] = None
    recintos: Optional[List[ParcelaRecinto]] = None
    contrato_id: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    estado: Optional[str] = None
    observaciones: Optional[str] = None

class ParcelaInDB(ParcelaBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ============================================================================
# FINCAS
# ============================================================================

class DatosSIGPAC(BaseModel):
    """Datos SIGPAC para localización de parcelas"""
    provincia: Optional[str] = None
    municipio: Optional[str] = None
    cod_agregado: Optional[str] = None
    zona: Optional[str] = None
    poligono: Optional[str] = None
    parcela: Optional[str] = None
    recinto: Optional[str] = None
    cod_uso: Optional[str] = None


class GeometriaManual(BaseModel):
    """Geometría dibujada manualmente en el mapa"""
    wkt: Optional[str] = None  # POLYGON((lon lat, ...))
    coords: Optional[List[List[float]]] = None  # [[lat, lon], ...]
    centroide: Optional[Dict[str, float]] = None  # {"lat": x, "lon": y}
    area_ha: Optional[float] = None  # Área calculada en hectáreas


class FincaBase(BaseModel):
    denominacion: str  # Nombre de la finca
    
    # Ubicación
    provincia: Optional[str] = None
    poblacion: Optional[str] = None
    poligono: Optional[str] = None
    parcela: Optional[str] = None
    subparcela: Optional[str] = None
    
    # Superficie y Producción
    hectareas: float = 0.0
    areas: float = 0.0
    toneladas: float = 0.0
    produccion_esperada: float = 0.0
    produccion_disponible: float = 0.0
    
    # Propiedad
    finca_propia: bool = False
    observaciones: Optional[str] = None
    
    # Datos SIGPAC
    sigpac: Optional[DatosSIGPAC] = None
    
    # Recolección
    recoleccion_semana: Optional[int] = None
    recoleccion_ano: Optional[int] = None
    
    # Precios
    precio_corte: float = 0.0
    precio_transporte: float = 0.0
    proveedor_corte: Optional[str] = None
    
    # Parcelas asociadas
    parcelas_ids: List[str] = []
    
    # Estado
    activo: bool = True
    
    # Geometría manual (dibujada en el mapa)
    geometria_manual: Optional[GeometriaManual] = None
    
    # Legacy fields for compatibility
    campana: Optional[str] = None
    nombre: Optional[str] = None  # Alias for denominacion
    superficie_total: Optional[float] = None
    num_plantas: Optional[int] = None
    cantidad_producto_esperado: Optional[float] = None
    cantidad_producto_recolectado: Optional[float] = None
    geometria: Optional[List[Dict[str, float]]] = None
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class FincaCreate(BaseModel):
    denominacion: str
    provincia: Optional[str] = None
    poblacion: Optional[str] = None
    poligono: Optional[str] = None
    parcela: Optional[str] = None
    subparcela: Optional[str] = None
    hectareas: float = 0.0
    areas: float = 0.0
    toneladas: float = 0.0
    produccion_esperada: float = 0.0
    produccion_disponible: float = 0.0
    finca_propia: bool = False
    observaciones: Optional[str] = None
    sigpac: Optional[DatosSIGPAC] = None
    recoleccion_semana: Optional[int] = None
    recoleccion_ano: Optional[int] = None
    precio_corte: float = 0.0
    precio_transporte: float = 0.0
    proveedor_corte: Optional[str] = None
    parcelas_ids: List[str] = []
    activo: bool = True
    geometria_manual: Optional[GeometriaManual] = None
    # Legacy
    campana: Optional[str] = None
    nombre: Optional[str] = None
    superficie_total: Optional[float] = None
    num_plantas: Optional[int] = None

class FincaUpdate(BaseModel):
    denominacion: Optional[str] = None
    provincia: Optional[str] = None
    poblacion: Optional[str] = None
    poligono: Optional[str] = None
    parcela: Optional[str] = None
    subparcela: Optional[str] = None
    hectareas: Optional[float] = None
    areas: Optional[float] = None
    toneladas: Optional[float] = None
    produccion_esperada: Optional[float] = None
    produccion_disponible: Optional[float] = None
    finca_propia: Optional[bool] = None
    observaciones: Optional[str] = None
    sigpac: Optional[DatosSIGPAC] = None
    recoleccion_semana: Optional[int] = None
    recoleccion_ano: Optional[int] = None
    precio_corte: Optional[float] = None
    precio_transporte: Optional[float] = None
    proveedor_corte: Optional[str] = None
    parcelas_ids: Optional[List[str]] = None
    activo: Optional[bool] = None
    geometria_manual: Optional[GeometriaManual] = None

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
    fecha_visita: str  # OBLIGATORIO - fecha de la visita
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
    
    # Fecha visita OBLIGATORIA
    fecha_visita: str  # OBLIGATORIO - fecha de la visita
    fecha_planificada: Optional[str] = None  # Para planificar visitas futuras
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

class SubTarea(BaseModel):
    """Subtarea o item de checklist"""
    id: str  # UUID generado
    descripcion: str
    completada: bool = False
    completada_por: Optional[str] = None
    completada_fecha: Optional[str] = None

class TareaCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    superficie_tratar: float = 0
    parcelas_ids: List[str] = []
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    fecha_vencimiento: Optional[str] = None  # Fecha límite
    observaciones: Optional[str] = None
    # Nuevos campos
    prioridad: str = "media"  # alta, media, baja
    estado: str = "pendiente"  # pendiente, en_progreso, completada, cancelada
    asignado_a: Optional[str] = None  # user_id del técnico asignado
    asignado_nombre: Optional[str] = None  # Nombre del usuario asignado
    tipo_tarea: str = "general"  # general, tratamiento, riego, cosecha, mantenimiento, otro
    subtareas: List[SubTarea] = []
    coste_estimado: float = 0
    coste_real: float = 0
    # Campos heredados de parcela
    cultivo: Optional[str] = None
    campana: Optional[str] = None
    proveedor: Optional[str] = None

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
    valor_tenderometria: Optional[float] = None  # Solo para guisante
    num_albaran: Optional[str] = None
    observaciones: Optional[str] = None

class CosechaInDB(CosechaBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# ============================================================================
# RECURSOS HUMANOS (RRHH)
# ============================================================================

class EmpleadoBase(BaseModel):
    """Modelo base para empleados"""
    # Datos personales
    codigo: str  # Código único del empleado (ej: EMP-001)
    nombre: str
    apellidos: str
    dni_nie: str
    fecha_nacimiento: Optional[str] = None
    direccion: Optional[str] = None
    codigo_postal: Optional[str] = None
    localidad: Optional[str] = None
    provincia: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    
    # Datos laborales
    fecha_alta: str
    fecha_baja: Optional[str] = None
    tipo_contrato: str = "Temporal"  # Temporal, Indefinido, Fijo-Discontinuo
    puesto: str = "Operario"  # Operario, Encargado, Técnico, Administrativo
    departamento: Optional[str] = None
    categoria_profesional: Optional[str] = None
    
    # Datos bancarios
    iban: Optional[str] = None
    
    # Datos de identificación biométrica
    foto_url: Optional[str] = None  # Foto para reconocimiento facial
    qr_code: Optional[str] = None  # Código QR único
    nfc_id: Optional[str] = None  # ID de tarjeta NFC
    
    # Firma digital
    firma_url: Optional[str] = None  # Imagen de la firma
    
    # Salario
    salario_hora: float = 0.0
    salario_hora_extra: Optional[float] = None
    salario_hora_nocturna: Optional[float] = None
    salario_hora_festivo: Optional[float] = None
    
    # Estado
    activo: bool = True
    
    # Metadata
    notas: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class EmpleadoCreate(BaseModel):
    """Para crear un nuevo empleado"""
    nombre: str
    apellidos: str
    dni_nie: str
    fecha_nacimiento: Optional[str] = None
    direccion: Optional[str] = None
    codigo_postal: Optional[str] = None
    localidad: Optional[str] = None
    provincia: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    fecha_alta: str
    tipo_contrato: str = "Temporal"
    puesto: str = "Operario"
    departamento: Optional[str] = None
    categoria_profesional: Optional[str] = None
    iban: Optional[str] = None
    salario_hora: float = 0.0
    salario_hora_extra: Optional[float] = None
    salario_hora_nocturna: Optional[float] = None
    salario_hora_festivo: Optional[float] = None
    notas: Optional[str] = None

class EmpleadoInDB(EmpleadoBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Fichajes / Control Horario
class FichajeBase(BaseModel):
    """Registro de fichaje (entrada/salida)"""
    empleado_id: str
    tipo: str  # "entrada" o "salida"
    fecha: str  # YYYY-MM-DD
    hora: str  # HH:MM:SS
    
    # Método de identificación
    metodo_identificacion: str = "manual"  # manual, qr, nfc, facial
    
    # Ubicación (si disponible)
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    ubicacion_nombre: Optional[str] = None  # Ej: "Parcela Norte"
    
    # Para fichajes en parcelas/tareas específicas
    parcela_id: Optional[str] = None
    tarea_id: Optional[str] = None
    
    # Validación
    validado: bool = False
    validado_por: Optional[str] = None
    validado_fecha: Optional[str] = None
    
    # Offline sync
    offline: bool = False  # Si se creó offline
    sincronizado: bool = True
    
    # Foto de verificación (para fichaje facial)
    foto_verificacion_url: Optional[str] = None
    
    notas: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class FichajeCreate(BaseModel):
    empleado_id: str
    tipo: str
    fecha: str
    hora: str
    metodo_identificacion: str = "manual"
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    ubicacion_nombre: Optional[str] = None
    parcela_id: Optional[str] = None
    tarea_id: Optional[str] = None
    offline: bool = False
    foto_verificacion_url: Optional[str] = None
    notas: Optional[str] = None

class FichajeInDB(FichajeBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Registro de Productividad
class RegistroProductividadBase(BaseModel):
    """Registro de productividad de un empleado"""
    empleado_id: str
    fecha: str
    
    # Asociación a parcela/tarea
    parcela_id: Optional[str] = None
    tarea_id: Optional[str] = None
    contrato_id: Optional[str] = None
    
    # Tipo de trabajo
    tipo_trabajo: str  # recoleccion, tratamiento, riego, poda, plantacion, otros
    
    # Métricas de productividad
    kilos_recogidos: Optional[float] = None
    hectareas_trabajadas: Optional[float] = None
    plantas_tratadas: Optional[int] = None
    unidades_procesadas: Optional[int] = None
    
    # Tiempo
    hora_inicio: str
    hora_fin: str
    horas_trabajadas: float = 0.0
    minutos_descanso: int = 0
    
    # Calidad del trabajo (1-5)
    calidad: Optional[int] = None
    
    # Validación
    validado: bool = False
    validado_por: Optional[str] = None
    
    notas: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class RegistroProductividadCreate(BaseModel):
    empleado_id: str
    fecha: str
    parcela_id: Optional[str] = None
    tarea_id: Optional[str] = None
    contrato_id: Optional[str] = None
    tipo_trabajo: str
    kilos_recogidos: Optional[float] = None
    hectareas_trabajadas: Optional[float] = None
    plantas_tratadas: Optional[int] = None
    unidades_procesadas: Optional[int] = None
    hora_inicio: str
    hora_fin: str
    minutos_descanso: int = 0
    calidad: Optional[int] = None
    notas: Optional[str] = None

class RegistroProductividadInDB(RegistroProductividadBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Documentos de Empleado
class DocumentoEmpleadoBase(BaseModel):
    """Documento asociado a un empleado"""
    empleado_id: str
    tipo: str  # contrato, nomina, certificado, dni, permiso_trabajo, formacion, otros
    nombre: str
    descripcion: Optional[str] = None
    archivo_url: str
    
    # Fechas
    fecha_documento: Optional[str] = None
    fecha_vencimiento: Optional[str] = None
    
    # Firma
    requiere_firma: bool = False
    firmado: bool = False
    firma_empleado_url: Optional[str] = None
    fecha_firma: Optional[str] = None
    
    # Estado
    activo: bool = True
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class DocumentoEmpleadoCreate(BaseModel):
    empleado_id: str
    tipo: str
    nombre: str
    descripcion: Optional[str] = None
    archivo_url: str
    fecha_documento: Optional[str] = None
    fecha_vencimiento: Optional[str] = None
    requiere_firma: bool = False

class DocumentoEmpleadoInDB(DocumentoEmpleadoBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Prenómina
class ConceptoPrenomina(BaseModel):
    """Concepto individual de la prenómina"""
    concepto: str  # horas_normales, horas_extra, horas_nocturnas, horas_festivos, plus_productividad
    cantidad: float  # Número de horas o unidades
    precio_unitario: float
    importe: float

class PrenominaBase(BaseModel):
    """Prenómina mensual de un empleado"""
    empleado_id: str
    periodo_mes: int  # 1-12
    periodo_ano: int
    
    # Resumen de horas
    horas_normales: float = 0.0
    horas_extra: float = 0.0
    horas_nocturnas: float = 0.0
    horas_festivos: float = 0.0
    total_horas: float = 0.0
    
    # Días trabajados
    dias_trabajados: int = 0
    
    # Desglose de conceptos
    conceptos: List[ConceptoPrenomina] = []
    
    # Importes
    importe_bruto: float = 0.0
    deducciones: float = 0.0
    importe_neto: float = 0.0
    
    # Plus productividad (opcional)
    plus_productividad: float = 0.0
    kilos_totales: float = 0.0
    
    # Estado
    estado: str = "borrador"  # borrador, validada, exportada, pagada
    validada_por: Optional[str] = None
    fecha_validacion: Optional[str] = None
    
    notas: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class PrenominaCreate(BaseModel):
    empleado_id: str
    periodo_mes: int
    periodo_ano: int

class PrenominaInDB(PrenominaBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# Ausencias/Vacaciones
class AusenciaBase(BaseModel):
    """Registro de ausencia o vacaciones"""
    empleado_id: str
    tipo: str  # vacaciones, baja_medica, permiso, ausencia_justificada, ausencia_injustificada
    fecha_inicio: str
    fecha_fin: str
    dias_totales: int = 1
    
    motivo: Optional[str] = None
    documento_url: Optional[str] = None  # Justificante médico, etc.
    
    # Estado
    estado: str = "pendiente"  # pendiente, aprobada, rechazada
    aprobada_por: Optional[str] = None
    fecha_aprobacion: Optional[str] = None
    
    notas: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

class AusenciaCreate(BaseModel):
    empleado_id: str
    tipo: str
    fecha_inicio: str
    fecha_fin: str
    motivo: Optional[str] = None
    documento_url: Optional[str] = None

class AusenciaInDB(AusenciaBase):
    id: str = Field(alias="_id")
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
