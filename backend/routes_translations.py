"""
Routes for custom translations management
Allows users to add/edit translations for agricultural terms specific to their region
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/translations", tags=["translations"])

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'fruveco_db')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Supported languages
SUPPORTED_LANGUAGES = ['es', 'en', 'fr', 'de', 'it']

# Categories for translations
TRANSLATION_CATEGORIES = [
    'crops',           # Cultivos
    'pests',           # Plagas
    'diseases',        # Enfermedades
    'treatments',      # Tratamientos
    'machinery',       # Maquinaria
    'measurements',    # Unidades de medida
    'soil',            # Tipos de suelo
    'irrigation',      # Riego
    'harvest',         # Cosecha
    'general'          # General
]


class TranslationCreate(BaseModel):
    key: str = Field(..., description="Unique key for the translation (e.g., 'crop.tomato')")
    category: str = Field(..., description="Category of the translation")
    translations: dict = Field(..., description="Dictionary with language codes as keys")
    description: Optional[str] = Field(None, description="Description of what this term means")
    region: Optional[str] = Field(None, description="Region where this term is commonly used")


class TranslationUpdate(BaseModel):
    translations: Optional[dict] = None
    description: Optional[str] = None
    region: Optional[str] = None
    is_approved: Optional[bool] = None


class TranslationResponse(BaseModel):
    id: str
    key: str
    category: str
    translations: dict
    description: Optional[str]
    region: Optional[str]
    created_by: Optional[str]
    created_at: str
    updated_at: str
    is_approved: bool


@router.get("/categories")
async def get_categories():
    """Get list of available translation categories"""
    return {
        "categories": TRANSLATION_CATEGORIES,
        "languages": SUPPORTED_LANGUAGES
    }


@router.get("/")
async def get_translations(
    language: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    approved_only: bool = False
):
    """Get all custom translations with optional filters"""
    query = {}
    
    if category:
        query["category"] = category
    
    if approved_only:
        query["is_approved"] = True
    
    if search:
        query["$or"] = [
            {"key": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    translations = []
    cursor = db.custom_translations.find(query).sort("key", 1)
    
    async for doc in cursor:
        trans = {
            "id": str(doc["_id"]),
            "key": doc["key"],
            "category": doc["category"],
            "translations": doc["translations"],
            "description": doc.get("description"),
            "region": doc.get("region"),
            "created_by": doc.get("created_by"),
            "created_at": doc.get("created_at", ""),
            "updated_at": doc.get("updated_at", ""),
            "is_approved": doc.get("is_approved", False)
        }
        translations.append(trans)
    
    # If language filter, also filter translations dict
    if language and language in SUPPORTED_LANGUAGES:
        for trans in translations:
            if language in trans["translations"]:
                trans["value"] = trans["translations"][language]
    
    return {
        "translations": translations,
        "total": len(translations),
        "filters": {
            "language": language,
            "category": category,
            "search": search,
            "approved_only": approved_only
        }
    }


@router.get("/export/{language}")
async def export_translations_for_language(language: str):
    """Export all approved translations for a specific language as a flat dictionary"""
    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Language '{language}' not supported")
    
    translations = {}
    cursor = db.custom_translations.find({"is_approved": True})
    
    async for doc in cursor:
        key = doc["key"]
        if language in doc["translations"]:
            translations[key] = doc["translations"][language]
    
    return {
        "language": language,
        "translations": translations,
        "count": len(translations)
    }


@router.post("/")
async def create_translation(translation: TranslationCreate):
    """Create a new custom translation"""
    # Validate category
    if translation.category not in TRANSLATION_CATEGORIES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid category. Must be one of: {', '.join(TRANSLATION_CATEGORIES)}"
        )
    
    # Validate translations dict has at least one supported language
    valid_translations = {k: v for k, v in translation.translations.items() if k in SUPPORTED_LANGUAGES}
    if not valid_translations:
        raise HTTPException(
            status_code=400,
            detail=f"Translations must include at least one supported language: {', '.join(SUPPORTED_LANGUAGES)}"
        )
    
    # Check if key already exists
    existing = await db.custom_translations.find_one({"key": translation.key})
    if existing:
        raise HTTPException(status_code=400, detail=f"Translation key '{translation.key}' already exists")
    
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "key": translation.key,
        "category": translation.category,
        "translations": valid_translations,
        "description": translation.description,
        "region": translation.region,
        "created_at": now,
        "updated_at": now,
        "is_approved": False  # New translations need approval
    }
    
    result = await db.custom_translations.insert_one(doc)
    
    return {
        "success": True,
        "message": "Translation created successfully",
        "id": str(result.inserted_id),
        "translation": {
            "id": str(result.inserted_id),
            "key": translation.key,
            "category": translation.category,
            "translations": valid_translations,
            "description": translation.description,
            "region": translation.region,
            "is_approved": False
        }
    }


@router.put("/{translation_id}")
async def update_translation(translation_id: str, update: TranslationUpdate):
    """Update an existing translation"""
    try:
        obj_id = ObjectId(translation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid translation ID")
    
    existing = await db.custom_translations.find_one({"_id": obj_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Translation not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update.translations is not None:
        valid_translations = {k: v for k, v in update.translations.items() if k in SUPPORTED_LANGUAGES}
        if valid_translations:
            # Merge with existing translations
            merged = {**existing.get("translations", {}), **valid_translations}
            update_data["translations"] = merged
    
    if update.description is not None:
        update_data["description"] = update.description
    
    if update.region is not None:
        update_data["region"] = update.region
    
    if update.is_approved is not None:
        update_data["is_approved"] = update.is_approved
    
    await db.custom_translations.update_one({"_id": obj_id}, {"$set": update_data})
    
    updated = await db.custom_translations.find_one({"_id": obj_id})
    
    return {
        "success": True,
        "message": "Translation updated successfully",
        "translation": {
            "id": str(updated["_id"]),
            "key": updated["key"],
            "category": updated["category"],
            "translations": updated["translations"],
            "description": updated.get("description"),
            "region": updated.get("region"),
            "is_approved": updated.get("is_approved", False)
        }
    }


@router.delete("/{translation_id}")
async def delete_translation(translation_id: str):
    """Delete a translation"""
    try:
        obj_id = ObjectId(translation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid translation ID")
    
    result = await db.custom_translations.delete_one({"_id": obj_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Translation not found")
    
    return {"success": True, "message": "Translation deleted successfully"}


@router.post("/{translation_id}/approve")
async def approve_translation(translation_id: str):
    """Approve a translation (Admin only)"""
    try:
        obj_id = ObjectId(translation_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid translation ID")
    
    result = await db.custom_translations.update_one(
        {"_id": obj_id},
        {"$set": {"is_approved": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Translation not found")
    
    return {"success": True, "message": "Translation approved successfully"}


@router.post("/bulk-approve")
async def bulk_approve_translations(translation_ids: List[str]):
    """Approve multiple translations at once"""
    approved_count = 0
    
    for tid in translation_ids:
        try:
            obj_id = ObjectId(tid)
            result = await db.custom_translations.update_one(
                {"_id": obj_id},
                {"$set": {"is_approved": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            if result.modified_count > 0:
                approved_count += 1
        except:
            continue
    
    return {
        "success": True,
        "message": f"Approved {approved_count} translations",
        "approved_count": approved_count
    }


@router.post("/seed")
async def seed_default_translations():
    """Seed database with common agricultural terms"""
    existing_count = await db.custom_translations.count_documents({})
    if existing_count > 0:
        return {
            "success": False,
            "message": f"Database already has {existing_count} translations. Skipping seed."
        }
    
    # Common agricultural terms
    default_translations = [
        {
            "key": "crop.tomato",
            "category": "crops",
            "translations": {
                "es": "Tomate",
                "en": "Tomato",
                "fr": "Tomate",
                "de": "Tomate",
                "it": "Pomodoro"
            },
            "description": "Common vegetable crop"
        },
        {
            "key": "crop.lettuce",
            "category": "crops",
            "translations": {
                "es": "Lechuga",
                "en": "Lettuce",
                "fr": "Laitue",
                "de": "Salat",
                "it": "Lattuga"
            },
            "description": "Leafy green vegetable"
        },
        {
            "key": "crop.pepper",
            "category": "crops",
            "translations": {
                "es": "Pimiento",
                "en": "Pepper",
                "fr": "Poivron",
                "de": "Paprika",
                "it": "Peperone"
            },
            "description": "Bell pepper or sweet pepper"
        },
        {
            "key": "pest.aphid",
            "category": "pests",
            "translations": {
                "es": "Pulgón",
                "en": "Aphid",
                "fr": "Puceron",
                "de": "Blattlaus",
                "it": "Afide"
            },
            "description": "Small sap-sucking insect"
        },
        {
            "key": "pest.whitefly",
            "category": "pests",
            "translations": {
                "es": "Mosca blanca",
                "en": "Whitefly",
                "fr": "Mouche blanche",
                "de": "Weiße Fliege",
                "it": "Mosca bianca"
            },
            "description": "Common greenhouse pest"
        },
        {
            "key": "disease.mildew",
            "category": "diseases",
            "translations": {
                "es": "Mildiu",
                "en": "Mildew",
                "fr": "Mildiou",
                "de": "Mehltau",
                "it": "Peronospora"
            },
            "description": "Fungal disease affecting leaves"
        },
        {
            "key": "disease.botrytis",
            "category": "diseases",
            "translations": {
                "es": "Botrytis / Podredumbre gris",
                "en": "Botrytis / Gray mold",
                "fr": "Botrytis / Pourriture grise",
                "de": "Botrytis / Grauschimmel",
                "it": "Botrytis / Muffa grigia"
            },
            "description": "Gray mold fungal disease"
        },
        {
            "key": "irrigation.drip",
            "category": "irrigation",
            "translations": {
                "es": "Riego por goteo",
                "en": "Drip irrigation",
                "fr": "Irrigation goutte à goutte",
                "de": "Tröpfchenbewässerung",
                "it": "Irrigazione a goccia"
            },
            "description": "Water-efficient irrigation method"
        },
        {
            "key": "irrigation.sprinkler",
            "category": "irrigation",
            "translations": {
                "es": "Riego por aspersión",
                "en": "Sprinkler irrigation",
                "fr": "Irrigation par aspersion",
                "de": "Sprinklerbewässerung",
                "it": "Irrigazione a pioggia"
            },
            "description": "Overhead watering system"
        },
        {
            "key": "soil.clay",
            "category": "soil",
            "translations": {
                "es": "Arcilloso",
                "en": "Clay",
                "fr": "Argileux",
                "de": "Tonig",
                "it": "Argilloso"
            },
            "description": "Heavy soil type"
        },
        {
            "key": "soil.sandy",
            "category": "soil",
            "translations": {
                "es": "Arenoso",
                "en": "Sandy",
                "fr": "Sablonneux",
                "de": "Sandig",
                "it": "Sabbioso"
            },
            "description": "Light, well-draining soil"
        },
        {
            "key": "unit.hectare",
            "category": "measurements",
            "translations": {
                "es": "Hectárea",
                "en": "Hectare",
                "fr": "Hectare",
                "de": "Hektar",
                "it": "Ettaro"
            },
            "description": "10,000 square meters"
        }
    ]
    
    now = datetime.now(timezone.utc).isoformat()
    for trans in default_translations:
        trans["created_at"] = now
        trans["updated_at"] = now
        trans["is_approved"] = True  # Default translations are pre-approved
    
    result = await db.custom_translations.insert_many(default_translations)
    
    return {
        "success": True,
        "message": f"Seeded {len(result.inserted_ids)} default agricultural terms",
        "count": len(result.inserted_ids)
    }
