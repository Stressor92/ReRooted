import type { DesignTemplate } from './types';

export const ClassicPaper: DesignTemplate = {
  id: 'classic-paper',
  name: 'Classic Paper',
  canvas: {
    background: '#FBF6EA',
    backgroundType: 'cross',
    dotColor: 'rgba(150, 108, 72, 0.14)',
  },
  node: {
    background: '#FFFDFC',
    border: '#CFB794',
    borderWidth: 1,
    borderRadius: 14,
    shadow: '0 8px 24px rgba(120, 90, 58, 0.12)',
    photoBorder: '#4B3323',
    photoBorderWidth: 3,
    nameColor: '#362417',
    dateColor: '#8C6344',
  },
  panel: {
    background: '#F7F0E2',
    border: '#D9C6A6',
  },
  accent: '#A46A3F',
  fontFamily: '"Merriweather", Georgia, serif',
};

export default ClassicPaper;
