import { useMutation } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '../api/client';
import { useToastStore } from './useToast';

export function useCsvExport() {
  const addToast = useToastStore((state) => state.addToast);

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.get('/export/csv', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);

      anchor.href = url;
      anchor.download = `stammbaum_${timestamp}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        message: 'CSV-Export erfolgreich. Die Datei kann direkt in Excel geöffnet werden.',
      });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        message: `CSV-Export fehlgeschlagen: ${getApiErrorMessage(error)}`,
      });
    },
  });
}
