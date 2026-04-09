# ReRooted

**ReRooted** ist eine moderne, webbasierte Genealogie-Anwendung zur Verwaltung und Visualisierung von Familienbeziehungen. Das Projekt ist als schlanke Alternative zu klassischen Desktop-Tools wie Gramps gedacht – mit Fokus auf klare Datenmodelle, Patchwork-Familien und GEDCOM-Kompatibilität.

> **Aktueller Stand:** Das Backend ist funktional und getestet. Das Frontend ist derzeit als strukturierter TypeScript-/React-Scaffold im Repository vorhanden, aber noch nicht als vollständige UI ausgebaut.

## Vision / Zweck

ReRooted soll genealogische Daten so verwaltbar machen, dass sowohl klassische Stammbäume als auch komplexere Familienrealitäten sauber abgebildet werden können.

Im Zentrum stehen:

- strukturierte Verwaltung von Personen, Ereignissen, Orten und Beziehungen
- Unterstützung für Patchwork-, Adoptions- und Pflegekonstellationen
- browserbasierte Visualisierung als Graph
- GEDCOM-Import/-Export als Brücke zu bestehender Genealogie-Software
- nachvollziehbare Quellen- und Dateiverwaltung

## Features (aktuell implementiert)

| Bereich | Status | Details |
|---|---|---|
| API-Basis | ✅ | `FastAPI`, CORS, strukturierte JSON-Fehlerantworten, `/health` |
| Personen | ✅ | CRUD, Suche, Detailansicht, Profilbild-URL |
| Ereignisse | ✅ | flexible Datumstexte, `date_sort`, Ortsverknüpfung |
| Orte | ✅ | Erstellen, Suche/Autocomplete (max. 10 Treffer) |
| Beziehungen | ✅ | Partner-, Ex-, Adoptions- und Foster-Beziehungen mit Kind-Links |
| Stammbaum-Graph | ✅ | `/tree` liefert React-Flow-kompatible `nodes` und `edges` |
| Quellen & Zitationen | ✅ | Quellen anlegen, Event-Zitationen verwalten |
| Datei-Uploads | ✅ | Bild-Uploads mit Thumbnail-Erzeugung |
| GEDCOM | ✅ | Preview, Import, Export, Datenschutz für lebende Personen beim Export |
| Frontend | ⚠️ Scaffold | Typen, Hooks und Struktur vorhanden; UI noch nicht fertig umgesetzt |

## Projektstruktur

```text
ReRooted/
├─ backend/
│  ├─ app/
│  │  ├─ api/          HTTP-Router
│  │  ├─ core/         Konfiguration und Datenbank-Setup
│  │  ├─ models/       SQLAlchemy-Modelle
│  │  ├─ schemas/      Pydantic-Modelle
│  │  ├─ services/     Business-Logik
│  │  └─ utils/        Hilfsfunktionen, z. B. Datumsparser
│  ├─ migrations/      Alembic-Migrationen
│  ├─ alembic.ini
│  └─ pyproject.toml   Kanonische Backend-Abhängigkeiten
├─ frontend/
│  └─ src/             Frontend-Scaffold (noch nicht vollständig ausgebaut)
├─ docs/               Technische Dokumentation und Architekturhinweise
├─ tests/              Unit-, Integrations- und API-Tests
├─ uploads/            Kanonisches Upload-Verzeichnis
├─ rerooted.db         Kanonische SQLite-Datenbank
├─ media-tool.toml     Menschlich lesbare Konfigurationsreferenz
├─ pyproject.toml      Repository-weite Tooling-/QA-Konfiguration
└─ requirements.txt    Convenience-Install für lokale Entwicklung
```

## Installation

### Voraussetzungen

- Python **3.11+**
- Windows, macOS oder Linux
- empfohlen: eigenes virtuelles Environment

### Lokales Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

Die Root-`requirements.txt` installiert das Backend im Editiermodus inklusive Dev-Tools über die kanonische Paketdefinition in `backend/pyproject.toml`.

### Datenbank-Migration anwenden

```powershell
Set-Location .\backend
..\.venv\Scripts\python.exe -m alembic -c .\alembic.ini upgrade head
```

## Konfiguration (`media-tool.toml`)

Zur Orientierung liegt im Repository eine `media-tool.toml` als **Konfigurationsreferenz**. Die laufende Anwendung liest ihre Werte derzeit aus Umgebungsvariablen bzw. einer optionalen `.env`-Datei über `pydantic-settings` in `backend/app/core/config.py`.

### Relevante Einstellungen

| Schlüssel | Standardwert | Bedeutung |
|---|---|---|
| `app_name` | `ReRooted` | Anzeigename der API |
| `app_version` | `0.1.0` | Version im Health-Check |
| `debug` | `false` | SQL/Debug-Verhalten |
| `database_url` | `sqlite:///.../rerooted.db` | SQLite-Datenbank |
| `upload_dir` | `./uploads` | Upload-Zielverzeichnis |
| `max_upload_size_mb` | `20` | Upload-Limit für Bilder |
| `cors_origins` | `localhost:5173`, `localhost:3000` | erlaubte Browser-Origin |

### Beispiel für `.env`

```env
APP_NAME=ReRooted
APP_VERSION=0.1.0
DEBUG=false
DATABASE_URL=sqlite:///./rerooted.db
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=20
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

## Usage

### Backend starten

```powershell
Set-Location .\backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Danach ist die API unter folgenden URLs erreichbar:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs` (OpenAPI / Swagger UI)

### Schneller API-Check

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Erwartete Antwort:

```json
{
  "status": "ok",
  "version": "0.1.0"
}
```

### Wichtige Endpunkte

| Bereich | Endpunkte |
|---|---|
| Personen | `GET/POST /persons`, `GET/PUT/DELETE /persons/{id}` |
| Ereignisse | `GET/POST /persons/{id}/events`, `PUT/DELETE /events/{id}` |
| Orte | `GET /places?q=...`, `POST /places` |
| Beziehungen | `GET/POST /relationships`, `PUT/DELETE /relationships/{id}` |
| Quellen | `GET/POST /sources`, `POST /events/{id}/citations` |
| Dateien | `POST /files/upload`, `GET /files/{id}`, `GET /files/{id}/thumb` |
| GEDCOM | `POST /import/gedcom/preview`, `POST /import/gedcom`, `GET /export/gedcom` |
| Graph | `GET /tree` |

## Workflows (reale Nutzungsszenarien)

### 1. Familie manuell aufbauen

1. Ort anlegen über `POST /places`
2. Personen anlegen über `POST /persons`
3. Geburt, Tod oder andere Ereignisse an `POST /persons/{id}/events` hängen
4. Beziehungen über `POST /relationships` modellieren
5. Den graphischen Baum über `GET /tree` abrufen

### 2. GEDCOM-Roundtrip

```powershell
curl.exe -F "file=@family.ged" http://127.0.0.1:8000/import/gedcom/preview
curl.exe -F "file=@family.ged" http://127.0.0.1:8000/import/gedcom
Invoke-WebRequest http://127.0.0.1:8000/export/gedcom -OutFile .\rerooted_export.ged
```

Der Export anonymisiert aktuell lebende Personen standardmäßig.

### 3. Quellen und Belege ergänzen

1. Quelle anlegen mit `POST /sources`
2. Ereignis anlegen oder auswählen
3. Zitation via `POST /events/{event_id}/citations` verknüpfen

## Testing

Die Qualitätssicherung ist bereits in die Repository-Struktur eingebaut.

### Relevante Befehle

```powershell
python -m pytest -q
python -m pytest tests/integration -m "not live_integration" -q
python -m ruff format .
python -m ruff check . --fix
python -m mypy .
```

### Aktueller QA-Stand

- `32` Tests in der Gesamtsuite grün
- `3` Integrations-Tests grün
- `ruff` ohne verbleibende Befunde
- `mypy` ohne Typfehler

## Architekturprinzipien

Die aktuelle Implementierung folgt ein paar klaren Regeln:

- **Thin Routers:** HTTP-Router delegieren an `services/`
- **Service-Layer-Logik:** Fachlogik liegt in `backend/app/services/`
- **Explizite Schemas:** Request-/Response-Modelle liegen in `backend/app/schemas/`
- **ORM als Persistenzmodell:** Datenbankstruktur wird in `backend/app/models/` definiert
- **Alembic statt Auto-Schemaerzeugung:** Persistente Schemaänderungen laufen über Migrationen
- **Kanonische Runtime-Artefakte:** `rerooted.db` und `uploads/` liegen bewusst im Repository-Root

Für detailliertere technische Hintergründe siehe:

- `docs/architecture.md`
- `docs/backend/app.md`
- `docs/backend/api.md`
- `docs/backend/db.md`
- `docs/frontend/app.md`
- `docs/test/test_plan.md`

## Projektstatus

ReRooted ist derzeit am stärksten im Backend ausgebaut:

- die API ist lauffähig und testabgedeckt
- GEDCOM-, Datei-, Quellen- und Graph-Funktionalität sind implementiert
- das Frontend bildet aktuell die Struktur und Verträge ab, ist aber noch kein vollständiges Nutzer-Interface

## Lizenz

Apache 2.0 – siehe `LICENSE`.
