from __future__ import annotations

import os
from typing import Any, List, Optional

from motor.motor_asyncio import (
    AsyncIOMotorClient,
    AsyncIOMotorCollection,
    AsyncIOMotorDatabase,
)
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
mongo_url: str = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client: AsyncIOMotorClient = AsyncIOMotorClient(mongo_url)
db: AsyncIOMotorDatabase = client[os.environ.get('DB_NAME', 'agricultural_management')]

# Collections
contratos_collection: AsyncIOMotorCollection = db['contratos']
parcelas_collection: AsyncIOMotorCollection = db['parcelas']
fincas_collection: AsyncIOMotorCollection = db['fincas']
visitas_collection: AsyncIOMotorCollection = db['visitas']
tareas_collection: AsyncIOMotorCollection = db['tareas']
cosechas_collection: AsyncIOMotorCollection = db['cosechas']
tratamientos_collection: AsyncIOMotorCollection = db['tratamientos']
irrigaciones_collection: AsyncIOMotorCollection = db['irrigaciones']
recetas_collection: AsyncIOMotorCollection = db['recetas']
albaranes_collection: AsyncIOMotorCollection = db['albaranes']
documentos_collection: AsyncIOMotorCollection = db['documentos']
maquinaria_collection: AsyncIOMotorCollection = db['maquinaria']
users_collection: AsyncIOMotorCollection = db['users']
evaluaciones_collection: AsyncIOMotorCollection = db['evaluaciones']
audit_logs_collection: AsyncIOMotorCollection = db['audit_logs']


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
