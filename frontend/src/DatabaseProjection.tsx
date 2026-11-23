import { groupRecords } from "./database-grouping";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronDown,
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
import { api, setCsrf } from "./types";
import { ProjectionRules, type ProjectionProperty } from "./ProjectionRules";
import { rowTint, type ColorRule } from "./projection-rules";
import "./projection.css";
type Projection = {
  database: { id: string; name: string; version: number };
  rules: ColorRule[];
  properties: ProjectionProperty[];
  columns: string[];
  forms: { id: string; name: string }[];
  rows: {
    id: string;
    version: number;
    conditionValues?: Record<string, CellValue>;
    created_at: string;
    values: Record<string, CellValue>;
    groupValue?: CellValue;
    attachments?: Record<string, { id: string; name: string }[]>;
  }[];
  total: number;
  limit: number;
};
function projectionPreferences(id: string): {
  columns?: string[];
  group?: string;
} {
  try {
    const p = JSON.parse(
      localStorage.getItem("feuillet:projection-view:" + id) || "{}",
    );
    return {
      columns: Array.isArray(p.columns)
        ? p.columns.filter((v: unknown) => typeof v === "string").slice(0, 100)
        : undefined,
      group: typeof p.group === "string" ? p.group : "",
    };
  } catch {
    return {};
  }
}
export function DatabaseProjection({ id }: { id: string }) {
  const [data, setData] = useState<Projection | null>(null);
  const [columns, setColumns] = useState<string[] | null>(
    () => projectionPreferences(id).columns ?? null,
  );
  const [copyNotice, setCopyNotice] = useState("");
  const [groupBy, setGroupBy] = useState(
    () => projectionPreferences(id).group || "",
  );
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const [rulesOpen, setRulesOpen] = useState(false),
    [saving, setSaving] = useState(""),
    [editError, setEditError] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem(
        "feuillet:projection-view:" + id,
        JSON.stringify({ columns, group: groupBy }),
      );
    } catch {}
  }, [id, columns, groupBy]);
  const mutating = useRef(false),
    epoch = useRef(0);
  useEffect(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem(
          "feuillet:projection-folds:" + id + ":" + groupBy,
        ) || "[]",
      );
      setFolded(
        new Set(
          Array.isArray(value)
            ? value.filter((v) => typeof v === "string").slice(0, 300)
            : [],
        ),
      );
    } catch {
      setFolded(new Set());
    }
  }, [id, groupBy]);
  const foldGroups = (keys: Set<string>) => {
    setFolded(keys);
    try {
      localStorage.setItem(
        "feuillet:projection-folds:" + id + ":" + groupBy,
        JSON.stringify([...keys]),
      );
    } catch {}
  };

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
      if (busy || !alive || mutating.current) return;
      const checkpoint = epoch.current;
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
        if (alive && checkpoint === epoch.current && !mutating.current) {
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
  async function changeCell(
    row: Projection["rows"][number],
    p: ProjectionProperty,
    value: CellValue,
  ) {
    if (mutating.current) return;
    mutating.current = true;
    epoch.current++;
    setSaving(row.id);
    setEditError("");
    // Reflect the gesture immediately; keep the original version for the write.
    setData((d) =>
      d
        ? {
            ...d,
            rows: d.rows.map((r) =>
              r.id === row.id
                ? {
                    ...r,
                    values: { ...r.values, [p.id]: value },
                    conditionValues: { ...r.conditionValues, [p.id]: value },
                    ...(groupBy === p.id ? { groupValue: value } : {}),
                  }
                : r,
            ),
          }
        : d,
    );
    try {
      const session = await api("session");
      setCsrf(session.csrf);
      const result = await api("row_patch", {
        id: row.id,
        version: row.version,
        property_id: p.id,
        value,
      });
      setData((previous) =>
        previous
          ? {
              ...previous,
              rows: previous.rows.map((r) =>
                r.id === row.id
                  ? {
                      ...r,
                      version: result.row.version,
                      values: { ...r.values, [p.id]: value },
                      conditionValues: { ...r.conditionValues, [p.id]: value },
                      ...(groupBy === p.id ? { groupValue: value } : {}),
                    }
                  : r,
              ),
            }
          : previous,
      );
      setCopyNotice("Modification enregistrée.");
    } catch (e) {
      setData((d) =>
        d ? { ...d, rows: d.rows.map((r) => (r.id === row.id ? row : r)) } : d,
      );
      setEditError((e as Error).message);
    } finally {
      mutating.current = false;
      epoch.current++;
      setSaving("");
      request.current?.();
    }
  }
  async function saveRules(rules: ColorRule[]) {
    if (!data || mutating.current)
      throw new Error("Une modification est en cours.");
    mutating.current = true;
    epoch.current++;
    setSaving("__rules");
    try {
      const session = await api("session");
      setCsrf(session.csrf);
      const result = await api("projection_save", {
        id,
        version: data.database.version,
        rules,
      });
      setData((d) =>
        d
          ? {
              ...d,
              rules: result.rules,
              database: { ...d.database, version: result.version },
            }
          : d,
      );
      setRulesOpen(false);
      setCopyNotice("Règles enregistrées.");
    } finally {
      mutating.current = false;
      epoch.current++;
      setSaving("");
      request.current?.();
    }
  }
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      panel.current
        ?.querySelectorAll<HTMLDetailsElement>(
          ".projection-column-actions[open]",
        )
        .forEach((menu) => {
          if (!menu.contains(event.target as Node)) menu.open = false;
        });
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
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
  const groups = data
    ? groupBy
      ? groupRecords(data.rows, (row) => row.groupValue)
      : [{ key: "all", label: "", rows: data.rows }]
    : [];
  return (
    <main className="projection-page" ref={panel}>
      <header className="projection-heading">
        <div>
          <span className="form-eyebrow">
            <Monitor size={14} /> Vue de projection
          </span>
          <h1>{data?.database.name || "Réponses reçues"}</h1>
          <p>Les derniers envois, et leur suivi en direct.</p>
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
              <button
                type="button"
                className="small-button"
                aria-expanded={rulesOpen}
                onClick={() => setRulesOpen((v) => !v)}
              >
                Couleurs des lignes
              </button>
              {groupBy && (
                <>
                  <button
                    type="button"
                    className="small-button"
                    onClick={() =>
                      foldGroups(new Set(groups.map((g) => g.key)))
                    }
                  >
                    Tout replier
                  </button>
                  <button
                    type="button"
                    className="small-button"
                    onClick={() => foldGroups(new Set())}
                  >
                    Tout déplier
                  </button>
                </>
              )}
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
                    Les fichiers disposent d’un lien de téléchargement.
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
          {rulesOpen && data && (
            <ProjectionRules
              key={id}
              properties={data.properties}
              rules={data.rules || []}
              onSave={saveRules}
              onClose={() => setRulesOpen(false)}
            />
          )}
          {editError && (
            <p className="projection-warning" role="alert">
              {editError} La vue va être actualisée ; réessaie après avoir
              vérifié la valeur.
            </p>
          )}
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
                      <th key={p.id}>
                        {p.name}{" "}
                        {p.type !== "files" && (
                          <details
                            className="projection-column-actions"
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                event.currentTarget.open = false;
                                event.currentTarget
                                  .querySelector("summary")
                                  ?.focus();
                              }
                            }}
                          >
                            <summary
                              aria-label={"Actions de la colonne " + p.name}
                            >
                              <ChevronDown size={14} />
                            </summary>
                            <div>
                              <button
                                type="button"
                                aria-label={"Copier la colonne " + p.name}
                                onClick={async (event) => {
                                  const menu =
                                    event.currentTarget.closest("details");
                                  if (menu) menu.open = false;
                                  const text = data.rows
                                    .map((row) => {
                                      const v = row.values[p.id];
                                      return Array.isArray(v)
                                        ? v.join(", ")
                                        : String(v ?? "");
                                    })
                                    .filter(Boolean)
                                    .map((v) => v.replace(/[\r\n]+/g, " "))
                                    .join("\n");
                                  try {
                                    await navigator.clipboard.writeText(text);
                                    setCopyNotice(
                                      "Colonne copiée : " +
                                        data.rows.length +
                                        " lignes affichées.",
                                    );
                                  } catch {
                                    setCopyNotice(
                                      "Copie indisponible : autorise le presse-papiers du navigateur.",
                                    );
                                  }
                                }}
                              >
                                Copier la colonne
                              </button>
                            </div>
                          </details>
                        )}
                      </th>
                    ))}
                    <th>Reçu le</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <Fragment key={group.key}>
                      {groupBy && (
                        <tr className="projection-group-heading">
                          <th colSpan={selected.length + 2}>
                            <button
                              type="button"
                              className="projection-group-toggle"
                              aria-expanded={!folded.has(group.key)}
                              aria-label={
                                (folded.has(group.key)
                                  ? "Déplier"
                                  : "Replier") +
                                " le groupe " +
                                group.label
                              }
                              onClick={() => {
                                const next = new Set(folded);
                                next.has(group.key)
                                  ? next.delete(group.key)
                                  : next.add(group.key);
                                foldGroups(next);
                              }}
                            >
                              <span
                                className="projection-chevron"
                                aria-hidden="true"
                              >
                                ⌄
                              </span>
                              {group.label}
                              <span>
                                {group.rows.length} réponse
                                {group.rows.length > 1 ? "s" : ""}
                              </span>
                            </button>
                          </th>
                        </tr>
                      )}
                      {(!groupBy || !folded.has(group.key)) &&
                        group.rows.map((row) => (
                          <tr
                            key={row.id}
                            style={
                              {
                                "--projection-tint": rowTint(data.rules || [], {
                                  ...row.conditionValues,
                                  ...row.values,
                                }),
                              } as React.CSSProperties
                            }
                            className={`${recent.has(row.id) ? "projection-new" : ""} ${rowTint(data.rules || [], { ...row.conditionValues, ...row.values }) ? "projection-tinted" : ""}`}
                            aria-busy={saving === row.id}
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
                              return (
                                <td key={p.id}>
                                  {p.type === "checkbox" ? (
                                    <input
                                      className="projection-checkbox"
                                      type="checkbox"
                                      aria-label={
                                        p.name +
                                        " — " +
                                        String(
                                          row.values[
                                            selected.find(
                                              (v) => v.type === "title",
                                            )?.id || ""
                                          ] || row.id,
                                        )
                                      }
                                      checked={value === true}
                                      disabled={!!saving}
                                      onChange={(e) =>
                                        void changeCell(
                                          row,
                                          p,
                                          e.target.checked,
                                        )
                                      }
                                    />
                                  ) : p.type === "select" ? (
                                    <select
                                      className="projection-cell-select"
                                      aria-label={
                                        p.name +
                                        " — " +
                                        String(
                                          row.values[
                                            selected.find(
                                              (v) => v.type === "title",
                                            )?.id || ""
                                          ] || row.id,
                                        )
                                      }
                                      value={String(value ?? "")}
                                      disabled={!!saving}
                                      onChange={(e) =>
                                        void changeCell(
                                          row,
                                          p,
                                          e.target.value || null,
                                        )
                                      }
                                    >
                                      <option value="">Non renseigné</option>
                                      {p.config?.options?.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  ) : p.type === "files" ? (
                                    row.attachments?.[p.id]?.length ? (
                                      row.attachments[p.id].map((file) => (
                                        <a
                                          className="projection-file"
                                          key={file.id}
                                          href={
                                            "media.php?id=" +
                                            encodeURIComponent(file.id) +
                                            "&download=1"
                                          }
                                          title={file.name}
                                        >
                                          ↓ {file.name}
                                        </a>
                                      ))
                                    ) : (
                                      text
                                    )
                                  ) : (
                                    text
                                  )}
                                </td>
                              );
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
      <p role="status" className="projection-note">
        {copyNotice}
      </p>
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
