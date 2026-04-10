import * as Popover from '@radix-ui/react-popover';
import ArcticBlue from '../design/templates/ArcticBlue';
import ClassicPaper from '../design/templates/ClassicPaper';
import MinimalLight from '../design/templates/MinimalLight';
import NightForest from '../design/templates/NightForest';
import SepiaHeritage from '../design/templates/SepiaHeritage';
import { useTemplate } from '../hooks/useTemplate';

const templates = [NightForest, ClassicPaper, ArcticBlue, SepiaHeritage, MinimalLight];

export default function TemplatePicker() {
  const activeTemplate = useTemplate((state) => state.activeTemplate);
  const setTemplate = useTemplate((state) => state.setTemplate);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="rerooted-toolbar-button" title="Template auswählen">
          Tmpl ●●●
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content className="rerooted-template-popover" sideOffset={8} align="start">
          <div className="rerooted-template-swatches">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`rerooted-template-swatch${activeTemplate.id === template.id ? ' is-active' : ''}`}
                title={template.name}
                onClick={() => setTemplate(template)}
                style={{ background: template.canvas.background }}
              >
                <span style={{ background: template.node.background }} />
              </button>
            ))}
          </div>
          <div className="rerooted-template-name">{activeTemplate.name}</div>
          <Popover.Arrow className="rerooted-template-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
