import type { EditorState, Transaction } from "@tiptap/pm/state";
import { CellSelection, TableMap } from "@tiptap/pm/tables";

export type TableAxis = "row" | "column" | "table";

export function tableAtSelection(state: EditorState): number | null {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === "table") return $from.before(depth);
  }
  const node = state.doc.nodeAt(state.selection.from);
  return node?.type.name === "table" ? state.selection.from : null;
}

/** TableMap keeps selections valid when imported tables contain merged cells. */
export function selectTableAxis(
  state: EditorState,
  tablePos: number,
  axis: TableAxis,
  index = 0,
  anchorIndex = index,
): Transaction | null {
  if (tablePos < 0 || tablePos >= state.doc.content.size) return null;
  const table = state.doc.nodeAt(tablePos);
  if (!table || table.type.name !== "table") return null;
  const map = TableMap.get(table);
  const size = axis === "row" ? map.height : map.width;
  if (
    axis !== "table" &&
    (index < 0 || index >= size || anchorIndex < 0 || anchorIndex >= size)
  )
    return null;
  const start = tablePos + 1;
  const first =
    axis === "row"
      ? anchorIndex * map.width
      : axis === "column"
        ? anchorIndex
        : 0;
  const last =
    axis === "row"
      ? index * map.width + map.width - 1
      : axis === "column"
        ? (map.height - 1) * map.width + index
        : map.map.length - 1;
  const anchor = state.doc.resolve(start + map.map[first]);
  const head = state.doc.resolve(start + map.map[last]);
  const selection =
    axis === "row"
      ? CellSelection.rowSelection(anchor, head)
      : axis === "column"
        ? CellSelection.colSelection(anchor, head)
        : new CellSelection(anchor, head);
  return state.tr.setSelection(selection);
}
