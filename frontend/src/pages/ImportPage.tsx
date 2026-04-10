import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import { useGedcomImport, useGedcomPreview } from '../hooks/useGedcom';

export default function ImportPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const previewMutation = useGedcomPreview();
  const importMutation = useGedcomImport();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const nextFile = acceptedFiles[0] ?? null;
      setFile(nextFile);
      previewMutation.reset();
      importMutation.reset();

      if (nextFile) {
        previewMutation.mutate(nextFile);
      }
    },
    [importMutation, previewMutation],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: previewMutation.isPending || importMutation.isPending,
    accept: {
      'application/octet-stream': ['.ged', '.gedcom'],
      'text/plain': ['.ged', '.gedcom'],
    },
  });

  const steps = useMemo(
    () => [
      {
        title: '1. Datei wählen',
        state: file ? 'done' : 'current',
        copy: file ? file.name : 'Ziehe eine .ged-Datei hierher oder wähle sie aus.',
      },
      {
        title: '2. Vorschau prüfen',
        state: previewMutation.data ? 'done' : file ? 'current' : 'idle',
        copy: previewMutation.data
          ? `${previewMutation.data.persons} Personen • ${previewMutation.data.families} Familien`
          : 'Import wird vorab analysiert, ohne Daten zu verändern.',
      },
      {
        title: '3. Import ausführen',
        state: importMutation.isSuccess ? 'done' : previewMutation.data ? 'current' : 'idle',
        copy: importMutation.data
          ? `${importMutation.data.imported_persons} Personen importiert.`
          : 'Startet den eigentlichen Import in die Datenbank.',
      },
    ],
    [file, importMutation.data, importMutation.isSuccess, previewMutation.data],
  );

  const preview = previewMutation.data;

  return (
    <div className="rerooted-import-page">
      <div className="rerooted-import-shell">
        <div className="rerooted-section-header">
          <div>
            <h2>GEDCOM-Import</h2>
            <p className="rerooted-field-hint">Upload → Vorschau → Import mit direktem Rückweg in den Stammbaum.</p>
          </div>
          <Link to="/" className="rerooted-secondary-button">
            Zurück zum Baum
          </Link>
        </div>

        <div className="rerooted-import-steps">
          {steps.map((step) => (
            <div key={step.title} className={`rerooted-import-step is-${step.state}`}>
              <strong>{step.title}</strong>
              <span>{step.copy}</span>
            </div>
          ))}
        </div>

        <div className="rerooted-import-grid">
          <section className="rerooted-state-card rerooted-import-card">
            <strong>Datei auswählen</strong>
            <div
              {...getRootProps()}
              className={`rerooted-dropzone${isDragActive ? ' is-drag-active' : ''}${
                previewMutation.isPending || importMutation.isPending ? ' is-disabled' : ''
              }`}
            >
              <input {...getInputProps()} />
              <strong>{file ? file.name : 'GEDCOM hier ablegen'}</strong>
              <span>
                {isDragActive
                  ? 'Datei loslassen, um die Vorschau zu starten.'
                  : 'Akzeptiert .ged und .gedcom bis 50 MB.'}
              </span>
            </div>
          </section>

          <section className="rerooted-state-card rerooted-import-card">
            <strong>Vorschau</strong>
            {previewMutation.isPending ? (
              <LoadingSpinner label="GEDCOM wird analysiert…" compact />
            ) : preview ? (
              <>
                <div className="rerooted-import-stats">
                  <div>
                    <strong>{preview.persons}</strong>
                    <span>Personen</span>
                  </div>
                  <div>
                    <strong>{preview.families}</strong>
                    <span>Familien</span>
                  </div>
                  <div>
                    <strong>{preview.places}</strong>
                    <span>Orte</span>
                  </div>
                  <div>
                    <strong>{preview.events}</strong>
                    <span>Ereignisse</span>
                  </div>
                </div>
                {preview.warnings?.length ? (
                  <div className="rerooted-field-hint is-warning">Warnungen: {preview.warnings.join(' • ')}</div>
                ) : (
                  <div className="rerooted-field-hint">Keine Warnungen gefunden.</div>
                )}
              </>
            ) : (
              <span className="rerooted-field-hint">Nach der Dateiauswahl erscheint hier die Import-Vorschau.</span>
            )}
          </section>
        </div>

        <div className="rerooted-import-actions">
          <button
            type="button"
            className="rerooted-primary-button"
            disabled={!file || !preview || importMutation.isPending}
            onClick={() => {
              if (file) {
                importMutation.mutate(file);
              }
            }}
          >
            {importMutation.isPending ? 'Import läuft…' : 'Import starten'}
          </button>
          <button type="button" className="rerooted-secondary-button" onClick={() => navigate('/')}>
            Abbrechen
          </button>
        </div>

        {importMutation.data ? (
          <div className="rerooted-state-card rerooted-import-card">
            <strong>Import abgeschlossen</strong>
            <span>
              {importMutation.data.imported_persons} Personen und {importMutation.data.imported_families} Familien wurden übernommen.
            </span>
            <button type="button" className="rerooted-primary-button" onClick={() => navigate('/')}>
              Baum öffnen
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
