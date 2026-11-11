import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { TableMap } from '@tiptap/pm/tables';
import { templateCell, type TableTemplate, type TableTone } from './table-formatting';
export const tablePreviewKey = new PluginKey<DecorationSet>('feuillet-table-preview');
export type TablePreview = { pos: number; template: TableTemplate; tone: TableTone };
const pigments = {gray:'#808080',blue:'#4285e8',green:'#39a57a',amber:'#d6aa26',orange:'#dd8244',red:'#d65d66',violet:'#9c72d8',accent:'var(--accent, #38795d)'};
/** Decorations only: hovering never changes the document, undo or autosave payload. */
export function tablePreviewPlugin() {
  return new Plugin<DecorationSet>({
    key: tablePreviewKey,
    state: {
      init: () => DecorationSet.empty,
      apply(tr, previous) {
        const preview = tr.getMeta(tablePreviewKey) as TablePreview | null | undefined;
        if (preview === undefined) return tr.docChanged ? DecorationSet.empty : previous;
        const table = preview && tr.doc.nodeAt(preview.pos);
        if (!preview || table?.type.name !== 'table') return DecorationSet.empty;
        const map = TableMap.get(table), decorations: Decoration[] = [];
        for (const offset of new Set(map.map)) {
          const pos = preview.pos + 1 + offset, cell = tr.doc.nodeAt(pos)!;
          const {header,colored} = templateCell(map.findCell(offset), preview.template);
          const background = colored ? `color-mix(in srgb, ${pigments[preview.tone]} ${header ? 32 : 17}%, var(--surface, #fff))` : 'var(--surface, #fff)';
          decorations.push(Decoration.node(pos,pos + cell.nodeSize, {style:`background: ${background}; font-weight: ${header ? 600 : 400}`, 'data-template-preview':'true'}));
        }
        return DecorationSet.create(tr.doc, decorations);
      },
    },
    props: { decorations: state => tablePreviewKey.getState(state) },
  });
}
