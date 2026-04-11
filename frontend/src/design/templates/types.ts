export type BackgroundType = 'dots' | 'dots-dense' | 'dots-large' | 'lines' | 'lines-dense' | 'cross' | 'none';

export const BACKGROUND_OPTIONS: Array<{ value: BackgroundType; label: string }> = [
  { value: 'dots', label: 'Punkte' },
  { value: 'dots-dense', label: 'Feine Punkte' },
  { value: 'dots-large', label: 'Große Punkte' },
  { value: 'lines', label: 'Linien' },
  { value: 'lines-dense', label: 'Feine Linien' },
  { value: 'cross', label: 'Kreuzraster' },
  { value: 'none', label: 'Ohne Raster' },
];

export interface NodeShapeConfig {
  cardRadius: number;
  photoShape: 'circle' | 'rounded' | 'square' | 'diamond';
  photoBorderStyle: 'solid' | 'double' | 'none';
  shadowIntensity: 'none' | 'subtle' | 'medium' | 'dramatic';
  dividerStyle: 'none' | 'line' | 'dot';
}

export interface DesignTemplate {
  id: string;
  name: string;
  canvas: {
    background: string;
    backgroundType: BackgroundType;
    dotColor?: string;
  };
  node: {
    background: string;
    border: string;
    borderWidth: number;
    nameColor: string;
    dateColor: string;
    photoBorder: string;
    photoBorderWidth: number;
    shape: NodeShapeConfig;
  };
  panel?: {
    background: string;
    border: string;
  };
  accent: string;
  fontFamily: string;
  isCustom?: boolean;
}

function shadowForIntensity(intensity: NodeShapeConfig['shadowIntensity']): string {
  switch (intensity) {
    case 'none':
      return 'none';
    case 'subtle':
      return '0 2px 8px rgba(0,0,0,0.25)';
    case 'dramatic':
      return '0 12px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.3)';
    case 'medium':
    default:
      return '0 4px 20px rgba(0,0,0,0.4)';
  }
}

export function applyTemplate(template: DesignTemplate): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const style = root.style;
  const shadow = shadowForIntensity(template.node.shape.shadowIntensity);

  style.setProperty('--canvas-bg', template.canvas.background);
  style.setProperty('--canvas-dot-color', template.canvas.dotColor ?? 'rgba(255,255,255,0.1)');
  style.setProperty('--node-bg', template.node.background);
  style.setProperty('--node-border', template.node.border);
  style.setProperty('--node-border-width', `${template.node.borderWidth}px`);
  style.setProperty('--node-radius', `${template.node.shape.cardRadius}px`);
  style.setProperty('--node-shadow', shadow);
  style.setProperty('--node-name-color', template.node.nameColor);
  style.setProperty('--node-date-color', template.node.dateColor);
  style.setProperty('--panel-bg', template.panel?.background ?? template.node.background);
  style.setProperty('--panel-border', template.panel?.border ?? template.node.border);
  style.setProperty('--accent', template.accent);
  style.setProperty('--photo-border', template.node.photoBorder);
  style.setProperty('--photo-border-width', `${template.node.photoBorderWidth}px`);
  style.setProperty('--photo-border-style', template.node.shape.photoBorderStyle);
  style.setProperty('--accent-glow', `0 0 0 2px ${template.accent}, 0 8px 32px rgba(0,0,0,0.5)`);
  style.setProperty('--font-family', template.fontFamily);

  root.dataset.photoShape = template.node.shape.photoShape;
  root.dataset.shadowIntensity = template.node.shape.shadowIntensity;
  root.dataset.divider = template.node.shape.dividerStyle;
}
