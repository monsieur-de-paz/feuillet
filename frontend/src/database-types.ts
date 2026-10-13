import { api, ApiError, setCsrf, type FileRecord } from "./types";

export type PropertyType =
  | "title"
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "date"
  | "checkbox"
  | "email"
  | "phone"
  | "url"
  | "files"
  | "relation"
  | "formula"
  | "rollup";
export type CellValue = string | number | boolean | null | string[];
export type Database = {
  id: string;
  name: string;
  visibility: "private" | "public";
  version: number;
};
export type Property = {
  id: string;
  db_id: string;
  name: string;
  type: PropertyType;
  config: {
    options?: string[];
    target_db_id?: string;
    expression?: string;
    relation_property_id?: string;
    target_property_id?: string;
    operation?: string;
  };
  required: boolean;
  sort_order: number;
  version: number;
};
export type DatabaseRow = {
  id: string;
  db_id: string;
  values: Record<string, CellValue>;
  derived: Record<string, CellValue>;
  errors: Record<string, string>;
  visibility: "private" | "public";
  from_form: boolean;
  source_form_id: string | null;
  version: number;
};
export type DatabaseForm = {
  id: string;
  db_id: string;
  name: string;
  fields: string[];
  public: boolean;
  token: string;
  version: number;
};
export type DatabaseBundle = {
  database: Database;
  properties: Property[];
  rows: DatabaseRow[];
  forms: DatabaseForm[];
  files?: FileRecord[];
  relation_labels?: Record<string, string>;
};
export const propertyTypes: {
  type: PropertyType;
  label: string;
  symbol: string;
}[] = [
  { type: "title", label: "Titre", symbol: "Aa" },
  { type: "text", label: "Texte", symbol: "≡" },
  { type: "number", label: "Nombre", symbol: "#" },
  { type: "select", label: "Choix unique", symbol: "◉" },
  { type: "multiselect", label: "Choix multiples", symbol: "☷" },
  { type: "date", label: "Date", symbol: "◷" },
  { type: "checkbox", label: "Case à cocher", symbol: "☑" },
  { type: "email", label: "Adresse e-mail", symbol: "@" },
  { type: "phone", label: "Téléphone", symbol: "☎" },
  { type: "url", label: "Lien web", symbol: "↗" },
  { type: "files", label: "Fichiers", symbol: "📎" },
  { type: "relation", label: "Relation", symbol: "↔" },
  { type: "formula", label: "Formule", symbol: "ƒ" },
  { type: "rollup", label: "Agrégation", symbol: "∑" },
];
export const isComputed = (property: Property) =>
  property.type === "formula" || property.type === "rollup";
export const canUseInForm = (property: Property) =>
  !isComputed(property) && property.type !== "relation";
export function cellValue(row: DatabaseRow, property: Property): CellValue {
  return isComputed(property)
    ? (row.derived?.[property.id] ?? null)
    : (row.values?.[property.id] ?? null);
}
export function rowTitle(row: DatabaseRow, properties: Property[]): string {
  const labels = [
    ...properties.filter((property) => property.type === "title"),
    ...properties.filter((property) => property.type === "text"),
  ];
  for (const property of labels) {
    const value = cellValue(row, property);
    if (typeof value === "string" && value.trim()) return value;
  }
  return "Sans titre";
}
export function emptyValues(properties: Property[]): Record<string, CellValue> {
  return Object.fromEntries(
    properties
      .filter((p) => !isComputed(p))
      .map((p) => [
        p.id,
        p.type === "checkbox"
          ? false
          : ["multiselect", "relation", "files"].includes(p.type)
            ? []
            : p.type === "number"
              ? null
              : "",
      ]),
  );
}
export function formUrl(token: string) {
  return new URL(`index.php?form=${encodeURIComponent(token)}`, location.href)
    .href;
}
export function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Une erreur est survenue.";
}
export async function uploadAttachment(
  file: File,
  onProgress: (value: number) => void,
  token?: string,
): Promise<FileRecord> {
  const { csrf } = await api<{ csrf: string }>("session");
  setCsrf(csrf);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const data = new FormData();
    data.append("file", file);
    if (token) {
      data.append("token", token);
      data.append("website", "");
    }
    xhr.open("POST", `api.php?action=${token ? "form_upload" : "upload"}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-CSRF-Token", csrf);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let result;
      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        reject(
          new ApiError(
            "La réponse du serveur est illisible.",
            xhr.status,
            "invalid_response",
          ),
        );
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || result.error) {
        reject(
          new ApiError(
            result.error || "L’envoi a échoué.",
            xhr.status,
            result.code || "upload_error",
          ),
        );
        return;
      }
      onProgress(100);
      resolve(result.file);
    };
    xhr.onerror = () =>
      reject(new Error("La connexion a été interrompue pendant l’envoi."));
    xhr.onabort = () => reject(new Error("L’envoi a été annulé."));
    xhr.send(data);
  });
}

export type DatabaseFilterOperator =
  | "contains"
  | "equals"
  | "notEquals"
  | "isEmpty"
  | "isNotEmpty"
  | "gt"
  | "gte"
  | "lt"
  | "lte";
export type DatabaseViewFilter = {
  propertyId: string;
  operator: DatabaseFilterOperator;
  value: string | number | boolean;
};
export type DatabaseViewConfiguration = {
  layout: "table" | "gallery" | "chart";
  filters: DatabaseViewFilter[];
  sort: { propertyId: string; direction: "asc" | "desc" } | null;
  hiddenPropertyIds: string[];
};
export const defaultDatabaseView: DatabaseViewConfiguration = {
  layout: "table",
  filters: [],
  sort: null,
  hiddenPropertyIds: [],
};
const filterOperators: DatabaseFilterOperator[] = [
  "contains",
  "equals",
  "notEquals",
  "isEmpty",
  "isNotEmpty",
  "gt",
  "gte",
  "lt",
  "lte",
];
export function normalizeDatabaseView(
  input: unknown,
  properties?: Property[],
): DatabaseViewConfiguration {
  const source =
    input && typeof input === "object"
      ? (input as Partial<DatabaseViewConfiguration>)
      : {};
  const ids = properties
    ? new Set(properties.map((property) => property.id))
    : null;
  const validId = (id: unknown): id is string =>
    typeof id === "string" &&
    id.length > 0 &&
    id.length <= 100 &&
    (!ids || ids.has(id));
  const filters = (Array.isArray(source.filters) ? source.filters : [])
    .slice(0, 10)
    .filter(
      (filter) =>
        filter &&
        validId(filter.propertyId) &&
        filterOperators.includes(filter.operator),
    )
    .map((filter) => ({
      propertyId: filter.propertyId,
      operator: filter.operator,
      value:
        typeof filter.value === "boolean"
          ? filter.value
          : typeof filter.value === "number" && Number.isFinite(filter.value)
            ? filter.value
            : String(filter.value ?? "").slice(0, 1000),
    }));
  return {
    layout: ["table", "gallery", "chart"].includes(source.layout || "")
      ? source.layout!
      : "table",
    filters,
    sort:
      source.sort && validId(source.sort.propertyId)
        ? {
            propertyId: source.sort.propertyId,
            direction: source.sort.direction === "desc" ? "desc" : "asc",
          }
        : null,
    hiddenPropertyIds: [
      ...new Set(
        (Array.isArray(source.hiddenPropertyIds)
          ? source.hiddenPropertyIds
          : []
        ).filter(validId),
      ),
    ].slice(0, 100),
  };
}
export const normalizedSearch = (value: string) =>
  value
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
export function databaseViewRows(
  bundle: DatabaseBundle,
  view: DatabaseViewConfiguration,
  search = "",
  relationLabels: Record<string, string> = {},
): DatabaseRow[] {
  const properties = new Map(
    bundle.properties.map((property) => [property.id, property]),
  );
  const readable = (row: DatabaseRow, property: Property) => {
    const value = cellValue(row, property);
    if (property.type === "relation" && Array.isArray(value))
      return value
        .map((id) => relationLabels[id] || bundle.relation_labels?.[id] || "")
        .join(", ");
    if (property.type === "files" && Array.isArray(value))
      return value
        .map((id) => bundle.files?.find((file) => file.id === id)?.name || "")
        .join(", ");
    if (Array.isArray(value)) return value.join(", ");
    return value === null ? "" : String(value);
  };
  const empty = (value: CellValue) =>
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  const match = (row: DatabaseRow, filter: DatabaseViewFilter) => {
    const property = properties.get(filter.propertyId);
    if (!property) return true;
    const value = cellValue(row, property);
    if (filter.operator === "isEmpty") return empty(value);
    if (filter.operator === "isNotEmpty") return !empty(value);
    const text = normalizedSearch(readable(row, property));
    const expected = normalizedSearch(String(filter.value));
    if (filter.operator === "contains") return text.includes(expected);
    if (filter.operator === "equals" || filter.operator === "notEquals") {
      const same =
        property.type === "checkbox"
          ? value === filter.value
          : Array.isArray(value)
            ? value.some(
                (item) =>
                  normalizedSearch(
                    property.type === "relation"
                      ? relationLabels[item] ||
                          bundle.relation_labels?.[item] ||
                          ""
                      : property.type === "files"
                        ? bundle.files?.find((file) => file.id === item)
                            ?.name || ""
                        : item,
                  ) === expected,
              )
            : text === expected;
      return filter.operator === "equals" ? same : !same;
    }
    if (empty(value)) return false;
    const numeric = property.type === "number" || isComputed(property);
    const compare = numeric
      ? Number(value) - Number(filter.value)
      : readable(row, property).localeCompare(String(filter.value), "fr", {
          numeric: true,
          sensitivity: "base",
        });
    if (!Number.isFinite(compare)) return false;
    return filter.operator === "gt"
      ? compare > 0
      : filter.operator === "gte"
        ? compare >= 0
        : filter.operator === "lt"
          ? compare < 0
          : compare <= 0;
  };
  const result = bundle.rows.filter(
    (row) =>
      (!search ||
        bundle.properties.some((property) =>
          normalizedSearch(readable(row, property)).includes(
            normalizedSearch(search),
          ),
        )) &&
      view.filters.every((filter) => match(row, filter)),
  );
  const sorting = view.sort;
  if (sorting) {
    const property = properties.get(sorting.propertyId);
    if (property)
      result.sort((left, right) => {
        const a = cellValue(left, property),
          b = cellValue(right, property);
        if (empty(a) || empty(b))
          return empty(a) === empty(b) ? 0 : empty(a) ? 1 : -1;
        const comparison =
          typeof a === "number" && typeof b === "number"
            ? a - b
            : readable(left, property).localeCompare(
                readable(right, property),
                "fr",
                { numeric: true, sensitivity: "base" },
              );
        return sorting.direction === "desc" ? -comparison : comparison;
      });
  }
  return result;
}
