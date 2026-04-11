# ReRooted

**ReRooted** ist eine moderne, webbasierte Genealogie-Anwendung zur Verwaltung und Visualisierung von Familienbeziehungen. Das Projekt ist als schlanke, visuell hochwertige Alternative zu klassischen Desktop-Tools wie Gramps gedacht – mit Fokus auf intuitive Bedienung, Patchwork-Familien und GEDCOM-Kompatibilität.

ReRooted besteht aktuell aus:

- einem **FastAPI-Backend** mit SQLite, SQLAlchemy, Alembic und GEDCOM-Verarbeitung
- einer **React-/TypeScript-Frontend-App** mit interaktivem Familiengraphen auf Basis von React Flow
- technischer Dokumentation unter `docs/` für Architektur, Frontend und Designentscheidungen

---

## Vision / Zweck

ReRooted soll genealogische Daten so erfassbar machen, dass sowohl klassische Stammbäume als auch komplexe Familienrealitäten sauber modelliert und visuell verständlich dargestellt werden können.

Im Zentrum stehen:

- Verwaltung von Personen, Ereignissen, Orten und Beziehungen
- Unterstützung für Partner-, Ex-, Adoptions- und Pflegekonstellationen
- browserbasierte Bearbeitung und Visualisierung des Familiengraphen
- GEDCOM-Import/-Export als Brücke zu bestehender Genealogie-Software
- Foto-, Dokument- und Quellenverwaltung direkt an Personen

---

## Features (aktueller Stand)

| Bereich | Status | Details |
|---|---|---|
| Backend API | ✅ | `FastAPI`, CORS, strukturierte Fehlerantworten, `/health`, OpenAPI unter `/docs` |
| Personen | ✅ | CRUD, Suche, Detailansicht, aktuelle Adresse, Telefonnr., Profilbild |
| Ereignisse | ✅ | flexible Datumstexte, `date_sort`, Ortsverknüpfung, Timeline-Bearbeitung |
| Orte | ✅ | Erstellen, Suche/Autocomplete |
| Beziehungen | ✅ | Partner, Ex, Adoption, Pflege, Kinderzuordnung |
| Stammbaum | ✅ | React-Flow-basierter Canvas mit Zoom, Suche, TB/LR-Layout, Quick Add |
| Personendetails | ✅ | rechte Seitenleiste mit Tabs `Info`, `Fotos`, `Dokumente` |
| Fotos | ✅ | Upload, Metadaten, Profilbild-Markierung, Lightbox |
| Dokumente | ✅ | Upload, Kategorien, optionale Ereignis-Zuordnung, PDF-Vorschau |
| Quellen/Zitationen | ✅ | Quellen und personenbezogene bzw. ereignisbezogene Zitationen |
| GEDCOM | ✅ | Vorschau, Import und Export |
| Bildexport | ✅ | Canvas-Export als `PNG`, `JPG` oder `SVG` |

> Nicht implementiert sind derzeit u. a. Authentifizierung, Mehrbenutzerbetrieb und ein separates Admin-/Benutzerrollenmodell.

---

## Projektstruktur

```text
ReRooted/
├─ backend/
│  ├─ app/
│  │  ├─ api/                  FastAPI-Router
│  │  ├─ core/                 Konfiguration und Datenbank-Setup
│  │  ├─ models/               SQLAlchemy-Modelle
│  │  ├─ schemas/              Pydantic-Schemas
│  │  ├─ services/             Fachlogik und GEDCOM-/Tree-Projektion
│  │  └─ utils/                Hilfsfunktionen (z. B. Datumsparser)
│  ├─ migrations/              Alembic-Migrationen
│  ├─ alembic.ini
│  └─ pyproject.toml           kanonische Backend-Abhängigkeiten
├─ frontend/
│  ├─ src/
│  │  ├─ api/                  Frontend-Datentypen und API-Client
│  │  ├─ components/           wiederverwendbare UI-Komponenten
│  │  ├─ features/             `tree/` und `persons/`
│  │  ├─ hooks/                Queries, Mutations und UI-Hooks
│  │  ├─ layouts/              App-Layout
│  │  └─ pages/                Route-Komponenten
│  └─ package.json             Vite-/React-Frontend
├─ docs/                       Architektur- und Entwicklerdokumentation
├─ tests/                      Unit-, Integrations- und API-Tests
├─ uploads/                    hochgeladene Dateien und Thumbnails
├─ rerooted.toml               Konfigurationsreferenz
├─ pyproject.toml              Repo-weite Tooling-/QA-Konfiguration
└─ requirements.txt            Python-Install für lokale Entwicklung
```

---

## Installation

### Voraussetzungen

- **Python 3.11+**
- **Node.js 18+** und `npm`
- empfohlen: eigenes virtuelles Environment (`.venv`)

### 1. Repository klonen und virtuelles Environment anlegen

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 2. Frontend-Abhängigkeiten installieren

```powershell
Set-Location .\frontend
npm install
Set-Location ..
```

### 3. Datenbankmigration anwenden

```powershell
Set-Location .\backend
..\.venv\Scripts\python.exe -m alembic -c .\alembic.ini upgrade head
Set-Location ..
```

---

## Konfiguration

Die laufende Anwendung liest ihre Backend-Konfiguration aus Umgebungsvariablen bzw. einer optionalen `.env`-Datei über `backend/app/core/config.py`.

`rerooted.toml` dient im Repository als **menschlich lesbare Referenz** derselben Standardwerte.

### Wichtige Backend-Einstellungen

| Variable | Standardwert | Bedeutung |
|---|---|---|
| `APP_NAME` | `ReRooted` | Anzeigename der API |
| `APP_VERSION` | `0.1.0` | Version im Health-Check |
| `DEBUG` | `false` | Debug-/Entwicklungsmodus |
| `DATABASE_URL` | `sqlite:///.../rerooted.db` | SQLite-Datenbankpfad |
| `UPLOAD_DIR` | `./uploads` | Speicherort für hochgeladene Dateien |
| `MAX_UPLOAD_SIZE_MB` | `20` | Upload-Limit für Bilder |
| `CORS_ORIGINS` | `localhost:5173`, `127.0.0.1:5173`, `localhost:3000`, `127.0.0.1:3000` | erlaubte Frontend-Origins |

### Optional für das Frontend

| Variable | Standardwert | Bedeutung |
|---|---|---|
| `VITE_API_URL` | automatisch `http://<hostname>:8000` | überschreibt die erkannte Backend-URL |

### Beispiel `.env`

```env
APP_NAME=ReRooted
APP_VERSION=0.1.0
DEBUG=false
DATABASE_URL=sqlite:///./rerooted.db
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=20
CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]
```

---

## Usage

### Backend starten

```powershell
Set-Location .\backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Erreichbar unter:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

### Frontend starten

In einem zweiten Terminal:

```powershell
Set-Location .\frontend
npm run dev
```

Danach ist die App standardmäßig unter `http://127.0.0.1:5173/` erreichbar.

### App verwenden

1. **Stammbaum öffnen** unter `http://127.0.0.1:5173/`
2. Mit **`+ Person`** oder dem Kontextmenü neue Personen anlegen
3. Eine Person anklicken, um die rechte Detailansicht zu öffnen
4. In **`Info`** Namen, Adresse, Telefonnr., Lebensdaten und Beziehungen bearbeiten
5. In **`Fotos`** Bilder hochladen, Metadaten pflegen und ein Profilbild setzen
6. In **`Dokumente`** PDFs/Bilder hochladen, eine Kategorie wählen und optional einem Ereignis zuordnen
7. In der oberen Toolbar Zoom, Layout (`TB`/`LR`), Designs, Hintergrund, Suche und Export verwenden
8. Über **`/import`** GEDCOM-Dateien prüfen und importieren

### Canvas-Export

Über das `📷`-Menü im Canvas sind verfügbar:

- `PNG`
- `JPG`
- `SVG`

Beim Bildexport werden Toolbar und ReRooted-Header ausgeblendet, sodass nur der eigentliche Stammbaum exportiert wird.

---

## Workflows

### 1. Familie manuell aufbauen

- erste Person mit `+ Person` anlegen
- weitere Personen über Kontextmenü als Kind, Partner, Elternteil oder Geschwister hinzufügen
- in der Personenseitenleiste Lebensdaten und Beziehungen ergänzen
- Fotos und Dokumente direkt an die Person anhängen

### 2. GEDCOM importieren

- `/import` im Browser öffnen
- `.ged`/`.gedcom` Datei auswählen
- Vorschau prüfen
- Import bestätigen
- zurück zum Stammbaum wechseln

### 3. Daten teilen oder sichern

- **GEDCOM-Export** über die Toolbar nutzen, um genealogische Daten zu exportieren
- **PNG/JPG/SVG-Export** nutzen, um eine grafische Ansicht des aktuellen Stammbaums zu speichern

---

## Testing

### Backend-Tests

```powershell
python -m pytest -q
```

### Nur Integrations-Tests

```powershell
python -m pytest tests/integration -q
```

### Linting / Typprüfung

```powershell
python -m ruff format .
python -m ruff check .
python -m mypy .
```

### Frontend-Build prüfen

```powershell
Set-Location .\frontend
npm run build
```

> Derzeit liegt der Fokus der automatisierten Tests auf dem Python-Backend; das Frontend wird aktuell vor allem über den Produktions-Build und die Integration mit der API abgesichert.

---

## Architekturprinzipien

Die aktuelle Implementierung folgt diesen Leitlinien:

- **Thin Routers:** HTTP-Router delegieren an `backend/app/services/`
- **Service Layer:** Fachlogik liegt im Backend-Service-Layer, nicht in den Routern
- **Explizite Verträge:** Pydantic- und TypeScript-Typen bilden die API bewusst ab
- **Semantischer Backend-Graph:** Das Backend liefert die genealogische Struktur, das Frontend übernimmt Layout und Interaktion
- **Optimistische UI mit Re-Fetch:** schnelle UI-Reaktionen, anschließend Synchronisation mit der kanonischen Serverantwort
- **Theming über CSS-Variablen:** Designs und Hintergründe sind zur Laufzeit umschaltbar

Weiterführende technische Dokumentation:

- `docs/architecture.md`
- `docs/backend/api.md`
- `docs/backend/db.md`
- `docs/frontend/app.md`
- `docs/frontend/tree-canvas.md`
- `docs/frontend/person-panel.md`
- `docs/design-decisions/frontend-state-management.md`
- `docs/design-decisions/frontend-visualization.md`

---

## Projektstatus

ReRooted ist aktuell als **lokal lauffähige Web-Anwendung** nutzbar:

- das Backend ist API-seitig umfassend implementiert
- das Frontend bietet den interaktiven Stammbaum, Personendetails, Medien-/Dokumentenverwaltung und GEDCOM-Workflows
- die technische Architektur ist unter `docs/` dokumentiert

---

## Lizenz

Apache 2.0 – siehe `LICENSE`.
