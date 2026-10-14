import { Fragment, type Node as PMNode } from "@tiptap/pm/model";
import {
  NodeSelection,
  TextSelection,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";
export type BlockPosition = { pos: number; node: PMNode; depth: number };
export function movableBlocks(doc: PMNode): BlockPosition[] {
  const found: BlockPosition[] = [];
  doc.descendants((node, pos, parent, index) => {
    if (
      node.type.spec.group?.split(" ").includes("block") &&
      !(parent?.type.name === "toggleHeading" && index === 0)
    ) {
      found.push({ pos, node, depth: doc.resolve(pos).depth });
    }
  });
  return found;
}
export function selectedBlock(state: EditorState): BlockPosition | null {
  const from = state.selection.from,
    to = state.selection.to;
  const candidates = movableBlocks(state.doc).filter(
    (b) => from >= b.pos && to <= b.pos + b.node.nodeSize,
  );
  return (
    candidates.sort(
      (a, b) => b.depth - a.depth || a.node.nodeSize - b.node.nodeSize,
    )[0] || null
  );
}
/** One atomic move, preserving exact node data and valid empty container placeholders. */
export function moveBlock(
  state: EditorState,
  from: number,
  to: number,
): Transaction | null {
  const node = state.doc.nodeAt(from);
  if (
    !node ||
    !movableBlocks(state.doc).some((b) => b.pos === from) ||
    to < 0 ||
    to > state.doc.content.size ||
    (to >= from && to <= from + node.nodeSize)
  )
    return null;
  const $from = state.doc.resolve(from),
    parent = $from.parent,
    index = $from.index();
  const tr = state.tr;
  if (parent.canReplace(index, index + 1))
    tr.delete(from, from + node.nodeSize);
  else if (
    parent.canReplaceWith(index, index + 1, state.schema.nodes.paragraph)
  )
    tr.replaceWith(
      from,
      from + node.nodeSize,
      state.schema.nodes.paragraph.create(),
    );
  else return null;
  const mapped = tr.mapping.map(to),
    $to = tr.doc.resolve(mapped),
    target = $to.parent,
    at = $to.index();
  if (!target.canReplace(at, at, Fragment.from(node))) return null;
  tr.insert(mapped, node);
  try {
    tr.doc.check();
  } catch {
    return null;
  }
  tr.setSelection(
    node.isAtom
      ? NodeSelection.create(tr.doc, mapped)
      : TextSelection.near(tr.doc.resolve(mapped + 1)),
  );
  return tr.scrollIntoView();
}
export function blockSiblingDestination(
  state: EditorState,
  pos: number,
  direction: "up" | "down" | "out" | "in",
): number | null {
  const $pos = state.doc.resolve(pos),
    node = state.doc.nodeAt(pos);
  if (!node) return null;
  const parent = $pos.parent,
    index = $pos.index();
  if (direction === "out")
    return $pos.depth > 0 ? $pos.after($pos.depth) : null;
  if (direction === "up")
    return index > 0 ? pos - parent.child(index - 1).nodeSize : null;
  if (direction === "down")
    return index + 1 < parent.childCount
      ? pos + node.nodeSize + parent.child(index + 1).nodeSize
      : null;
  if (index === 0) return null;
  const before = parent.child(index - 1),
    start = pos - before.nodeSize;
  return before.type.name === "toggleHeading"
    ? start + 1 + before.firstChild!.nodeSize
    : before.type.name === "details"
      ? start + 1
      : null;
}
