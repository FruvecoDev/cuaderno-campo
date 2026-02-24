"""
AI Suggestions Routes - Treatment suggestions and harvest predictions
Uses OpenAI GPT-4o via Emergent Integrations
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import os
import json
import time
from dotenv import load_dotenv

from database import db, serialize_doc, serialize_docs
from routes_auth import get_current_user
from rbac_guards import RequireAIAccess
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

router = APIRouter(prefix="/api", tags=["ai-suggestions"])

# Collections
parcelas_collection = db['parcelas']
visitas_collection = db['visitas']
tratamientos_collection = db['tratamientos']
cosechas_collection = db['cosechas']
contratos_collection = db['contratos']
fitosanitarios_collection = db['fitosanitarios']

# AI Configuration
API_KEY = os.getenv("EMERGENT_LLM_KEY")
MODEL = "gpt-4o"
PROVIDER = "openai"


def create_chat(system_message: str, session_id: str) -> LlmChat:
    """Create a new chat instance"""
    chat = LlmChat(
        api_key=API_KEY,
        session_id=session_id,
        system_message=system_message
    )
    chat.with_model(PROVIDER, MODEL)
    return chat


def clean_json_response(response: str) -> str:
    """Clean AI response to extract JSON"""
    response = response.strip()
    if response.startswith("```json"):
        response = response[7:]
    elif response.startswith("```"):
        response = response[3:]
    if response.endswith("```"):
        response = response[:-3]
    return response.strip()


@router.post("/ai/suggest-treatments/{parcela_id}", response_model=dict)
async def suggest_treatments(
    parcela_id: str,
    problema: str,
    cultivo: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAIAccess)
):
    """
    Generate AI-powered treatment suggestions for a specific problem
    
    Args:
        parcela_id: ID of the parcel
        problema: Description of the problem (pest, disease, nutrient deficiency, etc.)
        cultivo: Optional crop type override
    """
    try:
        start_time = time.time()
        
        if not ObjectId.is_valid(parcela_id):
            raise HTTPException(status_code=400, detail="Invalid parcela_id")
        
        # Get parcel data
        parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
        if not parcela:
            raise HTTPException(status_code=404, detail="Parcela not found")
        
        # Use provided cultivo or get from parcel
        crop = cultivo or parcela.get("cultivo", "cultivo no especificado")
        
        # Get recent treatments for context
        recent_treatments = await tratamientos_collection.find({
            "parcelas_ids": parcela_id
        }).sort("fecha_tratamiento", -1).limit(10).to_list(10)
        
        # Get available phytosanitary products
        fitosanitarios = await fitosanitarios_collection.find({
            "activo": True
        }).limit(50).to_list(50)
        
        # Build context
        context = {
            "parcela": {
                "codigo": parcela.get("codigo_plantacion", "N/A"),
                "cultivo": crop,
                "variedad": parcela.get("variedad", "N/A"),
                "superficie": parcela.get("superficie_total", 0),
                "unidad": parcela.get("unidad_medida", "ha")
            },
            "problema_reportado": problema,
            "tratamientos_recientes": [
                {
                    "fecha": t.get("fecha_tratamiento"),
                    "tipo": t.get("tipo_tratamiento"),
                    "subtipo": t.get("subtipo"),
                    "producto": t.get("producto_fitosanitario_nombre")
                } for t in recent_treatments
            ],
            "productos_disponibles": [
                {
                    "nombre": f.get("nombre_comercial"),
                    "tipo": f.get("tipo"),
                    "materia_activa": f.get("materia_activa"),
                    "dosis_min": f.get("dosis_min"),
                    "dosis_max": f.get("dosis_max"),
                    "unidad_dosis": f.get("unidad_dosis"),
                    "plazo_seguridad": f.get("plazo_seguridad"),
                    "plagas_objetivo": f.get("plagas_objetivo", [])
                } for f in fitosanitarios
            ]
        }
        
        system_message = f"""Eres un agrónomo experto especializado en el cultivo de {crop}.
Tu tarea es proporcionar recomendaciones de tratamientos fitosanitarios basados en problemas específicos.

IMPORTANTE:
1. Recomienda SOLO productos registrados y autorizados
2. Indica dosis precisas basadas en las fichas técnicas
3. Considera los tratamientos recientes para evitar resistencias
4. Prioriza métodos de control integrado cuando sea posible
5. Responde SIEMPRE en formato JSON válido"""

        user_prompt = f"""Basándote en la siguiente información, sugiere los mejores tratamientos:

PROBLEMA REPORTADO: {problema}

CONTEXTO:
{json.dumps(context, indent=2, ensure_ascii=False)}

Genera una respuesta en formato JSON con esta estructura EXACTA:
{{
  "problema_identificado": "Descripción del problema identificado",
  "severidad_estimada": "Baja|Media|Alta|Crítica",
  "sugerencias": [
    {{
      "prioridad": 1,
      "tipo_tratamiento": "Fitosanitario|Nutrición|Biocontrol|Cultural",
      "producto_recomendado": "Nombre del producto",
      "materia_activa": "Materia activa",
      "dosis_recomendada": "X L/ha o kg/ha",
      "momento_aplicacion": "Cuándo aplicar",
      "metodo_aplicacion": "Pulverización|Fertirrigación|etc",
      "justificacion": "Por qué se recomienda este tratamiento",
      "precauciones": ["Precaución 1", "Precaución 2"],
      "plazo_seguridad_dias": 0
    }}
  ],
  "medidas_preventivas": [
    "Medida preventiva 1",
    "Medida preventiva 2"
  ],
  "seguimiento_recomendado": "Indicaciones de seguimiento",
  "notas_adicionales": "Observaciones importantes"
}}

Responde ÚNICAMENTE con el JSON."""

        chat = create_chat(system_message, f"treatment-suggestion-{parcela_id}-{int(time.time())}")
        message = UserMessage(text=user_prompt)
        
        response = await chat.send_message(message)
        response_text = clean_json_response(response)
        suggestions = json.loads(response_text)
        
        generation_time = time.time() - start_time
        
        return {
            "success": True,
            "suggestions": suggestions,
            "metadata": {
                "parcela_id": parcela_id,
                "cultivo": crop,
                "problema": problema,
                "model_used": MODEL,
                "generation_time_seconds": round(generation_time, 2),
                "generated_at": datetime.now().isoformat()
            }
        }
    
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Error parsing AI response: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {str(e)}")


@router.post("/ai/predict-yield/{contrato_id}", response_model=dict)
async def predict_harvest_yield(
    contrato_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAIAccess)
):
    """
    Predict harvest yield based on historical data and current campaign conditions
    """
    try:
        start_time = time.time()
        
        if not ObjectId.is_valid(contrato_id):
            raise HTTPException(status_code=400, detail="Invalid contrato_id")
        
        # Get contract
        contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
        if not contrato:
            raise HTTPException(status_code=404, detail="Contrato not found")
        
        campana = contrato.get("campana")
        cultivo = contrato.get("cultivo")
        proveedor = contrato.get("proveedor")
        
        # Get parcels for this contract
        parcelas = await parcelas_collection.find({
            "contrato_id": contrato_id
        }).to_list(50)
        
        # Get all treatments for these parcels
        parcela_ids = [str(p["_id"]) for p in parcelas]
        treatments = await tratamientos_collection.find({
            "parcelas_ids": {"$in": parcela_ids},
            "campana": campana
        }).to_list(200)
        
        # Get visits
        visits = await visitas_collection.find({
            "parcela_id": {"$in": parcela_ids},
            "campana": campana
        }).to_list(100)
        
        # Get current harvest data if exists
        cosechas = await cosechas_collection.find({
            "contrato_id": contrato_id
        }).to_list(50)
        
        # Get historical harvests for same crop and provider (other campaigns)
        historical_harvests = await cosechas_collection.find({
            "cultivo": cultivo,
            "proveedor": proveedor,
            "campana": {"$ne": campana}
        }).limit(20).to_list(20)
        
        # Calculate totals
        total_superficie = sum(p.get("superficie_total", 0) for p in parcelas)
        cantidad_contratada = contrato.get("cantidad", 0)
        kilos_recolectados = sum(c.get("kilos_netos", 0) for c in cosechas)
        
        # Historical yields
        historical_yields = []
        for h in historical_harvests:
            if h.get("superficie_parcela", 0) > 0:
                yield_per_ha = h.get("kilos_netos", 0) / h.get("superficie_parcela", 1)
                historical_yields.append({
                    "campana": h.get("campana"),
                    "kilos_netos": h.get("kilos_netos", 0),
                    "rendimiento_kg_ha": round(yield_per_ha, 2)
                })
        
        context = {
            "contrato": {
                "id": str(contrato.get("_id")),
                "proveedor": proveedor,
                "cultivo": cultivo,
                "variedad": contrato.get("variedad"),
                "campana": campana,
                "cantidad_contratada_kg": cantidad_contratada,
                "precio_kg": contrato.get("precio", 0)
            },
            "parcelas": {
                "cantidad": len(parcelas),
                "superficie_total_ha": total_superficie
            },
            "estado_actual": {
                "visitas_realizadas": len(visits),
                "tratamientos_aplicados": len(treatments),
                "kilos_ya_recolectados": kilos_recolectados,
                "porcentaje_completado": round((kilos_recolectados / cantidad_contratada * 100) if cantidad_contratada > 0 else 0, 2)
            },
            "historial": {
                "campanas_anteriores": historical_yields
            },
            "tratamientos_resumen": {
                "tipos": list(set(t.get("tipo_tratamiento", "") for t in treatments if t.get("tipo_tratamiento"))),
                "total": len(treatments)
            }
        }
        
        system_message = f"""Eres un experto en predicción de rendimientos agrícolas para el cultivo de {cultivo}.
Utiliza datos históricos, estado actual del cultivo y prácticas agronómicas para estimar rendimientos.

Tu análisis debe ser:
1. Basado en datos reales proporcionados
2. Conservador y realista
3. Incluir rangos de confianza
4. Identificar factores de riesgo
Responde SIEMPRE en formato JSON válido."""

        user_prompt = f"""Analiza los siguientes datos y predice el rendimiento esperado de la cosecha:

DATOS:
{json.dumps(context, indent=2, ensure_ascii=False)}

Genera una predicción en formato JSON:
{{
  "prediccion_rendimiento": {{
    "kilos_estimados_total": 0,
    "kilos_por_hectarea": 0,
    "rango_confianza": {{
      "minimo_kg": 0,
      "maximo_kg": 0,
      "nivel_confianza": "70%|80%|90%"
    }},
    "comparacion_contrato": {{
      "cantidad_contratada": 0,
      "diferencia_estimada_kg": 0,
      "porcentaje_cumplimiento": 0
    }}
  }},
  "factores_positivos": [
    "Factor positivo 1",
    "Factor positivo 2"
  ],
  "factores_riesgo": [
    {{
      "factor": "Descripción del riesgo",
      "impacto_potencial": "Bajo|Medio|Alto",
      "mitigacion": "Acción recomendada"
    }}
  ],
  "comparacion_historica": {{
    "rendimiento_promedio_anterior_kg_ha": 0,
    "tendencia": "Superior|Similar|Inferior",
    "variacion_porcentual": 0
  }},
  "recomendaciones": [
    "Recomendación para maximizar rendimiento 1",
    "Recomendación 2"
  ],
  "fecha_estimada_cosecha": "YYYY-MM-DD o rango",
  "notas": "Observaciones adicionales sobre la predicción"
}}

Responde SOLO con el JSON."""

        chat = create_chat(system_message, f"yield-prediction-{contrato_id}-{int(time.time())}")
        message = UserMessage(text=user_prompt)
        
        response = await chat.send_message(message)
        response_text = clean_json_response(response)
        prediction = json.loads(response_text)
        
        generation_time = time.time() - start_time
        
        return {
            "success": True,
            "prediction": prediction,
            "metadata": {
                "contrato_id": contrato_id,
                "cultivo": cultivo,
                "campana": campana,
                "superficie_total_ha": total_superficie,
                "model_used": MODEL,
                "generation_time_seconds": round(generation_time, 2),
                "generated_at": datetime.now().isoformat()
            }
        }
    
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Error parsing AI response: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating prediction: {str(e)}")


@router.get("/ai/parcelas-for-suggestions", response_model=dict)
async def get_parcelas_for_suggestions(
    current_user: dict = Depends(get_current_user)
):
    """Get list of parcels for the AI suggestions dropdown"""
    try:
        parcelas = await parcelas_collection.find({}).to_list(500)
        
        result = []
        for p in parcelas:
            result.append({
                "_id": str(p["_id"]),
                "codigo_plantacion": p.get("codigo_plantacion", "N/A"),
                "cultivo": p.get("cultivo", "N/A"),
                "variedad": p.get("variedad", "N/A"),
                "proveedor": p.get("proveedor", "N/A"),
                "campana": p.get("campana", "N/A"),
                "superficie": p.get("superficie_total", 0)
            })
        
        return {"parcelas": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching parcelas: {str(e)}")


@router.get("/ai/contratos-for-predictions", response_model=dict)
async def get_contratos_for_predictions(
    current_user: dict = Depends(get_current_user)
):
    """Get list of contracts for yield prediction dropdown"""
    try:
        contratos = await contratos_collection.find({}).to_list(500)
        
        result = []
        for c in contratos:
            result.append({
                "_id": str(c["_id"]),
                "proveedor": c.get("proveedor", "N/A"),
                "cultivo": c.get("cultivo", "N/A"),
                "variedad": c.get("variedad", "N/A"),
                "campana": c.get("campana", "N/A"),
                "cantidad": c.get("cantidad", 0),
                "precio": c.get("precio", 0)
            })
        
        return {"contratos": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching contratos: {str(e)}")
