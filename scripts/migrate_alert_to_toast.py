#!/usr/bin/env python3
"""
One-shot migration: replace every `alert("...")` / `alert(...)` in
frontend pages and components with `notify.error/success/info` calls.

Heuristic classification:
  - alert(...) where the literal text contains "error", "Error", or template
    starts with "Error" → notify.error(...)
  - alert(...) where text matches success-words (creado, guardad, eliminad,
    exitos, éxito, completad, actualizad) → notify.success(...)
  - everything else → notify.info(...)

Also injects `import { notify } from '...'` (relative path computed per-file)
when the file ends up using notify.

Run once:
    python3 /app/scripts/migrate_alert_to_toast.py

Idempotent: skips files that already import `notify` and have no `alert(`.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ROOTS = [Path("/app/frontend/src/pages"), Path("/app/frontend/src/components")]
NOTIFY_MODULE = Path("/app/frontend/src/lib/notify.js")

SUCCESS_RE = re.compile(
    r"(creado|creada|guardad|eliminad|borrad|actualizad|completad|registrad|enviad|exitos|éxito|exito)",
    re.IGNORECASE,
)
ERROR_RE = re.compile(r"(error|fallo|no se pudo|inválido|invalido|requerido)", re.IGNORECASE)

# Matches either `alert(` (bare) or `window.alert(` (member). The script will
# carefully replace the prefix as well.
ALERT_START_RE = re.compile(r"\b(window\.alert|alert)\s*\(")


def find_balanced(text: str, start_paren: int) -> int:
    """Return the index of the matching ')' for an open '(' at start_paren-1."""
    depth = 1
    i = start_paren
    n = len(text)
    in_str = None  # ' or " or `
    escape = False
    while i < n:
        c = text[i]
        if escape:
            escape = False
            i += 1
            continue
        if in_str:
            if c == "\\":
                escape = True
            elif c == in_str:
                in_str = None
            elif in_str == "`" and c == "$" and i + 1 < n and text[i + 1] == "{":
                # Skip template-literal interpolation: ${ ... }
                depth_tpl = 1
                i += 2
                while i < n and depth_tpl:
                    if text[i] == "{":
                        depth_tpl += 1
                    elif text[i] == "}":
                        depth_tpl -= 1
                    i += 1
                continue
            i += 1
            continue
        if c in ("'", '"', "`"):
            in_str = c
        elif c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def classify(arg_text: str) -> str:
    """Return 'error' / 'success' / 'info'."""
    if ERROR_RE.search(arg_text):
        return "error"
    if SUCCESS_RE.search(arg_text):
        return "success"
    return "info"


def relative_notify_import(file: Path) -> str:
    target = NOTIFY_MODULE
    file_dir = file.parent
    rel = Path("/".join([".."] * 0))  # placeholder
    try:
        rel_path = target.relative_to(file_dir)
        rel_str = "./" + rel_path.as_posix()
    except ValueError:
        # Walk up
        from os.path import relpath
        rel_str = relpath(str(target), str(file_dir))
        if not rel_str.startswith("."):
            rel_str = "./" + rel_str
    # Drop the .js extension (ES modules in CRA resolve without it)
    rel_str = re.sub(r"\.js$", "", rel_str)
    return rel_str


def migrate_file(file: Path) -> tuple[int, int]:
    """Return (alerts_replaced, file_changed?)."""
    src = file.read_text(encoding="utf-8")
    out = []
    i = 0
    replaced = 0
    while True:
        m = ALERT_START_RE.search(src, i)
        if not m:
            out.append(src[i:])
            break
        out.append(src[i:m.start()])
        arg_start = m.end()
        arg_end = find_balanced(src, arg_start)
        if arg_end == -1:
            # malformed — bail on this match
            out.append(src[m.start():arg_start])
            i = arg_start
            continue
        arg_text = src[arg_start:arg_end]
        # Skip if this is a different `.alert` (e.g. `someObj.alert(...)` other
        # than `window.alert`). We already matched window.alert explicitly, so
        # for the bare `alert(` capture we just need to ensure no preceding dot.
        matched_prefix = src[m.start():arg_start]
        before = src[m.start() - 1] if m.start() > 0 else ""
        is_window_alert = matched_prefix.startswith("window.alert")
        if before == "." and not is_window_alert:
            out.append(src[m.start():arg_end + 1])
            i = arg_end + 1
            continue
        kind = classify(arg_text)
        replacement = f"notify.{kind}({arg_text.strip()})"
        out.append(replacement)
        i = arg_end + 1
        replaced += 1

    if replaced == 0:
        return 0, 0

    new_src = "".join(out)

    # Inject import { notify } if missing.
    if "from '" not in new_src and 'from "' not in new_src:
        # Edge: file has no imports? Just prepend.
        new_src = f"import {{ notify }} from '{relative_notify_import(file)}';\n" + new_src
    elif "notify" not in new_src.split("\n", 1)[0] and not re.search(
        r"from\s+['\"][^'\"]*/lib/notify['\"]", new_src
    ):
        # Find the last import line and inject after it.
        lines = new_src.split("\n")
        last_import = -1
        for idx, line in enumerate(lines):
            if line.lstrip().startswith("import "):
                last_import = idx
        import_line = f"import {{ notify }} from '{relative_notify_import(file)}';"
        if last_import == -1:
            lines.insert(0, import_line)
        else:
            lines.insert(last_import + 1, import_line)
        new_src = "\n".join(lines)

    file.write_text(new_src, encoding="utf-8")
    return replaced, 1


def main() -> int:
    files = []
    for root in ROOTS:
        files.extend(root.rglob("*.js"))
    total_alerts = 0
    total_files = 0
    for f in files:
        if "node_modules" in f.parts:
            continue
        n, changed = migrate_file(f)
        if n > 0:
            print(f"  ✓ {f.relative_to('/app/frontend/src')}: {n} alert(s) replaced")
        total_alerts += n
        total_files += changed
    print()
    print(f"Done: {total_alerts} alert(s) replaced across {total_files} file(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
