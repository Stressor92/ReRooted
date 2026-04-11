import { useMemo, useState } from 'react';
import type { PersonEvent } from '../api/persons';
import { EVENT_ICONS, EVENT_OPTIONS, formatEventLabel, formatEventTypeLabel } from '../utils/eventTypes';
import FlexDateInput from './FlexDateInput';
import PlaceAutocomplete from './PlaceAutocomplete';

type EventDraft = {
  event_type: string;
  date_text: string;
  place_id: string | null;
  place_name: string;
  description: string;
};

type EventTimelineProps = {
  events: PersonEvent[];
  onSaveEvent: (payload: {
    eventId?: string;
    data: { event_type: string; date_text?: string | null; place_id?: string | null; description?: string | null };
  }) => Promise<unknown>;
  onDeleteEvent: (eventId: string) => Promise<unknown>;
};

function createDraft(event?: PersonEvent): EventDraft {
  return {
    event_type: event?.event_type ?? 'other',
    date_text: event?.date_text ?? '',
    place_id: event?.place_id ?? null,
    place_name: event?.place_name ?? '',
    description: event?.description ?? '',
  };
}

export default function EventTimeline({ events, onSaveEvent, onDeleteEvent }: EventTimelineProps) {
  const [editorState, setEditorState] = useState<{ id: string | null; draft: EventDraft } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const sortedEvents = useMemo(
    () =>
      [...events].sort((left, right) => {
        const leftKey = `${left.date_sort ?? ''}${left.date_text ?? ''}${left.id}`;
        const rightKey = `${right.date_sort ?? ''}${right.date_text ?? ''}${right.id}`;
        return leftKey.localeCompare(rightKey);
      }),
    [events],
  );

  const openEditor = (event?: PersonEvent) => {
    setEditorState({ id: event?.id ?? null, draft: createDraft(event) });
  };

  const closeEditor = () => {
    setEditorState(null);
  };

  const handleSubmit = async () => {
    if (!editorState) {
      return;
    }

    setIsBusy(true);
    try {
      await onSaveEvent({
        eventId: editorState.id ?? undefined,
        data: {
          event_type: editorState.draft.event_type,
          date_text: editorState.draft.date_text.trim() || null,
          place_id: editorState.draft.place_id,
          description: editorState.draft.description.trim() || null,
        },
      });
      closeEditor();
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="rerooted-section">
      <div className="rerooted-section-header">
        <h3>Ereignisse</h3>
        <button type="button" className="rerooted-secondary-button" onClick={() => openEditor()}>
          + Ereignis hinzufügen
        </button>
      </div>

      <div className="rerooted-timeline">
        {sortedEvents.map((event) => (
          <article key={event.id} className="rerooted-timeline-item">
            <div className="rerooted-timeline-icon">{EVENT_ICONS[event.event_type] ?? EVENT_ICONS.other}</div>
            <div className="rerooted-timeline-copy">
              <div className="rerooted-timeline-main">
                <strong>{formatEventTypeLabel(event.event_type)}</strong>
                <span>
                  {event.date_text ?? 'Datum offen'}
                  {event.place_name ? ` | ${event.place_name}` : ''}
                </span>
              </div>
              {event.description ? <p>{event.description}</p> : null}
            </div>
            <div className="rerooted-timeline-actions">
              <button type="button" className="rerooted-inline-button" onClick={() => openEditor(event)}>
                ✎ Bearbeiten
              </button>
              <button
                type="button"
                className="rerooted-inline-button is-danger"
                onClick={() => void onDeleteEvent(event.id)}
              >
                🗑 Löschen
              </button>
            </div>
          </article>
        ))}
      </div>

      {editorState ? (
        <div className="rerooted-inline-form">
          <label className="rerooted-field">
            <span>Typ</span>
            <select
              className="rerooted-input"
              value={editorState.draft.event_type}
              onChange={(event) =>
                setEditorState((current) =>
                  current
                    ? { ...current, draft: { ...current.draft, event_type: event.target.value } }
                    : current,
                )
              }
            >
              {EVENT_OPTIONS.map((eventType) => (
                <option key={eventType.value} value={eventType.value}>
                  {eventType.label}
                </option>
              ))}
            </select>
          </label>

          <label className="rerooted-field">
            <span>Datum</span>
            <FlexDateInput
              value={editorState.draft.date_text}
              onChange={(value) =>
                setEditorState((current) =>
                  current ? { ...current, draft: { ...current.draft, date_text: value } } : current,
                )
              }
            />
          </label>

          <label className="rerooted-field">
            <span>Ort</span>
            <PlaceAutocomplete
              value={editorState.draft.place_name}
              placeId={editorState.draft.place_id}
              onChange={(value) =>
                setEditorState((current) =>
                  current ? { ...current, draft: { ...current.draft, place_name: value, place_id: null } } : current,
                )
              }
              onSelect={(place) =>
                setEditorState((current) =>
                  current
                    ? {
                        ...current,
                        draft: {
                          ...current.draft,
                          place_id: place.id,
                          place_name: place.full_name ?? place.name,
                        },
                      }
                    : current,
                )
              }
            />
          </label>

          <label className="rerooted-field">
            <span>Beschreibung</span>
            <textarea
              className="rerooted-input rerooted-textarea"
              rows={3}
              value={editorState.draft.description}
              onChange={(event) =>
                setEditorState((current) =>
                  current
                    ? { ...current, draft: { ...current.draft, description: event.target.value } }
                    : current,
                )
              }
            />
          </label>

          <div className="rerooted-inline-form-actions">
            <button type="button" className="rerooted-secondary-button" onClick={closeEditor}>
              Abbrechen
            </button>
            <button type="button" className="rerooted-primary-button" onClick={() => void handleSubmit()}>
              {isBusy ? 'Speichere…' : 'Speichern'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
