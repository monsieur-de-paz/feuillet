import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { BLOCK_SELECTION_META, blockRoots } from "./block-moving";

export const blockSelectionKey = new PluginKey<number[]>(
  "feuillet-block-selection",
);
export const selectedBlocks = (state: EditorState): number[] =>
  blockSelectionKey.getState(state) || [];
export function createBlockSelectionPlugin() {
  return new Plugin<number[]>({
    key: blockSelectionKey,
    state: {
      init: () => [],
      apply(tr, previous) {
        const explicit = tr.getMeta(BLOCK_SELECTION_META);
        if (Array.isArray(explicit))
          return blockRoots(tr.doc, explicit).map((b) => b.pos);
        if (tr.selectionSet) return [];
        if (!tr.docChanged) return previous;
        return blockRoots(
          tr.doc,
          previous.flatMap((pos) => {
            const mapped = tr.mapping.mapResult(pos, 1);
            return mapped.deleted ? [] : [mapped.pos];
          }),
        ).map((b) => b.pos);
      },
    },
    props: {
      decorations(state) {
        return DecorationSet.create(
          state.doc,
          blockRoots(state.doc, selectedBlocks(state)).map((b) =>
            Decoration.node(b.pos, b.pos + b.node.nodeSize, {
              class: "feuillet-block-selected",
              "data-block-selected": "true",
            }),
          ),
        );
      },
      handleKeyDown(view, event) {
        if (
          !selectedBlocks(view.state).length ||
          event.key === "Shift" ||
          event.key === "Alt" ||
          event.key === "Control" ||
          event.key === "Meta"
        )
          return false;
        // Leave normal writing/history shortcuts to ProseMirror. Escape only clears the group.
        view.dispatch(view.state.tr.setMeta(BLOCK_SELECTION_META, []));
        if (event.key === "Escape") {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
  });
}
export const BlockSelection = Extension.create({
  name: "feuilletBlockSelection",
  addProseMirrorPlugins() {
    return [createBlockSelectionPlugin()];
  },
});

export type Box = { left: number; top: number; right: number; bottom: number };
export type BlockBox = { pos: number; end: number; rect: Box; header?: Box };
export function intersects(a: Box, b: Box) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}
/** Prefer an entire section when its header/full height is touched, otherwise its children. */
export function rectangleBlocks(box: Box, blocks: BlockBox[]): number[] {
  const touched = blocks.filter((b) => intersects(box, b.rect));
  const chosen = touched.filter((b) => {
    if (b.header && intersects(box, b.header)) return true;
    if (box.top <= b.rect.top && box.bottom >= b.rect.bottom) return true;
    return !touched.some((child) => child.pos > b.pos && child.end < b.end);
  });
  return chosen
    .filter((b) => !chosen.some((p) => p.pos < b.pos && p.end > b.end))
    .map((b) => b.pos)
    .sort((a, b) => a - b);
}
