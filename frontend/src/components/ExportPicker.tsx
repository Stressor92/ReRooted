import * as Popover from '@radix-ui/react-popover';
import { useCanvasExport } from '../hooks/useCanvasExport';

export default function ExportPicker() {
  const { exportCanvas, formats } = useCanvasExport();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="rerooted-toolbar-button" title="Bild exportieren">
          📷
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="rerooted-template-popover" sideOffset={8} align="center">
          <div className="rerooted-background-menu">
            {formats.map((format) => (
              <Popover.Close asChild key={format.id}>
                <button type="button" className="rerooted-background-option" onClick={() => void exportCanvas(format.id)}>
                  <span>{format.label}</span>
                  <strong>{format.extension.toUpperCase()}</strong>
                </button>
              </Popover.Close>
            ))}
          </div>
          <div className="rerooted-template-name">Exportformat wählen</div>
          <Popover.Arrow className="rerooted-template-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
