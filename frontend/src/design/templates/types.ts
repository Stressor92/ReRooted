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
    borderRadius: number;
    shadow: string;
    photoBorder: string;
    photoBorderWidth: number;
    nameColor: string;
    dateColor: string;
  };
  panel?: {
    background: string;
    border: string;
  };
  accent: string;
  fontFamily: string;
}

export function applyTemplate(t: DesignTemplate): void {
  const r = document.documentElement.style;
  r.setProperty('--canvas-bg', t.canvas.background);
  r.setProperty('--canvas-dot-color', t.canvas.dotColor ?? 'rgba(255,255,255,0.1)');
  r.setProperty('--node-bg', t.node.background);
  r.setProperty('--node-border', t.node.border);
  r.setProperty('--node-border-width', `${t.node.borderWidth}px`);
  r.setProperty('--node-radius', `${t.node.borderRadius}px`);
  r.setProperty('--node-shadow', t.node.shadow);
  r.setProperty('--node-name-color', t.node.nameColor);
  r.setProperty('--node-date-color', t.node.dateColor);
  r.setProperty('--panel-bg', t.panel?.background ?? t.node.background);
  r.setProperty('--panel-border', t.panel?.border ?? t.node.border);
  r.setProperty('--accent', t.accent);
  r.setProperty('--photo-border', t.node.photoBorder);
  r.setProperty('--photo-border-width', `${t.node.photoBorderWidth}px`);
  r.setProperty('--accent-glow', `0 0 0 2px ${t.accent}, 0 8px 32px rgba(0,0,0,0.5)`);
  r.setProperty('--font-family', t.fontFamily);
}
