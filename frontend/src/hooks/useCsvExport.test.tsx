import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCsvExport } from './useCsvExport';

const mockGet = vi.fn();
const addToast = vi.fn();

vi.mock('../api/client', () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
  getApiErrorMessage: (error: unknown) => (error instanceof Error ? error.message : 'Unbekannter Fehler'),
}));

vi.mock('./useToast', () => ({
  useToastStore: (selector: (state: { addToast: typeof addToast }) => unknown) => selector({ addToast }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCsvExport', () => {
  beforeEach(() => {
    mockGet.mockReset();
    addToast.mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: vi.fn(() => 'blob:csv-export'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(() => {}),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads the CSV file and shows a success toast', async () => {
    mockGet.mockResolvedValue({ data: new Blob(['csv']) });

    const anchor = document.createElement('a');
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'a') {
        return anchor;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    const { result } = renderHook(() => useCsvExport(), { wrapper: createWrapper() });

    await result.current.mutateAsync();

    expect(mockGet).toHaveBeenCalledWith('/export/csv', { responseType: 'blob' });
    expect(anchor.href).toBe('blob:csv-export');
    expect(anchor.download).toMatch(/^stammbaum_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(addToast).toHaveBeenCalledWith({
      type: 'success',
      message: 'CSV-Export erfolgreich. Die Datei kann direkt in Excel geöffnet werden.',
    });
  });

  it('shows an error toast if the export request fails', async () => {
    mockGet.mockRejectedValue(new Error('Netzwerkfehler'));

    const { result } = renderHook(() => useCsvExport(), { wrapper: createWrapper() });

    await expect(result.current.mutateAsync()).rejects.toThrow('Netzwerkfehler');
    expect(addToast).toHaveBeenCalledWith({
      type: 'error',
      message: 'CSV-Export fehlgeschlagen: Netzwerkfehler',
    });
  });
});
