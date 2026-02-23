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
# GENERACIÓN DE PDF
# ============================================================================

@router.get("/evaluaciones/{evaluacion_id}/pdf")
async def generate_evaluacion_pdf(
    evaluacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generar PDF de la hoja de evaluación"""
    from fastapi.responses import Response
    from weasyprint import HTML
    import io
    
    if not ObjectId.is_valid(evaluacion_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    evaluacion = await evaluaciones_collection.find_one({"_id": ObjectId(evaluacion_id)})
    if not evaluacion:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    
    # Función helper para formatear respuestas
    def format_respuesta(resp):
        if resp is True:
            return "Sí"
        elif resp is False:
            return "No"
        elif resp is None or resp == "":
            return "—"
        return str(resp)
    
    # Generar HTML para el PDF
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 1.5cm;
            }}
            body {{
                font-family: 'Helvetica', 'Arial', sans-serif;
                font-size: 10pt;
                line-height: 1.4;
                color: #333;
            }}
            .header {{
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #2d5a27;
            }}
            .header h1 {{
                color: #2d5a27;
                font-size: 18pt;
                margin: 0 0 5px 0;
            }}
            .header h2 {{
                color: #666;
                font-size: 12pt;
                margin: 0;
                font-weight: normal;
            }}
            .section {{
                margin-bottom: 15px;
                page-break-inside: avoid;
            }}
            .section-title {{
                background-color: #2d5a27;
                color: white;
                padding: 8px 12px;
                font-weight: bold;
                font-size: 11pt;
                margin-bottom: 0;
            }}
            .section-content {{
                border: 1px solid #ddd;
                border-top: none;
                padding: 12px;
            }}
            .info-grid {{
                display: table;
                width: 100%;
            }}
            .info-row {{
                display: table-row;
            }}
            .info-cell {{
                display: table-cell;
                padding: 5px 10px;
                border-bottom: 1px solid #eee;
            }}
            .info-label {{
                font-weight: bold;
                width: 30%;
                background-color: #f9f9f9;
            }}
            .question-row {{
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }}
            .question-row:last-child {{
                border-bottom: none;
            }}
            .question-num {{
                font-weight: bold;
                color: #2d5a27;
            }}
            .question-text {{
                margin-left: 5px;
            }}
            .answer {{
                margin-left: 20px;
                color: #555;
                font-style: italic;
            }}
            .answer-yes {{
                color: #28a745;
                font-weight: bold;
            }}
            .answer-no {{
                color: #dc3545;
                font-weight: bold;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #ddd;
                font-size: 9pt;
                color: #666;
                text-align: center;
            }}
            .datos-grid {{
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }}
            .dato-item {{
                padding: 5px;
            }}
            .dato-label {{
                font-weight: bold;
                font-size: 9pt;
                color: #666;
            }}
            .dato-value {{
                font-size: 10pt;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>FRUVECO</h1>
            <h2>HOJA DE EVALUACIÓN - CUADERNO DE CAMPO</h2>
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
                
                # Clase CSS según tipo de respuesta
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
    
    # Footer
    html_content += f"""
        <div class="footer">
            <p>Documento generado automáticamente por FRUVECO - Cuaderno de Campo</p>
            <p>Fecha de generación: {datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
        </div>
    </body>
    </html>
    """
    
    # Generar PDF
    try:
        pdf_buffer = io.BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        
        filename = f"evaluacion_{evaluacion.get('codigo_plantacion', 'sin_codigo')}_{evaluacion.get('fecha_inicio', 'sin_fecha')}.pdf"
        
        return Response(
            content=pdf_buffer.getvalue(),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")
