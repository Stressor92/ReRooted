import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { PersonDetail } from '../../../api/persons';
import { useCreateSourceCitation, useUpdateCitation } from '../../../hooks/usePersonMutations';

type SourcesTabProps = {
  person: PersonDetail;
};

type SourceRecord = {
  id: string;
  title: string;
  author?: string | null;
  date?: string | null;
  url?: string | null;
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

type EnrichedCitation = CitationRecord & {
  source?: SourceRecord;
  eventLabel: string;
};

function confidenceDots(confidence: 'low' | 'medium' | 'high'): string {
  switch (confidence) {
    case 'high':
      return '●●●';
    case 'medium':
      return '●●○';
    default:
      return '●○○';
  }
}

function nextConfidence(confidence: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' {
  if (confidence === 'low') {
    return 'medium';
  }
  if (confidence === 'medium') {
    return 'high';
  }
  return 'low';
}

export default function SourcesTab({ person }: SourcesTabProps) {
  const updateCitation = useUpdateCitation(person.id);
  const createSourceCitation = useCreateSourceCitation(person.id);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(person.events[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState('');
  const [url, setUrl] = useState('');
  const [page, setPage] = useState('');

  const { data: citations = [] } = useQuery<EnrichedCitation[]>({
    queryKey: ['person-citations', person.id, person.events.map((event) => event.id).join(',')],
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
            citations: await apiClient.get(`/events/${event.id}/citations`).then((r) => r.data as CitationRecord[]),
          })),
        ),
      ]);

      const sourceMap = new Map(sources.map((source) => [source.id, source]));

      return groupedCitations.flatMap(({ event, citations: eventCitations }) =>
        eventCitations.map((citation) => ({
          ...citation,
          source: sourceMap.get(citation.source_id),
          eventLabel: `${event.event_type}${event.date_text ? ` · ${event.date_text}` : ''}`,
        })),
      );
    },
    enabled: true,
    staleTime: 30_000,
  });

  const eventOptions = useMemo(
    () => person.events.map((event) => ({ value: event.id, label: `${event.event_type}${event.date_text ? ` · ${event.date_text}` : ''}` })),
    [person.events],
  );

  const handleCreateSource = async () => {
    if (!selectedEventId || !title.trim()) {
      return;
    }

    await createSourceCitation.mutateAsync({
      eventId: selectedEventId,
      source: {
        title: title.trim(),
        author: author.trim() || null,
        date: year.trim() || null,
        url: url.trim() || null,
      },
      citation: {
        page: page.trim() || null,
        confidence: 'medium',
      },
    });

    setTitle('');
    setAuthor('');
    setYear('');
    setUrl('');
    setPage('');
    setIsFormOpen(false);
  };

  return (
    <div className="rerooted-tab-stack">
      <section className="rerooted-section">
        <div className="rerooted-section-header">
          <h3>Quellen & Zitate</h3>
          <button type="button" className="rerooted-secondary-button" onClick={() => setIsFormOpen((current) => !current)}>
            {isFormOpen ? 'Schließen' : 'Neue Quelle'}
          </button>
        </div>

        <div className="rerooted-source-list">
          {citations.map((citation) => (
            <article key={citation.id} className="rerooted-source-item">
              <div>
                <strong>{citation.source?.title ?? citation.source_title ?? 'Unbenannte Quelle'}</strong>
                <div className="rerooted-field-hint">
                  Seite {citation.page ?? '–'} · {citation.eventLabel}
                </div>
              </div>

              <button
                type="button"
                className="rerooted-confidence-button"
                onClick={() =>
                  void updateCitation.mutateAsync({
                    citationId: citation.id,
                    confidence: nextConfidence(citation.confidence),
                  })
                }
              >
                {confidenceDots(citation.confidence)}
              </button>
            </article>
          ))}
        </div>
      </section>

      {isFormOpen ? (
        <section className="rerooted-section">
          <h3>Neue Quelle</h3>
          <div className="rerooted-form-grid is-compact">
            <label className="rerooted-field rerooted-field--full">
              <span>Titel*</span>
              <input className="rerooted-input" value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="rerooted-field">
              <span>Autor</span>
              <input className="rerooted-input" value={author} onChange={(event) => setAuthor(event.target.value)} />
            </label>
            <label className="rerooted-field">
              <span>Jahr</span>
              <input className="rerooted-input" value={year} onChange={(event) => setYear(event.target.value)} />
            </label>
            <label className="rerooted-field rerooted-field--full">
              <span>URL</span>
              <input className="rerooted-input" value={url} onChange={(event) => setUrl(event.target.value)} />
            </label>
            <label className="rerooted-field">
              <span>Ereignis</span>
              <select className="rerooted-input" value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)}>
                {eventOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="rerooted-field">
              <span>Seite</span>
              <input className="rerooted-input" value={page} onChange={(event) => setPage(event.target.value)} />
            </label>
          </div>

          <div className="rerooted-inline-form-actions">
            <button type="button" className="rerooted-primary-button" onClick={() => void handleCreateSource()}>
              Quelle anlegen
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
