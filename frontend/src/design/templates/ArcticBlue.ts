import type { DesignTemplate } from './types';

export const ArcticBlue: DesignTemplate = {
  id: 'arctic-blue',
  name: 'Arctic Blue',
  canvas: {
    background: '#071628',
    backgroundType: 'cross',
    dotColor: 'rgba(55,138,221,0.15)',
  },
  node: {
    background: '#0D2540',
    border: '#1A4A7A',
    borderWidth: 1,
    nameColor: '#E8F4FF',
    dateColor: '#7CB9F4',
    photoBorder: '#378ADD',
    photoBorderWidth: 2,
    shape: {
      cardRadius: 0,
      photoShape: 'square',
      photoBorderStyle: 'solid',
      shadowIntensity: 'subtle',
      dividerStyle: 'none',
    },
  },
  panel: {
    background: '#0b1f34',
    border: '#1A4A7A',
  },
  accent: '#378ADD',
  fontFamily: "'JetBrains Mono', monospace",
};

export default ArcticBlue;
