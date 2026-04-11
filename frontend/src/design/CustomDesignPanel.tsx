import { motion } from 'framer-motion';
import { buildCustomTemplate, type CustomDesignState } from './templates/CustomTemplate';
import { applyTemplate } from './templates/types';
import { useCustomDesign } from '../hooks/useCustomDesign';
import { useTemplate } from '../hooks/useTemplate';

const FONT_OPTIONS = [
  { value: "'Inter', sans-serif", label: 'Inter' },
  { value: "'Georgia', serif", label: 'Georgia' },
  { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
  { value: "'Helvetica Neue', sans-serif", label: 'Helvetica Neue' },
  { value: "'Palatino', serif", label: 'Palatino' },
];

const PHOTO_SHAPES: Array<{ value: CustomDesignState['photoShape']; label: string }> = [
  { value: 'circle', label: 'Kreis' },
  { value: 'rounded', label: 'Weich' },
  { value: 'square', label: 'Eckig' },
  { value: 'diamond', label: 'Raute' },
];

const BORDER_STYLE_OPTIONS: Array<{ value: CustomDesignState['photoBorderStyle']; label: string }> = [
  { value: 'solid', label: 'Durchgezogen' },
  { value: 'double', label: 'Doppelt' },
  { value: 'none', label: 'Keiner' },
];

const SHADOW_OPTIONS: Array<{ value: CustomDesignState['shadowIntensity']; label: string }> = [
  { value: 'none', label: 'Keiner' },
  { value: 'subtle', label: 'Leicht' },
  { value: 'medium', label: 'Mittel' },
  { value: 'dramatic', label: 'Dramatisch' },
];

const DIVIDER_OPTIONS: Array<{ value: CustomDesignState['dividerStyle']; label: string }> = [
  { value: 'none', label: 'Keiner' },
  { value: 'line', label: 'Linie' },
  { value: 'dot', label: 'Punkt' },
];

function hsl(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

type HslColorEditorProps = {
  label: string;
  state: CustomDesignState;
  hKey: keyof CustomDesignState;
  sKey: keyof CustomDesignState;
  lKey: keyof CustomDesignState;
  update: (partial: Partial<CustomDesignState>) => void;
};

function HslColorEditor({ label, state, hKey, sKey, lKey, update }: HslColorEditorProps) {
  const h = Number(state[hKey]);
  const s = Number(state[sKey]);
  const l = Number(state[lKey]);
  const preview = hsl(h, s, l);

  return (
    <div className="rerooted-custom-group">
      <div className="rerooted-custom-group-header">
        <strong>{label}</strong>
        <span className="rerooted-custom-color-preview" style={{ background: preview }} />
      </div>

      <label className="rerooted-custom-slider-row">
        <span>H</span>
        <input
          type="range"
          min={0}
          max={360}
          value={h}
          onChange={(event) => update({ [hKey]: Number(event.target.value) } as Partial<CustomDesignState>)}
          style={{
            backgroundImage:
              'linear-gradient(to right, hsl(0,80%,50%), hsl(60,80%,50%), hsl(120,80%,50%), hsl(180,80%,50%), hsl(240,80%,50%), hsl(300,80%,50%), hsl(360,80%,50%))',
          }}
        />
        <output>{h}</output>
      </label>

      <label className="rerooted-custom-slider-row">
        <span>S</span>
        <input
          type="range"
          min={0}
          max={100}
          value={s}
          onChange={(event) => update({ [sKey]: Number(event.target.value) } as Partial<CustomDesignState>)}
          style={{
            backgroundImage: `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`,
          }}
        />
        <output>{s}%</output>
      </label>

      <label className="rerooted-custom-slider-row">
        <span>L</span>
        <input
          type="range"
          min={0}
          max={100}
          value={l}
          onChange={(event) => update({ [lKey]: Number(event.target.value) } as Partial<CustomDesignState>)}
          style={{
            backgroundImage: `linear-gradient(to right, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%))`,
          }}
        />
        <output>{l}%</output>
      </label>
    </div>
  );
}

type SelectFieldProps<T extends string> = {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
};

function SelectField<T extends string>({ label, value, options, onChange }: SelectFieldProps<T>) {
  return (
    <label className="rerooted-custom-select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CustomDesignPanel() {
  const state = useCustomDesign((store) => store.state);
  const update = useCustomDesign((store) => store.update);
  const reset = useCustomDesign((store) => store.reset);
  const setShowPanel = useCustomDesign((store) => store.setShowPanel);
  const activeTemplate = useTemplate((store) => store.activeTemplate);
  const setTemplate = useTemplate((store) => store.setTemplate);

  const handleClose = () => {
    if (activeTemplate.id !== 'custom') {
      applyTemplate(activeTemplate);
    }

    setShowPanel(false);
  };

  return (
    <motion.aside
      className="rerooted-custom-panel"
      initial={{ opacity: 0, x: -24, y: 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: -24, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="rerooted-custom-panel-header">
        <div>
          <strong>◈ Benutzerdefiniertes Design</strong>
          <span>Farben und Formen live anpassen</span>
        </div>
        <button type="button" className="rerooted-icon-button" onClick={handleClose} aria-label="Panel schließen">
          ×
        </button>
      </div>

      <div className="rerooted-custom-panel-body">
        <section className="rerooted-custom-section">
          <div className="rerooted-custom-section-title">Farben</div>
          <HslColorEditor label="Canvas-Hintergrund" state={state} hKey="canvasBgH" sKey="canvasBgS" lKey="canvasBgL" update={update} />
          <HslColorEditor label="Node-Karte" state={state} hKey="nodeBgH" sKey="nodeBgS" lKey="nodeBgL" update={update} />
          <HslColorEditor label="Akzentfarbe" state={state} hKey="accentH" sKey="accentS" lKey="accentL" update={update} />
          <HslColorEditor label="Name-Farbe" state={state} hKey="nodeNameH" sKey="nodeNameS" lKey="nodeNameL" update={update} />
          <HslColorEditor label="Datumsfarbe" state={state} hKey="nodeDateH" sKey="nodeDateS" lKey="nodeDateL" update={update} />
          <HslColorEditor label="Foto-Rahmen" state={state} hKey="photoBorderH" sKey="photoBorderS" lKey="photoBorderL" update={update} />
        </section>

        <section className="rerooted-custom-section">
          <div className="rerooted-custom-section-title">Formen</div>

          <label className="rerooted-custom-slider-row rerooted-custom-slider-row--single">
            <span>Ecken der Karte</span>
            <input
              type="range"
              min={0}
              max={24}
              value={state.cardRadius}
              onChange={(event) => update({ cardRadius: Number(event.target.value) })}
              style={{ backgroundImage: 'linear-gradient(to right, #475569, var(--accent))' }}
            />
            <output>{state.cardRadius}px</output>
          </label>

          <div className="rerooted-custom-shape-group">
            <span>Foto-Form</span>
            <div className="rerooted-custom-shape-options">
              {PHOTO_SHAPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rerooted-custom-shape-option${state.photoShape === option.value ? ' is-active' : ''}`}
                  onClick={() => update({ photoShape: option.value })}
                >
                  <span className={`rerooted-custom-shape-preview is-${option.value}`} />
                  <small>{option.label}</small>
                </button>
              ))}
            </div>
          </div>

          <SelectField
            label="Foto-Rahmen"
            value={state.photoBorderStyle}
            options={BORDER_STYLE_OPTIONS}
            onChange={(value) => update({ photoBorderStyle: value })}
          />
          <SelectField
            label="Schatten"
            value={state.shadowIntensity}
            options={SHADOW_OPTIONS}
            onChange={(value) => update({ shadowIntensity: value })}
          />
          <SelectField
            label="Trennlinie"
            value={state.dividerStyle}
            options={DIVIDER_OPTIONS}
            onChange={(value) => update({ dividerStyle: value })}
          />
          <SelectField
            label="Schriftart"
            value={state.fontFamily}
            options={FONT_OPTIONS}
            onChange={(value) => update({ fontFamily: value })}
          />

          <div className="rerooted-custom-card-preview">
            <div
              className={`rerooted-custom-card-preview__photo is-${state.photoShape}`}
              style={{ borderStyle: state.photoBorderStyle === 'none' ? 'solid' : state.photoBorderStyle, borderColor: hsl(state.photoBorderH, state.photoBorderS, state.photoBorderL), opacity: state.photoBorderStyle === 'none' ? 0.7 : 1 }}
            />
            <div
              className="rerooted-custom-card-preview__card"
              style={{
                borderRadius: `${state.cardRadius}px`,
                background: hsl(state.nodeBgH, state.nodeBgS, state.nodeBgL),
                borderColor: hsl(state.nodeBgH, state.nodeBgS, Math.min(100, state.nodeBgL + 10)),
              }}
            >
              <strong style={{ color: hsl(state.nodeNameH, state.nodeNameS, state.nodeNameL), fontFamily: state.fontFamily }}>Anna Beispiel</strong>
              <span style={{ color: hsl(state.nodeDateH, state.nodeDateS, state.nodeDateL) }}>1948 – 2019</span>
            </div>
          </div>
        </section>
      </div>

      <div className="rerooted-custom-panel-actions">
        <button type="button" className="rerooted-toolbar-button" onClick={reset}>
          Zurücksetzen
        </button>
        <button
          type="button"
          className="rerooted-toolbar-button is-primary"
          onClick={() => {
            setTemplate(buildCustomTemplate(state));
            setShowPanel(false);
          }}
        >
          Als Standard
        </button>
      </div>
    </motion.aside>
  );
}
