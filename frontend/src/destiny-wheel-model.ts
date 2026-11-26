import type { CellValue } from "./database-types";
export type WheelEntry = { id: string; label: string };
export type WheelDraw = WheelEntry & {
  drawId: string;
  at: string;
  decision?: string;
};
export type WheelData = {
  warning?: string | null;
  state: {
    revision: number;
    excluded: string[];
    history: WheelDraw[];
    pending: WheelDraw | null;
  };
  entries: WheelEntry[];
  total: number;
  groups: { key: string; label: string; value: CellValue }[];
};
export function wheelTarget(rotation: number, index: number, count: number) {
  const target = (360 - ((index + 0.5) * 360) / count) % 360;
  return rotation + ((360 - (rotation % 360)) % 360) + 360 * 5 + target;
}
export function columnText(
  rows: { values: Record<string, CellValue> }[],
  property: string,
) {
  return rows
    .map((r) => r.values[property])
    .filter(
      (v) =>
        v !== null &&
        v !== undefined &&
        v !== "" &&
        (!Array.isArray(v) || v.length),
    )
    .map((v) =>
      (Array.isArray(v)
        ? v.join(", ")
        : typeof v === "boolean"
          ? v
            ? "Oui"
            : "Non"
          : String(v)
      ).replace(/[\r\n]+/g, " "),
    )
    .join("\n");
}
export function wheelLabel(label: string, count: number): string[] {
  const limit = count > 30 ? 16 : 22,
    max = count > 16 ? 1 : 2,
    lines = [""];
  for (const word of label.trim().split(/\s+/)) {
    for (const part of word.match(new RegExp(".{1," + limit + "}", "gu")) || [
      "",
    ]) {
      if (lines.at(-1) && lines.at(-1)!.length + part.length + 1 > limit)
        lines.push("");
      lines[lines.length - 1] += (lines.at(-1) ? " " : "") + part;
    }
  }
  const shown = lines.slice(0, max);
  if (lines.length > max)
    shown[max - 1] = shown[max - 1].slice(0, limit - 1) + "…";
  return shown;
}
