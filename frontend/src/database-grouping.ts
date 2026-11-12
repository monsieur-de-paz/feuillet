import type { CellValue } from "./database-types";
export function groupRecords<T>(
  rows: T[],
  value: (row: T) => CellValue | undefined,
): { key: string; label: string; rows: T[] }[] {
  const map = new Map<string, { key: string; label: string; rows: T[] }>();
  for (const row of rows) {
    const v = value(row),
      empty =
        v === null ||
        v === undefined ||
        v === "" ||
        (Array.isArray(v) && !v.length);
    const normalized = empty ? null : Array.isArray(v) ? [...v].sort() : v;
    const key = JSON.stringify(normalized),
      label = empty
        ? "Non renseigné"
        : typeof v === "boolean"
          ? v
            ? "Oui"
            : "Non"
          : Array.isArray(normalized)
            ? normalized.join(" · ")
            : String(v);
    if (!map.has(key)) map.set(key, { key, label, rows: [] });
    map.get(key)!.rows.push(row);
  }
  return [...map.values()].sort((a, b) =>
    a.key === "null"
      ? 1
      : b.key === "null"
        ? -1
        : a.label.localeCompare(b.label, "fr", {
            numeric: true,
            sensitivity: "base",
          }),
  );
}
