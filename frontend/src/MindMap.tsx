import {
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useId,
} from "react";
import {
  Search,
  X,
  ArrowUpRight,
  Plus,
  GitBranch,
  Copy,
  ClipboardPaste,
  Trash2,
} from "lucide-react";
import { IdeaMediaEditor, IdeaMediaView } from "./MindMapAttachments";
import {
  copyIdeas,
  encodeIdeas,
  decodeIdeas,
  pasteIdeas,
  deleteIdeas,
  type IdeaClipboard,
} from "./mind-map-clipboard";
let localIdeaClipboard: IdeaClipboard | null = null;
import { importMindMap } from "./mind-map-import";
import { MindMapOptions } from "./MindMapOptions";
import { MindMapNode } from "./MindMapNode";
import {
  touchFrame,
  touchCamera,
  type TouchPoint,
  type TouchView,
} from "./mind-map-touch";
import { useMindMapPresence } from "./mind-map-motion";
import {
  wordLines,
  nodeHeight,
  nodeWidth,
  linkPath,
  branchColor,
  underlined,
  contrast,
} from "./mind-map-geometry";
import { createPortal } from "react-dom";
import {
  startMap,
  type Bubble,
  type MapData,
  colors,
  switchLayout,
  switchTheme,
  defaultFolds,
  visibleMapNodes,
  canParent,
  childIdea,
  setChildSide,
  appendChildRows,
  type ChildSide,
  independentIdea,
  freeIdeaPoint,
  redistribute,
  redistributeAround,
  reparentIdea,
  zoomAt,
} from "./mind-map-model";
export { makeMap, arrange } from "./mind-map-model";
export type { MapData, Bubble } from "./mind-map-model";
type Gesture = {
  kind: "pan" | "node" | "wire";
  id: string;
  x: number;
  y: number;
  ox: number;
  oy: number;
  moved: boolean;
  origins?: Record<string, { x: number; y: number }>;
};
export function MindMap({
  data,
  onChange,
}: {
  data: MapData;
  onChange?: (d: MapData) => void;
}) {
  return data.nodes.length ? (
    <MindMapCanvas data={data} onChange={onChange} />
  ) : (
    <MindMapStart data={data} onChange={onChange} />
  );
}
function MindMapStart({
  data,
  onChange,
}: {
  data: MapData;
  onChange?: (d: MapData) => void;
}) {
  const [title, setTitle] = useState(data.title || "");
  const titleId = useId();
  return (
    <section
      className="mind-map mm-start"
      aria-label="Nouvelle carte mentale"
      contentEditable={false}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <span className="mm-start-orbit" aria-hidden="true">
        <GitBranch size={30} />
      </span>
      {onChange ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) onChange(startMap(data, title));
          }}
        >
          <span className="mm-eyebrow">Tout commence par une idée</span>
          <h3>Quel sujet veux-tu explorer ?</h3>
          <p>Le titre de ta carte deviendra sa première idée centrale.</p>
          <label htmlFor={titleId}>
            Titre de la carte mentale
            <input
              id={titleId}
              aria-label="Titre de la nouvelle carte mentale"
              value={title}
              maxLength={200}
              placeholder="Une idée, un projet, une question…"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <button type="submit" disabled={!title.trim()}>
            <Plus size={18} /> Créer l’idée centrale
          </button>
        </form>
      ) : (
        <>
          <h3>Cette carte attend sa première idée</h3>
          <p>Elle sera disponible lorsque son auteur l’aura commencée.</p>
        </>
      )}
    </section>
  );
}
function MindMapCanvas({
  data,
  onChange,
}: {
  data: MapData;
  onChange?: (d: MapData) => void;
}) {
  const [redistributeOpen, setRedistributeOpen] = useState(false);
  const [centreCandidate, setCentreCandidate] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false),
    [sectionId, setSectionId] = useState(""),
    [reparentOpen, setReparentOpen] = useState(false),
    [pendingImport, setPendingImport] = useState<MapData | null>(null);
  const importInput = useRef<HTMLInputElement>(null),
    sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!sectionId && !pendingImport && !reparentOpen) return;
    const prior = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      const dialogs = sectionRef.current?.querySelectorAll<HTMLElement>(
        ".mm-dialog,.mm-section-dialog",
      );
      dialogs?.[dialogs.length - 1]
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (prior?.isConnected) prior.focus({ preventScroll: true });
    };
  }, [sectionId, pendingImport, reparentOpen]);
  const mapId = useId().replace(/:/g, "");
  const [styleOpen, setStyleOpen] = useState(false),
    [folds, setFolds] = useState<Record<string, string[]>>({});
  const theme = data.theme || "cards";
  const collapsed = folds[theme] ?? defaultFolds(data);
  const visibleData = visibleMapNodes(data, collapsed);
  const toggleFold = (id: string) =>
    setFolds((previous) => ({
      ...previous,
      [theme]: collapsed.includes(id)
        ? collapsed.filter((n) => n !== id)
        : [...collapsed, id],
    }));
  const height = (n: Bubble) => nodeHeight(n, data.theme);
  const width = nodeWidth(data.theme);
  const [editField, setEditField] = useState<"text" | "note">("text");
  const [batchOpen, setBatchOpen] = useState(false),
    [batchText, setBatchText] = useState("");
  const [full, setFull] = useState(false),
    [selection, setPrimarySelection] = useState(
      onChange ? data.nodes[0].id : "",
    ),
    [search, setSearch] = useState(""),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [message, setMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    onChange ? [data.nodes[0].id] : [],
  );
  const setSelection = (id: string) => {
    setPrimarySelection(id);
    setSelectedIds(id ? [id] : []);
  };
  const selectNode = (id: string, extend = false) => {
    if (!extend) {
      setSelection(id);
      return;
    }
    const ids = selectedIds.includes(id)
      ? selectedIds.filter((v) => v !== id)
      : [...selectedIds, id];
    setSelectedIds(ids);
    setPrimarySelection(ids.includes(id) ? id : ids.at(-1) || "");
    setMessage(
      `${ids.length} idée${ids.length > 1 ? "s" : ""} sélectionnée${ids.length > 1 ? "s" : ""}. Maj + clic pour ajuster.`,
    );
  };
  const [createMenu, setCreateMenu] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const openCreateMenu = (id: string, element: Element) => {
    const rect = element.getBoundingClientRect();
    setContext(null);
    setCreateMenu({
      id,
      x: Math.max(12, Math.min(innerWidth - 320, rect.left - 140)),
      y: Math.max(12, Math.min(innerHeight - 210, rect.bottom + 12)),
    });
  };
  useEffect(() => {
    if (!createMenu) return;
    const outside = (event: PointerEvent) => {
      if (!createMenuRef.current?.contains(event.target as Node))
        setCreateMenu(null);
    };
    const frame = requestAnimationFrame(() =>
      createMenuRef.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus({ preventScroll: true }),
    );
    document.addEventListener("pointerdown", outside, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", outside, true);
    };
  }, [createMenu]);
  useEffect(() => setCreateMenu(null), [full, redistributeOpen]);
  const [editing, setEditing] = useState(""),
    [draft, setDraft] = useState(""),
    [inspector, setInspector] = useState(true),
    [relation, setRelation] = useState(false),
    [active, setActive] = useState(false),
    [target, setTarget] = useState(""),
    [wire, setWire] = useState<{ from: string; x: number; y: number } | null>(
      null,
    );
  const board = useRef<HTMLDivElement>(null),
    gesture = useRef<Gesture | null>(null),
    latest = useRef(data);
  const [context, setContext] = useState<{
    x: number;
    y: number;
    id: string;
    world?: { x: number; y: number };
  } | null>(null);
  const [connectionPulse, setConnectionPulse] = useState("");
  useEffect(() => {
    if (!connectionPulse) return;
    const timer = window.setTimeout(() => setConnectionPulse(""), 400);
    return () => clearTimeout(timer);
  }, [connectionPulse]);
  const menuRef = useRef<HTMLDivElement>(null);
  const restoreNodeFocus = () =>
    board.current
      ?.querySelector<SVGGElement>(`[data-mm-id="${selection}"]`)
      ?.focus({ preventScroll: true });
  useEffect(() => {
    if (!context) return;
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setContext(null);
    };
    const frame = requestAnimationFrame(() =>
      menuRef.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus({ preventScroll: true }),
    );
    document.addEventListener("pointerdown", outside, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      cancelAnimationFrame(frame);
    };
  }, [context]);
  useEffect(() => setContext(null), [full]);
  latest.current = data;
  const past = useRef<MapData[]>([]),
    future = useRef<MapData[]>([]),
    lastEdit = useRef({ kind: "", time: 0 }),
    [historyTick, setHistoryTick] = useState(0);
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >(() => Object.fromEntries(data.nodes.map((n) => [n.id, n])));
  const visual = useRef(positions);
  visual.current = positions;
  const selected =
      data.nodes.find((n) => n.id === selection) ||
      (onChange ? data.nodes[0] : undefined),
    matches = data.nodes.filter(
      (n) =>
        search.trim() &&
        [n.text, n.note || "", n.content || ""]
          .join(" ")
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()),
    );
  useEffect(() => {
    if (onChange && selection && !data.nodes.some((n) => n.id === selection))
      setSelection(data.nodes[0].id);
  }, [data.nodes, selection, !!onChange]);
  const revealPath = (id: string) => {
    const path = new Set<string>();
    while (id && !path.has(id)) {
      path.add(id);
      id = latest.current.nodes.find((n) => n.id === id)?.parent || "";
    }
    setFolds((previous) => ({
      ...previous,
      [theme]: collapsed.filter((id) => !path.has(id)),
    }));
  };
  const commit = (next: MapData, kind = "action") => {
    if (!onChange) return;
    const now = Date.now();
    if (
      kind === "action" ||
      lastEdit.current.kind !== kind ||
      now - lastEdit.current.time > 700
    ) {
      past.current = [
        ...past.current.slice(-39),
        structuredClone(latest.current),
      ];
    }
    future.current = [];
    lastEdit.current = { kind, time: now };
    latest.current = next;
    onChange(next);
    setHistoryTick((t) => t + 1);
  };
  const undo = () => {
    const previous = past.current.pop();
    if (!previous) return;
    future.current.push(structuredClone(latest.current));
    latest.current = previous;
    onChange?.(previous);
    setEditing("");
    setMessage("Modification annulée.");
    setHistoryTick((t) => t + 1);
    lastEdit.current.kind = "";
  };
  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(structuredClone(latest.current));
    latest.current = next;
    onChange?.(next);
    setMessage("Modification rétablie.");
    setHistoryTick((t) => t + 1);
    lastEdit.current.kind = "";
  };
  const camera = useRef({ pan, zoom }),
    cameraFrame = useRef(0);
  const frameAfterChange = useRef<string | null>(null);
  camera.current = { pan, zoom };
  const mousePoint = useRef<{ x: number; y: number } | null>(null);
  const readerTouches = useRef(new Map<number, TouchPoint>());
  const touchStart = useRef<{
    view: TouchView;
    frame: ReturnType<typeof touchFrame>;
  } | null>(null);
  const suppressTouchClick = useRef(0);
  const rebaseTouches = () => {
    touchStart.current = readerTouches.current.size
      ? {
          view: structuredClone(camera.current),
          frame: touchFrame([...readerTouches.current.values()]),
        }
      : null;
  };
  const touchPosition = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const startReaderTouch = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      onChange ||
      event.pointerType !== "touch" ||
      (event.target as Element).closest("button,input,textarea,select,a")
    )
      return;
    event.stopPropagation();
    cancelAnimationFrame(cameraFrame.current);
    gesture.current = null;
    readerTouches.current.set(event.pointerId, touchPosition(event));
    rebaseTouches();
    if (readerTouches.current.size > 1)
      suppressTouchClick.current = Date.now() + 500;
  };
  const moveReaderTouch = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!readerTouches.current.has(event.pointerId)) return;
    event.stopPropagation();
    readerTouches.current.set(event.pointerId, touchPosition(event));
    const start = touchStart.current;
    if (!start) return;
    const frame = touchFrame([...readerTouches.current.values()]);
    if (
      Math.hypot(frame.x - start.frame.x, frame.y - start.frame.y) > 5 ||
      Math.abs(frame.distance - start.frame.distance) > 5
    ) {
      suppressTouchClick.current = Date.now() + 500;
      setActive(true);
    }
    const next = touchCamera(start.view, start.frame, frame);
    camera.current = next;
    setZoom(next.zoom);
    setPan(next.pan);
  };
  const endReaderTouch = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!readerTouches.current.delete(event.pointerId)) return;
    event.stopPropagation();
    rebaseTouches();
    if (!readerTouches.current.size) setActive(false);
  };
  useEffect(() => {
    readerTouches.current.clear();
    touchStart.current = null;
    setActive(false);
  }, [full]);

  const moveCamera = (
    next: { pan: { x: number; y: number }; zoom: number },
    animate = true,
  ) => {
    cancelAnimationFrame(cameraFrame.current);
    if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPan(next.pan);
      setZoom(next.zoom);
      return;
    }
    const start = camera.current,
      at = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - at) / 360),
        ease = 1 - Math.pow(1 - t, 3);
      setPan({
        x: start.pan.x + (next.pan.x - start.pan.x) * ease,
        y: start.pan.y + (next.pan.y - start.pan.y) * ease,
      });
      setZoom(start.zoom + (next.zoom - start.zoom) * ease);
      if (t < 1) cameraFrame.current = requestAnimationFrame(step);
    };
    cameraFrame.current = requestAnimationFrame(step);
  };
  useEffect(() => () => cancelAnimationFrame(cameraFrame.current), []);
  const zoomFromPointer = (factor: number) => {
    const el = board.current;
    if (!el) return;
    const at = mousePoint.current || {
      x: el.clientWidth / 2,
      y: el.clientHeight / 2,
    };
    cancelAnimationFrame(cameraFrame.current);
    const next = zoomAt(camera.current.pan, camera.current.zoom, at, factor);
    camera.current = next;
    setZoom(next.zoom);
    setPan(next.pan);
  };
  useEffect(() => {
    const el = board.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      mousePoint.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      zoomFromPointer(Math.exp(-event.deltaY * 0.0015));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [full, data.display]);
  const fit = (animate = true, focusId?: string) => {
    if (focusId === "*") focusId = undefined;
    const anchor =
      !focusId && data.centerId
        ? data.nodes.find((n) => n.id === data.centerId)
        : undefined;
    if (anchor && board.current) {
      const el = board.current;
      const rx = Math.max(
          ...visibleData.map((n) => Math.abs(n.x - anchor.x) + width / 2 + 50),
        ),
        ry = Math.max(
          ...visibleData.map(
            (n) => Math.abs(n.y - anchor.y) + height(n) / 2 + 70,
          ),
        );
      const z = Math.max(
        0.03,
        Math.min(
          1.15,
          (el.clientWidth - 60) / (2 * rx),
          (el.clientHeight - 60) / (2 * ry),
        ),
      );
      moveCamera(
        {
          zoom: z,
          pan: {
            x: el.clientWidth / 2 - anchor.x * z,
            y: el.clientHeight / 2 - anchor.y * z,
          },
        },
        animate,
      );
      return;
    }

    const el = board.current;
    if (!el) return;
    const ids = new Set(focusId ? [focusId] : visibleData.map((n) => n.id));
    if (focusId)
      for (let i = 0; i < data.nodes.length; i++)
        for (const n of data.nodes) if (ids.has(n.parent)) ids.add(n.id);
    const framed = visibleData.filter((n) => ids.has(n.id));
    if (!framed.length) return;
    const left = Math.min(...framed.map((n) => n.x)) - 175,
      top = Math.min(...framed.map((n) => n.y - height(n) / 2)) - 35,
      right = Math.max(...framed.map((n) => n.x)) + 175,
      bottom = Math.max(...framed.map((n) => n.y + height(n) / 2)) + 65;
    const z = Math.max(
      0.03,
      Math.min(
        1.15,
        (el.clientWidth - 60) / (right - left),
        (el.clientHeight - 60) / (bottom - top),
      ),
    );
    moveCamera(
      {
        zoom: z,
        pan: {
          x: el.clientWidth / 2 - ((left + right) / 2) * z,
          y: el.clientHeight / 2 - ((top + bottom) / 2) * z,
        },
      },
      animate,
    );
  };
  useEffect(() => {
    const id = requestAnimationFrame(() => fit(false));
    return () => cancelAnimationFrame(id);
  }, [full]);
  useEffect(() => {
    fit();
  }, [data.layout, data.theme]);
  useEffect(() => {
    if (!frameAfterChange.current) return;
    const id = frameAfterChange.current;
    frameAfterChange.current = null;
    const frame = requestAnimationFrame(() => fit(true, id));
    return () => cancelAnimationFrame(frame);
  }, [data.nodes]);
  useEffect(() => {
    const destination = Object.fromEntries(
      data.nodes.map((n) => [n.id, { x: n.x, y: n.y }]),
    );
    const start = visual.current;
    const changed = data.nodes.some(
      (n) => start[n.id] && (start[n.id].x !== n.x || start[n.id].y !== n.y),
    );
    if (
      !changed ||
      editing ||
      gesture.current ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setPositions(destination);
      return;
    }
    let frame = 0;
    const at = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - at) / 360),
        ease = 1 - Math.pow(1 - t, 3);
      setPositions(
        Object.fromEntries(
          data.nodes.map((n) => {
            const from = start[n.id] || n;
            return [
              n.id,
              {
                x: from.x + (n.x - from.x) * ease,
                y: from.y + (n.y - from.y) * ease,
              },
            ];
          }),
        ),
      );
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [data.nodes, editing]);
  useEffect(() => {
    if (!full) return;
    const prior = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => board.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = overflow;
      prior?.focus?.({ preventScroll: true });
    };
  }, [full]);
  const editInput = useRef<HTMLTextAreaElement>(null);
  const mountEditInput = useCallback((el: HTMLTextAreaElement | null) => {
    editInput.current = el;
    if (el) {
      el.focus({ preventScroll: true });
      el.select();
    }
  }, []);
  useEffect(() => {
    if (!editing) return;
    const frame = requestAnimationFrame(() => {
      editInput.current?.focus({ preventScroll: true });
      editInput.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [editing, full]);
  const beginEdit = (n: Bubble, field: "text" | "note" = "text") => {
    if (!onChange) return;
    setSelection(n.id);
    setEditField(field);
    setDraft(n[field] || "");
    cancelAnimationFrame(cameraFrame.current);
    setEditing(n.id);
    const z = zoom < 0.45 ? 0.85 : zoom,
      el = board.current;
    const sx = pan.x + n.x * z,
      sy = pan.y + n.y * z;
    if (
      zoom < 0.45 ||
      (el &&
        (sx < (width / 2) * z + 35 ||
          sx > el.clientWidth - (width / 2) * z - 35 ||
          sy < (height(n) / 2) * z + 35 ||
          sy > el.clientHeight - (height(n) / 2) * z - 75))
    )
      moveCamera(
        {
          zoom: z,
          pan: {
            x: (el?.clientWidth || 800) / 2 - n.x * z,
            y: (el?.clientHeight || 450) / 2 - n.y * z,
          },
        },
        false,
      );
  };
  const finishEdit = () => {
    if (!editing) return;
    commit(
      {
        ...latest.current,
        nodes: latest.current.nodes.map((n) =>
          n.id === editing
            ? {
                ...n,
                [editField]:
                  draft.trim() || (editField === "text" ? "Nouvelle idée" : ""),
              }
            : n,
        ),
      },
      "text:" + editing,
    );
    setEditing("");
  };
  const addIndependent = (at?: { x: number; y: number }) => {
    finishEdit();
    const r = board.current;
    const origin = at || {
      x: ((r?.clientWidth || 800) / 2 - pan.x) / zoom,
      y: ((r?.clientHeight || 500) / 2 - pan.y) / zoom,
    };
    const node = independentIdea(
      latest.current,
      at ? origin : freeIdeaPoint(latest.current, origin),
    );
    if (!node) {
      setMessage("300 idées maximum par carte.");
      return;
    }
    commit({ ...latest.current, nodes: [...latest.current.nodes, node] });
    setContext(null);
    setCreateMenu(null);
    beginEdit(node);
    setMessage("Idée indépendante créée. Écris son texte, puis clique hors de la bulle.");
  };
  const add = (
    parentId = selection || data.nodes[0].id,
    point?: { x: number; y: number },
    side?: ChildSide,
  ) => {
    finishEdit();
    revealPath(parentId);
    const parent = latest.current.nodes.find((n) => n.id === parentId)!;
    const direction =
      side ||
      (point ? "auto" : parent.childrenSide === "above" ? "above" : "below");
    const base = latest.current;
    const n = childIdea(base, parentId, point, direction);
    if (!n) {
      setMessage("300 idées maximum par carte.");
      return;
    }
    const next = { ...base, nodes: [...base.nodes, n] };
    commit(next);
    beginEdit(n);
    setCreateMenu(null);
    setContext(null);
    setMessage(
      `Sous-idée ajoutée ${direction === "above" ? "au-dessus" : direction === "below" ? "en dessous" : "au point de dépôt"}. Entrée ajoute une ligne · clique dehors pour valider.`,
    );
  };
  const addBatch = () => {
    if (!selected || !batchText.trim()) return;
    finishEdit();
    const next = appendChildRows(
      latest.current,
      selection,
      batchText.split(/\r?\n/),
      selected.childrenSide === "above" ? "above" : "below",
    );
    const count = next.nodes.length - latest.current.nodes.length;
    if (!count) {
      setMessage("300 idées maximum par carte.");
      return;
    }
    frameAfterChange.current = selection;
    commit(next);
    revealPath(selection);
    setBatchText("");
    setBatchOpen(false);
    setMessage(
      `${count} sous-idées ajoutées. Annuler permet de retirer tout le groupe.`,
    );
  };
  const update = (patch: Partial<Bubble>) =>
    commit(
      {
        ...latest.current,
        nodes: latest.current.nodes.map((n) =>
          n.id === selection ? { ...n, ...patch } : n,
        ),
      },
      "style:" + selection,
    );
  const remove = () => {
    if (!selectedIds.length) return;
    const next = deleteIdeas(latest.current, selectedIds);
    commit(next);
    setSelection(next.nodes[0].id);
    setContext(null);
    setMessage(
      `${selectedIds.length} idée${selectedIds.length > 1 ? "s supprimées" : " supprimée"}. Les sous-idées non sélectionnées sont conservées. Annuler : Ctrl / Cmd + Z.`,
    );
    requestAnimationFrame(() => board.current?.focus({ preventScroll: true }));
  };
  const copySelection = () => {
    if (!selectedIds.length) return null;
    localIdeaClipboard = copyIdeas(latest.current, selectedIds);
    setMessage(
      `${localIdeaClipboard.nodes.length} idée(s) copiée(s). Coller crée des copies indépendantes.`,
    );
    return localIdeaClipboard;
  };
  const pasteSelection = (
    clip: IdeaClipboard,
    at?: { x: number; y: number },
  ) => {
    const el = board.current;
    const origin = at || {
      x: ((el?.clientWidth || 800) / 2 - pan.x) / zoom,
      y: ((el?.clientHeight || 500) / 2 - pan.y) / zoom,
    };
    const result = pasteIdeas(latest.current, clip, origin);
    if (!result) {
      setMessage("Impossible de coller : 300 idées maximum par carte.");
      return;
    }
    commit(result.data);
    setSelectedIds(result.ids);
    setPrimarySelection(result.ids.at(-1)!);
    setContext(null);
    setCreateMenu(null);
    setMessage(
      `${result.ids.length} idée(s) collée(s), indépendantes des originales.`,
    );
    requestAnimationFrame(() => {
      board.current?.focus({ preventScroll: true });
      fit(true);
    });
  };
  const copyFromMenu = async () => {
    const clip = copySelection();
    if (!clip) return;
    try {
      await navigator.clipboard.writeText(encodeIdeas(clip));
    } catch {
      setMessage(
        "Copie disponible dans Feuillet. Pour le presse-papiers système, utilise Ctrl / Cmd + C sur la carte.",
      );
    }
    setContext(null);
    restoreNodeFocus();
  };
  const pasteFromMenu = async () => {
    const at = context?.world;
    let clip: IdeaClipboard | null = null;
    try {
      clip = decodeIdeas(await navigator.clipboard.readText());
    } catch {
      clip = localIdeaClipboard;
    }
    if (clip) pasteSelection(clip, at);
    else
      setMessage(
        "Copie d’abord des idées dans une carte mentale, puis colle-les ici.",
      );
  };
  const focus = (n: Bubble) => {
    const ancestors = new Set<string>();
    let parent = n.parent;
    while (parent) {
      ancestors.add(parent);
      parent = data.nodes.find((p) => p.id === parent)?.parent || "";
    }
    setFolds((previous) => ({
      ...previous,
      [theme]: collapsed.filter((id) => !ancestors.has(id)),
    }));
    setSelection(n.id);
    const readingZoom =
      !onChange && board.current && board.current.clientWidth <= 760
        ? Math.max(
            zoom,
            Math.min(1.15, (board.current.clientWidth - 56) / width),
          )
        : zoom;
    moveCamera({
      zoom: readingZoom,
      pan: {
        x: (board.current?.clientWidth || 800) / 2 - n.x * readingZoom,
        y: (board.current?.clientHeight || 450) / 2 - n.y * readingZoom,
      },
    });
  };
  const point = (x: number, y: number) => {
    const r = board.current!.getBoundingClientRect();
    return { x: (x - r.left - pan.x) / zoom, y: (y - r.top - pan.y) / zoom };
  };
  const connect = (from: string, to: string, cross: boolean) => {
    if (from === to) return;
    if (cross) {
      if (
        data.links.some(
          (l) =>
            (l.from === from && l.to === to) ||
            (l.from === to && l.to === from),
        )
      ) {
        setMessage("Ces idées sont déjà reliées.");
        return;
      }
      if (data.links.length >= 600) {
        setMessage("600 liens maximum.");
        return;
      }
      commit({
        ...data,
        links: [
          ...data.links,
          {
            from,
            to,
            color: data.nodes.find((n) => n.id === from)?.line || "#73988B",
          },
        ],
      });
      setMessage("Lien transversal créé.");
    } else {
      if (!canParent(data, to, from)) {
        setMessage("Cette liaison créerait une boucle. Aucune modification.");
        return;
      }
      commit({
        ...data,
        nodes: data.nodes.map((n) =>
          n.id === to ? { ...n, parent: from } : n,
        ),
      });
      setMessage("Sous-idée rattachée.");
      setConnectionPulse(to);
    }
    setSelection(to);
  };
  const startWire = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const n = data.nodes.find((n) => n.id === id)!;
    gesture.current = {
      kind: "wire",
      id,
      x: e.clientX,
      y: e.clientY,
      ox: n.x,
      oy: n.y,
      moved: false,
    };
    setWire({ from: id, x: n.x + 155, y: n.y });
    setSelection(id);
    setActive(true);
    board.current?.setPointerCapture(e.pointerId);
  };
  const cancel = () => {
    if (gesture.current?.kind === "node")
      setPositions(
        Object.fromEntries(
          latest.current.nodes.map((n) => [n.id, { x: n.x, y: n.y }]),
        ),
      );
    gesture.current = null;
    setWire(null);
    setTarget("");
    setActive(false);
  };
  const chooseCentre = (id: string) => {
    frameAfterChange.current = "*";
    commit(redistributeAround(latest.current, id));
    setRedistributeOpen(false);
    setCentreCandidate("");
    setSelection(id);
    setMessage(
      "Carte redistribuée autour de " +
        latest.current.nodes.find((n) => n.id === id)?.text +
        ".",
    );
    requestAnimationFrame(() => board.current?.focus({ preventScroll: true }));
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (createMenu) {
        setCreateMenu(null);
        restoreNodeFocus();
        return;
      }
      if (redistributeOpen) {
        setRedistributeOpen(false);
        return;
      }
      if (optionsOpen) {
        setOptionsOpen(false);
        return;
      }
      if (sectionId) {
        setSectionId("");
        return;
      }
      if (reparentOpen) {
        setReparentOpen(false);
        return;
      }
      if (pendingImport) {
        setPendingImport(null);
        return;
      }
      if (context) {
        setContext(null);
        restoreNodeFocus();
      } else if (gesture.current || wire) {
        cancel();
        setMessage("Liaison annulée.");
      } else if (editing) setEditing("");
      else if (styleOpen) setStyleOpen(false);
      else setFull(false);
      return;
    }
    const dialog = (e.target as Element).closest('[role="dialog"]');
    if (
      (e.key === "Tab" && dialog && dialog.classList.contains("mm-dialog")) ||
      (e.key === "Tab" && dialog?.classList.contains("mm-section-dialog"))
    ) {
      const controls = [
        ...dialog!.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not([type="hidden"]),textarea,select,a[href]',
        ),
      ].filter((el) => el.getClientRects().length);
      if (e.shiftKey && document.activeElement === controls[0]) {
        e.preventDefault();
        controls.at(-1)?.focus();
      } else if (!e.shiftKey && document.activeElement === controls.at(-1)) {
        e.preventDefault();
        controls[0]?.focus();
      }
      return;
    }
    if (full && e.key === "Tab") {
      const list = [
        ...document.querySelectorAll<HTMLElement>(
          '.mm-overlay button:not(:disabled),.mm-overlay input,.mm-overlay select,.mm-overlay textarea,.mm-overlay [tabindex="0"]',
        ),
      ];
      const first = list[0],
        last = list.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    if ((e.target as Element).closest("input,textarea,select")) return;
    if (
      onChange &&
      !sectionId &&
      !pendingImport &&
      !reparentOpen &&
      !optionsOpen &&
      !redistributeOpen &&
      !context &&
      !createMenu &&
      (e.key === "Delete" || e.key === "Backspace" || e.key === "Del")
    ) {
      if (!(e.target as Element).closest(".mm-board,[data-mm-id]")) return;
      e.preventDefault();
      e.stopPropagation();
      remove();
      return;
    }
    if (
      onChange &&
      (e.metaKey || e.ctrlKey) &&
      !e.altKey &&
      (e.target as Element).closest(".mm-board,[data-mm-id]") &&
      !sectionId &&
      !redistributeOpen
    ) {
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        e.stopPropagation();
        void copyFromMenu();
        return;
      }
      if (e.key.toLowerCase() === "v") {
        e.preventDefault();
        e.stopPropagation();
        void pasteFromMenu();
        return;
      }
    }
    if (onChange && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    }
    if (
      onChange &&
      selected &&
      ((e.target as Element).hasAttribute("data-mm-id") ||
        e.target === board.current) &&
      e.key === "Tab" &&
      !e.shiftKey
    ) {
      e.preventDefault();
      add(selected.id);
    }
    if (
      onChange &&
      selected &&
      e.target === board.current &&
      e.key === "Enter"
    ) {
      e.preventDefault();
      beginEdit(selected);
    }
  };
  const presentNodes = useMindMapPresence(data.nodes, visibleData);
  const visibleNodes = presentNodes.map((n) => ({
    ...n,
    ...(editing === n.id
      ? data.nodes.find((node) => node.id === n.id)
      : positions[n.id]),
  }));
  async function pdf() {
    try {
      setMessage("Préparation du PDF…");
      const { jsPDF } = await import("jspdf");
      const minX = Math.min(...data.nodes.map((n) => n.x)) - width / 2 - 20,
        minY = Math.min(...data.nodes.map((n) => n.y - height(n) / 2)) - 60;
      const w = Math.max(...data.nodes.map((n) => n.x)) + width / 2 + 20 - minX,
        h = Math.max(...data.nodes.map((n) => n.y + height(n) / 2)) + 30 - minY;
      const scale = Math.min(1, 12000 / w, 12000 / h);
      const doc = new jsPDF({
        unit: "pt",
        format: [Math.max(300, w * scale), Math.max(220, h * scale)],
        orientation: w > h ? "landscape" : "portrait",
      });
      const X = (x: number) => (x - minX) * scale,
        Y = (y: number) => (y - minY) * scale;
      doc.setFontSize(16 * scale);
      doc.setTextColor("#243A36");
      doc.text(data.title, X(minX + 20), Y(minY + 24));
      const edge = (a: Bubble, b: Bubble, color: string) => {
        doc.setDrawColor(color);
        doc.setLineWidth(2 * scale);
        if (
          b.row &&
          (a.childrenSide === "above" || a.childrenSide === "below")
        ) {
          const sx = a.x - width / 2 + (underlined(data, a) ? 0 : 12),
            sy = underlined(data, a)
              ? a.y + height(a) / 2 - 12
              : a.y + ((a.childrenSide === "above" ? -1 : 1) * height(a)) / 2;
          const tx = b.x - width / 2,
            ty = b.y + height(b) / 2 - 12,
            elbow = Math.min(sx, tx) - 18;
          doc.line(X(sx), Y(sy), X(elbow), Y(sy));
          doc.line(X(elbow), Y(sy), X(elbow), Y(ty));
          doc.line(X(elbow), Y(ty), X(tx), Y(ty));
          return;
        }
        if (Math.abs(b.y - a.y) > Math.abs(b.x - a.x)) {
          const sign = b.y < a.y ? -1 : 1,
            sx = underlined(data, a) ? a.x - width / 2 : a.x,
            sy = underlined(data, a)
              ? a.y + height(a) / 2 - 12
              : a.y + (sign * height(a)) / 2,
            tx = underlined(data, b) ? b.x - width / 2 : b.x,
            ty = underlined(data, b)
              ? b.y + height(b) / 2 - 12
              : b.y - (sign * height(b)) / 2;
          doc.line(X(sx), Y(sy), X(tx), Y(ty));
          return;
        }
        const sign = b.x < a.x ? -1 : 1;
        const sy = underlined(data, a) ? a.y + height(a) / 2 - 12 : a.y,
          ty = underlined(data, b) ? b.y + height(b) / 2 - 12 : b.y;
        doc.line(
          X(a.x + (sign * width) / 2),
          Y(sy),
          X(b.x - (sign * width) / 2),
          Y(ty),
        );
      };
      data.nodes.forEach((n) => {
        const parent = data.nodes.find((p) => p.id === n.parent);
        if (parent) edge(parent, n, branchColor(data, n));
      });
      data.links.forEach((l) => {
        const a = data.nodes.find((n) => n.id === l.from),
          b = data.nodes.find((n) => n.id === l.to);
        if (a && b) edge(a, b, l.color);
      });
      data.nodes.forEach((n) => {
        const theme = data.theme || "cards",
          root = !n.parent,
          color = branchColor(data, n),
          flat = underlined(data, n),
          organic = theme === "organic" && !root && !n.row;
        const fill =
          theme === "classic" && root
            ? "#FFE780"
            : theme === "classic" && !flat
              ? color
              : n.fill;
        const ink =
          theme === "classic" && !root && !flat ? contrast(fill) : n.ink;
        doc.setFillColor(fill);
        doc.setDrawColor(color);
        doc.setLineWidth((flat ? 4 : 1.5) * scale);
        if (flat)
          doc.line(
            X(n.x - width / 2),
            Y(n.y + height(n) / 2 - 12),
            X(n.x + width / 2),
            Y(n.y + height(n) / 2 - 12),
          );
        else if ((theme === "classic" && root) || theme === "organic")
          doc.ellipse(
            X(n.x),
            Y(n.y),
            (width / 2) * scale,
            (height(n) / 2) * scale,
            "FD",
          );
        else
          doc.roundedRect(
            X(n.x - width / 2),
            Y(n.y - height(n) / 2),
            width * scale,
            height(n) * scale,
            15 * scale,
            15 * scale,
            "FD",
          );
        const text = doc.splitTextToSize(n.text, (width - 30) * scale);
        if (organic) {
          doc.setFillColor(color);
          doc.roundedRect(
            X(n.x - width / 2 + 25),
            Y(n.y - height(n) / 2 - 4),
            (width - 50) * scale,
            (text.length * 24 + 16) * scale,
            10 * scale,
            10 * scale,
            "F",
          );
        }
        doc.setFont(
          "helvetica",
          n.bold || organic
            ? n.italic
              ? "bolditalic"
              : "bold"
            : n.italic
              ? "italic"
              : "normal",
        );
        doc.setFontSize(n.size * scale);
        doc.setTextColor(organic ? contrast(color) : ink);
        const ty = organic
          ? n.y - height(n) / 2 + 26
          : n.note
            ? n.y - height(n) / 2 + 36
            : n.y - ((text.length - 1) * n.size) / 2;
        doc.text(text, X(n.x), Y(ty), { align: "center" });
        if (n.note) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(14 * scale);
          doc.setTextColor(ink);
          doc.text(
            doc.splitTextToSize(n.note, (width - 30) * scale),
            X(n.x),
            Y(n.y - height(n) / 2 + text.length * 24 + 50),
            { align: "center" },
          );
        }
        if (/^https?:\/\//i.test(n.url))
          doc.link(
            X(n.x - width / 2),
            Y(n.y - height(n) / 2),
            width * scale,
            height(n) * scale,
            { url: n.url },
          );
      });
      doc.save((data.title || "Carte mentale") + ".pdf");
      setMessage("PDF exporté.");
    } catch {
      setMessage("Impossible d’exporter le PDF. Réessaie.");
    }
  }

  const map = (
    <section
      className={`mind-map ${!onChange ? "mm-readonly" : ""} ${full ? "mm-full" : ""} ${active ? "mm-gesturing" : ""} mm-${data.display} mm-theme-${data.theme || "cards"}`}
      aria-label={data.title}
      ref={sectionRef}
      onMouseDown={(e) => e.stopPropagation()}
      contentEditable={false}
      onKeyDown={key}
      onCopy={(event) => {
        if (
          !onChange ||
          editing ||
          (event.target as Element).closest("input,textarea,select") ||
          !(event.target as Element).closest(".mm-board,[data-mm-id]")
        )
          return;
        const clip = copySelection();
        if (!clip) return;
        event.preventDefault();
        event.stopPropagation();
        event.clipboardData.setData("text/plain", encodeIdeas(clip));
      }}
      onPaste={(event) => {
        if (
          !onChange ||
          editing ||
          (event.target as Element).closest("input,textarea,select") ||
          !(event.target as Element).closest(".mm-board,[data-mm-id]")
        )
          return;
        const clip = decodeIdeas(event.clipboardData.getData("text/plain"));
        if (!clip) return;
        event.preventDefault();
        event.stopPropagation();
        pasteSelection(clip);
      }}
      onContextMenu={(event) => {
        event.stopPropagation();
        if (redistributeOpen) {
          event.preventDefault();
          return;
        }
        if (
          !onChange ||
          event.shiftKey ||
          (event.target as Element).closest("input,textarea,select")
        )
          return;
        event.preventDefault();
        finishEdit();
        cancel();
        const id =
          (event.target as Element)
            .closest("[data-mm-id]")
            ?.getAttribute("data-mm-id") || "";
        setCreateMenu(null);
        if (id && !selectedIds.includes(id)) setSelection(id);
        setContext({
          world: board.current?.contains(event.target as Node)
            ? point(event.clientX, event.clientY)
            : undefined,
          x: Math.max(12, Math.min(innerWidth - 288, event.clientX)),
          y: Math.max(12, Math.min(innerHeight - 400, event.clientY)),
          id,
        });
      }}
    >
      <header className="mm-header">
        <div>
          <span className="mm-eyebrow">Carte mentale</span>
          {onChange ? (
            <input
              aria-label="Titre de la carte mentale"
              value={data.title}
              onChange={(e) =>
                commit({ ...data, title: e.target.value }, "title")
              }
            />
          ) : (
            <h3>{data.title}</h3>
          )}
        </div>
        <div className="mm-actions">
          {onChange && (
            <>
              <button
                type="button"
                aria-label="Annuler dans la carte"
                disabled={!past.current.length}
                onClick={undo}
              >
                ↶
              </button>
              <button
                type="button"
                aria-label="Rétablir dans la carte"
                disabled={!future.current.length}
                onClick={redo}
              >
                ↷
              </button>
            </>
          )}
          {onChange && (
            <>
              <input
                ref={importInput}
                type="file"
                accept=".md,.markdown,.tex"
                hidden
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  try {
                    if (file.size > 1_000_000)
                      throw new Error("Fichier limité à 1 Mo.");
                    setPendingImport(
                      importMindMap(await file.text(), file.name),
                    );
                  } catch (error) {
                    setMessage((error as Error).message);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => importInput.current?.click()}
              >
                Importer MD / TEX
              </button>
              <button
                type="button"
                data-mm-options
                onClick={() => setOptionsOpen(true)}
                aria-label="Options de la carte"
              >
                ⋯
              </button>
            </>
          )}
          <button type="button" onClick={() => void pdf()}>
            ↓ PDF
          </button>
          <button type="button" onClick={() => setFull(!full)}>
            {full ? "Fermer ×" : "Agrandir ↗"}
          </button>
        </div>
      </header>
      {!full && data.display === "button" ? (
        <button type="button" className="mm-open" onClick={() => setFull(true)}>
          <span>✧</span>
          <strong>Explorer la carte mentale</strong>
          <small>{data.nodes.length} idées reliées · ouvrir ↗</small>
        </button>
      ) : (
        <>
          <div className="mm-toolbar">
            <div
              className={`mm-search ${search ? "is-filled" : ""}`}
              role="search"
              aria-label="Recherche dans les idées"
            >
              <Search
                size={18}
                className="mm-search-symbol"
                aria-hidden="true"
              />
              <input
                aria-label="Rechercher dans la carte mentale"
                placeholder="Rechercher une idée…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && search && !redistributeOpen) {
                    e.preventDefault();
                    e.stopPropagation();
                    setSearch("");
                  }
                }}
              />
              <button
                type="button"
                className={`mm-search-clear ${search ? "is-visible" : ""}`}
                aria-label="Effacer la recherche de la carte"
                tabIndex={search ? 0 : -1}
                disabled={!search}
                onClick={() => setSearch("")}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            {onChange && (
              <button
                type="button"
                aria-label="Style et disposition de la carte"
                aria-expanded={styleOpen}
                onClick={() => setStyleOpen(!styleOpen)}
              >
                Style & disposition ▾
              </button>
            )}
            {onChange && (
              <button
                type="button"
                className="mm-inspector-toggle"
                aria-label={
                  inspector
                    ? "Masquer Style & détails"
                    : "Afficher Style & détails"
                }
                aria-expanded={inspector}
                onClick={() => setInspector(!inspector)}
              >
                <span aria-hidden="true">◧</span> Style & détails
              </button>
            )}
            {onChange && (
              <button
                type="button"
                onClick={() => {
                  finishEdit();
                  cancel();
                  setStyleOpen(false);
                  setContext(null);
                  setCentreCandidate("");
                  setRedistributeOpen(!redistributeOpen);
                  setMessage(
                    redistributeOpen
                      ? "Choix du centre annulé."
                      : "Clique sur la bulle à placer au centre · Échap pour annuler.",
                  );
                }}
                aria-pressed={redistributeOpen}
              >
                {redistributeOpen ? "Choisir le centre…" : "Redistribuer"}
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setFolds((previous) => ({
                  ...previous,
                  [theme]: collapsed.length
                    ? []
                    : data.nodes
                        .filter(
                          (n) =>
                            n.parent &&
                            data.nodes.some((c) => c.parent === n.id),
                        )
                        .map((n) => n.id),
                }))
              }
            >
              {collapsed.length ? "Tout déplier" : "Replier les niveaux"}
            </button>
            {onChange && (
              <>
                <select
                  aria-label="Présentation de la carte"
                  value={data.display}
                  onChange={(e) => commit({ ...data, display: e.target.value })}
                >
                  <option value="button">Bouton d’ouverture</option>
                  <option value="preview">Aperçu dans la page</option>
                  <option value="page">Carte entière</option>
                </select>
                <button
                  type="button"
                  className="mm-add-primary"
                  onClick={() => addIndependent()}
                >
                  ＋ Idée libre
                </button>
              </>
            )}
          </div>
          {onChange && styleOpen && (
            <div className="mm-style-panel">
              <div
                className="mm-template-picker"
                role="group"
                aria-label="Style visuel de la carte"
              >
                {[
                  ["cards", "Cartes", "Bulles sobres"],
                  ["branches", "Branches colorées", "Idées soulignées"],
                  ["organic", "Bulles organiques", "Titre et contenu"],
                  ["classic", "Carte classique", "Centre ovale et niveaux"],
                ].map(([id, label, detail]) => (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={(data.theme || "cards") === id}
                    onClick={() => {
                      finishEdit();
                      commit(switchTheme(latest.current, id));
                      setStyleOpen(false);
                      setMessage(
                        label +
                          " · toutes les idées et relations sont conservées.",
                      );
                    }}
                  >
                    <svg
                      viewBox="0 0 90 48"
                      width="64"
                      height="36"
                      aria-hidden="true"
                    >
                      <path
                        d="M24 24C46 24 42 10 62 10M24 24C46 24 42 38 62 38"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      {id === "organic" ? (
                        <>
                          <ellipse
                            cx="18"
                            cy="24"
                            rx="16"
                            ry="12"
                            fill="currentColor"
                            opacity=".2"
                          />
                          <ellipse
                            cx="72"
                            cy="10"
                            rx="15"
                            ry="9"
                            fill="currentColor"
                            opacity=".2"
                          />
                          <ellipse
                            cx="72"
                            cy="38"
                            rx="15"
                            ry="9"
                            fill="currentColor"
                            opacity=".2"
                          />
                        </>
                      ) : id === "branches" ? (
                        <>
                          <rect
                            x="3"
                            y="16"
                            width="28"
                            height="16"
                            rx="4"
                            fill="currentColor"
                            opacity=".2"
                          />
                          <path
                            d="M60 10H88M60 38H88"
                            stroke="currentColor"
                            strokeWidth="3"
                          />
                        </>
                      ) : (
                        <>
                          <ellipse
                            cx="18"
                            cy="24"
                            rx="16"
                            ry="10"
                            fill="currentColor"
                            opacity=".25"
                          />
                          <rect
                            x="60"
                            y="3"
                            width="28"
                            height="14"
                            rx={id === "cards" ? 5 : 2}
                            fill="currentColor"
                            opacity=".25"
                          />
                          <rect
                            x="60"
                            y="31"
                            width="28"
                            height="14"
                            rx={id === "cards" ? 5 : 2}
                            fill="currentColor"
                            opacity=".25"
                          />
                        </>
                      )}
                    </svg>
                    <span>
                      <strong>{label}</strong>
                      <small>{detail}</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="mm-create-bar">
                <div
                  className="mm-layout-picker"
                  role="group"
                  aria-label="Disposition de la carte mentale"
                >
                  {[
                    ["radial", "Rayonnante", "✧"],
                    ["tree", "Arborescence", "☷"],
                    ["org", "Organigramme", "⌘"],
                    ["flow", "Parcours", "→"],
                    ["bilateral", "Équilibrée", "⑂"],
                    ["orbit", "Étoile", "✺"],
                  ].map(([id, label, icon]) => (
                    <button
                      type="button"
                      key={id}
                      aria-pressed={data.layout === id}
                      onClick={() => {
                        finishEdit();
                        commit(switchLayout(latest.current, id));
                        setStyleOpen(false);
                        cancel();
                        setMessage(
                          "Disposition " +
                            label.toLocaleLowerCase() +
                            " · les relations sont conservées.",
                        );
                      }}
                    >
                      <span aria-hidden="true">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
                <div
                  className="mm-wire-mode"
                  role="group"
                  aria-label="Type de liaison"
                >
                  <button
                    type="button"
                    aria-pressed={!relation}
                    onClick={() => setRelation(false)}
                  >
                    Branche
                  </button>
                  <button
                    type="button"
                    aria-pressed={relation}
                    onClick={() => setRelation(true)}
                  >
                    Lien libre
                  </button>
                </div>
              </div>
            </div>
          )}
          {search && (
            <div className="mm-results" role="status" aria-live="polite">
              <span className="mm-result-count">
                {matches.length} {matches.length > 1 ? "idées" : "idée"}
              </span>
              {matches.length ? (
                matches.map((n) => (
                  <button type="button" key={n.id} onClick={() => focus(n)}>
                    <span>{n.text}</span>
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </button>
                ))
              ) : (
                <span className="mm-search-empty">
                  Aucune idée trouvée. Essaie un autre mot.
                </span>
              )}
            </div>
          )}
          <div
            className={`mm-workspace ${redistributeOpen ? "mm-picking-center" : ""}`}
          >
            <div
              ref={board}
              className="mm-board"
              tabIndex={0}
              aria-label={
                onChange
                  ? "Carte interactive : glisser le fond, Tab pour une sous-idée, Entrée pour écrire"
                  : "Carte interactive : glisser pour explorer, pincer pour zoomer"
              }
              onPointerDownCapture={startReaderTouch}
              onPointerMoveCapture={moveReaderTouch}
              onPointerUpCapture={endReaderTouch}
              onPointerCancelCapture={endReaderTouch}
              onClickCapture={(event) => {
                if (
                  !onChange &&
                  Date.now() < suppressTouchClick.current &&
                  (event.target as Element).closest("[data-mm-id]")
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
              onDoubleClick={(e) => {
                if (redistributeOpen) {
                  e.preventDefault();
                  return;
                }
                if (
                  onChange &&
                  !(e.target as Element).closest(
                    "[data-mm-id],button,input,textarea,select",
                  )
                ) {
                  e.preventDefault();
                  e.stopPropagation();
                  addIndependent(point(e.clientX, e.clientY));
                }
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                if (
                  (e.target as Element).closest(
                    "[data-mm-id],button,input,textarea,select,a",
                  )
                )
                  return;
                finishEdit();
                e.currentTarget.focus({ preventScroll: true });
                setStyleOpen(false);
                cancelAnimationFrame(cameraFrame.current);
                gesture.current = {
                  kind: "pan",
                  id: "",
                  x: e.clientX,
                  y: e.clientY,
                  ox: pan.x,
                  oy: pan.y,
                  moved: false,
                };
                setActive(true);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (
                  !(e.target as Element).closest(".mm-zoom,.mm-selection-bar")
                )
                  mousePoint.current = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  };
                const g = gesture.current;
                if (!g) return;
                const dx = e.clientX - g.x,
                  dy = e.clientY - g.y;
                g.moved = g.moved || Math.hypot(dx, dy) > 4;
                if (g.kind === "wire") {
                  const p = point(e.clientX, e.clientY);
                  setWire({ from: g.id, ...p });
                  const hit =
                    document
                      .elementFromPoint(e.clientX, e.clientY)
                      ?.closest("[data-mm-id]")
                      ?.getAttribute("data-mm-id") || "";
                  setTarget(hit === g.id ? "" : hit);
                } else if (g.kind === "node" && onChange && g.moved) {
                  if (!e.currentTarget.hasPointerCapture(e.pointerId))
                    e.currentTarget.setPointerCapture(e.pointerId);
                  setPositions((previous) => ({
                    ...previous,
                    ...Object.fromEntries(
                      Object.entries(
                        g.origins || { [g.id]: { x: g.ox, y: g.oy } },
                      ).map(([id, p]) => [
                        id,
                        { x: p.x + dx / zoom, y: p.y + dy / zoom },
                      ]),
                    ),
                  }));
                } else if (g.kind === "pan")
                  setPan({ x: g.ox + dx, y: g.oy + dy });
              }}
              onPointerUp={(e) => {
                const g = gesture.current;
                if (g?.kind === "wire" && g.moved) {
                  const hit =
                    document
                      .elementFromPoint(e.clientX, e.clientY)
                      ?.closest("[data-mm-id]")
                      ?.getAttribute("data-mm-id") || "";
                  if (hit) connect(g.id, hit, relation || e.altKey);
                  else if (!relation) add(g.id, point(e.clientX, e.clientY));
                  else setMessage("Dépose le lien sur une autre idée.");
                } else if (g?.kind === "wire")
                  setMessage(
                    "Tire cette poignée vers une idée, ou choisis une idée puis « Relier ».",
                  );
                if (g?.kind === "node" && g.moved) {
                  const x = g.ox + (e.clientX - g.x) / zoom,
                    y = g.oy + (e.clientY - g.y) / zoom;
                  commit({
                    ...latest.current,
                    nodes: latest.current.nodes.map((n) =>
                      g.origins?.[n.id]
                        ? {
                            ...n,
                            x: g.origins[n.id].x + (e.clientX - g.x) / zoom,
                            y: g.origins[n.id].y + (e.clientY - g.y) / zoom,
                          }
                        : n.id === g.id
                          ? { ...n, x, y }
                          : n,
                    ),
                  });
                }
                if (g) cancel();
              }}
              onPointerCancel={cancel}
              onLostPointerCapture={() => {
                if (gesture.current) cancel();
              }}
            >
              {redistributeOpen && (
                <div className="mm-centre-guide" role="status">
                  <span className="mm-centre-target" aria-hidden="true">
                    ◎
                  </span>
                  <div>
                    <strong>Quelle idée placer au centre ?</strong>
                    <span>
                      Clique directement sur une bulle · le zoom et le
                      déplacement restent disponibles
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRedistributeOpen(false);
                      setCentreCandidate("");
                      setMessage("Choix du centre annulé.");
                    }}
                  >
                    Annuler <kbd>Échap</kbd>
                  </button>
                </div>
              )}
              <svg
                width="100%"
                height="100%"
                role="img"
                aria-label={data.title}
              >
                {data.theme === "organic" && (
                  <defs>
                    {visibleNodes.map((n) => (
                      <marker
                        key={n.id}
                        id={mapId + "-" + n.id}
                        markerWidth="10"
                        markerHeight="10"
                        refX="8"
                        refY="5"
                        orient="auto"
                        markerUnits="userSpaceOnUse"
                      >
                        <path
                          d="M1 1L9 5L1 9"
                          fill="none"
                          stroke={branchColor(data, n)}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </marker>
                    ))}
                  </defs>
                )}
                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                  {visibleNodes.map((n) => {
                    const p = visibleNodes.find((p) => p.id === n.parent);
                    return p ? (
                      <path
                        className={`mm-edge ${connectionPulse === n.id ? "is-connected" : ""} ${n.phase === "exit" ? "is-exiting" : n.phase === "enter" ? "is-entering" : ""}`}
                        key={"e" + n.parent + n.id}
                        pathLength={1}
                        style={{
                          opacity: n.presence,
                          strokeDashoffset: 1 - n.presence,
                        }}
                        d={linkPath(data, p, n)}
                        markerEnd={
                          data.theme === "organic"
                            ? `url(#${mapId + "-" + n.id})`
                            : undefined
                        }
                        fill="none"
                        stroke={branchColor(data, n)}
                        strokeWidth={data.theme === "branches" ? 5 : 3}
                        strokeLinecap="round"
                      />
                    ) : null;
                  })}
                  {data.links.map((l) => {
                    const a = visibleNodes.find((n) => n.id === l.from),
                      b = visibleNodes.find((n) => n.id === l.to);
                    return a && b ? (
                      <path
                        key={l.from + l.to}
                        className={`mm-cross-edge ${a.phase === "exit" || b.phase === "exit" ? "is-exiting" : ""}`}
                        style={{ opacity: Math.min(a.presence, b.presence) }}
                        d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${Math.min(a.y, b.y) - 100} ${b.x},${b.y}`}
                        fill="none"
                        stroke={l.color}
                        strokeWidth="2"
                        strokeDasharray="7 5"
                      />
                    ) : null;
                  })}
                  {wire &&
                    (() => {
                      const p = visibleNodes.find((n) => n.id === wire.from)!;
                      if (!p) return null;
                      return (
                        <path
                          className="mm-wire-preview"
                          d={`M${p.x + width / 2 + 28 / zoom},${p.y - 24 / zoom} Q${p.x + 230},${p.y - 24 / zoom} ${wire.x},${wire.y}`}
                          fill="none"
                          stroke="var(--accent,#52796c)"
                          strokeWidth="3"
                          strokeDasharray={relation ? "7 5" : undefined}
                        />
                      );
                    })()}
                  {visibleNodes.map((n) => (
                    <g
                      key={n.id}
                      data-mm-id={n.id}
                      className={`mm-bubble ${n.phase === "exit" ? "is-exiting" : n.phase === "enter" ? "is-entering" : ""} ${selectedIds.includes(n.id) ? "is-selected" : ""} ${target === n.id ? "is-target" : ""} ${matches.some((m) => m.id === n.id) ? "is-match" : ""}`}
                      transform={`translate(${n.x},${n.y})`}
                      role="button"
                      tabIndex={n.phase === "exit" ? -1 : 0}
                      aria-hidden={n.phase === "exit" || undefined}
                      aria-label={n.text}
                      aria-pressed={selectedIds.includes(n.id)}
                      onPointerEnter={() => {
                        if (redistributeOpen) setCentreCandidate(n.id);
                      }}
                      onPointerLeave={() => {
                        if (redistributeOpen) setCentreCandidate("");
                      }}
                      onKeyDown={(e) => {
                        if (
                          redistributeOpen &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          e.stopPropagation();
                          chooseCentre(n.id);
                          return;
                        }
                        if (
                          onChange &&
                          (e.key === "ContextMenu" ||
                            (e.shiftKey && e.key === "F10"))
                        ) {
                          e.preventDefault();
                          e.stopPropagation();
                          const r = e.currentTarget.getBoundingClientRect();
                          if (!selectedIds.includes(n.id)) setSelection(n.id);
                          setContext({
                            id: n.id,
                            x: Math.max(
                              12,
                              Math.min(innerWidth - 288, r.right),
                            ),
                            y: Math.max(12, Math.min(innerHeight - 400, r.top)),
                          });
                          return;
                        }
                        if ((e.key === "Enter" || e.key === " ") && onChange) {
                          e.preventDefault();
                          e.stopPropagation();
                          if (wire) {
                            connect(wire.from, n.id, relation);
                            setWire(null);
                          } else if (e.key === "Enter") beginEdit(n);
                          else selectNode(n.id, e.shiftKey);
                        }
                      }}
                      onFocus={() => {
                        if (!selectedIds.includes(n.id)) setSelection(n.id);
                        if (redistributeOpen) setCentreCandidate(n.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (redistributeOpen) return;
                        if (!onChange && (n.content || n.media?.length)) {
                          setSectionId(n.id);
                          focus(n);
                          return;
                        }
                        beginEdit(
                          n,
                          (e.target as Element).closest(".mm-note-area")
                            ? "note"
                            : "text",
                        );
                      }}
                      onClick={(e) => {
                        if (redistributeOpen) {
                          e.stopPropagation();
                          chooseCentre(n.id);
                          return;
                        }
                        if (e.shiftKey) return;
                        e.currentTarget.focus({ preventScroll: true });
                        if (!selectedIds.includes(n.id)) setSelection(n.id);
                        if (!onChange && (n.content || n.media?.length)) {
                          focus(n);
                          setSectionId(n.id);
                          return;
                        }
                        if (wire && !gesture.current) {
                          connect(wire.from, n.id, relation);
                          setWire(null);
                        }
                      }}
                      onPointerDown={(e) => {
                        if (redistributeOpen) {
                          if ((e.target as Element).closest(".mm-fold-toggle"))
                            return;
                          e.stopPropagation();
                          return;
                        }
                        if (e.button !== 0 || n.phase === "exit") return;
                        if (
                          (e.target as Element).closest(
                            ".mm-node-tools,.mm-fold-toggle,foreignObject",
                          )
                        )
                          return;
                        e.stopPropagation();
                        if (e.shiftKey && onChange) {
                          e.preventDefault();
                          selectNode(n.id, true);
                          return;
                        }
                        if (!selectedIds.includes(n.id)) setSelection(n.id);
                        if (onChange && !wire) {
                          cancelAnimationFrame(cameraFrame.current);
                          gesture.current = {
                            kind: "node",
                            origins: Object.fromEntries(
                              latest.current.nodes
                                .filter((v) =>
                                  selectedIds.includes(n.id)
                                    ? selectedIds.includes(v.id)
                                    : v.id === n.id,
                                )
                                .map((v) => [v.id, { x: v.x, y: v.y }]),
                            ),
                            id: n.id,
                            x: e.clientX,
                            y: e.clientY,
                            ox: n.x,
                            oy: n.y,
                            moved: false,
                          };
                        }
                      }}
                    >
                      {redistributeOpen && centreCandidate === n.id && (
                        <g className="mm-centre-preview" pointerEvents="none">
                          <rect
                            x={-width / 2 - 9 / zoom}
                            y={-height(n) / 2 - 9 / zoom}
                            width={width + 18 / zoom}
                            height={height(n) + 18 / zoom}
                            rx={20 / zoom}
                            fill="none"
                            stroke="var(--accent,#52796c)"
                            strokeWidth={2 / zoom}
                          />
                          <g
                            transform={`translate(0,${-height(n) / 2 - 25 / zoom}) scale(${1 / zoom})`}
                          >
                            <rect
                              x="-55"
                              y="-13"
                              width="110"
                              height="26"
                              rx="13"
                              fill="var(--accent,#52796c)"
                            />
                            <text
                              textAnchor="middle"
                              y="4"
                              fill="var(--accent-contrast,#fff)"
                              fontSize="11"
                            >
                              ◎ Centrer ici
                            </text>
                          </g>
                        </g>
                      )}
                      <g
                        className="mm-node-reveal"
                        style={{
                          opacity: editing === n.id ? 1 : n.presence,
                          transform:
                            editing === n.id
                              ? "none"
                              : `translateY(${(1 - n.presence) * 8}px) scale(${0.86 + 0.14 * n.presence})`,
                        }}
                      >
                        {
                          <MindMapNode
                            data={data}
                            node={n}
                            zoom={zoom}
                            selected={
                              selectedIds.includes(n.id) || target === n.id
                            }
                            editable={!!onChange}
                          />
                        }
                        {editing === n.id ? (
                          <foreignObject
                            x={-Math.max(width - 20, 220 / zoom) / 2}
                            y={-Math.max(height(n) - 16, 100 / zoom) / 2}
                            width={Math.max(width - 20, 220 / zoom)}
                            height={Math.max(height(n) - 16, 100 / zoom)}
                          >
                            <textarea
                              className="mm-inline-input"
                              aria-label="Écrire cette idée"
                              ref={mountEditInput}
                              value={draft}
                              style={{
                                color: "var(--ink, #243A36)",
                                fontSize: Math.max(
                                  editField === "note" ? 14 : n.size,
                                  16 / zoom,
                                ),
                                fontWeight: n.bold ? 700 : 450,
                              }}
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) => setDraft(e.target.value)}
                              onBlur={finishEdit}
                              onPointerDown={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === "Escape") {
                                  setEditing("");
                                  board.current?.focus();
                                }
                                if (e.key === "Tab" && !e.shiftKey) {
                                  e.preventDefault();
                                  finishEdit();
                                  add(n.id);
                                }
                              }}
                            />
                          </foreignObject>
                        ) : null}
                        {data.nodes.some((c) => c.parent === n.id) && (
                          <g
                            className="mm-fold-toggle"
                            role="button"
                            tabIndex={0}
                            aria-expanded={!collapsed.includes(n.id)}
                            aria-label={
                              (collapsed.includes(n.id)
                                ? "Déplier"
                                : "Replier") +
                              " les sous-idées de " +
                              n.text
                            }
                            transform={`translate(${-width / 2 - 16 / zoom},0) scale(${1 / zoom})`}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFold(n.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                e.preventDefault();
                                toggleFold(n.id);
                              }
                            }}
                          >
                            <circle r="22" fill="transparent" />
                            <circle
                              r="9"
                              fill="var(--surface,#fff)"
                              stroke="currentColor"
                            />
                            <path d="M-4 0H4" stroke="currentColor" />
                            {collapsed.includes(n.id) && (
                              <path d="M0-4V4" stroke="currentColor" />
                            )}
                          </g>
                        )}
                        {onChange && (
                          <g className="mm-node-tools">
                            <g
                              role="button"
                              tabIndex={0}
                              aria-label={"Ajouter une idée près de " + n.text}
                              aria-haspopup="menu"
                              aria-expanded={createMenu?.id === n.id}
                              transform={
                                n.row ||
                                n.childrenSide === "above" ||
                                n.childrenSide === "below"
                                  ? `translate(${width / 2 + 28 / zoom},0) scale(${1 / zoom})`
                                  : `translate(0,${height(n) / 2 + 26 / zoom}) scale(${1 / zoom})`
                              }
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openCreateMenu(n.id, e.currentTarget);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  openCreateMenu(n.id, e.currentTarget);
                                }
                              }}
                            >
                              <title>
                                Ajouter une idée indépendante ou une sous-idée
                              </title>
                              <circle
                                className="mm-port-hit"
                                r="22"
                                fill="transparent"
                              />
                              <circle r="11" fill="var(--surface,#fff)" />
                              <path
                                d="M-6 0H6M0-6V6"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            </g>
                            <g
                              role="button"
                              tabIndex={0}
                              aria-label={"Tirer un lien depuis " + n.text}
                              transform={`translate(${width / 2 + 28 / zoom},${(n.row || n.childrenSide === "above" || n.childrenSide === "below" ? -48 : -24) / zoom}) scale(${1 / zoom})`}
                              onPointerDown={(e) => startWire(n.id, e)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setWire({ from: n.id, x: n.x + 220, y: n.y });
                                  setSelection(n.id);
                                  setMessage("Sélectionne la bulle à relier.");
                                }
                              }}
                            >
                              <title>
                                Tirer une branche · Alt pour un lien libre
                              </title>
                              <circle
                                className="mm-port-hit"
                                r="22"
                                fill="transparent"
                              />
                              <circle r="11" fill="var(--surface,#fff)" />
                              <circle
                                r="6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            </g>
                          </g>
                        )}
                      </g>
                    </g>
                  ))}
                </g>
              </svg>
              <div className="mm-zoom">
                <button
                  type="button"
                  aria-label="Réduire le zoom"
                  onClick={() => zoomFromPointer(1 / 1.25)}
                >
                  −
                </button>
                <span>{Math.round(zoom * 100)} %</span>
                <button
                  type="button"
                  aria-label="Augmenter le zoom"
                  onClick={() => zoomFromPointer(1.25)}
                >
                  ＋
                </button>
                <button type="button" onClick={() => fit()}>
                  Recentrer
                </button>
              </div>
              {onChange && selectedIds.length > 1 && !redistributeOpen && (
                <div
                  className="mm-selection-bar mm-multi-actions"
                  aria-label="Actions des idées sélectionnées"
                >
                  <strong>{selectedIds.length} idées</strong>
                  <button type="button" onClick={copyFromMenu}>
                    <Copy size={15} /> Copier
                  </button>
                  <button type="button" onClick={pasteFromMenu}>
                    <ClipboardPaste size={15} /> Coller
                  </button>
                  <button type="button" onClick={remove}>
                    <Trash2 size={15} /> Supprimer
                  </button>
                </div>
              )}
              {onChange &&
                selected &&
                selectedIds.length === 1 &&
                !redistributeOpen && (
                  <div
                    className="mm-selection-bar"
                    aria-label="Actions de l’idée sélectionnée"
                  >
                    <button type="button" onClick={() => beginEdit(selected)}>
                      Écrire
                    </button>
                    <button type="button" onClick={() => add(selected.id)}>
                      ＋ Sous-idée
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWire({
                          from: selected.id,
                          x: selected.x + 230,
                          y: selected.y,
                        });
                        setMessage("Clique la bulle à relier.");
                      }}
                    >
                      Relier
                    </button>
                    <button
                      type="button"
                      onClick={() => add(selected.id, undefined, "above")}
                    >
                      ＋ Au-dessus
                    </button>
                    {(!!selected.content || !!selected.media?.length) && (
                      <button
                        type="button"
                        onClick={() => {
                          focus(selected);
                          setSectionId(selected.id);
                        }}
                      >
                        Explorer la section ↗
                      </button>
                    )}
                  </div>
                )}
            </div>
            {onChange && selected && inspector && (
              <aside
                className="mm-inspector"
                inert={redistributeOpen ? true : undefined}
                aria-label="Style et détails de l’idée"
              >
                {selectedIds.length > 1 ? (
                  <div className="mm-multi-inspector">
                    <span className="mm-eyebrow">Sélection multiple</span>
                    <h3>{selectedIds.length} idées ensemble</h3>
                    <p>
                      Maj + clic ajoute ou retire une idée. Déplace le groupe,
                      copie-le ou supprime-le en une fois.
                    </p>
                    <button type="button" onClick={copyFromMenu}>
                      <Copy size={16} /> Copier la sélection
                    </button>
                    <button type="button" onClick={pasteFromMenu}>
                      <ClipboardPaste size={16} /> Coller une copie
                    </button>
                    <button type="button" onClick={remove}>
                      <Trash2 size={16} /> Supprimer la sélection
                    </button>
                    <small>
                      Ctrl / Cmd + C · Ctrl / Cmd + V · Suppr
                      <br />
                      Annuler : Ctrl / Cmd + Z
                    </small>
                  </div>
                ) : (
                  <>
                    <header>
                      <span className="mm-eyebrow">Style & détails</span>
                      <small>Idée sélectionnée</small>
                    </header>
                    <strong className="mm-inspector-title">
                      {selected.text}
                    </strong>
                    <div
                      className="mm-child-placement"
                      role="group"
                      aria-label="Placement des sous-idées"
                    >
                      <span>Sous-idées</span>
                      <div>
                        {(
                          [
                            ["below", "En dessous"],
                            ["above", "Au-dessus"],
                            ["auto", "Modèle"],
                          ] as const
                        ).map(([side, label]) => (
                          <button
                            key={side}
                            type="button"
                            aria-pressed={
                              (selected.childrenSide || "auto") === side
                            }
                            onClick={() => {
                              finishEdit();
                              frameAfterChange.current = selection;
                              commit(
                                setChildSide(latest.current, selection, side),
                              );
                              setMessage(
                                side === "auto"
                                  ? "Sous-idées replacées selon le modèle."
                                  : `Sous-idées alignées ${side === "above" ? "au-dessus" : "en dessous"} de ${selected.text}.`,
                              );
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="mm-add-primary"
                        onClick={() => add(selected.id)}
                      >
                        ＋ Ajouter une sous-idée
                      </button>
                      <button
                        type="button"
                        aria-expanded={batchOpen}
                        onClick={() => setBatchOpen(!batchOpen)}
                      >
                        Ajouter plusieurs idées…
                      </button>
                      {batchOpen && (
                        <div className="mm-batch-ideas">
                          <textarea
                            aria-label="Sous-idées à créer, une par ligne"
                            placeholder={
                              "Une idée par ligne\nObserver\nComparer\nChoisir"
                            }
                            value={batchText}
                            onChange={(event) =>
                              setBatchText(event.target.value)
                            }
                          />
                          <button
                            type="button"
                            disabled={!batchText.trim()}
                            onClick={addBatch}
                          >
                            Créer ces sous-idées
                          </button>
                        </div>
                      )}
                      <small>
                        Les lignes restent indépendantes. Tab ajoute un niveau,
                        Un clic hors de la bulle valide.
                      </small>
                    </div>
                    <textarea
                      aria-label="Texte de la bulle"
                      value={selected.text}
                      onChange={(e) => update({ text: e.target.value })}
                    />
                    <label>
                      Contenu de l’idée
                      <textarea
                        aria-label="Contenu de l’idée"
                        value={selected.note || ""}
                        onChange={(e) => update({ note: e.target.value })}
                      />
                    </label>
                    <label>
                      Texte de la section
                      <textarea
                        aria-label="Texte complet de la section"
                        maxLength={20000}
                        value={selected.content || ""}
                        onChange={(e) => update({ content: e.target.value })}
                      />
                    </label>
                    <label>
                      Contour de l’idée
                      <select
                        aria-label="Contour de l’idée"
                        value={selected.outline || "auto"}
                        onChange={(e) =>
                          update({
                            outline: e.target.value as
                              "auto" | "underline" | "box",
                            ink:
                              e.target.value === "box"
                                ? contrast(selected.fill)
                                : "#243A36",
                          })
                        }
                      >
                        <option value="auto">Suivre le modèle</option>
                        <option value="underline">Soulignage uniquement</option>
                        <option value="box">Contour et fond</option>
                      </select>
                    </label>
                    <div className="mm-swatches">
                      {colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          style={{ background: color }}
                          aria-label={"Bulle " + color}
                          onClick={() =>
                            update({
                              fill: color,
                              ...(underlined(data, selected)
                                ? { line: color }
                                : {}),
                              ink: underlined(data, selected)
                                ? "#243A36"
                                : contrast(color),
                            })
                          }
                        />
                      ))}
                    </div>
                    {(["fill", "ink", "line"] as const).map((key, i) => (
                      <label key={key}>
                        {["Bulle", "Texte", "Branche / lien"][i]}
                        <input
                          type="color"
                          value={selected[key]}
                          onChange={(e) => {
                            const color = e.target.value;
                            commit(
                              {
                                ...data,
                                nodes: data.nodes.map((n) =>
                                  n.id === selection
                                    ? { ...n, [key]: color }
                                    : n,
                                ),
                                links:
                                  key === "line"
                                    ? data.links.map((l) =>
                                        l.from === selection ||
                                        l.to === selection
                                          ? { ...l, color }
                                          : l,
                                      )
                                    : data.links,
                              },
                              "color",
                            );
                          }}
                        />
                      </label>
                    ))}
                    <div className="mm-actions">
                      <button
                        type="button"
                        aria-pressed={selected.bold}
                        onClick={() => update({ bold: !selected.bold })}
                      >
                        <b>Gras</b>
                      </button>
                      <button
                        type="button"
                        aria-pressed={selected.italic}
                        onClick={() => update({ italic: !selected.italic })}
                      >
                        <i>Italique</i>
                      </button>
                      <select
                        aria-label="Taille du texte"
                        value={selected.size}
                        onChange={(e) =>
                          update({ size: Number(e.target.value) })
                        }
                      >
                        {[14, 16, 18, 20, 24, 28].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <label>
                      Lien web
                      <input
                        aria-label="Lien web de la bulle"
                        value={selected.url}
                        placeholder="https://…"
                        onChange={(e) => update({ url: e.target.value })}
                      />
                    </label>
                    <IdeaMediaEditor
                      key={selected.id}
                      items={selected.media || []}
                      onChange={(media) => update({ media })}
                    />
                    <button
                      type="button"
                      onClick={() => setSectionId(selected.id)}
                    >
                      Ouvrir les contenus de l’idée ↗
                    </button>
                    <select
                      aria-label="Branche parente"
                      value={selected.parent}
                      onChange={(e) => {
                        if (
                          e.target.value &&
                          !canParent(data, selection, e.target.value)
                        ) {
                          setMessage("Cette branche créerait une boucle.");
                          return;
                        }
                        frameAfterChange.current = "*";
                        commit(
                          reparentIdea(
                            latest.current,
                            selection,
                            e.target.value,
                          ),
                        );
                      }}
                    >
                      <option value="">Idée centrale</option>
                      {data.nodes
                        .filter((n) => n.id !== selection)
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.text}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        commit({
                          ...data,
                          links: data.links.filter(
                            (l) => l.from !== selection && l.to !== selection,
                          ),
                        })
                      }
                    >
                      Retirer les liens libres
                    </button>
                    <button type="button" onClick={remove}>
                      Supprimer l’idée
                    </button>
                  </>
                )}
              </aside>
            )}
          </div>
          {!onChange && (!!selected?.content || !!selected?.media?.length) && (
            <button
              className="mm-section-open"
              type="button"
              onClick={() => {
                focus(selected);
                setSectionId(selected.id);
              }}
            >
              Explorer « {selected.text} » ↗
            </button>
          )}
          {!onChange && selected?.url && /^https?:\/\//i.test(selected.url) && (
            <a
              className="mm-link"
              href={selected.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ouvrir le lien de {selected.text} ↗
            </a>
          )}
          <footer className="mm-footer">
            <span>
              {wire
                ? "Dépose sur une idée pour relier · sur le fond pour créer · Échap pour annuler"
                : onChange
                  ? "＋ pour choisir · Maj + clic : sélectionner · Ctrl / Cmd C et V : copier-coller · Suppr : retirer"
                  : data.nodes.length +
                    " idées · glisser pour explorer · pincer pour zoomer"}
            </span>
            <span role="status">{message}</span>
          </footer>
        </>
      )}
      {onChange && !full && data.display === "button" && (
        <button type="button" onClick={() => setFull(true)}>
          Modifier la carte
        </button>
      )}
      {onChange && optionsOpen && (
        <MindMapOptions
          data={data}
          onChange={(next) => commit(next)}
          onClose={() => setOptionsOpen(false)}
        />
      )}
      {pendingImport && (
        <div className="mm-dialog-shade">
          <div
            className="mm-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Importer une carte mentale"
          >
            <h3>{pendingImport.title}</h3>
            <p>
              {pendingImport.nodes.length} idées et sections. Aucun code TEX ou
              HTML ne sera exécuté.
            </p>
            <button
              type="button"
              onClick={() => {
                if (data.nodes.length + pendingImport.nodes.length > 300) {
                  setMessage(
                    "L’ensemble dépasse 300 idées. Importe dans une carte vide ou remplace cette carte.",
                  );
                  return;
                }
                commit(
                  redistribute({
                    ...data,
                    nodes: [...data.nodes, ...pendingImport.nodes],
                    links: [...data.links, ...pendingImport.links],
                  }),
                );
                setSelection(pendingImport.nodes[0].id);
                setMessage(
                  `${pendingImport.nodes.length} sections importées et ajoutées à la carte.`,
                );
                frameAfterChange.current = pendingImport.nodes[0].id;
                setPendingImport(null);
                setFolds({});
              }}
            >
              Ajouter à cette carte
            </button>
            <button
              type="button"
              onClick={() => {
                commit(pendingImport);
                setMessage(
                  `${pendingImport.nodes.length} sections importées. Annuler restaure la carte précédente.`,
                );
                setSelection(pendingImport.nodes[0].id);
                setPendingImport(null);
                setFolds({});
                frameAfterChange.current = pendingImport.nodes[0].id;
              }}
            >
              Remplacer cette carte (annulable)
            </button>
            <button type="button" onClick={() => setPendingImport(null)}>
              Annuler l’import
            </button>
          </div>
        </div>
      )}
      {reparentOpen && selected && (
        <div className="mm-dialog-shade">
          <div
            className="mm-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Choisir l’idée parente"
          >
            <h3>Rattacher « {selected.text} »</h3>
            <p>Choisis l’idée dont elle deviendra une sous-idée.</p>
            {data.nodes
              .filter((n) => canParent(data, selection, n.id))
              .map((n) => (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => {
                    frameAfterChange.current = "*";
                    commit(reparentIdea(latest.current, selection, n.id));
                    setReparentOpen(false);
                    setMessage(`Idée rattachée à ${n.text}.`);
                    revealPath(n.id);
                  }}
                >
                  {n.text}
                </button>
              ))}
            <button type="button" onClick={() => setReparentOpen(false)}>
              Annuler le rattachement
            </button>
          </div>
        </div>
      )}
      {sectionId &&
        (() => {
          const section = data.nodes.find((n) => n.id === sectionId);
          if (!section) return null;
          const index = data.nodes.indexOf(section);
          return (
            <div className="mm-dialog-shade">
              <article
                className="mm-section-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Lecture de la section"
              >
                <header>
                  <span>
                    Section {index + 1} / {data.nodes.length}
                  </span>
                  <button type="button" onClick={() => setSectionId("")}>
                    Retour à la carte
                  </button>
                </header>
                <h2>{section.text}</h2>
                <div className="mm-section-body">
                  {section.content ||
                    section.note ||
                    "Cette section contient des sous-idées."}
                </div>
                <IdeaMediaView items={section.media || []} />
                {section.url && /^https?:\/\//i.test(section.url) && (
                  <a
                    href={section.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ouvrir le lien de l’idée ↗
                  </a>
                )}
                <nav aria-label="Sous-sections">
                  {data.nodes
                    .filter((n) => n.parent === section.id)
                    .map((n) => (
                      <button
                        type="button"
                        key={n.id}
                        onClick={() => {
                          focus(n);
                          setSectionId(n.id);
                        }}
                      >
                        {n.text} ↗
                      </button>
                    ))}
                </nav>
                <footer>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => {
                      const n = data.nodes[index - 1];
                      focus(n);
                      setSectionId(n.id);
                    }}
                  >
                    ← Précédente
                  </button>
                  <button
                    type="button"
                    disabled={index === data.nodes.length - 1}
                    onClick={() => {
                      const n = data.nodes[index + 1];
                      focus(n);
                      setSectionId(n.id);
                    }}
                  >
                    Suivante →
                  </button>
                </footer>
              </article>
            </div>
          );
        })()}
      {createMenu && onChange && (
        <div
          ref={createMenuRef}
          className="mm-context-menu mm-create-menu"
          role="menu"
          aria-label="Créer une idée"
          style={{ left: createMenu.x, top: createMenu.y }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              e.stopPropagation();
              const buttons = [
                ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button",
                ),
              ];
              const i = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              buttons[
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? buttons.length - 1
                    : (i + (e.key === "ArrowUp" ? -1 : 1) + buttons.length) %
                      buttons.length
              ]?.focus();
            }
          }}
        >
          <div className="mm-context-heading">Une nouvelle idée</div>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              const parent = latest.current.nodes.find(
                (n) => n.id === createMenu.id,
              )!;
              addIndependent(
                freeIdeaPoint(latest.current, {
                  x: parent.x + width + 70,
                  y: parent.y,
                }),
              );
            }}
          >
            <span className="mm-create-symbol">
              <Plus size={20} />
            </span>
            <span>
              <strong>Idée indépendante</strong>
              <small>Une bulle libre, sans lien</small>
            </span>
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => add(createMenu.id)}
          >
            <span className="mm-create-symbol">
              <GitBranch size={20} />
            </span>
            <span>
              <strong>Sous-idée liée</strong>
              <small>
                Reliée à «{" "}
                {latest.current.nodes.find((n) => n.id === createMenu.id)?.text}{" "}
                »
              </small>
            </span>
          </button>
          <small className="mm-menu-hint">
            Les autres idées restent en place.
          </small>
        </div>
      )}
      {context && onChange && (
        <div
          className="mm-context-menu"
          ref={menuRef}
          role="menu"
          aria-label="Actions de la carte mentale"
          style={{ left: context.x, top: context.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            const buttons = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              ),
            ];
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              event.stopPropagation();
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? buttons.length - 1
                    : (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        buttons.length) %
                      buttons.length;
              buttons[next]?.focus();
            }
          }}
        >
          <div className="mm-context-heading">
            {selectedIds.length > 1
              ? `${selectedIds.length} idées sélectionnées`
              : context.id
                ? selected?.text
                : "Carte mentale"}
          </div>
          <button type="button" role="menuitem" onClick={pasteFromMenu}>
            <ClipboardPaste size={16} /> Coller les idées <kbd>⌘ / Ctrl V</kbd>
          </button>
          {context.id && (
            <>
              <button type="button" role="menuitem" onClick={copyFromMenu}>
                <Copy size={16} /> Copier{" "}
                {selectedIds.length > 1 ? "les idées" : "l’idée"}
                <kbd>⌘ / Ctrl C</kbd>
              </button>
              <button type="button" role="menuitem" onClick={remove}>
                <Trash2 size={16} /> Supprimer{" "}
                {selectedIds.length > 1 ? "les idées" : "l’idée"}
                <kbd>Suppr</kbd>
              </button>
              <div className="mm-menu-divider" />
            </>
          )}
          {context.id && selected && selectedIds.length === 1 && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setContext(null);
                  beginEdit(selected);
                }}
              >
                Écrire l’idée <kbd>Entrée</kbd>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => add(selected.id, undefined, "below")}
              >
                ＋ Sous-idée en dessous
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => add(selected.id, undefined, "above")}
              >
                ＋ Sous-idée au-dessus
              </button>
              {selected.parent && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => add(selected.parent)}
                >
                  ＋ Idée au même niveau
                </button>
              )}
              <div className="mm-menu-divider" />
              {selected.parent && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    commit(reparentIdea(latest.current, selection, ""));
                    setContext(null);
                    frameAfterChange.current = selection;
                    setMessage(
                      "Idée devenue indépendante. Ses sous-idées sont conservées.",
                    );
                  }}
                >
                  Convertir en idée indépendante
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setReparentOpen(true);
                  setContext(null);
                }}
              >
                Convertir en sous-idée…
              </button>
              {(!!selected.content || !!selected.media?.length) && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSectionId(selected.id);
                    setContext(null);
                  }}
                >
                  Explorer la section ↗
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setWire({
                    from: selected.id,
                    x: selected.x + width / 2 + 60,
                    y: selected.y,
                  });
                  setRelation(true);
                  setContext(null);
                  setMessage(
                    "Clique une autre idée pour créer un lien libre. Échap annule.",
                  );
                }}
              >
                Relier à une autre idée
              </button>
              {data.nodes.some((n) => n.parent === selected.id) && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    toggleFold(selected.id);
                    setContext(null);
                  }}
                >
                  {collapsed.includes(selected.id)
                    ? "Déplier les sous-idées"
                    : "Replier les sous-idées"}
                </button>
              )}
              <div className="mm-menu-divider" />
            </>
          )}
          {!context.id && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => addIndependent(context.world)}
              >
                ＋ Créer une idée indépendante
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  fit();
                  setContext(null);
                }}
              >
                Recentrer la carte
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!past.current.length}
                onClick={() => {
                  undo();
                  setContext(null);
                }}
              >
                Annuler la dernière action
              </button>
            </>
          )}
          <small className="mm-menu-hint">
            Clic droit : actions · Échap : fermer
          </small>
        </div>
      )}
    </section>
  );
  return full
    ? createPortal(
        <div
          className="mm-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Carte mentale en plein écran"
        >
          {map}
        </div>,
        document.body,
      )
    : map;
}
