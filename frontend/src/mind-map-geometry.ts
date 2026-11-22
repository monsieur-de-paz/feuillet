import type { Bubble, MapData } from "./mind-map-model";
export function wordLines(text: string, limit = 23) {
  const result = [""];
  for (const word of text.split(/(\n)|[^\S\n]+/).filter((part): part is string => part !== undefined)) {
    if(word === "\n"){result.push("");continue;}
    for (const part of word.match(new RegExp(".{1," + limit + "}", "gu")) || [
      "",
    ]) {
      if (result.at(-1) && (result.at(-1) + " " + part).length > limit)
        result.push(part);
      else result[result.length - 1] += (result.at(-1) ? " " : "") + part;
    }
  }
  return result;
}
export const nodeWidth = (theme?: string) => (theme === "organic" ? 300 : 240);
export function titleLines(n: Bubble, theme?: string) {
  const font = Math.max(
    theme === "branches" || theme === "classic" ? 20 : 0,
    n.size * 1.2,
  );
  return wordLines(
    n.text,
    Math.max(8, Math.floor((nodeWidth(theme) - 40) / (font * 0.6))),
  );
}
export function nodeHeight(n: Bubble, theme?: string) {
  const hasContent = n.content || n.media?.length;
  const body =
    n.note ||
    (theme === "organic" && n.parent && !n.row
      ? n.content?.slice(0, 120) || ""
      : "");
  return Math.max(
    n.row
      ? hasContent
        ? 94
        : 64
      : theme === "organic" && n.parent
        ? 145
        : hasContent
          ? 94
          : 74,
    titleLines(n, theme).length * 24 +
      24 +
      (body
        ? wordLines(body, theme === "organic" ? 33 : 27).length * 19 + 28
        : hasContent
          ? 28
          : 0),
  );
}
export function branchColor(data: MapData, n: Bubble) {
  if (
    !data.theme ||
    data.theme === "cards" ||
    n.line.toUpperCase() !== "#73988B"
  )
    return n.line;
  const seen = new Set<string>();
  let first = n;
  while (first.parent) {
    if (seen.has(first.id)) break;
    seen.add(first.id);
    const parent = data.nodes.find((p) => p.id === first.parent);
    if (!parent || !parent.parent) break;
    first = parent;
  }
  const branches = data.nodes.filter(
    (p) => p.parent && !data.nodes.find((r) => r.id === p.parent)?.parent,
  );
  const index = Math.max(
    0,
    branches.findIndex((p) => p.id === first.id),
  );
  return ["#078D9F", "#1669CC", "#D94F63", "#CE8A18", "#7651A6", "#29884D"][
    index % 6
  ];
}
export function underlined(data: MapData, n: Bubble) {
  return (
    !!n.parent &&
    (n.outline === "underline" ||
      (n.outline !== "box" &&
        (n.row ||
          data.theme === "branches" ||
          (data.theme === "classic" &&
            !!data.nodes.find((p) => p.id === n.parent)?.parent))))
  );
}
export function linkPath(data: MapData, p: Bubble, n: Bubble) {
  if (n.row && (p.childrenSide === "above" || p.childrenSide === "below")) {
    const side = p.childrenSide === "above" ? -1 : 1;
    const sx = p.x - nodeWidth(data.theme) / 2 + (underlined(data, p) ? 0 : 12);
    const sy = underlined(data, p)
      ? p.y + nodeHeight(p, data.theme) / 2 - 12
      : p.y + (side * nodeHeight(p, data.theme)) / 2;
    const tx = n.x - nodeWidth(data.theme) / 2;
    const ty = n.y + nodeHeight(n, data.theme) / 2 - 12;
    const elbow = Math.min(sx, tx) - 18;
    return `M${sx},${sy} Q${elbow},${sy} ${elbow},${sy + side * 18} V${ty - side * 12} Q${elbow},${ty} ${elbow + 12},${ty} H${tx}`;
  }
  if (
    data.theme !== "organic" &&
    Math.abs(n.y - p.y) > Math.abs(n.x - p.x) &&
    !n.row
  ) {
    const sign = n.y < p.y ? -1 : 1;
    const sx = underlined(data, p) ? p.x - nodeWidth(data.theme) / 2 : p.x,
      sy = underlined(data, p)
        ? p.y + nodeHeight(p, data.theme) / 2 - 12
        : p.y + (sign * nodeHeight(p, data.theme)) / 2;
    const tx = underlined(data, n) ? n.x - nodeWidth(data.theme) / 2 : n.x,
      ty = underlined(data, n)
        ? n.y + nodeHeight(n, data.theme) / 2 - 12
        : n.y - (sign * nodeHeight(n, data.theme)) / 2;
    return `M${sx},${sy} C${sx},${(sy + ty) / 2} ${tx},${(sy + ty) / 2} ${tx},${ty}`;
  }
  if (data.theme === "organic") {
    const dx = n.x - p.x,
      dy = n.y - p.y,
      length = Math.max(1, Math.hypot(dx, dy)),
      ux = dx / length,
      uy = dy / length;
    const sx = p.x + (ux * nodeWidth(data.theme)) / 2,
      sy = p.y + (uy * nodeHeight(p, data.theme)) / 2;
    const tx = n.x - ux * (nodeWidth(data.theme) / 2 + 8),
      ty = n.y - uy * (nodeHeight(n, data.theme) / 2 + 8);
    return `M${sx},${sy} Q${(sx + tx) / 2 - dy * 0.08},${(sy + ty) / 2 + dx * 0.08} ${tx},${ty}`;
  }
  const width = nodeWidth(data.theme),
    sign = n.x < p.x ? -1 : 1;
  const sy = underlined(data, p)
      ? p.y + nodeHeight(p, data.theme) / 2 - 12
      : p.y,
    ty = underlined(data, n) ? n.y + nodeHeight(n, data.theme) / 2 - 12 : n.y;
  const sx = p.x + (sign * width) / 2,
    tx = n.x - (sign * width) / 2;
  return `M${sx},${sy} C${(sx + tx) / 2},${sy} ${(sx + tx) / 2},${ty} ${tx},${ty}`;
}
export function contrast(color: string) {
 const channels=[0,2,4].map(i=>parseInt(color.replace('#','').slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
 const luminance=.2126*channels[0]+.7152*channels[1]+.0722*channels[2];
 return (luminance+.05)/.05 >= 1.05/(luminance+.05) ? '#000000' : '#FFFFFF';
}
