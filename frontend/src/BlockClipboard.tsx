import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/core";
import { DOMSerializer, Fragment, Slice, type Schema } from "@tiptap/pm/model";
import {
  AllSelection,
  NodeSelection,
  type EditorState,
} from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import { selectedBlocks } from "./block-selection";
import {
  movableBlocks,
  blockRoots,
  BLOCK_SELECTION_META,
} from "./block-moving";
import { useApp } from "./context";
export const blockClipboardType = "application/x-feuillet-blocks+json";
export function clipboardRoots(state: EditorState) {
  const selected = blockRoots(state.doc, selectedBlocks(state));
  if (selected.length) return selected;
  const sel = state.selection;
  if (sel instanceof AllSelection)
    return blockRoots(
      state.doc,
      movableBlocks(state.doc).map((b) => b.pos),
    );
  if (sel instanceof NodeSelection) return blockRoots(state.doc, [sel.from]);
  const roots = blockRoots(
    state.doc,
    movableBlocks(state.doc)
      .filter(
        (b) => sel.from <= b.pos + 1 && sel.to >= b.pos + b.node.nodeSize - 1,
      )
      .map((b) => b.pos),
  );
  return roots.length > 1 &&
    sel.from === roots[0].pos + 1 &&
    sel.to === roots.at(-1)!.pos + roots.at(-1)!.node.nodeSize - 1
    ? roots
    : [];
}
export function clipboardPayload(state: EditorState, scope: string) {
  const roots = clipboardRoots(state);
  if (!roots.length) return null;
  return {
    format: "feuillet-blocks",
    version: 1,
    scope,
    blocks: roots.map((b) => b.node.toJSON()),
  };
}
export function readClipboardBlocks(
  raw: string,
  schema: Schema,
  scope: string,
) {
  if (!raw || raw.length > 2000000) return null;
  try {
    const payload = JSON.parse(raw);
    if (
      payload?.format !== "feuillet-blocks" ||
      payload.version !== 1 ||
      payload.scope !== scope ||
      !Array.isArray(payload.blocks) ||
      !payload.blocks.length ||
      payload.blocks.length > 500
    )
      return null;
    const cleanURL = (value: unknown) => {
      try {
        const url = new URL(String(value), scope);
        return ["http:", "https:", "mailto:"].includes(url.protocol)
          ? String(value)
          : "#";
      } catch {
        return "#";
      }
    };
    let count = 0;
    const inspect = (n: any, depth: number) => {
      if (!n || typeof n !== "object" || ++count > 12000 || depth > 32)
        throw new Error("Invalid clipboard");
      if (n.attrs && typeof n.attrs === "object")
        for (const key of ["href", "src"])
          if (key in n.attrs) n.attrs[key] = cleanURL(n.attrs[key]);
      if (Array.isArray(n.marks))
        for (const mark of n.marks)
          if (mark?.type === "link" && mark.attrs)
            mark.attrs.href = cleanURL(mark.attrs.href);
      if (n.content !== undefined) {
        if (!Array.isArray(n.content)) throw new Error("Invalid content");
        n.content.forEach((c: any) => inspect(c, depth + 1));
      }
    };
    payload.blocks.forEach((n: any) => inspect(n, 0));
    const nodes = payload.blocks.map((n: any) => schema.nodeFromJSON(n));
    for (const node of nodes) {
      if (!node.isBlock || !node.type.spec.group?.split(" ").includes("block"))
        return null;
      node.check();
    }
    return nodes;
  } catch {
    return null;
  }
}
export function pasteBlockTransaction(
  state: EditorState,
  nodes: ReturnType<typeof readClipboardBlocks>,
) {
  if (!nodes?.length) return null;
  try {
    const tr = state.tr
      .replaceSelection(new Slice(Fragment.fromArray(nodes), 0, 0))
      .setMeta(BLOCK_SELECTION_META, []);
    tr.doc.check();
    return closeHistory(tr).scrollIntoView();
  } catch {
    return null;
  }
}
export function BlockClipboard({ editor }: { editor: Editor }) {
  const app = useApp(),
    appRef = useRef(app);
  appRef.current = app;
  useEffect(() => {
    const scope = new URL(".", location.href).href;
    const writingElsewhere = (target: EventTarget | null) => {
      const el = target instanceof Element ? target : null;
      return (
        !!el?.closest('input,textarea,select,[contenteditable="true"]') &&
        !editor.view.dom.contains(el)
      );
    };
    const copy = (event: ClipboardEvent) => {
      if (
        !editor.isEditable ||
        !event.clipboardData ||
        writingElsewhere(event.target)
      )
        return;
      const payload = clipboardPayload(editor.state, scope);
      if (!payload) return;
      const raw = JSON.stringify(payload);
      if (raw.length > 2000000) {
        appRef.current.notify(
          "Cette sélection est trop volumineuse pour le presse-papiers.",
        );
        return;
      }
      const nodes = clipboardRoots(editor.state);
      const wrapper = document.createElement("div");
      wrapper.dataset.feuilletBlocks = raw;
      wrapper.append(
        DOMSerializer.fromSchema(editor.schema).serializeFragment(
          Fragment.fromArray(nodes.map((n) => n.node)),
        ),
      );
      event.preventDefault();
      event.clipboardData.setData(
        "text/plain",
        nodes
          .map(
            ({ node }) =>
              node.textContent ||
              node.attrs.name ||
              node.attrs.title ||
              node.attrs.label ||
              "Bloc",
          )
          .join("\n\n"),
      );
      event.clipboardData.setData("text/html", wrapper.outerHTML);
      try {
        event.clipboardData.setData(blockClipboardType, raw);
      } catch {}
      appRef.current.notify(
        `${nodes.length} bloc${nodes.length > 1 ? "s" : ""} copié${nodes.length > 1 ? "s" : ""}.`,
      );
    };
    const paste = (event: ClipboardEvent) => {
      if (
        !editor.isEditable ||
        !event.clipboardData ||
        writingElsewhere(event.target)
      )
        return;
      let raw = event.clipboardData.getData(blockClipboardType);
      if (!raw) {
        const html = event.clipboardData.getData("text/html");
        if (html.length > 2200000) return;
        raw =
          new DOMParser()
            .parseFromString(html, "text/html")
            .querySelector<HTMLElement>("[data-feuillet-blocks]")?.dataset
            .feuilletBlocks || "";
      }
      if (!raw) return;
      const nodes = readClipboardBlocks(raw, editor.schema, scope);
      // Explicit Feuillet payloads from another installation fall back to plain text.
      if (!nodes) {
        event.preventDefault();
        event.stopPropagation();
        const text = event.clipboardData.getData("text/plain");
        if (text)
          editor
            .chain()
            .focus()
            .insertContent(
              text.split(/\r?\n\r?\n/).map((line) => ({
                type: "paragraph",
                content: line ? [{ type: "text", text: line }] : [],
              })),
            )
            .run();
        return;
      }
      const tr = pasteBlockTransaction(editor.state, nodes);
      if (!tr) {
        appRef.current.notify(
          "Clique dans le contenu de la page pour coller ces blocs.",
        );
        event.preventDefault();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      editor.view.dispatch(tr);
      editor.view.focus();
      appRef.current.notify(
        `${nodes.length} bloc${nodes.length > 1 ? "s" : ""} collé${nodes.length > 1 ? "s" : ""}.`,
      );
    };
    document.addEventListener("copy", copy, true);
    document.addEventListener("paste", paste, true);
    return () => {
      document.removeEventListener("copy", copy, true);
      document.removeEventListener("paste", paste, true);
    };
  }, [editor]);
  return null;
}
