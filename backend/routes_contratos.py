"""
Routes for Contratos (Contracts) - CRUD operations
Extracted from routes_main.py for better code organization
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from bson import ObjectId
from datetime import datetime

from models import ContratoCreate
from database import contratos_collection, serialize_doc, serialize_docs, db
from rbac_guards import (
    RequireCreate, RequireEdit, RequireDelete,
    RequireContratosAccess, get_current_user
)
from services.audit_service import create_audit_log, calculate_changes

router = APIRouter(prefix="/api", tags=["contratos"])

# Collections for lookups
proveedores_collection = db['proveedores']
clientes_collection = db['clientes']
cultivos_collection = db['cultivos']


@router.post("/contratos", response_model=dict)
async def create_contrato(
    contrato: ContratoCreate,
    current_user: dict = Depends(RequireCreate),
    _access: dict = Depends(RequireContratosAccess)
):
    # Get next number
    last_contrato = await contratos_collection.find_one(sort=[("numero", -1)])
    next_numero = (last_contrato.get("numero", 0) if last_contrato else 0) + 1
    
    # Lookup proveedor name (para contratos de Compra)
    proveedor_name = contrato.proveedor or ""
    if contrato.proveedor_id:
        prov = await proveedores_collection.find_one({"_id": ObjectId(contrato.proveedor_id)})
        if prov:
            proveedor_name = prov.get("nombre", "")
    
    # Lookup cliente name (para contratos de Venta)
    cliente_name = ""
    cliente_id_str = getattr(contrato, 'cliente_id', None) or ""
    if cliente_id_str:
        cli = await clientes_collection.find_one({"_id": ObjectId(cliente_id_str)})
        if cli:
            cliente_name = cli.get("nombre", "")
    
    # Lookup cultivo name
    cultivo_name = contrato.cultivo or ""
    cultivo_id_str = contrato.cultivo_id or ""
    if contrato.cultivo_id:
        cult = await cultivos_collection.find_one({"_id": ObjectId(contrato.cultivo_id)})
        if cult:
            cultivo_name = cult.get("nombre", "")
    
    contrato_dict = contrato.dict()
    contrato_dict.update({
        "serie": "MP",
        "año": datetime.now().year,
        "numero": next_numero,
        "proveedor": proveedor_name,
        "cliente": cliente_name,
        "cliente_id": cliente_id_str,
        "cultivo": cultivo_name,
        "cultivo_id": cultivo_id_str,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    })
    
    result = await contratos_collection.insert_one(contrato_dict)
    created = await contratos_collection.find_one({"_id": result.inserted_id})
    
    # Registrar en auditoría
    await create_audit_log(
        collection_name="contratos",
        document_id=str(result.inserted_id),
        action="create",
        user_email=current_user.get("email", "unknown"),
        user_name=current_user.get("full_name", current_user.get("username", "Usuario")),
        new_data=serialize_doc(created.copy())
    )
    
    return {"success": True, "data": serialize_doc(created)}


@router.get("/contratos")
async def get_contratos(
    skip: int = 0,
    limit: int = 100,
    campana: Optional[str] = None,
    proveedor: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireContratosAccess)
):
    query = {}
    if campana:
        query["campana"] = campana
    if proveedor:
        query["proveedor"] = {"$regex": proveedor, "$options": "i"}
    
    contratos = await contratos_collection.find(query).skip(skip).limit(limit).to_list(limit)
    return {"contratos": serialize_docs(contratos), "total": await contratos_collection.count_documents(query)}


@router.get("/contratos/{contrato_id}")
async def get_contrato(
    contrato_id: str,
    current_user: dict = Depends(get_current_user),
    _access: dict = Depends(RequireContratosAccess)
):
    if not ObjectId.is_valid(contrato_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    contrato = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    return serialize_doc(contrato)


@router.put("/contratos/{contrato_id}")
async def update_contrato(
    contrato_id: str,
    contrato: ContratoCreate,
    current_user: dict = Depends(RequireEdit),
    _access: dict = Depends(RequireContratosAccess)
):
    if not ObjectId.is_valid(contrato_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Obtener documento anterior para auditoría
    old_doc = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    if not old_doc:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    # Lookup proveedor name (para contratos de Compra)
    proveedor_name = contrato.proveedor or ""
    if contrato.proveedor_id:
        prov = await proveedores_collection.find_one({"_id": ObjectId(contrato.proveedor_id)})
        if prov:
            proveedor_name = prov.get("nombre", "")
    
    # Lookup cliente name (para contratos de Venta)
    cliente_name = ""
    cliente_id_str = getattr(contrato, 'cliente_id', None) or ""
    if cliente_id_str:
        cli = await clientes_collection.find_one({"_id": ObjectId(cliente_id_str)})
        if cli:
            cliente_name = cli.get("nombre", "")
    
    # Lookup cultivo name
    cultivo_name = contrato.cultivo or ""
    if contrato.cultivo_id:
        cult = await cultivos_collection.find_one({"_id": ObjectId(contrato.cultivo_id)})
        if cult:
            cultivo_name = cult.get("nombre", "")
    
    update_data = contrato.dict()
    update_data.update({
        "proveedor": proveedor_name,
        "cliente": cliente_name,
        "cliente_id": cliente_id_str,
        "cultivo": cultivo_name,
        "updated_at": datetime.now()
    })
    
    result = await contratos_collection.update_one(
        {"_id": ObjectId(contrato_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    updated = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    
    # Calcular cambios y registrar en auditoría
    changes = calculate_changes(serialize_doc(old_doc.copy()), serialize_doc(updated.copy()))
    if changes:  # Solo registrar si hay cambios reales
        await create_audit_log(
            collection_name="contratos",
            document_id=contrato_id,
            action="update",
            user_email=current_user.get("email", "unknown"),
            user_name=current_user.get("full_name", current_user.get("username", "Usuario")),
            changes=changes
        )
    
    return {"success": True, "data": serialize_doc(updated)}


@router.delete("/contratos/{contrato_id}")
async def delete_contrato(
    contrato_id: str,
    current_user: dict = Depends(RequireDelete),
    _access: dict = Depends(RequireContratosAccess)
):
    if not ObjectId.is_valid(contrato_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Obtener documento antes de eliminar para auditoría
    old_doc = await contratos_collection.find_one({"_id": ObjectId(contrato_id)})
    if not old_doc:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    result = await contratos_collection.delete_one({"_id": ObjectId(contrato_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contrato not found")
    
    # Registrar eliminación en auditoría
    await create_audit_log(
        collection_name="contratos",
        document_id=contrato_id,
        action="delete",
        user_email=current_user.get("email", "unknown"),
        user_name=current_user.get("full_name", current_user.get("username", "Usuario")),
        previous_data=serialize_doc(old_doc.copy())
    )
    
    return {"success": True, "message": "Contrato deleted"}



@router.post("/contratos/regenerar-numeros")
async def regenerar_numeros_contratos(
    current_user: dict = Depends(RequireEdit)
):
    """
    Regenera el campo numero_contrato para todos los contratos existentes
    basándose en serie, año y numero.
    Formato: MP-{año}-{numero_6_digitos}
    """
    # Solo admin puede ejecutar esta operación
    if current_user.get('role') != 'Admin':
        raise HTTPException(status_code=403, detail="Solo administradores pueden regenerar números")
    
    # Obtener todos los contratos
    contratos = await contratos_collection.find({}).to_list(10000)
    
    actualizados = 0
    errores = []
    
    for contrato in contratos:
        try:
            serie = contrato.get("serie", "MP")
            año = contrato.get("año", datetime.now().year)
            numero = contrato.get("numero", 0)
            
            # Generar numero_contrato formateado
            numero_contrato = f"{serie}-{año}-{str(numero).zfill(6)}"
            
            # Actualizar el documento
            await contratos_collection.update_one(
                {"_id": contrato["_id"]},
                {"$set": {"numero_contrato": numero_contrato}}
            )
            actualizados += 1
        except Exception as e:
            errores.append({
                "id": str(contrato.get("_id")),
                "error": str(e)
            })
    
    return {
        "success": True,
        "message": f"Regenerados {actualizados} números de contrato",
        "actualizados": actualizados,
        "errores": errores,
        "total_contratos": len(contratos)
    }



# ============================================================================
# EXPORT FUNCTIONS - PDF & EXCEL
# ============================================================================

from utils.formatters import format_number_es  # noqa: E402


@router.get("/contratos/export/pdf")
async def export_contratos_pdf(
    proveedor: Optional[str] = None,
    cultivo: Optional[str] = None,
    campana: Optional[str] = None,
    tipo: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Exporta el listado de contratos filtrado a PDF"""
    from weasyprint import HTML
    from fastapi.responses import Response
    
    # Build query
    query = {}
    if proveedor:
        query["proveedor"] = proveedor
    if cultivo:
        query["cultivo"] = cultivo
    if campana:
        query["campana"] = campana
    if tipo:
        query["tipo"] = tipo
    if fecha_desde or fecha_hasta:
        date_filter = {}
        if fecha_desde:
            date_filter["$gte"] = fecha_desde
        if fecha_hasta:
            date_filter["$lte"] = fecha_hasta
        query["fecha_contrato"] = date_filter
    
    # Get contracts
    contratos = await contratos_collection.find(query).sort("fecha_contrato", -1).to_list(1000)
    
    # Calculate totals - usando los campos correctos
    total_cantidad = sum(c.get("cantidad", 0) or 0 for c in contratos)
    total_importe = sum((c.get("cantidad", 0) or 0) * (c.get("precio", 0) or 0) for c in contratos)
    
    # Build filter description
    filtros_texto = []
    if proveedor:
        filtros_texto.append(f"Proveedor: {proveedor}")
    if cultivo:
        filtros_texto.append(f"Cultivo: {cultivo}")
    if campana:
        filtros_texto.append(f"Campaña: {campana}")
    if tipo:
        filtros_texto.append(f"Tipo: {tipo}")
    if fecha_desde:
        filtros_texto.append(f"Desde: {fecha_desde}")
    if fecha_hasta:
        filtros_texto.append(f"Hasta: {fecha_hasta}")
    
    # Generate HTML
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; font-size: 10pt; margin: 20px; }}
            h1 {{ color: #2563eb; font-size: 18pt; margin-bottom: 5px; }}
            .header {{ margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }}
            .filters {{ background: #f3f4f6; padding: 10px; border-radius: 5px; margin-bottom: 15px; font-size: 9pt; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
            th {{ background: #2563eb; color: white; padding: 8px 5px; text-align: left; font-size: 9pt; }}
            td {{ padding: 6px 5px; border-bottom: 1px solid #e5e7eb; font-size: 9pt; }}
            tr:nth-child(even) {{ background: #f9fafb; }}
            .tipo-compra {{ background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 3px; font-size: 8pt; }}
            .tipo-venta {{ background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; font-size: 8pt; }}
            .totals {{ margin-top: 20px; background: #eff6ff; padding: 15px; border-radius: 5px; }}
            .totals-grid {{ display: flex; justify-content: space-between; }}
            .total-item {{ text-align: center; }}
            .total-value {{ font-size: 14pt; font-weight: bold; color: #2563eb; }}
            .total-label {{ font-size: 9pt; color: #6b7280; }}
            .right {{ text-align: right; }}
            .date {{ font-size: 9pt; color: #6b7280; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>LISTADO DE CONTRATOS</h1>
            <div class="date">Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}</div>
        </div>
        
        {f'<div class="filters"><strong>Filtros aplicados:</strong> {" | ".join(filtros_texto)}</div>' if filtros_texto else ''}
        
        <table>
            <thead>
                <tr>
                    <th>Nº Contrato</th>
                    <th>Tipo</th>
                    <th>Campaña</th>
                    <th>Proveedor/Cliente</th>
                    <th>Cultivo</th>
                    <th class="right">Cantidad (kg)</th>
                    <th class="right">Precio (€/kg)</th>
                    <th class="right">Total (€)</th>
                    <th>Fecha</th>
                </tr>
            </thead>
            <tbody>
    """
    
    for c in contratos:
        cantidad = c.get("cantidad", 0) or 0
        precio = c.get("precio", 0) or 0
        total = cantidad * precio
        tipo_class = "tipo-compra" if c.get("tipo") == "Compra" else "tipo-venta"
        proveedor_cliente = c.get("proveedor") or c.get("cliente") or "-"
        
        html_content += f"""
            <tr>
                <td><strong>{c.get('numero_contrato', '-')}</strong></td>
                <td><span class="{tipo_class}">{c.get('tipo', '-')}</span></td>
                <td>{c.get('campana', '-')}</td>
                <td>{proveedor_cliente}</td>
                <td>{c.get('cultivo', '-')}</td>
                <td class="right">{format_number_es(cantidad, 0)}</td>
                <td class="right">{format_number_es(precio, 2)}</td>
                <td class="right"><strong>{format_number_es(total, 2)}</strong></td>
                <td>{c.get('fecha_contrato', '-')}</td>
            </tr>
        """
    
    html_content += f"""
            </tbody>
        </table>
        
        <div class="totals">
            <div class="totals-grid">
                <div class="total-item">
                    <div class="total-value">{len(contratos)}</div>
                    <div class="total-label">Contratos</div>
                </div>
                <div class="total-item">
                    <div class="total-value">{format_number_es(total_cantidad, 0)} kg</div>
                    <div class="total-label">Cantidad Total</div>
                </div>
                <div class="total-item">
                    <div class="total-value">{format_number_es(total_importe, 2)} €</div>
                    <div class="total-label">Importe Total</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Generate PDF
    pdf = HTML(string=html_content).write_pdf()
    
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=contratos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"}
    )


@router.get("/contratos/export/excel")
async def export_contratos_excel(
    proveedor: Optional[str] = None,
    cultivo: Optional[str] = None,
    campana: Optional[str] = None,
    tipo: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Exporta el listado de contratos filtrado a Excel"""
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
    from openpyxl.utils import get_column_letter
    from io import BytesIO
    from fastapi.responses import Response
    
    # Build query
    query = {}
    if proveedor:
        query["proveedor"] = proveedor
    if cultivo:
        query["cultivo"] = cultivo
    if campana:
        query["campana"] = campana
    if tipo:
        query["tipo"] = tipo
    if fecha_desde or fecha_hasta:
        date_filter = {}
        if fecha_desde:
            date_filter["$gte"] = fecha_desde
        if fecha_hasta:
            date_filter["$lte"] = fecha_hasta
        query["fecha_contrato"] = date_filter
    
    # Get contracts
    contratos = await contratos_collection.find(query).sort("fecha_contrato", -1).to_list(1000)
    
    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Contratos"
    
    # Styles
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center")
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Headers
    headers = ["Nº Contrato", "Tipo", "Campaña", "Proveedor/Cliente", "Cultivo", "Cantidad (kg)", "Precio (€/kg)", "Total (€)", "Fecha"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = border
    
    # Data rows
    for row, c in enumerate(contratos, 2):
        cantidad = c.get("cantidad", 0) or 0
        precio = c.get("precio", 0) or 0
        total = cantidad * precio
        proveedor_cliente = c.get("proveedor") or c.get("cliente") or ""
        
        ws.cell(row=row, column=1, value=c.get('numero_contrato', '')).border = border
        ws.cell(row=row, column=2, value=c.get('tipo', '')).border = border
        ws.cell(row=row, column=3, value=c.get('campana', '')).border = border
        ws.cell(row=row, column=4, value=proveedor_cliente).border = border
        ws.cell(row=row, column=5, value=c.get('cultivo', '')).border = border
        ws.cell(row=row, column=6, value=cantidad).border = border
        ws.cell(row=row, column=7, value=precio).border = border
        ws.cell(row=row, column=8, value=total).border = border
        ws.cell(row=row, column=9, value=c.get('fecha_contrato', '')).border = border
    
    # Totals row
    total_row = len(contratos) + 2
    total_cantidad = sum(c.get("cantidad", 0) or 0 for c in contratos)
    total_importe = sum((c.get("cantidad", 0) or 0) * (c.get("precio", 0) or 0) for c in contratos)
    
    ws.cell(row=total_row, column=5, value="TOTALES:").font = Font(bold=True)
    ws.cell(row=total_row, column=6, value=total_cantidad).font = Font(bold=True)
    ws.cell(row=total_row, column=8, value=total_importe).font = Font(bold=True)
    
    # Adjust column widths
    column_widths = [18, 10, 12, 25, 15, 15, 15, 15, 12]
    for i, width in enumerate(column_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = width
    
    # Save to bytes
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=contratos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"}
    )