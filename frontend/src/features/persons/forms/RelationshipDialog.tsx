import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import RelationshipForm, { type RelationshipTypeValue } from './RelationshipForm';
import {
  useCreateRelationship,
  useDeleteRelationship,
  useUpdateRelationship,
  type RelationshipCreateInput,
} from '../../../hooks/useRelationshipMutations';

export type RelationshipDialogState = {
  relationshipId?: string;
  sourceNodeId: string;
  targetNodeId: string;
  mode: 'child' | 'partner' | 'parent' | 'edit';
  preferredType?: RelationshipTypeValue;
  startDate?: string;
  endDate?: string;
} | null;

type RelationshipDialogProps = {
  state: RelationshipDialogState;
  onClose: () => void;
};

function normaliseDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const europeanDate = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!europeanDate) {
    return null;
  }

  const [, day, month, year] = europeanDate;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function buildPayload(
  state: Exclude<RelationshipDialogState, null>,
  relType: RelationshipTypeValue,
  startDate: string,
  endDate: string,
): RelationshipCreateInput {
  const normalisedType = relType === 'biological' ? 'partner' : relType;

  if (relType === 'partner' || relType === 'ex' || relType === 'sibling') {
    return {
      person1_id: state.sourceNodeId,
      person2_id: state.targetNodeId,
      rel_type: normalisedType,
      start_date: normaliseDateInput(startDate),
      end_date: normaliseDateInput(endDate),
      child_ids: [],
    };
  }

  return {
    person1_id: state.sourceNodeId,
    person2_id: null,
    rel_type: normalisedType,
    start_date: normaliseDateInput(startDate),
    end_date: normaliseDateInput(endDate),
    child_ids: [state.targetNodeId],
  };
}

export default function RelationshipDialog({ state, onClose }: RelationshipDialogProps) {
  const createRelationship = useCreateRelationship();
  const updateRelationship = useUpdateRelationship();
  const deleteRelationship = useDeleteRelationship();
  const [selectedType, setSelectedType] = useState<RelationshipTypeValue>('biological');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!state) {
      setSelectedType('biological');
      setStartDate('');
      setEndDate('');
      return;
    }

    setSelectedType(state.preferredType ?? (state.mode === 'partner' ? 'partner' : 'biological'));
    setStartDate(state.startDate ?? '');
    setEndDate(state.endDate ?? '');
  }, [state]);

  const handleSubmit = async () => {
    if (!state) {
      return;
    }

    if (state.relationshipId) {
      const payload = buildPayload(state, selectedType, startDate, endDate);
      await updateRelationship.mutateAsync({
        relationshipId: state.relationshipId,
        data: {
          person1_id: payload.person1_id,
          person2_id: payload.person2_id ?? null,
          rel_type: payload.rel_type,
          start_date: payload.start_date ?? null,
          end_date: payload.end_date ?? null,
        },
      });
    } else {
      await createRelationship.mutateAsync(buildPayload(state, selectedType, startDate, endDate));
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!state?.relationshipId) {
      return;
    }

    await deleteRelationship.mutateAsync(state.relationshipId);
    onClose();
  };

  return (
    <AnimatePresence>
      {state ? (
        <>
          <motion.div
            className="rerooted-dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="rerooted-dialog rerooted-relationship-dialog"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
          >
            <RelationshipForm
              title={state.relationshipId ? 'Beziehung bearbeiten' : 'Beziehung anlegen'}
              submitLabel={state.relationshipId ? 'Änderungen speichern' : 'Beziehung anlegen'}
              selectedType={selectedType}
              startDate={startDate}
              endDate={endDate}
              isPending={createRelationship.isPending || updateRelationship.isPending || deleteRelationship.isPending}
              showDelete={Boolean(state.relationshipId)}
              onSelectType={setSelectedType}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onCancel={onClose}
              onDelete={() => void handleDelete()}
              onSubmit={() => void handleSubmit()}
            />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
