# ReRooted

**ReRooted** ist eine moderne, webbasierte Genealogie-Anwendung zur Verwaltung und Visualisierung von Familienbeziehungen. Das Projekt ist als schlanke, visuell hochwertige Alternative zu klassischen Desktop-Tools wie Gramps gedacht – mit Fokus auf intuitive Bedienung, Patchwork-Familien und GEDCOM-Kompatibilität.

## Zielbild

- Personen, Ereignisse, Orte und Beziehungen strukturiert verwalten
- komplexe Familienstrukturen korrekt abbilden
- interaktiven Stammbaum im Browser darstellen
- GEDCOM 5.5.1 importieren und exportieren
- Datenschutz für lebende Personen beim Export berücksichtigen

## Geplanter MVP-Umfang

### Backend

- `FastAPI` als REST-API-Framework
- `SQLAlchemy` + `SQLite` für Persistenz und ORM
- ereignis-zentriertes Datenmodell für Geburt, Tod, Taufe, Heirat usw.
- Orte als eigene Entitäten mit Such- und Autocomplete-Funktion
- Quellen, Zitationen und Datei-Uploads
- GEDCOM Import/Export als Migrationspfad zu bestehenden Tools

### Frontend

- `React` + `Vite` + `TypeScript`
- `React Flow` für die interaktive Stammbaum-Visualisierung
- `dagre` für automatisches Graph-Layout
- `TanStack Query` für Datenabruf und Caching
- Sidebar, Tooltips und Kontextmenüs für eine fokussierte UX

## Aktuelle Projektstruktur

```text
backend/
  app/
    core/       Konfiguration und Datenbank
    models/     SQLAlchemy-Modelle
    schemas/    Pydantic-Schemas
    services/   Business-Logik
    utils/      Hilfsfunktionen
frontend/
  src/          React-/TypeScript-Frontend
doc/            Projektplanung und Spezifikation
```

## Schnellstart (Backend-Basis)

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

Optional kann eine `.env`-Datei angelegt werden:

```env
DEBUG=false
DATABASE_URL=sqlite:///./rerooted.db
```

## Konfiguration

Die zentralen Einstellungen liegen in `backend/app/core/config.py`:

- `app_name`, `app_version`
- `debug`
- `database_url`
- `upload_dir`
- `max_upload_size_mb`
- `cors_origins`

## Roadmap

1. Projekt-Setup und Datenbankschema
2. Personen- und Ortsverwaltung
3. Ereignisse und flexible Datumseingaben
4. Beziehungen und Patchwork-Familien
5. Grafische Stammbaumansicht
6. Detail-UX mit Sidebar und Schnellaktionen
7. Quellenangaben und Vertrauensgrade
8. GEDCOM Import/Export

## Status

Die initiale Backend-Struktur und zentrale Modelle/Services sind bereits angelegt. Die fachliche Grundlage und die Umsetzungsphasen sind in `doc/project_plan.rnd` dokumentiert.

## Lizenz

Apache 2.0 – siehe `LICENSE`.
