import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowUp,
  ArrowDown,
  Plus,
  RotateCcw,
  Trash2,
  Check,
  Move,
} from "lucide-react";
import {
  api,
  type Appearance,
  type Category,
  type Notebook,
  fileUrl,
  sizeLabel,
} from "./types";
import { adaptiveAccent, accentForeground, accentHover } from "./theme-colors";
export const accentColors = [
  "#38795d",
  "#2563eb",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#65a30d",
  "#0d9488",
  "#475569",
  "#a16207",
  "#6366f1",
  "#be185d",
  "#9333ea",
  "#16a34a",
];
const fonts: Record<string, string> = {
  sans: "Inter,system-ui,sans-serif",
  serif: "Georgia,serif",
  mono: "ui-monospace,monospace",
  quicksand: "Quicksand,system-ui,sans-serif",
  fraunces: "Fraunces,Georgia,serif",
};
export function themeStyle(a: Appearance): CSSProperties {
  const mode = a.mode || "light";
  const dark = mode !== "light";
  const surface = mode === "oled" ? "#000000" : dark ? "#17191d" : "#ffffff";
  const accent = adaptiveAccent(a.accent, mode, a.background);
  return {
    "--ui-font": fonts[a.font] || fonts.sans,
    "--surface": surface,
    "--surface-muted":
      mode === "oled" ? "#080808" : dark ? "#202329" : "#f7f8f4",
    "--surface-soft":
      mode === "oled" ? "#121212" : dark ? "#2a2e35" : "#eef0eb",
    "--ink": a.text,
    "--muted": dark ? "#afb3bd" : "#818778",
    "--line": dark ? "#373a42" : "#e4e6df",
    "--green": accent,
    "--accent": accent,
    "--accent-base": a.accent,
    "--page-accent": accent,
    "--accent-hover": accentHover(accent),
    "--accent-soft": `color-mix(in srgb, ${accent} ${dark ? "22" : "11"}%, ${surface})`,
    "--accent-contrast": accentForeground(accent),
    "--shadow": dark ? "0 14px 50px #0009" : "0 14px 50px #0002",
    colorScheme: dark ? "dark" : "light",
  } as CSSProperties;
}
export function ThemeControls({
  value,
  onChange,
  onReset,
}: {
  value: Appearance;
  onChange: (value: Partial<Appearance>) => void;
  onReset: () => void;
}) {
  return (
    <>
      <label>
        Mode d’affichage
        <select
          aria-label="Mode d’affichage"
          value={value.mode || "light"}
          onChange={(e) => {
            const mode = e.target.value as Appearance["mode"];
            onChange({
              mode,
              background:
                mode === "oled"
                  ? "#000000"
                  : mode === "dark"
                    ? "#17191d"
                    : "#ffffff",
              text: mode === "light" ? "#37352f" : "#eeeef0",
            });
          }}
        >
          <option value="light">Blanc</option>
          <option value="dark">Sombre</option>
          <option value="oled">Noir OLED</option>
        </select>
      </label>
      <div
        className="accent-variants"
        aria-label="Variantes automatiques de l’accent"
      >
        {(["light", "dark", "oled"] as const).map((mode) => {
          const accent = adaptiveAccent(
            value.accent,
            mode,
            mode === "light"
              ? "#FFFFFF"
              : mode === "dark"
                ? "#17191D"
                : "#000000",
          );
          return (
            <span key={mode}>
              <i style={{ background: accent }} />
              {mode === "light" ? "Clair" : mode === "dark" ? "Sombre" : "OLED"}
            </span>
          );
        })}
      </div>
      <p className="muted">
        L’accent choisi garde sa couleur en clair. Ses variantes sombre et OLED
        sont calculées automatiquement pour rester lisibles.
      </p>
      <div
        className="theme-palette"
        role="group"
        aria-label="Couleurs du thème"
      >
        {accentColors.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            aria-label={`Accent ${color}`}
            aria-pressed={value.accent.toLowerCase() === color}
            style={{ background: color }}
            onClick={() => onChange({ accent: color })}
          />
        ))}
      </div>
      <button type="button" className="small-button" onClick={onReset}>
        <RotateCcw size={15} /> Rétablir les couleurs de base
      </button>
    </>
  );
}
export function CategoriesEditor({
  categories,
  spaceId,
  spaceName,
  onRefresh,
}: {
  categories: Category[];
  spaceId: string;
  spaceName: string;
  onRefresh: () => Promise<any>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scoped = categories.filter((c) => String(c.space_id || "") === spaceId);
  const active = scoped.filter((c) => !c.deleted_at);
  const archived = scoped.filter((c) => c.deleted_at);
  async function change(action: string, body: any) {
    setError("");
    setBusy(true);
    try {
      await api(action, body);
      await onRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reorder(index: number, delta: number) {
    const other = active[index + delta];
    if (!other) return;
    setBusy(true);
    setError("");
    try {
      for (const [c, order] of [
        [active[index], other.sort_order],
        [other, active[index].sort_order],
      ] as [Category, number][]) {
        await api("save_category", {
          id: c.id,
          name: c.name,
          space_id: c.space_id,
          sort_order: order,
        });
      }
      await onRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="categories-editor">
      <p>
        Ces catégories appartiennent à <strong>{spaceName}</strong>. Les pages
        d’un autre espace peuvent utiliser des catégories différentes.
      </p>
      {active.map((c, i) => (
        <div className="category-edit-row" key={c.id}>
          <input
            aria-label={`Nom de la catégorie ${c.name}`}
            key={c.id + c.name}
            defaultValue={c.name}
            maxLength={60}
            onBlur={(e) => {
              if (e.target.value.trim() !== c.name)
                void change("save_category", { ...c, name: e.target.value });
            }}
          />
          <button
            aria-label={`Monter ${c.name}`}
            disabled={busy || i === 0}
            onClick={() => void reorder(i, -1)}
          >
            <ArrowUp size={15} />
          </button>
          <button
            aria-label={`Descendre ${c.name}`}
            disabled={busy || i === active.length - 1}
            onClick={() => void reorder(i, 1)}
          >
            <ArrowDown size={15} />
          </button>
          <button
            aria-label={`Retirer ${c.name}`}
            disabled={busy}
            onClick={() => void change("delete_category", { id: c.id })}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <form
        className="category-add"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          await change("save_category", {
            name,
            space_id: spaceId || null,
            sort_order: Math.max(-1, ...active.map((c) => c.sort_order)) + 1,
          });
          setName("");
        }}
      >
        <input
          aria-label="Nouvelle catégorie"
          placeholder="Cours, exercices, projets…"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="small-button" disabled={busy || !name.trim()}>
          <Plus size={16} /> Ajouter
        </button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="muted">
        Choisis la catégorie d’une page dans ses propriétés. Retirer une
        catégorie ne supprime aucune page.
      </p>
      {archived.length > 0 && (
        <details>
          <summary>Catégories retirées</summary>
          {archived.map((c) => (
            <div className="category-archived" key={c.id}>
              <span>{c.name}</span>
              <button
                className="small-button"
                disabled={busy}
                onClick={() => void change("restore_category", { id: c.id })}
              >
                Réactiver
              </button>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
export function NotebookControls({
  value,
  serverLimit,
  onSave,
}: {
  value: Notebook;
  serverLimit: number;
  onSave: (v: Notebook) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="modal-form notebook-controls"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await onSave(draft);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Mon carnet</h3>
      <label>
        Titre du carnet
        <input
          value={draft.title}
          required
          maxLength={80}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </label>
      <label>
        Sous-titre du carnet
        <input
          value={draft.subtitle}
          maxLength={120}
          onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
        />
      </label>
      <label className="notebook-auto-publish">
        <input
          type="checkbox"
          checked={draft.auto_publish !== false}
          onChange={(e) =>
            setDraft({ ...draft, auto_publish: e.target.checked })
          }
        />
        Mettre à jour automatiquement les pages déjà publiques
      </label>
      <p className="muted">
        Cette option synchronise les pages déjà publiques. Désactive-la pour
        préparer un brouillon avant de le publier manuellement.
      </p>
      <label className="notebook-auto-publish">
        <input
          type="checkbox"
          checked={!!draft.auto_publish_children}
          onChange={(e) =>
            setDraft({ ...draft, auto_publish_children: e.target.checked })
          }
        />
        Publier automatiquement les sous-pages des pages publiques
      </label>
      <p className="muted">
        L’activation publie toutes leurs sous-pages existantes et futures. Une
        sous-page hérite alors de l’accès public de son parent. Les racines
        privées et les réponses aux formulaires restent privées.
      </p>
      <label>
        Raccourci pour masquer ou afficher la navigation
        <span className="shortcut-settings">
          Ctrl/Cmd + Maj +
          <select
            aria-label="Touche du raccourci de navigation"
            value={
              draft.sidebar_shortcut === ""
                ? ""
                : (draft.sidebar_shortcut || "Mod+Shift+L").split("+").at(-1)
            }
            onChange={(e) =>
              setDraft({
                ...draft,
                sidebar_shortcut: e.target.value
                  ? "Mod+Shift+" + e.target.value
                  : "",
              })
            }
          >
            <option value="">Désactivé</option>
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("").map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label>
        Taille maximale d’un fichier (Mo)
        <input
          type="number"
          min="1"
          max="1024"
          step="1"
          value={Math.round(draft.max_upload / 1048576)}
          onChange={(e) =>
            setDraft({ ...draft, max_upload: Number(e.target.value) * 1048576 })
          }
        />
      </label>
      <p className="muted">
        Limite effective : {sizeLabel(Math.min(serverLimit, draft.max_upload))}.
        PHP autorise actuellement {sizeLabel(serverLimit)} sur ce serveur. Une
        valeur plus élevée dans Feuillet nécessite aussi un réglage PHP adapté
        chez l’hébergeur.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" disabled={busy}>
        <Check size={16} /> Enregistrer le carnet
      </button>
    </form>
  );
}
export function CoverTools({
  id,
  position,
  admin,
  onPosition,
  onChoose,
  onRemove,
  onZoom,
  onDone,
}: {
  id: string;
  position: { x: number; y: number };
  admin: boolean;
  onPosition: (p: { x: number; y: number }) => void;
  onChoose: () => void;
  onRemove: () => void;
  onZoom: () => void;
  onDone?: () => void;
}) {
  const img = useRef<HTMLImageElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    position: { x: number; y: number };
    overflowX: number;
    overflowY: number;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const initial = useRef(position);
  const [overflow, setOverflow] = useState({ x: 0, y: 0, ready: false });
  function measure() {
    const image = img.current;
    if (!image?.naturalWidth || !image.naturalHeight) return;
    const rect = image.getBoundingClientRect();
    const scale = Math.max(
      rect.width / image.naturalWidth,
      rect.height / image.naturalHeight,
    );
    setOverflow({
      x: Math.max(0, image.naturalWidth * scale - rect.width),
      y: Math.max(0, image.naturalHeight * scale - rect.height),
      ready: true,
    });
  }
  useEffect(() => {
    setOverflow({ x: 0, y: 0, ready: false });
    measure();
    const observer = new ResizeObserver(measure);
    if (img.current) observer.observe(img.current);
    return () => observer.disconnect();
  }, [id]);
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return (
    <>
      <img
        ref={img}
        src={fileUrl(id)}
        alt="Couverture de la page"
        style={{
          objectPosition: `${position.x}% ${position.y}%`,
          cursor: editing ? "grab" : "zoom-in",
          touchAction: editing ? "none" : "auto",
        }}
        draggable={false}
        onLoad={measure}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onClick={() => {
          if (!editing) onZoom();
        }}
        onPointerDown={(e) => {
          if (!editing || !img.current || !overflow.ready || e.button !== 0)
            return;
          const r = img.current.getBoundingClientRect();
          const scale = Math.max(
            r.width / img.current.naturalWidth,
            r.height / img.current.naturalHeight,
          );
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            position,
            overflowX: img.current.naturalWidth * scale - r.width,
            overflowY: img.current.naturalHeight * scale - r.height,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          e.preventDefault();
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          onPosition({
            x:
              d.overflowX > 1
                ? clamp(d.position.x - ((e.clientX - d.x) / d.overflowX) * 100)
                : d.position.x,
            y:
              d.overflowY > 1
                ? clamp(d.position.y - ((e.clientY - d.y) / d.overflowY) * 100)
                : d.position.y,
          });
        }}
        onPointerUp={(e) => {
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />
      {admin && (
        <div
          className={`cover-actions ${editing ? "cover-reposition-tools" : ""}`}
        >
          {editing ? (
            <>
              <span>
                {!overflow.ready
                  ? "Chargement de la couverture…"
                  : overflow.x < 1 && overflow.y < 1
                    ? "Cette image est entièrement visible dans la couverture."
                    : overflow.x < 1
                      ? "Glisse l’image verticalement pour la repositionner."
                      : overflow.y < 1
                        ? "Glisse l’image horizontalement pour la repositionner."
                        : "Glisse l’image pour la repositionner."}{" "}
                Le cadrage reste dans le brouillon jusqu’à la publication.
              </span>
              <label>
                Horizontal
                <input
                  aria-label="Position horizontale de la couverture"
                  type="range"
                  min="0"
                  max="100"
                  value={position.x}
                  disabled={!overflow.ready || overflow.x < 1}
                  onChange={(e) =>
                    onPosition({ ...position, x: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Vertical
                <input
                  aria-label="Position verticale de la couverture"
                  type="range"
                  min="0"
                  max="100"
                  value={position.y}
                  disabled={!overflow.ready || overflow.y < 1}
                  onChange={(e) =>
                    onPosition({ ...position, y: Number(e.target.value) })
                  }
                />
              </label>
              <button
                onClick={() => {
                  onPosition(initial.current);
                  setEditing(false);
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  onDone?.();
                }}
              >
                Terminer
              </button>
            </>
          ) : (
            <>
              <button onClick={onChoose}>Changer</button>
              <button
                onClick={() => {
                  initial.current = position;
                  setEditing(true);
                }}
              >
                <Move size={14} /> Repositionner
              </button>
              <button onClick={onRemove}>Retirer</button>
            </>
          )}
        </div>
      )}
    </>
  );
}
