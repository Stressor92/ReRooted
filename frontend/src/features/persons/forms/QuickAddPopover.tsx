import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCreatePerson, type CreatePersonResult } from '../../../hooks/useCreatePerson';

export type QuickAddPreset = {
  sourceNodeId: string;
  sourceHandleType?: 'source' | 'target' | null;
  relationshipKind: 'child' | 'partner' | 'parent' | 'sibling';
  relationshipId?: string | null;
};

export type QuickAddState = {
  position: { x: number; y: number };
  preset?: QuickAddPreset;
} | null;

type QuickAddPopoverProps = {
  state: QuickAddState;
  onClose: () => void;
  onCreated: (result: CreatePersonResult, options: { preset?: QuickAddPreset; openPanel: boolean }) => void;
};

export default function QuickAddPopover({ state, onClose, onCreated }: QuickAddPopoverProps) {
  const createPerson = useCreatePerson();
  const { fitView, getNode } = useReactFlow();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthYear, setBirthYear] = useState('');

  useEffect(() => {
    if (!state) {
      setFirstName('');
      setLastName('');
      setBirthYear('');
    }
  }, [state]);

  const title = useMemo(() => {
    switch (state?.preset?.relationshipKind) {
      case 'child':
        return 'Kind anlegen';
      case 'partner':
        return 'Partner anlegen';
      case 'parent':
        return 'Elternteil anlegen';
      case 'sibling':
        return 'Geschwister anlegen';
      default:
        return 'Neue Person';
    }
  }, [state?.preset?.relationshipKind]);

  const handleCreate = async (openPanel: boolean) => {
    if (!firstName.trim() || !lastName.trim()) {
      return;
    }

    const result = await createPerson.mutateAsync({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      birth_year: birthYear.trim() || null,
    });

    onCreated(result, { preset: state?.preset, openPanel });
    onClose();

    window.setTimeout(() => {
      const node = getNode(result.person.id);
      void fitView({ nodes: node ? [node] : undefined, duration: 600, padding: 0.3 });
    }, 80);
  };

  return (
    <AnimatePresence>
      {state ? (
        <motion.div
          className="rerooted-quick-add"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{ left: state.position.x, top: state.position.y, transformOrigin: 'top left' }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="rerooted-quick-add-title">{title}</div>
          <label className="rerooted-field">
            <span>Vorname*</span>
            <input className="rerooted-input" value={firstName} onChange={(event) => setFirstName(event.target.value)} autoFocus />
          </label>
          <label className="rerooted-field">
            <span>Nachname*</span>
            <input className="rerooted-input" value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </label>
          <label className="rerooted-field">
            <span>Geburtsjahr</span>
            <input className="rerooted-input" value={birthYear} onChange={(event) => setBirthYear(event.target.value)} inputMode="numeric" />
          </label>
          <div className="rerooted-quick-add-actions">
            <button type="button" className="rerooted-inline-button" onClick={() => void handleCreate(true)}>
              Vollständig bearbeiten →
            </button>
            <button type="button" className="rerooted-primary-button" onClick={() => void handleCreate(false)}>
              {createPerson.isPending ? 'Lege an…' : 'Anlegen'}
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
