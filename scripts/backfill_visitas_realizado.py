"""One-off backfill: recalcula el flag `realizado` de todas las visitas
existentes según la regla auto (`_visita_realizada`).
"""
import asyncio
import sys
sys.path.insert(0, '/app/backend')

from database import visitas_collection
from routes_visitas import _visita_realizada


async def main():
    total = 0
    changed = 0
    async for v in visitas_collection.find({}):
        total += 1
        want = _visita_realizada(
            v.get("observaciones"),
            v.get("cuestionario_plagas"),
            v.get("fecha_visita"),
        )
        if bool(v.get("realizado")) != want:
            await visitas_collection.update_one(
                {"_id": v["_id"]},
                {"$set": {"realizado": want}},
            )
            changed += 1
            print(f"  {v['_id']} : realizado -> {want}  (obs={bool((v.get('observaciones') or '').strip())}, cp={bool(v.get('cuestionario_plagas'))}, fv={bool(v.get('fecha_visita'))})")
    print(f"Backfill terminado: {changed}/{total} visitas actualizadas.")


if __name__ == "__main__":
    asyncio.run(main())
