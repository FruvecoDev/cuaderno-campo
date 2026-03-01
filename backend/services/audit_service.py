"""
Audit Service - Registra cambios en documentos para trazabilidad
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from database import audit_logs_collection, serialize_doc, serialize_docs


async def create_audit_log(
    collection_name: str,
    document_id: str,
    action: str,  # 'create', 'update', 'delete'
    user_email: str,
    user_name: str,
    changes: Optional[Dict[str, Any]] = None,
    previous_data: Optional[Dict[str, Any]] = None,
    new_data: Optional[Dict[str, Any]] = None
):
    """
    Crea un registro de auditoría para un cambio en un documento.
    
    Args:
        collection_name: Nombre de la colección (ej: 'contratos')
        document_id: ID del documento modificado
        action: Tipo de acción ('create', 'update', 'delete')
        user_email: Email del usuario que realizó la acción
        user_name: Nombre completo del usuario
        changes: Diccionario con los campos modificados {field: {old: x, new: y}}
        previous_data: Datos completos antes de la modificación (para delete)
        new_data: Datos completos después de la modificación (para create)
    """
    audit_log = {
        "collection": collection_name,
        "document_id": document_id,
        "action": action,
        "user_email": user_email,
        "user_name": user_name,
        "timestamp": datetime.now(timezone.utc),
        "changes": changes,
        "previous_data": previous_data,
        "new_data": new_data
    }
    
    result = await audit_logs_collection.insert_one(audit_log)
    return str(result.inserted_id)


def calculate_changes(old_doc: Dict, new_doc: Dict, exclude_fields: List[str] = None) -> Dict[str, Any]:
    """
    Calcula las diferencias entre dos documentos.
    
    Args:
        old_doc: Documento original
        new_doc: Documento modificado
        exclude_fields: Campos a excluir de la comparación
    
    Returns:
        Diccionario con los campos que cambiaron: {field: {old: x, new: y}}
    """
    if exclude_fields is None:
        exclude_fields = ['_id', 'updated_at', 'created_at']
    
    changes = {}
    
    # Campos en el nuevo documento
    all_keys = set(old_doc.keys()) | set(new_doc.keys())
    
    for key in all_keys:
        if key in exclude_fields:
            continue
            
        old_value = old_doc.get(key)
        new_value = new_doc.get(key)
        
        # Normalizar None y strings vacíos
        if old_value == '' or old_value is None:
            old_value = None
        if new_value == '' or new_value is None:
            new_value = None
            
        # Comparar valores
        if old_value != new_value:
            changes[key] = {
                "old": old_value,
                "new": new_value
            }
    
    return changes


async def get_audit_history(
    collection_name: str,
    document_id: str,
    limit: int = 50
) -> List[Dict]:
    """
    Obtiene el historial de auditoría para un documento.
    
    Args:
        collection_name: Nombre de la colección
        document_id: ID del documento
        limit: Número máximo de registros a devolver
    
    Returns:
        Lista de registros de auditoría ordenados por fecha descendente
    """
    cursor = audit_logs_collection.find({
        "collection": collection_name,
        "document_id": document_id
    }).sort("timestamp", -1).limit(limit)
    
    logs = await cursor.to_list(length=limit)
    return serialize_docs(logs)


async def get_recent_activity(
    collection_name: Optional[str] = None,
    user_email: Optional[str] = None,
    limit: int = 20
) -> List[Dict]:
    """
    Obtiene actividad reciente de auditoría.
    
    Args:
        collection_name: Filtrar por colección (opcional)
        user_email: Filtrar por usuario (opcional)
        limit: Número máximo de registros
    
    Returns:
        Lista de registros de auditoría recientes
    """
    query = {}
    if collection_name:
        query["collection"] = collection_name
    if user_email:
        query["user_email"] = user_email
    
    cursor = audit_logs_collection.find(query).sort("timestamp", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    return serialize_docs(logs)
