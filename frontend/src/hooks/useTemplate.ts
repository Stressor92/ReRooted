import { create } from 'zustand';
import { ALL_TEMPLATES } from '../design/templates';
import { buildCustomTemplate, loadCustomState } from '../design/templates/CustomTemplate';
import NightForest from '../design/templates/NightForest';
import { applyTemplate, type BackgroundType, type DesignTemplate } from '../design/templates/types';

const TEMPLATE_STORAGE_KEY = 'rerooted_active_template';
const BACKGROUND_STORAGE_KEY = 'rerooted_background_type';

function isBackgroundType(value: string | null): value is BackgroundType {
  return value === 'dots'
    || value === 'dots-dense'
    || value === 'dots-large'
    || value === 'lines'
    || value === 'lines-dense'
    || value === 'cross'
    || value === 'none';
}

function resolveInitialTemplate(): DesignTemplate {
  if (typeof window === 'undefined') {
    return NightForest;
  }

  try {
    const storedTemplateId = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);

    if (storedTemplateId === 'custom') {
      return buildCustomTemplate(loadCustomState());
    }

    return ALL_TEMPLATES.find((template) => template.id === storedTemplateId) ?? NightForest;
  } catch {
    return NightForest;
  }
}

function resolveInitialBackground(template: DesignTemplate): BackgroundType {
  if (typeof window === 'undefined') {
    return template.canvas.backgroundType;
  }

  try {
    const storedBackground = window.localStorage.getItem(BACKGROUND_STORAGE_KEY);
    return isBackgroundType(storedBackground) ? storedBackground : template.canvas.backgroundType;
  } catch {
    return template.canvas.backgroundType;
  }
}

function persistSelection(template: DesignTemplate, backgroundType: BackgroundType): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, template.id);
    window.localStorage.setItem(BACKGROUND_STORAGE_KEY, backgroundType);
  } catch {
    // Ignore storage write errors in private modes or restricted environments.
  }
}

const initialTemplate = resolveInitialTemplate();
const initialBackground = resolveInitialBackground(initialTemplate);

if (typeof document !== 'undefined') {
  applyTemplate(initialTemplate);
}

type TemplateStore = {
  activeTemplate: DesignTemplate;
  backgroundType: BackgroundType;
  setTemplate: (template: DesignTemplate) => void;
  setBackgroundType: (backgroundType: BackgroundType) => void;
};

export const useTemplate = create<TemplateStore>((set, get) => ({
  activeTemplate: initialTemplate,
  backgroundType: initialBackground,
  setTemplate: (template) => {
    applyTemplate(template);
    persistSelection(template, template.canvas.backgroundType);
    set({ activeTemplate: template, backgroundType: template.canvas.backgroundType });
  },
  setBackgroundType: (backgroundType) => {
    const { activeTemplate } = get();
    persistSelection(activeTemplate, backgroundType);
    set({ backgroundType });
  },
}));
