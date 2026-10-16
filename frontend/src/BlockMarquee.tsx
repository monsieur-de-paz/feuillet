import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  BLOCK_SELECTION_META,
  blockRoots,
  movableBlocks,
} from "./block-moving";
import {
  rectangleBlocks,
  selectedBlocks,
  type Box,
  type BlockBox,
} from "./block-selection";

type Marquee = {
  x: number;
  y: number;
  currentX: number;
  currentY: number;
  active: boolean;
  pointer: number;
  doc: Editor["state"]["doc"];
  original: number[];
};
export function BlockMarquee({
  editor,
  wrap,
}: {
  editor: Editor;
  wrap: RefObject<HTMLDivElement | null>;
}) {
  const [box, setBox] = useState<Box | null>(null),
    [count, setCount] = useState(0);
  useEffect(() => {
    let drag: Marquee | null = null,
      frame = 0;
    const root = editor.view.dom;
    const choose = (positions: number[]) =>
      editor.view.dispatch(
        editor.state.tr.setMeta(BLOCK_SELECTION_META, positions),
      );
    const stop = (cancel = false) => {
      if (drag && cancel)
        choose(drag.doc === editor.state.doc ? drag.original : []);
      drag = null;
      cancelAnimationFrame(frame);
      frame = 0;
      document.body.classList.remove("block-selecting");
      setBox(null);
    };
    const bounds = (): BlockBox[] =>
      movableBlocks(editor.state.doc).flatMap((block) => {
        const element = editor.view.nodeDOM(block.pos);
        if (
          !(element instanceof HTMLElement) ||
          !element.getClientRects().length
        )
          return [];
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return [];
        // Collapsed content is absent from layout; only the section header can be selected.
        const heading =
          block.node.type.name === "toggleHeading"
            ? element.querySelector(
                ".toggle-heading-content h1,.toggle-heading-content h2,.toggle-heading-content h3",
              )
            : block.node.type.name === "details"
              ? element.querySelector(".details-heading")
              : null;
        const header = heading?.getBoundingClientRect();
        return [
          {
            pos: block.pos,
            end: block.pos + block.node.nodeSize,
            rect,
            header: header
              ? {
                  left: rect.left,
                  right: rect.right,
                  top: rect.top,
                  bottom: header.bottom,
                }
              : undefined,
          },
        ];
      });
    const update = () => {
      if (!drag?.active) return;
      const startX = drag.x - scrollX,
        startY = drag.y - scrollY;
      const next = {
        left: Math.min(startX, drag.currentX),
        right: Math.max(startX, drag.currentX),
        top: Math.min(startY, drag.currentY),
        bottom: Math.max(startY, drag.currentY),
      };
      setBox(next);
      const positions = blockRoots(editor.state.doc, [
        ...drag.original,
        ...rectangleBlocks(next, bounds()),
      ]).map((b) => b.pos);
      if (positions.join() !== selectedBlocks(editor.state).join())
        choose(positions);
    };
    const tick = () => {
      if (!drag?.active) return;
      const speed =
        drag.currentY < 90 ? -12 : drag.currentY > innerHeight - 64 ? 12 : 0;
      if (speed) {
        window.scrollBy(0, speed);
        update();
      }
      frame = requestAnimationFrame(tick);
    };
    const down = (event: PointerEvent) => {
      if (
        event.button !== 0 ||
        event.pointerType !== "mouse" ||
        !editor.isEditable
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      if (
        !target ||
        target.closest(
          ".block-mover,.block-selection-status,.feuillet-floating,.modal-backdrop",
        )
      )
        return;
      if (selectedBlocks(editor.state).length && !event.shiftKey) choose([]);
      const panel = wrap.current?.closest(".main-panel"),
        rect = root.getBoundingClientRect();
      if (
        !panel?.contains(target) ||
        event.clientY < rect.top - 8 ||
        event.clientY > rect.bottom + 24 ||
        target.closest(
          "button,a,input,textarea,select,iframe,video,audio,[role=button]",
        )
      )
        return;
      const inBlock = movableBlocks(editor.state.doc).some((b) => {
        const element = editor.view.nodeDOM(b.pos);
        if (!(element instanceof HTMLElement)) return false;
        const r = element.getBoundingClientRect();
        return (
          r.width &&
          r.height &&
          event.clientX >= r.left &&
          event.clientX <= r.right &&
          event.clientY >= r.top &&
          event.clientY <= r.bottom
        );
      });
      if (inBlock) return;
      event.preventDefault();
      drag = {
        x: event.clientX + scrollX,
        y: event.clientY + scrollY,
        currentX: event.clientX,
        currentY: event.clientY,
        active: false,
        pointer: event.pointerId,
        doc: editor.state.doc,
        original: event.shiftKey ? selectedBlocks(editor.state) : [],
      };
    };
    const move = (event: PointerEvent) => {
      if (!drag || drag.pointer !== event.pointerId) return;
      drag.currentX = event.clientX;
      drag.currentY = event.clientY;
      if (
        !drag.active &&
        Math.hypot(
          event.clientX + scrollX - drag.x,
          event.clientY + scrollY - drag.y,
        ) < 5
      )
        return;
      event.preventDefault();
      if (!drag.active) {
        drag.active = true;
        editor.view.dispatch(
          editor.state.tr
            .setSelection(
              TextSelection.near(
                editor.state.doc.resolve(editor.state.selection.from),
              ),
            )
            .setMeta(BLOCK_SELECTION_META, drag.original),
        );
        window.getSelection()?.removeAllRanges();
        document.body.classList.add("block-selecting");
        frame = requestAnimationFrame(tick);
      }
      update();
    };
    const up = (event: PointerEvent) => {
      if (drag?.pointer === event.pointerId) stop();
    };
    const cancel = () => stop(true);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (drag) stop(true);
        else if (selectedBlocks(editor.state).length) choose([]);
      }
    };
    const refresh = () => {
      setCount(selectedBlocks(editor.state).length);
      if (drag && drag.doc !== editor.state.doc) stop();
    };
    document.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", key);
    editor.on("transaction", refresh);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", key);
      editor.off("transaction", refresh);
      cancelAnimationFrame(frame);
      document.body.classList.remove("block-selecting");
    };
  }, [editor, wrap]);
  return (
    <>
      {box &&
        createPortal(
          <div
            className="block-selection-rectangle"
            aria-hidden="true"
            style={{
              left: box.left,
              top: box.top,
              width: box.right - box.left,
              height: box.bottom - box.top,
            }}
          />,
          document.body,
        )}
      {count > 0 && (
        <div className="block-selection-status" role="status">
          <span>
            {count} bloc{count > 1 ? "s" : ""} sélectionné{count > 1 ? "s" : ""}{" "}
            · Glisse une poignée pour déplacer
          </span>
          <button
            type="button"
            onClick={() =>
              editor.view.dispatch(
                editor.state.tr.setMeta(BLOCK_SELECTION_META, []),
              )
            }
          >
            Désélectionner
          </button>
        </div>
      )}
    </>
  );
}
