import { independentIdea, type Bubble, type MapData } from "./mind-map-model";
import { nodeHeight, nodeWidth } from "./mind-map-geometry";
const prefix = "FEUILLET_MIND_MAP_V1\n";
export type IdeaClipboard = Pick<MapData, "nodes" | "links">;
export function copyIdeas(data: MapData, ids: string[]): IdeaClipboard {
  const chosen = new Set(ids);
  return structuredClone({
    nodes: data.nodes
      .filter((n) => chosen.has(n.id))
      .map((n) => ({ ...n, parent: chosen.has(n.parent) ? n.parent : "" })),
    links: data.links.filter((l) => chosen.has(l.from) && chosen.has(l.to)),
  });
}
export function encodeIdeas(clip: IdeaClipboard): string {
  return prefix + JSON.stringify(clip);
}
export function decodeIdeas(text: string): IdeaClipboard | null {
  if (!text.startsWith(prefix) || text.length > 8_000_000) return null;
  try {
    const c = JSON.parse(text.slice(prefix.length));
    if (
      !Array.isArray(c.nodes) ||
      !c.nodes.length ||
      c.nodes.length > 300 ||
      !Array.isArray(c.links) ||
      c.links.length > 1500
    )
      return null;
    const ids = new Set<string>();
    for (const n of c.nodes) {
      if (
        !n ||
        typeof n.id !== "string" ||
        !n.id ||
        ids.has(n.id) ||
        typeof n.parent !== "string" ||
        typeof n.text !== "string" ||
        n.text.length > 1500 ||
        !Number.isFinite(n.x) ||
        !Number.isFinite(n.y) ||
        Math.abs(n.x) > 1e7 ||
        Math.abs(n.y) > 1e7
      )
        return null;
      ids.add(n.id);
      if (
        ![n.fill, n.ink, n.line].every(
          (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v),
        ) ||
        typeof n.bold !== "boolean" ||
        typeof n.italic !== "boolean" ||
        !Number.isFinite(n.size) ||
        n.size < 8 ||
        n.size > 72 ||
        typeof n.url !== "string"
      )
        return null;
      if (
        [n.note, n.content].some(
          (v) =>
            v !== undefined && (typeof v !== "string" || v.length > 200000),
        )
      )
        return null;
      if (
        n.media !== undefined &&
        (!Array.isArray(n.media) ||
          n.media.length > 20 ||
          n.media.some(
            (m: any) =>
              !m ||
              !["file", "link", "video", "form"].includes(m.kind) ||
              typeof m.title !== "string" ||
              Object.values(m).some(
                (v) => typeof v !== "string" && typeof v !== "boolean",
              ),
          ))
      )
        return null;
      if (
        n.outline !== undefined &&
        !["auto", "underline", "box"].includes(n.outline)
      )
        return null;
      if (
        n.childrenSide !== undefined &&
        !["auto", "above", "below"].includes(n.childrenSide)
      )
        return null;
      if (n.row !== undefined && typeof n.row !== "boolean") return null;
    }
    for (const n of c.nodes) {
      const seen = new Set([n.id]);
      let parent = n.parent;
      while (parent) {
        if (!ids.has(parent) || seen.has(parent)) return null;
        seen.add(parent);
        parent = c.nodes.find((v: Bubble) => v.id === parent).parent;
      }
    }
    if (
      c.links.some(
        (l: any) =>
          !l ||
          !ids.has(l.from) ||
          !ids.has(l.to) ||
          typeof l.color !== "string" ||
          !/^#[0-9a-f]{6}$/i.test(l.color),
      )
    )
      return null;
    // Explicit fields avoid retaining foreign object properties from the clipboard.
    return {
      nodes: c.nodes.map((n: Bubble) => ({
        id: n.id,
        parent: n.parent,
        text: n.text,
        x: n.x,
        y: n.y,
        fill: n.fill,
        ink: n.ink,
        line: n.line,
        bold: n.bold,
        italic: n.italic,
        size: n.size,
        url: n.url,
        note: n.note,
        content: n.content,
        childrenSide: n.childrenSide,
        row: n.row,
        outline: n.outline,
        media: n.media?.map((m) => ({
          kind: m.kind,
          title: m.title,
          fileId: m.fileId,
          mime: m.mime,
          url: m.url,
          src: m.src,
          player: m.player,
          token: m.token,
        })),
      })),
      links: c.links.map((l: MapData["links"][number]) => ({
        from: l.from,
        to: l.to,
        color: l.color,
      })),
    };
  } catch {
    return null;
  }
}
export function pasteIdeas(
  data: MapData,
  clip: IdeaClipboard,
  at: { x: number; y: number },
): { data: MapData; ids: string[] } | null {
  if (!clip.nodes.length || data.nodes.length + clip.nodes.length > 300)
    return null;
  const ids = new Map(clip.nodes.map((n) => [n.id, crypto.randomUUID()]));
  const center = {
    x: clip.nodes.reduce((a, n) => a + n.x, 0) / clip.nodes.length,
    y: clip.nodes.reduce((a, n) => a + n.y, 0) / clip.nodes.length,
  };
  let dx = at.x - center.x,
    dy = at.y - center.y;
  // Move the pasted group as a whole; preserve its internal geometry.
  for (
    let attempt = 0;
    attempt <= data.nodes.length * clip.nodes.length;
    attempt++
  ) {
    const collisions = clip.nodes.flatMap((n) =>
      data.nodes
        .filter(
          (o) =>
            Math.abs(o.x - n.x - dx) < nodeWidth(data.theme) + 24 &&
            Math.abs(o.y - n.y - dy) <
              (nodeHeight(o, data.theme) + nodeHeight(n, data.theme)) / 2 + 28,
        )
        .map(
          (o) =>
            o.y +
            (nodeHeight(o, data.theme) + nodeHeight(n, data.theme)) / 2 +
            36 -
            n.y,
        ),
    );
    if (!collisions.length) break;
    dy = Math.max(dy, ...collisions);
  }
  const nodes = structuredClone(clip.nodes).map((n) => ({
    ...n,
    id: ids.get(n.id)!,
    parent: ids.get(n.parent) || "",
    x: n.x + dx,
    y: n.y + dy,
  }));
  return {
    data: {
      ...data,
      nodes: [...data.nodes, ...nodes],
      links: [
        ...data.links,
        ...clip.links.map((l) => ({
          ...l,
          from: ids.get(l.from)!,
          to: ids.get(l.to)!,
        })),
      ],
    },
    ids: [...ids.values()],
  };
}
export function deleteIdeas(data: MapData, ids: string[]): MapData {
  const removed = new Set(ids);
  let nodes = data.nodes
    .filter((n) => !removed.has(n.id))
    .map((n) => {
      let parent = n.parent;
      while (removed.has(parent))
        parent = data.nodes.find((p) => p.id === parent)?.parent || "";
      return parent === n.parent ? n : { ...n, parent };
    });
  if (!nodes.length)
    nodes = [independentIdea({ ...data, nodes: [] }, { x: 0, y: 0 })!];
  return {
    ...data,
    nodes,
    links: data.links.filter((l) => !removed.has(l.from) && !removed.has(l.to)),
    centerId: removed.has(data.centerId || "") ? undefined : data.centerId,
  };
}
