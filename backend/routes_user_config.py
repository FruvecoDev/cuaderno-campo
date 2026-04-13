from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from database import db
from routes_auth import get_current_user

router = APIRouter(prefix="/api/user-config", tags=["user-config"])

class ColumnItem(BaseModel):
    id: str
    label: str
    visible: bool

class ColumnConfigPayload(BaseModel):
    columns: List[ColumnItem]

@router.get("/columns/{module}")
async def get_column_config(module: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    doc = await db["user_column_config"].find_one(
        {"user_id": user_id, "module": module},
        {"_id": 0, "columns": 1}
    )
    if doc and "columns" in doc:
        return {"columns": doc["columns"]}
    return {"columns": None}

@router.put("/columns/{module}")
async def save_column_config(module: str, payload: ColumnConfigPayload, current_user: dict = Depends(get_current_user)):
    user_id = current_user["_id"]
    columns_data = [c.dict() for c in payload.columns]
    await db["user_column_config"].update_one(
        {"user_id": user_id, "module": module},
        {"$set": {"columns": columns_data}},
        upsert=True
    )
    return {"ok": True}
