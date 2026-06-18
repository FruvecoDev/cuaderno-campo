#!/usr/bin/env python3
"""
Static audit: detect backend POST/PUT endpoints that discriminate by `tipo`
(Compra/Venta) but FORGET to call `ensure_tipo_operacion(current_user, tipo)`.

Background
----------
The app has a per-user setting `tipo_operacion` ∈ {"compra", "venta", "ambos"}.
Endpoints that write Contratos/Albaranes (or any document with a `tipo` field
distinguishing Compra/Venta) MUST validate the operation against the user's
allowed operation. Otherwise an attacker — or even an Admin who is explicitly
limited to "Compra" — can bypass the restriction with a raw HTTP POST.

This script scans `/app/backend/routes_*.py`, finds every POST/PUT route
handler that mentions `.tipo`, `"Compra"`, `"Venta"`, or `tipo_operacion`,
and reports the ones that DON'T call `ensure_tipo_operacion(`.

Exit code 0 → pass.   Exit code 1 → violations found.

Run before each release:
    python3 /app/scripts/audit_tipo_operacion.py

Adds zero overhead to CI — pure static analysis.
"""
from __future__ import annotations

import ast
import re
import sys
from pathlib import Path

BACKEND = Path("/app/backend")
ROUTE_FILES = sorted(BACKEND.glob("routes_*.py"))

# Files that are intentionally exempt:
#   - routes_auth.py: handles the tipo_operacion setter endpoint itself
#   - routes_clientes.py / routes_catalogos.py: catalog CRUD of tipo names
#   - routes_erp_integration.py: ERP-to-ERP API-key auth (no end user → no tipo_operacion)
EXEMPT_FILES = {
    "routes_auth.py",
    "routes_clientes.py",
    "routes_catalogos.py",
    "routes_erp_integration.py",
}

# Inline suppression marker: place `# noqa: tipo_operacion` anywhere inside the
# handler body to silence this audit for that specific function (use only when
# the function legitimately does not need to enforce per-user tipo_operacion,
# e.g. report exporters, notification dispatchers, batch admin tools).
SUPPRESS_MARKER = re.compile(r"#\s*noqa:\s*tipo_operacion", re.IGNORECASE)

# Trigger tokens that indicate a handler distinguishes by compra/venta.
TRIGGER_PATTERNS = [
    re.compile(r"\.tipo\b"),
    re.compile(r"['\"]Compra['\"]"),
    re.compile(r"['\"]Venta['\"]"),
    re.compile(r"['\"]compra['\"]"),
    re.compile(r"['\"]venta['\"]"),
]

ENSURE_CALL = re.compile(r"ensure_tipo_operacion\s*\(")


def _decorator_method(dec: ast.AST) -> str | None:
    """Return 'post'/'put' if `dec` is `@router.post(...)`/`@router.put(...)`."""
    call = dec
    if not isinstance(call, ast.Call):
        return None
    attr = call.func
    if not isinstance(attr, ast.Attribute):
        return None
    if attr.attr not in {"post", "put"}:
        return None
    return attr.attr


def _decorator_path(dec: ast.Call) -> str:
    if dec.args and isinstance(dec.args[0], ast.Constant):
        return str(dec.args[0].value)
    return "<unknown>"


def audit_file(path: Path) -> list[tuple[str, int, str, str]]:
    """Return list of (file, line, http_method, route_path) for violations."""
    src = path.read_text(encoding="utf-8")
    try:
        tree = ast.parse(src, filename=str(path))
    except SyntaxError as e:
        print(f"[skip] {path.name}: syntax error: {e}", file=sys.stderr)
        return []

    violations: list[tuple[str, int, str, str]] = []
    for node in ast.walk(tree):
        if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
            continue
        for dec in node.decorator_list:
            method = _decorator_method(dec)
            if not method:
                continue
            # Get the function's source text
            try:
                body_src = ast.get_source_segment(src, node) or ""
            except Exception:
                continue
            if not body_src:
                continue
            # Does it look like it discriminates by tipo?
            if not any(p.search(body_src) for p in TRIGGER_PATTERNS):
                continue
            # Does it call ensure_tipo_operacion?
            if ENSURE_CALL.search(body_src):
                continue
            # Inline suppression?
            if SUPPRESS_MARKER.search(body_src):
                continue
            # Skip GET-only-with-tipo-as-filter is N/A (we only look at post/put).
            route_path = _decorator_path(dec)
            violations.append((path.name, node.lineno, method.upper(), route_path))
    return violations


def main() -> int:
    all_violations: list[tuple[str, int, str, str]] = []
    for f in ROUTE_FILES:
        if f.name in EXEMPT_FILES:
            continue
        all_violations.extend(audit_file(f))

    if not all_violations:
        print("[audit_tipo_operacion] OK: every POST/PUT that handles `tipo` calls ensure_tipo_operacion()")
        return 0

    print("[audit_tipo_operacion] FAIL: the following endpoints discriminate by `tipo`")
    print("                       but do NOT call ensure_tipo_operacion(current_user, ...):")
    print()
    for fname, lineno, method, path_str in all_violations:
        print(f"  {fname}:{lineno}  [{method}]  {path_str}")
    print()
    print("Fix: add `ensure_tipo_operacion(current_user, <tipo_value>)` at the top of the handler.")
    print("     Import from `rbac_guards`.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
