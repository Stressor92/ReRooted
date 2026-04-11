import * as Popover from '@radix-ui/react-popover';
import { ALL_TEMPLATES } from '../design/templates';
import { buildCustomTemplate } from '../design/templates/CustomTemplate';
import { useCustomDesign } from '../hooks/useCustomDesign';
import { useTemplate } from '../hooks/useTemplate';

function getShapeLabel(shape: string): string {
  switch (shape) {
    case 'circle':
      return 'Kreisfoto';
    case 'rounded':
      return 'Weiche Karte';
    case 'square':
      return 'Klare Kanten';
    case 'diamond':
      return 'Rautenfoto';
    default:
      return 'Stilvorlage';
  }
}

function getPhotoPreviewStyle(shape: string): React.CSSProperties {
  if (shape === 'circle') {
    return { borderRadius: '999px' };
  }

  if (shape === 'rounded') {
    return { borderRadius: '10px' };
  }

  if (shape === 'diamond') {
    return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', borderRadius: 0 };
  }

  return { borderRadius: '3px' };
}

export default function TemplatePicker() {
  const activeTemplate = useTemplate((state) => state.activeTemplate);
  const setTemplate = useTemplate((state) => state.setTemplate);
  const customState = useCustomDesign((state) => state.state);
  const setShowPanel = useCustomDesign((state) => state.setShowPanel);
  const customPreview = buildCustomTemplate(customState);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="rerooted-toolbar-button" title="Design auswählen">
          Designs
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="rerooted-template-popover" sideOffset={8} align="start">
          <div className="rerooted-template-grid">
            {ALL_TEMPLATES.map((template) => (
              <Popover.Close asChild key={template.id}>
                <button
                  type="button"
                  className={`rerooted-template-card${activeTemplate.id === template.id ? ' is-active' : ''}`}
                  onClick={() => setTemplate(template)}
                >
                  <span className="rerooted-template-card-preview" style={{ background: template.canvas.background }}>
                    <span
                      style={{
                        background: template.node.background,
                        borderColor: template.node.border,
                        borderRadius: `${template.node.shape.cardRadius}px`,
                      }}
                    >
                      <span
                        style={{
                          background: template.accent,
                          ...getPhotoPreviewStyle(template.node.shape.photoShape),
                        }}
                      />
                    </span>
                  </span>
                  <strong>{template.name}</strong>
                  <small>{getShapeLabel(template.node.shape.photoShape)}</small>
                </button>
              </Popover.Close>
            ))}

            <Popover.Close asChild>
              <button
                type="button"
                className={`rerooted-template-card rerooted-template-card--custom${activeTemplate.id === 'custom' ? ' is-active' : ''}`}
                onClick={() => setShowPanel(true)}
              >
                <span className="rerooted-template-card-preview is-custom" style={{ background: customPreview.canvas.background }}>
                  <span
                    style={{
                      background: customPreview.node.background,
                      borderColor: customPreview.node.border,
                      borderRadius: `${customPreview.node.shape.cardRadius}px`,
                    }}
                  >
                    <span
                      style={{
                        background: customPreview.accent,
                        ...getPhotoPreviewStyle(customPreview.node.shape.photoShape),
                      }}
                    />
                  </span>
                </span>
                <strong>✦ Benutzerdefiniert...</strong>
                <small>⚙️ Live anpassen</small>
              </button>
            </Popover.Close>
          </div>

          <div className="rerooted-template-name">Aktiv: {activeTemplate.name}</div>
          <Popover.Arrow className="rerooted-template-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
