import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '../api/client';
import { useToastStore } from './useToast';

export type GedcomPreview = {
  persons: number;
  families: number;
  places: number;
  events: number;
  warnings?: string[];
};

function buildGedcomFormData(file: File): FormData {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

export function useGedcomPreview() {
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (file: File) =>
      apiClient
        .post('/import/gedcom/preview', buildGedcomFormData(file), {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((response) => response.data as GedcomPreview),
    onError: (error) => {
      addToast({ type: 'error', message: `Preview fehlgeschlagen: ${getApiErrorMessage(error)}` });
    },
  });
}

export function useGedcomImport() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: (file: File) =>
      apiClient
        .post('/import/gedcom', buildGedcomFormData(file), {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((response) => response.data as { imported_persons: number; imported_families: number; status: string }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tree'] });
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      addToast({ type: 'success', message: `${result.imported_persons} Personen importiert.` });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Import fehlgeschlagen: ${getApiErrorMessage(error)}` });
    },
  });
}

export function useGedcomExport() {
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.get('/export/gedcom', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data as Blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'rerooted_export.ged';
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        message: 'GEDCOM exportiert. Lebende Personen wurden anonymisiert.',
      });
    },
    onError: (error) => {
      addToast({ type: 'error', message: `Export fehlgeschlagen: ${getApiErrorMessage(error)}` });
    },
  });
}
