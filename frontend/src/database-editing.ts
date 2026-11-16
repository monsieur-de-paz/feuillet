import type { CellValue, DatabaseRow } from "./database-types";

export class CellEditConflict extends Error {
  constructor() {
    super(
      "Cette cellule a changé pendant la saisie. Votre texte est conservé ; rechargez la valeur pour comparer.",
    );
  }
}
const pending = new Map<string, Promise<DatabaseRow>>();
const latest = new Map<string, DatabaseRow>();
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Serialize rapid Tab edits on one row without dropping optimistic version checks. */
export function queueCellPatch(
  base: DatabaseRow,
  propertyId: string,
  value: CellValue,
  persist: (version: number) => Promise<DatabaseRow>,
): Promise<DatabaseRow> {
  const key = `${base.db_id}:${base.id}`;
  const previous = pending.get(key);
  const job = (
    previous ? previous.catch(() => undefined) : Promise.resolve()
  ).then(async () => {
    const saved = latest.get(key);
    const current = saved && saved.version > base.version ? saved : base;
    if (!same(current.values[propertyId], base.values[propertyId]))
      throw new CellEditConflict();
    const result = await persist(current.version);
    latest.delete(key);
    latest.set(key, result);
    if (latest.size > 200) latest.delete(latest.keys().next().value!);
    return result;
  });
  pending.set(key, job);
  void job
    .finally(() => {
      if (pending.get(key) === job) pending.delete(key);
    })
    .catch(() => {});
  return job;
}
