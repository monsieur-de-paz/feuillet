import { useLayoutEffect, useRef, type ReactNode } from "react";
import { FloatingSurface } from "./FloatingSurface";

export type MenuAction = {
  label: string;
  icon?: ReactNode;
  run: () => void;
  disabled?: boolean;
  danger?: boolean;
  group?: string;
  shortcut?: string;
  checked?: boolean;
};
export function ContextMenu({
  point,
  anchor,
  actions,
  title,
  onClose,
  onRestoreFocus,
}: {
  point?: { x: number; y: number };
  anchor?: HTMLElement | null;
  actions: MenuAction[];
  title: string;
  onClose: () => void;
  onRestoreFocus?: () => void;
}) {
  const content = useRef<HTMLDivElement>(null);
  const previous = useRef(document.activeElement as HTMLElement | null);
  useLayoutEffect(() => {
    const focus = () =>
      content.current
        ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus({ preventScroll: true });
    focus();
    // ProseMirror may restore focus in its own next-frame callback after a pointer event.
    let follow = 0;
    const frame = requestAnimationFrame(() => {
      follow = requestAnimationFrame(focus);
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(follow);
    };
  }, []);
  const close = () => {
    onClose();
    if (onRestoreFocus) onRestoreFocus();
    else previous.current?.focus({ preventScroll: true });
  };
  return (
    <FloatingSurface
      point={point}
      anchor={anchor}
      onClose={close}
      label={`Actions · ${title}`}
      className="feuillet-context-menu"
    >
      <div
        ref={content}
        onKeyDown={(e) => {
          e.stopPropagation();
          const buttons = Array.from(
            content.current?.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ) || [],
          );
          const i = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          let next = i;
          if (e.key === "ArrowDown") next = (i + 1) % buttons.length;
          else if (e.key === "ArrowUp")
            next = (i - 1 + buttons.length) % buttons.length;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = buttons.length - 1;
          else if (e.key === "Tab") {
            close();
            return;
          } else return;
          e.preventDefault();
          buttons[next]?.focus();
        }}
      >
        <div className="feuillet-menu-heading">{title}</div>
        {actions.map((action, i) => (
          <div key={action.label}>
            {i > 0 && action.group !== actions[i - 1].group && (
              <div className="feuillet-menu-divider" role="separator" />
            )}
            <button
              type="button"
              role={action.checked === undefined ? "menuitem" : "menuitemradio"}
              aria-checked={action.checked}
              disabled={action.disabled}
              className={action.danger ? "danger" : ""}
              onClick={() => {
                onClose();
                action.run();
              }}
            >
              <span className="feuillet-menu-icon">{action.icon}</span>
              <span>{action.label}</span>
              {action.shortcut && <kbd>{action.shortcut}</kbd>}
            </button>
          </div>
        ))}
      </div>
    </FloatingSurface>
  );
}
