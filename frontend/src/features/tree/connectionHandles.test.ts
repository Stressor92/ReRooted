import { describe, expect, it } from 'vitest';
import {
  getHandleIdsForRelationshipEdge,
  getQuickAddPresetFromHandle,
  isPartnerConnection,
} from './connectionHandles';

describe('connectionHandles', () => {
  it('maps side handles to partner quick-adds', () => {
    expect(getQuickAddPresetFromHandle({ type: 'source', id: 'partner-right' })).toEqual({
      relationshipKind: 'partner',
      sourceHandleType: null,
    });

    expect(getQuickAddPresetFromHandle({ type: 'target', id: 'partner-left' })).toEqual({
      relationshipKind: 'partner',
      sourceHandleType: null,
    });
  });

  it('keeps top and bottom handles mapped to parent/child flows', () => {
    expect(getQuickAddPresetFromHandle({ type: 'target', id: 'person-parent' })).toEqual({
      relationshipKind: 'parent',
      sourceHandleType: 'target',
    });

    expect(getQuickAddPresetFromHandle({ type: 'source', id: 'person-child' })).toEqual({
      relationshipKind: 'child',
      sourceHandleType: 'source',
    });
  });

  it('detects partner connections via side handle ids', () => {
    expect(isPartnerConnection({ sourceHandle: 'partner-right', targetHandle: 'partner-left' })).toBe(true);
    expect(isPartnerConnection({ sourceHandle: 'person-child', targetHandle: 'person-parent' })).toBe(false);
  });

  it('assigns the correct handles to rendered relationship edges', () => {
    expect(getHandleIdsForRelationshipEdge('partner', 'TB')).toEqual({
      sourceHandle: 'partner-right',
      targetHandle: 'partner-left',
    });

    expect(getHandleIdsForRelationshipEdge('partner', 'LR')).toEqual({
      sourceHandle: 'person-child',
      targetHandle: 'person-parent',
    });

    expect(getHandleIdsForRelationshipEdge('child', 'TB')).toEqual({
      sourceHandle: 'person-child',
      targetHandle: 'person-parent',
    });
  });
});
