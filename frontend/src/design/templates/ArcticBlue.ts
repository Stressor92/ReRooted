import type { DesignTemplate } from './types';

export const ArcticBlue: DesignTemplate = {
  id: 'arctic-blue',
  name: 'Arctic Blue',
  canvas: {
    background: '#091522',
    backgroundType: 'dots',
    dotColor: 'rgba(125,211,252,0.25)',
  },
  node: {
    background: '#10263A',
    border: '#24506F',
    borderWidth: 1,
    borderRadius: 14,
    shadow: '0 8px 24px rgba(3,7,18,0.45)',
    photoBorder: '#020617',
    photoBorderWidth: 3,
    nameColor: '#E0F2FE',
    dateColor: '#7DD3FC',
  },
  accent: '#7DD3FC',
  fontFamily: 'Inter, "Segoe UI", sans-serif',
};

export default ArcticBlue;
