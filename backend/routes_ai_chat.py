"""
AI Chat Routes - Interactive agronomist chatbot
Uses OpenAI GPT-4o via Emergent Integrations with agricultural context
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
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

router = APIRouter(prefix="/api", tags=["ai-chat"])

# Collections
parcelas_collection = db['parcelas']
contratos_collection = db['contratos']
tratamientos_collection = db['tratamientos']
cosechas_collection = db['cosechas']
visitas_collection = db['visitas']
chat_sessions_collection = db['ai_chat_sessions']
chat_messages_collection = db['ai_chat_messages']

API_KEY = os.getenv("EMERGENT_LLM_KEY")
MODEL = "gpt-4o"
PROVIDER = "openai"


class ChatMessageInput(BaseModel):
    session_id: str = ""
    message: str


async def build_agricultural_context() -> str:
    """Build a summary of the user's agricultural data for the AI"""
    parcelas = await parcelas_collection.find({}, {
        "_id": 0, "codigo_plantacion": 1, "cultivo": 1, "variedad": 1,
        "superficie_total": 1, "campana": 1, "proveedor": 1
    }).to_list(30)

    contratos = await contratos_collection.find({}, {
        "_id": 0, "serie": 1, "numero": 1, "proveedor": 1, "cultivo": 1,
        "variedad": 1, "campana": 1, "cantidad": 1, "precio": 1, "estado": 1
    }).to_list(20)

    recent_treatments = await tratamientos_collection.find(
        {}, {"_id": 0, "tipo_tratamiento": 1, "subtipo": 1,
             "producto_fitosanitario_nombre": 1, "fecha_tratamiento": 1, "campana": 1}
    ).sort("fecha_tratamiento", -1).limit(15).to_list(15)

    recent_harvests = await cosechas_collection.find(
        {}, {"_id": 0, "cultivo": 1, "variedad": 1, "kilos_netos": 1,
             "campana": 1, "proveedor": 1}
    ).sort("fecha_cosecha", -1).limit(15).to_list(15)

    recent_visits = await visitas_collection.find(
        {}, {"_id": 0, "objetivo": 1, "observaciones": 1, "fecha": 1}
    ).sort("fecha", -1).limit(10).to_list(10)

    # Serialize datetimes
    for items in [recent_treatments, recent_harvests, recent_visits]:
        for item in items:
            for k, v in item.items():
                if hasattr(v, 'isoformat'):
                    item[k] = v.isoformat()

    context = f"""DATOS AGRICOLAS DEL USUARIO:

PARCELAS ({len(parcelas)}):
{json.dumps(parcelas, ensure_ascii=False, indent=1)}

CONTRATOS ACTIVOS ({len(contratos)}):
{json.dumps(contratos, ensure_ascii=False, indent=1)}

ULTIMOS TRATAMIENTOS ({len(recent_treatments)}):
{json.dumps(recent_treatments, ensure_ascii=False, indent=1)}

ULTIMAS COSECHAS ({len(recent_harvests)}):
{json.dumps(recent_harvests, ensure_ascii=False, indent=1)}

ULTIMAS VISITAS ({len(recent_visits)}):
{json.dumps(recent_visits, ensure_ascii=False, indent=1)}"""

    return context


SYSTEM_MESSAGE = """Eres un agronomo experto con mas de 20 anos de experiencia en agricultura mediterranea.
Trabajas como consultor para la empresa FRUVECO, especializada en frutas y hortalizas.

Tu rol:
- Responder preguntas sobre cultivos, plagas, enfermedades, nutricion, riego, tratamientos fitosanitarios
- Dar recomendaciones basadas en los datos reales de las parcelas, contratos y tratamientos del usuario
- Interpretar datos de cosechas y sugerir mejoras de rendimiento
- Ayudar con la planificacion de campanas agricolas
- Informar sobre normativa fitosanitaria vigente en Espana/UE

Reglas:
1. Responde SIEMPRE en espanol
2. Se conciso pero completo (maximo 3-4 parrafos por respuesta)
3. Cuando sea relevante, haz referencia a los datos especificos del usuario
4. Si no tienes suficiente informacion, pregunta para poder dar una mejor respuesta
5. Usa terminologia agricola profesional pero accesible
6. Cuando recomiendes productos, menciona siempre el plazo de seguridad"""


@router.post("/ai/chat", response_model=dict)
async def send_chat_message(
    payload: ChatMessageInput,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAIAccess)
):
    """Send a message to the AI agronomist and get a response"""
    try:
        start_time = time.time()
        user_email = current_user.get("email")
        session_id = payload.session_id
        user_text = payload.message.strip()

        if not user_text:
            raise HTTPException(status_code=400, detail="Message cannot be empty")

        # Create new session if needed
        if not session_id:
            session_doc = {
                "user_email": user_email,
                "title": user_text[:80],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "message_count": 0
            }
            result = await chat_sessions_collection.insert_one(session_doc)
            session_id = str(result.inserted_id)

        # Validate session exists and belongs to user
        if ObjectId.is_valid(session_id):
            session = await chat_sessions_collection.find_one({
                "_id": ObjectId(session_id), "user_email": user_email
            })
            if not session:
                raise HTTPException(status_code=404, detail="Session not found")

        # Get conversation history (last 20 messages for context)
        history = await chat_messages_collection.find(
            {"session_id": session_id}
        ).sort("created_at", 1).limit(20).to_list(20)

        # Build agricultural context on first message or every 5 messages
        msg_count = len(history)
        ag_context = ""
        if msg_count == 0 or msg_count % 5 == 0:
            ag_context = await build_agricultural_context()

        # Build system message with context
        system_msg = SYSTEM_MESSAGE
        if ag_context:
            system_msg += f"\n\n{ag_context}"

        # Create LlmChat
        chat = LlmChat(
            api_key=API_KEY,
            session_id=f"chat-{session_id}-{int(time.time())}",
            system_message=system_msg
        )
        chat.with_model(PROVIDER, MODEL)

        # Build prompt with conversation history
        history_text = ""
        if history:
            history_lines = []
            for msg in history[-16:]:  # Last 16 messages for context
                role_label = "USUARIO" if msg["role"] == "user" else "AGRONOMO"
                history_lines.append(f"{role_label}: {msg['content']}")
            history_text = "\n\nHISTORIAL DE CONVERSACION:\n" + "\n".join(history_lines) + "\n\n"

        full_prompt = f"{history_text}USUARIO: {user_text}\n\nResponde como el agronomo experto. No repitas el formato AGRONOMO: al inicio."

        # Send message
        message = UserMessage(text=full_prompt)
        response = await chat.send_message(message)

        generation_time = round(time.time() - start_time, 2)

        # Save user message
        now = datetime.now(timezone.utc)
        await chat_messages_collection.insert_one({
            "session_id": session_id,
            "role": "user",
            "content": user_text,
            "created_at": now
        })

        # Save assistant response
        await chat_messages_collection.insert_one({
            "session_id": session_id,
            "role": "assistant",
            "content": response,
            "generation_time_seconds": generation_time,
            "created_at": now
        })

        # Update session
        await chat_sessions_collection.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"updated_at": now}, "$inc": {"message_count": 2}}
        )

        return {
            "success": True,
            "session_id": session_id,
            "response": response,
            "generation_time_seconds": generation_time
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in chat: {str(e)}")


@router.get("/ai/chat/sessions", response_model=dict)
async def get_chat_sessions(
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAIAccess)
):
    """Get all chat sessions for the current user"""
    try:
        user_email = current_user.get("email")
        sessions = await chat_sessions_collection.find(
            {"user_email": user_email}
        ).sort("updated_at", -1).limit(50).to_list(50)

        result = []
        for s in sessions:
            result.append({
                "id": str(s["_id"]),
                "title": s.get("title", "Sin titulo"),
                "message_count": s.get("message_count", 0),
                "created_at": s.get("created_at").isoformat() if s.get("created_at") else None,
                "updated_at": s.get("updated_at").isoformat() if s.get("updated_at") else None
            })

        return {"sessions": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sessions: {str(e)}")


@router.get("/ai/chat/history/{session_id}", response_model=dict)
async def get_chat_history(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAIAccess)
):
    """Get message history for a chat session"""
    try:
        user_email = current_user.get("email")

        # Verify session belongs to user
        if not ObjectId.is_valid(session_id):
            raise HTTPException(status_code=400, detail="Invalid session_id")

        session = await chat_sessions_collection.find_one({
            "_id": ObjectId(session_id), "user_email": user_email
        })
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        messages = await chat_messages_collection.find(
            {"session_id": session_id}
        ).sort("created_at", 1).to_list(200)

        result = []
        for m in messages:
            result.append({
                "id": str(m["_id"]),
                "role": m.get("role"),
                "content": m.get("content"),
                "generation_time_seconds": m.get("generation_time_seconds"),
                "created_at": m.get("created_at").isoformat() if m.get("created_at") else None
            })

        return {
            "session_id": session_id,
            "title": session.get("title", ""),
            "messages": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")


@router.delete("/ai/chat/session/{session_id}", response_model=dict)
async def delete_chat_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAIAccess)
):
    """Delete a chat session and its messages"""
    try:
        user_email = current_user.get("email")

        if not ObjectId.is_valid(session_id):
            raise HTTPException(status_code=400, detail="Invalid session_id")

        session = await chat_sessions_collection.find_one({
            "_id": ObjectId(session_id), "user_email": user_email
        })
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        await chat_messages_collection.delete_many({"session_id": session_id})
        await chat_sessions_collection.delete_one({"_id": ObjectId(session_id)})

        return {"success": True, "message": "Session deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting session: {str(e)}")
