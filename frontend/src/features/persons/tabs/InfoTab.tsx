import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { PersonDetail, PersonEvent } from '../../../api/persons';
import EventTimeline from '../../../components/EventTimeline';
import FlexDateInput from '../../../components/FlexDateInput';
import PlaceAutocomplete from '../../../components/PlaceAutocomplete';
import { useDeleteEvent, useSaveEvent, useUpdatePerson } from '../../../hooks/usePersonMutations';

type InfoTabProps = {
  person: PersonDetail;
};

type DraftState = {
  first_name: string;
  last_name: string;
  is_living: boolean | null;
  description: string;
  current_address: string;
  phone_number: string;
  birth_place_id: string | null;
  birth_place_name: string;
  birth_date_text: string;
  death_place_id: string | null;
  death_place_name: string;
  death_date_text: string;
};

type RelationshipRecord = {
  id: string;
  person1_id: string;
  person2_id?: string | null;
  rel_type: 'partner' | 'ex' | 'adoption' | 'foster' | 'unknown';
  start_date?: string | null;
  end_date?: string | null;
  child_ids: string[];
};

type PersonLookup = {
  id: string;
  first_name: string;
  last_name: string;
};

function getPrimaryEvent(events: PersonEvent[], eventType: string): PersonEvent | undefined {
  return events.find((event) => event.event_type === eventType);
}

function buildDraft(person: PersonDetail): DraftState {
  const birthEvent = getPrimaryEvent(person.events, 'birth');
  const deathEvent = getPrimaryEvent(person.events, 'death');

  return {
    first_name: person.first_name,
    last_name: person.last_name,
    is_living: person.is_living,
    description: person.description ?? '',
    current_address: person.current_address ?? '',
    phone_number: person.phone_number ?? '',
    birth_place_id: (birthEvent?.place_id as string | null | undefined) ?? person.birth_place_id ?? null,
    birth_place_name: birthEvent?.place_name ?? person.birth_place?.full_name ?? person.birth_place?.name ?? '',
    birth_date_text: birthEvent?.date_text ?? '',
    death_place_id: (deathEvent?.place_id as string | null | undefined) ?? null,
    death_place_name: deathEvent?.place_name ?? '',
    death_date_text: deathEvent?.date_text ?? '',
  };
}

export default function InfoTab({ person }: InfoTabProps) {
  const updatePerson = useUpdatePerson(person.id);
  const saveEvent = useSaveEvent(person.id);
  const deleteEvent = useDeleteEvent(person.id);
  const [descriptionPreview, setDescriptionPreview] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [draft, setDraft] = useState<DraftState>(() => buildDraft(person));
  const lastSavedRef = useRef<string>(JSON.stringify(buildDraft(person)));
  const { data: relationshipSummary = [] } = useQuery({
    queryKey: ['person-relationships', person.id],
    queryFn: async () => {
      const [relationships, persons] = await Promise.all([
        apiClient.get('/relationships', { params: { person_id: person.id } }).then((response) => response.data as RelationshipRecord[]),
        apiClient.get('/persons').then((response) => response.data as PersonLookup[]),
      ]);

      const people = new Map(persons.map((entry) => [entry.id, `${entry.first_name} ${entry.last_name}`.trim()]));
      return relationships.map((relationship) => {
        const isChildInFamily = relationship.child_ids.includes(person.id);
        const partnerIds = [relationship.person1_id, relationship.person2_id].filter(
          (value): value is string => Boolean(value) && value !== person.id,
        );
        const partnerNames = partnerIds.map((id) => people.get(id) ?? 'Unbekannte Person');
        const childCount = relationship.child_ids.filter((id) => id !== person.id).length;

        const label = isChildInFamily
          ? `Kind von ${partnerNames.join(' & ') || 'Eltern'}`
          : relationship.person2_id
            ? `${relationship.rel_type === 'ex' ? 'Ex-Partnerschaft' : 'Partnerschaft'} mit ${partnerNames[0] ?? 'Unbekannt'}`
            : `${relationship.rel_type === 'adoption' ? 'Adoptions-' : relationship.rel_type === 'foster' ? 'Pflege-' : ''}Familie`;

        const meta = [relationship.start_date, relationship.end_date].filter(Boolean).join(' – ');
        return {
          id: relationship.id,
          label,
          meta: [meta, childCount ? `${childCount} Kind(er)` : null].filter(Boolean).join(' · '),
        };
      });
    },
    staleTime: 30_000,
  });

  const birthEvent = useMemo(() => getPrimaryEvent(person.events, 'birth'), [person.events]);
  const deathEvent = useMemo(() => getPrimaryEvent(person.events, 'death'), [person.events]);

  useEffect(() => {
    const nextDraft = buildDraft(person);
    setDraft(nextDraft);
    lastSavedRef.current = JSON.stringify(nextDraft);
  }, [person]);

  const syncEvent = useCallback(
    async (
      existingEvent: PersonEvent | undefined,
      eventType: 'birth' | 'death',
      values: { date_text: string; place_id: string | null },
    ) => {
      const hasContent = Boolean(values.date_text.trim() || values.place_id);
      if (!existingEvent && !hasContent) {
        return;
      }

      await saveEvent.mutateAsync({
        eventId: existingEvent?.id,
        data: {
          event_type: eventType,
          date_text: values.date_text.trim() || null,
          place_id: values.place_id,
          description: existingEvent?.description ?? null,
        },
      });
    },
    [saveEvent],
  );

  const persistDraft = useCallback(async () => {
    const personPayload: Record<string, unknown> = {};

    if (draft.first_name.trim() !== person.first_name) {
      personPayload.first_name = draft.first_name.trim() || person.first_name;
    }
    if (draft.last_name.trim() !== person.last_name) {
      personPayload.last_name = draft.last_name.trim() || person.last_name;
    }
    if (draft.is_living !== person.is_living) {
      personPayload.is_living = draft.is_living;
    }
    if ((draft.description || '') !== (person.description ?? '')) {
      personPayload.description = draft.description.trim() || null;
    }
    if ((draft.current_address || '') !== (person.current_address ?? '')) {
      personPayload.current_address = draft.current_address.trim() || null;
    }
    if ((draft.phone_number || '') !== (person.phone_number ?? '')) {
      personPayload.phone_number = draft.phone_number.trim() || null;
    }
    if ((draft.birth_place_id ?? null) !== (person.birth_place_id ?? null)) {
      personPayload.birth_place_id = draft.birth_place_id;
    }

    if (Object.keys(personPayload).length > 0) {
      await updatePerson.mutateAsync(personPayload);
    }

    await syncEvent(birthEvent, 'birth', {
      date_text: draft.birth_date_text,
      place_id: draft.birth_place_id,
    });

    if (draft.is_living !== true || draft.death_date_text || draft.death_place_id) {
      await syncEvent(deathEvent, 'death', {
        date_text: draft.death_date_text,
        place_id: draft.death_place_id,
      });
    }
  }, [birthEvent, deathEvent, draft, person, syncEvent, updatePerson]);

  useEffect(() => {
    const serialized = JSON.stringify(draft);
    if (serialized === lastSavedRef.current) {
      return undefined;
    }

    setSaveState('saving');

    const timer = window.setTimeout(() => {
      void persistDraft()
        .then(() => {
          lastSavedRef.current = serialized;
          setSaveState('saved');
          window.setTimeout(() => setSaveState('idle'), 2000);
        })
        .catch(() => {
          setSaveState('error');
        });
    }, 800);

    return () => window.clearTimeout(timer);
  }, [draft, persistDraft]);

  return (
    <div className="rerooted-tab-stack">
      <section className="rerooted-section">
        <div className="rerooted-section-header">
          <h3>Persönliche Informationen</h3>
          <span className={`rerooted-save-pill is-${saveState}`}>
            {saveState === 'saving'
              ? 'Speichert…'
              : saveState === 'saved'
                ? '✓ Gespeichert'
                : saveState === 'error'
                  ? 'Speichern fehlgeschlagen'
                  : 'Auto-Save aktiv'}
          </span>
        </div>

        <div className="rerooted-form-grid">
          <label className="rerooted-field">
            <span>Vorname</span>
            <input
              className="rerooted-input"
              value={draft.first_name}
              onChange={(event) => setDraft((current) => ({ ...current, first_name: event.target.value }))}
            />
          </label>

          <label className="rerooted-field">
            <span>Nachname</span>
            <input
              className="rerooted-input"
              value={draft.last_name}
              onChange={(event) => setDraft((current) => ({ ...current, last_name: event.target.value }))}
            />
          </label>

          <label className="rerooted-field">
            <span>Aktuelle Adresse</span>
            <input
              className="rerooted-input"
              value={draft.current_address}
              onChange={(event) => setDraft((current) => ({ ...current, current_address: event.target.value }))}
            />
          </label>

          <label className="rerooted-field">
            <span>Telefonnr.</span>
            <input
              className="rerooted-input"
              value={draft.phone_number}
              onChange={(event) => setDraft((current) => ({ ...current, phone_number: event.target.value }))}
            />
          </label>

          <label className="rerooted-field">
            <span>Geburtsdatum</span>
            <FlexDateInput
              value={draft.birth_date_text}
              onChange={(value) => setDraft((current) => ({ ...current, birth_date_text: value }))}
            />
          </label>

          <label className="rerooted-field">
            <span>Geburtsort</span>
            <PlaceAutocomplete
              value={draft.birth_place_name}
              placeId={draft.birth_place_id}
              onChange={(value) =>
                setDraft((current) => ({ ...current, birth_place_name: value, birth_place_id: null }))
              }
              onSelect={(place) =>
                setDraft((current) => ({
                  ...current,
                  birth_place_id: place.id,
                  birth_place_name: (place.full_name as string | null | undefined) ?? place.name,
                }))
              }
            />
          </label>

          {draft.is_living !== true ? (
            <>
              <label className="rerooted-field">
                <span>Sterbedatum</span>
                <FlexDateInput
                  value={draft.death_date_text}
                  onChange={(value) => setDraft((current) => ({ ...current, death_date_text: value }))}
                />
              </label>

              <label className="rerooted-field">
                <span>Sterbeort</span>
                <PlaceAutocomplete
                  value={draft.death_place_name}
                  placeId={draft.death_place_id}
                  onChange={(value) =>
                    setDraft((current) => ({ ...current, death_place_name: value, death_place_id: null }))
                  }
                  onSelect={(place) =>
                    setDraft((current) => ({
                      ...current,
                      death_place_id: place.id,
                      death_place_name: (place.full_name as string | null | undefined) ?? place.name,
                    }))
                  }
                />
              </label>
            </>
          ) : null}
        </div>

        <div className="rerooted-field">
          <span>Lebt / Verstorben</span>
          <div className="rerooted-toggle-group">
            <button
              type="button"
              className={`rerooted-toggle-option${draft.is_living === null ? ' is-active' : ''}`}
              onClick={() => setDraft((current) => ({ ...current, is_living: null }))}
            >
              ?
            </button>
            <button
              type="button"
              className={`rerooted-toggle-option${draft.is_living === true ? ' is-active' : ''}`}
              onClick={() => setDraft((current) => ({ ...current, is_living: true }))}
            >
              ✓ Lebt
            </button>
            <button
              type="button"
              className={`rerooted-toggle-option${draft.is_living === false ? ' is-active' : ''}`}
              onClick={() => setDraft((current) => ({ ...current, is_living: false }))}
            >
              † Verstorben
            </button>
          </div>
        </div>

        <label className="rerooted-field">
          <div className="rerooted-inline-label-row">
            <span>Lebensgeschichte</span>
            <button
              type="button"
              className="rerooted-inline-button"
              onClick={() => setDescriptionPreview((current) => !current)}
            >
              {descriptionPreview ? 'Editieren' : 'Markdown-Preview'}
            </button>
          </div>

          {descriptionPreview ? (
            <div className="rerooted-markdown-preview">{draft.description || 'Noch keine Lebensgeschichte.'}</div>
          ) : (
            <textarea
              className="rerooted-input rerooted-textarea"
              rows={6}
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            />
          )}
        </label>
      </section>

      <section className="rerooted-section">
        <div className="rerooted-section-header">
          <h3>Beziehungen</h3>
          <span className="rerooted-field-hint">Read-only Übersicht der verknüpften Familienbeziehungen</span>
        </div>

        <div className="rerooted-source-list">
          {relationshipSummary.length ? (
            relationshipSummary.map((relationship) => (
              <article key={relationship.id} className="rerooted-source-item">
                <div>
                  <strong>{relationship.label}</strong>
                  <div className="rerooted-field-hint">{relationship.meta || 'Ohne Datumsangabe'}</div>
                </div>
              </article>
            ))
          ) : (
            <div className="rerooted-field-hint">Noch keine Beziehungen erfasst.</div>
          )}
        </div>
      </section>

      <EventTimeline
        events={person.events}
        onSaveEvent={(payload) => saveEvent.mutateAsync(payload)}
        onDeleteEvent={(eventId) => deleteEvent.mutateAsync(eventId)}
      />
    </div>
  );
}
