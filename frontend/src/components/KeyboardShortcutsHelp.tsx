import { AnimatePresence, motion } from 'framer-motion';

const SHORTCUTS = [
  ['Ctrl/Cmd + 0', 'Baum einpassen'],
  ['Ctrl/Cmd + +', 'Zoom in'],
  ['Ctrl/Cmd + -', 'Zoom out'],
  ['Ctrl/Cmd + F', 'Suche fokussieren'],
  ['Ctrl/Cmd + N', 'Neue Person anlegen'],
  ['Esc', 'Panel, Menü oder Popover schließen'],
  ['?', 'Shortcut-Hilfe öffnen'],
] as const;

type KeyboardShortcutsHelpProps = {
  open: boolean;
  onClose: () => void;
};

export default function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="rerooted-dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="rerooted-dialog rerooted-shortcuts-modal"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
          >
            <div className="rerooted-section-header">
              <h3>Keyboard-Shortcuts</h3>
              <button type="button" className="rerooted-toolbar-button" onClick={onClose}>
                ×
              </button>
            </div>
            <table className="rerooted-shortcuts-table">
              <tbody>
                {SHORTCUTS.map(([shortcut, description]) => (
                  <tr key={shortcut}>
                    <td>{shortcut}</td>
                    <td>{description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
