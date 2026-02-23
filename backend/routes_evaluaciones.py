from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel, Field

from database import db, serialize_doc, serialize_docs, parcelas_collection
from rbac_guards import RequireCreate, RequireEdit, RequireDelete, get_current_user

router = APIRouter(prefix="/api", tags=["evaluaciones"])

# Collection
evaluaciones_collection = db['evaluaciones']
evaluaciones_config_collection = db['evaluaciones_config']

# ============================================================================
# MODELS
# ============================================================================

class SeccionRespuesta(BaseModel):
    pregunta_id: str
    pregunta: str
    respuesta: Any  # Puede ser str, int, bool, etc.
    tipo: str = "texto"  # texto, numero, si_no, fecha

class EvaluacionCreate(BaseModel):
    parcela_id: str  # OBLIGATORIO - define el contexto
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    tecnico: Optional[str] = None
    
    # Secciones con respuestas
    toma_datos: Optional[List[Dict[str, Any]]] = []
    impresos: Optional[Dict[str, Any]] = {}
    analisis_suelo: Optional[List[Dict[str, Any]]] = []
    pasos_precampana: Optional[List[Dict[str, Any]]] = []
    calidad_cepellones: Optional[List[Dict[str, Any]]] = []
    inspeccion_maquinaria: Optional[List[Dict[str, Any]]] = []
    observaciones: Optional[List[Dict[str, Any]]] = []
    calibracion_mantenimiento: Optional[List[Dict[str, Any]]] = []

class PreguntaConfig(BaseModel):
    seccion: str
    pregunta: str
    tipo: str = "texto"  # texto, numero, si_no, fecha, seleccion
    opciones: Optional[List[str]] = None
    orden: int = 0
    activa: bool = True

# ============================================================================
# PREGUNTAS POR DEFECTO
# ============================================================================

PREGUNTAS_DEFAULT = {
    "toma_datos": [
        {"id": "td_1", "pregunta": "¿Se mantiene limpia la finca?", "tipo": "si_no"},
        {"id": "td_2", "pregunta": "¿En el campo hay colocados cubos de basura permanentes o móviles?", "tipo": "si_no"},
        {"id": "td_3", "pregunta": "¿Los cubos de basura se vacían de forma regular?", "tipo": "si_no"},
        {"id": "td_4", "pregunta": "¿Se recoge la basura generada durante los procesos de plantación y recolección?", "tipo": "si_no"},
        {"id": "td_5", "pregunta": "¿En qué condiciones se mantienen los márgenes de los campos?", "tipo": "texto"},
        {"id": "td_6", "pregunta": "¿Las parcelas de cultivo se mantienen limpias de malas hierbas?", "tipo": "si_no"},
        {"id": "td_7", "pregunta": "¿Qué método se ha utilizado para eliminar las malas hierbas?", "tipo": "texto"},
        {"id": "td_8", "pregunta": "En caso de utilización de herbicida, ¿su uso está anotado en el parte de tratamientos fitosanitarios y archivado?", "tipo": "si_no"},
        {"id": "td_9", "pregunta": "¿El ganado pasa por el campo entre cultivos?", "tipo": "si_no"},
        {"id": "td_10", "pregunta": "¿La finca dispone de botiquín completo debidamente señalizado en cada caseta de riego?", "tipo": "si_no"},
    ],
    "analisis_suelo": [
        {"id": "as_1", "pregunta": "¿Se ha archivado la hoja de los resultados de análisis con este impreso?", "tipo": "si_no"},
        {"id": "as_2", "pregunta": "Medidas tomadas como consecuencia de los resultados de los análisis", "tipo": "texto"},
        {"id": "as_3", "pregunta": "¿Los paquetes/envases de semillas están archivados?", "tipo": "si_no"},
        {"id": "as_4", "pregunta": "Este lote en el momento de entrega estaba libre de síntomas de:", "tipo": "texto"},
    ],
    "calidad_cepellones": [
        {"id": "cc_1", "pregunta": "Nº de referencia de lote de cepellones", "tipo": "texto"},
        {"id": "cc_2", "pregunta": "¿Los paquetes/envases de semillas están archivados con este impreso?", "tipo": "si_no"},
        {"id": "cc_3", "pregunta": "¿El semillero ha suministrado un certificado de sanidad vegetal?", "tipo": "si_no"},
        {"id": "cc_4", "pregunta": "Si existe el certificado de sanidad, ¿está archivado con este impreso?", "tipo": "si_no"},
        {"id": "cc_5", "pregunta": "Este lote en el momento de entrega estaba libre de síntomas de:", "tipo": "texto"},
    ],
    "inspeccion_maquinaria": [
        {"id": "im_1", "pregunta": "Tipo de maquinaria", "tipo": "texto"},
        {"id": "im_2", "pregunta": "Modelo", "tipo": "texto"},
        {"id": "im_3", "pregunta": "¿Se ha realizado la limpieza de los filtros?", "tipo": "si_no"},
        {"id": "im_4", "pregunta": "¿Se ha comprobado el estado de la maquinaria?", "tipo": "si_no"},
        {"id": "im_5", "pregunta": "¿Se han cambiado los diafragmas?", "tipo": "si_no"},
        {"id": "im_6", "pregunta": "¿Se han revisado todas las conexiones?", "tipo": "si_no"},
    ],
    "calibracion_mantenimiento": [
        {"id": "cm_1", "pregunta": "Vaso", "tipo": "texto"},
        {"id": "cm_2", "pregunta": "Peso", "tipo": "texto"},
    ],
    "observaciones": [
        {"id": "obs_1", "pregunta": "Observaciones generales", "tipo": "texto"},
    ],
    "pasos_precampana": []
}

# ============================================================================
# CRUD EVALUACIONES
# ============================================================================

@router.post("/evaluaciones", response_model=dict)
async def create_evaluacion(
    evaluacion: EvaluacionCreate,
    current_user: dict = Depends(RequireCreate)
):
    """Crear nueva hoja de evaluación"""
    if not evaluacion.parcela_id:
        raise HTTPException(status_code=400, detail="parcela_id es obligatorio")
    
    if not ObjectId.is_valid(evaluacion.parcela_id):
        raise HTTPException(status_code=400, detail="parcela_id inválido")
    
    # Obtener datos de la parcela
    parcela = await parcelas_collection.find_one({"_id": ObjectId(evaluacion.parcela_id)})
    if not parcela:
        raise HTTPException(status_code=400, detail="Parcela no encontrada")
    
    # Construir documento con datos heredados de parcela
    evaluacion_dict = {
        "parcela_id": evaluacion.parcela_id,
        "fecha_inicio": evaluacion.fecha_inicio or datetime.now().strftime("%Y-%m-%d"),
        "fecha_fin": evaluacion.fecha_fin,
        "tecnico": evaluacion.tecnico or current_user.get("full_name", current_user.get("username", "")),
        
        # Datos heredados de parcela
        "proveedor": parcela.get("proveedor", ""),
        "codigo_plantacion": parcela.get("codigo_plantacion", ""),
        "finca": parcela.get("finca", ""),
        "cultivo": parcela.get("cultivo", ""),
        "variedad": parcela.get("variedad", ""),
        "superficie": parcela.get("superficie_total", 0),
        "campana": parcela.get("campana", ""),
        "contrato_id": parcela.get("contrato_id", ""),
        
        # Secciones de cuestionarios
        "toma_datos": evaluacion.toma_datos or [],
        "impresos": evaluacion.impresos or {
            "fecha_inicio": evaluacion.fecha_inicio,
            "fecha_fin": evaluacion.fecha_fin,
            "tecnico": evaluacion.tecnico
        },
        "analisis_suelo": evaluacion.analisis_suelo or [],
        "pasos_precampana": evaluacion.pasos_precampana or [],
        "calidad_cepellones": evaluacion.calidad_cepellones or [],
        "inspeccion_maquinaria": evaluacion.inspeccion_maquinaria or [],
        "observaciones": evaluacion.observaciones or [],
        "calibracion_mantenimiento": evaluacion.calibracion_mantenimiento or [],
        
        # Metadatos
        "estado": "borrador",  # borrador, completada, archivada
        "created_by": str(current_user.get("_id", "")),
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    result = await evaluaciones_collection.insert_one(evaluacion_dict)
    created = await evaluaciones_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/evaluaciones")
async def get_evaluaciones(
    skip: int = 0,
    limit: int = 100,
    parcela_id: Optional[str] = None,
    campana: Optional[str] = None,
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Listar hojas de evaluación"""
    query = {}
    if parcela_id:
        query["parcela_id"] = parcela_id
    if campana:
        query["campana"] = campana
    if estado:
        query["estado"] = estado
    
    evaluaciones = await evaluaciones_collection.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await evaluaciones_collection.count_documents(query)
    
    return {"evaluaciones": serialize_docs(evaluaciones), "total": total}


@router.get("/evaluaciones/{evaluacion_id}")
async def get_evaluacion(
    evaluacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener una hoja de evaluación por ID"""
    if not ObjectId.is_valid(evaluacion_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    evaluacion = await evaluaciones_collection.find_one({"_id": ObjectId(evaluacion_id)})
    if not evaluacion:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    
    return serialize_doc(evaluacion)


@router.put("/evaluaciones/{evaluacion_id}")
async def update_evaluacion(
    evaluacion_id: str,
    evaluacion: EvaluacionCreate,
    current_user: dict = Depends(RequireEdit)
):
    """Actualizar hoja de evaluación"""
    if not ObjectId.is_valid(evaluacion_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    update_data = {
        "fecha_inicio": evaluacion.fecha_inicio,
        "fecha_fin": evaluacion.fecha_fin,
        "tecnico": evaluacion.tecnico,
        "toma_datos": evaluacion.toma_datos or [],
        "impresos": evaluacion.impresos or {},
        "analisis_suelo": evaluacion.analisis_suelo or [],
        "pasos_precampana": evaluacion.pasos_precampana or [],
        "calidad_cepellones": evaluacion.calidad_cepellones or [],
        "inspeccion_maquinaria": evaluacion.inspeccion_maquinaria or [],
        "observaciones": evaluacion.observaciones or [],
        "calibracion_mantenimiento": evaluacion.calibracion_mantenimiento or [],
        "updated_at": datetime.now()
    }
    
    result = await evaluaciones_collection.update_one(
        {"_id": ObjectId(evaluacion_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    
    updated = await evaluaciones_collection.find_one({"_id": ObjectId(evaluacion_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.patch("/evaluaciones/{evaluacion_id}/estado")
async def update_evaluacion_estado(
    evaluacion_id: str,
    estado: str,
    current_user: dict = Depends(RequireEdit)
):
    """Cambiar estado de la evaluación"""
    if not ObjectId.is_valid(evaluacion_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    if estado not in ["borrador", "completada", "archivada"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
    
    result = await evaluaciones_collection.update_one(
        {"_id": ObjectId(evaluacion_id)},
        {"$set": {"estado": estado, "updated_at": datetime.now()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    
    return {"success": True, "message": f"Estado actualizado a {estado}"}


@router.delete("/evaluaciones/{evaluacion_id}")
async def delete_evaluacion(
    evaluacion_id: str,
    current_user: dict = Depends(RequireDelete)
):
    """Eliminar hoja de evaluación"""
    if not ObjectId.is_valid(evaluacion_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    result = await evaluaciones_collection.delete_one({"_id": ObjectId(evaluacion_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    
    return {"success": True, "message": "Evaluación eliminada"}


# ============================================================================
# CONFIGURACIÓN DE PREGUNTAS (Para admins)
# ============================================================================

@router.get("/evaluaciones/config/preguntas")
async def get_preguntas_config(
    current_user: dict = Depends(get_current_user)
):
    """Obtener configuración de preguntas (default + personalizadas)"""
    # Obtener preguntas personalizadas de la BD
    custom_preguntas = await evaluaciones_config_collection.find_one({"tipo": "preguntas"})
    
    if custom_preguntas:
        # Merge default con custom
        result = {}
        for seccion, preguntas in PREGUNTAS_DEFAULT.items():
            result[seccion] = preguntas.copy()
            if seccion in custom_preguntas.get("secciones", {}):
                result[seccion].extend(custom_preguntas["secciones"][seccion])
        return {"preguntas": result, "custom": custom_preguntas.get("secciones", {})}
    
    return {"preguntas": PREGUNTAS_DEFAULT, "custom": {}}


@router.post("/evaluaciones/config/preguntas")
async def add_pregunta_config(
    seccion: str,
    pregunta: str,
    tipo: str = "texto",
    current_user: dict = Depends(RequireCreate)
):
    """Agregar nueva pregunta personalizada a una sección"""
    # Verificar permisos (solo Admin o Manager)
    if current_user.get("role") not in ["Admin", "Manager"]:
        raise HTTPException(status_code=403, detail="Solo Admin o Manager pueden agregar preguntas")
    
    secciones_validas = list(PREGUNTAS_DEFAULT.keys())
    if seccion not in secciones_validas:
        raise HTTPException(status_code=400, detail=f"Sección inválida. Opciones: {secciones_validas}")
    
    tipos_validos = ["texto", "numero", "si_no", "fecha"]
    if tipo not in tipos_validos:
        raise HTTPException(status_code=400, detail=f"Tipo inválido. Opciones: {tipos_validos}")
    
    # Generar ID único para la pregunta
    pregunta_id = f"custom_{seccion}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    nueva_pregunta = {
        "id": pregunta_id,
        "pregunta": pregunta,
        "tipo": tipo,
        "created_by": str(current_user.get("_id", "")),
        "created_at": datetime.now().isoformat()
    }
    
    # Actualizar o crear configuración
    await evaluaciones_config_collection.update_one(
        {"tipo": "preguntas"},
        {
            "$push": {f"secciones.{seccion}": nueva_pregunta},
            "$set": {"updated_at": datetime.now()}
        },
        upsert=True
    )
    
    return {"success": True, "pregunta": nueva_pregunta}


@router.delete("/evaluaciones/config/preguntas/{pregunta_id}")
async def delete_pregunta_config(
    pregunta_id: str,
    seccion: str,
    current_user: dict = Depends(RequireDelete)
):
    """Eliminar pregunta personalizada"""
    if current_user.get("role") not in ["Admin"]:
        raise HTTPException(status_code=403, detail="Solo Admin puede eliminar preguntas")
    
    # Solo se pueden eliminar preguntas custom (que empiezan con "custom_")
    if not pregunta_id.startswith("custom_"):
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar preguntas personalizadas")
    
    result = await evaluaciones_config_collection.update_one(
        {"tipo": "preguntas"},
        {"$pull": {f"secciones.{seccion}": {"id": pregunta_id}}}
    )
    
    return {"success": True, "message": "Pregunta eliminada"}


# ============================================================================
# GENERACIÓN DE PDF - CON VISITAS Y TRATAMIENTOS
# ============================================================================

@router.get("/evaluaciones/{evaluacion_id}/pdf")
async def generate_evaluacion_pdf(
    evaluacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generar PDF de la hoja de evaluación con visitas y tratamientos"""
    from fastapi.responses import Response
    from weasyprint import HTML
    from database import visitas_collection, tratamientos_collection
    import io
    
    if not ObjectId.is_valid(evaluacion_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    evaluacion = await evaluaciones_collection.find_one({"_id": ObjectId(evaluacion_id)})
    if not evaluacion:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    
    parcela_id = evaluacion.get("parcela_id", "")
    
    # Obtener visitas de la parcela
    visitas = []
    if parcela_id:
        visitas = await visitas_collection.find({"parcela_id": parcela_id}).sort("fecha_visita", -1).to_list(100)
    
    # Obtener tratamientos de la parcela
    tratamientos = []
    if parcela_id:
        tratamientos = await tratamientos_collection.find({"parcelas_ids": parcela_id}).sort("fecha_tratamiento", -1).to_list(100)
    
    # Obtener irrigaciones de la parcela
    irrigaciones = []
    if parcela_id:
        from database import irrigaciones_collection
        irrigaciones = await irrigaciones_collection.find({"parcela_id": parcela_id}).sort("fecha", -1).to_list(100)
    
    # Obtener cosechas de la parcela
    cosechas = []
    if parcela_id:
        from database import cosechas_collection
        cosechas = await cosechas_collection.find({"parcelas_ids": parcela_id}).sort("created_at", -1).to_list(100)
    
    # Calcular total de páginas
    total_pages = 1 + len(visitas) + len(tratamientos) + len(irrigaciones) + len(cosechas)
    
    # Función helper para formatear respuestas
    def format_respuesta(resp):
        if resp is True:
            return "Sí"
        elif resp is False:
            return "No"
        elif resp is None or resp == "":
            return "—"
        return str(resp)
    
    def format_fecha(fecha):
        if not fecha:
            return "—"
        return str(fecha)
    
    # CSS común para todas las páginas
    css_styles = """
        @page {
            size: A4;
            margin: 1.5cm;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #333;
        }
        .page-break {
            page-break-before: always;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #2d5a27;
        }
        .header h1 {
            color: #2d5a27;
            font-size: 18pt;
            margin: 0 0 5px 0;
        }
        .header h2 {
            color: #666;
            font-size: 12pt;
            margin: 0;
            font-weight: normal;
        }
        .header h3 {
            color: #2d5a27;
            font-size: 10pt;
            margin: 5px 0 0 0;
            font-weight: normal;
        }
        .section {
            margin-bottom: 15px;
            page-break-inside: avoid;
        }
        .section-title {
            background-color: #2d5a27;
            color: white;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 11pt;
            margin-bottom: 0;
        }
        .section-title-blue {
            background-color: #1a5276;
        }
        .section-title-orange {
            background-color: #b9770e;
        }
        .section-content {
            border: 1px solid #ddd;
            border-top: none;
            padding: 12px;
        }
        .question-row {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .question-row:last-child {
            border-bottom: none;
        }
        .question-num {
            font-weight: bold;
            color: #2d5a27;
        }
        .question-text {
            margin-left: 5px;
        }
        .answer {
            margin-left: 20px;
            color: #555;
            font-style: italic;
        }
        .answer-yes {
            color: #28a745;
            font-weight: bold;
        }
        .answer-no {
            color: #dc3545;
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 9pt;
            color: #666;
            text-align: center;
        }
        .datos-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }
        .datos-grid-2 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        .dato-item {
            padding: 5px;
        }
        .dato-label {
            font-weight: bold;
            font-size: 9pt;
            color: #666;
        }
        .dato-value {
            font-size: 10pt;
        }
        .visita-header {
            background-color: #1a5276;
            color: white;
            padding: 10px;
            margin-bottom: 15px;
        }
        .visita-header h3 {
            margin: 0;
            color: white;
        }
        .tratamiento-header {
            background-color: #b9770e;
            color: white;
            padding: 10px;
            margin-bottom: 15px;
        }
        .tratamiento-header h3 {
            margin: 0;
            color: white;
        }
        .irrigacion-header {
            background-color: #2874a6;
            color: white;
            padding: 10px;
            margin-bottom: 15px;
        }
        .irrigacion-header h3 {
            margin: 0;
            color: white;
        }
        .cosecha-header {
            background-color: #1e8449;
            color: white;
            padding: 10px;
            margin-bottom: 15px;
        }
        .cosecha-header h3 {
            margin: 0;
            color: white;
        }
        .section-title-water {
            background-color: #2874a6;
        }
        .section-title-harvest {
            background-color: #1e8449;
        }
        .summary-box {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .summary-title {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 10px;
            color: #2d5a27;
        }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        table.data-table th, table.data-table td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        table.data-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        table.data-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .index-box {
            background-color: #fff;
            border: 2px solid #2d5a27;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
        }
        .index-title {
            font-weight: bold;
            font-size: 14pt;
            margin-bottom: 15px;
            color: #2d5a27;
            text-align: center;
            border-bottom: 2px solid #2d5a27;
            padding-bottom: 10px;
        }
        .index-section {
            margin-bottom: 15px;
        }
        .index-section-title {
            font-weight: bold;
            font-size: 11pt;
            margin-bottom: 8px;
            padding: 5px 10px;
            border-radius: 3px;
        }
        .index-section-title.visitas {
            background-color: #1a5276;
            color: white;
        }
        .index-section-title.tratamientos {
            background-color: #b9770e;
            color: white;
        }
        .index-section-title.irrigaciones {
            background-color: #2874a6;
            color: white;
        }
        .index-section-title.cosechas {
            background-color: #1e8449;
            color: white;
        }
        .index-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 10px;
            border-bottom: 1px dotted #ddd;
            font-size: 10pt;
        }
        .index-item:last-child {
            border-bottom: none;
        }
        .index-item-name {
            flex: 1;
        }
        .index-item-date {
            color: #666;
            margin-left: 10px;
        }
        .index-item-page {
            font-weight: bold;
            margin-left: 10px;
            min-width: 50px;
            text-align: right;
        }
        .index-empty {
            color: #999;
            font-style: italic;
            padding: 10px;
            text-align: center;
        }
    """
    
    # Generar HTML para el PDF
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>{css_styles}</style>
    </head>
    <body>
        <!-- PÁGINA 1: HOJA DE EVALUACIÓN PRINCIPAL -->
        <div class="header">
            <h1>FRUVECO</h1>
            <h2>HOJA DE EVALUACIÓN - CUADERNO DE CAMPO</h2>
            <h3>Página 1 de {total_pages}</h3>
        </div>
        
        <!-- Resumen -->
        <div class="summary-box">
            <div class="summary-title">RESUMEN DEL CUADERNO DE CAMPO</div>
            <div class="datos-grid">
                <div class="dato-item">
                    <div class="dato-label">Visitas</div>
                    <div class="dato-value" style="font-size: 14pt; font-weight: bold; color: #1a5276;">{len(visitas)}</div>
                </div>
                <div class="dato-item">
                    <div class="dato-label">Tratamientos</div>
                    <div class="dato-value" style="font-size: 14pt; font-weight: bold; color: #b9770e;">{len(tratamientos)}</div>
                </div>
                <div class="dato-item">
                    <div class="dato-label">Irrigaciones</div>
                    <div class="dato-value" style="font-size: 14pt; font-weight: bold; color: #2874a6;">{len(irrigaciones)}</div>
                </div>
                <div class="dato-item">
                    <div class="dato-label">Cosechas</div>
                    <div class="dato-value" style="font-size: 14pt; font-weight: bold; color: #1e8449;">{len(cosechas)}</div>
                </div>
                <div class="dato-item">
                    <div class="dato-label">Total Páginas</div>
                    <div class="dato-value" style="font-size: 14pt; font-weight: bold;">{total_pages}</div>
                </div>
            </div>
        </div>
        
        <!-- ÍNDICE DE CONTENIDOS -->
        <div class="index-box">
            <div class="index-title">ÍNDICE DE CONTENIDOS</div>
            
            <!-- Índice de Visitas -->
            <div class="index-section">
                <div class="index-section-title visitas">VISITAS ({len(visitas)})</div>
    """
    
    if visitas:
        for idx, visita in enumerate(visitas, 1):
            page_num = 1 + idx
            fecha = format_fecha(visita.get('fecha_visita'))
            objetivo = visita.get('objetivo', 'Sin objetivo')[:40]
            html_content += f"""
                <div class="index-item">
                    <span class="index-item-name">{idx}. {objetivo}</span>
                    <span class="index-item-date">{fecha}</span>
                    <span class="index-item-page">Pág. {page_num}</span>
                </div>
            """
    else:
        html_content += """
                <div class="index-empty">No hay visitas registradas</div>
        """
    
    html_content += """
            </div>
            
            <!-- Índice de Tratamientos -->
            <div class="index-section">
                <div class="index-section-title tratamientos">TRATAMIENTOS (""" + str(len(tratamientos)) + """)</div>
    """
    
    if tratamientos:
        for idx, tratamiento in enumerate(tratamientos, 1):
            page_num = 1 + len(visitas) + idx
            fecha = format_fecha(tratamiento.get('fecha_tratamiento'))
            tipo = tratamiento.get('tipo', 'Sin tipo')[:30]
            descripcion = tratamiento.get('descripcion', '')[:20] or ''
            html_content += f"""
                <div class="index-item">
                    <span class="index-item-name">{idx}. {tipo} {('- ' + descripcion) if descripcion else ''}</span>
                    <span class="index-item-date">{fecha}</span>
                    <span class="index-item-page">Pág. {page_num}</span>
                </div>
            """
    else:
        html_content += """
                <div class="index-empty">No hay tratamientos registrados</div>
        """
    
    # Índice de Irrigaciones
    html_content += """
            </div>
            
            <!-- Índice de Irrigaciones -->
            <div class="index-section">
                <div class="index-section-title irrigaciones">IRRIGACIONES (""" + str(len(irrigaciones)) + """)</div>
    """
    
    if irrigaciones:
        for idx, irrigacion in enumerate(irrigaciones, 1):
            page_num = 1 + len(visitas) + len(tratamientos) + idx
            fecha = format_fecha(irrigacion.get('fecha'))
            sistema = irrigacion.get('sistema', 'Sin sistema')[:25]
            volumen = irrigacion.get('volumen', 0)
            html_content += f"""
                <div class="index-item">
                    <span class="index-item-name">{idx}. {sistema} - {volumen} m³</span>
                    <span class="index-item-date">{fecha}</span>
                    <span class="index-item-page">Pág. {page_num}</span>
                </div>
            """
    else:
        html_content += """
                <div class="index-empty">No hay irrigaciones registradas</div>
        """
    
    # Índice de Cosechas
    html_content += """
            </div>
            
            <!-- Índice de Cosechas -->
            <div class="index-section">
                <div class="index-section-title cosechas">COSECHAS (""" + str(len(cosechas)) + """)</div>
    """
    
    if cosechas:
        for idx, cosecha in enumerate(cosechas, 1):
            page_num = 1 + len(visitas) + len(tratamientos) + len(irrigaciones) + idx
            nombre = cosecha.get('nombre', 'Sin nombre')[:30]
            total_kg = cosecha.get('cosecha_total', 0)
            html_content += f"""
                <div class="index-item">
                    <span class="index-item-name">{idx}. {nombre} - {total_kg:,.0f} kg</span>
                    <span class="index-item-date"></span>
                    <span class="index-item-page">Pág. {page_num}</span>
                </div>
            """
    else:
        html_content += """
                <div class="index-empty">No hay cosechas registradas</div>
        """
    
    html_content += f"""
            </div>
        </div>
        
        <!-- Datos Generales -->
        <div class="section">
            <div class="section-title">DATOS GENERALES</div>
            <div class="section-content">
                <div class="datos-grid">
                    <div class="dato-item">
                        <div class="dato-label">Fecha Inicio</div>
                        <div class="dato-value">{evaluacion.get('fecha_inicio', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Fecha Fin</div>
                        <div class="dato-value">{evaluacion.get('fecha_fin', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Técnico</div>
                        <div class="dato-value">{evaluacion.get('tecnico', '—')}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Plantación -->
        <div class="section">
            <div class="section-title">PLANTACIÓN</div>
            <div class="section-content">
                <div class="datos-grid">
                    <div class="dato-item">
                        <div class="dato-label">Proveedor / Agricultor</div>
                        <div class="dato-value">{evaluacion.get('proveedor', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Código Plantación</div>
                        <div class="dato-value">{evaluacion.get('codigo_plantacion', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Finca</div>
                        <div class="dato-value">{evaluacion.get('finca', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Cultivo</div>
                        <div class="dato-value">{evaluacion.get('cultivo', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Variedad</div>
                        <div class="dato-value">{evaluacion.get('variedad', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Superficie</div>
                        <div class="dato-value">{evaluacion.get('superficie', 0)} ha</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Campaña</div>
                        <div class="dato-value">{evaluacion.get('campana', '—')}</div>
                    </div>
                </div>
            </div>
        </div>
    """
    
    # Secciones de cuestionarios
    secciones_config = [
        ('toma_datos', 'TOMA DE DATOS'),
        ('analisis_suelo', 'ANÁLISIS DE SUELO'),
        ('pasos_precampana', 'PASOS PRECAMPAÑA DESINFECCIÓN'),
        ('calidad_cepellones', 'CALIDAD DE CEPELLONES'),
        ('inspeccion_maquinaria', 'INSPECCIÓN MAQUINARIA'),
        ('observaciones', 'OBSERVACIONES'),
        ('calibracion_mantenimiento', 'CALIBRACIÓN Y MANTENIMIENTO APARATOS MEDICIÓN FITO')
    ]
    
    for seccion_key, seccion_titulo in secciones_config:
        respuestas = evaluacion.get(seccion_key, [])
        if respuestas:
            html_content += f"""
        <div class="section">
            <div class="section-title">{seccion_titulo}</div>
            <div class="section-content">
            """
            for idx, resp in enumerate(respuestas, 1):
                pregunta = resp.get('pregunta', '')
                respuesta = resp.get('respuesta')
                respuesta_fmt = format_respuesta(respuesta)
                
                respuesta_class = ''
                if respuesta is True:
                    respuesta_class = 'answer-yes'
                elif respuesta is False:
                    respuesta_class = 'answer-no'
                
                html_content += f"""
                <div class="question-row">
                    <span class="question-num">{idx}.</span>
                    <span class="question-text">{pregunta}</span>
                    <div class="answer {respuesta_class}">R: {respuesta_fmt}</div>
                </div>
                """
            html_content += """
            </div>
        </div>
            """
    
    # Impresos
    impresos = evaluacion.get('impresos', {})
    if impresos:
        html_content += f"""
        <div class="section">
            <div class="section-title">IMPRESOS</div>
            <div class="section-content">
                <div class="datos-grid">
                    <div class="dato-item">
                        <div class="dato-label">Fecha Inicio</div>
                        <div class="dato-value">{impresos.get('fecha_inicio', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Fecha Fin</div>
                        <div class="dato-value">{impresos.get('fecha_fin', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Técnico</div>
                        <div class="dato-value">{impresos.get('tecnico', '—')}</div>
                    </div>
                </div>
            </div>
        </div>
        """
    
    # ========================================================================
    # PÁGINAS DE VISITAS - Una página por cada visita
    # ========================================================================
    for idx, visita in enumerate(visitas, 1):
        page_num = 1 + idx
        html_content += f"""
        <div class="page-break"></div>
        <div class="header">
            <h1>FRUVECO</h1>
            <h2>REGISTRO DE VISITA</h2>
            <h3>Visita {idx} de {len(visitas)} | Página {page_num} de {1 + len(visitas) + len(tratamientos)}</h3>
        </div>
        
        <div class="visita-header">
            <h3>VISITA #{idx} - {format_fecha(visita.get('fecha_visita'))}</h3>
        </div>
        
        <div class="section">
            <div class="section-title section-title-blue">DATOS DE LA VISITA</div>
            <div class="section-content">
                <div class="datos-grid">
                    <div class="dato-item">
                        <div class="dato-label">Fecha de Visita</div>
                        <div class="dato-value">{format_fecha(visita.get('fecha_visita'))}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Objetivo</div>
                        <div class="dato-value">{visita.get('objetivo', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Código Plantación</div>
                        <div class="dato-value">{visita.get('codigo_plantacion', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Proveedor</div>
                        <div class="dato-value">{visita.get('proveedor', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Cultivo</div>
                        <div class="dato-value">{visita.get('cultivo', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Variedad</div>
                        <div class="dato-value">{visita.get('variedad', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Finca</div>
                        <div class="dato-value">{visita.get('finca', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Campaña</div>
                        <div class="dato-value">{visita.get('campana', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Realizado</div>
                        <div class="dato-value">{'Sí' if visita.get('realizado') else 'No'}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title section-title-blue">OBSERVACIONES</div>
            <div class="section-content">
                <p>{visita.get('observaciones') or 'Sin observaciones registradas.'}</p>
            </div>
        </div>
        """
        
        # Cuestionario de Plagas y Enfermedades si existe
        cuestionario_plagas = visita.get('cuestionario_plagas', {})
        if cuestionario_plagas:
            html_content += f"""
        <div class="section">
            <div class="section-title section-title-blue">CUESTIONARIO PLAGAS Y ENFERMEDADES</div>
            <div class="section-content">
            """
            for key, value in cuestionario_plagas.items():
                if value:
                    label = key.replace('_', ' ').title()
                    html_content += f"""
                <div class="question-row">
                    <span class="question-text"><strong>{label}:</strong></span>
                    <div class="answer">{format_respuesta(value)}</div>
                </div>
                """
            html_content += """
            </div>
        </div>
            """
    
    # ========================================================================
    # PÁGINAS DE TRATAMIENTOS - Una página por cada tratamiento
    # ========================================================================
    for idx, tratamiento in enumerate(tratamientos, 1):
        page_num = 1 + len(visitas) + idx
        html_content += f"""
        <div class="page-break"></div>
        <div class="header">
            <h1>FRUVECO</h1>
            <h2>REGISTRO DE TRATAMIENTO</h2>
            <h3>Tratamiento {idx} de {len(tratamientos)} | Página {page_num} de {1 + len(visitas) + len(tratamientos)}</h3>
        </div>
        
        <div class="tratamiento-header">
            <h3>TRATAMIENTO #{idx} - {format_fecha(tratamiento.get('fecha_tratamiento'))}</h3>
        </div>
        
        <div class="section">
            <div class="section-title section-title-orange">DATOS DEL TRATAMIENTO</div>
            <div class="section-content">
                <div class="datos-grid">
                    <div class="dato-item">
                        <div class="dato-label">Fecha Tratamiento</div>
                        <div class="dato-value">{format_fecha(tratamiento.get('fecha_tratamiento'))}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Fecha Aplicación</div>
                        <div class="dato-value">{format_fecha(tratamiento.get('fecha_aplicacion'))}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Tipo</div>
                        <div class="dato-value">{tratamiento.get('tipo', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Aplicador</div>
                        <div class="dato-value">{tratamiento.get('aplicador_nombre', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Máquina</div>
                        <div class="dato-value">{tratamiento.get('maquina_nombre', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Campaña</div>
                        <div class="dato-value">{tratamiento.get('campana', '—')}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Realizado</div>
                        <div class="dato-value">{'Sí' if tratamiento.get('realizado') else 'No'}</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Coste Total</div>
                        <div class="dato-value">{tratamiento.get('coste_total', 0):.2f} €</div>
                    </div>
                    <div class="dato-item">
                        <div class="dato-label">Dosis</div>
                        <div class="dato-value">{tratamiento.get('dosis', '—')}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title section-title-orange">DESCRIPCIÓN / MOTIVO</div>
            <div class="section-content">
                <p>{tratamiento.get('descripcion') or tratamiento.get('motivo') or 'Sin descripción registrada.'}</p>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title section-title-orange">OBSERVACIONES</div>
            <div class="section-content">
                <p>{tratamiento.get('observaciones') or 'Sin observaciones registradas.'}</p>
            </div>
        </div>
        """
        
        # Productos utilizados si existen
        productos = tratamiento.get('productos', [])
        if productos:
            html_content += """
        <div class="section">
            <div class="section-title section-title-orange">PRODUCTOS UTILIZADOS</div>
            <div class="section-content">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Dosis</th>
                            <th>Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            for prod in productos:
                html_content += f"""
                        <tr>
                            <td>{prod.get('nombre', '—')}</td>
                            <td>{prod.get('dosis', '—')}</td>
                            <td>{prod.get('cantidad', '—')}</td>
                        </tr>
                """
            html_content += """
                    </tbody>
                </table>
            </div>
        </div>
            """
    
    # Footer final
    html_content += f"""
        <div class="footer">
            <p>Documento generado automáticamente por FRUVECO - Cuaderno de Campo</p>
            <p>Fecha de generación: {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
            <p>Total: {1 + len(visitas) + len(tratamientos)} páginas | {len(visitas)} visitas | {len(tratamientos)} tratamientos</p>
        </div>
    </body>
    </html>
    """
    
    # Generar PDF
    try:
        pdf_buffer = io.BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        
        filename = f"cuaderno_campo_{evaluacion.get('codigo_plantacion', 'sin_codigo')}_{evaluacion.get('campana', 'sin_campana')}.pdf"
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")
