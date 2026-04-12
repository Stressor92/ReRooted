import FlexDateInput from '../../../components/FlexDateInput';

export const REL_TYPES = [
  { value: 'partner', label: 'Ehe / Partnerschaft', icon: '♥', color: '#1D9E75' },
  { value: 'ex', label: 'Ex-Partnerschaft', icon: '♡', color: '#1D9E75' },
  { value: 'sibling', label: 'Geschwister', icon: '↔', color: '#4F6BFF' },
  { value: 'biological', label: 'Biologisch (Kind)', icon: '⬇', color: '#888780' },
  { value: 'adoption', label: 'Adoption', icon: '⟳', color: '#BA7517' },
  { value: 'foster', label: 'Pflegekind', icon: '⌂', color: '#D85A30' },
  { value: 'unknown', label: 'Unbekannt', icon: '?', color: '#B4B2A9' },
] as const;

export type RelationshipTypeValue = (typeof REL_TYPES)[number]['value'];

type RelationshipFormProps = {
  title?: string;
  submitLabel?: string;
  selectedType: RelationshipTypeValue;
  startDate: string;
  endDate: string;
  isPending: boolean;
  showDelete?: boolean;
  onSelectType: (value: RelationshipTypeValue) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onSubmit: () => void;
};

export default function RelationshipForm({
  title = 'Beziehung anlegen',
  submitLabel = 'Beziehung anlegen',
  selectedType,
  startDate,
  endDate,
  isPending,
  showDelete = false,
  onSelectType,
  onStartDateChange,
  onEndDateChange,
  onCancel,
  onDelete,
  onSubmit,
}: RelationshipFormProps) {
  return (
    <div className="rerooted-relationship-form">
      <div className="rerooted-section-header">
        <h3>{title}</h3>
      </div>

      <div className="rerooted-relationship-grid">
        {REL_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            className={`rerooted-relationship-card${selectedType === type.value ? ' is-active' : ''}`}
            onClick={() => onSelectType(type.value)}
            style={{ '--relation-color': type.color } as React.CSSProperties}
          >
            <span className="rerooted-relationship-card-icon">{type.icon}</span>
            <strong>{type.label}</strong>
          </button>
        ))}
      </div>

      <div className="rerooted-form-grid is-compact">
        <label className="rerooted-field">
          <span>Von</span>
          <FlexDateInput value={startDate} onChange={onStartDateChange} placeholder="Beginn" />
        </label>
        <label className="rerooted-field">
          <span>Bis</span>
          <FlexDateInput value={endDate} onChange={onEndDateChange} placeholder="Ende" />
        </label>
      </div>

      <div className="rerooted-inline-form-actions">
        {showDelete ? (
          <button type="button" className="rerooted-danger-button" onClick={onDelete}>
            Löschen
          </button>
        ) : null}
        <button type="button" className="rerooted-secondary-button" onClick={onCancel}>
          Abbrechen
        </button>
        <button type="button" className="rerooted-primary-button" onClick={onSubmit}>
          {isPending ? 'Speichere…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
