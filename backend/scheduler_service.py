"""
Background Scheduler Service
Handles periodic climate checks and notifications
Uses APScheduler for task scheduling
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
import asyncio

scheduler = AsyncIOScheduler()

# Flag to track if scheduler is initialized
_scheduler_initialized = False


async def scheduled_climate_check():
    """Wrapper function to run the scheduled climate check"""
    try:
        from routes_notificaciones import ejecutar_verificacion_clima_programada
        await ejecutar_verificacion_clima_programada()
    except Exception as e:
        print(f"[Scheduler Error] Climate check failed: {e}")


def run_async_task(coro):
    """Run an async coroutine from sync context"""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(coro)
        else:
            loop.run_until_complete(coro)
    except RuntimeError:
        # Create new event loop if none exists
        asyncio.run(coro)


def sync_climate_check():
    """Sync wrapper for the async climate check"""
    run_async_task(scheduled_climate_check())


def cleanup_pdf_map_tempfiles():
    """
    Elimina PNGs de mapas satelitales (Cuaderno de Campo PDF) con >1h de
    antigüedad en /app/uploads/evaluaciones/pdf_maps/. Estos archivos son
    temporales — se generan durante `generate_evaluacion_pdf` y se borran
    en el `finally` inmediato. Este job es solo red de seguridad para
    orfanatos cuando el PDF falla antes del cleanup inline.
    """
    import os
    import time

    map_dir = "/app/uploads/evaluaciones/pdf_maps"
    if not os.path.isdir(map_dir):
        return

    cutoff = time.time() - 3600  # 1 hora
    removed = 0
    for name in os.listdir(map_dir):
        if not name.startswith("map_") or not name.endswith(".png"):
            continue
        path = os.path.join(map_dir, name)
        try:
            if os.path.isfile(path) and os.path.getmtime(path) < cutoff:
                os.remove(path)
                removed += 1
        except Exception as e:
            print(f"[PDF Cleanup] failed for {path}: {e}")
    if removed:
        print(f"[PDF Cleanup] removed {removed} orphaned map tempfile(s) from {map_dir}")


# -----------------------------------------------------------------------------
# MAPA import reminder — lunes 09:00
# -----------------------------------------------------------------------------
# Comprueba semanalmente cuándo se hizo la última importación del registro MAPA.
# Si han pasado más de 7 días, crea una notificación interna para los Admin
# para que vuelvan a importar el listado oficial actualizado.
async def scheduled_mapa_import_reminder():
    """Aviso semanal a Admin si la última importación MAPA es > 7 días."""
    try:
        from database import db
        from routes_notificaciones import crear_notificacion_interna

        # Considerar tanto `imported_at` (importaciones) como `updated_at` (cualquier cambio)
        latest = await db.fitosanitarios.find_one(
            {"imported_at": {"$exists": True}},
            sort=[("imported_at", -1)],
        )
        last_import_at = latest.get("imported_at") if latest else None
        days_since = None
        if last_import_at:
            delta = datetime.utcnow() - last_import_at
            days_since = delta.days

        # Recolectar IDs de admins para destinatarios
        admin_ids = [
            str(u["_id"]) async for u in db.users.find(
                {"role": "Admin"}, {"_id": 1}
            )
        ]

        if last_import_at is None:
            titulo = "Importa el registro MAPA"
            mensaje = (
                "Aún no se ha realizado ninguna importación del registro oficial "
                "MAPA de productos fitosanitarios. Visita Fitosanitarios → MAPA "
                "para subir el listado actualizado."
            )
        elif days_since is not None and days_since >= 7:
            titulo = f"Registro MAPA pendiente de actualizar ({days_since} días)"
            mensaje = (
                f"La última importación del registro oficial MAPA fue hace {days_since} "
                "días. El MAPA actualiza su base de datos cada viernes a las 14:00. "
                "Recomendado: vuelve a importar el listado en Fitosanitarios → MAPA."
            )
        else:
            # Importación reciente — no avisar
            print(f"[Scheduler] MAPA import OK ({days_since} día(s) desde la última)")
            return

        await crear_notificacion_interna(
            titulo=titulo,
            mensaje=mensaje,
            tipo="warning",
            enlace="/fitosanitarios",
            destinatarios=admin_ids or None,
            prioridad="alta",
            datos_extra={"days_since_import": days_since, "kind": "mapa_import_reminder"},
        )
        print(f"[Scheduler] MAPA reminder sent to {len(admin_ids)} admin(s)")
    except Exception as e:
        print(f"[Scheduler Error] MAPA reminder failed: {e}")


def sync_mapa_import_reminder():
    """Sync wrapper for the async MAPA reminder."""
    run_async_task(scheduled_mapa_import_reminder())


async def update_scheduler_from_config():
    """Update scheduler jobs based on database configuration"""
    from database import db
    
    config_collection = db['config_scheduler']
    config = await config_collection.find_one({"tipo": "verificacion_clima"})
    
    # Remove existing climate check job if exists
    existing_job = scheduler.get_job('climate_check')
    if existing_job:
        scheduler.remove_job('climate_check')
    
    if not config or not config.get("activa", True):
        print("[Scheduler] Climate check disabled")
        return
    
    hora = config.get("hora_verificacion", "07:00")
    frecuencia = config.get("frecuencia", "diaria")
    
    try:
        hora_parts = hora.split(":")
        hora_int = int(hora_parts[0])
        minuto_int = int(hora_parts[1])
        
        if frecuencia == "diaria":
            trigger = CronTrigger(hour=hora_int, minute=minuto_int)
        elif frecuencia == "cada_12h":
            trigger = IntervalTrigger(hours=12)
        elif frecuencia == "cada_6h":
            trigger = IntervalTrigger(hours=6)
        else:
            trigger = CronTrigger(hour=hora_int, minute=minuto_int)
        
        scheduler.add_job(
            sync_climate_check,
            trigger=trigger,
            id='climate_check',
            name='Climate Check',
            replace_existing=True
        )
        
        print(f"[Scheduler] Climate check scheduled: {frecuencia} at {hora}")
        
    except Exception as e:
        print(f"[Scheduler Error] Failed to configure job: {e}")


def init_scheduler():
    """Initialize the scheduler on app startup"""
    global _scheduler_initialized
    
    if _scheduler_initialized:
        return
    
    try:
        if not scheduler.running:
            scheduler.start()
            _scheduler_initialized = True
            print("[Scheduler] Started successfully")
            
            # Schedule initial config load
            async def load_config():
                await asyncio.sleep(5)  # Wait for DB connection
                await update_scheduler_from_config()
            
            asyncio.create_task(load_config())

            # MAPA import reminder: cada lunes a las 09:00 (Europe/Madrid).
            # No configurable desde UI (frecuencia fija acorde al ciclo semanal del MAPA).
            scheduler.add_job(
                sync_mapa_import_reminder,
                trigger=CronTrigger(day_of_week='mon', hour=9, minute=0),
                id='mapa_import_reminder',
                name='MAPA Import Reminder',
                replace_existing=True,
            )
            print("[Scheduler] MAPA import reminder scheduled: every Monday at 09:00")

            # Cleanup PDF map tempfiles: cada hora, borra PNGs de mapas
            # satelitales del PDF de Evaluaciones con >1h de antigüedad.
            # Red de seguridad para orfanatos si el PDF genera errores
            # antes de llegar al `finally` de limpieza inline.
            scheduler.add_job(
                cleanup_pdf_map_tempfiles,
                trigger=IntervalTrigger(hours=1),
                id='pdf_map_cleanup',
                name='PDF Map Tempfiles Cleanup',
                replace_existing=True,
            )
            print("[Scheduler] PDF map tempfile cleanup scheduled: every 1h")
            
    except Exception as e:
        print(f"[Scheduler Error] Failed to start: {e}")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully"""
    global _scheduler_initialized
    
    if scheduler.running:
        scheduler.shutdown(wait=False)
        _scheduler_initialized = False
        print("[Scheduler] Shutdown complete")
