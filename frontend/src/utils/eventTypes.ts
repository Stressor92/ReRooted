export type EventOption = {
  value: string;
  label: string;
  icon: string;
};

export const EVENT_OPTIONS: EventOption[] = [
  { value: 'birth', label: 'Geburt', icon: '★' },
  { value: 'death', label: 'Tot', icon: '†' },
  { value: 'engagement', label: 'Verlobung', icon: '♡' },
  { value: 'marriage', label: 'Hochzeit', icon: '♥' },
  { value: 'divorce', label: 'Scheidung', icon: '⚡' },
  { value: 'baptism', label: 'Taufe', icon: '✟' },
  { value: 'academic_degree', label: 'Akademischer Grad', icon: '🎓' },
  { value: 'retirement', label: 'Ruhestand', icon: '⌂' },
  { value: 'move', label: 'Umzug', icon: '⇄' },
  { value: 'emigration', label: 'Auswanderung', icon: '↗' },
  { value: 'displacement', label: 'Flucht/Vertreibung', icon: '⚠' },
  { value: 'imprisonment', label: 'Gefängnis', icon: '⛓' },
  { value: 'adoption', label: 'Adoption', icon: '◎' },
  { value: 'other', label: 'Anderes', icon: '·' },
];

export const EVENT_ICONS: Record<string, string> = {
  birth: '★',
  death: '†',
  engagement: '♡',
  marriage: '♥',
  divorce: '⚡',
  baptism: '✟',
  academic_degree: '🎓',
  retirement: '⌂',
  move: '⇄',
  emigration: '↗',
  displacement: '⚠',
  imprisonment: '⛓',
  adoption: '◎',
  other: '·',
  immigration: '↙',
  occupation: '⚒',
  residence: '⌂',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  birth: 'Geburt',
  death: 'Tot',
  engagement: 'Verlobung',
  marriage: 'Hochzeit',
  divorce: 'Scheidung',
  baptism: 'Taufe',
  academic_degree: 'Akademischer Grad',
  retirement: 'Ruhestand',
  move: 'Umzug',
  emigration: 'Auswanderung',
  displacement: 'Flucht/Vertreibung',
  imprisonment: 'Gefängnis',
  adoption: 'Adoption',
  other: 'Anderes',
  immigration: 'Einwanderung',
  occupation: 'Beruf',
  residence: 'Wohnort',
};

export function formatEventTypeLabel(eventType: string): string {
  return (
    EVENT_TYPE_LABELS[eventType]
    ?? eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function formatEventLabel(event: { event_type: string; date_text?: string | null }): string {
  const label = formatEventTypeLabel(event.event_type);
  return event.date_text ? `${label} · ${event.date_text}` : label;
}
