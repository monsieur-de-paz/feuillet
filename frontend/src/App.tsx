import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { navigationShortcutMatches } from "./navigation";
import { MediaUsage } from "./MediaUsage";
import type { Editor } from "@tiptap/core";
import {
  Home,
  Table as TableIcon,
  Menu,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Star,
  FileText,
  Globe,
  Lock,
  MoreHorizontal,
  Copy,
  Trash2,
  History,
  ExternalLink,
  LogOut,
  LogIn,
  X,
  Upload,
  Download,
  ArrowLeft,
  Settings,
  Check,
  AlertCircle,
  LoaderCircle,
  Image as ImageIcon,
  Folder,
  BookOpen,
  LayoutGrid,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Cloud,
  PanelLeftClose,
  PanelLeftOpen,
  Move,
  File,
  Music,
  Video,
  Palette,
  Maximize,
  Minimize,
  Pencil,
} from "lucide-react";
import { IconPicker, FeuilletIcon } from "./IconPicker";
import {
  ThemeToggle,
  readThemePreference,
  storeThemePreference,
  applyThemePreference,
  type ThemePreference,
} from "./ThemeToggle";
import { HomepageControls, type HomepageSetting } from "./Homepage";
import CourseEditor, { type EditorRequest } from "./Editor";
import { AppContext } from "./context";
import { ImageLightbox, type ZoomImage } from "./MediaLightbox";
import { DatabaseManager } from "./Database";
import {
  CategoriesEditor,
  ThemeControls,
  NotebookControls,
  CoverTools,
  themeStyle,
} from "./Customization";
import "./app-v3.css";
import {
  api,
  setCsrf,
  type Session,
  type Category,
  type Notebook,
  type Page,
  type Doc,
  type FileRecord,
  emptyDoc,
  fileUrl,
  pageUrl,
  sizeLabel,
  safeLink,
  type Space,
  type Appearance,
  type ImagePurpose,
  type Attribution,
  defaultAppearance,
} from "./types";

import "./app-v2.css";

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    ref.current?.querySelector<HTMLElement>("input,button")?.focus();
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.classList.remove("modal-open");
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Fermer" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function MediaCredit({
  credit,
  label = "Image",
}: {
  credit?: Attribution | null;
  label?: string;
}) {
  if (!credit) return null;
  return (
    <small className="media-credit">
      <span>
        {label} : {credit.author || "Wikimedia Commons"}
        {credit.license ? ` · ${credit.license}` : ""}
      </span>
      {credit.source_url && (
        <a
          href={safeLink(credit.source_url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Source ↗
        </a>
      )}
      {credit.license_url && (
        <a
          href={safeLink(credit.license_url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Licence ↗
        </a>
      )}
    </small>
  );
}
function Spinner() {
  return <LoaderCircle className="spin" size={18} />;
}
function defaults(): Omit<
  Page,
  | "id"
  | "slug"
  | "version"
  | "visibility"
  | "has_unpublished_changes"
  | "published_at"
> {
  return {
    parent_id: null,
    title: "Sans titre",
    icon: "📄",
    cover_id: null,
    icon_id: null,
    space_id: null,
    appearance: {},
    kind: "page",
    description: "",
    tags: [],
    source_url: "",
    source_name: "",
    sort_order: 0,
    content: emptyDoc,
  };
}
function readFavorites() {
  try {
    return JSON.parse(
      localStorage.getItem("feuillet-favorites") || "[]",
    ) as string[];
  } catch {
    return [];
  }
}
function titleOf(p: Page) {
  return p.title || "Sans titre";
}

export default function App() {
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [notebook, setNotebook] = useState<Notebook>({
    title: "Feuillet.",
    subtitle: "Mon carnet pédagogique",
    max_upload: 104857600,
    auto_publish: true,
    icon: "f.",
    icon_id: null,
  });
  const [homepage, setHomepage] = useState<HomepageSetting>({
    id: null,
    title: null,
    published: false,
  });
  const [serverLimit, setServerLimit] = useState(104857600);
  const [zoomedImage, setZoomedImage] = useState<ZoomImage | null>(null);
  const [databaseMode, setDatabaseMode] = useState<
    "manage" | "database" | "form"
  >("manage");
  const dbCallback = useRef<((id: string) => void) | null>(null);
  const formCallback = useRef<((id: string) => void) | null>(null);
  const focusNewTitle = useRef<string | null>(null);
  const [appearance, setAppearance] = useState<Appearance>(defaultAppearance);
  const [themePreference, setThemePreference] =
    useState<ThemePreference>(readThemePreference);
  const displayAppearance = applyThemePreference(appearance, themePreference);
  function changeTheme(value: ThemePreference) {
    storeThemePreference(value);
    setThemePreference(value);
  }
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === "feuillet.theme")
        setThemePreference(readThemePreference());
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  useEffect(() => {
    Object.entries(themeStyle(displayAppearance)).forEach(([key, value]) => {
      if (key.startsWith("--"))
        document.documentElement.style.setProperty(key, String(value));
    });
    document.documentElement.style.colorScheme =
      displayAppearance.mode === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = displayAppearance.mode;
  }, [appearance, themePreference]);
  const appearanceRef = useRef<Appearance>(defaultAppearance);
  const appearanceSave = useRef<Promise<any>>(Promise.resolve());
  const [appearanceScope, setAppearanceScope] = useState<"global" | "page">(
    "global",
  );
  const [focus, setFocus] = useState(false);
  const [spaceForm, setSpaceForm] = useState({ id: "", name: "", icon: "📚" });
  const [moveSpace, setMoveSpace] = useState("");
  const [imageTab, setImageTab] = useState<"files" | "internet">("files");
  const [imageQuery, setImageQuery] = useState("");
  const [internetImages, setInternetImages] = useState<any[]>([]);
  const [imageSearching, setImageSearching] = useState(false);
  const [renaming, setRenaming] = useState<FileRecord | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const imageCallback = useRef<((file: FileRecord) => void) | null>(null);
  const renameCallback = useRef<((file: FileRecord) => void) | null>(null);
  const modalRef = useRef<string | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [trash, setTrash] = useState<Page[]>([]);
  const [draft, setDraft] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [fatal, setFatal] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "dirty" | "error" | "conflict"
  >("saved");
  const [saveError, setSaveError] = useState("");
  const [sidebar, setSidebar] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(() => {
    try {
      return localStorage.getItem("feuillet.sidebar-hidden") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("feuillet.sidebar-hidden", String(sidebarHidden));
    } catch {}
  }, [sidebarHidden]);
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  function toggleNavigation() {
    if (mobile) setSidebar((v) => !v);
    else if (focus) {
      setFocus(false);
      setSidebarHidden(false);
    } else setSidebarHidden((v) => !v);
  }
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>(readFavorites);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Page[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [kind, setKind] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [pdfDownload, setPdfDownload] = useState<{
    url: string;
    filename: string;
    size: number;
  } | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    },
    [],
  );
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [fileQuery, setFileQuery] = useState("");
  const [requested, setRequested] = useState<
    EditorRequest | "cover" | "icon" | null
  >(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [more, setMore] = useState(false);
  const [linkForm, setLinkForm] = useState({
    href: "",
    title: "",
    description: "",
    source: "",
  });
  const [loginPassword, setLoginPassword] = useState("");
  const [moveParent, setMoveParent] = useState("");
  const [iconTarget, setIconTarget] = useState<"page" | "notebook">("page");
  const editorRef = useRef<Editor | null>(null);
  const insertEditor = useRef<Editor | null>(null);
  const draftRef = useRef<Page | null>(null);
  const dirtyRef = useRef(false);
  const savePromise = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const admin = !!session?.authenticated;
  useEffect(() => {
    if (!admin) return;
    const shortcut = (event: KeyboardEvent) => {
      const binding = notebook.sidebar_shortcut ?? "Mod+Shift+L";
      if (navigationShortcutMatches(binding, event)) {
        event.preventDefault();
        event.stopPropagation();
        toggleNavigation();
      }
    };
    document.addEventListener("keydown", shortcut, true);
    return () => document.removeEventListener("keydown", shortcut, true);
  }, [admin, notebook.sidebar_shortcut, mobile, focus]);
  const adminRef = useRef(admin);
  adminRef.current = admin;
  function notify(message: string) {
    setToast(message);
  }
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(id);
    }
  }, [toast]);
  function updateDraft(patch: Partial<Page>) {
    if (!draftRef.current) return;
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    dirtyRef.current = true;
    setDraft(next);
    setSaveStatus("dirty");
  }
  useEffect(() => {
    const changed = (event: Event) => {
      const { dbId, deletedPropertyId, pageVersions } =
        (event as CustomEvent).detail || {};
      if (!deletedPropertyId || !pageVersions || !draftRef.current) return;
      const current = draftRef.current;
      const change = pageVersions[current.id];
      if (!change) return;
      if (current.version !== change.before) {
        notify(
          "La page a aussi été modifiée ailleurs. Recharge-la avant de poursuivre la rédaction.",
        );
        return;
      }
      let content = current.content;
      const editor = editorRef.current;
      if (editor && !editor.isDestroyed) {
        const transaction = editor.state.tr;
        editor.state.doc.descendants((node, position) => {
          if (
            node.type.name !== "databaseView" ||
            node.attrs.dbId !== dbId ||
            !node.attrs.viewConfig
          )
            return;
          const previous = node.attrs.viewConfig;
          const viewConfig = {
            ...previous,
            filters: (previous.filters || []).filter(
              (f: any) => f.propertyId !== deletedPropertyId,
            ),
            hiddenPropertyIds: (previous.hiddenPropertyIds || []).filter(
              (id: string) => id !== deletedPropertyId,
            ),
            sort:
              previous.sort?.propertyId === deletedPropertyId
                ? null
                : previous.sort,
          };
          transaction.setNodeMarkup(position, undefined, {
            ...node.attrs,
            viewConfig,
          });
        });
        if (transaction.docChanged) {
          editor.view.dispatch(transaction.setMeta("preventUpdate", true));
          content = editor.getJSON();
        }
      }
      const next = { ...current, content, version: change.after };
      draftRef.current = next;
      setDraft(next);
      void loadList().catch(() => {});
    };
    window.addEventListener("feuillet:database-changed", changed);
    return () =>
      window.removeEventListener("feuillet:database-changed", changed);
  }, []);
  async function loadList() {
    const result = await api("pages");
    setPages(result.pages || []);
    setTrash(result.trash || []);
    if (result.spaces) setSpaces(result.spaces);
    if (result.categories) setCategories(result.categories);
    return result.pages as Page[];
  }
  function updateList(page: Page) {
    setPages((prev) =>
      prev.some((p) => String(p.id) === String(page.id))
        ? prev.map((p) =>
            String(p.id) === String(page.id) ? { ...p, ...page } : p,
          )
        : [...prev, page],
    );
  }
  async function save(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current);
    if (savePromise.current) return savePromise.current;
    if (!dirtyRef.current || !draftRef.current || !adminRef.current)
      return true;
    const task = (async () => {
      setSaveError("");
      try {
        while (dirtyRef.current && draftRef.current) {
          const snapshot = draftRef.current;
          dirtyRef.current = false;
          setSaveStatus("saving");
          const { page } = await api("save", {
            ...snapshot,
            content: snapshot.content || emptyDoc,
          });
          if (String(draftRef.current?.id) === String(snapshot.id)) {
            const changed = draftRef.current !== snapshot;
            const next = changed
              ? {
                  ...draftRef.current!,
                  version: page.version,
                  visibility: page.visibility,
                  has_unpublished_changes: page.has_unpublished_changes,
                }
              : { ...snapshot, ...page };
            draftRef.current = next;
            setDraft(next);
            updateList({ ...page, content: undefined });
          }
          setSaveStatus(dirtyRef.current ? "dirty" : "saved");
        }
        return true;
      } catch (e) {
        dirtyRef.current = true;
        setSaveError((e as Error).message);
        setSaveStatus((e as any).status === 409 ? "conflict" : "error");
        return false;
      } finally {
        savePromise.current = null;
      }
    })();
    savePromise.current = task;
    return task;
  }
  useEffect(() => {
    if (admin && dirtyRef.current) {
      timer.current = setTimeout(() => void save(), 900);
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
  }, [draft]);
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, []);
  async function openPage(id: string, replace = false, skipSave = false) {
    if (
      !document.dispatchEvent(
        new Event("feuillet:before-page-change", { cancelable: true }),
      )
    ) {
      notify(
        "Enregistre ou annule la fiche, le champ ou le formulaire en cours avant de changer de page.",
      );
      return;
    }
    if (!skipSave && !(await save())) {
      notify("La page doit être enregistrée avant de la quitter.");
      return;
    }
    setMore(false);
    setSidebar(false);
    setPageLoading(true);
    setSaveError("");
    try {
      const { page } = await api("page", undefined, { id });
      const changedPage = String(draftRef.current?.id) !== String(page.id);
      draftRef.current = page;
      dirtyRef.current = false;
      setDraft(page);
      setActiveSpace(String(page.space_id || ""));
      setFocus(page.appearance?.focus ?? appearanceRef.current.focus);
      setEditorEpoch((n) => n + 1);
      setSaveStatus("saved");
      const url = pageUrl(page.slug || page.id);
      if (replace) window.history.replaceState({}, "", url);
      else window.history.pushState({}, "", url);
      if (changedPage)
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          document.querySelector(".main-panel")?.scrollTo(0, 0);
        });
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setPageLoading(false);
    }
  }
  useEffect(() => {
    (async () => {
      try {
        const s = await api<Session>("session");
        setCsrf(s.csrf);
        setSession(s);
        if (s.installed === false) {
          setLoading(false);
          return;
        }
        const list = await loadList();
        const settings = await api("settings");
        appearanceRef.current = {
          ...defaultAppearance,
          ...settings.appearance,
        };
        setAppearance(appearanceRef.current);
        const selected = new URLSearchParams(location.search).get("page");
        if (selected) {
          const p = list.find(
            (p) => String(p.id) === selected || p.slug === selected,
          );
          if (p) await openPage(String(p.id), true, true);
          else
            setFatal(
              "Cette page n’est pas disponible. Elle est peut-être privée ou a été retirée.",
            );
        } else if (list.length) {
          const first = list.find((p) => !p.parent_id) || list[0];
          await openPage(String(first.id), true, true);
        }
      } catch (e) {
        setFatal((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
    const pop = () => {
      const id = new URLSearchParams(location.search).get("page");
      if (id) void openPage(id, true);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  async function editHomepage(id: string, created = false) {
    if (created) focusNewTitle.current = id;
    await loadList();
    setModal(null);
    await openPage(id);
  }
  async function showHomepage() {
    try {
      const r = await api("settings");
      if (r.homepage) setHomepage(r.homepage);
      showModal("homepage");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    setModalError("");
    try {
      await fn();
    } catch (e) {
      setModalError((e as Error).message);
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function showModal(name: string) {
    setModalError("");
    setModal(name);
    setMore(false);
  }
  useEffect(() => {
    setKind("");
  }, [activeSpace]);
  useEffect(() => {
    if (!session) return;
    void api("settings")
      .then((result) => {
        if (result.notebook) setNotebook(result.notebook);
        if (result.homepage) setHomepage(result.homepage);
        if (result.server_upload_limit)
          setServerLimit(result.server_upload_limit);
      })
      .catch(() => {});
  }, [session?.authenticated]);
  useEffect(() => {
    if (!draft || focusNewTitle.current !== String(draft.id) || pageLoading)
      return;
    const frame = requestAnimationFrame(() => {
      const input =
        document.querySelector<HTMLTextAreaElement>(".page-title-input");
      if (input) {
        input.focus();
        input.select();
        focusNewTitle.current = null;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [draft?.id, pageLoading]);
  function chooseDatabase(callback: (id: string) => void) {
    dbCallback.current = callback;
    formCallback.current = null;
    setDatabaseMode("database");
    showModal("databases");
  }
  function chooseForm(callback: (id: string) => void) {
    formCallback.current = callback;
    dbCallback.current = null;
    setDatabaseMode("form");
    showModal("databases");
  }
  async function saveNotebook(value: Notebook) {
    if (!(await save()))
      throw new Error("Enregistre la page avant de modifier ces réglages.");
    const result = await api("settings", { notebook: value });
    setNotebook(result.notebook);
    const updatedPages = await loadList();
    const current = draftRef.current;
    const metadata = updatedPages.find((p) => p.id === current?.id);
    if (current && metadata && current.version === metadata.version) {
      const next = {
        ...current,
        visibility: metadata.visibility,
        has_unpublished_changes:
          dirtyRef.current || metadata.has_unpublished_changes,
      };
      draftRef.current = next;
      setDraft(next);
    }
    setServerLimit(result.server_upload_limit);
    setHealth((previous: any) =>
      previous
        ? {
            ...previous,
            upload_limit: Math.min(
              result.server_upload_limit,
              result.notebook.max_upload,
            ),
            configured_upload_limit: result.notebook.max_upload,
            server_upload_limit: result.server_upload_limit,
          }
        : previous,
    );
    setSession((prev) =>
      prev ? { ...prev, name: result.notebook.title } : prev,
    );
    notify("Ton carnet a été mis à jour.");
  }
  async function createPage(
    parent_id: string | null = null,
    options: { title?: string; open?: boolean } = {},
  ): Promise<Page | null> {
    if (
      !document.dispatchEvent(
        new Event("feuillet:before-page-change", { cancelable: true }),
      )
    ) {
      notify(
        "Enregistre ou annule les données en cours avant de créer une page.",
      );
      return null;
    }
    if (!(await save())) return null;
    let created: Page | null = null;
    await perform(async () => {
      const parent = pages.find((p) => String(p.id) === String(parent_id));
      const { page } = await api("save", {
        ...defaults(),
        parent_id,
        title: options.title || "Sans titre",
        space_id: parent ? parent.space_id || null : activeSpace || null,
        category_id:
          categories.find(
            (c) =>
              c.id === kind &&
              String(c.space_id || "") ===
                String(parent ? parent.space_id || "" : activeSpace),
          )?.id || null,
        kind: categories.find((c) => c.id === kind)?.legacy_kind || "page",
      });
      created = page;
      focusNewTitle.current = String(page.id);
      await loadList();
      if (options.open !== false) await openPage(String(page.id));
    });
    return created;
  }
  async function publish() {
    if (!(await save())) return;
    await perform(async () => {
      const p = draftRef.current!;
      const { page, published_count } = await api("publish", {
        id: p.id,
        version: p.version,
      });
      await loadList();
      setModal(null);
      const next = { ...draftRef.current!, ...page };
      draftRef.current = next;
      setDraft(next);
      updateList(page);
      notify(
        next.visibility === "public"
          ? `${published_count} page${published_count > 1 ? "s" : ""} publiée${published_count > 1 ? "s" : ""}, sous-pages comprises.`
          : "La page et ses fichiers sont désormais privés.",
      );
    });
  }
  async function unpublish() {
    if (!(await save())) return;
    await perform(async () => {
      const p = draftRef.current!;
      const { page } = await api("visibility", {
        id: p.id,
        version: p.version,
        visibility: "private",
      });
      draftRef.current = { ...p, ...page };
      setDraft(draftRef.current);
      updateList(page);
      setModal(null);
      await loadList();
      notify("Cette page et ses sous-pages sont désormais privées.");
    });
  }
  async function duplicate() {
    if (!(await save())) return;
    await perform(async () => {
      const { page } = await api("duplicate", { id: draftRef.current!.id });
      await loadList();
      await openPage(String(page.id));
      notify("Une copie privée a été créée.");
    });
  }
  async function move() {
    if (!(await save())) return;
    await perform(async () => {
      const p = draftRef.current!;
      await api("move", {
        id: p.id,
        parent_id: moveParent || null,
        sort_order: p.sort_order,
        space_id: moveSpace || null,
        version: p.version,
      });
      await loadList();
      await openPage(String(p.id));
      setModal(null);
      notify("La page a été déplacée.");
    });
  }
  async function remove() {
    if (!(await save())) return;
    await perform(async () => {
      const id = draftRef.current!.id;
      await api("trash", { id });
      draftRef.current = null;
      setDraft(null);
      dirtyRef.current = false;
      const list = await loadList();
      setModal(null);
      if (list.length) await openPage(String(list[0].id));
      else window.history.replaceState({}, "", "index.php");
      notify("La page a été placée dans la corbeille.");
    });
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    await perform(async () => {
      await api("login", { password: loginPassword });
      setLoginPassword("");
      const s = await api<Session>("session");
      setCsrf(s.csrf);
      setSession(s);
      adminRef.current = true;
      const list = await loadList();
      if (draftRef.current)
        await openPage(String(draftRef.current.id), true, true);
      else if (list.length) await openPage(String(list[0].id), true, true);
      setModal(null);
      notify("Ton carnet est prêt à être modifié.");
    });
  }
  async function logout() {
    if (!(await save())) return;
    await perform(async () => {
      await api("logout", {});
      const s = await api<Session>("session");
      setCsrf(s.csrf);
      setSession(s);
      adminRef.current = false;
      const current = draftRef.current?.id;
      const list = await loadList();
      draftRef.current = null;
      setDraft(null);
      const next =
        list.find((p) => String(p.id) === String(current)) || list[0];
      if (next) await openPage(String(next.id), true, true);
      else window.history.replaceState({}, "", "index.php");
      notify("Tu es déconnecté.");
    });
  }
  function toggleFavorite(id: string) {
    const next = favorites.includes(String(id))
      ? favorites.filter((x) => x !== String(id))
      : [...favorites, String(id)];
    setFavorites(next);
    try {
      localStorage.setItem("feuillet-favorites", JSON.stringify(next));
    } catch {}
  }
  async function request(kind: EditorRequest, editor: Editor) {
    insertEditor.current = editor;
    setRequested(kind);
    if (["pageLink", "bookmark", "buttonLink"].includes(kind)) {
      setLinkForm({ href: "", title: "", description: "", source: "" });
      showModal(kind);
      return;
    }
    imageCallback.current = null;
    await showFiles(kind);
  }
  async function showFiles(
    kind: EditorRequest | "cover" | "icon" | null = null,
  ) {
    setRequested(kind);
    setFileQuery("");
    setImageTab("files");
    showModal("files");
    setFileLoading(true);
    try {
      const data = await api("files");
      setFiles(data.files || []);
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setFileLoading(false);
    }
  }
  async function upload(file: File) {
    await perform(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const data = await api("upload", fd);
      setFiles((prev) => [data.file, ...prev]);
      notify("Le fichier a été ajouté à la bibliothèque.");
      if (requested) selectFile(data.file);
    });
  }
  function selectFile(file: FileRecord) {
    if (!requested) return;
    if (imageCallback.current) {
      if (!file.mime.startsWith("image/")) {
        setModalError("Choisis une image.");
        return;
      }
      imageCallback.current(file);
      imageCallback.current = null;
      setRequested(null);
      setModal(null);
      return;
    }
    if (requested === "cover" || requested === "icon") {
      if (!file.mime.startsWith("image/")) {
        setModalError("Choisis une image pour la couverture.");
        return;
      }
      updateDraft(
        requested === "cover"
          ? {
              cover_id: String(file.id),
              cover_attribution: file.attribution || null,
            }
          : {
              icon_id: String(file.id),
              icon_attribution: file.attribution || null,
            },
      );
      setRequested(null);
      setModal(null);
      return;
    }
    const ed = insertEditor.current;
    if (!ed) return;
    if (requested === "image" && !file.mime.startsWith("image/")) {
      setModalError("Choisis un fichier image.");
      return;
    }
    if (requested === "pdf" && file.mime !== "application/pdf") {
      setModalError("Choisis un document PDF.");
      return;
    }
    if (
      ["audio", "video"].includes(requested) &&
      !file.mime.startsWith(requested + "/")
    ) {
      setModalError(`Choisis un fichier ${requested}.`);
      return;
    }
    const node =
      requested === "image"
        ? {
            type: "image",
            attrs: {
              src: fileUrl(file.id),
              alt: file.name,
              title: file.name,
              fileId: String(file.id),
            },
          }
        : {
            type: "fileBlock",
            attrs: {
              fileId: String(file.id),
              name: file.name,
              mime: file.mime,
              size: file.size,
              mode: requested === "file" ? "download" : requested,
            },
          };
    ed.chain()
      .focus()
      .insertContent([node, { type: "paragraph" }])
      .run();
    setModal(null);
    setRequested(null);
  }
  function insertLink(e: React.FormEvent) {
    e.preventDefault();
    if (!insertEditor.current) return;
    if (safeLink(linkForm.href) === "#") {
      setModalError("Indique une adresse HTTP ou HTTPS valide.");
      return;
    }
    const type = requested === "buttonLink" ? "buttonLink" : "bookmark";
    const attrs =
      type === "buttonLink"
        ? {
            href: safeLink(linkForm.href),
            label: linkForm.title || "Ouvrir la ressource",
          }
        : {
            href: safeLink(linkForm.href),
            title: linkForm.title || linkForm.href,
            description: linkForm.description,
            source: linkForm.source,
          };
    insertEditor.current
      .chain()
      .focus()
      .insertContent([{ type, attrs }, { type: "paragraph" }])
      .run();
    setModal(null);
  }
  function insertPage(page: Page) {
    insertEditor.current
      ?.chain()
      .focus()
      .insertContent([
        {
          type: "pageLink",
          attrs: {
            pageId: String(page.id),
            label: titleOf(page),
            icon: page.icon,
          },
        },
        { type: "paragraph" },
      ])
      .run();
    setModal(null);
  }
  function chooseImage(
    purpose: ImagePurpose,
    onSelect?: (file: FileRecord) => void,
  ) {
    imageCallback.current = onSelect || null;
    void showFiles(purpose);
  }
  function showNotebookIcon() {
    setIconTarget("notebook");
    showModal("icon");
  }
  async function applyChosenIcon(
    value: string,
    file: FileRecord | null = null,
    target = iconTarget,
  ) {
    if (target === "notebook")
      await saveNotebook({
        ...notebook,
        icon: value,
        icon_id: file?.id || null,
      });
    else
      updateDraft({
        icon: value || "📄",
        icon_id: file?.id || null,
        icon_attribution: file?.attribution || null,
      });
    setModal(null);
  }
  function iconImageAction(
    action: "upload" | "library" | "internet" | "paste",
    file?: File,
  ) {
    const target = iconTarget;
    if (file) {
      void perform(async () => {
        const fd = new FormData();
        fd.append("file", file);
        const r = await api("upload", fd);
        await applyChosenIcon(
          target === "notebook"
            ? notebook.icon || "f."
            : draftRef.current?.icon || "📄",
          r.file,
          target,
        );
      });
      return;
    }
    chooseImage("icon", (stored) => {
      void perform(() =>
        applyChosenIcon(
          target === "notebook"
            ? notebook.icon || "f."
            : draftRef.current?.icon || "📄",
          stored,
          target,
        ),
      );
    });
    if (action === "internet") setImageTab("internet");
  }
  function renameFile(file: FileRecord, onRename?: (file: FileRecord) => void) {
    renameCallback.current = onRename || null;
    setRenaming(file);
    setNewFileName(file.name);
    showModal("rename-file");
  }
  async function submitRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renaming || !(await save())) return;
    await perform(async () => {
      const result = await api("rename_file", {
        id: renaming.id,
        name: newFileName,
      });
      setFiles((prev) =>
        prev.map((f) => (f.id === renaming.id ? result.file : f)),
      );
      await loadList();
      if (draftRef.current)
        await openPage(String(draftRef.current.id), true, true);
      renameCallback.current?.(result.file);
      renameCallback.current = null;
      setModal(null);
      notify("Le fichier a été renommé, y compris dans ses pages.");
    });
  }
  async function searchInternet(e: React.FormEvent) {
    e.preventDefault();
    setImageSearching(true);
    setModalError("");
    try {
      const result = await api("image_search", undefined, { q: imageQuery });
      setInternetImages(result.images || []);
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setImageSearching(false);
    }
  }
  async function importInternet(image: any) {
    await perform(async () => {
      const { file } = await api("image_import", { title: image.title });
      setFiles((prev) => [file, ...prev]);
      selectFile(file);
      notify("Image importée. Sa source et sa licence sont conservées.");
    });
  }
  async function saveSpace(e: React.FormEvent) {
    e.preventDefault();
    if (!(await save())) return;
    await perform(async () => {
      const result = await api("save_space", {
        ...spaceForm,
        id: spaceForm.id || undefined,
      });
      await loadList();
      if (result.id || result.space?.id)
        setActiveSpace(String(result.id || result.space.id));
      setModal(null);
      notify("Espace enregistré.");
    });
  }
  async function deleteSpace() {
    if (!spaceForm.id || !(await save())) return;
    await perform(async () => {
      await api("delete_space", { id: spaceForm.id });
      setActiveSpace("");
      await loadList();
      if (draftRef.current)
        await openPage(String(draftRef.current.id), true, true);
      setModal(null);
      notify("L’espace a été supprimé. Ses pages restent dans le carnet.");
    });
  }
  async function setAppearanceValues(patch: Partial<Appearance>) {
    if (appearanceScope === "page")
      updateDraft({
        appearance: { ...draftRef.current?.appearance, ...patch },
      });
    else {
      const next = { ...appearanceRef.current, ...patch };
      appearanceRef.current = next;
      setAppearance(next);
      appearanceSave.current = appearanceSave.current
        .catch(() => {})
        .then(() => api("settings", { appearance: next }));
      try {
        await appearanceSave.current;
      } catch (e) {
        notify((e as Error).message);
      }
    }
    if (patch.focus !== undefined) setFocus(patch.focus);
  }
  async function exportMarkdown() {
    if (!(await save()) || !draftRef.current) return;
    const a = document.createElement("a");
    a.href = `api.php?action=export_markdown&id=${encodeURIComponent(draftRef.current.id)}`;
    a.download = "";
    a.click();
    setMore(false);
  }
  async function downloadPdf() {
    if (!(await save()) || !draftRef.current) return;
    setMore(false);
    setBusy(true);
    try {
      const { exportPdf } = await import("./pdf-export");
      const generated = await exportPdf(
        draftRef.current,
        {
          ...appearanceRef.current,
          ...draftRef.current.appearance,
        },
        pages,
      );
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
      const url = URL.createObjectURL(generated.blob);
      pdfUrlRef.current = url;
      setPdfDownload({
        url,
        filename: generated.filename,
        size: generated.blob.size,
      });
      setModal("pdf-export");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importMarkdown(file: File) {
    if (!(await save())) return;
    await perform(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("space_id", activeSpace);
      const { page } = await api("import_markdown", fd);
      await loadList();
      await openPage(String(page.id));
      setModal(null);
      notify("Le document Markdown est devenu une page privée.");
    });
  }
  modalRef.current = modal;
  useEffect(() => {
    if (modal !== "files") return;
    const paste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.items || [])
        .find((x) => x.type.startsWith("image/"))
        ?.getAsFile();
      if (!file) return;
      e.preventDefault();
      void upload(file);
    };
    document.addEventListener("paste", paste);
    return () => document.removeEventListener("paste", paste);
  }, [modal, requested]);

  async function showHistory() {
    if (!(await save())) return;
    showModal("history");
    setFileLoading(true);
    try {
      const data = await api("history", undefined, {
        id: String(draftRef.current!.id),
      });
      setHistory(data.history || []);
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setFileLoading(false);
    }
  }
  async function restoreRevision(revision_id: string) {
    await perform(async () => {
      const p = draftRef.current!;
      const { page } = await api("restore_revision", {
        id: p.id,
        revision_id,
        version: p.version,
      });
      draftRef.current = { ...p, ...page };
      setDraft(draftRef.current);
      setEditorEpoch((n) => n + 1);
      dirtyRef.current = false;
      updateList(page);
      setModal(null);
      notify("Cette version a été restaurée dans le brouillon.");
    });
  }
  async function showSettings() {
    if (!(await save())) return;
    showModal("settings");
    try {
      setHealth(await api("health"));
    } catch (e) {
      setModalError((e as Error).message);
    }
  }
  useEffect(() => {
    document.title = draft
      ? `${titleOf(draft)} — ${session?.name || "Feuillet"}`
      : session?.name || "Feuillet";
    const title =
      document.querySelector<HTMLTextAreaElement>(".page-title-input");
    if (title) {
      title.style.height = "auto";
      title.style.height = title.scrollHeight + "px";
    }
  }, [draft?.title, draft?.id, session?.name]);
  useEffect(() => {
    const resizeTitle = () => {
      const title =
        document.querySelector<HTMLTextAreaElement>(".page-title-input");
      if (title) {
        title.style.height = "auto";
        title.style.height = title.scrollHeight + "px";
      }
    };
    window.addEventListener("resize", resizeTitle);
    return () => window.removeEventListener("resize", resizeTitle);
  }, []);
  useEffect(() => {
    if (!more) return;
    const close = (event: MouseEvent) => {
      if (!(event.target as Element).closest(".more-wrapper")) setMore(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMore(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [more]);
  useEffect(() => {
    if (!admin) return;
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [admin]);
  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearchResults(null);
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await api("search", undefined, { q: query });
        if (!cancelled) setSearchResults(response.pages || []);
      } catch (e) {
        if (!cancelled) {
          setSearchResults(null);
          notify((e as Error).message);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search]);
  const shownPages = (
    search.trim() && searchResults !== null ? searchResults : pages
  ).filter(
    (p) =>
      (search.trim() || String(p.space_id || "") === activeSpace) &&
      (!kind || p.category_id === kind) &&
      (!search.trim() ||
        searchResults !== null ||
        (titleOf(p) + " " + p.description + " " + (p.tags || []).join(" "))
          .toLocaleLowerCase("fr")
          .includes(search.toLocaleLowerCase("fr"))),
  );
  function renderPageRow(
    p: Page,
    depth = 0,
    ancestors: string[] = [],
    flat = false,
  ): ReactNode {
    if (ancestors.includes(String(p.id))) return null;
    const children = flat
      ? []
      : pages.filter((x) => String(x.parent_id) === String(p.id));
    const closed = collapsed.includes(String(p.id));
    return (
      <div key={p.id} className="tree-item">
        <div
          className={`page-row ${String(draft?.id) === String(p.id) ? "active" : ""}`}
          style={{ paddingLeft: 12 + depth * 15 }}
        >
          <button
            className={`tree-toggle ${!children.length ? "invisible" : ""}`}
            aria-label={
              closed ? "Déplier les sous-pages" : "Replier les sous-pages"
            }
            onClick={() =>
              setCollapsed(
                closed
                  ? collapsed.filter((x) => x !== String(p.id))
                  : [...collapsed, String(p.id)],
              )
            }
          >
            {closed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            className="page-row-main"
            onClick={() => void openPage(String(p.id))}
          >
            <span className="page-icon">
              <FeuilletIcon icon={p.icon} iconId={p.icon_id} size={18} />
            </span>
            <span>{titleOf(p)}</span>
          </button>
          {admin && (
            <button
              className="row-add"
              title="Ajouter une sous-page"
              onClick={() => void createPage(String(p.id))}
            >
              <Plus size={14} />
            </button>
          )}
          {admin && p.visibility === "private" && (
            <Lock className="row-lock" size={12} />
          )}
        </div>
        {!closed &&
          children.map((c) =>
            renderPageRow(c, depth + 1, [...ancestors, String(p.id)]),
          )}
      </div>
    );
  }
  const ancestors: Page[] = [];
  let parent = draft?.parent_id;
  while (parent && ancestors.length < 12) {
    const p = pages.find((p) => String(p.id) === String(parent));
    if (!p || ancestors.some((x) => x.id === p.id)) break;
    ancestors.unshift(p);
    parent = p.parent_id;
  }
  const childPages = pages.filter((p) => {
    let current = p.parent_id;
    const visited = new Set<string>();
    while (current && !visited.has(String(current))) {
      if (String(current) === String(draft?.id)) return true;
      visited.add(String(current));
      current =
        pages.find((item) => String(item.id) === String(current))?.parent_id ||
        null;
    }
    return false;
  });
  const effectiveAppearance = applyThemePreference(
    { ...appearance, ...draft?.appearance },
    themePreference,
  );
  const appearanceStyles = {
    ...themeStyle(effectiveAppearance),
    "--page-background": effectiveAppearance.background,
    "--page-text": effectiveAppearance.text,

    "--ink": effectiveAppearance.text,
  } as CSSProperties;
  const editAppearance =
    appearanceScope === "page"
      ? { ...appearance, ...draft?.appearance }
      : appearance;
  const inheritsPublic = !!(
    notebook.auto_publish_children &&
    draft?.parent_id &&
    pages.some(
      (p) =>
        String(p.id) === String(draft.parent_id) && p.visibility === "public",
    )
  );
  const hasPage = !!draft;
  if (loading)
    return (
      <div className="boot-screen">
        <span className="brand-symbol">f.</span>
        <Spinner />
        <p>Ouverture de ton carnet…</p>
      </div>
    );
  if (session?.installed === false)
    return (
      <div className="boot-screen">
        <span className="brand-symbol">f.</span>
        <h1>Bienvenue dans Feuillet</h1>
        <p>Quelques réglages suffisent pour ouvrir ton carnet.</p>
        <a className="primary-button" href="setup.php">
          Configurer mon espace <ArrowUpRight size={17} />
        </a>
      </div>
    );
  return (
    <AppContext.Provider
      value={{
        admin,
        pages,
        currentId: String(draft?.id || ""),
        openPage: (id) => void openPage(id),
        notify,
        createPage,
        chooseImage,
        renameFile,
        chooseDatabase,
        chooseForm,
        zoomImage: (src, alt) => setZoomedImage({ src, alt: alt || "Image" }),
      }}
    >
      <div
        style={themeStyle(displayAppearance)}
        data-theme={displayAppearance.mode || "light"}
        className={`app-shell ${focus ? "focus-mode" : ""} ${sidebarHidden ? "sidebar-collapsed" : ""} ${sidebar ? "sidebar-open" : ""} ${admin ? "admin-mode" : "public-mode"}`}
      >
        {sidebar && (
          <button
            className="sidebar-scrim"
            aria-label="Fermer la navigation"
            onClick={() => setSidebar(false)}
          />
        )}
        <aside
          className="sidebar"
          aria-label="Navigation des pages"
          inert={mobile ? !sidebar : sidebarHidden || focus}
        >
          <div className="workspace-heading">
            <button
              className="brand-icon-change"
              type="button"
              disabled={!admin}
              title="Changer l’icône du carnet"
              aria-label="Changer l’icône du carnet"
              onClick={showNotebookIcon}
            >
              <FeuilletIcon
                icon={notebook.icon || "f."}
                iconId={notebook.icon_id}
                size={36}
              />
            </button>
            <a
              href="index.php"
              className="workspace-name"
              onClick={(e) => {
                e.preventDefault();
                if (pages[0])
                  void openPage(
                    String((pages.find((p) => !p.parent_id) || pages[0]).id),
                  );
              }}
            >
              <span>
                {session?.name || "Feuillet"}
                <small>{notebook.subtitle}</small>
              </span>
            </a>
            <button
              className="sidebar-close icon-button"
              aria-label="Fermer le menu"
              onClick={() => setSidebar(false)}
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
          <div className="sidebar-search">
            {admin && (
              <button
                className="sidebar-toggle"
                type="button"
                aria-label="Masquer la navigation"
                title={`Masquer la navigation (${notebook.sidebar_shortcut ? "Ctrl/Cmd + Maj + " + notebook.sidebar_shortcut.split("+").at(-1) : "bouton uniquement"})`}
                onClick={toggleNavigation}
              >
                <PanelLeftClose size={17} />
              </button>
            )}
            <Search size={16} />
            <input
              aria-label="Rechercher une page"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searching && <LoaderCircle className="spin" size={13} />}{" "}
            {search && (
              <button
                aria-label="Effacer la recherche"
                onClick={() => setSearch("")}
              >
                <X size={13} />
              </button>
            )}
          </div>
          <div className="spaces-navigation">
            <div className="nav-label">
              <span>Espaces</span>
              {admin && (
                <button
                  title="Créer un espace"
                  onClick={() => {
                    setSpaceForm({ id: "", name: "", icon: "📚" });
                    showModal("space");
                  }}
                >
                  <Plus size={15} />
                </button>
              )}
            </div>
            <button
              className={`space-row ${!activeSpace ? "active" : ""}`}
              onClick={() => setActiveSpace("")}
            >
              <Folder size={15} />
              <span>Mon carnet</span>
            </button>
            {spaces.map((space) => (
              <div
                className={`space-row ${activeSpace === String(space.id) ? "active" : ""}`}
                key={space.id}
              >
                <button
                  onClick={() => {
                    setActiveSpace(String(space.id));
                    setSearch("");
                  }}
                >
                  <span>{space.icon}</span>
                  <span>{space.name}</span>
                </button>
                {admin && (
                  <button
                    className="space-edit"
                    title={`Modifier ${space.name}`}
                    onClick={() => {
                      setSpaceForm({
                        id: String(space.id),
                        name: space.name,
                        icon: space.icon,
                      });
                      showModal("space");
                    }}
                  >
                    <MoreHorizontal size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="category-filters-wrap">
            <div
              className="sidebar-filters"
              aria-label="Catégories de cet espace"
            >
              <button
                className={!kind ? "selected" : ""}
                onClick={() => setKind("")}
              >
                Tout
              </button>
              {categories
                .filter(
                  (c) =>
                    !c.deleted_at && String(c.space_id || "") === activeSpace,
                )
                .map((c) => (
                  <button
                    key={c.id}
                    className={kind === c.id ? "selected" : ""}
                    onClick={() => setKind(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              {admin && (
                <button
                  className="category-settings-button"
                  aria-label="Personnaliser les catégories de cet espace"
                  title="Personnaliser les catégories de cet espace"
                  onClick={() => showModal("categories")}
                >
                  <Settings size={14} />
                </button>
              )}
            </div>
          </div>
          <nav className="sidebar-navigation">
            {admin &&
              favorites.some((id) => pages.some((p) => String(p.id) === id)) &&
              !search &&
              !kind && (
                <div className="nav-section">
                  <div className="nav-label">
                    <Star size={12} /> Favoris
                  </div>
                  {pages
                    .filter((p) => favorites.includes(String(p.id)))
                    .map((p) => (
                      <button
                        key={p.id}
                        className={`favorite-row ${String(draft?.id) === String(p.id) ? "active" : ""}`}
                        onClick={() => void openPage(String(p.id))}
                      >
                        <span>
                          <FeuilletIcon
                            icon={p.icon}
                            iconId={p.icon_id}
                            size={18}
                          />
                        </span>
                        {titleOf(p)}
                      </button>
                    ))}
                </div>
              )}
            <div className="nav-section">
              <div className="nav-label">
                <span>
                  {search
                    ? "Résultats"
                    : kind
                      ? categories.find((c) => c.id === kind)?.name || "Pages"
                      : admin
                        ? "Pages de mon espace"
                        : "Ressources disponibles"}
                </span>
                {admin && (
                  <button
                    title="Nouvelle page"
                    onClick={() => void createPage()}
                  >
                    <Plus size={15} />
                  </button>
                )}
              </div>
              {search || kind
                ? shownPages.map((p) => renderPageRow(p, 0, [], true))
                : shownPages
                    .filter(
                      (p) =>
                        !p.parent_id ||
                        !pages.some(
                          (x) => String(x.id) === String(p.parent_id),
                        ),
                    )
                    .map((p) => renderPageRow(p))}
              {!shownPages.length && (
                <div className="empty-nav">
                  {search
                    ? searching
                      ? "Recherche…"
                      : "Aucune page trouvée."
                    : "Aucune page pour le moment."}
                </div>
              )}
              {admin && (
                <button
                  className="new-page-button"
                  disabled={busy}
                  onClick={() => void createPage()}
                >
                  <Plus size={16} /> Nouvelle page
                </button>
              )}
            </div>
          </nav>
          <div className="sidebar-bottom">
            {admin ? (
              <>
                <button onClick={() => void showFiles()}>
                  <Folder size={16} /> Bibliothèque
                </button>
                <button onClick={() => showModal("trash")}>
                  <Trash2 size={16} /> Corbeille{" "}
                  {trash.length > 0 && (
                    <span className="count">{trash.length}</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setDatabaseMode("manage");
                    dbCallback.current = null;
                    formCallback.current = null;
                    showModal("databases");
                  }}
                >
                  <TableIcon size={16} /> Bases de données
                </button>
                <button onClick={() => void showHomepage()}>
                  <Home size={16} /> Accueil visiteur
                </button>
                <button onClick={() => void showSettings()}>
                  <Settings size={16} /> Réglages & sauvegardes
                </button>
                <button onClick={() => void logout()}>
                  <LogOut size={16} /> Se déconnecter
                </button>
              </>
            ) : (
              <button onClick={() => showModal("login")}>
                <LogIn size={16} /> Espace enseignant
              </button>
            )}
            <div className="sidebar-footer">
              Feuillet <span>·</span> Un carnet ouvert
            </div>
          </div>
        </aside>
        <ThemeToggle
          mode={effectiveAppearance.mode}
          onChange={changeTheme}
          className="mobile-theme-control"
        />
        <main className="main-panel" style={appearanceStyles}>
          {focus && (
            <button
              className="focus-exit small-button"
              onClick={() => setFocus(false)}
            >
              <Minimize size={16} /> Quitter le plein écran
            </button>
          )}
          <header className="topbar">
            <nav className="breadcrumbs" aria-label="Fil d’Ariane">
              {admin && (sidebarHidden || focus) && !mobile && (
                <button
                  className="icon-button"
                  aria-label="Afficher la navigation"
                  title="Afficher la navigation"
                  onClick={toggleNavigation}
                >
                  <PanelLeftOpen size={19} />
                </button>
              )}
              <button
                className="mobile-menu icon-button"
                aria-label="Ouvrir la navigation"
                onClick={() => setSidebar(true)}
              >
                <Menu size={20} />
              </button>
              <button
                className="breadcrumb-home"
                onClick={() => {
                  setActiveSpace(String(draft?.space_id || ""));
                  const rootPage = ancestors[0];
                  if (rootPage) void openPage(String(rootPage.id));
                }}
              >
                {spaces.find((s) => String(s.id) === String(draft?.space_id))
                  ?.name || notebook.title}
              </button>
              <ChevronRight size={12} />
              {ancestors.map((p) => (
                <span className="breadcrumb-parent" key={p.id}>
                  <button onClick={() => void openPage(String(p.id))}>
                    <FeuilletIcon icon={p.icon} iconId={p.icon_id} size={15} />{" "}
                    {titleOf(p)}
                  </button>
                  <ChevronRight size={12} />
                </span>
              ))}
              <span className="breadcrumb-current">
                <FeuilletIcon
                  icon={draft?.icon || "📚"}
                  iconId={draft?.icon_id}
                  size={16}
                />{" "}
                {draft ? titleOf(draft) : "Ton espace"}
              </span>
            </nav>
            {admin && hasPage && (
              <div className="topbar-actions">
                <ThemeToggle
                  mode={effectiveAppearance.mode}
                  onChange={changeTheme}
                  className="desktop-theme-control"
                />
                <span className={`save-state state-${saveStatus}`}>
                  {saveStatus === "saving" ? (
                    <Spinner />
                  ) : saveStatus === "saved" ? (
                    <Check size={14} />
                  ) : saveStatus === "dirty" ? (
                    <Cloud size={14} />
                  ) : (
                    <AlertCircle size={14} />
                  )}
                  <span>
                    {saveStatus === "saving"
                      ? "Enregistrement…"
                      : saveStatus === "saved"
                        ? "Enregistré"
                        : saveStatus === "dirty"
                          ? "Modifications…"
                          : saveStatus === "conflict"
                            ? "Conflit de version"
                            : "Non enregistré"}
                  </span>
                </span>
                <button
                  className="icon-button favorite-button"
                  title={
                    favorites.includes(String(draft.id))
                      ? "Retirer des favoris"
                      : "Ajouter aux favoris"
                  }
                  aria-pressed={favorites.includes(String(draft.id))}
                  onClick={() => toggleFavorite(String(draft.id))}
                >
                  <Star
                    size={17}
                    fill={
                      favorites.includes(String(draft.id))
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
                <button
                  className={`publish-button ${draft.visibility === "public" ? "is-public" : ""}`}
                  disabled={busy || saveStatus === "conflict"}
                  onClick={() => showModal("publish")}
                >
                  {draft.visibility === "public" ? (
                    <Globe size={15} />
                  ) : (
                    <Lock size={15} />
                  )}
                  <span>
                    {draft.visibility === "public"
                      ? draft.has_unpublished_changes
                        ? "Mettre à jour"
                        : "Publiée"
                      : "Publier"}
                  </span>
                </button>
                <div className="more-wrapper">
                  <button
                    className="icon-button"
                    title="Actions sur la page"
                    aria-expanded={more}
                    onClick={() => setMore(!more)}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                  {more && (
                    <>
                      <button
                        className="menu-dismiss"
                        aria-label="Fermer les actions"
                        onClick={() => setMore(false)}
                      />
                      <div className="dropdown page-dropdown">
                        <small>Cette page</small>
                        <button onClick={() => void duplicate()}>
                          <Copy />
                          Dupliquer
                        </button>
                        <button
                          onClick={() => {
                            setMoveParent(draft.parent_id || "");
                            setMoveSpace(draft.space_id || "");
                            showModal("move");
                          }}
                        >
                          <Move />
                          Déplacer
                        </button>
                        <button onClick={() => void showHistory()}>
                          <History />
                          Historique
                        </button>
                        <button
                          onClick={() => {
                            setAppearanceScope("page");
                            showModal("appearance");
                          }}
                        >
                          <Palette /> Apparence de cette page
                        </button>
                        <button
                          onClick={() => {
                            setFocus(true);
                            setMore(false);
                          }}
                        >
                          <Maximize /> Plein écran
                        </button>
                        <button onClick={() => void exportMarkdown()}>
                          <Download /> Exporter en Markdown
                        </button>
                        <button
                          onClick={() => void downloadPdf()}
                          disabled={busy}
                        >
                          <Download /> Télécharger le PDF
                        </button>
                        <button onClick={() => showModal("metadata")}>
                          <Settings />
                          Propriétés
                        </button>
                        {draft.visibility === "public" && (
                          <>
                            <a
                              href={`${pageUrl(draft.slug || draft.id)}&read=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink />
                              Version publiée
                            </a>
                            <button
                              onClick={() => {
                                void navigator.clipboard
                                  ?.writeText(
                                    new URL(
                                      pageUrl(draft.slug || draft.id),
                                      location.href,
                                    ).href,
                                  )
                                  .then(() =>
                                    notify("Le lien public a été copié."),
                                  )
                                  .catch(() =>
                                    notify(
                                      "Copie le lien dans la barre d’adresse.",
                                    ),
                                  );
                                setMore(false);
                              }}
                            >
                              <LinkIcon />
                              Copier le lien public
                            </button>
                            <button
                              disabled={inheritsPublic}
                              title={
                                inheritsPublic
                                  ? "Cette page hérite de l’accès public de son parent."
                                  : undefined
                              }
                              onClick={() => void unpublish()}
                            >
                              <Lock />
                              Rendre privée
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => void createPage(String(draft.id))}
                        >
                          <Plus />
                          Ajouter une sous-page
                        </button>
                        <button
                          className="danger"
                          onClick={() => showModal("delete")}
                        >
                          <Trash2 />
                          Mettre à la corbeille
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            {!admin && hasPage && (
              <div className="reader-actions">
                <button
                  className="small-button"
                  onClick={() => void downloadPdf()}
                  disabled={busy}
                >
                  <Download size={15} /> PDF
                </button>
                <a
                  className="reading-link"
                  href={`${pageUrl(draft.slug || draft.id)}&read=1`}
                >
                  <BookOpen size={15} />
                  <span>Lecture simple</span>
                </a>
              </div>
            )}
          </header>
          {(saveStatus === "error" || saveStatus === "conflict") && (
            <div className="save-error" role="alert">
              <AlertCircle size={18} />
              <div>
                <strong>
                  {saveStatus === "conflict"
                    ? "Une version plus récente existe. Ton brouillon reste affiché ici."
                    : "Les modifications ne sont pas enregistrées."}
                </strong>
                <span>{saveError}</span>
              </div>
              {saveStatus === "conflict" ? (
                <>
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(draft, null, 2)], {
                        type: "application/json",
                      });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = "brouillon-feuillet.json";
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                    }}
                  >
                    Sauver une copie
                  </button>
                  <button onClick={() => showModal("reload")}>Recharger</button>
                </>
              ) : (
                <button onClick={() => void save()}>Réessayer</button>
              )}
            </div>
          )}
          {fatal && (
            <div className="fatal-notice">
              <AlertCircle size={23} />
              <p>{fatal}</p>
              <button
                className="small-button"
                onClick={() => {
                  setFatal("");
                  if (pages[0]) void openPage(String(pages[0].id));
                }}
              >
                Ouvrir les ressources
              </button>
            </div>
          )}
          {pageLoading ? (
            <div className="page-loading">
              <Spinner /> Ouverture de la page…
            </div>
          ) : draft ? (
            <article
              className={`course-page page-font-${effectiveAppearance.font} ${effectiveAppearance.width === "wide" ? "page-wide" : ""} ${draft.cover_id ? "has-cover" : ""}`}
            >
              <div
                className={`cover ${draft.cover_id ? "with-image" : "no-cover"}`}
              >
                {draft.cover_id && (
                  <CoverTools
                    id={draft.cover_id}
                    onDone={() => void save()}
                    position={draft.cover_position || { x: 50, y: 50 }}
                    admin={admin}
                    onPosition={(cover_position) =>
                      updateDraft({ cover_position })
                    }
                    onChoose={() => chooseImage("cover")}
                    onRemove={() => updateDraft({ cover_id: null })}
                    onZoom={() =>
                      setZoomedImage({
                        src: fileUrl(draft.cover_id!),
                        alt: "Couverture de la page",
                      })
                    }
                  />
                )}
              </div>
              <div className="page-body">
                <div className="page-icon-heading">
                  {admin ? (
                    <button
                      className="large-page-icon"
                      title="Changer l’icône"
                      onClick={() => {
                        setIconTarget("page");
                        showModal("icon");
                      }}
                    >
                      <FeuilletIcon
                        icon={draft.icon}
                        iconId={draft.icon_id}
                        size={62}
                      />
                    </button>
                  ) : (
                    <span className="large-page-icon">
                      <FeuilletIcon
                        icon={draft.icon}
                        iconId={draft.icon_id}
                        size={62}
                      />
                    </span>
                  )}
                </div>
                {admin && (
                  <div className="page-decorations">
                    <button
                      onClick={() => {
                        setIconTarget("page");
                        showModal("icon");
                      }}
                    >
                      Changer l’icône
                    </button>
                    {!draft.cover_id && (
                      <button onClick={() => chooseImage("cover")}>
                        <ImageIcon size={13} /> Ajouter une couverture
                      </button>
                    )}
                  </div>
                )}
                {admin ? (
                  <textarea
                    className="page-title-input"
                    aria-label="Titre de la page"
                    placeholder="Sans titre"
                    rows={1}
                    value={draft.title === "Sans titre" ? "" : draft.title}
                    onChange={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                      updateDraft({ title: e.target.value });
                    }}
                    onBlur={() => {
                      if (!draftRef.current?.title)
                        updateDraft({ title: "Sans titre" });
                    }}
                  />
                ) : (
                  <h1 className="page-title">{titleOf(draft)}</h1>
                )}
                {(draft.cover_attribution || draft.icon_attribution) && (
                  <div className="page-media-credits">
                    <MediaCredit
                      credit={draft.cover_attribution}
                      label="Couverture"
                    />
                    <MediaCredit
                      credit={draft.icon_attribution}
                      label="Icône"
                    />
                  </div>
                )}
                {(draft.description || (admin && draft.kind !== "page")) &&
                  (admin ? (
                    <textarea
                      className="page-description-input"
                      aria-label="Description"
                      placeholder="Une description pour cette ressource…"
                      value={draft.description || ""}
                      onChange={(e) =>
                        updateDraft({ description: e.target.value })
                      }
                    />
                  ) : (
                    <p className="page-description">{draft.description}</p>
                  ))}
                {draft.kind === "article" && draft.source_url && (
                  <a
                    className="article-source"
                    href={safeLink(draft.source_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen size={15} />
                    {draft.source_name || "Lire l’article original"}
                    <ExternalLink size={14} />
                  </a>
                )}
                {(draft.tags || []).length > 0 && (
                  <div className="page-tags">
                    {draft.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}
                {admin && (
                  <div className="page-visibility">
                    <span className={`visibility-badge ${draft.visibility}`}>
                      {draft.visibility === "public" ? (
                        <Globe size={12} />
                      ) : (
                        <Lock size={12} />
                      )}{" "}
                      {draft.visibility === "public"
                        ? "Page publique"
                        : "Page privée"}
                    </span>
                    {draft.visibility === "public" &&
                      notebook.auto_publish !== false && (
                        <span className="draft-badge">
                          Synchronisation automatique
                        </span>
                      )}
                    {draft.visibility === "public" &&
                      draft.has_unpublished_changes && (
                        <span className="draft-badge">
                          Brouillon modifié · à publier
                        </span>
                      )}
                  </div>
                )}
                <CourseEditor
                  key={`${draft.id}-${admin ? "edit" : "read"}-${editorEpoch}`}
                  content={draft.content || emptyDoc}
                  admin={admin}
                  onChange={(content) => updateDraft({ content })}
                  onRequest={(kind, editor) => void request(kind, editor)}
                  onReady={(editor) => {
                    editorRef.current = editor;
                  }}
                />
                {pages.some(
                  (p) => String(p.parent_id) === String(draft.id),
                ) && (
                  <section className="subpages-section">
                    <h3>Dans cette page</h3>
                    {pages
                      .filter((p) => String(p.parent_id) === String(draft.id))
                      .map((p) => (
                        <a
                          key={p.id}
                          href={pageUrl(p.id)}
                          onClick={(e) => {
                            e.preventDefault();
                            void openPage(String(p.id));
                          }}
                        >
                          <span>
                            <FeuilletIcon
                              icon={p.icon}
                              iconId={p.icon_id}
                              size={18}
                            />
                          </span>
                          <strong>{titleOf(p)}</strong>
                          <ArrowUpRight size={17} />
                        </a>
                      ))}
                  </section>
                )}
                <footer className="page-footer">
                  <span>{session?.name || "Feuillet"}</span>
                  <span>
                    {admin
                      ? "Ton travail s’enregistre automatiquement."
                      : "Cours, découvertes et ressources à partager."}
                  </span>
                </footer>
              </div>
            </article>
          ) : (
            <div className="empty-space">
              <span className="empty-symbol">🌱</span>
              <h1>
                {admin
                  ? "Tout commence par une page."
                  : "Bienvenue dans cet espace de cours."}
              </h1>
              <p>
                {admin
                  ? "Tes cours, tes idées et les ressources à partager trouveront leur place ici."
                  : "Les ressources seront disponibles ici dès leur publication."}
              </p>
              {admin && (
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() => void createPage()}
                >
                  <Plus size={17} /> Créer ma première page
                </button>
              )}
            </div>
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button title="Fermer" onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {modal === "space" && (
        <Modal
          title={spaceForm.id ? "Modifier l’espace" : "Créer un espace"}
          onClose={() => setModal(null)}
        >
          <form className="modal-form" onSubmit={saveSpace}>
            <label>
              Nom de l’espace
              <input
                required
                value={spaceForm.name}
                maxLength={100}
                onChange={(e) =>
                  setSpaceForm({ ...spaceForm, name: e.target.value })
                }
              />
            </label>
            <label>
              Icône (emoji)
              <input
                value={spaceForm.icon}
                maxLength={16}
                onChange={(e) =>
                  setSpaceForm({ ...spaceForm, icon: e.target.value })
                }
              />
            </label>
            {modalError && (
              <p role="alert" className="form-error">
                {modalError}
              </p>
            )}
            <div className="modal-actions">
              {spaceForm.id && (
                <button
                  type="button"
                  className="danger-button"
                  disabled={busy}
                  onClick={() => void deleteSpace()}
                >
                  Supprimer l’espace
                </button>
              )}
              <button className="primary-button" disabled={busy}>
                Enregistrer
              </button>
            </div>
            {spaceForm.id && (
              <p className="muted">
                Supprimer un espace conserve ses pages dans « Mon carnet ».
              </p>
            )}
          </form>
        </Modal>
      )}
      {modal === "rename-file" && renaming && (
        <Modal title="Renommer le fichier" onClose={() => setModal(null)}>
          <form className="modal-form" onSubmit={submitRename}>
            <label>
              Nom du fichier
              <input
                required
                value={newFileName}
                maxLength={255}
                onChange={(e) => setNewFileName(e.target.value)}
              />
            </label>
            <p className="muted">
              Le contenu et les liens du fichier restent identiques. Le nouveau
              nom apparaîtra aussi dans ses pages.
            </p>
            {modalError && <p className="form-error">{modalError}</p>}
            <button className="primary-button" disabled={busy}>
              {busy ? <Spinner /> : <Check size={16} />} Enregistrer le nom
            </button>
          </form>
        </Modal>
      )}
      {modal === "appearance" && (
        <Modal
          title={
            appearanceScope === "global"
              ? "Apparence générale"
              : "Apparence de cette page"
          }
          onClose={() => setModal(null)}
        >
          <div className="modal-form">
            <p className="muted">
              {appearanceScope === "global"
                ? "Ces réglages s’appliquent à toutes les pages, sauf celles personnalisées individuellement."
                : "Ces choix remplacent les réglages généraux pour cette page."}
            </p>
            <label>
              Police
              <select
                value={editAppearance.font}
                onChange={(e) =>
                  void setAppearanceValues({
                    font: e.target.value as Appearance["font"],
                  })
                }
              >
                <option value="sans">Sans empattements</option>
                <option value="serif">Avec empattements</option>
                <option value="mono">Monospace</option>
                <option value="quicksand">Quicksand</option>
                <option value="fraunces">Fraunces</option>
              </select>
            </label>
            <ThemeControls
              value={editAppearance}
              onChange={(patch) => void setAppearanceValues(patch)}
              onReset={() =>
                void setAppearanceValues({
                  mode: "light",
                  background: "#ffffff",
                  text: "#37352f",
                  accent: "#38795d",
                })
              }
            />
            <div className="appearance-colors">
              <label>
                Fond
                <input
                  type="color"
                  value={editAppearance.background}
                  onChange={(e) =>
                    void setAppearanceValues({ background: e.target.value })
                  }
                />
              </label>
              <label>
                Texte
                <input
                  type="color"
                  value={editAppearance.text}
                  onChange={(e) =>
                    void setAppearanceValues({ text: e.target.value })
                  }
                />
              </label>
              <label>
                Accent
                <input
                  type="color"
                  value={editAppearance.accent}
                  onChange={(e) =>
                    void setAppearanceValues({ accent: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Largeur de lecture
              <select
                value={editAppearance.width}
                onChange={(e) =>
                  void setAppearanceValues({
                    width: e.target.value as Appearance["width"],
                  })
                }
              >
                <option value="normal">Confortable</option>
                <option value="wide">Large</option>
              </select>
            </label>
            <label className="appearance-checkbox">
              <input
                type="checkbox"
                checked={editAppearance.focus}
                onChange={(e) =>
                  void setAppearanceValues({ focus: e.target.checked })
                }
              />{" "}
              Ouvrir en mode plein écran
            </label>
            {appearanceScope === "page" && (
              <button
                className="small-button"
                onClick={() => {
                  updateDraft({ appearance: {} });
                  setFocus(appearance.focus);
                }}
              >
                Revenir aux réglages généraux
              </button>
            )}
            <button
              className="primary-button"
              onClick={async () => {
                try {
                  await appearanceSave.current;
                } catch {
                  return;
                }
                if (await save()) setModal(null);
              }}
            >
              Terminer
            </button>
          </div>
        </Modal>
      )}

      {modal === "pdf-export" && pdfDownload && (
        <Modal title="Ton PDF est prêt" onClose={() => setModal(null)}>
          <div className="modal-form">
            <p>
              {pdfDownload.filename} · {sizeLabel(pdfDownload.size)}
            </p>
            <a
              className="primary-button"
              href={pdfDownload.url}
              download={pdfDownload.filename}
            >
              <Download size={17} /> Enregistrer le PDF
            </a>
            <p className="muted">
              Le document contient le texte, les images et les références de
              cette page. Les activités interactives restent disponibles en
              ligne.
            </p>
          </div>
        </Modal>
      )}

      <ImageLightbox image={zoomedImage} onClose={() => setZoomedImage(null)} />
      {modal === "categories" && (
        <Modal title="Catégories de cet espace" onClose={() => setModal(null)}>
          <CategoriesEditor
            categories={categories}
            spaceId={activeSpace}
            spaceName={
              spaces.find((s) => s.id === activeSpace)?.name || notebook.title
            }
            onRefresh={async () => {
              await loadList();
            }}
          />
        </Modal>
      )}
      {modal === "databases" && (
        <div className="modal-backdrop">
          <div className="database-modal">
            <DatabaseManager
              mode={databaseMode}
              onClose={() => setModal(null)}
              onChooseDatabase={(id) => {
                dbCallback.current?.(id);
                setModal(null);
              }}
              onChooseForm={(id) => {
                formCallback.current?.(id);
                setModal(null);
              }}
            />
          </div>
        </div>
      )}
      {modal === "login" && (
        <Modal title="Ouvrir mon carnet" onClose={() => setModal(null)}>
          <form className="modal-form" onSubmit={login}>
            <p>Connecte-toi pour rédiger et publier tes ressources.</p>
            <label>
              Mot de passe
              <input
                type="password"
                required
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </label>
            {modalError && (
              <p role="alert" className="form-error">
                {modalError}
              </p>
            )}
            <button className="primary-button" disabled={busy}>
              {busy ? <Spinner /> : <LogIn size={17} />} Se connecter
            </button>
          </form>
        </Modal>
      )}
      {modal === "publish" && draft && (
        <Modal
          title={
            draft.visibility === "public"
              ? "Publication de la page"
              : "Partager cette page avec tes élèves"
          }
          onClose={() => setModal(null)}
        >
          <div className="modal-form">
            <p>
              <strong>{titleOf(draft)}</strong>
              {draft.visibility === "public"
                ? notebook.auto_publish !== false
                  ? " est accessible publiquement. Chaque modification enregistrée est automatiquement visible aux visiteurs."
                  : " est accessible publiquement. Les modifications du brouillon restent privées jusqu’à leur publication."
                : " sera accessible à toute personne disposant de son lien, sans connexion."}
            </p>
            <div className="publication-notice">
              <Globe size={19} />
              <span>
                Les images, PDF et médias utilisés dans la version publiée
                deviennent également accessibles. Toutes ses sous-pages
                actuelles seront publiées également. Les fichiers de ces pages
                deviendront accessibles.
              </span>
            </div>
            {!!childPages.length && (
              <details>
                <summary>
                  {childPages.length} sous-page
                  {childPages.length > 1 ? "s" : ""} concernée
                  {childPages.length > 1 ? "s" : ""}
                </summary>
                <ul>
                  {childPages.map((p) => (
                    <li key={p.id}>
                      <FeuilletIcon
                        icon={p.icon}
                        iconId={p.icon_id}
                        size={15}
                      />{" "}
                      {titleOf(p)}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <p className="muted">
              {notebook.auto_publish_children
                ? "Les futures sous-pages héritent automatiquement de l’accès public de leur parent."
                : "Les sous-pages ajoutées plus tard restent privées jusqu’à leur publication."}{" "}
              Rendre cette page privée retire aussi ses sous-pages de la
              consultation publique.
            </p>
            {draft.visibility === "public" && (
              <a
                className="public-url"
                href={`${pageUrl(draft.slug || draft.id)}&read=1`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={15} /> Ouvrir la version publiée
              </a>
            )}
            {inheritsPublic && (
              <p className="muted">
                Cette page hérite de l’accès public de son parent. Pour la
                rendre privée, désactive l’héritage dans les réglages ou rends
                son parent privé.
              </p>
            )}
            <div className="modal-actions">
              {draft.visibility === "public" && (
                <button
                  className="small-button"
                  disabled={busy || inheritsPublic}
                  onClick={() => void unpublish()}
                >
                  <Lock size={14} /> Rendre privée
                </button>
              )}
              <button
                className="primary-button"
                disabled={busy || saveStatus === "conflict"}
                onClick={() => void publish()}
              >
                {busy ? <Spinner /> : <Globe size={15} />}{" "}
                {draft.visibility === "public"
                  ? "Publier le brouillon"
                  : "Publier cette page"}
              </button>
            </div>
            {modalError && <p className="form-error">{modalError}</p>}
          </div>
        </Modal>
      )}
      {modal === "icon" && (
        <Modal
          title={
            iconTarget === "notebook"
              ? "L’icône du carnet"
              : "L’icône de la page"
          }
          onClose={() => setModal(null)}
        >
          <IconPicker
            value={{
              emoji:
                iconTarget === "notebook"
                  ? notebook.icon || "f."
                  : draft?.icon || "📄",
              webIcon: (iconTarget === "notebook"
                ? notebook.icon
                : draft?.icon
              )?.startsWith("lucide:")
                ? iconTarget === "notebook"
                  ? notebook.icon!
                  : draft!.icon
                : null,
              iconId:
                iconTarget === "notebook"
                  ? notebook.icon_id || null
                  : draft?.icon_id || null,
            }}
            busy={busy}
            onEmoji={(value) => void perform(() => applyChosenIcon(value))}
            onWebIcon={(value) => void perform(() => applyChosenIcon(value))}
            onImage={iconImageAction}
            onRemove={() =>
              void perform(() =>
                applyChosenIcon(iconTarget === "notebook" ? "f." : "📄"),
              )
            }
          />
          {modalError && (
            <p role="alert" className="form-error">
              {modalError}
            </p>
          )}
        </Modal>
      )}
      {modal === "files" && (
        <Modal
          title={
            requested === "cover"
              ? "Choisir une couverture"
              : requested === "icon"
                ? "Choisir une icône"
                : requested
                  ? "Insérer une ressource"
                  : "Bibliothèque de fichiers"
          }
          wide
          onClose={() => {
            setModal(null);
            setRequested(null);
          }}
        >
          <div className="file-library">
            {(requested === "icon" ||
              requested === "cover" ||
              requested === "image") && (
              <>
                <div className="picker-tabs">
                  <button
                    className={imageTab === "files" ? "selected" : ""}
                    onClick={() => setImageTab("files")}
                  >
                    Mes images
                  </button>
                  <button
                    className={imageTab === "internet" ? "selected" : ""}
                    onClick={() => setImageTab("internet")}
                  >
                    Rechercher sur Internet
                  </button>
                </div>
                <p className="muted">
                  Tu peux aussi coller une image depuis le presse-papiers.
                </p>
              </>
            )}
            {imageTab === "internet" && (
              <div className="internet-picker">
                <form onSubmit={searchInternet} className="internet-search">
                  <input
                    required
                    aria-label="Rechercher une image sur Wikimedia Commons"
                    placeholder="Un sujet, un objet, un paysage…"
                    value={imageQuery}
                    onChange={(e) => setImageQuery(e.target.value)}
                  />
                  <button className="primary-button" disabled={imageSearching}>
                    {imageSearching ? <Spinner /> : <Search size={16} />}{" "}
                    Rechercher
                  </button>
                </form>
                <p className="muted">
                  Images libres de Wikimedia Commons. La source, l’auteur et la
                  licence accompagnent le fichier importé.
                </p>
                <div className="internet-results">
                  {internetImages.map((image) => (
                    <div className="internet-result" key={image.title}>
                      <button
                        disabled={busy}
                        onClick={() => void importInternet(image)}
                      >
                        <img src={image.thumb} alt={image.title} />
                        <strong>{image.title.replace(/^File:/, "")}</strong>
                        <small>{image.license || "Voir la licence"}</small>
                      </button>
                      <a
                        href={safeLink(image.source_url || image.source)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Source et licence ↗
                      </a>
                    </div>
                  ))}
                </div>
                {!imageSearching && !internetImages.length && (
                  <p className="empty-list">
                    Lance une recherche pour trouver une image.
                  </p>
                )}
              </div>
            )}
            <div hidden={imageTab !== "files"}>
              <label
                className={`upload-drop ${busy ? "uploading" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!busy && e.dataTransfer.files[0])
                    void upload(e.dataTransfer.files[0]);
                }}
              >
                {busy ? <Spinner /> : <Upload size={25} />}
                <strong>
                  {busy ? "Envoi en cours…" : "Ajouter un fichier"}
                </strong>
                <span>Dépose un fichier ici ou clique pour le choisir.</span>
                <input
                  type="file"
                  disabled={busy}
                  aria-label="Ajouter un fichier"
                  accept={
                    requested === "cover" ||
                    requested === "icon" ||
                    requested === "image"
                      ? "image/*"
                      : requested === "pdf"
                        ? "application/pdf"
                        : requested === "audio"
                          ? "audio/*"
                          : requested === "video"
                            ? "video/*"
                            : undefined
                  }
                  onChange={(e) => {
                    if (e.target.files?.[0]) void upload(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {modalError && (
                <p className="form-error" role="alert">
                  {modalError}
                </p>
              )}
              <div className="library-search">
                <Search size={17} />
                <input
                  aria-label="Rechercher un fichier"
                  placeholder="Rechercher dans les fichiers…"
                  value={fileQuery}
                  onChange={(e) => setFileQuery(e.target.value)}
                />
              </div>
              {fileLoading ? (
                <div className="loading-row">
                  <Spinner /> Chargement des fichiers…
                </div>
              ) : (
                <div className="library-list">
                  {files
                    .filter((f) => {
                      if (
                        !f.name.toLowerCase().includes(fileQuery.toLowerCase())
                      )
                        return false;
                      if (["cover", "icon", "image"].includes(requested || ""))
                        return f.mime.startsWith("image/");
                      if (requested === "pdf")
                        return f.mime === "application/pdf";
                      if (requested === "audio")
                        return f.mime.startsWith("audio/");
                      if (requested === "video")
                        return f.mime.startsWith("video/");
                      return true;
                    })
                    .map((file) => (
                      <div className="library-file" key={file.id}>
                        {file.mime.startsWith("image/") ? (
                          <img src={fileUrl(file.id)} alt="" />
                        ) : (
                          <div className="file-type-icon">
                            {file.mime.startsWith("audio/") ? (
                              <Music />
                            ) : file.mime.startsWith("video/") ? (
                              <Video />
                            ) : (
                              <FileText />
                            )}
                          </div>
                        )}
                        <div className="library-file-name">
                          <strong>{file.name}</strong>
                          <MediaCredit credit={file.attribution} />
                          <small>
                            {sizeLabel(file.size)} · {file.mime}
                          </small>
                        </div>
                        <MediaUsage
                          id={file.id}
                          name={file.name}
                          onOpenPage={async (id) => {
                            if (await save()) {
                              setModal(null);
                              void openPage(id);
                            }
                          }}
                        />
                        <button
                          className="icon-button"
                          title={`Renommer ${file.name}`}
                          onClick={() => renameFile(file)}
                        >
                          <Pencil size={15} />
                        </button>
                        {requested ? (
                          <button
                            className="small-button"
                            disabled={busy}
                            onClick={() => selectFile(file)}
                          >
                            Choisir
                          </button>
                        ) : (
                          <a
                            href={fileUrl(file.id, true)}
                            className="icon-button"
                            title="Télécharger"
                          >
                            <Download size={17} />
                          </a>
                        )}
                      </div>
                    ))}
                  {!files.length && (
                    <div className="empty-list">
                      Tes fichiers apparaîtront ici après leur premier ajout.
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="library-note">
              <ShieldCheck size={14} /> Les fichiers sont accessibles aux élèves
              via une page ou une base publiée, ou comme icône du carnet.
            </p>
          </div>
        </Modal>
      )}
      {(modal === "bookmark" || modal === "buttonLink") && (
        <Modal
          title={
            modal === "bookmark"
              ? "Ajouter un article ou un lien"
              : "Ajouter un bouton"
          }
          onClose={() => setModal(null)}
        >
          <form className="modal-form" onSubmit={insertLink}>
            <label>
              Adresse du lien
              <input
                type="url"
                required
                placeholder="https://…"
                value={linkForm.href}
                onChange={(e) =>
                  setLinkForm({ ...linkForm, href: e.target.value })
                }
              />
            </label>
            <label>
              {modal === "buttonLink" ? "Texte du bouton" : "Titre"}
              <input
                required
                value={linkForm.title}
                onChange={(e) =>
                  setLinkForm({ ...linkForm, title: e.target.value })
                }
              />
            </label>
            {modal === "bookmark" && (
              <>
                <label>
                  Ton commentaire
                  <textarea
                    placeholder="Pourquoi lire cette ressource ?"
                    value={linkForm.description}
                    onChange={(e) =>
                      setLinkForm({ ...linkForm, description: e.target.value })
                    }
                  />
                </label>
                <label>
                  Source ou média
                  <input
                    value={linkForm.source}
                    onChange={(e) =>
                      setLinkForm({ ...linkForm, source: e.target.value })
                    }
                  />
                </label>
              </>
            )}
            {modalError && <p className="form-error">{modalError}</p>}
            <button className="primary-button">Insérer dans la page</button>
          </form>
        </Modal>
      )}
      {modal === "pageLink" && (
        <Modal
          title="Lier une page de ton espace"
          onClose={() => setModal(null)}
        >
          <div className="modal-page-list">
            {pages
              .filter((p) => String(p.id) !== String(draft?.id))
              .map((p) => (
                <button key={p.id} onClick={() => insertPage(p)}>
                  <span>
                    <FeuilletIcon icon={p.icon} iconId={p.icon_id} size={18} />
                  </span>
                  <strong>{titleOf(p)}</strong>
                  <ChevronRight size={16} />
                </button>
              ))}
            {pages.length < 2 && (
              <p>Crée une autre page pour ajouter un lien vers elle.</p>
            )}
          </div>
        </Modal>
      )}
      {modal === "metadata" && draft && (
        <Modal title="Propriétés de la page" onClose={() => setModal(null)}>
          <div className="modal-form">
            <label>
              Catégorie de cette page
              <select
                aria-label="Catégorie de cette page"
                value={draft.category_id || ""}
                onChange={(e) =>
                  updateDraft({ category_id: e.target.value || null })
                }
              >
                <option value="">Sans catégorie</option>
                {categories
                  .filter(
                    (c) =>
                      !c.deleted_at &&
                      String(c.space_id || "") === String(draft.space_id || ""),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                {draft.category_id &&
                  !categories.some(
                    (c) => c.id === draft.category_id && !c.deleted_at,
                  ) && (
                    <option value={draft.category_id}>Catégorie retirée</option>
                  )}
              </select>
            </label>
            <label>
              Type de ressource
              <select
                value={draft.kind}
                onChange={(e) =>
                  updateDraft({ kind: e.target.value as Page["kind"] })
                }
              >
                <option value="page">Page</option>
                <option value="class">Classe</option>
                <option value="article">Article</option>
              </select>
            </label>
            <label>
              Description
              <textarea
                value={draft.description || ""}
                onChange={(e) => updateDraft({ description: e.target.value })}
              />
            </label>
            <label>
              Étiquettes (séparées par des virgules)
              <input
                defaultValue={(draft.tags || []).join(", ")}
                onBlur={(e) =>
                  updateDraft({
                    tags: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            {draft.kind === "article" && (
              <>
                <label>
                  Adresse de l’article
                  <input
                    type="url"
                    value={draft.source_url || ""}
                    onChange={(e) =>
                      updateDraft({ source_url: e.target.value })
                    }
                  />
                </label>
                <label>
                  Nom du média
                  <input
                    value={draft.source_name || ""}
                    onChange={(e) =>
                      updateDraft({ source_name: e.target.value })
                    }
                  />
                </label>
              </>
            )}
            <p className="muted">
              Ces informations permettent d’organiser les galeries et la
              recherche. La page conserve une adresse stable quand tu changes
              son titre.
            </p>
            <button
              className="primary-button"
              onClick={() => {
                void save();
                setModal(null);
              }}
            >
              Terminer
            </button>
          </div>
        </Modal>
      )}
      {modal === "move" && draft && (
        <Modal title="Déplacer la page" onClose={() => setModal(null)}>
          <div className="modal-form">
            <label>
              Espace
              <select
                value={moveSpace}
                onChange={(e) => {
                  setMoveSpace(e.target.value);
                  setMoveParent("");
                }}
              >
                <option value="">Mon carnet</option>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.icon} {space.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Placer dans
              <select
                value={moveParent}
                onChange={(e) => setMoveParent(e.target.value)}
              >
                <option value="">Racine de mon espace</option>
                {pages
                  .filter(
                    (p) =>
                      String(p.id) !== String(draft.id) &&
                      String(p.space_id || "") === moveSpace,
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      <FeuilletIcon
                        icon={p.icon}
                        iconId={p.icon_id}
                        size={15}
                      />{" "}
                      {titleOf(p)}
                    </option>
                  ))}
              </select>
            </label>
            <p className="muted">Les sous-pages suivent leur page parente.</p>
            {modalError && <p className="form-error">{modalError}</p>}
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void move()}
            >
              {busy ? <Spinner /> : <Move size={17} />} Déplacer
            </button>
          </div>
        </Modal>
      )}
      {modal === "delete" && draft && (
        <Modal
          title="Placer cette page dans la corbeille ?"
          onClose={() => setModal(null)}
        >
          <div className="modal-form">
            <p>
              <strong>{titleOf(draft)}</strong> et ses sous-pages seront
              retirées de l’espace public. Tu pourras les restaurer depuis la
              corbeille.
            </p>
            <div className="modal-actions">
              <button className="small-button" onClick={() => setModal(null)}>
                Annuler
              </button>
              <button
                className="danger-button"
                disabled={busy}
                onClick={() => void remove()}
              >
                Mettre à la corbeille
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modal === "reload" && (
        <Modal
          title="Recharger la version du serveur ?"
          onClose={() => setModal(null)}
        >
          <div className="modal-form">
            <p>
              Les modifications locales non enregistrées seront remplacées.
              Utilise « Sauver une copie » avant de recharger si tu souhaites
              les conserver.
            </p>
            <div className="modal-actions">
              <button className="small-button" onClick={() => setModal(null)}>
                Annuler
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  dirtyRef.current = false;
                  setModal(null);
                  void openPage(String(draftRef.current?.id), true, true);
                }}
              >
                Recharger
              </button>
            </div>
          </div>
        </Modal>
      )}
      {modal === "trash" && (
        <Modal title="Corbeille" onClose={() => setModal(null)}>
          <div className="modal-list">
            {trash.map((p) => (
              <div key={p.id}>
                <span>
                  <FeuilletIcon icon={p.icon} iconId={p.icon_id} size={18} />
                </span>
                <strong>{titleOf(p)}</strong>
                <button
                  className="small-button"
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      await api("restore", { id: p.id });
                      await loadList();
                      notify("La page a été restaurée en privé.");
                    })
                  }
                >
                  <RefreshCw size={14} /> Restaurer
                </button>
              </div>
            ))}
            {!trash.length && (
              <p className="empty-list">La corbeille est vide.</p>
            )}
            <p className="muted">
              Une page restaurée sous un parent public suit l’héritage lorsqu’il
              est activé. Les autres pages restaurées restent privées.
            </p>
          </div>
        </Modal>
      )}
      {modal === "history" && (
        <Modal title="Historique de cette page" onClose={() => setModal(null)}>
          <div className="modal-list">
            {fileLoading ? (
              <Spinner />
            ) : (
              history.map((rev) => (
                <div key={rev.id}>
                  <History size={19} />
                  <span className="history-info">
                    <strong>{rev.title}</strong>
                    <small>
                      {new Date(
                        rev.created_at.includes("T")
                          ? rev.created_at
                          : rev.created_at.replace(" ", "T"),
                      ).toLocaleString("fr-FR")}{" "}
                      · version {rev.version}
                    </small>
                  </span>
                  <button
                    className="small-button"
                    disabled={busy}
                    onClick={() => void restoreRevision(String(rev.id))}
                  >
                    Restaurer
                  </button>
                </div>
              ))
            )}
            {!fileLoading && !history.length && (
              <p className="empty-list">
                Les versions enregistrées apparaîtront ici.
              </p>
            )}
            {modalError && <p className="form-error">{modalError}</p>}
            <p className="muted">
              {notebook.auto_publish !== false
                ? "Sur une page publique, la restauration sera immédiatement visible aux visiteurs."
                : "La restauration modifie le brouillon. Elle ne remplace pas la version publique."}
            </p>
          </div>
        </Modal>
      )}
      {modal === "homepage" && (
        <Modal title="Accueil visiteur" onClose={() => setModal(null)}>
          <HomepageControls
            value={homepage}
            pages={pages}
            onChange={setHomepage}
            onEdit={editHomepage}
          />
        </Modal>
      )}
      {modal === "settings" && (
        <Modal title="Réglages & sauvegardes" onClose={() => setModal(null)}>
          <div className="modal-form">
            <HomepageControls
              value={homepage}
              pages={pages}
              onChange={setHomepage}
              onEdit={editHomepage}
            />
            <NotebookControls
              value={notebook}
              serverLimit={serverLimit}
              onSave={saveNotebook}
            />
            <button
              className="small-button"
              onClick={() => {
                setAppearanceScope("global");
                showModal("appearance");
              }}
            >
              <Palette size={17} /> Apparence générale du carnet
            </button>
            <div className="settings-card">
              <FileText size={25} />
              <div>
                <h3>Importer un document Markdown</h3>
                <p>
                  Un fichier .md devient une page privée dans l’espace actif.
                </p>
                <label className="small-button import-button">
                  Choisir un fichier .md
                  <input
                    type="file"
                    accept=".md,.markdown,text/markdown,text/plain"
                    disabled={busy}
                    onChange={(e) => {
                      if (e.target.files?.[0])
                        void importMarkdown(e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="settings-card">
              <Download size={25} />
              <div>
                <h3>Emporter mon carnet</h3>
                <p>
                  Une archive avec tes pages, leur version HTML et les pièces
                  jointes.
                </p>
                <a className="primary-button" href="api.php?action=export">
                  Télécharger la sauvegarde
                </a>
              </div>
            </div>
            <div className="settings-card">
              <Upload size={25} />
              <div>
                <h3>Restaurer une sauvegarde</h3>
                <p>
                  Les pages de l’archive sont importées en privé. Conserve une
                  sauvegarde de ton espace avant l’import.
                </p>
                <label className="small-button import-button">
                  {busy ? "Import en cours…" : "Choisir une archive ZIP"}
                  <input
                    type="file"
                    accept=".zip,application/zip"
                    disabled={busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file)
                        void perform(async () => {
                          const fd = new FormData();
                          fd.append("file", file);
                          const result = await api("import", fd);
                          await loadList();
                          notify(
                            result.message || "La sauvegarde a été importée.",
                          );
                        });
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            {health && (
              <div className="health-grid">
                <span>
                  PHP <strong>{health.php}</strong>
                </span>
                <span>
                  Base <strong>{health.driver}</strong>
                </span>
                <span>
                  Envoi maximal{" "}
                  <strong>
                    {typeof health.upload_limit === "number"
                      ? sizeLabel(health.upload_limit)
                      : health.upload_limit}
                  </strong>
                </span>
                <span>
                  Stockage{" "}
                  <strong>
                    {health.storage_writable ? "Accessible" : "À vérifier"}
                  </strong>
                </span>
              </div>
            )}
            {modalError && <p className="form-error">{modalError}</p>}
            <p className="muted">
              Feuillet · logiciel libre. Interface avec le cœur libre de Tiptap,
              sans abonnement.
            </p>
          </div>
        </Modal>
      )}
    </AppContext.Provider>
  );
}
function LinkIcon() {
  return <ExternalLink size={16} />;
}
