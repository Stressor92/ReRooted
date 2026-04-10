import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type LightboxItem = {
  src: string;
  alt: string;
  caption?: string | null;
};

type LightboxProps = {
  open: boolean;
  items: LightboxItem[];
  initialIndex?: number;
  onClose: () => void;
};

export default function Lightbox({ open, items, initialIndex = 0, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
    }
  }, [initialIndex, open]);

  useEffect(() => {
    if (!open || items.length === 0) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'ArrowRight' && items.length > 1) {
        setIndex((current) => (current + 1) % items.length);
      }
      if (event.key === 'ArrowLeft' && items.length > 1) {
        setIndex((current) => (current - 1 + items.length) % items.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length, onClose, open]);

  const currentItem = items[index];

  return (
    <AnimatePresence>
      {open && currentItem ? (
        <motion.div
          className="rerooted-lightbox-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="rerooted-lightbox"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            {items.length > 1 ? (
              <>
                <button
                  type="button"
                  className="rerooted-lightbox-nav is-left"
                  onClick={() => setIndex((current) => (current - 1 + items.length) % items.length)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="rerooted-lightbox-nav is-right"
                  onClick={() => setIndex((current) => (current + 1) % items.length)}
                >
                  ›
                </button>
              </>
            ) : null}

            <button type="button" className="rerooted-lightbox-close" onClick={onClose}>
              ×
            </button>

            <img className="rerooted-lightbox-image" src={currentItem.src} alt={currentItem.alt} />
            {currentItem.caption ? <div className="rerooted-lightbox-caption">{currentItem.caption}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
