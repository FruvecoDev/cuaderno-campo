#!/usr/bin/env python3
"""
Static audit: detect missing i18n translation keys.

Scans every `t('namespace.key')` call in the React source tree and ensures
the key exists in `/app/frontend/src/i18n/locales/es.json`.

If a key is missing, react-i18next renders the literal key on the page
(e.g. the bug where "common.update Evaluacion" was shown to the user).

Run before each release:
    python3 /app/scripts/audit_i18n_keys.py

Exit code 1 if any key is missing.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Iterable

FRONT_SRC = Path("/app/frontend/src")
LOCALE_FILE = FRONT_SRC / "i18n" / "locales" / "es.json"

# Capture t('namespace.key') / t("namespace.key") / t(`namespace.key`)
# `key` can be dotted nested. Skip template strings with ${...} (dynamic keys).
TRANSLATION_CALL = re.compile(
    r"""\bt\(\s*(['"`])([a-zA-Z0-9_.]+)\1\s*[\),]""",
    re.MULTILINE,
)

# Keys we explicitly allow to be missing (placeholders, dynamic keys built at runtime, etc.)
ALLOWLIST: set[str] = set()


def flatten_keys(obj: dict, prefix: str = "") -> Iterable[str]:
    """Yield every dotted key path in a nested dict, e.g. 'common.save'."""
    for k, v in obj.items():
        full = f"{prefix}{k}"
        if isinstance(v, dict):
            yield from flatten_keys(v, full + ".")
        else:
            yield full


def collect_used_keys() -> dict[str, list[tuple[str, int]]]:
    """Return {key: [(file_path, line_no), ...]} for every t('x') call."""
    used: dict[str, list[tuple[str, int]]] = {}
    for f in FRONT_SRC.rglob("*.js"):
        if "node_modules" in str(f):
            continue
        text = f.read_text(errors="ignore")
        for m in TRANSLATION_CALL.finditer(text):
            key = m.group(2)
            # Skip non-dotted single tokens (likely loop indices/variables) and trivial cases
            if "." not in key:
                continue
            line_no = text[: m.start()].count("\n") + 1
            used.setdefault(key, []).append((str(f.relative_to(FRONT_SRC)), line_no))
    return used


def main() -> int:
    if not LOCALE_FILE.exists():
        print(f"ERROR: locale file not found at {LOCALE_FILE}")
        return 2

    locale = json.loads(LOCALE_FILE.read_text())
    available = set(flatten_keys(locale))
    used = collect_used_keys()

    missing: list[tuple[str, list[tuple[str, int]]]] = []
    for key, locations in sorted(used.items()):
        if key in ALLOWLIST:
            continue
        if key not in available:
            missing.append((key, locations))

    if not missing:
        print(f"OK: all {len(used)} translation keys exist in es.json.")
        return 0

    print(f"\nFound {len(missing)} missing translation keys in es.json:\n")
    for key, locations in missing:
        print(f"  '{key}'")
        for fp, ln in locations[:3]:
            print(f"      {fp}:{ln}")
        if len(locations) > 3:
            print(f"      ... and {len(locations) - 3} more occurrences")
        print()
    print("Fix: either add the key to es.json or replace the t() call with an existing key.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
