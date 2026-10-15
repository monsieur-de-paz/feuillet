import type { Page } from "./types";
import { searchLabel } from "./interface-geometry";

/** The dashboard always scopes before searching, including private pages and subpages. */
export function notebookHomePages(
  pages: Page[],
  notebookId?: string,
  categoryId = "",
  query = "",
): Page[] {
  const terms = searchLabel(query).split(/\s+/).filter(Boolean);
  return pages
    .filter(
      (page) =>
        (!notebookId || String(page.space_id || "") === notebookId) &&
        (!categoryId || page.category_id === categoryId) &&
        terms.every((term) =>
          searchLabel(
            [page.title, page.description, ...(page.tags || [])].join(" "),
          ).includes(term),
        ),
    )
    .sort(
      (a, b) =>
        (b.updated_at || b.created_at || "").localeCompare(
          a.updated_at || a.created_at || "",
        ) ||
        (a.title || "").localeCompare(b.title || "", "fr") ||
        a.id.localeCompare(b.id),
    );
}
