#!/usr/bin/env python3
"""
Static audit: detect FastAPI POST/PUT route handlers whose primitive params
(str/int/float/bool) would be interpreted as QUERY parameters but where the
frontend is almost certainly sending a JSON body.

Background
----------
In FastAPI, a route handler parameter is treated as a **query** parameter
unless it is:
  - A path placeholder (`{name}` in the decorator path)
  - A Pydantic BaseModel / `dict` (→ body)
  - Wrapped in `Body(...)`, `Form(...)`, `File(...)`, `UploadFile`
  - A dependency (`= Depends(...)`)

If a handler exposes a primitive (str/int/float/bool, possibly Optional)
without one of the wrappers above, and the frontend sends it in the body,
FastAPI will return 422 "Field required (loc=query.<name>)" — silent for
the user and very easy to miss.

This audit walks each `routes_*.py` module, parses it with `ast`, and flags
every POST/PUT handler with at least one such risky parameter.

Suppression
-----------
Add an inline `# noqa: route_body` comment inside the function body to mark
intentional cases (rare — e.g. a POST that legitimately reads only query
strings like `/api/.../move?to=...`).

Exit code 0 → pass.  Exit code 1 → violations found.
"""
from __future__ import annotations
import ast
import re
import sys
from pathlib import Path

BACKEND = Path("/app/backend")
ROUTE_FILES = sorted(BACKEND.glob("routes_*.py"))

# Primitive annotations that FastAPI treats as query params.
PRIMITIVE_NAMES = {"str", "int", "float", "bool", "bytes", "UUID", "date", "datetime"}

# Annotation wrappers that explicitly mark the source.
WRAPPER_NAMES = {"Body", "Form", "File", "Query", "Path", "Header", "Cookie", "UploadFile"}

# Inline suppression marker.
SUPPRESS_MARKER = re.compile(r"#\s*noqa:\s*route_body", re.IGNORECASE)


def _decorator_info(dec: ast.AST) -> tuple[str, str] | None:
    """Return (method, path) if `dec` is `@router.post/put(path)`."""
    if not isinstance(dec, ast.Call) or not isinstance(dec.func, ast.Attribute):
        return None
    method = dec.func.attr
    if method not in {"post", "put"}:
        return None
    if dec.args and isinstance(dec.args[0], ast.Constant):
        return (method, str(dec.args[0].value))
    return (method, "")


def _path_param_names(path: str) -> set[str]:
    return set(re.findall(r"\{([a-zA-Z_][a-zA-Z0-9_]*)\}", path or ""))


def _annotation_to_str(node: ast.AST | None) -> str:
    """Best-effort annotation source dump."""
    if node is None:
        return ""
    try:
        return ast.unparse(node)
    except Exception:
        return ""


def _is_primitive_annotation(ann: str) -> bool:
    """True if the annotation is a primitive (possibly wrapped in Optional/Union/List).

    Examples that should match:
        str, int, float, bool, Optional[str], Union[str, None], List[str]
    """
    if not ann:
        return False
    # Quick: bare name
    if ann in PRIMITIVE_NAMES:
        return True
    # Wrapped — extract identifiers and check that ALL non-typing identifiers
    # are primitive.
    typing_words = {"Optional", "Union", "List", "Dict", "Tuple", "Set", "Sequence", "Iterable", "None", "Annotated"}
    idents = set(re.findall(r"\b([A-Za-z_][A-Za-z0-9_]*)\b", ann))
    non_typing = idents - typing_words - {"None"}
    if not non_typing:
        return False
    return all(name in PRIMITIVE_NAMES for name in non_typing)


def _default_is_dependency_or_wrapper(default: ast.AST | None) -> bool:
    """Return True if the default value is Depends(...) or a wrapper call
    like Body(...), Form(...), File(...), Query(...), Path(...), Header(...),
    Cookie(...)."""
    if default is None:
        return False
    if isinstance(default, ast.Call):
        func = default.func
        if isinstance(func, ast.Name) and (func.id == "Depends" or func.id in WRAPPER_NAMES):
            return True
        if isinstance(func, ast.Attribute) and (func.attr == "Depends" or func.attr in WRAPPER_NAMES):
            return True
    return False


def _annotation_uses_wrapper_type(ann_str: str) -> bool:
    """True if the annotation itself is a wrapper type that signals body/upload,
    such as `UploadFile` or `Body[...]` / `Annotated[..., Body(...)]`."""
    if not ann_str:
        return False
    return any(w in ann_str for w in WRAPPER_NAMES)


def audit_function(func: ast.AsyncFunctionDef | ast.FunctionDef, src: str, path_params: set[str]) -> list[str]:
    """Return list of risky parameter names."""
    # Check inline suppression first.
    body_src = ast.get_source_segment(src, func) or ""
    if SUPPRESS_MARKER.search(body_src):
        return []

    risky: list[str] = []
    args = func.args
    all_args = list(args.args) + list(args.kwonlyargs)
    defaults = list(args.defaults)
    kw_defaults = list(args.kw_defaults)
    # Align defaults to positional args (defaults align to the LAST N positional args)
    pos_default_map: dict[str, ast.AST | None] = {}
    n_args = len(args.args)
    n_defaults = len(defaults)
    for i, a in enumerate(args.args):
        idx_from_end = n_args - i
        if idx_from_end <= n_defaults:
            pos_default_map[a.arg] = defaults[n_defaults - idx_from_end]
        else:
            pos_default_map[a.arg] = None
    kw_default_map = {a.arg: kw_defaults[i] for i, a in enumerate(args.kwonlyargs)}

    for a in all_args:
        name = a.arg
        if name in {"self", "cls"}:
            continue
        if name in path_params:
            continue
        default = pos_default_map.get(name) or kw_default_map.get(name)
        if _default_is_dependency_or_wrapper(default):
            continue
        ann_str = _annotation_to_str(a.annotation)
        if _annotation_uses_wrapper_type(ann_str):
            continue
        # Non-primitive (BaseModel/dict/etc) → body → OK.
        if not _is_primitive_annotation(ann_str):
            continue
        # Primitive → would become query param. Flag.
        risky.append(f"{name}: {ann_str or '(no annotation)'}")

    return risky


def main() -> int:
    violations: list[tuple[str, int, str, str, list[str]]] = []
    for f in ROUTE_FILES:
        try:
            src = f.read_text(encoding="utf-8")
            tree = ast.parse(src, filename=str(f))
        except SyntaxError as e:
            print(f"[skip] {f.name}: {e}", file=sys.stderr)
            continue
        for node in ast.walk(tree):
            if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
                continue
            for dec in node.decorator_list:
                info = _decorator_info(dec)
                if not info:
                    continue
                method, path = info
                risky = audit_function(node, src, _path_param_names(path))
                if risky:
                    violations.append((f.name, node.lineno, method.upper(), path, risky))

    if not violations:
        print("[audit_route_body_mismatch] OK: no POST/PUT handlers expose unexpected query-style primitives.")
        return 0

    strict = "--strict" in sys.argv
    header = "FAIL" if strict else "WARN"
    print(f"[audit_route_body_mismatch] {header}: the following POST/PUT endpoints declare primitive")
    print("                            parameters that FastAPI treats as QUERY params (but frontend")
    print("                            usually sends them in the body):\n")
    for fname, lineno, method, route_path, params in violations:
        print(f"  {fname}:{lineno}  [{method}]  {route_path}")
        for p in params:
            print(f"      ⚠ {p}")
    print()
    print("Fix options:")
    print("  • Wrap arguments in `Body(...)`: e.g. `name: str = Body(...)`.")
    print("  • Accept a Pydantic model or `payload: dict` and read keys from it.")
    print("  • If the query-string behaviour is intentional, add an inline")
    print("    `# noqa: route_body` comment inside the handler body.")
    print()
    print(f"Total: {len(violations)} endpoint(s) with potential mismatch.")
    if not strict:
        print("(Non-blocking mode. Run with --strict to fail the pipeline on any new finding.)")
    return 1 if strict else 0


if __name__ == "__main__":
    sys.exit(main())
