import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '../api/client';
import { useToastStore } from './useToast';
import type { PersonSummary } from '../api/persons';
import type { TreeData, TreeNode } from '../api/tree';

export type CreatePersonInput = {
  first_name: string;
  last_name: string;
  birth_year?: string | null;
  is_living?: boolean | null;
};

export type CreatePersonResult = {
  person: PersonSummary;
  birth_year: string | null;
};

export function buildTempNode(
  person: {
    id: string;
    first_name: string;
    last_name: string;
    is_living?: boolean | null;
    birth_year?: string | null;
    profile_image_url?: string | null;
    description_excerpt?: string | null;
  },
  position: { x: number; y: number } = { x: 0, y: 0 },
): TreeNode {
  return {
    id: person.id,
    type: 'person',
    position,
    data: {
      first_name: person.first_name,
      last_name: person.last_name,
      is_living: person.is_living ?? null,
      birth_year: person.birth_year ?? null,
      death_year: null,
      profile_image_url: person.profile_image_url ?? null,
      description_excerpt: person.description_excerpt ?? null,
    },
  };
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: async ({ birth_year, ...payload }: CreatePersonInput): Promise<CreatePersonResult> => {
      const person = await apiClient.post('/persons', payload).then((response) => response.data as PersonSummary);

      if (birth_year?.trim()) {
        await apiClient.post(`/persons/${person.id}/events`, {
          event_type: 'birth',
          date_text: birth_year.trim(),
        });
      }

      return { person, birth_year: birth_year?.trim() ?? null };
    },
    onMutate: async (newPerson) => {
      await queryClient.cancelQueries({ queryKey: ['tree'] });
      const previousTree = queryClient.getQueryData<TreeData>(['tree']);
      const tempId = `temp-person-${Date.now()}`;

      queryClient.setQueryData<TreeData>(['tree'], (current) => ({
        nodes: [
          ...(current?.nodes ?? []),
          buildTempNode({
            id: tempId,
            first_name: newPerson.first_name,
            last_name: newPerson.last_name,
            is_living: newPerson.is_living ?? null,
            birth_year: newPerson.birth_year ?? null,
          }),
        ],
        edges: current?.edges ?? [],
      }));

      return { previousTree, tempId };
    },
    onError: (error, _newPerson, context) => {
      if (context?.previousTree) {
        queryClient.setQueryData(['tree'], context.previousTree);
      }
      addToast({ type: 'error', message: `Person konnte nicht angelegt werden: ${getApiErrorMessage(error)}` });
    },
    onSuccess: (result, _newPerson, context) => {
      queryClient.setQueryData<TreeData>(['tree'], (current) => ({
        nodes:
          current?.nodes.map((node) =>
            node.id === context?.tempId
              ? buildTempNode({
                  id: result.person.id,
                  first_name: result.person.first_name,
                  last_name: result.person.last_name,
                  is_living: result.person.is_living,
                  birth_year: result.birth_year,
                  profile_image_url: result.person.profile_image_url,
                }, node.position)
              : node,
          ) ?? [],
        edges: current?.edges ?? [],
      }));

      queryClient.invalidateQueries({ queryKey: ['tree'] });
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      addToast({ type: 'success', message: 'Person angelegt.' });
    },
  });
}
