import { motion } from 'framer-motion';

type EmptyStateProps = {
  onCreateFirstPerson: () => void;
  onImportGedcom: () => void;
};

export default function EmptyState({ onCreateFirstPerson, onImportGedcom }: EmptyStateProps) {
  return (
    <motion.div
      className="rerooted-empty-state"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="rerooted-empty-icon" aria-hidden="true">
        🌳
      </div>
      <h2>Dein Stammbaum ist noch leer</h2>
      <p>Füge die erste Person hinzu oder importiere einen bestehenden Stammbaum.</p>
      <div className="rerooted-empty-actions">
        <button type="button" className="rerooted-primary-button" onClick={onCreateFirstPerson}>
          + Erste Person anlegen
        </button>
        <button type="button" className="rerooted-secondary-button" onClick={onImportGedcom}>
          ↑ GEDCOM importieren
        </button>
      </div>
    </motion.div>
  );
}
