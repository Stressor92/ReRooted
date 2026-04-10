from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def resolve_db_path() -> Path:
    database_url = os.getenv("DATABASE_URL") or os.getenv("database_url")
    if not database_url:
        return repo_root() / "rerooted.db"

    if not database_url.startswith("sqlite:///"):
        raise SystemExit(f"Only sqlite:/// URLs are supported by this helper. Got: {database_url}")

    parsed = urlparse(database_url)
    raw_path = unquote(parsed.path)

    if raw_path.startswith("/") and len(raw_path) > 3 and raw_path[2] == ":":
        raw_path = raw_path[1:]

    return Path(raw_path).resolve()


def run_query(sql: str, *, as_json: bool) -> int:
    db_path = resolve_db_path()
    if not db_path.exists():
        migration_command = (
            "Push-Location backend; "
            "..\\.venv\\Scripts\\python.exe -m alembic -c .\\alembic.ini upgrade head"
        )
        raise SystemExit(
            f"Database not found: {db_path}\nCreate it first with: {migration_command}"
        )

    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row

    try:
        cursor = connection.execute(sql)
        rows = cursor.fetchall()
        columns = [description[0] for description in (cursor.description or [])]

        if as_json:
            print(json.dumps([dict(row) for row in rows], indent=2, default=str))
            return 0

        if not columns:
            connection.commit()
            print("Query executed successfully.")
            return 0

        widths: list[int] = []
        for index, column in enumerate(columns):
            max_cell = max((len(str(row[index])) for row in rows), default=0)
            widths.append(max(len(column), max_cell))

        header = " | ".join(column.ljust(widths[i]) for i, column in enumerate(columns))
        divider = "-+-".join("-" * widths[i] for i in range(len(columns)))

        print(header)
        print(divider)
        for row in rows:
            print(" | ".join(str(row[i]).ljust(widths[i]) for i in range(len(columns))))
        print(f"\nRows: {len(rows)}")
        return 0
    finally:
        connection.close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Run ad-hoc SQL queries against the local ReRooted SQLite database."
    )
    parser.add_argument(
        "sql", help="SQL statement to execute, e.g. SELECT id, first_name FROM persons LIMIT 5"
    )
    parser.add_argument("--json", action="store_true", help="Print rows as JSON")
    return parser


if __name__ == "__main__":
    args = build_parser().parse_args()
    try:
        raise SystemExit(run_query(args.sql, as_json=args.json))
    except sqlite3.Error as exc:
        print(f"SQLite error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
