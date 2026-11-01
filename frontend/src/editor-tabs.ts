export function readEditorTabs(raw: string | null): string[] {
  try {
    const ids = JSON.parse(raw || "[]");
    return Array.isArray(ids)
      ? [
          ...new Set(
            ids.filter(
              (id): id is string =>
                typeof id === "string" && /^[a-f0-9-]{36}$/.test(id),
            ),
          ),
        ].slice(-32)
      : [];
  } catch {
    return [];
  }
}
export function addEditorTab(ids: string[], id: string) {
  return ids.includes(id) ? ids : [...ids, id].slice(-32);
}
export function nextEditorTab(ids: string[], id: string) {
  const i = ids.indexOf(id);
  return ids[i + 1] || ids[i - 1] || null;
}
