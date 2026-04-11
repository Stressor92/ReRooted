import type { DesignTemplate } from './types';

export const ClassicPaper: DesignTemplate = {
  id: 'classic-paper',
  name: 'Classic Paper',
  canvas: {
    background: '#1C1408',
    backgroundType: 'lines',
    dotColor: 'rgba(250,200,120,0.12)',
  },
  node: {
    background: '#2C1F0E',
    border: '#5C3D1A',
    borderWidth: 2,
    nameColor: '#F5E6C8',
    dateColor: '#C4996A',
    photoBorder: '#8B6340',
    photoBorderWidth: 4,
    shape: {
      cardRadius: 4,
      photoShape: 'rounded',
      photoBorderStyle: 'double',
      shadowIntensity: 'dramatic',
      dividerStyle: 'line',
    },
  },
  panel: {
    background: '#24190b',
    border: '#5C3D1A',
  },
  accent: '#C4996A',
  fontFamily: "'Georgia', serif",
};

export default ClassicPaper;
