"""
Pest and Disease Analysis Service using GPT-4o Vision
Analyzes agricultural images to detect pests and diseases
"""

import os
import base64
import json
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Import emergent integrations
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

SYSTEM_PROMPT = """Eres un experto agrónomo y fitopatólogo especializado en la identificación de plagas y enfermedades en cultivos agrícolas.

Tu tarea es analizar imágenes de plantas y cultivos para detectar posibles plagas, enfermedades o problemas fitosanitarios.

IMPORTANTE: Debes responder SIEMPRE en formato JSON válido con la siguiente estructura:
{
    "detected": true/false,
    "pest_or_disease": "Nombre de la plaga o enfermedad detectada (o 'Ninguna' si no se detecta)",
    "category": "plaga" | "enfermedad" | "deficiencia_nutricional" | "estres_hidrico" | "otro" | "ninguno",
    "severity": "leve" | "moderado" | "grave" | "ninguno",
    "confidence": 0-100,
    "description": "Descripción breve de lo observado",
    "symptoms": ["síntoma 1", "síntoma 2"],
    "recommended_treatment": "Tratamiento recomendado o 'No requiere tratamiento'",
    "preventive_measures": ["medida preventiva 1", "medida preventiva 2"],
    "urgency": "inmediata" | "proximos_dias" | "seguimiento" | "ninguna"
}

Si la imagen no muestra plantas o cultivos claramente, indica que no es posible realizar el análisis.
Si la planta se ve sana, indica "detected": false y describe el estado saludable.

Responde ÚNICAMENTE con el JSON, sin texto adicional."""


async def analyze_image_for_pests(image_path: str, crop_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Analyze an image for pests and diseases
    
    Args:
        image_path: Path to the image file
        crop_type: Optional crop type for more accurate analysis
    
    Returns:
        Dictionary with analysis results
    """
    if not EMERGENT_LLM_KEY:
        return {
            "error": True,
            "message": "API key not configured",
            "detected": False
        }
    
    try:
        # Read and encode image
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        image_base64 = base64.b64encode(image_data).decode("utf-8")
        
        # Initialize chat with GPT-4o Vision
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"pest-analysis-{os.path.basename(image_path)}",
            system_message=SYSTEM_PROMPT
        ).with_model("openai", "gpt-4o")
        
        # Build the prompt
        prompt = "Analiza esta imagen de cultivo agrícola y detecta cualquier plaga, enfermedad o problema fitosanitario."
        if crop_type:
            prompt += f" El cultivo es: {crop_type}."
        
        # Create image content
        image_content = ImageContent(image_base64=image_base64)
        
        # Create message with image
        user_message = UserMessage(
            text=prompt,
            file_contents=[image_content]
        )
        
        # Send message and get response
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            # Clean response - remove markdown code blocks if present
            clean_response = response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            clean_response = clean_response.strip()
            
            result = json.loads(clean_response)
            result["error"] = False
            result["raw_response"] = response
            return result
        except json.JSONDecodeError:
            # If JSON parsing fails, return raw response
            return {
                "error": False,
                "detected": False,
                "raw_response": response,
                "message": "No se pudo parsear la respuesta estructurada",
                "description": response
            }
            
    except FileNotFoundError:
        return {
            "error": True,
            "message": f"Imagen no encontrada: {image_path}",
            "detected": False
        }
    except Exception as e:
        return {
            "error": True,
            "message": f"Error en el análisis: {str(e)}",
            "detected": False
        }


async def analyze_image_base64(image_base64: str, crop_type: Optional[str] = None) -> Dict[str, Any]:
    """
    Analyze a base64 encoded image for pests and diseases
    
    Args:
        image_base64: Base64 encoded image data
        crop_type: Optional crop type for more accurate analysis
    
    Returns:
        Dictionary with analysis results
    """
    if not EMERGENT_LLM_KEY:
        return {
            "error": True,
            "message": "API key not configured",
            "detected": False
        }
    
    try:
        # Initialize chat with GPT-4o Vision
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"pest-analysis-base64",
            system_message=SYSTEM_PROMPT
        ).with_model("openai", "gpt-4o")
        
        # Build the prompt
        prompt = "Analiza esta imagen de cultivo agrícola y detecta cualquier plaga, enfermedad o problema fitosanitario."
        if crop_type:
            prompt += f" El cultivo es: {crop_type}."
        
        # Create image content
        image_content = ImageContent(image_base64=image_base64)
        
        # Create message with image
        user_message = UserMessage(
            text=prompt,
            file_contents=[image_content]
        )
        
        # Send message and get response
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        try:
            clean_response = response.strip()
            if clean_response.startswith("```json"):
                clean_response = clean_response[7:]
            if clean_response.startswith("```"):
                clean_response = clean_response[3:]
            if clean_response.endswith("```"):
                clean_response = clean_response[:-3]
            clean_response = clean_response.strip()
            
            result = json.loads(clean_response)
            result["error"] = False
            return result
        except json.JSONDecodeError:
            return {
                "error": False,
                "detected": False,
                "raw_response": response,
                "message": "No se pudo parsear la respuesta estructurada",
                "description": response
            }
            
    except Exception as e:
        return {
            "error": True,
            "message": f"Error en el análisis: {str(e)}",
            "detected": False
        }
