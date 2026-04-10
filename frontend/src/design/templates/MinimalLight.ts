import type { DesignTemplate } from './types';

export const MinimalLight: DesignTemplate = {
  id: 'minimal-light',
  name: 'Minimal Light',
  canvas: {
    background: '#FAFAFA',
    backgroundType: 'lines',
    dotColor: 'rgba(15, 23, 42, 0.08)',
  },
  node: {
    background: '#FFFFFF',
    border: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 14,
    shadow: '0 10px 24px rgba(15,23,42,0.08)',
    photoBorder: '#111827',
    photoBorderWidth: 3,
    nameColor: '#111827',
    dateColor: '#475569',
  },
  panel: {
    background: '#FFFFFF',
    border: '#D1D5DB',
  },
  accent: '#2563EB',
  fontFamily: 'Inter, "Segoe UI", sans-serif',
};

export default MinimalLight;
