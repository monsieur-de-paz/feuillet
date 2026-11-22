import { useState, useEffect, useRef } from "react";
import { api, type Page } from "./types";
import { PublicLinkSharing } from "./PublicLinkSharing";
import type { MapData } from "./mind-map-model";
export function MindMapOptions({
  data,
  onChange,
  onClose,
}: {
  data: MapData;
  onChange: (data: MapData) => void;
  onClose: () => void;
}) {
  const [copy, setCopy] = useState<Page | null>(null),
    [path, setPath] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    box.current
      ?.querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: true });
    return () => prior?.focus({ preventScroll: true });
  }, []);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ page: Page }>("save", {
        title: data.title,
        icon: "🧠",
        content: {
          type: "doc",
          content: [
            {
              type: "mindMap",
              attrs: {
                map: { ...structuredClone(data), display: "page", scenes: {} },
              },
            },
          ],
        },
      });
      setCopy(result.page);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!copy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ page: Page }>("publish", {
        id: copy.id,
        version: copy.version,
      });
      setCopy(result.page);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className="mm-dialog-shade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        className="mm-dialog mm-map-options"
        role="dialog"
        aria-modal="true"
        aria-label="Options de la carte mentale"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <header>
          <h3>Options de la carte</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les options de la carte"
          >
            ×
          </button>
        </header>
        <p>Choisis sa place dans la page.</p>
        <div className="mm-display-choices">
          {[
            ["button", "Bouton d’ouverture"],
            ["preview", "Aperçu"],
            ["page", "Carte entière"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={data.display === id}
              onClick={() => onChange({ ...data, display: id })}
            >
              {label}
            </button>
          ))}
        </div>
        <hr />
        <h4>Une page dédiée, un lien à partager</h4>
        <p>
          Crée une copie indépendante de cette carte. La page d’origine reste
          inchangée. Tu pourras personnaliser son adresse et publier cette copie
          seule.
        </p>
        {!copy ? (
          <button type="button" disabled={busy} onClick={() => void create()}>
            {busy ? "Création…" : "Créer une page dédiée"}
          </button>
        ) : (
          <>
            <a href={"index.php?edit=1&page=" + encodeURIComponent(copy.slug)}>
              Ouvrir et modifier la page dédiée ↗
            </a>
            <PublicLinkSharing
              pageId={copy.id}
              slug={copy.slug}
              path={path}
              privatePage={copy.visibility !== "public"}
              onPathChange={setPath}
            />
            <button
              type="button"
              disabled={busy || copy.visibility === "public"}
              onClick={() => void publish()}
            >
              {copy.visibility === "public"
                ? "Copie publiée"
                : busy
                  ? "Publication…"
                  : "Publier cette copie"}
            </button>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  );
}
