import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '../api/client';
import { deleteStoredFile, uploadFile, type FileRecord } from '../api/files';
import type { PersonEvent, PersonSummary } from '../api/persons';
import { useToastStore } from './useToast';

type PersonUpdatePayload = Partial<
  Pick<
    PersonSummary,
    'first_name' | 'last_name' | 'gender' | 'is_living' | 'birth_place_id' | 'description' | 'current_address' | 'phone_number' | 'gramps_id'
  >
> & {
  profile_image_id?: string | null;
};

type EventInput = {
  event_type: string;
  date_text?: string | null;
  place_id?: string | null;
  description?: string | null;
  is_private?: boolean;
};

export type PersonImageUpdatePayload = {
  caption?: string | null;
  date_text?: string | null;
  place_text?: string | null;
  is_profile?: boolean;
};

function invalidatePersonQueries(queryClient: ReturnType<typeof useQueryClient>, personId: string): void {
  queryClient.invalidateQueries({ queryKey: ['person', personId] });
  queryClient.invalidateQueries({ queryKey: ['tree'] });
  queryClient.invalidateQueries({ queryKey: ['persons'] });
  queryClient.invalidateQueries({ queryKey: ['person-citations', personId] });
  queryClient.invalidateQueries({ queryKey: ['person-documents', personId] });
}

export function useUpdatePerson(personId: string) {
  const qc = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (data: PersonUpdatePayload) => apiClient.put(`/persons/${personId}`, data).then((r) => r.data),
    onSuccess: () => {
      invalidatePersonQueries(qc, personId);
      addToast({ type: 'success', message: 'Person aktualisiert.' });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Person konnte nicht aktualisiert werden: ${getApiErrorMessage(error)}` });
    },
  });
}

export function useDeletePerson(personId: string) {
  const qc = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: () => apiClient.delete(`/persons/${personId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tree'] });
      qc.invalidateQueries({ queryKey: ['persons'] });
      qc.removeQueries({ queryKey: ['person', personId] });
      addToast({ type: 'success', message: 'Person gelöscht.' });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Person konnte nicht gelöscht werden: ${getApiErrorMessage(error)}` });
    },
  });
}

export function useSaveEvent(personId: string) {
  const qc = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId?: string; data: EventInput }): Promise<PersonEvent> => {
      if (eventId) {
        return apiClient.put(`/events/${eventId}`, data).then((r) => r.data);
      }

      return apiClient.post(`/persons/${personId}/events`, data).then((r) => r.data);
    },
    onSuccess: (_result, variables) => {
      invalidatePersonQueries(qc, personId);
      addToast({ type: 'success', message: variables.eventId ? 'Ereignis aktualisiert.' : 'Ereignis angelegt.' });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Ereignis konnte nicht gespeichert werden: ${getApiErrorMessage(error)}` });
    },
  });
}

export function useDeleteEvent(personId: string) {
  const qc = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (eventId: string) => apiClient.delete(`/events/${eventId}`).then((r) => r.data),
    onSuccess: () => {
      invalidatePersonQueries(qc, personId);
      addToast({ type: 'success', message: 'Ereignis entfernt.' });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Ereignis konnte nicht entfernt werden: ${getApiErrorMessage(error)}` });
    },
  });
}

export function useUploadPersonImage(personId: string) {
  const qc = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: async ({ file, isProfile = false }: { file: File; isProfile?: boolean }): Promise<FileRecord> => {
      const uploaded = await uploadFile(file);
      const formData = new FormData();
      formData.append('file_id', uploaded.id);
      formData.append('is_profile', String(isProfile));
      await apiClient.post(`/persons/${personId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return uploaded;
    },
    onSuccess: () => {
      invalidatePersonQueries(qc, personId);
      addToast({ type: 'success', message: 'Datei hochgeladen.' });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Datei konnte nicht hochgeladen werden: ${getApiErrorMessage(error)}` });
    },
  });
}

export function useUpdatePersonImage(personId: string) {
  const qc = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ imageId, data }: { imageId: string; data: PersonImageUpdatePayload }) =>
      apiClient.patch(`/persons/${personId}/images/${imageId}`, data).then((r) => r.data),
    onSuccess: () => {
      invalidatePersonQueries(qc, personId);
      addToast({ type: 'success', message: 'Fotometadaten aktualisiert.' });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Fotometadaten konnten nicht gespeichert werden: ${getApiErrorMessage(error)}` });
    },
  });
}

export function useDeletePersonFile(personId: string) {
  const qc = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: async (fileId: string) => {
      await deleteStoredFile(fileId);
    },
    onSuccess: () => {
      invalidatePersonQueries(qc, personId);
      addToast({ type: 'success', message: 'Datei entfernt.' });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Datei konnte nicht entfernt werden: ${getApiErrorMessage(error)}` });
    },
  });
}

export function useUpdateCitation(personId: string) {
  const qc = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: ({ citationId, confidence }: { citationId: string; confidence: 'low' | 'medium' | 'high' }) =>
      apiClient.patch(`/citations/${citationId}`, { confidence }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['person-citations', personId] });
      addToast({ type: 'success', message: 'Quellenbewertung aktualisiert.' });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Bewertung konnte nicht aktualisiert werden: ${getApiErrorMessage(error)}` });
    },
  });
}

export function useCreateSourceCitation(personId: string) {
  const qc = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: async ({
      eventId,
      source,
      citation,
    }: {
      eventId?: string | null;
      source: { title: string; author?: string | null; date?: string | null; url?: string | null; file_id?: string | null };
      citation: { page?: string | null; confidence?: 'low' | 'medium' | 'high' };
    }) => {
      const createdSource = await apiClient.post('/sources', source).then((r) => r.data);
      const citationPayload = {
        source_id: createdSource.id,
        person_id: personId,
        page: citation.page,
        confidence: citation.confidence ?? 'medium',
      };
      const createdCitation = await apiClient
        .post(eventId ? `/events/${eventId}/citations` : `/persons/${personId}/citations`, citationPayload)
        .then((r) => r.data);

      return { source: createdSource, citation: createdCitation };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['person-citations', personId] });
      qc.invalidateQueries({ queryKey: ['person-documents', personId] });
      addToast({ type: 'success', message: 'Quelle hinzugefügt.' });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Quelle konnte nicht hinzugefügt werden: ${getApiErrorMessage(error)}` });
    },
  });
}
