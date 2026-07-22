"""MongoDB connection and shared collection handles.

Motor 3.x expone tipos parametrizados (`AsyncIOMotorClient[Any]`, etc.) que en
la práctica se comportan como `Any` en runtime porque motor no publica stubs
completos. Anotamos como `Any` para no propagar ruido a mypy --strict en los
módulos migrados; el tipado real se aplica en las capas superiores (rutas +
Pydantic models).
"""
from __future__ import annotations

import os
from typing import Any, List, Optional

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
mongo_url: str = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client: Any = AsyncIOMotorClient(mongo_url)
db: Any = client[os.environ.get('DB_NAME', 'agricultural_management')]

# Collections
contratos_collection: Any = db['contratos']
parcelas_collection: Any = db['parcelas']
fincas_collection: Any = db['fincas']
visitas_collection: Any = db['visitas']
tareas_collection: Any = db['tareas']
cosechas_collection: Any = db['cosechas']
tratamientos_collection: Any = db['tratamientos']
irrigaciones_collection: Any = db['irrigaciones']
recetas_collection: Any = db['recetas']
albaranes_collection: Any = db['albaranes']
documentos_collection: Any = db['documentos']
maquinaria_collection: Any = db['maquinaria']
users_collection: Any = db['users']
evaluaciones_collection: Any = db['evaluaciones']
audit_logs_collection: Any = db['audit_logs']


# Helper function to serialize MongoDB documents
def serialize_doc(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    # Convert datetime to ISO string
    for key, value in doc.items():
        if hasattr(value, 'isoformat'):
            doc[key] = value.isoformat()
    return doc


def serialize_docs(docs: List[dict]) -> List[Any]:
    return [serialize_doc(doc) for doc in docs]
