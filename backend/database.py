from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'agricultural_management')]

# Collections
contratos_collection = db['contratos']
parcelas_collection = db['parcelas']
fincas_collection = db['fincas']
visitas_collection = db['visitas']
tareas_collection = db['tareas']
cosechas_collection = db['cosechas']
tratamientos_collection = db['tratamientos']
irrigaciones_collection = db['irrigaciones']
recetas_collection = db['recetas']
albaranes_collection = db['albaranes']
documentos_collection = db['documentos']
maquinaria_collection = db['maquinaria']
users_collection = db['users']
evaluaciones_collection = db['evaluaciones']
audit_logs_collection = db['audit_logs']


async def create_indexes():
    """Crear índices únicos para garantizar integridad de datos."""
    try:
        # Índice único para codigo_plantacion en parcelas (solo si no es null/vacío)
        await parcelas_collection.create_index(
            "codigo_plantacion",
            unique=True,
            sparse=True,  # Permite múltiples documentos con valor null
            name="idx_codigo_plantacion_unique"
        )
        print("✅ Índice único para codigo_plantacion creado correctamente")
    except Exception as e:
        # Si ya existe o hay error, solo loguear
        print(f"⚠️ Índice codigo_plantacion: {e}")


# Helper function to serialize MongoDB documents
def serialize_doc(doc):
    if doc is None:
        return None
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    # Convert datetime to ISO string
    for key, value in doc.items():
        if hasattr(value, 'isoformat'):
            doc[key] = value.isoformat()
    return doc

def serialize_docs(docs):
    return [serialize_doc(doc) for doc in docs]