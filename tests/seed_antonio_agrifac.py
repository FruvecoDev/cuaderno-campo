"""Seed Antonio Sanchez with AGRIFAC machine for manual testing"""
import requests, os, json, sys

BASE = ""
with open("/app/frontend/.env") as f:
    for line in f:
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE = line.split("=",1)[1].strip().rstrip("/")
r = requests.post(f"{BASE}/api/auth/login", json={"email":"admin@fruveco.com","password":"admin123"})
tok = r.json().get("access_token") or r.json().get("token")
H = {"Authorization": f"Bearer {tok}", "Content-Type":"application/json"}

# find Antonio Sanchez
r = requests.get(f"{BASE}/api/tecnicos-aplicadores", headers=H)
tecs = r.json()["tecnicos"]
antonio = next((t for t in tecs if "Antonio" in t.get("nombre","") and "Sanchez" in (t.get("apellidos","") or "")), None)
if not antonio:
    print("Antonio not found, available:", [(t.get("nombre"), t.get("apellidos")) for t in tecs])
    sys.exit(0)

# find AGRIFAC
r = requests.get(f"{BASE}/api/maquinaria", headers=H)
body = r.json()
items = body.get("maquinaria") or body.get("items") or body
agrifac = next((m for m in items if "AGRIFAC" in (m.get("nombre","") or "").upper()), None)
if not agrifac:
    print("AGRIFAC not found, available:", [m.get("nombre") for m in items][:10])
    sys.exit(0)

# Update Antonio with AGRIFAC
payload = {
    "nombre": antonio["nombre"],
    "apellidos": antonio["apellidos"],
    "dni": antonio["dni"],
    "nivel_capacitacion": antonio["nivel_capacitacion"],
    "num_carnet": antonio["num_carnet"],
    "fecha_certificacion": antonio["fecha_certificacion"],
    "observaciones": antonio.get("observaciones", ""),
    "maquinas_ids": [agrifac["_id"]]
}
r = requests.put(f"{BASE}/api/tecnicos-aplicadores/{antonio['_id']}", json=payload, headers=H)
print("Status:", r.status_code)
print("maquinas_ids:", r.json().get("data", {}).get("maquinas_ids"))
print("Antonio _id:", antonio["_id"], "AGRIFAC _id:", agrifac["_id"])
