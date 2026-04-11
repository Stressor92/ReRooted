import type { DesignTemplate, NodeShapeConfig } from './types';

const STORAGE_KEY = 'rerooted_custom_design';

export interface CustomDesignState {
  canvasBgH: number;
  canvasBgS: number;
  canvasBgL: number;
  nodeBgH: number;
  nodeBgS: number;
  nodeBgL: number;
  accentH: number;
  accentS: number;
  accentL: number;
  nodeNameH: number;
  nodeNameS: number;
  nodeNameL: number;
  nodeDateH: number;
  nodeDateS: number;
  nodeDateL: number;
  photoBorderH: number;
  photoBorderS: number;
  photoBorderL: number;
  cardRadius: number;
  photoShape: NodeShapeConfig['photoShape'];
  photoBorderStyle: NodeShapeConfig['photoBorderStyle'];
  shadowIntensity: NodeShapeConfig['shadowIntensity'];
  dividerStyle: NodeShapeConfig['dividerStyle'];
  fontFamily: string;
}

export const DEFAULT_CUSTOM: CustomDesignState = {
  canvasBgH: 130,
  canvasBgS: 40,
  canvasBgL: 8,
  nodeBgH: 130,
  nodeBgS: 30,
  nodeBgL: 14,
  accentH: 160,
  accentS: 65,
  accentL: 40,
  nodeNameH: 0,
  nodeNameS: 0,
  nodeNameL: 95,
  nodeDateH: 130,
  nodeDateS: 40,
  nodeDateL: 63,
  photoBorderH: 0,
  photoBorderS: 0,
  photoBorderL: 0,
  cardRadius: 14,
  photoShape: 'circle',
  photoBorderStyle: 'solid',
  shadowIntensity: 'medium',
  dividerStyle: 'dot',
  fontFamily: "'Inter', sans-serif",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hsl(h: number, s: number, l: number): string {
  return `hsl(${clamp(h, 0, 360)}, ${clamp(s, 0, 100)}%, ${clamp(l, 0, 100)}%)`;
}

export function buildCustomTemplate(state: CustomDesignState): DesignTemplate {
  const borderLightness = clamp(state.nodeBgL + 10, 0, 100);

  return {
    id: 'custom',
    name: 'Benutzerdefiniert',
    isCustom: true,
    canvas: {
      background: hsl(state.canvasBgH, state.canvasBgS, state.canvasBgL),
      backgroundType: 'dots',
      dotColor: `hsla(${clamp(state.accentH, 0, 360)}, ${clamp(state.accentS, 0, 100)}%, ${clamp(state.accentL, 0, 100)}%, 0.2)`,
    },
    node: {
      background: hsl(state.nodeBgH, state.nodeBgS, state.nodeBgL),
      border: hsl(state.nodeBgH, state.nodeBgS, borderLightness),
      borderWidth: 1,
      nameColor: hsl(state.nodeNameH, state.nodeNameS, state.nodeNameL),
      dateColor: hsl(state.nodeDateH, state.nodeDateS, state.nodeDateL),
      photoBorder: hsl(state.photoBorderH, state.photoBorderS, state.photoBorderL),
      photoBorderWidth: 3,
      shape: {
        cardRadius: clamp(state.cardRadius, 0, 24),
        photoShape: state.photoShape,
        photoBorderStyle: state.photoBorderStyle,
        shadowIntensity: state.shadowIntensity,
        dividerStyle: state.dividerStyle,
      },
    },
    panel: {
      background: hsl(state.nodeBgH, state.nodeBgS, clamp(state.nodeBgL - 3, 0, 100)),
      border: hsl(state.nodeBgH, state.nodeBgS, borderLightness),
    },
    accent: hsl(state.accentH, state.accentS, state.accentL),
    fontFamily: state.fontFamily,
  };
}

export function loadCustomState(): CustomDesignState {
  if (typeof window === 'undefined') {
    return DEFAULT_CUSTOM;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CUSTOM, ...JSON.parse(raw) } : DEFAULT_CUSTOM;
  } catch {
    return DEFAULT_CUSTOM;
  }
}

let saveTimeout: number | undefined;

export function saveCustomState(state: CustomDesignState): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.clearTimeout(saveTimeout);
  saveTimeout = window.setTimeout(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, 500);
}
