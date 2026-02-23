"""
AI Routes - Endpoints for AI-powered reports and analysis
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime
from bson import ObjectId

from models import AIReportCreate, AIReportInDB
from database import db, serialize_doc, serialize_docs
from routes_auth import get_current_user
from rbac_guards import RequireAIAccess
from ai_service import ai_service

router = APIRouter()

# Collections
ai_reports_collection = db['ai_reports']
parcelas_collection = db['parcelas']
contratos_collection = db['contratos']
visitas_collection = db['visitas']
tratamientos_collection = db['tratamientos']
cosechas_collection = db['cosechas']


@router.post("/ai/report/parcel/{parcela_id}", response_model=dict)
async def generate_parcel_report(
    parcela_id: str,
    campana: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAIAccess)
):
    """
    Generate comprehensive AI report for a parcel campaign
    """
    try:
        # Validate parcela exists
        if not ObjectId.is_valid(parcela_id):
            raise HTTPException(status_code=400, detail="Invalid parcela_id")
        
        parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
        if not parcela:
            raise HTTPException(status_code=404, detail="Parcela not found")
        
        # Get related contract (if exists)
        contrato = await contratos_collection.find_one({
            "campana": campana,
            "$or": [
                {"parcela_id": parcela_id},
                {"parcelas_ids": parcela_id}
            ]
        })
        
        # Get all visits for this parcel and campaign
        visits = await visitas_collection.find({
            "parcela_id": parcela_id,
            "campana": campana
        }).to_list(100)
        
        # Get all treatments
        treatments = await tratamientos_collection.find({
            "parcelas_ids": parcela_id,
            "campana": campana
        }).to_list(100)
        
        # Get all harvests
        harvests = await cosechas_collection.find({
            "parcelas_ids": parcela_id
        }).to_list(100)
        
        # Generate AI report
        result = await ai_service.generate_parcel_campaign_report(
            parcela_data=serialize_doc(parcela),
            contract_data=serialize_doc(contrato) if contrato else None,
            visits_data=serialize_docs(visits),
            treatments_data=serialize_docs(treatments),
            harvests_data=serialize_docs(harvests),
            campana=campana
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate report"))
        
        # Save report to database
        report_doc = {
            "report_type": "parcel_campaign",
            "entity_type": "parcela",
            "entity_id": parcela_id,
            "entity_name": f"{parcela.get('codigo_plantacion', 'N/A')} - {parcela.get('variedad', 'N/A')}",
            "campana": campana,
            "cultivo": parcela.get("cultivo", "N/A"),
            "title": result["report"].get("title", f"Campaña {campana} - {parcela.get('codigo_plantacion', 'N/A')}"),
            "summary": result["report"].get("summary", ""),
            "content": result["report"],
            "insights": result["report"].get("insights", []),
            "recommendations": result["report"].get("recommendations", []),
            "anomalies": result["report"].get("anomalies", []),
            "tokens_used": result["metadata"]["tokens_used"],
            "model_used": result["metadata"]["model_used"],
            "generation_time_seconds": result["metadata"]["generation_time_seconds"],
            "created_at": datetime.now(),
            "created_by": current_user.get("email")
        }
        
        insert_result = await ai_reports_collection.insert_one(report_doc)
        saved_report = await ai_reports_collection.find_one({"_id": insert_result.inserted_id})
        
        return {
            "success": True,
            "report": serialize_doc(saved_report),
            "message": "Report generated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")


@router.post("/ai/analysis/costs", response_model=dict)
async def generate_cost_analysis(
    entity_type: str,  # "parcela", "contrato", "finca"
    entity_id: str,
    campana: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAIAccess)
):
    """
    Generate cost analysis and detect anomalies
    """
    try:
        # Validate entity
        if not ObjectId.is_valid(entity_id):
            raise HTTPException(status_code=400, detail=f"Invalid {entity_type}_id")
        
        collection_map = {
            "parcela": parcelas_collection,
            "contrato": contratos_collection,
            "finca": db['fincas']
        }
        
        if entity_type not in collection_map:
            raise HTTPException(status_code=400, detail=f"Invalid entity_type: {entity_type}")
        
        entity = await collection_map[entity_type].find_one({"_id": ObjectId(entity_id)})
        if not entity:
            raise HTTPException(status_code=404, detail=f"{entity_type.capitalize()} not found")
        
        # Get treatments based on entity type
        if entity_type == "parcela":
            treatments = await tratamientos_collection.find({
                "parcelas_ids": entity_id,
                "campana": campana
            }).to_list(200)
            harvests = await cosechas_collection.find({
                "parcelas_ids": entity_id
            }).to_list(100)
        else:
            # For contracts and fincas, aggregate from all related parcelas
            treatments = await tratamientos_collection.find({
                "campana": campana,
                "contrato_id": entity_id
            }).to_list(200)
            harvests = await cosechas_collection.find({
                "contrato_id": entity_id
            }).to_list(100)
        
        # Generate cost analysis
        result = await ai_service.generate_cost_analysis(
            entity_type=entity_type,
            entity_data=serialize_doc(entity),
            treatments_data=serialize_docs(treatments),
            harvests_data=serialize_docs(harvests),
            campana=campana
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate analysis"))
        
        # Save report
        report_doc = {
            "report_type": "cost_analysis",
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_name": entity.get("nombre", entity.get("codigo_plantacion", "N/A")),
            "campana": campana,
            "title": result["analysis"].get("title", f"Análisis de Costes - {campana}"),
            "summary": result["analysis"].get("summary", ""),
            "content": result["analysis"],
            "insights": [],
            "recommendations": result["analysis"].get("recommendations", []),
            "anomalies": result["analysis"].get("anomalies", []),
            "tokens_used": result["metadata"]["tokens_used"],
            "model_used": result["metadata"]["model_used"],
            "generation_time_seconds": result["metadata"]["generation_time_seconds"],
            "created_at": datetime.now(),
            "created_by": current_user.get("email")
        }
        
        insert_result = await ai_reports_collection.insert_one(report_doc)
        saved_report = await ai_reports_collection.find_one({"_id": insert_result.inserted_id})
        
        return {
            "success": True,
            "analysis": serialize_doc(saved_report),
            "message": "Cost analysis generated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating cost analysis: {str(e)}")


@router.post("/ai/recommendations", response_model=dict)
async def generate_recommendations(
    parcela_id: str,
    campana: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAIAccess)
):
    """
    Generate agronomic recommendations based on historical data
    """
    try:
        if not ObjectId.is_valid(parcela_id):
            raise HTTPException(status_code=400, detail="Invalid parcela_id")
        
        parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
        if not parcela:
            raise HTTPException(status_code=404, detail="Parcela not found")
        
        # Get visits and treatments
        visits = await visitas_collection.find({
            "parcela_id": parcela_id,
            "campana": campana
        }).to_list(100)
        
        treatments = await tratamientos_collection.find({
            "parcelas_ids": parcela_id,
            "campana": campana
        }).to_list(100)
        
        cultivo = parcela.get("cultivo", "cultivo no especificado")
        
        # Generate recommendations
        result = await ai_service.generate_agronomic_recommendations(
            parcela_data=serialize_doc(parcela),
            visits_data=serialize_docs(visits),
            treatments_data=serialize_docs(treatments),
            campana=campana,
            cultivo=cultivo
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to generate recommendations"))
        
        # Save report
        report_doc = {
            "report_type": "recommendations",
            "entity_type": "parcela",
            "entity_id": parcela_id,
            "entity_name": f"{parcela.get('codigo_plantacion', 'N/A')} - {parcela.get('variedad', 'N/A')}",
            "campana": campana,
            "cultivo": cultivo,
            "title": result["recommendations"].get("title", f"Recomendaciones - {cultivo}"),
            "summary": result["recommendations"].get("summary", ""),
            "content": result["recommendations"],
            "insights": [],
            "recommendations": [r.get("recommendation", "") for r in result["recommendations"].get("recommendations", [])],
            "anomalies": [],
            "tokens_used": result["metadata"]["tokens_used"],
            "model_used": result["metadata"]["model_used"],
            "generation_time_seconds": result["metadata"]["generation_time_seconds"],
            "created_at": datetime.now(),
            "created_by": current_user.get("email")
        }
        
        insert_result = await ai_reports_collection.insert_one(report_doc)
        saved_report = await ai_reports_collection.find_one({"_id": insert_result.inserted_id})
        
        return {
            "success": True,
            "recommendations": serialize_doc(saved_report),
            "message": "Recommendations generated successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating recommendations: {str(e)}")


@router.get("/ai/reports", response_model=dict)
async def get_ai_reports(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    report_type: Optional[str] = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAIAccess)
):
    """
    Get saved AI reports with optional filters
    """
    try:
        query = {}
        if entity_type:
            query["entity_type"] = entity_type
        if entity_id:
            query["entity_id"] = entity_id
        if report_type:
            query["report_type"] = report_type
        
        reports = await ai_reports_collection.find(query).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {
            "reports": serialize_docs(reports),
            "total": await ai_reports_collection.count_documents(query)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching reports: {str(e)}")


@router.get("/ai/reports/{report_id}", response_model=dict)
async def get_ai_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireAIAccess)
):
    """
    Get a specific AI report by ID
    """
    try:
        if not ObjectId.is_valid(report_id):
            raise HTTPException(status_code=400, detail="Invalid report_id")
        
        report = await ai_reports_collection.find_one({"_id": ObjectId(report_id)})
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return {
            "success": True,
            "report": serialize_doc(report)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching report: {str(e)}")
