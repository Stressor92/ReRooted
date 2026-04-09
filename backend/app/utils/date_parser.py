from __future__ import annotations

import re
from datetime import date
from typing import Any

GEDCOM_MONTHS = {
    "JAN": 1,
    "FEB": 2,
    "MAR": 3,
    "APR": 4,
    "MAY": 5,
    "JUN": 6,
    "JUL": 7,
    "AUG": 8,
    "SEP": 9,
    "OCT": 10,
    "NOV": 11,
    "DEC": 12,
}


def parse_flex_date(value: str | None) -> dict[str, Any]:
    """Parse flexible genealogy date input into a qualifier and sortable date."""
    if not value or not value.strip():
        return {"qualifier": None, "sort": None}

    raw = value.strip()

    if re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", raw):
        day, month, year = map(int, raw.split("."))
        return {"qualifier": "exact", "sort": date(year, month, day)}

    if match := re.fullmatch(r"(?i)(\d{1,2})\s+([A-Z]{3})\s+(\d{4})", raw):
        day = int(match.group(1))
        month_key = match.group(2).upper()
        month_number = GEDCOM_MONTHS.get(month_key)
        year = int(match.group(3))
        if month_number is not None:
            return {"qualifier": "exact", "sort": date(year, month_number, day)}

    if match := re.fullmatch(r"(?i)(?:ca\.?|circa|abt|about)\s*(\d{4})", raw):
        return {"qualifier": "about", "sort": date(int(match.group(1)), 1, 1)}

    if match := re.fullmatch(r"(?i)(?:vor|bef|before)\s*(\d{4})", raw):
        return {"qualifier": "before", "sort": date(int(match.group(1)) - 1, 12, 31)}

    if match := re.fullmatch(r"(?i)(?:nach|aft|after)\s*(\d{4})", raw):
        return {"qualifier": "after", "sort": date(int(match.group(1)) + 1, 1, 1)}

    if match := re.fullmatch(r"(?i)bet\s+(\d{4})\s+and\s+(\d{4})", raw):
        return {"qualifier": "range", "sort": date(int(match.group(1)), 1, 1)}

    if match := re.fullmatch(r"(\d{4})\s*[-/]\s*(\d{4})", raw):
        return {"qualifier": "range", "sort": date(int(match.group(1)), 1, 1)}

    if re.fullmatch(r"\d{4}", raw):
        return {"qualifier": "year", "sort": date(int(raw), 1, 1)}

    return {"qualifier": "text", "sort": None}
