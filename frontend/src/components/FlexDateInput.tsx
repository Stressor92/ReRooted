import { useMemo } from 'react';

type FlexDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function getQualifier(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith('ca.')) {
    return '[~]';
  }
  if (normalized.startsWith('vor')) {
    return '[<]';
  }
  return null;
}

function getWarning(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const yearMatch = normalized.match(/\b\d{5,}\b/);
  if (yearMatch) {
    return 'Jahreszahl wirkt zu lang.';
  }

  const dateMatch = normalized.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dateMatch) {
    const month = Number(dateMatch[2]);
    if (month > 12) {
      return 'Monat scheint ungültig zu sein.';
    }
  }

  return null;
}

export default function FlexDateInput({
  value,
  onChange,
  placeholder = 'z.B. 15.04.1923 · ca. 1920 · vor 1900',
  disabled = false,
}: FlexDateInputProps) {
  const qualifier = useMemo(() => getQualifier(value), [value]);
  const warning = useMemo(() => getWarning(value), [value]);

  return (
    <div>
      <div className="rerooted-flexdate-input">
        <span className={`rerooted-flexdate-badge${qualifier ? ' is-active' : ''}`}>{qualifier ?? '[]'}</span>
        <input
          className="rerooted-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
      {warning ? <div className="rerooted-field-hint is-warning">{warning}</div> : null}
    </div>
  );
}
