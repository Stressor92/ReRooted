import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactFlow, useStore } from '@xyflow/react';
import { useCsvExport } from '../hooks/useCsvExport';
import { useGedcomExport } from '../hooks/useGedcom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import CanvasSearch from './CanvasSearch';
import BackgroundPicker from './BackgroundPicker';
import ExportPicker from './ExportPicker';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';
import TemplatePicker from './TemplatePicker';

type CanvasToolbarProps = {
  layoutDir: 'TB' | 'LR';
  query: string;
  resultCount: number;
  onQueryChange: (value: string) => void;
  onFocusMatch: () => void;
  onOpenQuickAdd: () => void;
  onChangeLayoutDir: (dir: 'TB' | 'LR') => void;
  onRelayout: () => void;
};

export default function CanvasToolbar({
  layoutDir,
  query,
  resultCount,
  onQueryChange,
  onFocusMatch,
  onOpenQuickAdd,
  onChangeLayoutDir,
  onRelayout,
}: CanvasToolbarProps) {
  const navigate = useNavigate();
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow();
  const zoom = useStore((store) => store.transform[2] ?? 1);
  const gedcomExport = useGedcomExport();
  const csvExport = useCsvExport();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const zoomPercent = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom]);

  const handleFitCanvas = () =>
    void fitView({
      duration: 220,
      padding: 0.24,
      minZoom: 0.16,
      maxZoom: 0.9,
    });

  const focusSearch = () => {
    const input = document.querySelector<HTMLInputElement>('.rerooted-toolbar-search');
    input?.focus();
    input?.select();
  };

  useKeyboardShortcuts({
    'ctrl+0': handleFitCanvas,
    'ctrl++': () => void zoomIn({ duration: 150 }),
    'ctrl+=': () => void zoomIn({ duration: 150 }),
    'ctrl+-': () => void zoomOut({ duration: 150 }),
    'ctrl+f': focusSearch,
    'ctrl+n': onOpenQuickAdd,
    escape: () => {
      setMobileOpen(false);
      setHelpOpen(false);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    },
    '?': () => {
      setMobileOpen(false);
      setHelpOpen(true);
    },
  });

  const toolbarGroups = (
    <>
      <div className="rerooted-toolbar-row rerooted-toolbar-row--primary">
        <div className="rerooted-toolbar-group">
          <button type="button" className="rerooted-toolbar-button" onClick={() => void zoomOut({ duration: 150 })}>
            −
          </button>
          <button type="button" className="rerooted-toolbar-button is-wide" onClick={() => void zoomTo(1, { duration: 150 })}>
            {zoomPercent}
          </button>
          <button type="button" className="rerooted-toolbar-button" onClick={() => void zoomIn({ duration: 150 })}>
            +
          </button>
          <button type="button" className="rerooted-toolbar-button" onClick={handleFitCanvas}>
            ⊡ Fit
          </button>
        </div>

        <div className="rerooted-toolbar-group">
          <button
            type="button"
            className={`rerooted-toolbar-button${layoutDir === 'TB' ? ' is-active' : ''}`}
            onClick={() => onChangeLayoutDir('TB')}
          >
            ↕ TB
          </button>
          <button
            type="button"
            className={`rerooted-toolbar-button${layoutDir === 'LR' ? ' is-active' : ''}`}
            onClick={() => onChangeLayoutDir('LR')}
          >
            ↔ LR
          </button>
          <button type="button" className="rerooted-toolbar-button" onClick={onRelayout} title="Neu anordnen">
            ⟳
          </button>
        </div>

        <div className="rerooted-toolbar-group">
          <TemplatePicker />
          <BackgroundPicker />
        </div>
      </div>

      <div className="rerooted-toolbar-row rerooted-toolbar-row--secondary">
        <div className="rerooted-toolbar-group rerooted-toolbar-group--search">
          <button type="button" className="rerooted-toolbar-button is-primary" onClick={onOpenQuickAdd}>
            + Person
          </button>
          <CanvasSearch
            query={query}
            resultCount={resultCount}
            onQueryChange={onQueryChange}
            onFocusMatch={onFocusMatch}
          />
        </div>

        <div className="rerooted-toolbar-group rerooted-toolbar-group--actions">
          <button type="button" className="rerooted-toolbar-button" onClick={() => navigate('/import')}>
            ↑ GED
          </button>
          <button
            type="button"
            className="rerooted-toolbar-button"
            onClick={() => gedcomExport.mutate()}
            disabled={gedcomExport.isPending}
          >
            {gedcomExport.isPending ? '… Export' : '↓ GED'}
          </button>
          <button
            type="button"
            className="rerooted-toolbar-button"
            onClick={() => csvExport.mutate()}
            disabled={csvExport.isPending}
            title="Als CSV exportieren (Excel-kompatibel)"
          >
            {csvExport.isPending ? '… CSV' : '↓ CSV'}
          </button>
          <ExportPicker />
          <button
            type="button"
            className="rerooted-toolbar-button"
            onClick={() => {
              setMobileOpen(false);
              setHelpOpen(true);
            }}
            title="Shortcuts anzeigen"
          >
            ?
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="rerooted-canvas-toolbar">{toolbarGroups}</div>

      <button type="button" className="rerooted-toolbar-fab" onClick={() => setMobileOpen(true)}>
        ☰
      </button>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              className="rerooted-toolbar-sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="rerooted-toolbar-sheet"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
            >
              <div className="rerooted-toolbar-sheet-header">
                <strong>Canvas-Werkzeuge</strong>
                <button type="button" className="rerooted-toolbar-button" onClick={() => setMobileOpen(false)}>
                  ×
                </button>
              </div>
              <div className="rerooted-toolbar-sheet-body">{toolbarGroups}</div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
