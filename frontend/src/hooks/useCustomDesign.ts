import { create } from 'zustand';
import { applyTemplate } from '../design/templates/types';
import {
  DEFAULT_CUSTOM,
  buildCustomTemplate,
  loadCustomState,
  saveCustomState,
  type CustomDesignState,
} from '../design/templates/CustomTemplate';
import { useTemplate } from './useTemplate';

interface CustomDesignStore {
  state: CustomDesignState;
  showPanel: boolean;
  setShowPanel: (value: boolean) => void;
  update: (partial: Partial<CustomDesignState>) => void;
  reset: () => void;
}

export const useCustomDesign = create<CustomDesignStore>((set, get) => ({
  state: loadCustomState(),
  showPanel: false,
  setShowPanel: (value) => set({ showPanel: value }),
  update: (partial) => {
    const next = { ...get().state, ...partial };
    const template = buildCustomTemplate(next);

    set({ state: next });
    applyTemplate(template);
    saveCustomState(next);

    if (useTemplate.getState().activeTemplate.id === 'custom') {
      useTemplate.setState((current) => ({
        activeTemplate: template,
        backgroundType: current.backgroundType,
      }));
    }
  },
  reset: () => {
    const template = buildCustomTemplate(DEFAULT_CUSTOM);

    set({ state: DEFAULT_CUSTOM });
    applyTemplate(template);
    saveCustomState(DEFAULT_CUSTOM);

    if (useTemplate.getState().activeTemplate.id === 'custom') {
      useTemplate.setState((current) => ({
        activeTemplate: template,
        backgroundType: current.backgroundType,
      }));
    }
  },
}));
