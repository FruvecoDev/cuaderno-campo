"""
Repara evaluaciones con `parcela_id` huérfano (parcela borrada).

Recorre todas las evaluaciones, comprueba si su `parcela_id` existe en la
colección de parcelas. Si no existe, busca una parcela con el mismo
`codigo_plantacion` y actualiza la referencia. Si no encuentra coincidencia,
solo registra el caso por consola para que el usuario lo revise.
"""
import asyncio
import sys
from bson import ObjectId

sys.path.insert(0, "/app/backend")
from database import evaluaciones_collection, parcelas_collection  # noqa: E402


async def main():
    evals = await evaluaciones_collection.find({}).to_list(length=None)
    print(f"Total evaluaciones: {len(evals)}")

    fixed = 0
    skipped = 0
    orphaned = 0

    for ev in evals:
        pid = ev.get("parcela_id") or ""
        codigo = ev.get("codigo_plantacion") or ""

        # Comprobar si la parcela existe
        if pid and ObjectId.is_valid(pid):
            parcela = await parcelas_collection.find_one({"_id": ObjectId(pid)})
            if parcela:
                skipped += 1
                continue

        # Parcela no existe — intentar relinkear por codigo_plantacion
        if not codigo:
            print(f"  ⚠️  Eval {ev['_id']} sin codigo_plantacion y parcela huérfana ({pid}). Saltando.")
            orphaned += 1
            continue

        nueva = await parcelas_collection.find_one({"codigo_plantacion": codigo})
        if not nueva:
            print(f"  ⚠️  Eval {ev['_id']} parcela {pid} no existe y no hay parcela con codigo='{codigo}'. Saltando.")
            orphaned += 1
            continue

        await evaluaciones_collection.update_one(
            {"_id": ev["_id"]},
            {"$set": {"parcela_id": str(nueva["_id"])}},
        )
        print(f"  ✅  Eval {ev['_id']} re-vinculada: {pid}  →  {nueva['_id']} ('{codigo}')")
        fixed += 1

    print(f"\nFixed: {fixed} | OK: {skipped} | Orphaned (no fix): {orphaned}")


if __name__ == "__main__":
    asyncio.run(main())
