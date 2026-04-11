import type { Connection } from '@xyflow/react';

export const PERSON_PARENT_HANDLE_ID = 'person-parent';
export const PERSON_CHILD_HANDLE_ID = 'person-child';
export const PARTNER_LEFT_HANDLE_ID = 'partner-left';
export const PARTNER_RIGHT_HANDLE_ID = 'partner-right';

type HandleDescriptor = {
  type?: string | null;
  id?: string | null;
};

export function isPartnerHandleId(handleId?: string | null): boolean {
  return handleId === PARTNER_LEFT_HANDLE_ID || handleId === PARTNER_RIGHT_HANDLE_ID;
}

export function getQuickAddPresetFromHandle(handle?: HandleDescriptor | null): {
  relationshipKind: 'child' | 'partner' | 'parent';
  sourceHandleType: 'source' | 'target' | null;
} {
  if (isPartnerHandleId(handle?.id)) {
    return {
      relationshipKind: 'partner',
      sourceHandleType: null,
    };
  }

  if (handle?.type === 'target') {
    return {
      relationshipKind: 'parent',
      sourceHandleType: 'target',
    };
  }

  return {
    relationshipKind: 'child',
    sourceHandleType: 'source',
  };
}

export function isPartnerConnection(connection: Pick<Connection, 'sourceHandle' | 'targetHandle'>): boolean {
  return isPartnerHandleId(connection.sourceHandle) || isPartnerHandleId(connection.targetHandle);
}

export function getHandleIdsForRelationshipEdge(
  edgeType: 'partner' | 'child',
  layoutDir: 'TB' | 'LR',
): {
  sourceHandle: string;
  targetHandle: string;
} {
  if (edgeType === 'partner' && layoutDir === 'TB') {
    return {
      sourceHandle: PARTNER_RIGHT_HANDLE_ID,
      targetHandle: PARTNER_LEFT_HANDLE_ID,
    };
  }

  return {
    sourceHandle: PERSON_CHILD_HANDLE_ID,
    targetHandle: PERSON_PARENT_HANDLE_ID,
  };
}
