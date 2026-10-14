import {
  ArrowUpRight,
  Plus,
  Upload,
  Clock3,
  Globe,
  Lock,
  FileText,
} from "lucide-react";
import { FeuilletIcon } from "./IconPicker";
import type { Page } from "./types";
import type { Space } from "./types";
export function AdminHome({
  pages,
  spaces,
  onOpen,
  onCreate,
  onImport,
}: {
  pages: Page[];
  spaces: Space[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onImport: () => void;
}) {
  const recent = [...pages].sort((a, b) =>
    (b.updated_at || "").localeCompare(a.updated_at || ""),
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
  return (
    <section className="admin-home" aria-label="Accueil administrateur">
      <div className="home-heading">
        <div>
          <span className="eyebrow">VOTRE ESPACE DE TRAVAIL</span>
          <h1>Les idées prennent place.</h1>
          <p>Retrouvez vos dernières pages et reprenez le fil.</p>
        </div>
        <button className="primary-button" onClick={onCreate}>
          <Plus size={17} />
          Nouvelle page
        </button>
      </div>
      <div className="home-stats">
        <span>
          <strong>{pages.length}</strong> pages
        </span>
        <span>
          <strong>{spaces.length}</strong> carnets
        </span>
        <span>
          <strong>
            {pages.filter((p) => p.visibility === "public").length}
          </strong>{" "}
          pages publiques
        </span>
        <button className="small-button" onClick={onImport}>
          <Upload size={16} />
          Importer une page
        </button>
      </div>
      <section className="home-section">
        <header>
          <h2>Reprendre la rédaction</h2>
          <span>Dernières modifications</span>
        </header>
        <div className="home-recent-grid">
          {recent.slice(0, 6).map((p) => (
            <button
              className="home-page-card"
              key={p.id}
              onClick={() => onOpen(p.id)}
            >
              <span className="home-card-icon">
                <FeuilletIcon icon={p.icon} iconId={p.icon_id} size={30} />
              </span>
              <strong>{p.title || "Sans titre"}</strong>
              <span>
                {spaces.find((s) => s.id === p.space_id)?.name || "Carnet"}
              </span>
              <small>
                <Clock3 size={12} />
                {date(p.updated_at)}
              </small>
              <ArrowUpRight className="home-card-arrow" size={17} />
            </button>
          ))}
        </div>
        {!pages.length && (
          <div className="home-empty">
            <FileText size={32} />
            <p>Votre première page commence ici.</p>
            <button className="small-button" onClick={onCreate}>
              Créer une page
            </button>
          </div>
        )}
      </section>
      <section className="home-section">
        <header>
          <h2>Activité récente</h2>
          <span>Vos pages enregistrées</span>
        </header>
        <div className="home-activity">
          {recent.slice(0, 12).map((p) => (
            <button key={p.id} onClick={() => onOpen(p.id)}>
              <FeuilletIcon icon={p.icon} iconId={p.icon_id} size={21} />
              <span>
                <strong>{p.title || "Sans titre"}</strong>
                <small>
                  {p.version === 1 ? "Page créée" : "Page modifiée"} ·{" "}
                  {date(p.updated_at)}
                </small>
              </span>
              <span className="home-visibility">
                {p.visibility === "public" ? (
                  <Globe size={13} />
                ) : (
                  <Lock size={13} />
                )}
                <span>{p.visibility === "public" ? "Publique" : "Privée"}</span>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
