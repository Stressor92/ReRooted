import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '../api/client';
import { useToastStore } from './useToast';
import type { TreeData, TreeEdge } from '../api/tree';

export type RelationshipCreateInput = {
  person1_id: string;
  person2_id?: string | null;
  rel_type: 'partner' | 'ex' | 'sibling' | 'adoption' | 'foster' | 'unknown';
  child_ids?: string[];
  start_date?: string | null;
  end_date?: string | null;
};

export type RelationshipUpdateInput = {
  person1_id?: string;
  person2_id?: string | null;
  rel_type?: 'partner' | 'ex' | 'sibling' | 'adoption' | 'foster' | 'unknown';
  start_date?: string | null;
  end_date?: string | null;
};

function buildOptimisticEdges(payload: RelationshipCreateInput, relationshipId: string): TreeEdge[] {
  const edges: TreeEdge[] = [];
  const childIds = payload.child_ids ?? [];

  if (payload.person2_id) {
    edges.push({
      id: `partner-${relationshipId}`,
      source: payload.person1_id,
      target: payload.person2_id,
      type: 'partner',
      data: {
        rel_type: payload.rel_type,
        start_date: payload.start_date ?? undefined,
        end_date: payload.end_date ?? undefined,
      },
    });
  }

  const parentIds = [payload.person1_id, payload.person2_id].filter(Boolean) as string[];
  for (const childId of childIds) {
    for (const parentId of parentIds) {
      edges.push({
        id: `child-${relationshipId}-${parentId}-${childId}`,
        source: parentId,
        target: childId,
        type: 'child',
        data: {
          rel_type: payload.rel_type,
          dashed: payload.rel_type === 'adoption' || payload.rel_type === 'foster',
        },
      });
    }
  }

  return edges;
}

export function useCreateRelationship() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (data: RelationshipCreateInput) => apiClient.post('/relationships', data).then((response) => response.data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['tree'] });
      const previousTree = queryClient.getQueryData<TreeData>(['tree']);
      const tempRelationshipId = `temp-${Date.now()}`;

      queryClient.setQueryData<TreeData>(['tree'], (current) => ({
        nodes: current?.nodes ?? [],
        edges: [...(current?.edges ?? []), ...buildOptimisticEdges(data, tempRelationshipId)],
      }));

      return { previousTree };
    },
    onError: (error, _data, context) => {
      if (context?.previousTree) {
        queryClient.setQueryData(['tree'], context.previousTree);
      }
      addToast({ type: 'error', message: `Beziehung konnte nicht erstellt werden: ${getApiErrorMessage(error)}` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree'] });
      addToast({ type: 'success', message: 'Beziehung erstellt.' });
    },
  });
}

export function useUpdateRelationship() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ relationshipId, data }: { relationshipId: string; data: RelationshipUpdateInput }) =>
      apiClient.put(`/relationships/${relationshipId}`, data).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree'] });
      queryClient.invalidateQueries({ queryKey: ['person-citations'] });
      addToast({ type: 'success', message: 'Beziehung aktualisiert.' });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Beziehung konnte nicht aktualisiert werden: ${getApiErrorMessage(error)}` });
    },
  });
}

export function useAddChild() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ relationshipId, childId }: { relationshipId: string; childId: string }) =>
      apiClient.post(`/relationships/${relationshipId}/children/${childId}`).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree'] });
      addToast({ type: 'success', message: 'Kind verknüpft.' });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Kind konnte nicht verknüpft werden: ${getApiErrorMessage(error)}` });
    },
  });
}

export function useDeleteRelationship() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (relationshipId: string) =>
      apiClient.delete(`/relationships/${relationshipId}`).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tree'] });
      addToast({ type: 'success', message: 'Beziehung entfernt.' });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Beziehung konnte nicht entfernt werden: ${getApiErrorMessage(error)}` });
    },
  });
}
