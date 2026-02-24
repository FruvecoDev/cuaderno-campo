"""
Cuaderno de Campo Inteligente - Field Notebook Generation
Generates comprehensive PDF reports with all activities for a parcel/contract campaign
"""

import os
import json
from io import BytesIO
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from bson import ObjectId
from weasyprint import HTML, CSS

from emergentintegrations.llm.chat import LlmChat, UserMessage

from database import (
    parcelas_collection, contratos_collection, tratamientos_collection,
    irrigaciones_collection, visitas_collection, cosechas_collection,
    fincas_collection, evaluaciones_collection,
    serialize_doc, serialize_docs
)
from routes_auth import get_current_user

router = APIRouter(tags=["cuaderno-campo"])

# Get API Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')


class CuadernoCampoRequest(BaseModel):
    """Request model for field notebook generation"""
    parcela_id: Optional[str] = None
    contrato_id: Optional[str] = None
    campana: Optional[str] = None
    include_ai_summary: bool = True


async def gather_parcela_data(parcela_id: str, campana: Optional[str] = None) -> dict:
    """Gather all data related to a parcel"""
    parcela = await parcelas_collection.find_one({"_id": ObjectId(parcela_id)})
    if not parcela:
        raise HTTPException(status_code=404, detail="Parcela no encontrada")
    
    # Get related finca
    finca = None
    if parcela.get("finca_id"):
        finca = await fincas_collection.find_one({"_id": ObjectId(parcela["finca_id"])})
    
    # Build query filters
    parcela_str = str(parcela["_id"])
    
    # Get visitas
    visitas_query = {"parcela_id": parcela_str}
    if campana:
        visitas_query["campana"] = campana
    visitas = await visitas_collection.find(visitas_query).sort("fecha", 1).to_list(500)
    
    # Get tratamientos
    tratamientos_query = {"parcelas_ids": parcela_str}
    if campana:
        tratamientos_query["campana"] = campana
    tratamientos = await tratamientos_collection.find(tratamientos_query).sort("fecha_aplicacion", 1).to_list(500)
    
    # Get irrigaciones
    irrigaciones_query = {"parcela_id": parcela_str}
    if campana:
        irrigaciones_query["campana"] = campana
    irrigaciones = await irrigaciones_collection.find(irrigaciones_query).sort("fecha", 1).to_list(500)
    
    # Get cosechas
    cosechas_query = {"parcelas_ids": parcela_str}
    cosechas = await cosechas_collection.find(cosechas_query).sort("fecha", 1).to_list(100)
    
    # Get evaluaciones
    evaluaciones_query = {"parcela_id": parcela_str}
    evaluaciones = await evaluaciones_collection.find(evaluaciones_query).sort("fecha_inicio", 1).to_list(100)
    
    # Get contrato if exists
    contrato = None
    if parcela.get("contrato_id"):
        contrato = await contratos_collection.find_one({"_id": ObjectId(parcela["contrato_id"])})
    
    return {
        "parcela": serialize_doc(parcela),
        "finca": serialize_doc(finca) if finca else None,
        "contrato": serialize_doc(contrato) if contrato else None,
        "visitas": serialize_docs(visitas),
        "tratamientos": serialize_docs(tratamientos),
        "irrigaciones": serialize_docs(irrigaciones),
        "cosechas": serialize_docs(cosechas),
        "evaluaciones": serialize_docs(evaluaciones),
        "campana": campana or parcela.get("campana", "N/A")
    }


async def gather_contrato_data(contrato_id: str) -> dict:
    """Gather all data related to a contract and its parcels"""
    contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato no encontrado")
    
    campana = contrato.get("campana")
    
    # Get all parcelas for this contract
    parcelas_ids = contrato.get("parcelas_ids", [])
    parcelas_data = []
    
    all_visitas = []
    all_tratamientos = []
    all_irrigaciones = []
    all_cosechas = []
    all_evaluaciones = []
    
    for pid in parcelas_ids:
        try:
            parcela = await parcelas_collection.find_one({"_id": ObjectId(pid)})
            if parcela:
                parcelas_data.append(serialize_doc(parcela))
                
                # Gather data for each parcel
                visitas = await visitas_collection.find({
                    "parcela_id": pid,
                    "campana": campana
                }).to_list(100)
                all_visitas.extend(serialize_docs(visitas))
                
                tratamientos = await tratamientos_collection.find({
                    "parcelas_ids": pid,
                    "campana": campana
                }).to_list(100)
                all_tratamientos.extend(serialize_docs(tratamientos))
                
                irrigaciones = await irrigaciones_collection.find({
                    "parcela_id": pid,
                    "campana": campana
                }).to_list(100)
                all_irrigaciones.extend(serialize_docs(irrigaciones))
                
                cosechas = await cosechas_collection.find({
                    "parcelas_ids": pid
                }).to_list(50)
                all_cosechas.extend(serialize_docs(cosechas))
                
                evaluaciones = await evaluaciones_collection.find({
                    "parcela_id": pid
                }).to_list(50)
                all_evaluaciones.extend(serialize_docs(evaluaciones))
        except Exception:
            continue
    
    # Remove duplicates (same treatment can be in multiple parcels)
    seen_tratamientos = set()
    unique_tratamientos = []
    for t in all_tratamientos:
        if t.get("_id") not in seen_tratamientos:
            seen_tratamientos.add(t.get("_id"))
            unique_tratamientos.append(t)
    
    return {
        "contrato": serialize_doc(contrato),
        "parcelas": parcelas_data,
        "visitas": all_visitas,
        "tratamientos": unique_tratamientos,
        "irrigaciones": all_irrigaciones,
        "cosechas": all_cosechas,
        "evaluaciones": all_evaluaciones,
        "campana": campana
    }


async def generate_ai_summary(data: dict) -> str:
    """Generate AI-powered summary of the field notebook"""
    if not EMERGENT_LLM_KEY:
        return "<p><em>Resumen IA no disponible - API key no configurada</em></p>"
    
    try:
        # Prepare summary data
        parcela = data.get("parcela") or (data.get("parcelas", [{}])[0] if data.get("parcelas") else {})
        contrato = data.get("contrato", {})
        
        summary_data = {
            "cultivo": parcela.get("cultivo", "N/A"),
            "variedad": parcela.get("variedad", "N/A"),
            "superficie": parcela.get("superficie_total", 0),
            "campana": data.get("campana", "N/A"),
            "num_visitas": len(data.get("visitas", [])),
            "num_tratamientos": len(data.get("tratamientos", [])),
            "num_irrigaciones": len(data.get("irrigaciones", [])),
            "num_cosechas": len(data.get("cosechas", [])),
            "produccion_total": sum(c.get("cantidad", 0) for c in data.get("cosechas", [])),
        }
        
        # Calculate treatment costs
        total_coste_tratamientos = sum(
            float(t.get("coste_total", 0) or 0) 
            for t in data.get("tratamientos", [])
        )
        summary_data["coste_tratamientos"] = total_coste_tratamientos
        
        # Get irrigation volume
        total_agua = sum(
            float(i.get("cantidad", 0) or 0) 
            for i in data.get("irrigaciones", [])
        )
        summary_data["total_agua_m3"] = total_agua
        
        # Get issues from visits
        incidencias = [
            v.get("observaciones", "") 
            for v in data.get("visitas", []) 
            if v.get("tipo") == "incidencia" or "problema" in v.get("observaciones", "").lower()
        ]
        summary_data["incidencias"] = incidencias[:5]  # Top 5
        
        prompt = f"""Eres un agrónomo experto. Genera un RESUMEN EJECUTIVO del cuaderno de campo con los siguientes datos:

DATOS DEL CULTIVO:
- Cultivo: {summary_data['cultivo']}
- Variedad: {summary_data['variedad']}
- Superficie: {summary_data['superficie']} ha
- Campaña: {summary_data['campana']}

ACTIVIDADES REGISTRADAS:
- Visitas realizadas: {summary_data['num_visitas']}
- Tratamientos aplicados: {summary_data['num_tratamientos']}
- Riegos registrados: {summary_data['num_irrigaciones']}
- Cosechas: {summary_data['num_cosechas']}

MÉTRICAS:
- Producción total: {summary_data['produccion_total']} kg
- Coste tratamientos: {summary_data['coste_tratamientos']:.2f} €
- Agua utilizada: {summary_data['total_agua_m3']:.2f} m³

INCIDENCIAS DESTACADAS:
{json.dumps(summary_data['incidencias'], ensure_ascii=False)}

GENERA UN RESUMEN EN HTML (sin etiquetas html/body, solo el contenido) que incluya:
1. Valoración general de la campaña (2-3 líneas)
2. Puntos fuertes observados
3. Áreas de mejora
4. Recomendaciones para la próxima campaña

Usa etiquetas <h4>, <p>, <ul>, <li> para estructurar. Sé conciso y directo."""

        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            model="gpt-4o-mini"
        )
        
        response = await chat.send_async(
            messages=[UserMessage(content=prompt)],
            max_tokens=1000
        )
        
        return response.content if response else "<p>Error generando resumen</p>"
        
    except Exception as e:
        return f"<p><em>Error generando resumen IA: {str(e)}</em></p>"


def generate_html_cuaderno(data: dict, ai_summary: str = "") -> str:
    """Generate HTML content for the field notebook"""
    parcela = data.get("parcela") or (data.get("parcelas", [{}])[0] if data.get("parcelas") else {})
    contrato = data.get("contrato", {})
    finca = data.get("finca", {})
    campana = data.get("campana", "N/A")
    
    # Format dates helper
    def format_date(date_str):
        if not date_str:
            return "N/A"
        if isinstance(date_str, str):
            try:
                return datetime.fromisoformat(date_str.replace("Z", "+00:00")).strftime("%d/%m/%Y")
            except Exception:
                return date_str[:10] if len(date_str) >= 10 else date_str
        return str(date_str)
    
    # Start HTML
    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Cuaderno de Campo - {parcela.get('codigo_plantacion', 'N/A')}</title>
        <style>
            @page {{
                size: A4;
                margin: 1.5cm;
            }}
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 10pt;
                line-height: 1.4;
                color: #333;
            }}
            .header {{
                text-align: center;
                border-bottom: 3px solid #2e7d32;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }}
            .header h1 {{
                color: #2e7d32;
                margin: 0;
                font-size: 24pt;
            }}
            .header .subtitle {{
                color: #666;
                font-size: 12pt;
                margin-top: 5px;
            }}
            .section {{
                margin-bottom: 20px;
                page-break-inside: avoid;
            }}
            .section-title {{
                background: #2e7d32;
                color: white;
                padding: 8px 15px;
                font-size: 12pt;
                font-weight: bold;
                margin-bottom: 10px;
                border-radius: 4px;
            }}
            .info-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 15px;
            }}
            .info-box {{
                background: #f5f5f5;
                padding: 10px;
                border-radius: 4px;
                border-left: 4px solid #2e7d32;
            }}
            .info-box label {{
                font-weight: bold;
                color: #666;
                font-size: 9pt;
                display: block;
                margin-bottom: 3px;
            }}
            .info-box .value {{
                font-size: 11pt;
                color: #333;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 9pt;
            }}
            th {{
                background: #e8f5e9;
                color: #2e7d32;
                padding: 8px;
                text-align: left;
                border-bottom: 2px solid #2e7d32;
            }}
            td {{
                padding: 6px 8px;
                border-bottom: 1px solid #ddd;
            }}
            tr:nth-child(even) {{
                background: #f9f9f9;
            }}
            .summary-box {{
                background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border: 1px solid #a5d6a7;
            }}
            .summary-box h3 {{
                color: #2e7d32;
                margin-top: 0;
            }}
            .stats-row {{
                display: flex;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 10px;
                margin-bottom: 15px;
            }}
            .stat-card {{
                background: white;
                padding: 12px;
                border-radius: 6px;
                text-align: center;
                flex: 1;
                min-width: 100px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .stat-card .number {{
                font-size: 20pt;
                font-weight: bold;
                color: #2e7d32;
            }}
            .stat-card .label {{
                font-size: 8pt;
                color: #666;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #ddd;
                font-size: 8pt;
                color: #999;
                text-align: center;
            }}
            .ai-summary {{
                background: #fff3e0;
                border: 1px solid #ffb74d;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
            }}
            .ai-summary h3 {{
                color: #e65100;
                margin-top: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }}
            .ai-badge {{
                background: #e65100;
                color: white;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 8pt;
            }}
            .no-data {{
                color: #999;
                font-style: italic;
                padding: 20px;
                text-align: center;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>CUADERNO DE CAMPO</h1>
            <div class="subtitle">Campaña {campana} | {parcela.get('cultivo', 'N/A')} - {parcela.get('variedad', 'N/A')}</div>
            <div class="subtitle">Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}</div>
        </div>
    """
    
    # Statistics Summary
    num_visitas = len(data.get("visitas", []))
    num_tratamientos = len(data.get("tratamientos", []))
    num_irrigaciones = len(data.get("irrigaciones", []))
    num_cosechas = len(data.get("cosechas", []))
    produccion_total = sum(c.get("cantidad", 0) or 0 for c in data.get("cosechas", []))
    
    html += f"""
        <div class="stats-row">
            <div class="stat-card">
                <div class="number">{num_visitas}</div>
                <div class="label">Visitas</div>
            </div>
            <div class="stat-card">
                <div class="number">{num_tratamientos}</div>
                <div class="label">Tratamientos</div>
            </div>
            <div class="stat-card">
                <div class="number">{num_irrigaciones}</div>
                <div class="label">Riegos</div>
            </div>
            <div class="stat-card">
                <div class="number">{num_cosechas}</div>
                <div class="label">Cosechas</div>
            </div>
            <div class="stat-card">
                <div class="number">{produccion_total:,.0f}</div>
                <div class="label">Kg Producidos</div>
            </div>
        </div>
    """
    
    # AI Summary Section
    if ai_summary:
        html += f"""
        <div class="ai-summary">
            <h3><span class="ai-badge">IA</span> Resumen Inteligente</h3>
            {ai_summary}
        </div>
        """
    
    # Parcel/Contract Info
    html += """
        <div class="section">
            <div class="section-title">📋 Información General</div>
            <div class="info-grid">
    """
    
    if contrato:
        html += f"""
                <div class="info-box">
                    <label>Contrato</label>
                    <div class="value">{contrato.get('nombre', 'N/A')}</div>
                </div>
        """
    
    html += f"""
                <div class="info-box">
                    <label>Código Plantación</label>
                    <div class="value">{parcela.get('codigo_plantacion', 'N/A')}</div>
                </div>
                <div class="info-box">
                    <label>Proveedor</label>
                    <div class="value">{parcela.get('proveedor', 'N/A')}</div>
                </div>
                <div class="info-box">
                    <label>Finca</label>
                    <div class="value">{finca.get('nombre', parcela.get('finca', 'N/A')) if finca else parcela.get('finca', 'N/A')}</div>
                </div>
                <div class="info-box">
                    <label>Cultivo / Variedad</label>
                    <div class="value">{parcela.get('cultivo', 'N/A')} / {parcela.get('variedad', 'N/A')}</div>
                </div>
                <div class="info-box">
                    <label>Superficie Total</label>
                    <div class="value">{parcela.get('superficie_total', 0)} ha</div>
                </div>
                <div class="info-box">
                    <label>Municipio / Provincia</label>
                    <div class="value">{parcela.get('municipio', 'N/A')} / {parcela.get('provincia', 'N/A')}</div>
                </div>
                <div class="info-box">
                    <label>Campaña</label>
                    <div class="value">{campana}</div>
                </div>
            </div>
        </div>
    """
    
    # Visitas Section
    visitas = data.get("visitas", [])
    html += """
        <div class="section">
            <div class="section-title">📅 Registro de Visitas</div>
    """
    if visitas:
        html += """
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Técnico</th>
                        <th>Observaciones</th>
                    </tr>
                </thead>
                <tbody>
        """
        for v in visitas:
            html += f"""
                    <tr>
                        <td>{format_date(v.get('fecha'))}</td>
                        <td>{v.get('tipo', 'N/A')}</td>
                        <td>{v.get('tecnico', 'N/A')}</td>
                        <td>{v.get('observaciones', '')[:100]}{'...' if len(v.get('observaciones', '')) > 100 else ''}</td>
                    </tr>
            """
        html += """
                </tbody>
            </table>
        """
    else:
        html += '<p class="no-data">No hay visitas registradas</p>'
    html += "</div>"
    
    # Tratamientos Section
    tratamientos = data.get("tratamientos", [])
    html += """
        <div class="section">
            <div class="section-title">💊 Tratamientos Fitosanitarios</div>
    """
    if tratamientos:
        html += """
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Producto</th>
                        <th>Dosis</th>
                        <th>Motivo</th>
                        <th>Aplicador</th>
                    </tr>
                </thead>
                <tbody>
        """
        for t in tratamientos:
            html += f"""
                    <tr>
                        <td>{format_date(t.get('fecha_aplicacion'))}</td>
                        <td>{t.get('producto', 'N/A')}</td>
                        <td>{t.get('dosis', 'N/A')} {t.get('unidad_dosis', '')}</td>
                        <td>{t.get('motivo', 'N/A')}</td>
                        <td>{t.get('aplicador', 'N/A')}</td>
                    </tr>
            """
        html += """
                </tbody>
            </table>
        """
    else:
        html += '<p class="no-data">No hay tratamientos registrados</p>'
    html += "</div>"
    
    # Irrigaciones Section
    irrigaciones = data.get("irrigaciones", [])
    html += """
        <div class="section">
            <div class="section-title">💧 Registro de Riegos</div>
    """
    if irrigaciones:
        html += """
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Sistema</th>
                        <th>Cantidad (m³)</th>
                        <th>Duración</th>
                        <th>Observaciones</th>
                    </tr>
                </thead>
                <tbody>
        """
        for i in irrigaciones:
            html += f"""
                    <tr>
                        <td>{format_date(i.get('fecha'))}</td>
                        <td>{i.get('sistema', 'N/A')}</td>
                        <td>{i.get('cantidad', 0)}</td>
                        <td>{i.get('duracion', 'N/A')} {i.get('unidad_duracion', 'min')}</td>
                        <td>{i.get('observaciones', '')[:80]}</td>
                    </tr>
            """
        html += """
                </tbody>
            </table>
        """
    else:
        html += '<p class="no-data">No hay riegos registrados</p>'
    html += "</div>"
    
    # Cosechas Section
    cosechas = data.get("cosechas", [])
    html += """
        <div class="section">
            <div class="section-title">🌾 Registro de Cosechas</div>
    """
    if cosechas:
        html += """
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Cantidad (kg)</th>
                        <th>Calidad</th>
                        <th>Destino</th>
                        <th>Observaciones</th>
                    </tr>
                </thead>
                <tbody>
        """
        for c in cosechas:
            html += f"""
                    <tr>
                        <td>{format_date(c.get('fecha'))}</td>
                        <td>{c.get('cantidad', 0):,.0f}</td>
                        <td>{c.get('calidad', 'N/A')}</td>
                        <td>{c.get('destino', 'N/A')}</td>
                        <td>{c.get('observaciones', '')[:80]}</td>
                    </tr>
            """
        html += """
                </tbody>
            </table>
        """
    else:
        html += '<p class="no-data">No hay cosechas registradas</p>'
    html += "</div>"
    
    # Evaluaciones Section
    evaluaciones = data.get("evaluaciones", [])
    if evaluaciones:
        html += """
            <div class="section">
                <div class="section-title">📝 Evaluaciones</div>
                <table>
                    <thead>
                        <tr>
                            <th>Fecha Inicio</th>
                            <th>Fecha Fin</th>
                            <th>Técnico</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        for e in evaluaciones:
            html += f"""
                        <tr>
                            <td>{format_date(e.get('fecha_inicio'))}</td>
                            <td>{format_date(e.get('fecha_fin'))}</td>
                            <td>{e.get('tecnico', 'N/A')}</td>
                            <td>{e.get('estado', 'borrador')}</td>
                        </tr>
            """
        html += """
                    </tbody>
                </table>
            </div>
        """
    
    # Footer
    html += f"""
        <div class="footer">
            <p>Cuaderno de Campo generado automáticamente por FRUVECO - Sistema de Gestión Agrícola</p>
            <p>Este documento certifica las actividades registradas durante la campaña {campana}</p>
        </div>
    </body>
    </html>
    """
    
    return html


@router.post("/api/cuaderno-campo/generar")
async def generar_cuaderno_campo(
    request: CuadernoCampoRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a comprehensive Field Notebook PDF for a parcel or contract
    """
    try:
        # Gather data based on request type
        if request.contrato_id:
            if not ObjectId.is_valid(request.contrato_id):
                raise HTTPException(status_code=400, detail="ID de contrato inválido")
            data = await gather_contrato_data(request.contrato_id)
        elif request.parcela_id:
            if not ObjectId.is_valid(request.parcela_id):
                raise HTTPException(status_code=400, detail="ID de parcela inválido")
            data = await gather_parcela_data(request.parcela_id, request.campana)
        else:
            raise HTTPException(status_code=400, detail="Debe especificar parcela_id o contrato_id")
        
        # Generate AI summary if requested
        ai_summary = ""
        if request.include_ai_summary:
            ai_summary = await generate_ai_summary(data)
        
        # Generate HTML
        html_content = generate_html_cuaderno(data, ai_summary)
        
        # Generate PDF
        pdf_buffer = BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        
        # Generate filename
        parcela = data.get("parcela") or (data.get("parcelas", [{}])[0] if data.get("parcelas") else {})
        campana = data.get("campana", "N/A")
        codigo = parcela.get("codigo_plantacion", "parcela").replace(" ", "_")
        filename = f"Cuaderno_Campo_{codigo}_{campana}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "application/pdf"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando cuaderno de campo: {str(e)}")


@router.get("/api/cuaderno-campo/preview/{parcela_id}")
async def preview_cuaderno_campo(
    parcela_id: str,
    campana: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get preview data for a field notebook (without generating PDF)
    """
    try:
        if not ObjectId.is_valid(parcela_id):
            raise HTTPException(status_code=400, detail="ID de parcela inválido")
        
        data = await gather_parcela_data(parcela_id, campana)
        
        # Return summary data
        return {
            "success": True,
            "preview": {
                "parcela": data.get("parcela", {}),
                "campana": data.get("campana"),
                "estadisticas": {
                    "visitas": len(data.get("visitas", [])),
                    "tratamientos": len(data.get("tratamientos", [])),
                    "irrigaciones": len(data.get("irrigaciones", [])),
                    "cosechas": len(data.get("cosechas", [])),
                    "evaluaciones": len(data.get("evaluaciones", [])),
                    "produccion_total": sum(c.get("cantidad", 0) or 0 for c in data.get("cosechas", []))
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo preview: {str(e)}")
