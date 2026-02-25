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
            
    except Exception as e:
        print(f"[Scheduler Error] Failed to start: {e}")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully"""
    global _scheduler_initialized
    
    if scheduler.running:
        scheduler.shutdown(wait=False)
        _scheduler_initialized = False
        print("[Scheduler] Shutdown complete")
