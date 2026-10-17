export type Doc = {
  type: string;
  attrs?: Record<string, any>;
  content?: Doc[];
  text?: string;
  marks?: any[];
};
export type Attribution = {
  source_name?: string;
  author: string;
  license: string;
  source_url: string;
  license_url?: string;
};
export type Page = {
  id: string;
  slug: string;
  parent_id: string | null;
  title: string;
  icon: string;
  cover_id: string | null;
  cover_position?: { x: number; y: number };
  category_id?: string | null;
  icon_id?: string | null;
  cover_attribution?: Attribution | null;
  icon_attribution?: Attribution | null;
  space_id?: string | null;
  appearance?: Partial<Appearance>;
  visibility: "public" | "private";
  kind: "page" | "article" | "class";
  description: string;
  tags: string[];
  source_url: string;
  source_name: string;
  sort_order: number;
  version: number;
  has_unpublished_changes: boolean;
  published_at: string | null;
  content?: Doc;
  created_at?: string;
  updated_at?: string;
};
export type FileRecord = {
  id: string;
  name: string;
  mime: string;
  size: number;
  url: string;
  attribution?: Attribution | null;
};
export type Session = {
  authenticated: boolean;
  csrf: string;
  name: string;
  installed: boolean;
};
export const emptyDoc: Doc = { type: "doc", content: [{ type: "paragraph" }] };
export function safeLink(value: string) {
  try {
    const url = new URL(value, location.href);
    return ["http:", "https:", "mailto:"].includes(url.protocol)
      ? url.href
      : "#";
  } catch {
    return "#";
  }
}
export function fileUrl(id: string, download = false) {
  return `media.php?id=${encodeURIComponent(id)}${download ? "&download=1" : ""}`;
}
export function pageUrl(id: string) {
  return `index.php?page=${encodeURIComponent(id)}`;
}
export function sizeLabel(size: number) {
  return size >= 1048576
    ? `${(size / 1048576).toFixed(1)} Mo`
    : `${Math.ceil(size / 1024)} Ko`;
}
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T = any>(
  action: string,
  body?: any,
  query: Record<string, string> = {},
): Promise<T> {
  const scope = new URLSearchParams(location.search);
  const root = scope.get("root") || scope.get("page");
  const qs = new URLSearchParams({
    action,
    ...(root ? { root } : {}),
    ...query,
  });
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["X-CSRF-Token"] = csrf;
    if (!(body instanceof FormData))
      headers["Content-Type"] = "application/json";
  }
  const response = await fetch(`api.php?${qs}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      "Le serveur n’a pas renvoyé une réponse lisible. Vérifie la configuration PHP.",
      response.status,
      "invalid_response",
    );
  }
  if (!response.ok || data.error)
    throw new ApiError(
      data.error || "Une erreur est survenue.",
      response.status,
      data.code || "error",
    );
  return data;
}

export type Appearance = {
  font: "sans" | "serif" | "mono" | "quicksand" | "fraunces";
  mode: "light" | "dark" | "oled";
  background: string;
  text: string;
  accent: string;
  width: "normal" | "wide";
  focus: boolean;
};
export type Space = {
  icon_id?: string | null;
  cover_id?: string | null;
  cover_position?: { x: number; y: number };
  cover_attribution?: Attribution | null;
  icon_attribution?: Attribution | null;
  id: string;
  name: string;
  icon: string;
  sort_order: number;
};
export type ImagePurpose = "icon" | "cover" | "image";
export const defaultAppearance: Appearance = {
  font: "sans",
  background: "#ffffff",
  text: "#37352f",
  accent: "#38795d",
  width: "normal",
  focus: false,
  mode: "light",
};

export type Category = {
  id: string;
  space_id: string | null;
  name: string;
  legacy_kind: "class" | "article" | null;
  sort_order: number;
  deleted_at: string | null;
};
export type Notebook = {
  title: string;
  subtitle: string;
  max_upload: number;
  auto_publish?: boolean;
  auto_publish_children?: boolean;
  sidebar_shortcut?: string;
  icon?: string;
  icon_id?: string | null;
};

/** Empty text nodes from older imports are invalid in ProseMirror; keep their surrounding blocks. */
export function editableDocument(doc: Doc): Doc {
  const clean = (node: Doc): Doc => ({
    ...node,
    ...(node.marks
      ? {
          marks: node.marks.filter(
            (mark) =>
              mark.type !== "textStyle" || !isThemeTextColor(mark.attrs?.color),
          ),
        }
      : {}),
    ...(node.content
      ? {
          content: node.content
            .filter(
              (n) =>
                n.type !== "text" ||
                (typeof n.text === "string" && n.text.length > 0),
            )
            .map(clean),
        }
      : {}),
  });
  return clean(doc);
}

export function isThemeTextColor(value: unknown): boolean {
  return (
    !value || (typeof value === "string" && value.toLowerCase() === "#37352f")
  );
}
