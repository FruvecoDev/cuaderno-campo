"""
AI Service for Agricultural Field Notebook
Handles AI report generation, analysis, and recommendations using OpenAI GPT-4o
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Load environment variables
load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = os.getenv("EMERGENT_LLM_KEY")
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
        
        self.model = "gpt-4o"
        self.provider = "openai"
    
    def _create_chat(self, system_message: str, session_id: str) -> LlmChat:
        """Create a new chat instance with specified system message"""
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=system_message
        )
        chat.with_model(self.provider, self.model)
        return chat
    
    async def generate_parcel_campaign_report(
        self,
        parcela_data: Dict[str, Any],
        contract_data: Optional[Dict[str, Any]],
        visits_data: List[Dict[str, Any]],
        treatments_data: List[Dict[str, Any]],
        harvests_data: List[Dict[str, Any]],
        campana: str
    ) -> Dict[str, Any]:
        """
        Generate comprehensive campaign report for a parcel
        """
        start_time = time.time()
        
        # Build context data
        context = self._build_parcel_context(
            parcela_data, contract_data, visits_data, 
            treatments_data, harvests_data, campana
        )
        
        # System message
        system_message = """Eres un experto agrónomo especializado en análisis de campañas agrícolas.
Tu tarea es generar reportes comprensivos y profesionales sobre el seguimiento de parcelas.

Debes:
1. Analizar los datos proporcionados de forma estructurada
2. Identificar tendencias, anomalías y oportunidades de mejora
3. Proporcionar recomendaciones agronómicas basadas en mejores prácticas
4. Mantener un tono profesional pero accesible
5. Responder SIEMPRE en formato JSON válido con la estructura solicitada"""
        
        # User prompt
        user_prompt = f"""Analiza la siguiente información de campaña agrícola y genera un reporte completo:

DATOS DE CONTEXTO:
{json.dumps(context, indent=2, ensure_ascii=False)}

GENERA UN REPORTE EN FORMATO JSON con la siguiente estructura EXACTA:
{{
  "title": "Título del reporte (ej: Campaña 2025/26 - Parcela P-001)",
  "summary": "Resumen ejecutivo de 2-3 párrafos",
  "sections": {{
    "general_overview": {{
      "description": "Descripción general de la parcela y campaña",
      "key_metrics": [
        {{"metric": "nombre métrica", "value": "valor", "unit": "unidad"}},
        ...
      ]
    }},
    "visits_analysis": {{
      "total_visits": 0,
      "visit_types": {{}},
      "key_observations": ["observación 1", "observación 2"]
    }},
    "treatments_analysis": {{
      "total_treatments": 0,
      "treatment_types": {{}},
      "total_cost": 0,
      "cost_per_hectare": 0,
      "key_findings": ["hallazgo 1", "hallazgo 2"]
    }},
    "production_analysis": {{
      "total_harvest_kg": 0,
      "yield_per_hectare": 0,
      "quality_metrics": {{}},
      "observations": ["observación 1"]
    }}
  }},
  "insights": [
    "Insight clave 1: descripción...",
    "Insight clave 2: descripción...",
    "Insight clave 3: descripción..."
  ],
  "anomalies": [
    "Anomalía 1: descripción si aplica...",
    "Anomalía 2: descripción si aplica..."
  ],
  "recommendations": [
    "Recomendación 1: acción específica...",
    "Recomendación 2: acción específica...",
    "Recomendación 3: acción específica..."
  ]
}}

IMPORTANTE: Responde ÚNICAMENTE con el JSON, sin texto adicional antes o después."""
        
        # Generate report
        chat = self._create_chat(system_message, f"parcel-report-{parcela_data.get('_id')}-{int(time.time())}")
        message = UserMessage(text=user_prompt)
        
        try:
            response = await chat.send_message(message)
            
            # Parse JSON response
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            report_data = json.loads(response_text)
            
            generation_time = time.time() - start_time
            
            return {
                "success": True,
                "report": report_data,
                "metadata": {
                    "tokens_used": len(user_prompt.split()) + len(response.split()),  # Approximation
                    "model_used": self.model,
                    "generation_time_seconds": generation_time
                }
            }
        
        except json.JSONDecodeError as e:
            return {
                "success": False,
                "error": f"Error parsing AI response as JSON: {str(e)}",
                "raw_response": response if 'response' in locals() else None
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Error generating report: {str(e)}"
            }
    
    async def generate_cost_analysis(
        self,
        entity_type: str,
        entity_data: Dict[str, Any],
        treatments_data: List[Dict[str, Any]],
        harvests_data: List[Dict[str, Any]],
        campana: str
    ) -> Dict[str, Any]:
        """
        Generate cost analysis and detect anomalies
        """
        start_time = time.time()
        
        context = {
            "entity_type": entity_type,
            "entity": entity_data,
            "campana": campana,
            "treatments": treatments_data,
            "harvests": harvests_data
        }
        
        system_message = """Eres un experto en análisis de costes agrícolas.
Analiza los costes de tratamientos, identifica anomalías y proporciona insights accionables.
Responde SIEMPRE en formato JSON válido."""
        
        user_prompt = f"""Analiza los costes de la siguiente campaña:

DATOS:
{json.dumps(context, indent=2, ensure_ascii=False)}

Genera análisis en formato JSON:
{{
  "title": "Análisis de Costes - [nombre entidad]",
  "summary": "Resumen del análisis de costes",
  "cost_breakdown": {{
    "total_costs": 0,
    "cost_per_hectare": 0,
    "by_treatment_type": {{}},
    "by_category": {{}}
  }},
  "anomalies": [
    "Descripción de anomalía detectada si existe..."
  ],
  "benchmarks": {{
    "average_cost_per_ha_sector": "valor estimado",
    "comparison": "comparación con benchmark"
  }},
  "recommendations": [
    "Recomendación para optimizar costes..."
  ]
}}

Responde SOLO con el JSON."""
        
        chat = self._create_chat(system_message, f"cost-analysis-{int(time.time())}")
        message = UserMessage(text=user_prompt)
        
        try:
            response = await chat.send_message(message)
            response_text = self._clean_json_response(response)
            report_data = json.loads(response_text)
            
            generation_time = time.time() - start_time
            
            return {
                "success": True,
                "analysis": report_data,
                "metadata": {
                    "tokens_used": len(user_prompt.split()) + len(response.split()),
                    "model_used": self.model,
                    "generation_time_seconds": generation_time
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Error generating cost analysis: {str(e)}"
            }
    
    async def generate_agronomic_recommendations(
        self,
        parcela_data: Dict[str, Any],
        visits_data: List[Dict[str, Any]],
        treatments_data: List[Dict[str, Any]],
        campana: str,
        cultivo: str
    ) -> Dict[str, Any]:
        """
        Generate agronomic recommendations based on historical data
        """
        start_time = time.time()
        
        context = {
            "parcela": parcela_data,
            "cultivo": cultivo,
            "campana": campana,
            "visits": visits_data[-10:] if len(visits_data) > 10 else visits_data,  # Last 10 visits
            "treatments": treatments_data[-10:] if len(treatments_data) > 10 else treatments_data
        }
        
        system_message = f"""Eres un agrónomo experto en el cultivo de {cultivo}.
Proporciona recomendaciones técnicas basadas en el historial de la parcela.
Responde en formato JSON."""
        
        user_prompt = f"""Basándote en el siguiente historial, genera recomendaciones agronómicas:

DATOS:
{json.dumps(context, indent=2, ensure_ascii=False)}

Responde en JSON:
{{
  "title": "Recomendaciones Agronómicas - {cultivo}",
  "summary": "Resumen de recomendaciones",
  "recommendations": [
    {{
      "category": "Manejo Fitosanitario|Nutrición|Riego|Manejo del Cultivo",
      "priority": "Alta|Media|Baja",
      "recommendation": "Descripción detallada de la recomendación",
      "rationale": "Justificación basada en datos",
      "expected_benefit": "Beneficio esperado"
    }}
  ],
  "preventive_measures": [
    "Medida preventiva 1...",
    "Medida preventiva 2..."
  ],
  "next_steps": [
    "Acción inmediata 1...",
    "Acción inmediata 2..."
  ]
}}

SOLO JSON."""
        
        chat = self._create_chat(system_message, f"recommendations-{int(time.time())}")
        message = UserMessage(text=user_prompt)
        
        try:
            response = await chat.send_message(message)
            response_text = self._clean_json_response(response)
            report_data = json.loads(response_text)
            
            generation_time = time.time() - start_time
            
            return {
                "success": True,
                "recommendations": report_data,
                "metadata": {
                    "tokens_used": len(user_prompt.split()) + len(response.split()),
                    "model_used": self.model,
                    "generation_time_seconds": generation_time
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Error generating recommendations: {str(e)}"
            }
    
    def _build_parcel_context(
        self,
        parcela_data: Dict[str, Any],
        contract_data: Optional[Dict[str, Any]],
        visits_data: List[Dict[str, Any]],
        treatments_data: List[Dict[str, Any]],
        harvests_data: List[Dict[str, Any]],
        campana: str
    ) -> Dict[str, Any]:
        """Build structured context for AI"""
        return {
            "campaña": campana,
            "parcela": {
                "codigo": parcela_data.get("codigo_plantacion", "N/A"),
                "superficie": f"{parcela_data.get('superficie_total', 0)} {parcela_data.get('unidad_medida', 'ha')}",
                "variedad": parcela_data.get("variedad", "N/A"),
                "cultivo": parcela_data.get("cultivo", "N/A")
            },
            "contrato": {
                "numero": f"{contract_data.get('serie', '')}-{contract_data.get('año', '')}-{contract_data.get('numero', '')}" if contract_data else "N/A",
                "proveedor": contract_data.get("proveedor", "N/A") if contract_data else "N/A",
                "cantidad_contratada": contract_data.get("cantidad", 0) if contract_data else 0
            } if contract_data else None,
            "visitas": {
                "total": len(visits_data),
                "por_objetivo": self._group_by_field(visits_data, "objetivo"),
                "observaciones_clave": [v.get("observaciones", "") for v in visits_data if v.get("observaciones")]
            },
            "tratamientos": {
                "total": len(treatments_data),
                "por_tipo": self._group_by_field(treatments_data, "tipo_tratamiento"),
                "coste_total": sum(t.get("coste_total", 0) for t in treatments_data),
                "superficie_total_tratada": sum(t.get("superficie_aplicacion", 0) for t in treatments_data)
            },
            "cosechas": {
                "total_kg": sum(h.get("cosecha_total", 0) for h in harvests_data),
                "numero_cosechas": len(harvests_data),
                "ingreso_total": sum(h.get("ingreso_total", 0) for h in harvests_data)
            }
        }
    
    def _group_by_field(self, data_list: List[Dict], field: str) -> Dict[str, int]:
        """Group data by a field and count"""
        result = {}
        for item in data_list:
            value = item.get(field, "No especificado")
            result[value] = result.get(value, 0) + 1
        return result
    
    def _clean_json_response(self, response: str) -> str:
        """Clean AI response to extract JSON"""
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        elif response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        return response.strip()


# Singleton instance
ai_service = AIService()
