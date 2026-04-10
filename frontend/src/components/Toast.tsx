import { motion } from 'framer-motion';
import type { ToastItem } from '../hooks/useToast';

type ToastProps = {
  toast: ToastItem;
  onClose: (id: string) => void;
};

const TOAST_ICONS: Record<ToastItem['type'], string> = {
  success: '✓',
  error: '⚠',
  info: 'ℹ',
};

export default function Toast({ toast, onClose }: ToastProps) {
  return (
    <motion.div
      className={`rerooted-toast rerooted-toast--${toast.type}`}
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 16, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <span className="rerooted-toast-icon">{TOAST_ICONS[toast.type]}</span>
      <span className="rerooted-toast-message">{toast.message}</span>
      <button type="button" className="rerooted-toast-close" onClick={() => onClose(toast.id)}>
        ×
      </button>
    </motion.div>
  );
}
