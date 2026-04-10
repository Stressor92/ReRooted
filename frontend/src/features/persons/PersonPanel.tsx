import * as Tabs from '@radix-ui/react-tabs';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { usePerson } from '../../hooks/usePerson';
import { useDeletePerson } from '../../hooks/usePersonMutations';
import DocumentsTab from './tabs/DocumentsTab';
import InfoTab from './tabs/InfoTab';
import PhotosTab from './tabs/PhotosTab';
import SourcesTab from './tabs/SourcesTab';
import type { QuickAddPreset } from './forms/QuickAddPopover';
import PersonPanelHeader from './PersonPanelHeader';

const VARIANTS = {
  hidden: {
    x: 420,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: {
    x: 420,
    opacity: 0,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
} as const;

export type PersonPanelTab = 'info' | 'photos' | 'documents' | 'sources';

type PersonPanelProps = {
  personId: string;
  activeTab?: PersonPanelTab;
  onActiveTabChange?: (tab: PersonPanelTab) => void;
  onCreateRelative?: (kind: QuickAddPreset['relationshipKind']) => void;
  onClose: () => void;
};

export default function PersonPanel({
  personId,
  activeTab = 'info',
  onActiveTabChange,
  onCreateRelative,
  onClose,
}: PersonPanelProps) {
  const { data: person, isPending, error } = usePerson(personId);
  const deletePerson = useDeletePerson(personId);
  const [currentTab, setCurrentTab] = useState<PersonPanelTab>(activeTab);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const tabContent = useMemo(() => {
    if (!person) {
      return null;
    }

    switch (currentTab) {
      case 'photos':
        return <PhotosTab person={person} />;
      case 'documents':
        return <DocumentsTab person={person} />;
      case 'sources':
        return <SourcesTab person={person} />;
      case 'info':
      default:
        return <InfoTab person={person} />;
    }
  }, [currentTab, person]);

  return (
    <>
      <motion.div
        className="rerooted-panel-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.aside
        className="rerooted-person-panel"
        variants={VARIANTS}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(event) => event.stopPropagation()}
      >
        {isPending ? (
          <div className="rerooted-panel-loading">
            <div className="rerooted-spinner" aria-hidden="true" />
          </div>
        ) : error ? (
          <div className="rerooted-state-card">
            <strong>Personendaten konnten nicht geladen werden.</strong>
            <span>{error instanceof Error ? error.message : 'Unbekannter Fehler'}</span>
          </div>
        ) : person ? (
          <>
            <PersonPanelHeader
              person={person}
              onClose={onClose}
              onFocusInfo={() => {
                setCurrentTab('info');
                onActiveTabChange?.('info');
              }}
              onDeleteRequest={() => setConfirmDeleteOpen(true)}
              onCreateRelative={onCreateRelative}
            />

            <Tabs.Root
              className="rerooted-tabs-root"
              value={currentTab}
              onValueChange={(value) => {
                const nextValue = value as PersonPanelTab;
                setCurrentTab(nextValue);
                onActiveTabChange?.(nextValue);
              }}
            >
              <Tabs.List className="rerooted-tabs-list">
                <Tabs.Trigger className="rerooted-tab-trigger" value="info">
                  Info
                </Tabs.Trigger>
                <Tabs.Trigger className="rerooted-tab-trigger" value="photos">
                  Fotos
                </Tabs.Trigger>
                <Tabs.Trigger className="rerooted-tab-trigger" value="documents">
                  Dokumente
                </Tabs.Trigger>
                <Tabs.Trigger className="rerooted-tab-trigger" value="sources">
                  Quellen
                </Tabs.Trigger>
              </Tabs.List>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentTab}
                  className="rerooted-tab-panel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                >
                  {tabContent}
                </motion.div>
              </AnimatePresence>
            </Tabs.Root>
          </>
        ) : null}
      </motion.aside>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Person wirklich löschen?"
        message="Diese Person wird aus dem Stammbaum entfernt."
        confirmLabel="Löschen"
        isPending={deletePerson.isPending}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          await deletePerson.mutateAsync();
          setConfirmDeleteOpen(false);
          onClose();
        }}
      />
    </>
  );
}
