import { groupRecords } from "./database-grouping";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  Columns3,
  Maximize,
  Minimize,
  Monitor,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Select } from "./Select";
import { FormSkeleton } from "./FormSkeleton";
import { type CellValue } from "./database-types";
import "./projection.css";
type Projection = {
  database: { id: string; name: string };
  properties: { id: string; name: string; type: string }[];
  columns: string[];
  forms: { id: string; name: string }[];
  rows: {
    id: string;
    created_at: string;
    values: Record<string, CellValue>;
    groupValue?: CellValue;
  }[];
  total: number;
  limit: number;
};
export function DatabaseProjection({ id }: { id: string }) {
  const [data, setData] = useState<Projection | null>(null);
  const [columns, setColumns] = useState<string[] | null>(null);
  const [groupBy, setGroupBy] = useState("");
  const [source, setSource] = useState(
    new URLSearchParams(location.search).get("source") || "",
  );
  const [paused, setPaused] = useState(false),
    [error, setError] = useState(""),
    [denied, setDenied] = useState(false);
  const [updating, setUpdating] = useState(false),
    [last, setLast] = useState<Date | null>(null),
    [fullscreen, setFullscreen] = useState(false);
  const [recent, setRecent] = useState<Set<string>>(new Set());
  const seen = useRef<Set<string> | null>(null),
    panel = useRef<HTMLElement>(null),
    request = useRef<(() => void) | null>(null);
  useEffect(() => {
    const change = () =>
      setFullscreen(document.fullscreenElement === panel.current);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    let alive = true,
      busy = false;
    let controller: AbortController | null = null;
    const refresh = async () => {
      if (busy || !alive) return;
      busy = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 8000);
      setUpdating(true);
      try {
        const query = new URLSearchParams({
          action: "db_projection",
          id,
          source,
          group: groupBy,
          ...(columns ? { columns: columns.join(",") } : {}),
        });
        const response = await fetch(`api.php?${query}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          if (alive) {
            setData(null);
            setDenied(true);
            setError(
              "Connecte-toi à l’administration pour afficher les réponses.",
            );
            seen.current = null;
          }
          return;
        }
        const result = await response.json();
        if (response.status === 404 && alive) setData(null);
        if (!response.ok)
          throw new Error(result.error || "Les réponses sont indisponibles.");
        if (alive) {
          const next = result as Projection;
          setRecent(
            new Set(
              next.rows
                .filter((r) => seen.current && !seen.current.has(r.id))
                .map((r) => r.id),
            ),
          );
          seen.current = new Set(next.rows.map((r) => r.id));
          setData(next);
          setError("");
          setDenied(false);
          setLast(new Date());
        }
      } catch (e) {
        if (alive)
          setError(
            e instanceof Error && e.name !== "AbortError"
              ? e.message
              : "Connexion lente. Nouvelle tentative à la prochaine actualisation.",
          );
      } finally {
        clearTimeout(timeout);
        busy = false;
        if (alive) setUpdating(false);
      }
    };
    request.current = () => void refresh();
    if (!paused) void refresh();
    const timer = setInterval(() => {
      if (!paused && !document.hidden) void refresh();
    }, 10000);
    const visible = () => {
      if (!paused && !document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      alive = false;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      request.current = null;
    };
  }, [id, source, columns, paused, groupBy]);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await panel.current?.requestFullscreen();
    } catch {
      setError(
        "Le plein écran est indisponible dans ce navigateur. Agrandis sa fenêtre ou utilise son raccourci plein écran.",
      );
    }
  }
  if (!data && !error) return <FormSkeleton />;
  const selected =
    data?.properties.filter((p) => data.columns.includes(p.id)) || [];
  return (
    <main className="projection-page" ref={panel}>
      <header className="projection-heading">
        <div>
          <span className="form-eyebrow">
            <Monitor size={14} /> Vue de projection
          </span>
          <h1>{data?.database.name || "Réponses reçues"}</h1>
          <p>Les derniers envois, au fil de leur réception.</p>
        </div>
        <div className="projection-counter">
          <strong>{data?.total ?? "—"}</strong>
          <span>
            réponse{data?.total === 1 ? "" : "s"} reçue
            {data?.total === 1 ? "" : "s"}
          </span>
        </div>
      </header>
      {denied ? (
        <div className="projection-message" role="alert">
          <ShieldCheck size={24} />
          <p>{error}</p>
          <a className="primary-button" href="index.php?edit=1">
            Se connecter
          </a>
        </div>
      ) : (
        <>
          <div className="projection-tools">
            <div className="projection-state" role="status">
              <i className={paused || error ? "paused" : ""} />
              {paused ? "En pause" : "Actualisation toutes les 10 s"}
              <small>
                {last && `Vérifié à ${last.toLocaleTimeString("fr-FR")}`}
              </small>
            </div>
            <div className="projection-controls">
              <Select
                aria-label="Réponses à projeter"
                value={source}
                onChange={(e) => {
                  seen.current = null;
                  setData(null);
                  setSource(e.target.value);
                }}
              >
                <option value="">Toutes les lignes de la base</option>
                {data?.forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Regrouper les réponses par"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="">Aucun regroupement</option>
                {data?.properties
                  .filter((p) => p.type !== "files")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Par {p.name}
                    </option>
                  ))}
              </Select>
              <details className="projection-column-picker">
                <summary>
                  <Columns3 size={16} /> Colonnes
                </summary>
                <div>
                  <p>Choisis ce qui apparaît à l’écran.</p>
                  {data?.properties.map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        checked={data.columns.includes(p.id)}
                        onChange={(e) =>
                          setColumns(
                            e.target.checked
                              ? [...data.columns, p.id]
                              : data.columns.filter((id) => id !== p.id),
                          )
                        }
                      />
                      {p.name}
                    </label>
                  ))}
                  <small>
                    Les fichiers sont affichés sous forme de nombre, sans lien
                    de téléchargement.
                  </small>
                </div>
              </details>
              <button
                type="button"
                className="icon-button"
                title={paused ? "Reprendre l’actualisation" : "Mettre en pause"}
                onClick={() => setPaused(!paused)}
              >
                {paused ? <Play size={17} /> : <Pause size={17} />}
              </button>
              <button
                type="button"
                className="icon-button"
                title="Actualiser maintenant"
                disabled={updating}
                onClick={() => request.current?.()}
              >
                <RefreshCw size={17} className={updating ? "spin" : ""} />
              </button>
              <button
                type="button"
                className="small-button"
                onClick={() => void toggleFullscreen()}
              >
                {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}{" "}
                {fullscreen ? "Quitter le plein écran" : "Plein écran"}
              </button>
            </div>
          </div>
          {error && (
            <p className="projection-warning" role="status">
              {error}{" "}
              {last && "Les dernières réponses reçues restent affichées."}
            </p>
          )}
          {!data?.rows.length ? (
            <div className="projection-message">
              <Monitor size={36} />
              <h2>Prêt à recevoir les premières réponses.</h2>
              <p>Les prochains envois apparaîtront ici automatiquement.</p>
            </div>
          ) : (
            <div className="projection-table-wrap">
              <table className="projection-table">
                <thead>
                  <tr>
                    <th>Réception</th>
                    {selected.map((p) => (
                      <th key={p.id}>{p.name}</th>
                    ))}
                    <th>Reçu le</th>
                  </tr>
                </thead>
                <tbody>
                  {(groupBy
                    ? groupRecords(data.rows, (row) => row.groupValue)
                    : [{ key: "all", label: "", rows: data.rows }]
                  ).map((group) => (
                    <Fragment key={group.key}>
                      {groupBy && (
                        <tr className="projection-group-heading">
                          <th colSpan={selected.length + 2}>
                            {group.label}
                            <span>
                              {group.rows.length} réponse
                              {group.rows.length > 1 ? "s" : ""}
                            </span>
                          </th>
                        </tr>
                      )}
                      {group.rows.map((row) => (
                        <tr
                          key={row.id}
                          className={recent.has(row.id) ? "projection-new" : ""}
                        >
                          <td>
                            <span className="projection-received">
                              <Check size={16} /> Reçu
                            </span>
                          </td>
                          {selected.map((p) => {
                            const value = row.values[p.id];
                            const text =
                              p.type === "files"
                                ? `${value || 0} fichier${value === 1 ? "" : "s"}`
                                : Array.isArray(value)
                                  ? value.join(", ")
                                  : typeof value === "boolean"
                                    ? value
                                      ? "Oui"
                                      : "Non"
                                    : String(value ?? "—");
                            return <td key={p.id}>{text}</td>;
                          })}
                          <td>
                            <time dateTime={row.created_at}>
                              {new Date(row.created_at).toLocaleString(
                                "fr-FR",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                },
                              )}
                            </time>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && data.total > data.limit && (
            <p className="projection-note">
              Les {data.limit} dernières lignes sont affichées sur {data.total}.
            </p>
          )}
        </>
      )}
      <footer className="projection-footer">
        <span>
          <ShieldCheck size={14} /> Vue administrateur · affichage et
          regroupement choisis
        </span>
        <a href="index.php?edit=1">
          <ChevronLeft size={14} /> Retour à Feuillet
        </a>
      </footer>
    </main>
  );
}
