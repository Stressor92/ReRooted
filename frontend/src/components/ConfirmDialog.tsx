import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  isPending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="rerooted-dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="rerooted-dialog"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rerooted-dialog-title">{title}</div>
            <div className="rerooted-dialog-message">{message}</div>
            <div className="rerooted-dialog-actions">
              <button type="button" className="rerooted-secondary-button" onClick={onClose}>
                {cancelLabel}
              </button>
              <button
                type="button"
                className="rerooted-danger-button"
                onClick={() => void onConfirm()}
                disabled={isPending}
              >
                {isPending ? 'Lösche…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
