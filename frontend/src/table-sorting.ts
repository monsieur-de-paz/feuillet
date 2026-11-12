import { Fragment, type Node as PMNode } from "@tiptap/pm/model";
import type { Command } from "@tiptap/pm/state";
import { CellSelection, TableMap } from "@tiptap/pm/tables";

export type TableSortMode = "auto" | "text" | "number";
export type TableSortOptions = {
  column: number;
  direction: "asc" | "desc";
  mode: TableSortMode;
  headerRows: number;
};
const alphabet = new Intl.Collator("fr", {
  sensitivity: "base",
  numeric: true,
});

/** Decimal comma, decimal point and common French/international group separators. */
export function tableNumber(value: string): number | null {
  let text = value
    .trim()
    .replace(/−/g, "-")
    .replace(/^[€$£¥]\s*/, "")
    .replace(/\s*(?:€|\$|£|¥|EUR|USD|GBP|%)$/i, "")
    .trim();
  if (!text || /[^\d\s.,+eE-]/.test(text)) return null;
  text = text.replace(/\s/g, "");
  const comma = text.lastIndexOf(","),
    dot = text.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const group = decimal === "," ? "." : ",";
    const [integer, fraction, extra] = text.split(decimal);
    const escaped = group === "." ? "\\." : ",";
    if (
      extra !== undefined ||
      !new RegExp(`^[+-]?\\d{1,3}(?:${escaped}\\d{3})+$`).test(integer)
    )
      return null;
    text = integer.split(group).join("") + "." + fraction;
  } else if (/^[+-]?\d{1,3}(?:[.,]\d{3}){2,}$/.test(text)) {
    text = text.replace(/[.,]/g, "");
  } else text = text.replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function tableHeaderRows(table: PMNode): number {
  let count = 0;
  for (let i = 0; i < table.childCount; i++) {
    const row = table.child(i);
    let header = row.childCount > 0;
    row.forEach((cell) => {
      if (cell.type.spec.tableRole !== "header_cell") header = false;
    });
    if (!header) break;
    count++;
  }
  return count;
}

function cellText(table: PMNode, map: TableMap, row: number, column: number) {
  const cell = table.nodeAt(map.map[row * map.width + column]);
  return cell?.textBetween(0, cell.content.size, " ", " ").trim() || "";
}

export function tableSortInfo(table: PMNode, options: TableSortOptions) {
  const map = TableMap.get(table);
  let error = "";
  if (
    !Number.isInteger(options.column) ||
    options.column < 0 ||
    options.column >= map.width
  )
    error = "Choisis une colonne du tableau.";
  else if (
    !Number.isInteger(options.headerRows) ||
    options.headerRows < 0 ||
    options.headerRows > map.height ||
    map.height - options.headerRows < 2
  )
    error = "Il faut au moins deux lignes de données à trier.";
  else if (map.problems?.length)
    error = "Corrige la structure du tableau avant de le trier.";
  else
    table.forEach((row) =>
      row.forEach((cell) => {
        if (cell.attrs.rowspan > 1)
          error =
            "Sépare les cellules fusionnées sur plusieurs lignes avant de trier. Les fusions horizontales sont conservées.";
      }),
    );
  const values = error
    ? []
    : Array.from({ length: map.height - options.headerRows }, (_, i) =>
        cellText(table, map, i + options.headerRows, options.column),
      ).filter(Boolean);
  const mode =
    options.mode === "auto"
      ? values.length > 0 &&
        values.every((value) => tableNumber(value) !== null)
        ? "number"
        : "text"
      : options.mode;
  return { error, mode, map };
}

/** Moves intact rows in one undoable transaction; never detaches cells from their row. */
export function sortTableRows(pos: number, options: TableSortOptions): Command {
  return (state, dispatch) => {
    if (!Number.isInteger(pos) || pos < 0 || pos >= state.doc.content.size)
      return false;
    const table = state.doc.nodeAt(pos);
    if (!table || table.type.name !== "table") return false;
    const { error, mode, map } = tableSortInfo(table, options);
    if (error) return false;
    if (!dispatch) return true;
    const rows = Array.from(
      { length: map.height - options.headerRows },
      (_, index) => {
        const text = cellText(
          table,
          map,
          index + options.headerRows,
          options.column,
        );
        return {
          node: table.child(index + options.headerRows),
          index,
          text,
          number: tableNumber(text),
        };
      },
    );
    rows.sort((a, b) => {
      const missingA = !a.text || (mode === "number" && a.number === null);
      const missingB = !b.text || (mode === "number" && b.number === null);
      if (missingA !== missingB) return missingA ? 1 : -1;
      if (missingA) return a.index - b.index;
      const comparison =
        mode === "number"
          ? a.number! - b.number!
          : alphabet.compare(a.text, b.text);
      return (
        (options.direction === "desc" ? -comparison : comparison) ||
        a.index - b.index
      );
    });
    if (rows.every((row, index) => row.index === index)) return true;
    const headers = Array.from({ length: options.headerRows }, (_, i) =>
      table.child(i),
    );
    const sorted = table.copy(
      Fragment.fromArray([...headers, ...rows.map((row) => row.node)]),
    );
    const tr = state.tr.replaceWith(pos, pos + table.nodeSize, sorted);
    const sortedMap = TableMap.get(sorted);
    tr.setSelection(
      CellSelection.colSelection(
        tr.doc.resolve(pos + 1 + sortedMap.map[options.column]),
        tr.doc.resolve(
          pos +
            1 +
            sortedMap.map[
              (sortedMap.height - 1) * sortedMap.width + options.column
            ],
        ),
      ),
    );
    dispatch(tr);
    return true;
  };
}
