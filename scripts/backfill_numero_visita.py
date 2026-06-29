"""
Backfill `numero_visita` for existing Visita documents.

For each parcela, sort its visits by `fecha_visita` (ASC) and assign 1, 2, 3...
Visits that already have `numero_visita` are left untouched.
"""
import asyncio
import os
import sys
from collections import defaultdict

sys.path.insert(0, "/app/backend")
from database import visitas_collection  # noqa: E402


async def main():
    cursor = visitas_collection.find({})
    visitas = await cursor.to_list(length=None)
    print(f"Total visitas: {len(visitas)}")

    by_parcela = defaultdict(list)
    for v in visitas:
        pid = v.get("parcela_id")
        if pid:
            by_parcela[pid].append(v)

    updated = 0
    skipped = 0
    for pid, lst in by_parcela.items():
        # Sort by fecha_visita ASC (fallback to created_at)
        def _key(x):
            return x.get("fecha_visita") or x.get("created_at") or ""
        lst.sort(key=_key)
        for idx, v in enumerate(lst, 1):
            if v.get("numero_visita") not in (None, 0):
                skipped += 1
                continue
            await visitas_collection.update_one(
                {"_id": v["_id"]},
                {"$set": {"numero_visita": idx}}
            )
            updated += 1

    print(f"Done. Updated: {updated}, already had numero_visita: {skipped}")


if __name__ == "__main__":
    asyncio.run(main())
