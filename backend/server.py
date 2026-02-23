from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv
import asyncio
import json
from io import BytesIO

# Load environment
load_dotenv()

# AI imports
from emergentintegrations.llm.chat import LlmChat, UserMessage

# PDF imports
from weasyprint import HTML

# Excel imports
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

app = FastAPI(title="Agricultural Management POC API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# DATA MODELS
# ============================================================================

class PolygonCoordinate(BaseModel):
    lat: float
    lng: float

class ParcelaCreate(BaseModel):
    nombre: str
    finca: str
    cultivo: str
    variedad: str
    superficie: float
    num_plantas: int
    polygon: List[PolygonCoordinate]

class ContratoCreate(BaseModel):
    parcela_id: str
    proveedor: str
    cultivo: str
    campana: str
    cantidad: float
    precio: float

class TratamientoCreate(BaseModel):
    parcela_id: str
    fecha: str
    tipo: str
    producto: str
    dosis: str
    coste: float
    plazo_seguridad: int

class RiegoCreate(BaseModel):
    parcela_id: str
    fecha: str
    volumen: float
    duracion: float
    coste: float

class VisitaCreate(BaseModel):
    parcela_id: str
    fecha: str
    tipo: str
    observaciones: str

class CosechaCreate(BaseModel):
    parcela_id: str
    fecha: str
    cantidad: float
    precio: float
    calidad: str

class ReportRequest(BaseModel):
    parcela_id: str

# ============================================================================
# IN-MEMORY STORAGE (POC only)
# ============================================================================

parcelas_db = {}
contratos_db = {}
tratamientos_db = []
riegos_db = []
visitas_db = []
cosechas_db = []

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    return {"message": "Agricultural Management POC API", "status": "running"}

@app.post("/api/poc/parcelas")
async def create_parcela(parcela: ParcelaCreate):
    parcela_id = f"PAR-{len(parcelas_db) + 1:03d}"
    parcelas_db[parcela_id] = {
        "id": parcela_id,
        "nombre": parcela.nombre,
        "finca": parcela.finca,
        "cultivo": parcela.cultivo,
        "variedad": parcela.variedad,
        "superficie": parcela.superficie,
        "num_plantas": parcela.num_plantas,
        "polygon": [p.dict() for p in parcela.polygon],
        "created_at": datetime.now().isoformat()
    }
    return {"success": True, "parcela_id": parcela_id, "data": parcelas_db[parcela_id]}

@app.get("/api/poc/parcelas")
async def get_parcelas():
    return {"parcelas": list(parcelas_db.values())}

@app.post("/api/poc/contratos")
async def create_contrato(contrato: ContratoCreate):
    if contrato.parcela_id not in parcelas_db:
        raise HTTPException(status_code=404, detail="Parcela not found")
    
    contrato_id = f"MP-2026-{len(contratos_db) + 1:03d}"
    contratos_db[contrato_id] = {
        "id": contrato_id,
        "parcela_id": contrato.parcela_id,
        "proveedor": contrato.proveedor,
        "cultivo": contrato.cultivo,
        "campana": contrato.campana,
        "cantidad": contrato.cantidad,
        "precio": contrato.precio,
        "created_at": datetime.now().isoformat()
    }
    return {"success": True, "contrato_id": contrato_id, "data": contratos_db[contrato_id]}

@app.post("/api/poc/tratamientos")
async def create_tratamiento(tratamiento: TratamientoCreate):
    tratamientos_db.append({
        "id": len(tratamientos_db) + 1,
        **tratamiento.dict(),
        "created_at": datetime.now().isoformat()
    })
    return {"success": True, "data": tratamientos_db[-1]}

@app.post("/api/poc/riegos")
async def create_riego(riego: RiegoCreate):
    riegos_db.append({
        "id": len(riegos_db) + 1,
        **riego.dict(),
        "created_at": datetime.now().isoformat()
    })
    return {"success": True, "data": riegos_db[-1]}

@app.post("/api/poc/visitas")
async def create_visita(visita: VisitaCreate):
    visitas_db.append({
        "id": len(visitas_db) + 1,
        **visita.dict(),
        "created_at": datetime.now().isoformat()
    })
    return {"success": True, "data": visitas_db[-1]}

@app.post("/api/poc/cosechas")
async def create_cosecha(cosecha: CosechaCreate):
    cosechas_db.append({
        "id": len(cosechas_db) + 1,
        **cosecha.dict(),
        "created_at": datetime.now().isoformat()
    })
    return {"success": True, "data": cosechas_db[-1]}

@app.get("/api/poc/parcelas/{parcela_id}/data")
async def get_parcela_data(parcela_id: str):
    if parcela_id not in parcelas_db:
        raise HTTPException(status_code=404, detail="Parcela not found")
    
    # Get all related data
    parcela = parcelas_db[parcela_id]
    contrato = next((c for c in contratos_db.values() if c["parcela_id"] == parcela_id), None)
    tratamientos = [t for t in tratamientos_db if t["parcela_id"] == parcela_id]
    riegos = [r for r in riegos_db if r["parcela_id"] == parcela_id]
    visitas = [v for v in visitas_db if v["parcela_id"] == parcela_id]
    cosechas = [c for c in cosechas_db if c["parcela_id"] == parcela_id]
    
    # Calculate totals
    total_tratamientos = sum(t["coste"] for t in tratamientos)
    total_riegos = sum(r["coste"] for r in riegos)
    total_cosechas = sum(c["cantidad"] * c["precio"] for c in cosechas)
    
    return {
        "parcela": parcela,
        "contrato": contrato,
        "tratamientos": tratamientos,
        "riegos": riegos,
        "visitas": visitas,
        "cosechas": cosechas,
        "totales": {
            "tratamientos": total_tratamientos,
            "riegos": total_riegos,
            "ingresos": total_cosechas
        }
    }

# ============================================================================
# AI REPORT GENERATION
# ============================================================================

@app.post("/api/poc/generate-ai-report")
async def generate_ai_report(request: ReportRequest):
    try:
        # Get all data for the parcela
        if request.parcela_id not in parcelas_db:
            raise HTTPException(status_code=404, detail="Parcela not found")
        
        parcela = parcelas_db[request.parcela_id]
        contrato = next((c for c in contratos_db.values() if c["parcela_id"] == request.parcela_id), None)
        tratamientos = [t for t in tratamientos_db if t["parcela_id"] == request.parcela_id]
        riegos = [r for r in riegos_db if r["parcela_id"] == request.parcela_id]
        visitas = [v for v in visitas_db if v["parcela_id"] == request.parcela_id]
        cosechas = [c for c in cosechas_db if c["parcela_id"] == request.parcela_id]
        
        # Prepare data
        campaign_data = {
            "parcela": parcela,
            "contrato": contrato,
            "tratamientos": tratamientos,
            "riegos": riegos,
            "visitas": visitas,
            "cosechas": cosechas
        }
        
        # Create AI prompt
        prompt = f"""Actúa como un agrónomo experto. Analiza estos datos agrícolas y genera un INFORME EJECUTIVO:

**DATOS:**
```json
{json.dumps(campaign_data, indent=2, ensure_ascii=False)}
```

**GENERA UN INFORME CON:**
1. Resumen ejecutivo (3-4 líneas)
2. Análisis de producción y rendimiento
3. Análisis de costes por categoría
4. Análisis de tratamientos aplicados
5. Análisis de riegos y eficiencia hídrica
6. Rentabilidad y ROI
7. Recomendaciones para próxima campaña

Usa markdown con secciones claras. Sé preciso con los números."""
        
        # Call AI
        api_key = os.getenv('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI API key not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"report-{request.parcela_id}",
            system_message="Eres un agrónomo experto en análisis de datos agrícolas."
        )
        chat.with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {"success": True, "report": response}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# PDF GENERATION
# ============================================================================

@app.post("/api/poc/generate-pdf")
async def generate_pdf(request: ReportRequest):
    try:
        if request.parcela_id not in parcelas_db:
            raise HTTPException(status_code=404, detail="Parcela not found")
        
        parcela = parcelas_db[request.parcela_id]
        contrato = next((c for c in contratos_db.values() if c["parcela_id"] == request.parcela_id), None)
        tratamientos = [t for t in tratamientos_db if t["parcela_id"] == request.parcela_id]
        riegos = [r for r in riegos_db if r["parcela_id"] == request.parcela_id]
        cosechas = [c for c in cosechas_db if c["parcela_id"] == request.parcela_id]
        
        # Create HTML
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{ size: A4; margin: 2cm; }}
                body {{ font-family: Arial, sans-serif; font-size: 11pt; color: #333; }}
                h1 {{ color: #2c5f2d; border-bottom: 3px solid #97bf0d; padding-bottom: 10px; }}
                h2 {{ color: #2c5f2d; margin-top: 20px; border-bottom: 1px solid #ddd; }}
                .header-info {{ background-color: #f0f8f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }}
                .info-row {{ margin-bottom: 5px; }}
                .info-label {{ font-weight: bold; display: inline-block; width: 150px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 10px 0 20px 0; }}
                th {{ background-color: #2c5f2d; color: white; padding: 10px; text-align: left; }}
                td {{ border: 1px solid #ddd; padding: 8px; }}
                tr:nth-child(even) {{ background-color: #f9f9f9; }}
            </style>
        </head>
        <body>
            <h1>📋 CUADERNO DE CAMPO</h1>
            <div class="header-info">
                <div class="info-row"><span class="info-label">Parcela:</span> {parcela['nombre']}</div>
                <div class="info-row"><span class="info-label">Finca:</span> {parcela['finca']}</div>
                <div class="info-row"><span class="info-label">Cultivo:</span> {parcela['cultivo']} - {parcela['variedad']}</div>
                <div class="info-row"><span class="info-label">Superficie:</span> {parcela['superficie']} ha</div>
                {f'<div class="info-row"><span class="info-label">Contrato:</span> {contrato["id"]}</div>' if contrato else ''}
            </div>
            
            <h2>🌿 Tratamientos Fitosanitarios</h2>
            <table>
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Dosis</th><th>Coste (€)</th><th>P.S.</th></tr></thead>
                <tbody>
                    {''.join(f'<tr><td>{t["fecha"]}</td><td>{t["tipo"]}</td><td>{t["producto"]}</td><td>{t["dosis"]}</td><td>{t["coste"]:.2f}</td><td>{t["plazo_seguridad"]} días</td></tr>' for t in tratamientos)}
                </tbody>
            </table>
            
            <h2>💧 Irrigaciones</h2>
            <table>
                <thead><tr><th>Fecha</th><th>Volumen (m³)</th><th>Duración (h)</th><th>Coste (€)</th></tr></thead>
                <tbody>
                    {''.join(f'<tr><td>{r["fecha"]}</td><td>{r["volumen"]}</td><td>{r["duracion"]}</td><td>{r["coste"]:.2f}</td></tr>' for r in riegos)}
                </tbody>
            </table>
            
            <h2>🌾 Cosechas</h2>
            <table>
                <thead><tr><th>Fecha</th><th>Cantidad (kg)</th><th>Precio (€/kg)</th><th>Ingreso (€)</th><th>Calidad</th></tr></thead>
                <tbody>
                    {''.join(f'<tr><td>{c["fecha"]}</td><td>{c["cantidad"]:.0f}</td><td>{c["precio"]:.2f}</td><td>{c["cantidad"] * c["precio"]:.2f}</td><td>{c["calidad"]}</td></tr>' for c in cosechas)}
                </tbody>
            </table>
            
            <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9pt; color: #666; text-align: center;">
                Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}<br>
                Sistema de Gestión Agrícola - Cuaderno de Campo Digital
            </div>
        </body>
        </html>
        """
        
        # Generate PDF
        html = HTML(string=html_content)
        pdf_bytes = html.write_pdf()
        
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=cuaderno_{parcela['nombre']}.pdf"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# EXCEL GENERATION
# ============================================================================

@app.post("/api/poc/generate-excel")
async def generate_excel(request: ReportRequest):
    try:
        if request.parcela_id not in parcelas_db:
            raise HTTPException(status_code=404, detail="Parcela not found")
        
        tratamientos = [t for t in tratamientos_db if t["parcela_id"] == request.parcela_id]
        riegos = [r for r in riegos_db if r["parcela_id"] == request.parcela_id]
        cosechas = [c for c in cosechas_db if c["parcela_id"] == request.parcela_id]
        
        # Create workbook
        wb = Workbook()
        
        # Treatments sheet
        ws = wb.active
        ws.title = "Tratamientos"
        headers = ["Fecha", "Tipo", "Producto", "Dosis", "Coste (€)", "P.S. (días)"]
        ws.append(headers)
        
        # Style
        for col in range(1, len(headers) + 1):
            cell = ws.cell(1, col)
            cell.fill = PatternFill(start_color="2C5F2D", end_color="2C5F2D", fill_type="solid")
            cell.font = Font(bold=True, color="FFFFFF")
            ws.column_dimensions[get_column_letter(col)].width = 15
        
        for t in tratamientos:
            ws.append([t["fecha"], t["tipo"], t["producto"], t["dosis"], t["coste"], t["plazo_seguridad"]])
        
        # Irrigations sheet
        ws2 = wb.create_sheet("Irrigaciones")
        headers2 = ["Fecha", "Volumen (m³)", "Duración (h)", "Coste (€)"]
        ws2.append(headers2)
        for col in range(1, len(headers2) + 1):
            cell = ws2.cell(1, col)
            cell.fill = PatternFill(start_color="2C5F2D", end_color="2C5F2D", fill_type="solid")
            cell.font = Font(bold=True, color="FFFFFF")
            ws2.column_dimensions[get_column_letter(col)].width = 15
        for r in riegos:
            ws2.append([r["fecha"], r["volumen"], r["duracion"], r["coste"]])
        
        # Harvests sheet
        ws3 = wb.create_sheet("Cosechas")
        headers3 = ["Fecha", "Cantidad (kg)", "Precio (€/kg)", "Ingreso (€)", "Calidad"]
        ws3.append(headers3)
        for col in range(1, len(headers3) + 1):
            cell = ws3.cell(1, col)
            cell.fill = PatternFill(start_color="2C5F2D", end_color="2C5F2D", fill_type="solid")
            cell.font = Font(bold=True, color="FFFFFF")
            ws3.column_dimensions[get_column_letter(col)].width = 15
        for c in cosechas:
            ws3.append([c["fecha"], c["cantidad"], c["precio"], c["cantidad"] * c["precio"], c["calidad"]])
        
        # Save to bytes
        excel_bytes = BytesIO()
        wb.save(excel_bytes)
        excel_bytes.seek(0)
        
        return StreamingResponse(
            excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=datos_agricolas.xlsx"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
