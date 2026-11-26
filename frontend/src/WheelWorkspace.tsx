import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import {
  ArrowUpRight,
  Database,
  Folder,
  FolderPlus,
  LayoutGrid,
  List,
  ListPlus,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api, setCsrf } from "./types";
import { DestinyWheel, enterWheelFullscreen } from "./DestinyWheel";
import {
  errorText,
  formatCreatedAt,
  type Database as DatabaseRecord,
  type Property,
} from "./database-types";
import type { WheelEntry, WheelData } from "./destiny-wheel-model";
import "./wheel-workspace.css";

type FolderRecord = { id: string; name: string; version: number };
type WheelCard = FolderRecord & {
  folder: string;
  database: string;
  lastDraw: string | null;
};
type Override = { label: string | null; hidden: boolean };
type Wheel = WheelCard & {
  property: string;
  source: string;
  manual: WheelEntry[];
  overrides: Record<string, Override>;
  state?: WheelData["state"];
};
type Workspace = { folders: FolderRecord[]; wheels: WheelCard[] };
type Columns = {
  properties: Property[];
  forms: { id: string; name: string }[];
};
type EditWheel = { wheel: Wheel; linked: WheelEntry[]; warning?: string };

function entryId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
const emptyWorkspace: Workspace = { folders: [], wheels: [] };
const byName = (a: FolderRecord, b: FolderRecord) =>
  a.name.localeCompare(b.name, "fr", { numeric: true, sensitivity: "base" });
const blankWheel = (folder: string): Wheel => ({
  id: "",
  version: 0,
  name: "",
  folder,
  database: "",
  property: "",
  source: "",
  manual: [],
  overrides: {},
  lastDraw: null,
});

export function WheelWorkspace() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [databases, setDatabases] = useState<DatabaseRecord[]>([]);
  const [folder, setFolder] = useState("*");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [editor, setEditor] = useState<EditWheel | null>(null);
  const [playing, setPlaying] = useState<WheelCard | null>(null);
  const wheelScreen = useRef<HTMLDivElement>(null);
  const [folderEditor, setFolderEditor] = useState<FolderRecord | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const prefilled = useRef(false);
  async function refresh() {
    setWorkspace(await api<Workspace>("wheel_workspace"));
  }
  useEffect(() => {
    const controller = new AbortController();
    api("session", undefined, {}, controller.signal)
      .then((session) => {
        setCsrf(session.csrf);
        setAuthenticated(session.authenticated);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorText(e));
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    Promise.all([
      api<Workspace>("wheel_workspace", undefined, {}, controller.signal),
      api<{ databases: DatabaseRecord[] }>(
        "db_list",
        undefined,
        {},
        controller.signal,
      ),
    ])
      .then(([library, available]) => {
        if (controller.signal.aborted) return;
        setWorkspace(library);
        setDatabases(available.databases);
        if (prefilled.current) return;
        prefilled.current = true;
        const params = new URLSearchParams(location.search);
        const wheelId = params.get("wheel");
        const saved = library.wheels.find((wheel) => wheel.id === wheelId);
        const database = available.databases.find(
          (db) => db.id === params.get("database"),
        );
        if (saved) setPlaying(saved);
        else if (database)
          setEditor({
            wheel: {
              ...blankWheel(""),
              name: database.name,
              database: database.id,
              source: params.get("source") || "",
            },
            linked: [],
          });
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorText(e));
      });
    return () => controller.abort();
  }, [authenticated]);
  async function perform(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  function login(event: FormEvent) {
    event.preventDefault();
    void perform(async () => {
      const current = await api("session");
      setCsrf(current.csrf);
      const session = await api("login", { password });
      setCsrf(session.csrf);
      setPassword("");
      setAuthenticated(true);
    });
  }
  function edit(wheel: WheelCard) {
    void perform(async () =>
      setEditor(
        await api<EditWheel>("wheel_details", undefined, { id: wheel.id }),
      ),
    );
  }
  function saveWheel(wheel: Wheel) {
    void perform(async () => {
      const result = await api<{ wheel: Wheel }>("wheel_save", {
        id: wheel.id || undefined,
        version: wheel.version,
        name: wheel.name,
        folder: wheel.folder,
        database: wheel.database,
        property: wheel.property,
        source: wheel.source,
        manual: wheel.manual,
        overrides: wheel.overrides,
      });
      setEditor(null);
      if (folder !== "*" && result.wheel.folder !== folder)
        setFolder(result.wheel.folder);
      setNotice("Roue enregistrée.");
      await refresh();
    });
  }
  function saveFolder(event: FormEvent) {
    event.preventDefault();
    if (!folderEditor) return;
    void perform(async () => {
      const result = await api<{ folder: FolderRecord }>("wheel_folder_save", {
        ...folderEditor,
        id: folderEditor.id || undefined,
      });
      setFolder(result.folder.id);
      setFolderEditor(null);
      await refresh();
    });
  }
  const visible = workspace.wheels
    .filter(
      (wheel) =>
        (folder === "*" ||
          wheel.folder === folder ||
          (folder === "" &&
            !workspace.folders.some((item) => item.id === wheel.folder))) &&
        wheel.name
          .toLocaleLowerCase("fr")
          .includes(search.trim().toLocaleLowerCase("fr")),
    )
    .sort((a, b) =>
      sort === "recent"
        ? (b.lastDraw || "").localeCompare(a.lastDraw || "") || byName(a, b)
        : byName(a, b),
    );
  const activeFolder = workspace.folders.find((item) => item.id === folder);
  const status = error ? (
    <p className="wheel-workspace-message error" role="alert">
      {error}
    </p>
  ) : notice ? (
    <p className="wheel-workspace-message" role="status">
      {notice}
    </p>
  ) : null;
  const navigate = (id: string) => {
    setFolder(id);
    setEditor(null);
    setError("");
    setNotice("");
  };
  return (
    <>
      <main className="wheel-workspace">
        {!authenticated ? (
          <section className="wheel-login">
            <div className="wheel-workspace-icon">
              <Sparkles />
            </div>
            <h1>Roue du destin</h1>
            <p>Connecte-toi pour créer et retrouver tes roues.</p>
            {status}
            {authenticated === false && (
              <form onSubmit={login}>
                <label>
                  Mot de passe administrateur
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <button className="wheel-primary" disabled={busy}>
                  Ouvrir mes roues
                </button>
              </form>
            )}
            {authenticated === null && !error && (
              <p role="status">Vérification de la session…</p>
            )}
          </section>
        ) : (
          <>
            <header className="wheel-workspace-heading">
              <div className="wheel-workspace-icon">
                <Sparkles />
              </div>
              <div>
                <h1>Roue du destin</h1>
                <p>
                  Prépare tes tirages et reprends-les là où tu les as laissés.
                </p>
              </div>
              <button
                className="wheel-primary"
                disabled={busy || !!editor}
                onClick={() => {
                  setFolderEditor(null);
                  setEditor({
                    wheel: blankWheel(activeFolder?.id || ""),
                    linked: [],
                  });
                }}
              >
                <Plus size={18} /> Nouvelle roue
              </button>
            </header>
            <div className="wheel-workspace-grid">
              <aside className="wheel-folders" aria-label="Dossiers des roues">
                <header>
                  <h2>Dossiers</h2>
                  <button
                    title="Nouveau dossier"
                    aria-label="Nouveau dossier"
                    disabled={busy || !!editor}
                    onClick={() =>
                      setFolderEditor({ id: "", name: "", version: 0 })
                    }
                  >
                    <FolderPlus size={18} />
                  </button>
                </header>
                <button
                  className="wheel-folder-link"
                  aria-current={folder === "*" ? "true" : undefined}
                  disabled={!!editor}
                  onClick={() => navigate("*")}
                >
                  <Sparkles size={17} />
                  <span>Toutes les roues</span>
                  <small>{workspace.wheels.length}</small>
                </button>
                <button
                  className="wheel-folder-link"
                  aria-current={folder === "" ? "true" : undefined}
                  disabled={!!editor}
                  onClick={() => navigate("")}
                >
                  <Folder size={17} />
                  <span>Sans dossier</span>
                </button>
                {[...workspace.folders].sort(byName).map((item) => (
                  <button
                    className="wheel-folder-link"
                    aria-current={folder === item.id ? "true" : undefined}
                    disabled={!!editor}
                    key={item.id}
                    onClick={() => navigate(item.id)}
                  >
                    <Folder size={17} />
                    <span>{item.name}</span>
                    <small>
                      {
                        workspace.wheels.filter(
                          (wheel) => wheel.folder === item.id,
                        ).length
                      }
                    </small>
                  </button>
                ))}
                {folderEditor && (
                  <form className="wheel-folder-form" onSubmit={saveFolder}>
                    <label>
                      {folderEditor.id
                        ? "Renommer le dossier"
                        : "Nom du dossier"}
                      <input
                        autoFocus
                        required
                        maxLength={120}
                        value={folderEditor.name}
                        onChange={(event) =>
                          setFolderEditor({
                            ...folderEditor,
                            name: event.target.value,
                          })
                        }
                      />
                    </label>
                    <div className="wheel-actions">
                      <button
                        className="wheel-primary"
                        disabled={busy || !folderEditor.name.trim()}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setFolderEditor(null)}
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                )}
              </aside>
              <section className="wheel-library">
                {status}
                {editor ? (
                  <WheelEditor
                    key={editor.wheel.id || "new"}
                    initial={editor}
                    databases={databases}
                    folders={workspace.folders}
                    busy={busy}
                    onSave={saveWheel}
                    onClose={() => setEditor(null)}
                  />
                ) : (
                  <>
                    <header className="wheel-library-heading">
                      <h2>
                        {activeFolder?.name ||
                          (folder === "" ? "Sans dossier" : "Toutes les roues")}
                      </h2>
                      {activeFolder && (
                        <div className="wheel-actions">
                          <button
                            disabled={busy}
                            onClick={() => setFolderEditor(activeFolder)}
                          >
                            Renommer
                          </button>
                          {!workspace.wheels.some(
                            (wheel) => wheel.folder === activeFolder.id,
                          ) && (
                            <button
                              disabled={busy}
                              onClick={() => {
                                if (
                                  !confirm(
                                    `Supprimer le dossier « ${activeFolder.name} » ?`,
                                  )
                                )
                                  return;
                                void perform(async () => {
                                  await api("wheel_folder_delete", {
                                    id: activeFolder.id,
                                    version: activeFolder.version,
                                  });
                                  setFolder("*");
                                  await refresh();
                                });
                              }}
                            >
                              Supprimer le dossier
                            </button>
                          )}
                        </div>
                      )}
                    </header>
                    <div className="wheel-library-controls">
                      <label className="wheel-search">
                        <Search size={16} />
                        <input
                          aria-label="Rechercher une roue"
                          placeholder="Rechercher une roue"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </label>
                      <select
                        aria-label="Trier les roues"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                      >
                        <option value="name">Nom de A à Z</option>
                        <option value="recent">Dernier tirage</option>
                      </select>
                    </div>
                    {visible.length ? (
                      <div className="wheel-cards">
                        {visible.map((wheel) => (
                          <article className="wheel-card" key={wheel.id}>
                            <div className="wheel-card-top">
                              <span className="wheel-card-icon">
                                {wheel.database ? (
                                  <Database size={18} />
                                ) : (
                                  <Sparkles size={18} />
                                )}
                              </span>
                              <small>
                                {workspace.folders.find(
                                  (item) => item.id === wheel.folder,
                                )?.name || "Sans dossier"}
                              </small>
                            </div>
                            <h3>{wheel.name}</h3>
                            <p>
                              {wheel.database
                                ? "Base de données liée"
                                : "Entrées manuelles"}
                            </p>
                            <p className="wheel-card-date">
                              {wheel.lastDraw
                                ? `Dernier tirage · ${formatCreatedAt(wheel.lastDraw)}`
                                : "Aucun tirage"}
                            </p>
                            <div className="wheel-actions">
                              <button
                                className="wheel-primary"
                                disabled={busy}
                                onClick={() => {
                                  flushSync(() => setPlaying(wheel));
                                  enterWheelFullscreen(wheelScreen.current);
                                }}
                              >
                                <Play size={15} /> Ouvrir
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => edit(wheel)}
                              >
                                Modifier
                              </button>
                              <button
                                className="wheel-icon-button"
                                aria-label={`Supprimer ${wheel.name}`}
                                title="Supprimer la roue"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    !confirm(
                                      `Supprimer définitivement la roue « ${wheel.name} » et son historique ?`,
                                    )
                                  )
                                    return;
                                  void perform(async () => {
                                    await api("wheel_delete", {
                                      id: wheel.id,
                                      version: wheel.version,
                                    });
                                    await refresh();
                                  });
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="wheel-library-empty">
                        <Sparkles size={27} />
                        <h3>
                          {search ? "Aucune roue trouvée" : "Aucune roue ici"}
                        </h3>
                        <p>
                          {search
                            ? "Essaie un autre nom."
                            : "Crée une roue à partir d’une liste ou d’une base Feuillet."}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </main>
      {authenticated && playing && (
        <DestinyWheel
          key={playing.id}
          id=""
          source=""
          properties={[]}
          initialGroup=""
          savedId={playing.id}
          title={playing.name}
          screenRef={wheelScreen}
          onClose={() => {
            setPlaying(null);
            void refresh().catch((e) => setError(errorText(e)));
          }}
        />
      )}
    </>
  );
}

function WheelEditor({
  initial,
  databases,
  folders,
  onSave,
  onClose,
  busy,
}: {
  initial: EditWheel;
  databases: DatabaseRecord[];
  folders: FolderRecord[];
  onSave: (wheel: Wheel) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const [wheel, setWheel] = useState(() => ({
    ...initial.wheel,
    folder: folders.some((item) => item.id === initial.wheel.folder)
      ? initial.wheel.folder
      : "",
  }));
  const [columns, setColumns] = useState<Columns | null>(null);
  const [sourceType, setSourceType] = useState(
    initial.wheel.database ? "database" : "manual",
  );
  const [columnError, setColumnError] = useState("");
  const [text, setText] = useState("");
  const [entryLayout, setEntryLayout] = useState<"cards" | "list">(() => {
    try {
      return localStorage.getItem("feuillet:wheel-entry-layout") === "list"
        ? "list"
        : "cards";
    } catch {
      return "cards";
    }
  });
  const [editingNew, setEditingNew] = useState("");
  const newEntryInput = useRef<HTMLInputElement>(null);
  const entryHeading = useId();
  useEffect(() => {
    try {
      localStorage.setItem("feuillet:wheel-entry-layout", entryLayout);
    } catch {}
  }, [entryLayout]);
  useEffect(() => {
    if (editingNew) newEntryInput.current?.focus();
  }, [editingNew]);
  const [entrySearch, setEntrySearch] = useState("");
  const [limit, setLimit] = useState(100);
  const [manualLimit, setManualLimit] = useState(100);
  const [preview, setPreview] = useState<WheelEntry[]>(initial.linked);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewIssue, setPreviewIssue] = useState(initial.warning || "");
  useEffect(() => {
    if (!wheel.database) {
      setColumns(null);
      return;
    }
    const controller = new AbortController();
    setColumns(null);
    setColumnError("");
    api<Columns>(
      "wheel_columns",
      undefined,
      { id: wheel.database },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setColumns(result);
        setWheel((current) => ({
          ...current,
          property:
            current.property ||
            (
              result.properties.find((item) => item.type === "title") ||
              result.properties[0]
            )?.id ||
            "",
        }));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setColumnError(errorText(e));
      });
    return () => controller.abort();
  }, [wheel.database]);
  useEffect(() => {
    const controller = new AbortController();
    if (!wheel.database || !wheel.property) {
      setPreview([]);
      setPreviewIssue("");
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    api<{ entries: WheelEntry[] }>(
      "wheel_source_preview",
      undefined,
      { id: wheel.database, property: wheel.property, source: wheel.source },
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setPreview(result.entries);
          setPreviewIssue("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setPreview([]);
          setPreviewIssue(errorText(e));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreviewLoading(false);
      });
    return () => controller.abort();
  }, [wheel.database, wheel.property, wheel.source]);
  const update = (patch: Partial<Wheel>) =>
    setWheel((current) => ({ ...current, ...patch }));
  const newEntries = text
    .split(/\r?\n/)
    .map((label) => label.trim())
    .filter(Boolean);
  function appendText() {
    update({
      manual: [
        ...wheel.manual,
        ...newEntries.map((label) => ({
          id: entryId(),
          label: label.slice(0, 240),
        })),
      ],
    });
    setManualLimit(wheel.manual.length + newEntries.length);
    setText("");
  }
  function addCard() {
    const id = entryId();
    update({ manual: [...wheel.manual, { id, label: "" }] });
    setManualLimit(Math.max(manualLimit, wheel.manual.length + 1));
    setEditingNew(id);
  }
  const entriesClass =
    entryLayout === "cards"
      ? "wheel-entry-list wheel-entry-cards"
      : "wheel-entry-list";
  function override(id: string, patch: Partial<Override>) {
    const current = wheel.overrides[id] || { label: null, hidden: false };
    const next = { ...wheel.overrides, [id]: { ...current, ...patch } };
    update({ overrides: next });
  }
  const shownLinked = preview.filter((entry) =>
    (wheel.overrides[entry.id]?.label ?? entry.label)
      .toLocaleLowerCase("fr")
      .includes(entrySearch.trim().toLocaleLowerCase("fr")),
  );
  return (
    <form
      className="wheel-editor"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy)
          onSave({
            ...wheel,
            manual: [
              ...wheel.manual,
              ...newEntries.map((label) => ({
                id: entryId(),
                label: label.slice(0, 240),
              })),
            ],
          });
      }}
    >
      <header className="wheel-library-heading">
        <h2>{wheel.id ? "Modifier la roue" : "Nouvelle roue"}</h2>
        <button type="button" disabled={busy} onClick={onClose}>
          Annuler
        </button>
      </header>
      <div className="wheel-editor-fields">
        <label>
          Nom de la roue
          <input
            autoFocus
            required
            maxLength={120}
            placeholder="Ex. Oral du TP"
            value={wheel.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </label>
        <label>
          Dossier
          <select
            value={wheel.folder}
            onChange={(e) => update({ folder: e.target.value })}
          >
            <option value="">Sans dossier</option>
            {[...folders].sort(byName).map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="wheel-entry-display">
        <strong id={entryHeading}>Affichage des entrées</strong>
        <div
          className="wheel-entry-switch"
          role="group"
          aria-labelledby={entryHeading}
        >
          <button
            type="button"
            aria-pressed={entryLayout === "cards"}
            onClick={() => setEntryLayout("cards")}
          >
            <LayoutGrid size={16} /> Cartes
          </button>
          <button
            type="button"
            aria-pressed={entryLayout === "list"}
            onClick={() => setEntryLayout("list")}
          >
            <List size={16} /> Liste de texte
          </button>
        </div>
      </div>
      <fieldset className="wheel-source">
        <legend>Source de la roue</legend>
        <div className="wheel-source-options">
          <label>
            <input
              type="radio"
              name="wheel-source"
              checked={sourceType === "manual"}
              onChange={() => {
                setSourceType("manual");
                update({
                  database: "",
                  property: "",
                  source: "",
                  overrides: {},
                });
              }}
            />
            <ListPlus size={19} />
            <span>
              <strong>Liste manuelle</strong>
              <small>Ajoute les entrées de ton choix.</small>
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="wheel-source"
              checked={sourceType === "database"}
              onChange={() => setSourceType("database")}
            />
            <Database size={19} />
            <span>
              <strong>Base de données liée</strong>
              <small>Récupère les entrées d’une colonne.</small>
            </span>
          </label>
        </div>
        {sourceType === "database" && (
          <>
            <div className="wheel-editor-fields">
              <label>
                Base de données
                <select
                  required
                  value={wheel.database}
                  onChange={(e) =>
                    update({
                      database: e.target.value,
                      property: "",
                      source: "",
                      overrides: {},
                    })
                  }
                >
                  <option value="">Choisir une base</option>
                  {wheel.database &&
                    !databases.some((db) => db.id === wheel.database) && (
                      <option value={wheel.database}>Base indisponible</option>
                    )}
                  {[...databases]
                    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
                    .map((db) => (
                      <option key={db.id} value={db.id}>
                        {db.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Colonne à tirer
                <select
                  required
                  disabled={!columns}
                  value={wheel.property}
                  onChange={(e) =>
                    update({ property: e.target.value, overrides: {} })
                  }
                >
                  <option value="">Choisir une colonne</option>
                  {wheel.property &&
                    columns &&
                    !columns.properties.some(
                      (p) => p.id === wheel.property,
                    ) && (
                      <option value={wheel.property}>
                        Colonne indisponible
                      </option>
                    )}
                  {columns?.properties.map((property) => (
                    <option value={property.id} key={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </label>
              {columns && (columns.forms.length > 0 || wheel.source) && (
                <label>
                  Réponses à utiliser
                  <select
                    value={wheel.source}
                    onChange={(e) => update({ source: e.target.value })}
                  >
                    <option value="">Toutes les lignes</option>
                    {wheel.source &&
                      !columns.forms.some(
                        (item) => item.id === wheel.source,
                      ) && (
                        <option value={wheel.source}>
                          Formulaire indisponible
                        </option>
                      )}
                    {columns.forms.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {(columnError || previewIssue) && (
              <p role="alert" className="wheel-workspace-message error">
                {columnError || previewIssue}
              </p>
            )}
            {previewLoading && <p role="status">Chargement des entrées…</p>}
            {preview.length > 0 && !previewLoading && (
              <details className="wheel-linked-list">
                <summary>
                  {preview.length}{" "}
                  {preview.length === 1 ? "entrée liée" : "entrées liées"}
                </summary>
                <p>Renomme ou masque une entrée uniquement dans cette roue.</p>
                <input
                  aria-label="Rechercher une entrée liée"
                  placeholder="Rechercher"
                  value={entrySearch}
                  onChange={(e) => {
                    setEntrySearch(e.target.value);
                    setLimit(100);
                  }}
                />
                <div className={entriesClass}>
                  {shownLinked.slice(0, limit).map((entry) => {
                    const customization = wheel.overrides[entry.id];
                    const label = entry.label || "Valeur vide";
                    return (
                      <div
                        className="wheel-entry"
                        data-excluded={!!customization?.hidden}
                        key={entry.id}
                      >
                        {entryLayout === "cards" && (
                          <div className="wheel-entry-title">
                            <Database size={16} aria-hidden="true" />
                            <span title={label}>{label}</span>
                          </div>
                        )}
                        <input
                          aria-label={`Nom dans la roue : ${label}`}
                          placeholder={label}
                          maxLength={240}
                          value={customization?.label ?? ""}
                          onChange={(e) =>
                            override(entry.id, {
                              label: e.target.value.trim()
                                ? e.target.value
                                : null,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.nativeEvent.isComposing)
                              e.preventDefault();
                          }}
                        />
                        <label className="wheel-check">
                          <input
                            type="checkbox"
                            checked={!customization?.hidden}
                            aria-label={`Inclure ${label} dans le tirage`}
                            onChange={(e) =>
                              override(entry.id, { hidden: !e.target.checked })
                            }
                          />
                          {customization?.hidden ? "Masquée" : "Incluse"}
                        </label>
                      </div>
                    );
                  })}
                </div>
                {shownLinked.length > limit && (
                  <button type="button" onClick={() => setLimit(limit + 100)}>
                    Voir 100 entrées de plus
                  </button>
                )}
              </details>
            )}
          </>
        )}
      </fieldset>
      <section className="wheel-manual">
        <header className="wheel-manual-heading">
          <h3>
            Entrées manuelles{" "}
            <small>
              {wheel.manual.filter((entry) => entry.label.trim()).length}
            </small>
          </h3>
          {entryLayout === "cards" && (
            <button
              type="button"
              disabled={busy || wheel.manual.length + newEntries.length >= 2000}
              onClick={addCard}
            >
              <Plus size={16} /> Ajouter une carte
            </button>
          )}
        </header>
        {entryLayout === "list" && (
          <>
            <label>
              Une entrée par ligne
              <textarea
                rows={4}
                aria-label="Ajouter des entrées manuelles"
                maxLength={500000}
                placeholder={"Équipe A\nÉquipe B\nÉquipe C"}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={
                busy ||
                !newEntries.length ||
                wheel.manual.length + newEntries.length > 2000
              }
              onClick={appendText}
            >
              <Plus size={16} /> Ajouter {newEntries.length || "des"}{" "}
              {newEntries.length === 1 ? "entrée" : "entrées"}
            </button>
          </>
        )}
        {wheel.manual.length > 0 && (
          <div className={entriesClass}>
            {wheel.manual.slice(0, manualLimit).map((entry, index) => (
              <div className="wheel-entry" key={entry.id}>
                {entryLayout === "cards" && (
                  <div className="wheel-entry-title">
                    <ListPlus size={16} aria-hidden="true" />{" "}
                    <span>Entrée manuelle</span>
                  </div>
                )}
                <input
                  aria-label={`Entrée manuelle ${index + 1}`}
                  ref={editingNew === entry.id ? newEntryInput : undefined}
                  placeholder="Nom de l’entrée"
                  maxLength={240}
                  value={entry.label}
                  onChange={(e) =>
                    update({
                      manual: wheel.manual.map((item) =>
                        item.id === entry.id
                          ? { ...item, label: e.target.value }
                          : item,
                      ),
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing)
                      e.preventDefault();
                  }}
                />
                <button
                  type="button"
                  className="wheel-icon-button"
                  title="Retirer cette entrée"
                  aria-label={`Retirer l’entrée ${index + 1}`}
                  onClick={() =>
                    update({
                      manual: wheel.manual.filter(
                        (item) => item.id !== entry.id,
                      ),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        {wheel.manual.length > manualLimit && (
          <button
            type="button"
            onClick={() => setManualLimit(manualLimit + 100)}
          >
            Voir 100 entrées de plus
          </button>
        )}
      </section>
      <footer className="wheel-actions">
        <button
          className="wheel-primary"
          disabled={
            busy ||
            wheel.manual.length + newEntries.length > 2000 ||
            !wheel.name.trim() ||
            (sourceType === "database" &&
              (!wheel.database ||
                !wheel.property ||
                previewLoading ||
                !!previewIssue ||
                !!columnError))
          }
        >
          Enregistrer la roue <ArrowUpRight size={16} />
        </button>
        <button type="button" disabled={busy} onClick={onClose}>
          Annuler
        </button>
        {newEntries.length > 0 && (
          <small>
            Les lignes saisies seront aussi ajoutées à l’enregistrement.
          </small>
        )}
      </footer>
    </form>
  );
}
