import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { FeuilletIcon } from "./IconPicker";
import { visitEditorTab, nextEditorTab, readEditorTabs } from "./editor-tabs";
import type { Page } from "./types";
export function EditorTabs({
  pages,
  current,
  navigation,
  onOpen,
  onClose,
  onNew,
}: {
  pages: Page[];
  current: Page | null;
  navigation: { id: string; newTab: boolean };
  onOpen: (id: string) => void;
  onClose: (next: string | null) => Promise<boolean>;
  onNew: () => void;
}) {
  const key = "feuillet.editor-tabs:" + new URL(".", location.href).pathname;
  const [ids, setIds] = useState<string[]>(() => {
      try {
        return readEditorTabs(localStorage.getItem(key));
      } catch {
        return [];
      }
    }),
    list = useRef<HTMLDivElement>(null),
    previous = useRef<string | null>(null);
  const tabs = ids
    .map((id) => pages.find((p) => String(p.id) === id))
    .filter((p): p is Page => !!p);
  useEffect(() => {
    if (current) {
      const id = String(current.id),
        old = previous.current;
      setIds((prev) =>
        visitEditorTab(
          prev,
          id,
          old,
          navigation.id === id && navigation.newTab,
        ),
      );
      previous.current = id;
    }
  }, [current?.id]);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(ids));
    } catch {}
  }, [ids, key]);
  useEffect(() => {
    const active = list.current?.querySelector<HTMLElement>(
      '[aria-selected="true"]',
    );
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current?.id, ids.length]);
  async function close(id: string) {
    if (
      String(current?.id) === id &&
      !(await onClose(
        nextEditorTab(
          tabs.map((p) => String(p.id)),
          id,
        ),
      ))
    )
      return;
    setIds((prev) => prev.filter((p) => p !== id));
  }
  if (!tabs.length && !current) return null;
  return (
    <nav className="editor-tabs" aria-label="Pages ouvertes">
      <div
        className="editor-tabs-scroll"
        role="tablist"
        ref={list}
        aria-label="Onglets de rédaction"
      >
        {tabs.map((p, i) => {
          const id = String(p.id),
            active = id === String(current?.id),
            title = active ? current!.title : p.title;
          return (
            <div key={id} className={`editor-tab ${active ? "is-active" : ""}`}>
              <button
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active || (!current && i === 0) ? 0 : -1}
                title={title}
                onClick={() => {
                  if (!active) onOpen(id);
                }}
                onKeyDown={(e) => {
                  const direction =
                    e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                  if (direction) {
                    e.preventDefault();
                    const next = (i + direction + tabs.length) % tabs.length;
                    list.current
                      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                      [next]?.focus();
                    onOpen(String(tabs[next].id));
                  }
                }}
              >
                <FeuilletIcon icon={p.icon} iconId={p.icon_id} size={16} />
                <span>{title || "Sans titre"}</span>
              </button>
              <button
                type="button"
                className="editor-tab-close"
                aria-label={`Fermer l’onglet ${title || "Sans titre"}`}
                onClick={() => void close(id)}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="editor-tab-new"
        aria-label="Créer une page dans un nouvel onglet"
        title="Nouvelle page"
        onClick={onNew}
      >
        <Plus size={17} />
      </button>
    </nav>
  );
}
