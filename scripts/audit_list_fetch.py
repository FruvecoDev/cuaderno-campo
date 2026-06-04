#!/usr/bin/env python3
"""
Static audit: detect frontend list-fetches that may extract data from the wrong key.

Background:
  Backend list endpoints (e.g. /api/contratos) always return:
    { "<plural>": [...], "total": N }
  But it's easy to accidentally write `setX(data)` instead of `setX(data.<plural>)`,
  which silently shows an empty list while data exists in DB.
  This bug was found in Evaluaciones.js after users reported "no la guarda".

Run before each release:
  python3 /app/scripts/audit_list_fetch.py

Adds zero overhead to CI — pure static analysis.
"""
import re
import sys
from pathlib import Path

# Map: API endpoint -> (response key, expected list-setter regex)
LIST_MODULES = {
    'contratos':      ('contratos',      r'setContratos'),
    'proveedores':    ('proveedores',    r'setProveedores'),
    'clientes':       ('clientes',       r'setClientes'),
    'agentes':        ('agentes',        r'setAgentes(?:Compra|Venta)?'),
    'fincas':         ('fincas',         r'setFincas'),
    'parcelas':       ('parcelas',       r'setParcelas'),
    'visitas':        ('visitas',        r'setVisitas'),
    'tareas':         ('tareas',         r'setTareas'),
    'cosechas':       ('cosechas',       r'setCosechas'),
    'tratamientos':   ('tratamientos',   r'setTratamientos'),
    'irrigaciones':   ('irrigaciones',   r'setIrrigaciones'),
    'recetas':        ('recetas',        r'setRecetas'),
    'albaranes':      ('albaranes',      r'setAlbaranes'),
    'fitosanitarios': ('productos',      r'setProductos|setFitosanitarios'),
    'evaluaciones':   ('evaluaciones',   r'setEvaluaciones|setHojas'),
}

SRC = Path('/app/frontend/src/pages')

PATTERN_TMPL = (
    r"const\s+data\s*=\s*await\s+api\.get\(\s*['\"`]/api/{ep}(?:\?[^'\"`]*)?['\"`]\s*\)"
    r"\s*;\s*((?:{setter})\([^;\n]+\))"
)


def main() -> int:
    issues = []
    for endpoint, (key, setter_re) in LIST_MODULES.items():
        pattern = re.compile(PATTERN_TMPL.format(ep=re.escape(endpoint), setter=setter_re))
        for f in sorted(SRC.rglob('*.js')):
            text = f.read_text()
            for m in pattern.finditer(text):
                call = m.group(1)
                if (f'data.{key}' in call
                        or f'data?.{key}' in call
                        or f"data['{key}']" in call
                        or 'Array.isArray(data)' in call):
                    continue
                issues.append((f.name, endpoint, key, call.strip()))

    if not issues:
        print("OK: no list-fetch bugs found across all pages.")
        return 0

    print(f"\nFound {len(issues)} suspicious list assignments:\n")
    for fname, ep, key, call in issues:
        print(f"  {fname}  /api/{ep}  expected data.{key}")
        print(f"    {call}\n")
    return 1


if __name__ == '__main__':
    sys.exit(main())
