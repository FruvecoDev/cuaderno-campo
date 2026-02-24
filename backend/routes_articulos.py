"""
Routes for Artículos de Explotación - Catálogo de artículos para albaranes
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel, Field

from database import db, serialize_doc, serialize_docs
from rbac_guards import RequireCreate, RequireEdit, RequireDelete, get_current_user

router = APIRouter(prefix="/api", tags=["articulos"])

# Collection
articulos_collection = db['articulos_explotacion']


# Models
class ArticuloBase(BaseModel):
    codigo: str  # Código del artículo
    nombre: str  # Nombre del artículo
    descripcion: Optional[str] = None
    categoria: str = "General"  # Fertilizantes, Fitosanitarios, Semillas, Materiales, Servicios, Otros
    unidad_medida: str = "Unidad"  # Kg, L, Unidad, Saco, Caja, etc.
    precio_unitario: float = 0.0
    iva: float = 21.0  # Porcentaje de IVA
    stock_actual: Optional[float] = None
    stock_minimo: Optional[float] = None
    proveedor_habitual: Optional[str] = None
    observaciones: Optional[str] = None
    activo: bool = True
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class ArticuloCreate(BaseModel):
    codigo: Optional[str] = None  # Auto-generated if not provided
    nombre: str
    descripcion: Optional[str] = None
    categoria: str = "General"
    unidad_medida: str = "Unidad"
    precio_unitario: float = 0.0
    iva: float = 21.0
    stock_actual: Optional[float] = None
    stock_minimo: Optional[float] = None
    proveedor_habitual: Optional[str] = None
    observaciones: Optional[str] = None
    activo: bool = True


# Prefijos de código por categoría
CATEGORIA_PREFIXES = {
    "Fertilizantes": "FERT",
    "Fitosanitarios": "FITO",
    "Semillas": "SEM",
    "Materiales": "MAT",
    "Maquinaria": "MAQ",
    "Servicios": "SRV",
    "Combustibles": "COMB",
    "Envases": "ENV",
    "Otros": "OTR",
    "General": "ART"
}


async def generate_codigo(categoria: str) -> str:
    """Genera un código único para el artículo basado en la categoría"""
    prefix = CATEGORIA_PREFIXES.get(categoria, "ART")
    
    # Buscar el último código con este prefijo
    last_articulo = await articulos_collection.find_one(
        {"codigo": {"$regex": f"^{prefix}-"}},
        sort=[("codigo", -1)]
    )
    
    if last_articulo:
        # Extraer el número del último código
        try:
            last_num = int(last_articulo["codigo"].split("-")[1])
            next_num = last_num + 1
        except (IndexError, ValueError):
            next_num = 1
    else:
        next_num = 1
    
    return f"{prefix}-{next_num:04d}"


# Endpoints
@router.get("/articulos")
async def get_articulos(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    categoria: Optional[str] = None,
    activo: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Obtener lista de artículos de explotación"""
    query = {}
    
    if search:
        query["$or"] = [
            {"codigo": {"$regex": search, "$options": "i"}},
            {"nombre": {"$regex": search, "$options": "i"}},
            {"descripcion": {"$regex": search, "$options": "i"}}
        ]
    
    if categoria:
        query["categoria"] = categoria
    
    if activo is not None:
        query["activo"] = activo
    
    total = await articulos_collection.count_documents(query)
    articulos = await articulos_collection.find(query).sort("nombre", 1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "articulos": serialize_docs(articulos),
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/articulos/activos")
async def get_articulos_activos(
    current_user: dict = Depends(get_current_user)
):
    """Obtener solo artículos activos para selector en albaranes"""
    articulos = await articulos_collection.find({"activo": True}).sort("nombre", 1).to_list(500)
    return {"articulos": serialize_docs(articulos)}


@router.get("/articulos/categorias")
async def get_categorias(
    current_user: dict = Depends(get_current_user)
):
    """Obtener lista de categorías disponibles"""
    categorias = [
        "Fertilizantes",
        "Fitosanitarios", 
        "Semillas",
        "Materiales",
        "Maquinaria",
        "Servicios",
        "Combustibles",
        "Envases",
        "Otros"
    ]
    return {"categorias": categorias}


@router.get("/articulos/{articulo_id}")
async def get_articulo(
    articulo_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener un artículo por ID"""
    if not ObjectId.is_valid(articulo_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    articulo = await articulos_collection.find_one({"_id": ObjectId(articulo_id)})
    if not articulo:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    
    return {"success": True, "data": serialize_doc(articulo)}


@router.post("/articulos")
async def create_articulo(
    articulo: ArticuloCreate,
    current_user: dict = Depends(RequireCreate)
):
    """Crear un nuevo artículo de explotación con código auto-generado"""
    articulo_dict = articulo.model_dump()
    
    # Auto-generar código si no se proporciona
    if not articulo_dict.get("codigo"):
        articulo_dict["codigo"] = await generate_codigo(articulo_dict.get("categoria", "General"))
    else:
        # Si se proporciona código, verificar que no exista
        existing = await articulos_collection.find_one({"codigo": articulo_dict["codigo"]})
        if existing:
            raise HTTPException(status_code=400, detail=f"Ya existe un artículo con el código '{articulo_dict['codigo']}'")
    
    articulo_dict["created_at"] = datetime.now()
    articulo_dict["updated_at"] = datetime.now()
    
    result = await articulos_collection.insert_one(articulo_dict)
    created = await articulos_collection.find_one({"_id": result.inserted_id})
    
    return {"success": True, "data": serialize_doc(created)}


@router.put("/articulos/{articulo_id}")
async def update_articulo(
    articulo_id: str,
    articulo: ArticuloCreate,
    current_user: dict = Depends(RequireEdit)
):
    """Actualizar un artículo existente"""
    if not ObjectId.is_valid(articulo_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    existing = await articulos_collection.find_one({"_id": ObjectId(articulo_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    
    # Verificar código duplicado (excepto el mismo artículo)
    duplicate = await articulos_collection.find_one({
        "codigo": articulo.codigo,
        "_id": {"$ne": ObjectId(articulo_id)}
    })
    if duplicate:
        raise HTTPException(status_code=400, detail=f"Ya existe otro artículo con el código '{articulo.codigo}'")
    
    update_data = articulo.model_dump()
    update_data["updated_at"] = datetime.now()
    
    await articulos_collection.update_one(
        {"_id": ObjectId(articulo_id)},
        {"$set": update_data}
    )
    
    updated = await articulos_collection.find_one({"_id": ObjectId(articulo_id)})
    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/articulos/{articulo_id}")
async def delete_articulo(
    articulo_id: str,
    current_user: dict = Depends(RequireDelete)
):
    """Eliminar un artículo"""
    if not ObjectId.is_valid(articulo_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    result = await articulos_collection.delete_one({"_id": ObjectId(articulo_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    
    return {"success": True, "message": "Artículo eliminado correctamente"}


@router.patch("/articulos/{articulo_id}/toggle-activo")
async def toggle_articulo_activo(
    articulo_id: str,
    current_user: dict = Depends(RequireEdit)
):
    """Activar/desactivar un artículo"""
    if not ObjectId.is_valid(articulo_id):
        raise HTTPException(status_code=400, detail="ID inválido")
    
    articulo = await articulos_collection.find_one({"_id": ObjectId(articulo_id)})
    if not articulo:
        raise HTTPException(status_code=404, detail="Artículo no encontrado")
    
    new_status = not articulo.get("activo", True)
    
    await articulos_collection.update_one(
        {"_id": ObjectId(articulo_id)},
        {"$set": {"activo": new_status, "updated_at": datetime.now()}}
    )
    
    updated = await articulos_collection.find_one({"_id": ObjectId(articulo_id)})
    return {"success": True, "data": serialize_doc(updated)}
