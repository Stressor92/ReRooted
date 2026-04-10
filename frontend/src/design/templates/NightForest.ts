import type { DesignTemplate } from './types';

export const NightForest: DesignTemplate = {
  id: 'night-forest',
  name: 'Night Forest',
  canvas: {
    background: '#0D1B0F',
    backgroundType: 'dots',
    dotColor: 'rgba(29,158,117,0.25)',
  },
  node: {
    background: '#F4FAF5',
    border: '#8FB596',
    borderWidth: 1,
    borderRadius: 14,
    shadow: '0 10px 28px rgba(0,0,0,0.35)',
    photoBorder: '#08110A',
    photoBorderWidth: 3,
    nameColor: '#122818',
    dateColor: '#2F6B47',
  },
  panel: {
    background: '#EEF7EF',
    border: '#8FB596',
  },
  accent: '#1D9E75',
  fontFamily: 'Inter, "Segoe UI", sans-serif',
};

export default NightForest;
