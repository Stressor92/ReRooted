import type { DesignTemplate } from './types';

export const NightForest: DesignTemplate = {
  id: 'night-forest',
  name: 'Night Forest',
  canvas: {
    background: '#0D1B0F',
    backgroundType: 'dots',
    dotColor: 'rgba(29,158,117,0.2)',
  },
  node: {
    background: '#1A2B1C',
    border: '#2A4A2D',
    borderWidth: 1,
    nameColor: '#E8F5E9',
    dateColor: '#81C784',
    photoBorder: '#000000',
    photoBorderWidth: 3,
    shape: {
      cardRadius: 14,
      photoShape: 'circle',
      photoBorderStyle: 'solid',
      shadowIntensity: 'medium',
      dividerStyle: 'dot',
    },
  },
  panel: {
    background: '#132116',
    border: '#2A4A2D',
  },
  accent: '#1D9E75',
  fontFamily: "'Inter', sans-serif",
};

export default NightForest;
