import { useId, useState, type ReactNode, type KeyboardEvent } from "react";
import { NotebookPen, Palette, Globe2, Archive, RefreshCw } from "lucide-react";
const icons = [NotebookPen, Palette, Globe2, Archive, RefreshCw];
type Panel = {
  id: string;
  title: string;
  description: string;
  content: ReactNode;
};
export function SettingsWorkspace({ panels }: { panels: Panel[] }) {
  const [active, setActive] = useState(panels[0].id);
  const prefix = useId();
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const forward = ["ArrowDown", "ArrowRight"].includes(event.key),
      backward = ["ArrowUp", "ArrowLeft"].includes(event.key);
    if (!forward && !backward && !["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? panels.length - 1
          : (index + (forward ? 1 : -1) + panels.length) % panels.length;
    setActive(panels[next].id);
    document.getElementById(`${prefix}-tab-${panels[next].id}`)?.focus();
  }
  return (
    <div className="settings-workspace">
      <nav
        role="tablist"
        aria-label="Sections des réglages"
        aria-orientation="vertical"
      >
        {panels.map((panel, index) => {
          const Icon = icons[index] || NotebookPen;
          return (
            <button
              key={panel.id}
              type="button"
              role="tab"
              id={`${prefix}-tab-${panel.id}`}
              aria-controls={`${prefix}-panel-${panel.id}`}
              aria-selected={active === panel.id}
              tabIndex={active === panel.id ? 0 : -1}
              onClick={() => setActive(panel.id)}
              onKeyDown={(event) => navigate(event, index)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{panel.title}</span>
            </button>
          );
        })}
      </nav>
      {panels.map((panel) => (
        <section
          className="settings-workspace-panel"
          key={panel.id}
          hidden={active !== panel.id}
          role="tabpanel"
          id={`${prefix}-panel-${panel.id}`}
          aria-labelledby={`${prefix}-tab-${panel.id}`}
          tabIndex={0}
        >
          <header className="settings-intro">
            <h3>{panel.title}</h3>
            <p>{panel.description}</p>
          </header>
          {panel.content}
        </section>
      ))}
    </div>
  );
}
