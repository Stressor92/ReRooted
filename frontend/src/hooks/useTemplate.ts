import { create } from 'zustand';
import NightForest from '../design/templates/NightForest';
import { applyTemplate, type BackgroundType, type DesignTemplate } from '../design/templates/types';

if (typeof document !== 'undefined') {
  applyTemplate(NightForest);
}

type TemplateStore = {
  activeTemplate: DesignTemplate;
  backgroundType: BackgroundType;
  setTemplate: (template: DesignTemplate) => void;
  setBackgroundType: (backgroundType: BackgroundType) => void;
};

export const useTemplate = create<TemplateStore>((set, get) => ({
  activeTemplate: NightForest,
  backgroundType: NightForest.canvas.backgroundType,
  setTemplate: (template) => {
    applyTemplate(template);
    set({ activeTemplate: template, backgroundType: template.canvas.backgroundType });
  },
  setBackgroundType: (backgroundType) => {
    const { activeTemplate } = get();
    applyTemplate(activeTemplate);
    set({ backgroundType });
  },
}));
