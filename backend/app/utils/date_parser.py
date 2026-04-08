from __future__ import annotations

import re
from datetime import date
from typing import Any


def parse_flex_date(value: str | None) -> dict[str, Any]:
    """Parse flexible genealogy date input into a qualifier and sortable date."""
    if not value or not value.strip():
        return {"qualifier": None, "sort": None}

    raw = value.strip()

    if re.fullmatch(r"\d{2}\.\d{2}\.\d{4}", raw):
        day, month, year = map(int, raw.split("."))
        return {"qualifier": "exact", "sort": date(year, month, day)}

    if match := re.fullmatch(r"(?i)(?:ca\.?|circa)\s*(\d{4})", raw):
        return {"qualifier": "about", "sort": date(int(match.group(1)), 1, 1)}

    if match := re.fullmatch(r"(?i)vor\s*(\d{4})", raw):
        return {"qualifier": "before", "sort": date(int(match.group(1)) - 1, 12, 31)}

    if match := re.fullmatch(r"(?i)nach\s*(\d{4})", raw):
        return {"qualifier": "after", "sort": date(int(match.group(1)) + 1, 1, 1)}

    if match := re.fullmatch(r"(\d{4})\s*[-/]\s*(\d{4})", raw):
        return {"qualifier": "range", "sort": date(int(match.group(1)), 1, 1)}

    if re.fullmatch(r"\d{4}", raw):
        return {"qualifier": "year", "sort": date(int(raw), 1, 1)}

    return {"qualifier": "text", "sort": None}
