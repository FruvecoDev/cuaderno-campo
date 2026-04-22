"""
Formatters compartidos para exportaciones PDF / Excel.

Convención visual:
- Punto (.) separador de miles
- Coma (,) separador decimal
- Símbolo EUR suffix: "1.234,56 €"

Esto coincide con el formato que usa el frontend (de-DE) para que la
experiencia entre la UI y los informes descargados sea consistente.
"""

from __future__ import annotations


def format_number_es(value, decimals: int = 2) -> str:
    """Formatea un numero al estilo espanol con separador de miles."""
    if value is None or value == "":
        return "0" if decimals == 0 else "0," + "0" * decimals
    try:
        num = float(value)
    except (TypeError, ValueError):
        return str(value)
    if decimals == 0:
        raw = f"{num:,.0f}"
    else:
        raw = f"{num:,.{decimals}f}"
    # `{:,.2f}` usa "," para miles y "." para decimales -> invertir
    return raw.replace(",", "X").replace(".", ",").replace("X", ".")


def format_euro(value, decimals: int = 2) -> str:
    """`1.234,56 €`"""
    return f"{format_number_es(value, decimals)} €"


def format_kg(value) -> str:
    """`1.234 kg` (sin decimales)."""
    return f"{format_number_es(value, 0)} kg"


def format_percent(value, decimals: int = 2) -> str:
    return f"{format_number_es(value, decimals)} %"
