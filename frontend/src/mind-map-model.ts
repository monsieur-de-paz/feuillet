import type { IdeaMedia } from "./MindMapAttachments";
import { nodeHeight, nodeWidth } from "./mind-map-geometry";
export type ChildSide = "auto" | "above" | "below";
export type Bubble = {
  id: string;
  parent: string;
  text: string;
  x: number;
  y: number;
  fill: string;
  ink: string;
  line: string;
  bold: boolean;
  italic: boolean;
  size: number;
  url: string;
  note?: string;
  content?: string;
  childrenSide?: ChildSide;
  row?: boolean;
  outline?: "auto" | "underline" | "box";
  media?: IdeaMedia[];
};
export type MapData = {
  title: string;
  display: string;
  layout: string;
  theme?: string;
  centerId?: string;
  styleLayouts?: Record<string, string>;
  scenes?: Record<
    string,
    { signature: string; positions: Record<string, { x: number; y: number }> }
  >;
  nodes: Bubble[];
  links: { from: string; to: string; color: string }[];
  views?: Record<string, Record<string, { x: number; y: number }>>;
};
export const colors = [
  "#E4EEE8",
  "#E1EAF5",
  "#EFE5F4",
  "#FAEBCF",
  "#F6DFDE",
  "#FFFFFF",
  "#F44336",
  "#FF9800",
  "#FFEB3B",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#A855F7",
  "#EC4899",
];
export function makeMap(layout = "radial"): MapData {
  return { title: "", display: "preview", layout, nodes: [], links: [] };
}
export function startMap(data: MapData, title: string): MapData {
  if (data.nodes.length || !title.trim()) return data;
  const text = title.trim().slice(0, 200);
  const node = independentIdea(data, { x: 0, y: 0 })!;
  return {
    ...data,
    title: text,
    centerId: node.id,
    nodes: [{ ...node, text, bold: true, size: 20 }],
    links: [],
  };
}
export function arrange(data: MapData, layout: string): MapData {
  const source = data.nodes.map((n) => ({
    ...n,
    row:
      !!n.parent &&
      ["above", "below"].includes(
        data.nodes.find((p) => p.id === n.parent)?.childrenSide || "",
      ),
  }));
  type Group = {
    nodes: Bubble[];
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  const bounds = (nodes: Bubble[]): Group => ({
    nodes,
    left: Math.min(...nodes.map((n) => n.x - nodeWidth(data.theme) / 2)),
    right: Math.max(...nodes.map((n) => n.x + nodeWidth(data.theme) / 2)),
    top: Math.min(...nodes.map((n) => n.y - nodeHeight(n, data.theme) / 2)),
    bottom: Math.max(...nodes.map((n) => n.y + nodeHeight(n, data.theme) / 2)),
  });
  const shift = (g: Group, x: number, y: number) =>
    bounds(g.nodes.map((n) => ({ ...n, x: n.x + x, y: n.y + y })));
  const build = (
    id: string,
    sign: number,
    seen: Set<string>,
    central = false,
  ): Group => {
    const n = { ...source.find((n) => n.id === id)!, x: 0, y: 0 };
    if (seen.has(id)) return bounds([n]);
    const nextSeen = new Set([...seen, id]);
    const children = source.filter((c) => c.parent === id);
    const result: Bubble[] = [n];
    if (n.childrenSide === "above" || n.childrenSide === "below") {
      const direction = n.childrenSide === "above" ? -1 : 1;
      let cursor = direction * (nodeHeight(n, data.theme) / 2 + 70);
      for (const c of children) {
        const g = build(c.id, sign, nextSeen);
        const placed = shift(
          g,
          44,
          cursor - (direction === 1 ? g.top : g.bottom),
        );
        result.push(...placed.nodes);
        cursor += direction * (g.bottom - g.top + 70);
      }
    } else if (central && ["radial", "orbit"].includes(layout)) {
      const groups = children.map((c, i) => {
        const angle =
          -Math.PI / 2 + (i * Math.PI * 2) / Math.max(1, children.length);
        return {
          angle,
          g: build(c.id, Math.cos(angle) < 0 ? -1 : 1, nextSeen),
        };
      });
      let radius = layout === "orbit" ? 400 : 330,
        placed: Group[] = [];
      for (let attempt = 0; attempt < 120; attempt++) {
        placed = groups.map(({ g, angle }) =>
          shift(
            g,
            Math.cos(angle) * radius - (g.left + g.right) / 2,
            Math.sin(angle) * radius - (g.top + g.bottom) / 2,
          ),
        );
        const all = [bounds([n]), ...placed];
        if (
          !all.some((a, i) =>
            all
              .slice(i + 1)
              .some(
                (b) =>
                  a.left < b.right + 70 &&
                  a.right + 70 > b.left &&
                  a.top < b.bottom + 70 &&
                  a.bottom + 70 > b.top,
              ),
          )
        )
          break;
        radius += 80;
      }
      result.push(...placed.flatMap((g) => g.nodes));
    } else if (layout === "flow") {
      let cursor = nodeWidth(data.theme) / 2 + 120;
      for (const c of children) {
        const g = build(c.id, 1, nextSeen);
        const placed = shift(g, cursor - g.left, -(g.top + g.bottom) / 2);
        result.push(...placed.nodes);
        cursor = placed.right + 100;
      }
    } else if (layout === "org") {
      const groups = children.map((c) => build(c.id, 1, nextSeen));
      let cursor =
        -groups.reduce((sum, g) => sum + g.right - g.left + 85, 0) / 2;
      for (const g of groups) {
        const placed = shift(
          g,
          cursor - g.left,
          nodeHeight(n, data.theme) / 2 + 100 - g.top,
        );
        result.push(...placed.nodes);
        cursor += g.right - g.left + 85;
      }
    } else {
      const sides = central && layout === "bilateral" ? [-1, 1] : [sign];
      for (const side of sides) {
        const list = children.filter(
          (_, i) => sides.length === 1 || (i % 2 === 0 ? 1 : -1) === side,
        );
        const groups = list.map((c) => build(c.id, side, nextSeen));
        let cursor =
          -groups.reduce((sum, g) => sum + g.bottom - g.top + 75, 0) / 2;
        for (const g of groups) {
          const dx =
            side === 1
              ? nodeWidth(data.theme) / 2 + 110 - g.left
              : -nodeWidth(data.theme) / 2 - 110 - g.right;
          const placed = shift(g, dx, cursor - g.top);
          result.push(...placed.nodes);
          cursor += g.bottom - g.top + 75;
        }
      }
    }
    return bounds(result);
  };
  const roots = source.filter(
    (n) => !n.parent || !source.some((p) => p.id === n.parent),
  );
  const placed: Bubble[] = [],
    groups = roots.map((root) => build(root.id, 1, new Set(), true));
  const columns = Math.max(1, Math.ceil(Math.sqrt(groups.length)));
  let top = 0;
  for (let row = 0; row < groups.length; row += columns) {
    const line = groups.slice(row, row + columns);
    let left = -line.reduce((sum, g) => sum + g.right - g.left + 180, 0) / 2;
    for (const g of line) {
      const moved = shift(g, left - g.left, top - g.top);
      placed.push(...moved.nodes);
      left = moved.right + 180;
    }
    top += Math.max(...line.map((g) => g.bottom - g.top)) + 200;
  }
  const anchor = placed.find((n) => n.id === roots[0]?.id);
  const dx = anchor?.x || 0,
    dy = anchor?.y || 0;
  return {
    ...data,
    layout,
    nodes: source.map((n) => {
      const pos = placed.find((p) => p.id === n.id);
      return pos ? { ...pos, x: pos.x - dx, y: pos.y - dy } : n;
    }),
  };
}
export function mapSignature(data: MapData) {
  let hash = 2166136261;
  const text =
    "geometry-v3:" +
    JSON.stringify(
      data.nodes.map((n) => [
        n.id,
        n.parent,
        n.childrenSide,
        n.row,
        n.text,
        n.note,
        n.content,
        n.size,
      ]),
    );
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
export function redistribute(data: MapData): MapData {
  return { ...arrange(data, data.layout), scenes: {} };
}

/** Stack siblings as independent, underlined rows. Move their whole subtrees,
 * so adding a sibling never leaves existing descendants behind. */
export function stackChildRows(data: MapData, onlyParent?: string): MapData {
  if (onlyParent) {
    let id = data.nodes.find((n) => n.id === onlyParent)?.parent || "";
    const seen = new Set<string>();
    while (id && !seen.has(id)) {
      seen.add(id);
      const ancestor = data.nodes.find((n) => n.id === id);
      if (!ancestor) break;
      if (
        ancestor.childrenSide === "above" ||
        ancestor.childrenSide === "below"
      )
        onlyParent = ancestor.id;
      id = ancestor.parent;
    }
  }
  const nodes = data.nodes.map((n) => ({ ...n }));
  const descendants = (id: string): Bubble[] => {
    const result: Bubble[] = [],
      seen = new Set([id]),
      pending = [id];
    while (pending.length) {
      const parent = pending.pop()!;
      for (const child of nodes.filter((n) => n.parent === parent)) {
        if (seen.has(child.id)) continue;
        seen.add(child.id);
        result.push(child);
        pending.push(child.id);
      }
    }
    return result;
  };
  const done = new Set<string>();
  const place = (parent: Bubble) => {
    if (done.has(parent.id)) return;
    done.add(parent.id);
    const children = nodes.filter((n) => n.parent === parent.id);
    children.forEach(place);
    if (parent.childrenSide !== "above" && parent.childrenSide !== "below")
      return;
    const sign = parent.childrenSide === "above" ? -1 : 1;
    let cursor = parent.y + sign * (nodeHeight(parent, data.theme) / 2 + 64);
    for (const child of children) {
      child.row = true;
      const group = [child, ...descendants(child.id)];
      const top = Math.min(
        ...group.map((n) => n.y - nodeHeight(n, data.theme) / 2),
      );
      const bottom = Math.max(
        ...group.map((n) => n.y + nodeHeight(n, data.theme) / 2),
      );
      const dy = cursor - (sign === 1 ? top : bottom),
        dx = parent.x + 44 - child.x;
      for (const n of group) {
        n.x += dx;
        n.y += dy;
      }
      cursor += sign * (bottom - top + 64);
    }
  };
  if (onlyParent) {
    const p = nodes.find((n) => n.id === onlyParent);
    if (p) place(p);
  } else nodes.filter((n) => !n.parent).forEach(place);
  // Make room for a vertical list instead of drawing it over a neighbouring
  // branch. Other ideas move with their descendants; ancestry never changes.
  const rowParents = onlyParent
    ? nodes.filter((n) => n.id === onlyParent)
    : nodes.filter(
        (n) => n.childrenSide === "above" || n.childrenSide === "below",
      );
  const box = (n: Bubble) => ({
    left: n.x - nodeWidth(data.theme) / 2 - 20,
    right: n.x + nodeWidth(data.theme) / 2 + 20,
    top: n.y - nodeHeight(n, data.theme) / 2 - 20,
    bottom: n.y + nodeHeight(n, data.theme) / 2 + 20,
  });
  for (const parent of rowParents) {
    if (parent.childrenSide !== "above" && parent.childrenSide !== "below")
      continue;
    const group = [parent, ...descendants(parent.id)],
      protectedIds = new Set(group.map((n) => n.id));
    const ancestors = new Set<string>();
    let id = parent.parent;
    while (id && !ancestors.has(id)) {
      ancestors.add(id);
      id = nodes.find((n) => n.id === id)?.parent || "";
    }
    const sign = parent.childrenSide === "above" ? -1 : 1;
    const candidates = nodes
      .filter(
        (n) =>
          !protectedIds.has(n.id) &&
          !ancestors.has(n.id) &&
          (!n.parent || ancestors.has(n.parent)),
      )
      .sort((a, b) => sign * (a.y - b.y));
    const obstacles = [...group];
    for (const root of candidates) {
      const branch = [root, ...descendants(root.id)];
      const collides = () =>
        branch.some((n) => {
          const a = box(n);
          return obstacles.some((other) => {
            const b = box(other);
            return (
              a.left < b.right &&
              a.right > b.left &&
              a.top < b.bottom &&
              a.bottom > b.top
            );
          });
        });
      if (collides()) {
        const edge =
          sign === 1
            ? Math.max(...obstacles.map((n) => box(n).bottom))
            : Math.min(...obstacles.map((n) => box(n).top));
        const near =
          sign === 1
            ? Math.min(...branch.map((n) => box(n).top))
            : Math.max(...branch.map((n) => box(n).bottom));
        const dy = edge + sign * 30 - near;
        for (const n of branch) n.y += dy;
      }
      obstacles.push(...branch);
    }
  }
  return { ...data, nodes };
}

export function setChildSide(
  data: MapData,
  parentId: string,
  side: ChildSide,
): MapData {
  const changed = {
    ...data,
    nodes: data.nodes.map((n) =>
      n.id === parentId
        ? { ...n, childrenSide: side }
        : n.parent === parentId
          ? { ...n, row: side !== "auto" }
          : n,
    ),
  };
  // Explicitly returning to the template only reorganises this parent's subtree.
  if (side === "auto") {
    const arranged = arrange(changed, data.layout),
      ids = new Set([parentId]);
    for (let i = 0; i < changed.nodes.length; i++)
      for (const n of changed.nodes) if (ids.has(n.parent)) ids.add(n.id);
    const origin = data.nodes.find((n) => n.id === parentId)!;
    const anchor = arranged.nodes.find((n) => n.id === parentId)!;
    return {
      ...changed,
      nodes: changed.nodes.map((n) =>
        ids.has(n.id) && n.id !== parentId
          ? {
              ...n,
              x:
                arranged.nodes.find((a) => a.id === n.id)!.x +
                origin.x -
                anchor.x,
              y:
                arranged.nodes.find((a) => a.id === n.id)!.y +
                origin.y -
                anchor.y,
            }
          : n,
      ),
    };
  }
  return stackChildRows(changed, parentId);
}

export function appendChildRows(
  data: MapData,
  parentId: string,
  labels: string[],
  side: "above" | "below",
): MapData {
  let next = data;
  for (const label of labels
    .map((text) => text.trim())
    .filter(Boolean)
    .slice(0, 300 - data.nodes.length)) {
    const child = childIdea(next, parentId, undefined, side);
    if (!child) break;
    next = {
      ...next,
      nodes: [
        ...next.nodes,
        placeChildIdea(next, { ...child, text: label.slice(0, 1500) }, side),
      ],
    };
  }
  return next;
}

function switchScene(data: MapData, theme: string, layout: string): MapData {
  const oldKey = (data.theme || "cards") + ":" + data.layout,
    key = theme + ":" + layout;
  const scenes = {
    ...data.scenes,
    [oldKey]: {
      signature: mapSignature(data),
      positions: Object.fromEntries(
        data.nodes.map((n) => [n.id, { x: n.x, y: n.y }]),
      ),
    },
  };
  const target = { ...data, theme, layout },
    cached = scenes[key];
  if (
    cached?.signature === mapSignature(data) &&
    data.nodes.every((n) => cached.positions[n.id])
  )
    return {
      ...target,
      scenes,
      nodes: data.nodes.map((n) => ({ ...n, ...cached.positions[n.id] })),
    };
  return { ...arrange(target, layout), scenes };
}
export function switchLayout(data: MapData, layout: string): MapData {
  return layout === data.layout
    ? data
    : switchScene(data, data.theme || "cards", layout);
}
export function canParent(
  data: MapData,
  child: string,
  parent: string,
): boolean {
  if (child === parent || !data.nodes.some((n) => n.id === parent))
    return false;
  const seen = new Set<string>();
  let id = parent;
  while (id) {
    if (id === child || seen.has(id)) return false;
    seen.add(id);
    id = data.nodes.find((n) => n.id === id)?.parent || "";
  }
  return true;
}
// Adding a child only positions the new node. Existing geometry and styling
// change exclusively through deliberate layout commands.
export function placeChildIdea(
  data: MapData,
  node: Bubble,
  side: ChildSide,
): Bubble {
  const parent = data.nodes.find((n) => n.id === node.parent)!;
  const sign = side === "above" ? -1 : 1;
  const placed = {
    ...node,
    x: parent.x + 44,
    y:
      parent.y +
      sign *
        ((nodeHeight(parent, data.theme) + nodeHeight(node, data.theme)) / 2 +
          36),
  };
  for (let attempt = 0; attempt <= data.nodes.length; attempt++) {
    const overlaps = data.nodes.filter(
      (n) =>
        Math.abs(n.x - placed.x) < nodeWidth(data.theme) + 24 &&
        Math.abs(n.y - placed.y) <
          (nodeHeight(n, data.theme) + nodeHeight(placed, data.theme)) / 2 + 28,
    );
    if (!overlaps.length) break;
    placed.y =
      sign > 0
        ? Math.max(
            ...overlaps.map(
              (n) =>
                n.y +
                (nodeHeight(n, data.theme) + nodeHeight(placed, data.theme)) /
                  2 +
                36,
            ),
          )
        : Math.min(
            ...overlaps.map(
              (n) =>
                n.y -
                (nodeHeight(n, data.theme) + nodeHeight(placed, data.theme)) /
                  2 -
                36,
            ),
          );
  }
  return placed;
}
export function childIdea(
  data: MapData,
  parentId: string,
  point?: { x: number; y: number },
  side?: ChildSide,
): Bubble | null {
  if (data.nodes.length >= 300) return null;
  const p = data.nodes.find((n) => n.id === parentId);
  if (!p) return null;
  const node: Bubble = {
    id: crypto.randomUUID(),
    parent: p.id,
    text: "Nouvelle idée",
    note: "",
    content: "",
    media: [],
    childrenSide: "auto",
    outline: "auto",
    row: !point,
    x: 0,
    y: 0,
    fill: p.fill,
    ink: p.ink,
    line: p.line,
    bold: false,
    italic: false,
    size: 16,
    url: "",
  };
  if (point) return { ...node, ...freeIdeaPoint(data, point) };
  return placeChildIdea(
    data,
    node,
    side || (p.childrenSide === "above" ? "above" : "below"),
  );
}

export function switchTheme(data: MapData, theme: string): MapData {
  if ((data.theme || "cards") === theme) return data;
  // A visual style never silently changes the chosen spatial layout.
  return switchScene(data, theme, data.layout);
}
export function independentIdea(
  data: MapData,
  point: { x: number; y: number },
): Bubble | null {
  if (data.nodes.length >= 300) return null;
  return {
    id: crypto.randomUUID(),
    parent: "",
    text: "Nouvelle idée",
    note: "",
    content: "",
    x: point.x,
    y: point.y,
    fill: colors[0],
    ink: "#243A36",
    line: "#73988B",
    bold: false,
    italic: false,
    size: 18,
    url: "",
    row: false,
    childrenSide: "auto",
  };
}
export function reparentIdea(
  data: MapData,
  id: string,
  parent: string,
): MapData {
  if (parent && !canParent(data, id, parent)) return data;
  return redistribute({
    ...data,
    nodes: data.nodes.map((n) =>
      n.id === id ? { ...n, parent, row: false } : n,
    ),
  });
}
export function zoomAt(
  pan: { x: number; y: number },
  zoom: number,
  point: { x: number; y: number },
  factor: number,
) {
  const z = Math.max(0.03, Math.min(12, zoom * factor));
  return {
    zoom: z,
    pan: {
      x: point.x - ((point.x - pan.x) * z) / zoom,
      y: point.y - ((point.y - pan.y) * z) / zoom,
    },
  };
}

export function defaultFolds(data: MapData): string[] {
  return data.theme === "organic"
    ? data.nodes
        .filter((n) => n.parent && data.nodes.some((c) => c.parent === n.id))
        .map((n) => n.id)
    : [];
}
export function visibleMapNodes(data: MapData, collapsed: string[]): Bubble[] {
  return data.nodes.filter((n) => {
    const seen = new Set<string>();
    let parent = n.parent;
    while (parent) {
      if (collapsed.includes(parent) || seen.has(parent)) return false;
      seen.add(parent);
      parent = data.nodes.find((p) => p.id === parent)?.parent || "";
    }
    return true;
  });
}

export function freeIdeaPoint(data: MapData, origin: { x: number; y: number }) {
  for (let ring = 0; ring < 40; ring++)
    for (let step = 0; step < (ring ? 8 : 1); step++) {
      const angle = (step * Math.PI) / 4,
        point = {
          x: origin.x + Math.cos(angle) * ring * (nodeWidth(data.theme) + 70),
          y: origin.y + Math.sin(angle) * ring * 200,
        };
      if (
        !data.nodes.some(
          (n) =>
            Math.abs(n.x - point.x) < nodeWidth(data.theme) + 35 &&
            Math.abs(n.y - point.y) < (nodeHeight(n, data.theme) + 90) / 2 + 35,
        )
      )
        return point;
    }
  return { x: origin.x, y: origin.y + 10000 };
}

export function redistributeAround(data: MapData, id: string): MapData {
  if (!data.nodes.some((n) => n.id === id)) return redistribute(data);
  const original = new Map(data.nodes.map((n) => [n.id, n.parent]));
  const parents = new Map(original);
  let child = id,
    parent = parents.get(id) || "";
  parents.set(id, "");
  const seen = new Set([id]);
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const next = original.get(parent) || "";
    parents.set(parent, child);
    child = parent;
    parent = next;
  }
  const view = arrange(
    {
      ...data,
      nodes: data.nodes
        .map((n) => ({
          ...n,
          parent: parents.get(n.id) || "",
          childrenSide: "auto" as ChildSide,
          row: false,
        }))
        .sort((a, b) => (a.id === id ? -1 : b.id === id ? 1 : 0)),
    },
    data.layout,
  );
  const center = view.nodes.find((n) => n.id === id)!;
  return {
    ...data,
    centerId: id,
    scenes: {},
    nodes: data.nodes.map((n) => {
      const p = view.nodes.find((p) => p.id === n.id)!;
      return { ...n, x: p.x - center.x, y: p.y - center.y };
    }),
  };
}
