import { TableCell, TableHeader } from '@tiptap/extension-table';
import type { Command } from '@tiptap/pm/state';
import { CellSelection, selectedRect, TableMap } from '@tiptap/pm/tables';

export const tableTones = [
  ['gray', 'Gris'], ['blue', 'Bleu'], ['green', 'Vert'], ['amber', 'Jaune'],
  ['orange', 'Orange'], ['red', 'Rouge'], ['violet', 'Violet'], ['accent', 'Accent du thème'],
] as const;
export type TableTone = typeof tableTones[number][0];
export type TableTemplate = 'top' | 'left' | 'double' | 'striped' | 'plain';
export const validTableTone = (tone: unknown): tone is TableTone => tableTones.some(([key]) => key === tone);
const attributes = {
  cellTone: {
    default: null,
    parseHTML: (el: HTMLElement) => validTableTone(el.dataset.cellTone) ? el.dataset.cellTone : null,
    renderHTML: (attrs: Record<string, unknown>) => validTableTone(attrs.cellTone) ? { 'data-cell-tone': attrs.cellTone } : {},
  },
  cellShade: {
    default: null,
    parseHTML: (el: HTMLElement) => el.dataset.cellShade === 'strong' ? 'strong' : null,
    renderHTML: (attrs: Record<string, unknown>) => attrs.cellShade === 'strong' ? { 'data-cell-shade': 'strong' } : {},
  },
};
export const ColoredTableCell = TableCell.extend({ addAttributes() { return { ...this.parent?.(), ...attributes }; } });
export const ColoredTableHeader = TableHeader.extend({ addAttributes() { return { ...this.parent?.(), ...attributes }; } });

/** Apply to the current cell or the actual CellSelection, without touching its text. */
export function colorTableCells(tone: TableTone | null): Command {
  return (state, dispatch) => {
    if (tone !== null && !validTableTone(tone)) return false;
    try {
      const rect = selectedRect(state), tr = state.tr;
      const positions: number[] = [];
      if (state.selection instanceof CellSelection) state.selection.forEachCell((_node, pos) => positions.push(pos));
      else positions.push(rect.tableStart + rect.map.map[rect.top * rect.map.width + rect.left]);
      for (const pos of positions) {
        const cell = state.doc.nodeAt(pos)!;
        tr.setNodeMarkup(pos, undefined, { ...cell.attrs, cellTone: tone, cellShade: null });
      }
      if (dispatch) dispatch(tr);
      return true;
    } catch { return false; }
  };
}

/** Whole-table preset: keep spans, column widths, contents and marks unchanged. */
export function styleTable(template: TableTemplate, tone: TableTone = 'blue'): Command {
  return (state, dispatch) => {
    if (!['top','left','double','striped','plain'].includes(template) || !validTableTone(tone)) return false;
    try {
      const rect = selectedRect(state), map = TableMap.get(rect.table), tr = state.tr;
      for (const offset of new Set(map.map)) {
        const box = map.findCell(offset), pos = rect.tableStart + offset, cell = state.doc.nodeAt(pos)!;
        const header = (template === 'top' || template === 'double' || template === 'striped') && box.top === 0 || (template === 'left' || template === 'double') && box.left === 0;
        const stripe = template === 'striped' && box.top % 2 === 0;
        tr.setNodeMarkup(pos, state.schema.nodes[header ? 'tableHeader' : 'tableCell'], {
          ...cell.attrs, cellTone: header || stripe ? tone : null, cellShade: header ? 'strong' : null,
        });
      }
      if (dispatch) dispatch(tr);
      return true;
    } catch { return false; }
  };
}
