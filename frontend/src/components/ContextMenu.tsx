import { AnimatePresence, motion } from 'framer-motion';
import type { ContextMenuState } from '../hooks/useContextMenu';

type ContextMenuProps = {
  menu: ContextMenuState;
  onAddChild: (nodeId: string) => void;
  onAddPartner: (nodeId: string) => void;
  onAddParent: (nodeId: string) => void;
  onAddSibling: (nodeId: string) => void;
  onOpenDetails: (nodeId: string) => void;
  onDeletePerson: (nodeId: string) => void;
};

export default function ContextMenu({
  menu,
  onAddChild,
  onAddPartner,
  onAddParent,
  onAddSibling,
  onOpenDetails,
  onDeletePerson,
}: ContextMenuProps) {
  return (
    <AnimatePresence>
      {menu ? (
        <motion.div
          className="rerooted-context-menu"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ left: menu.x, top: menu.y, transformOrigin: 'top left' }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" className="rerooted-context-action" onClick={() => onAddChild(menu.nodeId)}>
            + Kind hinzufügen
          </button>
          <button type="button" className="rerooted-context-action" onClick={() => onAddPartner(menu.nodeId)}>
            + Partner hinzufügen
          </button>
          <button type="button" className="rerooted-context-action" onClick={() => onAddParent(menu.nodeId)}>
            + Elternteil hinzufügen
          </button>
          <button type="button" className="rerooted-context-action" onClick={() => onAddSibling(menu.nodeId)}>
            + Geschwister hinzufügen
          </button>
          <div className="rerooted-context-separator" />
          <button type="button" className="rerooted-context-action" onClick={() => onOpenDetails(menu.nodeId)}>
            ✎ Details öffnen
          </button>
          <button type="button" className="rerooted-context-action is-danger" onClick={() => onDeletePerson(menu.nodeId)}>
            🗑 Person löschen
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
