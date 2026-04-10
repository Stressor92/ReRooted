import { toPng } from 'html-to-image';
import { useToastStore } from './useToast';

export function useCanvasExport() {
  const addToast = useToastStore((state) => state.addToast);

  const exportAsPng = async () => {
    try {
      const element = document.querySelector('.react-flow__renderer, .react-flow__viewport, .react-flow') as HTMLElement | null;
      if (!element) {
        addToast({ type: 'error', message: 'Canvas konnte nicht exportiert werden.' });
        return;
      }

      const background = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim();
      const dataUrl = await toPng(element, { backgroundColor: background, quality: 1, pixelRatio: 2 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `stammbaum_${Date.now()}.png`;
      link.click();
      addToast({ type: 'success', message: 'PNG exportiert.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      addToast({ type: 'error', message: `PNG-Export fehlgeschlagen: ${message}` });
    }
  };

  return { exportAsPng };
}
