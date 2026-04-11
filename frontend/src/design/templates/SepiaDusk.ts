import type { DesignTemplate } from './types';

export const SepiaDusk: DesignTemplate = {
  id: 'sepia-dusk',
  name: 'Sepia Dusk',
  canvas: {
    background: '#120B1E',
    backgroundType: 'none',
    dotColor: '',
  },
  node: {
    background: '#1E1228',
    border: '#3D2455',
    borderWidth: 1,
    nameColor: '#F0E6FF',
    dateColor: '#B088D4',
    photoBorder: '#7B4FA6',
    photoBorderWidth: 3,
    shape: {
      cardRadius: 18,
      photoShape: 'circle',
      photoBorderStyle: 'double',
      shadowIntensity: 'dramatic',
      dividerStyle: 'dot',
    },
  },
  panel: {
    background: '#170f1f',
    border: '#3D2455',
  },
  accent: '#9B59B6',
  fontFamily: "'Palatino', serif",
};

export default SepiaDusk;
