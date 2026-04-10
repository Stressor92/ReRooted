import type { DesignTemplate } from './types';

export const SepiaHeritage: DesignTemplate = {
  id: 'sepia-heritage',
  name: 'Sepia Heritage',
  canvas: {
    background: '#1C1208',
    backgroundType: 'dots',
    dotColor: 'rgba(212, 163, 115, 0.2)',
  },
  node: {
    background: '#2B1C12',
    border: '#6E4E34',
    borderWidth: 1,
    borderRadius: 14,
    shadow: '0 10px 28px rgba(0,0,0,0.42)',
    photoBorder: '#120b06',
    photoBorderWidth: 3,
    nameColor: '#F7E9D4',
    dateColor: '#D8B48A',
  },
  panel: {
    background: '#24170f',
    border: '#6E4E34',
  },
  accent: '#D4A373',
  fontFamily: '"Merriweather", Georgia, serif',
};

export default SepiaHeritage;
