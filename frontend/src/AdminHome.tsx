import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Plus,
  FileInput,
  ImagePlus,
  Pencil,
  Clock3,
  Globe,
  Lock,
  FileText,
  Search,
  X,
} from "lucide-react";
import { FeuilletIcon } from "./IconPicker";
import type { Page, Space, Category } from "./types";
import { CoverTools } from "./Customization";
import { notebookHomePages } from "./notebook-home";

export function AdminHome({
  pages,
  spaces,
  notebook,
  onUpdateNotebook,
  onEditNotebookIcon,
  onChooseNotebookCover,
  onZoomCover,
  mediaCredits,
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
  onUpdateNotebook?: (patch: Partial<Space>) => Promise<void>;
  onEditNotebookIcon?: () => void;
  onChooseNotebookCover?: () => void;
  onZoomCover?: () => void;
  mediaCredits?: ReactNode;
  categories?: Category[];
  categoryId?: string;
  onCategoryChange: (id: string) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onImport: () => void;
}) {
  const [query, setQuery] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [name, setName] = useState(notebook?.name || "");
  const [savingName, setSavingName] = useState(false);
  const savingNameRef = useRef(false),
    cancelName = useRef(false);
  const [decorationError, setDecorationError] = useState("");
  const [coverPosition, setCoverPosition] = useState(
    notebook?.cover_position || { x: 50, y: 50 },
  );
  useEffect(
    () => setCoverPosition(notebook?.cover_position || { x: 50, y: 50 }),
    [
      notebook?.id,
      notebook?.cover_id,
      notebook?.cover_position?.x,
      notebook?.cover_position?.y,
      notebook?.cover_position?.zoom,
    ],
  );
  async function persist(patch: Partial<Space>) {
    if (!onUpdateNotebook) return false;
    setDecorationError("");
    try {
      await onUpdateNotebook(patch);
      return true;
    } catch (error) {
      setDecorationError((error as Error).message);
      return false;
    }
  }
  async function saveName() {
    if (cancelName.current || savingNameRef.current) return;
    if (!name.trim()) {
      setDecorationError("Donne un nom à ce carnet.");
      return;
    }
    if (name.trim() === notebook?.name) {
      setEditingTitle(false);
      return;
    }
    savingNameRef.current = true;
    setSavingName(true);
    try {
      if (await persist({ name: name.trim() })) setEditingTitle(false);
    } finally {
      savingNameRef.current = false;
      setSavingName(false);
    }
  }
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
      {notebook &&
        (notebook.cover_id ? (
          <div className="cover with-image notebook-home-cover">
            <CoverTools
              alt="Couverture du carnet"
              id={notebook.cover_id}
              position={coverPosition}
              admin
              onChoose={() => onChooseNotebookCover?.()}
              onRemove={() => void persist({ cover_id: null })}
              onZoom={() => onZoomCover?.()}
              onPosition={setCoverPosition}
              onDone={(position) =>
                void persist({ cover_position: position || coverPosition })
              }
            />
          </div>
        ) : (
          <div className="notebook-decoration-actions">
            <button className="small-button" onClick={onChooseNotebookCover}>
              <ImagePlus size={15} />
              Ajouter une couverture
            </button>
          </div>
        ))}
      <div className="home-heading">
        <div>
          {notebook && (
            <button
              className="home-notebook-icon notebook-icon-edit"
              onClick={onEditNotebookIcon}
              aria-label="Changer l’icône du carnet"
              title="Changer l’icône du carnet"
            >
              <FeuilletIcon
                icon={notebook.icon}
                iconId={notebook.icon_id}
                size={38}
              />
            </button>
          )}
          {notebook ? (
            editingTitle ? (
              <input
                className="page-title-input notebook-title-input"
                aria-label="Titre du carnet"
                value={name}
                maxLength={120}
                disabled={savingName}
                autoFocus
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => void saveName()}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelName.current = true;
                    setEditingTitle(false);
                    setDecorationError("");
                  }
                }}
              />
            ) : (
              <h1>
                <button
                  className="notebook-title-edit"
                  onClick={() => {
                    cancelName.current = false;
                    setName(notebook.name);
                    setEditingTitle(true);
                    setDecorationError("");
                  }}
                  title="Renommer le carnet"
                >
                  {notebook.name}
                  <Pencil size={17} />
                </button>
              </h1>
            )
          ) : (
            <h1>Les idées prennent place.</h1>
          )}
          {decorationError && (
            <p role="alert" className="form-error">
              {decorationError}
            </p>
          )}
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
      {notebook && <div className="page-media-credits">{mediaCredits}</div>}
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
          <FileInput size={16} />
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
