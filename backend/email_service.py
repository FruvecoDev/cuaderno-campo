"""
Email Service for FRUVECO - Cuaderno de Campo
Handles email notifications for visits, treatments, and other farm activities.
Uses Resend API for email delivery.
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional
import resend
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Configuration
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
APP_NAME = "FRUVECO - Cuaderno de Campo"

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


def get_email_template(title: str, content: str, footer_text: str = "") -> str:
    """Generate a styled HTML email template"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #2d5a27 0%, #4CAF50 100%); padding: 30px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">{APP_NAME}</h1>
                            </td>
                        </tr>
                        
                        <!-- Title -->
                        <tr>
                            <td style="padding: 30px 30px 10px 30px;">
                                <h2 style="color: #2d5a27; margin: 0; font-size: 20px;">{title}</h2>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 10px 30px 30px 30px; color: #333333; font-size: 14px; line-height: 1.6;">
                                {content}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                                <p style="color: #6c757d; font-size: 12px; margin: 0;">
                                    {footer_text if footer_text else f'Este mensaje fue enviado automáticamente por {APP_NAME}'}
                                </p>
                                <p style="color: #6c757d; font-size: 11px; margin: 10px 0 0 0;">
                                    © {datetime.now().year} FRUVECO Frozen Foods
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


async def send_email(
    recipient_email: str,
    subject: str,
    html_content: str
) -> dict:
    """Send an email using Resend API (async, non-blocking)"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured. Email not sent.")
        return {"status": "skipped", "message": "Email service not configured"}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent successfully to {recipient_email}")
        return {
            "status": "success",
            "message": f"Email sent to {recipient_email}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
        return {"status": "error", "message": str(e)}


async def send_visit_reminder(
    recipient_email: str,
    visita: dict,
    dias_restantes: int
) -> dict:
    """Send a reminder email for an upcoming visit"""
    
    fecha_visita = visita.get("fecha_planificada", "")
    if fecha_visita:
        try:
            fecha_obj = datetime.fromisoformat(fecha_visita.replace('Z', '+00:00'))
            fecha_formateada = fecha_obj.strftime("%d de %B de %Y")
        except:
            fecha_formateada = fecha_visita
    else:
        fecha_formateada = "Fecha no especificada"
    
    urgencia = ""
    if dias_restantes == 0:
        urgencia = "⚠️ <strong style='color: #dc2626;'>¡HOY!</strong>"
        subject = f"🔴 URGENTE: Visita programada para HOY - {visita.get('objetivo', 'Visita')}"
    elif dias_restantes == 1:
        urgencia = "⏰ <strong style='color: #f57c00;'>MAÑANA</strong>"
        subject = f"🟠 Recordatorio: Visita programada para MAÑANA - {visita.get('objetivo', 'Visita')}"
    elif dias_restantes <= 3:
        urgencia = f"📅 En {dias_restantes} días"
        subject = f"📅 Recordatorio: Visita próxima - {visita.get('objetivo', 'Visita')}"
    else:
        urgencia = f"📅 En {dias_restantes} días"
        subject = f"📅 Visita planificada - {visita.get('objetivo', 'Visita')}"
    
    content = f"""
    <p>Le recordamos que tiene una visita planificada:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
            <td style="padding: 12px; background-color: #e8f5e9; border-left: 4px solid #4CAF50; font-weight: bold;">
                {urgencia}
            </td>
        </tr>
    </table>
    
    <table style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Objetivo:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{visita.get('objetivo', '-')}</td>
        </tr>
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Fecha:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{fecha_formateada}</td>
        </tr>
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Proveedor:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{visita.get('proveedor', '-')}</td>
        </tr>
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Cultivo:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{visita.get('cultivo', '-')}</td>
        </tr>
        <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Parcela:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">{visita.get('codigo_plantacion', '-')}</td>
        </tr>
        <tr>
            <td style="padding: 10px 0;"><strong>Observaciones:</strong></td>
            <td style="padding: 10px 0;">{visita.get('observaciones', 'Sin observaciones')}</td>
        </tr>
    </table>
    
    <p style="margin-top: 20px;">
        <a href="#" style="display: inline-block; padding: 12px 24px; background-color: #2d5a27; color: #ffffff; text-decoration: none; border-radius: 6px;">
            Ver en la aplicación
        </a>
    </p>
    """
    
    html = get_email_template(
        title="Recordatorio de Visita",
        content=content,
        footer_text="Recuerde completar la visita y registrar sus observaciones en el sistema."
    )
    
    return await send_email(recipient_email, subject, html)


async def send_daily_visit_summary(
    recipient_email: str,
    visitas: List[dict],
    fecha: str
) -> dict:
    """Send a daily summary of all planned visits"""
    
    if not visitas:
        return {"status": "skipped", "message": "No visits to report"}
    
    visitas_html = ""
    for v in visitas:
        visitas_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{v.get('objetivo', '-')}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{v.get('proveedor', '-')}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{v.get('cultivo', '-')}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{v.get('codigo_plantacion', '-')}</td>
        </tr>
        """
    
    content = f"""
    <p>Resumen de visitas planificadas para <strong>{fecha}</strong>:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #2d5a27; color: white;">
            <th style="padding: 12px; text-align: left;">Objetivo</th>
            <th style="padding: 12px; text-align: left;">Proveedor</th>
            <th style="padding: 12px; text-align: left;">Cultivo</th>
            <th style="padding: 12px; text-align: left;">Parcela</th>
        </tr>
        {visitas_html}
    </table>
    
    <p><strong>Total de visitas:</strong> {len(visitas)}</p>
    """
    
    html = get_email_template(
        title=f"Resumen de Visitas - {fecha}",
        content=content
    )
    
    return await send_email(
        recipient_email,
        f"📋 Resumen de visitas para {fecha} ({len(visitas)} visitas)",
        html
    )


async def send_test_email(recipient_email: str) -> dict:
    """Send a test email to verify configuration"""
    
    content = """
    <p>¡Hola!</p>
    <p>Este es un correo de prueba para verificar que el servicio de notificaciones 
    por email está funcionando correctamente.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
            <td style="padding: 15px; background-color: #e8f5e9; border-radius: 6px; text-align: center;">
                ✅ La configuración de email está correcta
            </td>
        </tr>
    </table>
    
    <p>A partir de ahora recibirás notificaciones sobre:</p>
    <ul>
        <li>Visitas próximas programadas</li>
        <li>Resúmenes diarios de actividades</li>
        <li>Alertas importantes del cuaderno de campo</li>
    </ul>
    """
    
    html = get_email_template(
        title="Prueba de Notificaciones",
        content=content,
        footer_text="Este es un mensaje de prueba. Si no solicitaste esta prueba, ignora este correo."
    )
    
    return await send_email(
        recipient_email,
        "✅ Prueba de Notificaciones - FRUVECO",
        html
    )
