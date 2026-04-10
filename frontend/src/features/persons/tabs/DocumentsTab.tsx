import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Document, Page, pdfjs } from 'react-pdf';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import { downloadFile, resolveFileUrl } from '../../../api/files';
import type { PersonDetail } from '../../../api/persons';
import { useCreateSourceCitation, useDeletePersonFile } from '../../../hooks/usePersonMutations';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

type DocumentsTabProps = {
  person: PersonDetail;
};

type SourceRecord = {
  id: string;
  title: string;
  author?: string | null;
  date?: string | null;
  url?: string | null;
  file_id?: string | null;
};

type CitationRecord = {
  id: string;
  source_id: string;
  source_title?: string | null;
  event_id?: string | null;
  person_id?: string | null;
  page?: string | null;
  confidence: 'low' | 'medium' | 'high';
};

type LinkedDocument = {
  citation: CitationRecord;
  source: SourceRecord;
  eventLabel: string;
};

function isPdfDocument(filename: string): boolean {
  return /\.pdf$/i.test(filename);
}

export default function DocumentsTab({ person }: DocumentsTabProps) {
  const createSourceCitation = useCreateSourceCitation(person.id);
  const deleteFile = useDeletePersonFile(person.id);
  const [category, setCategory] = useState('Sonstiges');
  const [selectedEventId, setSelectedEventId] = useState(person.events[0]?.id ?? '');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [pageCounts, setPageCounts] = useState<Record<string, number>>({});

  const { data: documents = [] } = useQuery<LinkedDocument[]>({
    queryKey: ['person-documents', person.id, person.events.map((event) => event.id).join(',')],
    queryFn: async () => {
      const eventIds = person.events.map((event) => event.id);
      if (eventIds.length === 0) {
        return [];
      }

      const [sources, groupedCitations] = await Promise.all([
        apiClient.get('/sources').then((r) => r.data as SourceRecord[]),
        Promise.all(
          person.events.map(async (event) => ({
            event,
            citations: await apiClient
              .get(`/events/${event.id}/citations`)
              .then((r) => r.data as CitationRecord[])
              .catch(() => []),
          })),
        ),
      ]);

      const sourceMap = new Map(sources.map((source) => [source.id, source]));

      return groupedCitations.flatMap(({ event, citations }) =>
        citations
          .map((citation) => ({
            citation,
            source: sourceMap.get(citation.source_id),
            eventLabel: `${event.event_type}${event.date_text ? ` · ${event.date_text}` : ''}`,
          }))
          .filter((item): item is LinkedDocument => Boolean(item.source?.file_id)),
      );
    },
    enabled: true,
    staleTime: 30_000,
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!selectedEventId) {
        return;
      }

      for (const file of acceptedFiles) {
        const uploaded = await apiClient
          .post('/files/upload', (() => {
            const form = new FormData();
            form.append('file', file);
            return form;
          })(), {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          .then((r) => r.data as { id: string; filename: string });

        await createSourceCitation.mutateAsync({
          eventId: selectedEventId,
          source: {
            title: uploaded.filename,
            author: category,
            date: new Date().toISOString().slice(0, 10),
            file_id: uploaded.id,
          },
          citation: { confidence: 'medium' },
        });
      }
    },
    [category, createSourceCitation, selectedEventId],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 50 * 1024 * 1024,
    disabled: !selectedEventId,
  });

  const eventOptions = useMemo(
    () => person.events.map((event) => ({ value: event.id, label: `${event.event_type}${event.date_text ? ` · ${event.date_text}` : ''}` })),
    [person.events],
  );

  return (
    <div className="rerooted-tab-stack">
      <section className="rerooted-section">
        <div className="rerooted-section-header">
          <h3>Dokumente</h3>
          <span className="rerooted-field-hint">PDF oder JPG · max. 50 MB</span>
        </div>

        <div className="rerooted-form-grid is-compact">
          <label className="rerooted-field">
            <span>Kategorie</span>
            <select className="rerooted-input" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option>Geburtsurkunde</option>
              <option>Heiratsurkunde</option>
              <option>Testament</option>
              <option>Foto</option>
              <option>Sonstiges</option>
            </select>
          </label>

          <label className="rerooted-field">
            <span>Ereignis</span>
            <select
              className="rerooted-input"
              value={selectedEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
            >
              {eventOptions.length === 0 ? <option value="">Bitte zuerst ein Ereignis anlegen</option> : null}
              {eventOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div {...getRootProps()} className={`rerooted-dropzone${isDragActive ? ' is-drag-active' : ''}${!selectedEventId ? ' is-disabled' : ''}`}>
          <input {...getInputProps()} />
          <strong>Dateien hier ablegen</strong>
          <span>Vorschau für PDFs direkt im Panel.</span>
        </div>
      </section>

      <div className="rerooted-documents-table">
        <div className="rerooted-documents-head">
          <span>Typ</span>
          <span>Dateiname</span>
          <span>Kategorie</span>
          <span>Datum</span>
          <span>Aktionen</span>
        </div>

        {documents.map(({ source, citation, eventLabel }) => {
          const filename = source.title;
          const isPdf = isPdfDocument(filename);
          const fileUrl = resolveFileUrl(`/files/${source.file_id}`);
          const isExpanded = expandedSourceId === source.id;

          return (
            <div key={source.id} className="rerooted-doc-row-wrapper">
              <div className="rerooted-doc-row">
                <span>{isPdf ? '📄' : '🖼'}</span>
                <span>{filename}</span>
                <span>{source.author ?? 'Sonstiges'}</span>
                <span>{source.date ?? eventLabel}</span>
                <div className="rerooted-doc-actions">
                  {isPdf ? (
                    <button
                      type="button"
                      className="rerooted-inline-button"
                      onClick={() => setExpandedSourceId((current) => (current === source.id ? null : source.id))}
                    >
                      Vorschau
                    </button>
                  ) : null}
                  <button type="button" className="rerooted-inline-button" onClick={() => void downloadFile(source.file_id!, filename)}>
                    Download
                  </button>
                  <button
                    type="button"
                    className="rerooted-inline-button is-danger"
                    onClick={() => void deleteFile.mutateAsync(source.file_id!)}
                  >
                    Löschen
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isExpanded && isPdf && fileUrl ? (
                  <motion.div
                    className="rerooted-pdf-preview"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <Document file={fileUrl} onLoadSuccess={({ numPages }) => setPageCounts((current) => ({ ...current, [source.id]: numPages }))}>
                      <Page pageNumber={1} width={320} />
                    </Document>
                    <div className="rerooted-field-hint">
                      Seite 1 / {pageCounts[source.id] ?? 1} ·{' '}
                      <a href={fileUrl} target="_blank" rel="noreferrer">
                        Vollständig öffnen
                      </a>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
