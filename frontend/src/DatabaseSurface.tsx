import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Database as DatabaseIcon,
  Plus,
  Search,
  Lock,
  LoaderCircle,
} from "lucide-react";
import { FloatingSurface } from "./FloatingSurface";
import { api } from "./types";
import { useState } from "react";
import { errorText, normalizedSearch, type Database } from "./database-types";

/** Keep controls out of ProseMirror while inheriting the page's theme. */
function host(anchor?: HTMLElement | null) {
  return (
    anchor?.closest(".database-sheet,.database-modal,.main-panel") ||
    document.body
  );
}

export function DatabasePopover({
  anchor,
  title,
  onClose,
  children,
}: {
  anchor: HTMLElement | null;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      content.current
        ?.querySelector<HTMLElement>("input,textarea,[role=combobox]")
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  function close() {
    onClose();
    anchor?.focus({ preventScroll: true });
  }
  return createPortal(
    <FloatingSurface
      anchor={anchor}
      label={title}
      role="dialog"
      className="database-popover"
      onClose={close}
    >
      <div ref={content}>
        <header className="database-popover-heading">
          <strong>{title}</strong>
          <button
            type="button"
            aria-label={`Fermer : ${title}`}
            onClick={close}
          >
            <X size={16} />
          </button>
        </header>
        {children}
      </div>
    </FloatingSurface>,
    host(anchor),
  );
}

/** A contextual sheet edits the source without leaving the containing page. */
export function DatabaseSheet({
  title,
  subtitle,
  onClose,
  children,
  anchor,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  anchor?: HTMLElement | null;
}) {
  const ref = useRef<HTMLElement>(null),
    close = useRef(onClose),
    id = useId();
  close.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() =>
      ref.current
        ?.querySelector<HTMLElement>(
          ".database-sheet-body input:not([type=file]):not([aria-hidden=true]),.database-sheet-body textarea,.database-sheet-body button[role=combobox]",
        )
        ?.focus({ preventScroll: true }),
    );
    const key = (event: KeyboardEvent) => {
      // A nested select owns its own Escape/Tab, not the sheet behind it.
      if (document.querySelector(".feuillet-floating")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
      if (event.key === "Tab") {
        const controls = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled):not([aria-hidden=true]),textarea:not(:disabled),select:not(:disabled):not([aria-hidden=true]),a[href],[tabindex="0"]',
          ) || []),
        ].filter((n) => n.getClientRects().length);
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", key, true);
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <div
      className="database-sheet-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close.current();
      }}
    >
      <section
        ref={ref}
        className="database-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <header className="database-sheet-heading">
          <div>
            <p>{subtitle || "Sans quitter votre page"}</p>
            <h3 id={id}>{title}</h3>
          </div>
          <button
            type="button"
            aria-label="Fermer le panneau"
            onClick={() => close.current()}
          >
            <X size={20} />
          </button>
        </header>
        <div className="database-sheet-body">{children}</div>
      </section>
    </div>,
    host(anchor),
  );
}

export function DatabasePicker({
  onChoose,
  onClose,
}: {
  onChoose: (id: string) => void;
  onClose: () => void;
}) {
  const [databases, setDatabases] = useState<Database[]>([]),
    [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null),
    frame = useRef(0),
    saving = useRef(false);
  useEffect(() => {
    let cancelled = false;
    frame.current = requestAnimationFrame(() => input.current?.focus());
    void api<{ databases: Database[] }>("db_list")
      .then((result) => {
        if (!cancelled) setDatabases(result.databases);
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame.current);
    };
  }, []);
  async function create() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const { database } = await api<{ database: Database }>("db_create", {
        name: query.trim() || "Nouvelle base",
      });
      onChoose(database.id);
    } catch (e) {
      setError(errorText(e));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <DatabaseSheet
      title="Une base, dans votre page"
      subtitle="Tableaux & données"
      onClose={() => {
        if (!saving.current) onClose();
      }}
    >
      <p className="database-picker-intro">
        Créez un tableau ou affichez une base existante. Vous pourrez tout
        modifier ici.
      </p>
      <form
        className="database-picker-search"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <Search size={18} />
        <input
          ref={input}
          aria-label="Nom ou recherche de base"
          placeholder="Nom de votre base…"
          maxLength={160}
          value={query}
          disabled={busy}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
      {error && (
        <p role="alert" className="database-error">
          {error}
        </p>
      )}
      <button
        className="database-create-choice"
        disabled={busy}
        onClick={() => void create()}
      >
        <span>{busy ? <LoaderCircle className="spin" /> : <Plus />}</span>
        <div>
          <strong>
            Créer {query.trim() ? `« ${query.trim()} »` : "une nouvelle base"}
          </strong>
          <small>Un tableau vide, prêt à remplir.</small>
        </div>
      </button>
      <h4 className="database-picker-label">Ou utiliser une base existante</h4>
      {loading ? (
        <p role="status">Chargement des bases…</p>
      ) : (
        <div className="database-picker-list">
          {databases
            .filter((d) =>
              normalizedSearch(d.name).includes(normalizedSearch(query)),
            )
            .map((d) => (
              <button key={d.id} disabled={busy} onClick={() => onChoose(d.id)}>
                <DatabaseIcon size={19} />
                <span>{d.name}</span>
                {d.visibility === "private" && (
                  <Lock size={13} aria-label="Base privée" />
                )}
              </button>
            ))}
          {!databases.length && <p>Vos prochaines bases apparaîtront ici.</p>}
        </div>
      )}
    </DatabaseSheet>
  );
}
