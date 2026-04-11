import type { DesignTemplate } from './types';

export const MinimalLight: DesignTemplate = {
  id: 'minimal-light',
  name: 'Minimal Light',
  canvas: {
    background: '#F8F6F2',
    backgroundType: 'dots',
    dotColor: 'rgba(0,0,0,0.08)',
  },
  node: {
    background: '#FFFFFF',
    border: '#E5E2DC',
    borderWidth: 1,
    nameColor: '#1A1A1A',
    dateColor: '#888580',
    photoBorder: '#1A1A1A',
    photoBorderWidth: 2,
    shape: {
      cardRadius: 20,
      photoShape: 'diamond',
      photoBorderStyle: 'none',
      shadowIntensity: 'subtle',
      dividerStyle: 'line',
    },
  },
  panel: {
    background: '#FFFCF8',
    border: '#E5E2DC',
  },
  accent: '#1A1A1A',
  fontFamily: "'Helvetica Neue', sans-serif",
};

export default MinimalLight;
