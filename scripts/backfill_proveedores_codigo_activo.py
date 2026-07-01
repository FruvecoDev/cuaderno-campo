"""Backfill: asigna codigo_proveedor y activo=True a los proveedores importados
desde Excel que quedaron sin código, y activo=True a los cultivos importados
sin este campo.
"""
import asyncio
import sys
sys.path.insert(0, '/app/backend')

from database import db
proveedores_collection = db['proveedores']
cultivos_collection = db['cultivos']


async def main():
    # ---- Proveedores ----
    # 1) Averiguar el siguiente codigo_proveedor libre
    last = await proveedores_collection.find_one(
        {"codigo_proveedor": {"$exists": True, "$ne": None}},
        sort=[("codigo_proveedor", -1)],
    )
    if last and last.get("codigo_proveedor"):
        try:
            next_num = int(last["codigo_proveedor"]) + 1
        except (ValueError, TypeError):
            next_num = (await proveedores_collection.count_documents({})) + 1
    else:
        next_num = 1

    # 2) Proveedores sin codigo_proveedor → asignar uno único
    cursor = proveedores_collection.find({
        "$or": [{"codigo_proveedor": {"$exists": False}}, {"codigo_proveedor": None}, {"codigo_proveedor": ""}]
    }).sort([("nombre", 1)])
    fixed_cp = 0
    async for p in cursor:
        codigo = str(next_num).zfill(6)
        await proveedores_collection.update_one(
            {"_id": p["_id"]},
            {"$set": {"codigo_proveedor": codigo, "activo": True}},
        )
        next_num += 1
        fixed_cp += 1

    # 3) Proveedores con codigo pero sin activo → activo=True
    r_activo = await proveedores_collection.update_many(
        {"$or": [{"activo": {"$exists": False}}, {"activo": None}]},
        {"$set": {"activo": True}},
    )

    print(f"Proveedores: {fixed_cp} con nuevo codigo_proveedor · {r_activo.modified_count} con activo=True (adicional)")

    # ---- Cultivos ----
    r_c = await cultivos_collection.update_many(
        {"$or": [{"activo": {"$exists": False}}, {"activo": None}]},
        {"$set": {"activo": True}},
    )
    print(f"Cultivos: {r_c.modified_count} con activo=True")


if __name__ == "__main__":
    asyncio.run(main())
