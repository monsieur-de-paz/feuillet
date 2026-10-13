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
