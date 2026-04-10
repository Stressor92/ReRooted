import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useCanvasExport } from './useCanvasExport';

const mockGet = vi.fn();
const addToast = vi.fn();
const toPng = vi.fn();
const toJpeg = vi.fn();
const toSvg = vi.fn();

vi.mock('../api/client', () => ({
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

vi.mock('./useToast', () => ({
  useToastStore: (selector: (state: { addToast: typeof addToast }) => unknown) => selector({ addToast }),
}));

vi.mock('html-to-image', () => ({
  toPng: (...args: unknown[]) => toPng(...args),
  toJpeg: (...args: unknown[]) => toJpeg(...args),
  toSvg: (...args: unknown[]) => toSvg(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useCanvasExport', () => {
  beforeEach(() => {
    mockGet.mockReset();
    addToast.mockReset();
    toPng.mockReset();
    toJpeg.mockReset();
    toSvg.mockReset();
    document.body.innerHTML = '<div class="react-flow"></div>';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('falls back to built-in export formats if the backend metadata endpoint is unavailable', () => {
    mockGet.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderHook(() => useCanvasExport(), { wrapper: createWrapper() });

    expect(result.current.formats.map((entry) => entry.id)).toEqual(['png', 'jpg', 'svg']);
  });

  it('filters toolbar and header elements out of SVG export output', async () => {
    mockGet.mockResolvedValue({
      data: {
        default: 'png',
        formats: [
          { id: 'png', label: 'PNG', mime_type: 'image/png', extension: 'png' },
          { id: 'jpg', label: 'JPG', mime_type: 'image/jpeg', extension: 'jpg' },
          { id: 'svg', label: 'SVG', mime_type: 'image/svg+xml', extension: 'svg' },
        ],
      },
    });
    toSvg.mockResolvedValue('data:image/svg+xml;base64,AAA');

    const styleSpy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '#ffffff',
    } as unknown as CSSStyleDeclaration);

    const { result } = renderHook(() => useCanvasExport(), { wrapper: createWrapper() });

    await result.current.exportCanvas('svg');

    expect(toSvg).toHaveBeenCalledTimes(1);
    const [, options] = toSvg.mock.calls[0];
    const filter = options.filter as (node: HTMLElement) => boolean;

    const toolbar = document.createElement('div');
    toolbar.className = 'rerooted-canvas-toolbar';
    const fab = document.createElement('div');
    fab.className = 'rerooted-toolbar-fab';
    const header = document.createElement('div');
    header.className = 'rerooted-app-header';
    const brand = document.createElement('div');
    brand.className = 'rerooted-brand';
    const content = document.createElement('div');
    content.className = 'react-flow__node';

    expect(filter(toolbar)).toBe(false);
    expect(filter(fab)).toBe(false);
    expect(filter(header)).toBe(false);
    expect(filter(brand)).toBe(false);
    expect(filter(content)).toBe(true);
    expect(addToast).toHaveBeenCalledWith({ type: 'success', message: 'SVG exportiert.' });

    styleSpy.mockRestore();
  });

  it('uses JPEG rendering for JPG export', async () => {
    mockGet.mockResolvedValue({ data: { default: 'png', formats: [] } });
    toJpeg.mockResolvedValue('data:image/jpeg;base64,AAA');
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: () => '#ffffff',
    } as unknown as CSSStyleDeclaration);

    const { result } = renderHook(() => useCanvasExport(), { wrapper: createWrapper() });

    await result.current.exportCanvas('jpg');

    expect(toJpeg).toHaveBeenCalledTimes(1);
    expect(toPng).not.toHaveBeenCalled();
    expect(toSvg).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith({ type: 'success', message: 'JPG exportiert.' });
  });
});
