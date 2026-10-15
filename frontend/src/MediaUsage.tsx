import { useState } from "react";
import { Link2, Globe, Lock, LoaderCircle, ArrowUpRight } from "lucide-react";
import { api } from "./types";
type Usage = {
  kind: string;
  id?: string;
  title: string;
  visibility: "public" | "private";
  deleted?: boolean;
  draft?: boolean;
  published?: boolean;
  from_form?: boolean;
  places: string[];
};
type Result = { public: boolean; usages: Usage[]; truncated: boolean };
export function MediaUsage({
  id,
  name,
  onOpenPage,
  onOpenSpace,
}: {
  id: string;
  name: string;
  onOpenPage: (id: string) => void;
  onOpenSpace?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      setData(await api<Result>("file_usage", undefined, { id }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="media-usage">
      <button
        type="button"
        className="small-button"
        aria-label={`Voir les utilisations de ${name}`}
        aria-expanded={open}
        onClick={() => void toggle()}
      >
        <Link2 size={15} /> Utilisations
      </button>
      {open && (
        <section
          className="media-usage-panel"
          aria-label={`Utilisations de ${name}`}
        >
          {loading ? (
            <p>
              <LoaderCircle size={15} className="spin" /> Recherche des
              utilisations…
            </p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            data && (
              <>
                <p className="media-access-label">
                  {data.public ? <Globe size={14} /> : <Lock size={14} />}{" "}
                  {data.public
                    ? "Fichier accessible aux visiteurs"
                    : "Fichier privé"}
                </p>
                {data.usages.length === 0 ? (
                  <p>Aucune utilisation trouvée.</p>
                ) : (
                  <ul>
                    {data.usages.map((u, i) => (
                      <li key={`${u.kind}-${u.id || i}`}>
                        <div>
                          {(u.kind === "page" ||
                            u.kind === "revision" ||
                            (u.kind === "space" && !!onOpenSpace)) &&
                          u.id &&
                          !u.deleted ? (
                            <button
                              type="button"
                              onClick={() =>
                                u.kind === "space"
                                  ? onOpenSpace?.(u.id!)
                                  : onOpenPage(u.id!)
                              }
                            >
                              {u.title} <ArrowUpRight size={12} />
                            </button>
                          ) : (
                            <strong>{u.title}</strong>
                          )}
                          <span className="usage-visibility">
                            {u.deleted
                              ? "Corbeille"
                              : u.visibility === "public"
                                ? "Publique"
                                : "Privée"}
                            {u.kind === "page" && u.draft && !u.published
                              ? " · brouillon seulement"
                              : ""}
                            {u.published ? " · fichier publié" : ""}
                            {u.from_form ? " · réponse de formulaire" : ""}
                            {u.kind === "revision" ? " · historique" : ""}
                          </span>
                        </div>
                        <small>{u.places.join(", ")}</small>
                      </li>
                    ))}
                  </ul>
                )}
                {data.truncated && (
                  <p>Les 200 premières utilisations sont affichées.</p>
                )}
              </>
            )
          )}
        </section>
      )}
    </div>
  );
}
