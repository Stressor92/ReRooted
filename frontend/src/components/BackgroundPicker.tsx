import * as Popover from '@radix-ui/react-popover';
import { BACKGROUND_OPTIONS } from '../design/templates/types';
import { useTemplate } from '../hooks/useTemplate';

export default function BackgroundPicker() {
  const backgroundType = useTemplate((state) => state.backgroundType);
  const setBackgroundType = useTemplate((state) => state.setBackgroundType);
  const activeOption = BACKGROUND_OPTIONS.find((option) => option.value === backgroundType) ?? BACKGROUND_OPTIONS[0];

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="rerooted-toolbar-button" title="Hintergrund auswählen">
          Hintergrund
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="rerooted-template-popover" sideOffset={8} align="start">
          <div className="rerooted-background-menu">
            {BACKGROUND_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`rerooted-background-option${backgroundType === option.value ? ' is-active' : ''}`}
                onClick={() => setBackgroundType(option.value)}
              >
                <span>{option.label}</span>
                {backgroundType === option.value ? <strong>✓</strong> : null}
              </button>
            ))}
          </div>
          <div className="rerooted-template-name">{activeOption.label}</div>
          <Popover.Arrow className="rerooted-template-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
