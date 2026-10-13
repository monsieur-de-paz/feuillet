import { useState } from "react";
import { Home, Pencil, Plus, ExternalLink, Check } from "lucide-react";
import { api, type Page } from "./types";
export type HomepageSetting = {
  id: string | null;
  title: string | null;
  published: boolean;
};
export function HomepageControls({
  value,
  pages,
  onChange,
  onEdit,
}: {
  value: HomepageSetting;
  pages: Page[];
  onChange: (v: HomepageSetting) => void;
  onEdit: (id: string, created?: boolean) => Promise<void>;
}) {
  const [selected, setSelected] = useState(value.id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function apply(create = false) {
    setBusy(true);
    setError("");
    try {
      const r = await api(
        "homepage",
        create ? { create: true } : { id: selected || null },
      );
      onChange(r.homepage);
      setSelected(r.homepage.id || "");
      if (create) await onEdit(r.page.id, true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card homepage-controls">
      <Home size={25} />
      <div>
        <h3>Accueil visiteur</h3>
        <p>
          L’accueil est une page ordinaire : textes, liens, images et galeries
          se modifient avec le même éditeur. Dans une galerie, choisis les pages
          et leur ordre.
        </p>
        <label>
          Page utilisée comme accueil
          <select
            value={selected}
            disabled={busy}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Aucune page</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
                {p.visibility === "private" ? " · privée" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="homepage-actions">
          <button
            className="small-button"
            disabled={busy}
            onClick={() => void apply()}
          >
            <Check size={15} />
            Utiliser cette page
          </button>
          <button
            className="small-button"
            disabled={busy}
            onClick={() => void apply(true)}
          >
            <Plus size={15} />
            Créer une page d’accueil
          </button>
        </div>
        {value.id && (
          <div className="homepage-actions">
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void onEdit(value.id!)}
            >
              <Pencil size={15} />
              Modifier l’accueil
            </button>
            <a
              className="small-button"
              href="index.php?read=1"
              target="_blank"
              rel="noopener"
            >
              <ExternalLink size={15} />
              Voir l’accueil visiteur
            </a>
          </div>
        )}
        <p className="muted">
          {value.published
            ? "Les visiteurs voient la version publiée. La publication automatique des pages déjà publiques s’applique aussi à cet accueil ; en mode brouillon, publie après modification."
            : "Prépare cette page, puis clique sur Publier pour la rendre visible aux visiteurs."}{" "}
          Les liens vers tes autres pages ne modifient pas leur publication.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
