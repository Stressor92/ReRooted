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
    background: '#1A2B1C',
    border: '#2A4A2D',
    borderWidth: 1,
    borderRadius: 14,
    shadow: '0 4px 20px rgba(0,0,0,0.4)',
    photoBorder: '#000000',
    photoBorderWidth: 3,
    nameColor: '#E8F5E9',
    dateColor: '#81C784',
  },
  accent: '#1D9E75',
  fontFamily: 'Inter, "Segoe UI", sans-serif',
};

export default NightForest;
