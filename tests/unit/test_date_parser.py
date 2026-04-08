from datetime import date

from app.utils.date_parser import parse_flex_date


def test_parse_flex_date_handles_supported_formats() -> None:
    assert parse_flex_date("15.04.1923") == {"qualifier": "exact", "sort": date(1923, 4, 15)}
    assert parse_flex_date("ca. 1920") == {"qualifier": "about", "sort": date(1920, 1, 1)}
    assert parse_flex_date("vor 1900") == {"qualifier": "before", "sort": date(1899, 12, 31)}
    assert parse_flex_date("1920-1925") == {"qualifier": "range", "sort": date(1920, 1, 1)}


def test_parse_flex_date_handles_empty_and_free_text() -> None:
    assert parse_flex_date(None) == {"qualifier": None, "sort": None}
    assert parse_flex_date("   ") == {"qualifier": None, "sort": None}
    assert parse_flex_date("unbekannt") == {"qualifier": "text", "sort": None}
