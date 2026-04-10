import { motion } from 'framer-motion';

type LoadingSpinnerProps = {
  label?: string;
  compact?: boolean;
};

export default function LoadingSpinner({
  label = 'Lade Stammbaum…',
  compact = false,
}: LoadingSpinnerProps) {
  return (
    <div className={`rerooted-centered-state${compact ? ' rerooted-centered-state--inline' : ''}`}>
      <div className="rerooted-loading-stack">
        <motion.div
          className="rerooted-spinner rerooted-spinner--motion"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          aria-hidden="true"
        />
        <span className="rerooted-field-hint">{label}</span>
      </div>
    </div>
  );
}
