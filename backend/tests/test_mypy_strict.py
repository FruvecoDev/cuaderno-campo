"""Regression test: mypy --strict must pass on migrated core modules.

Este test bloquea cualquier PR que rompa el tipado de los archivos
migrados a strict typing (database.py, models.py, server.py). Al añadir un
módulo nuevo a la lista de "strict", basta con incluirlo aquí.

Ejecutar: cd /app/backend && pytest tests/test_mypy_strict.py -v
"""
from __future__ import annotations

import subprocess
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
STRICT_MODULES = ["database.py", "models.py", "server.py"]


def test_mypy_strict_on_core_modules() -> None:
    """mypy --strict debe pasar sin errores en los módulos migrados."""
    result = subprocess.run(
        ["mypy", *STRICT_MODULES],
        cwd=str(BACKEND_DIR),
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert result.returncode == 0, (
        f"mypy strict falló en {STRICT_MODULES}.\n"
        f"stdout:\n{result.stdout}\n"
        f"stderr:\n{result.stderr}"
    )
    assert "Success" in result.stdout, f"Salida inesperada: {result.stdout}"
