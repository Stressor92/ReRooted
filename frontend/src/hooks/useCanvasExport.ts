import { useQuery } from '@tanstack/react-query';
import { toJpeg, toPng, toSvg } from 'html-to-image';
import { apiClient } from '../api/client';
import { useToastStore } from './useToast';

export type CanvasExportFormat = 'png' | 'jpg' | 'svg';

export type CanvasExportOption = {
  id: CanvasExportFormat;
  label: string;
  mime_type: string;
  extension: string;
};

const FALLBACK_FORMATS: CanvasExportOption[] = [
  { id: 'png', label: 'PNG', mime_type: 'image/png', extension: 'png' },
  { id: 'jpg', label: 'JPG', mime_type: 'image/jpeg', extension: 'jpg' },
  { id: 'svg', label: 'SVG', mime_type: 'image/svg+xml', extension: 'svg' },
];

export function useCanvasExport() {
  const addToast = useToastStore((state) => state.addToast);
  const { data } = useQuery<{ default: CanvasExportFormat; formats: CanvasExportOption[] }>({
    queryKey: ['image-export-formats'],
    queryFn: async () => apiClient.get('/export/image-formats').then((response) => response.data),
    staleTime: Infinity,
  });
  const formats = data?.formats ?? FALLBACK_FORMATS;

  const exportCanvas = async (format: CanvasExportFormat) => {
    try {
      const element = document.querySelector('.react-flow__renderer, .react-flow__viewport, .react-flow') as HTMLElement | null;
      if (!element) {
        addToast({ type: 'error', message: 'Canvas konnte nicht exportiert werden.' });
        return;
      }

      const background = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim();
      const exportOptions = {
        backgroundColor: background,
        pixelRatio: 2,
        filter: (node: HTMLElement) => {
          if (
            node.classList?.contains('rerooted-canvas-toolbar') ||
            node.classList?.contains('rerooted-toolbar-fab') ||
            node.classList?.contains('rerooted-app-header') ||
            node.classList?.contains('rerooted-brand')
          ) {
            return false;
          }
          return true;
        },
      };
      const dataUrl =
        format === 'jpg'
          ? await toJpeg(element, { ...exportOptions, quality: 0.96 })
          : format === 'svg'
            ? await toSvg(element, exportOptions)
            : await toPng(element, { ...exportOptions, quality: 1 });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `stammbaum_${Date.now()}.${format}`;
      link.click();
      addToast({ type: 'success', message: `${format.toUpperCase()} exportiert.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      addToast({ type: 'error', message: `${format.toUpperCase()}-Export fehlgeschlagen: ${message}` });
    }
  };

  return { exportCanvas, formats };
}
