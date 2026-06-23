#!/usr/bin/env python3
"""
Inject `notify.success(...)` toasts after successful CRUD operations in every
page that uses the `await api.post('/api/X' ...)` / `await api.put(...)` pattern.

How it works
------------
For each `await api.post('/api/<resource>', ...)` we insert (on the next line):
    notify.success(`<Resource> creado/a correctamente`);

For each `await api.put('/api/<resource>/...', ...)` we insert:
    notify.success(`<Resource> actualizado/a correctamente`);

The resource label is derived from the URL segment (e.g. `parcelas` → `Parcela`,
`contratos` → `Contrato`).

Idempotent: skips a call site if the very next non-empty line already contains
`notify.success(`.

Run once:
    python3 /app/scripts/add_success_toasts.py
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOTS = [Path("/app/frontend/src/pages")]

# Singular labels + gender for the most common resources. Defaults are derived
# from the URL when not in the map.
LABELS = {
    "parcelas": ("Parcela", "a"),
    "contratos": ("Contrato", "o"),
    "albaranes": ("Albarán", "o"),
    "fincas": ("Finca", "a"),
    "tareas": ("Tarea", "a"),
    "visitas": ("Visita", "a"),
    "cosechas": ("Cosecha", "a"),
    "tratamientos": ("Tratamiento", "o"),
    "irrigaciones": ("Riego", "o"),
    "recomendaciones": ("Recomendación", "a"),
    "evaluaciones": ("Evaluación", "a"),
    "proveedores": ("Proveedor", "o"),
    "clientes": ("Cliente", "o"),
    "fitosanitarios": ("Fitosanitario", "o"),
    "maquinaria": ("Máquina", "a"),
    "agentes": ("Agente", "o"),
    "usuarios": ("Usuario", "o"),
    "tecnicos-aplicadores": ("Técnico aplicador", "o"),
    "articulos-explotacion": ("Artículo", "o"),
    "rrhh": ("Empleado", "o"),
}


def label_for(resource: str) -> tuple[str, str]:
    if resource in LABELS:
        return LABELS[resource]
    # Default: capitalize + drop trailing 's', gender=o
    base = resource[:-1] if resource.endswith("s") else resource
    return (base.capitalize(), "o")


CALL_RE = re.compile(
    r"""(?P<indent>^[ \t]*)
        await\s+api\.(?P<verb>post|put)\(
        \s*['"`]/api/(?P<resource>[a-z0-9_\-]+)
    """,
    re.MULTILINE | re.VERBOSE,
)


def already_has_toast_next(lines: list[str], idx: int) -> bool:
    """Return True if the next non-blank line is a notify.success/error call.

    We treat both as 'already handled' so we don't stack toasts. We also skip if
    the next code line opens a brace block waiting for await result (e.g.
    multi-line arguments) — handled separately.
    """
    j = idx + 1
    # Skip closing parens/braces from a multi-line call expression
    while j < len(lines):
        stripped = lines[j].strip()
        if not stripped:
            j += 1
            continue
        # If this is a continuation of the api call args, skip
        if stripped in {")", "});", ").catch();", "});\n"}:
            j += 1
            continue
        return stripped.startswith("notify.success") or stripped.startswith("notify.info")
    return False


def find_statement_end(lines: list[str], idx: int) -> int:
    """Given idx pointing at a line with `await api.<verb>(`, return the index of
    the last line of that statement (i.e. the line containing the closing `);`).
    """
    open_parens = 0
    started = False
    j = idx
    while j < len(lines):
        for ch in lines[j]:
            if ch == "(":
                open_parens += 1
                started = True
            elif ch == ")":
                open_parens -= 1
                if started and open_parens == 0:
                    return j
        j += 1
    return idx  # fallback


def migrate_file(file: Path) -> int:
    text = file.read_text(encoding="utf-8")
    lines = text.split("\n")
    inserts = []  # (insert_after_index, line_to_insert)

    # Need notify import to exist; if not, skip
    has_notify_import = "from '../lib/notify'" in text or 'from "../lib/notify"' in text
    if not has_notify_import:
        # File doesn't use the notify helper yet (likely no alert() in it either)
        # Add minimal import to keep things working.
        # We'll only inject when we actually do a replacement; bookkeep a flag.
        pass

    for i, line in enumerate(lines):
        m = CALL_RE.match(line)
        if not m:
            continue
        end_idx = find_statement_end(lines, i)
        if already_has_toast_next(lines, end_idx):
            continue
        verb = m.group("verb")
        resource = m.group("resource")
        label, gender = label_for(resource)
        ending = "creado" if verb == "post" else "actualizado"
        if gender == "a":
            ending += "a"
        ending += " correctamente"
        indent = m.group("indent")
        # If we're inside an if/else, we don't always know which branch this is.
        # Insert a single line that handles both create+update with a ternary
        # is risky — easier: always use the literal verb-derived message.
        toast_line = f"{indent}notify.success('{label} {ending}');"
        inserts.append((end_idx, toast_line))

    if not inserts:
        return 0

    # Apply inserts bottom-up to keep indices stable
    for idx, ins in sorted(inserts, key=lambda x: -x[0]):
        lines.insert(idx + 1, ins)

    new_text = "\n".join(lines)

    # Ensure notify import is present
    if not has_notify_import:
        import_re = re.compile(r"^(import .*\n)+", re.MULTILINE)
        m = import_re.search(new_text)
        if m:
            inject = "import { notify } from '../lib/notify';\n"
            new_text = new_text[: m.end()] + inject + new_text[m.end():]
        else:
            new_text = "import { notify } from '../lib/notify';\n" + new_text

    file.write_text(new_text, encoding="utf-8")
    return len(inserts)


def main() -> int:
    total_files = 0
    total_inserts = 0
    for root in ROOTS:
        for f in root.rglob("*.js"):
            if "node_modules" in f.parts:
                continue
            n = migrate_file(f)
            if n:
                rel = f.relative_to("/app/frontend/src")
                print(f"  ✓ {rel}: +{n} success toast(s)")
                total_files += 1
                total_inserts += n
    print()
    print(f"Done: {total_inserts} success toast(s) inserted across {total_files} file(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
