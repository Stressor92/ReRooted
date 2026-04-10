# Local DB setup for ReRooted

## Current setup

This project uses **SQLite** by default.

- DB file: `rerooted.db` in the repo root
- Uploads: `uploads/`
- Backend config: `backend/app/core/config.py`
- Alembic migrations: `backend/migrations/`

The default database URL is built automatically as:

```text
sqlite:///.../rerooted.db
```

## 1) Create or update the local DB

From the repo root:

```powershell
Push-Location backend
..\.venv\Scripts\python.exe -m alembic -c .\alembic.ini upgrade head
Pop-Location
```

This creates the SQLite schema locally and applies all migrations.

## 2) Run the backend

```powershell
Push-Location backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## 3) Query the DB directly

A small helper script is available:

```powershell
.\.venv\Scripts\python.exe .\scripts\sqlite_query.py "SELECT id, first_name, last_name FROM persons LIMIT 10"
```

JSON output:

```powershell
.\.venv\Scripts\python.exe .\scripts\sqlite_query.py "SELECT * FROM relationships" --json
```

## 4) Use a GUI SQL tool

Recommended VS Code options:

- **SQLTools**
- **SQLite Viewer**
- **SQLite** extensions that can open `rerooted.db`

Open the file `rerooted.db` and you can browse tables and run SQL manually.

## 5) Keep personal data out of GitHub

The repo now ignores:

- `rerooted.db`
- `*.db`, `*.sqlite`, `*.sqlite3`
- SQLite sidecar files (`-wal`, `-shm`, etc.)
- uploaded files under `uploads/*`

So your private local data will not be committed.

## Optional: custom local path via `.env`

You can override the DB location with a local `.env` file in the repo root:

```env
DATABASE_URL=sqlite:///C:/Users/<you>/RerootedData/rerooted.db
```

The `.env` file is already ignored by Git.
