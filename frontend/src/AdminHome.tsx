import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Upload,
  Clock3,
  Globe,
  Lock,
  FileText,
  Search,
  X,
} from "lucide-react";
import { FeuilletIcon } from "./IconPicker";
import type { Page, Space, Category } from "./types";
import { notebookHomePages } from "./notebook-home";

export function AdminHome({
  pages,
  spaces,
  notebook,
  categories = [],
  categoryId = "",
  onCategoryChange,
  onOpen,
  onCreate,
  onImport,
}: {
  pages: Page[];
  spaces: Space[];
  notebook?: Space;
  categories?: Category[];
  categoryId?: string;
  onCategoryChange: (id: string) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onImport: () => void;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(24);
  useEffect(() => setLimit(24), [categoryId, query]);
  const scoped = notebookHomePages(pages, notebook?.id);
  const recent = notebook
    ? notebookHomePages(pages, notebook.id, categoryId, query)
    : scoped;
  const ownCategories = categories.filter(
    (category) => !category.deleted_at && category.space_id === notebook?.id,
  );
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const date = (value?: string) => {
    if (!value) return "";
    const time = new Date(value);
    return Number.isFinite(time.getTime()) ? formatter.format(time) : "";
  };
  const parent = (page: Page) =>
    scoped.find((item) => item.id === page.parent_id);
  return (
    <section
      className="admin-home"
      aria-label={
        notebook
          ? `Accueil du carnet ${notebook.name}`
          : "Accueil administrateur"
      }
    >
      <div className="home-heading">
        <div>
          {notebook && (
            <span className="home-notebook-icon">
              <FeuilletIcon icon={notebook.icon} size={38} />
            </span>
          )}
          <span className="eyebrow">
            {notebook ? "VOTRE CARNET" : "VOTRE ESPACE DE TRAVAIL"}
          </span>
          <h1>{notebook ? notebook.name : "Les idées prennent place."}</h1>
          <p>
            {notebook
              ? "Retrouvez vos pages, explorez vos idées et reprenez le fil."
              : "Retrouvez vos dernières pages et reprenez le fil."}
          </p>
        </div>
        <button className="primary-button" onClick={onCreate}>
          <Plus size={17} />
          Nouvelle page
        </button>
      </div>
      <div className="home-stats">
        <span>
          <strong>{scoped.length}</strong> pages
        </span>
        <span>
          <strong>{notebook ? ownCategories.length : spaces.length}</strong>{" "}
          {notebook ? "catégories" : "carnets"}
        </span>
        <span>
          <strong>
            {scoped.filter((page) => page.visibility === "public").length}
          </strong>{" "}
          pages publiques
        </span>
        <button className="small-button" onClick={onImport}>
          <Upload size={16} />
          Importer une page
        </button>
      </div>
      {notebook && scoped.length > 0 && (
        <div className="notebook-home-tools">
          <div
            className="home-categories"
            role="group"
            aria-label="Filtrer les pages du carnet"
          >
            <button
              aria-pressed={!categoryId}
              onClick={() => onCategoryChange("")}
            >
              Tout <span>{scoped.length}</span>
            </button>
            {ownCategories.map((category) => (
              <button
                key={category.id}
                aria-pressed={categoryId === category.id}
                onClick={() => onCategoryChange(category.id)}
              >
                {category.name}
                <span>
                  {
                    scoped.filter((page) => page.category_id === category.id)
                      .length
                  }
                </span>
              </button>
            ))}
          </div>
          <label className="home-page-search">
            <Search size={16} />
            <input
              aria-label="Filtrer les pages de ce carnet"
              placeholder="Titre, description, étiquette…"
              maxLength={120}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                aria-label="Effacer le filtre des pages"
                onClick={() => setQuery("")}
              >
                <X size={15} />
              </button>
            )}
          </label>
        </div>
      )}
      <section className="home-section">
        <header>
          <h2>{notebook ? "Pages récentes" : "Reprendre la rédaction"}</h2>
          <span>Dernières modifications</span>
        </header>
        <div className="home-recent-grid">
          {recent.slice(0, 6).map((page) => (
            <button
              className="home-page-card"
              key={page.id}
              onClick={() => onOpen(page.id)}
            >
              <span className="home-card-icon">
                <FeuilletIcon
                  icon={page.icon}
                  iconId={page.icon_id}
                  size={30}
                />
              </span>
              <strong>{page.title || "Sans titre"}</strong>
              <span>
                {notebook
                  ? parent(page)
                    ? `Dans ${parent(page)?.title || "Sans titre"}`
                    : "Page du carnet"
                  : spaces.find((space) => space.id === page.space_id)?.name ||
                    "Carnet"}
              </span>
              <small>
                <Clock3 size={12} />
                {date(page.updated_at || page.created_at)}
              </small>
              <ArrowUpRight className="home-card-arrow" size={17} />
            </button>
          ))}
        </div>
        {!recent.length && (
          <div className="home-empty">
            <FileText size={32} />
            <p>
              {scoped.length
                ? "Aucune page ne correspond à ces filtres."
                : notebook
                  ? "La première page de ce carnet commence ici."
                  : "Votre première page commence ici."}
            </p>
            {scoped.length ? (
              <button
                className="small-button"
                onClick={() => {
                  setQuery("");
                  onCategoryChange("");
                }}
              >
                Effacer les filtres
              </button>
            ) : (
              <button className="small-button" onClick={onCreate}>
                Créer une page
              </button>
            )}
          </div>
        )}
      </section>
      {recent.length > 0 && (
        <section className="home-section">
          <header>
            <h2>{notebook ? "Toutes les pages" : "Activité récente"}</h2>
            <span>
              {notebook
                ? `${recent.length} sur ${scoped.length} pages`
                : "Vos pages enregistrées"}
            </span>
          </header>
          <div className="home-activity">
            {recent.slice(0, notebook ? limit : 12).map((page) => (
              <button key={page.id} onClick={() => onOpen(page.id)}>
                <FeuilletIcon
                  icon={page.icon}
                  iconId={page.icon_id}
                  size={21}
                />
                <span>
                  <strong>{page.title || "Sans titre"}</strong>
                  <small>
                    {notebook && parent(page)
                      ? `Sous-page de ${parent(page)?.title || "Sans titre"}`
                      : page.version === 1
                        ? "Page créée"
                        : "Page modifiée"}{" "}
                    · {date(page.updated_at || page.created_at)}
                  </small>
                </span>
                <span className="home-visibility">
                  {page.visibility === "public" ? (
                    <Globe size={13} />
                  ) : (
                    <Lock size={13} />
                  )}
                  <span>
                    {page.visibility === "public" ? "Publique" : "Privée"}
                  </span>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          {notebook && recent.length > limit && (
            <button
              className="small-button home-load-more"
              onClick={() => setLimit((value) => value + 24)}
            >
              Afficher plus de pages
            </button>
          )}
        </section>
      )}
    </section>
  );
}
