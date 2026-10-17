import type { Editor } from "@tiptap/core";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { GripVertical, Plus } from "lucide-react";
import {
  movableBlocks,
  moveBlock,
  moveBlocks,
  blockSiblingDestination,
  selectedBlock,
  blockRoots,
  type BlockPosition,
  blockJsonPaths,
} from "./block-moving";
import { selectedBlocks } from "./block-selection";
type Hit = BlockPosition & { element: HTMLElement };
export type Drop = {
  pageId?: string;
  title?: string;
  pos: number;
  left: number;
  top: number;
  width: number;
  inside: boolean;
  container?: HTMLElement;
};
export function blockAtElement(editor: Editor, target: Element): Hit | null {
  return (
    movableBlocks(editor.state.doc)
      .map((b) => ({
        ...b,
        element: editor.view.nodeDOM(b.pos) as HTMLElement,
      }))
      .filter(
        (b) => b.element instanceof HTMLElement && b.element.contains(target),
      )
      .sort(
        (a, b) => b.depth - a.depth || a.node.nodeSize - b.node.nodeSize,
      )[0] || null
  );
}
export function dropAt(
  editor: Editor,
  x: number,
  y: number,
  pages = false,
): Drop | null {
  if (pages) {
    const target = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-page-id],[data-page-target]");
    const id = target?.dataset.pageId || target?.dataset.pageTarget;
    if (id && target) {
      const r = target.getBoundingClientRect();
      return {
        pageId: id,
        title: target.textContent?.trim() || "Page",
        pos: 0,
        left: r.left,
        top: r.top,
        width: r.width,
        inside: true,
        container: target,
      };
    }
  }
  const hits = movableBlocks(editor.state.doc)
    .map((b) => ({ ...b, element: editor.view.nodeDOM(b.pos) as HTMLElement }))
    .filter(
      (b) =>
        b.element instanceof HTMLElement && b.element.getClientRects().length,
    )
    .map((b) => ({ ...b, rect: b.element.getBoundingClientRect() }));
  const root = editor.view.dom.getBoundingClientRect();
  if (x < root.left - 65 || x > root.right + 40) return null;
  const aligned = hits.filter(
    (b) =>
      y >= b.rect.top - 5 && y <= b.rect.bottom + 5 && x >= b.rect.left - 12,
  );
  const hit =
    aligned.sort(
      (a, b) => b.depth - a.depth || a.rect.height - b.rect.height,
    )[0] ||
    hits.sort(
      (a, b) =>
        Math.min(Math.abs(y - a.rect.top), Math.abs(y - a.rect.bottom)) -
        Math.min(Math.abs(y - b.rect.top), Math.abs(y - b.rect.bottom)),
    )[0];
  if (!hit) return null;
  const { rect, node, pos, element } = hit;
  if (
    ["toggleHeading", "details", "callout", "column"].includes(
      node.type.name,
    ) &&
    x >= rect.left + 28
  ) {
    const heading = element.querySelector(
      ".toggle-heading-content h1,.toggle-heading-content h2,.toggle-heading-content h3,.details-heading",
    );
    const headingBottom = heading?.getBoundingClientRect().bottom ?? rect.top;
    if (y >= rect.top + 8 && y <= Math.max(headingBottom + 16, rect.top + 32)) {
      return {
        pos:
          pos +
          1 +
          (node.type.name === "toggleHeading" ? node.firstChild!.nodeSize : 0),
        left: rect.left + 28,
        top: headingBottom + 4,
        width: Math.max(40, rect.width - 28),
        inside: true,
        container:
          element.querySelector<HTMLElement>(
            ".toggle-heading-editor,.details-block",
          ) || element,
      };
    }
  }
  const before = y < rect.top + rect.height / 2;
  return {
    pos: before ? pos : pos + node.nodeSize,
    left: rect.left,
    top: before ? rect.top - 3 : rect.bottom + 3,
    width: rect.width,
    inside: false,
  };
}
export function BlockMover({
  editor,
  wrap,
  onMenu,
  onInsert,
  onMoved,
  onMoveToPage,
}: {
  editor: Editor;
  wrap: RefObject<HTMLDivElement | null>;
  onMenu: (pos: number, anchor: HTMLButtonElement) => void;
  onInsert: (pos: number) => void;
  onMoved: (count: number) => void;
  onMoveToPage: (id: string, paths: number[][]) => void;
}) {
  const [hover, setHover] = useState<Hit | null>(null),
    [drop, setDrop] = useState<Drop | null>(null),
    [ghost, setGhost] = useState<{ x: number; y: number; text: string } | null>(
      null,
    );
  const drag = useRef<{
    from: number;
    positions: number[];
    doc: typeof editor.state.doc;
    x: number;
    y: number;
    currentX: number;
    currentY: number;
    active: boolean;
    target: HTMLButtonElement;
    pointer: number;
  } | null>(null);
  const hovered = useRef<Hit | null>(null);
  hovered.current = hover;
  const dropRef = useRef<Drop | null>(null);
  dropRef.current = drop;
  const suppressClick = useRef(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const follow = (event: PointerEvent) => {
      if (drag.current) return;
      const target = event.target as Element;
      if (target.closest?.(".block-mover")) return;
      let hit = el.contains(target) ? blockAtElement(editor, target) : null;
      if (hit) {
        const parent = hit;
        const nearby = blockRoots(
          editor.state.doc,
          selectedBlocks(editor.state),
        )
          .filter(
            (b) =>
              b.pos > parent.pos && b.pos < parent.pos + parent.node.nodeSize,
          )
          .map((b) => ({
            ...b,
            element: editor.view.nodeDOM(b.pos) as HTMLElement,
          }))
          .filter(
            (b) =>
              b.element instanceof HTMLElement &&
              b.element.getClientRects().length,
          )
          .map((b) => ({
            ...b,
            distance: Math.max(
              b.element.getBoundingClientRect().top - event.clientY,
              event.clientY - b.element.getBoundingClientRect().bottom,
              0,
            ),
          }))
          .sort((a, b) => a.distance - b.distance)[0];
        if (nearby && nearby.distance <= 12) hit = nearby;
      }
      if (hit) setHover(hit);
      else {
        const bounds = editor.view.dom.getBoundingClientRect();
        // Keep the rail reachable while crossing the gutter outside the editable DOM.
        if (
          event.clientX < bounds.left - 64 ||
          event.clientX > bounds.right + 16 ||
          event.clientY < bounds.top - 12 ||
          event.clientY > bounds.bottom + 12
        )
          setHover(null);
      }
    };
    const reset = () => {
      if (!drag.current) setHover(null);
    };
    const refresh = () => {
      if (drag.current) return;
      if (
        !hovered.current &&
        matchMedia("(max-width:600px)").matches &&
        editor.isFocused
      ) {
        const block = selectedBlock(editor.state),
          element = block ? editor.view.nodeDOM(block.pos) : null;
        if (block && element instanceof HTMLElement)
          setHover({ ...block, element });
      }
      const previous = hovered.current;
      if (previous && !editor.state.doc.nodeAt(previous.pos)) setHover(null);
      else if (previous) {
        const element = editor.view.nodeDOM(previous.pos) as HTMLElement;
        if (element instanceof HTMLElement) setHover({ ...previous, element });
      }
    };
    document.addEventListener("pointermove", follow);
    editor.on("transaction", refresh);
    editor.on("focus", refresh);
    editor.on("selectionUpdate", refresh);
    window.addEventListener("resize", reset);
    return () => {
      document.removeEventListener("pointermove", follow);
      editor.off("transaction", refresh);
      editor.off("focus", refresh);
      editor.off("selectionUpdate", refresh);
      window.removeEventListener("resize", reset);
      document.body.classList.remove("block-dragging");
    };
  }, [editor, wrap]);
  useEffect(() => {
    if (!ghost) return;
    let frame = 0;
    const step = () => {
      const d = drag.current;
      if (!d?.active) return;
      const speed =
        d.currentY < 100 ? -12 : d.currentY > innerHeight - 64 ? 12 : 0;
      if (speed) {
        window.scrollBy(0, speed);
        setDrop(dropAt(editor, d.currentX, d.currentY, true));
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    const cancel = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        drag.current = null;
        suppressClick.current = true;
        setGhost(null);
        setDrop(null);
        document.body.classList.remove("block-dragging");
      }
    };
    window.addEventListener("keydown", cancel);
    window.addEventListener("blur", cancelDrag);
    function cancelDrag() {
      drag.current = null;
      suppressClick.current = true;
      setGhost(null);
      setDrop(null);
      document.body.classList.remove("block-dragging");
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", cancel);
      window.removeEventListener("blur", cancelDrag);
    };
  }, [!!ghost, editor]);
  useEffect(() => {
    if (!drop?.pageId || !drop.container) return;
    drop.container.classList.add("block-page-drop-target");
    return () => drop.container?.classList.remove("block-page-drop-target");
  }, [drop?.pageId, drop?.container]);
  if (!hover) return null;
  const rect = hover.element.getBoundingClientRect(),
    base = wrap.current?.getBoundingClientRect();
  if (!base) return null;
  const finish = (cancel = false) => {
    const d = drag.current;
    drag.current = null;
    setGhost(null);
    setDrop(null);
    document.body.classList.remove("block-dragging");
    if (d?.active) {
      suppressClick.current = true;
      const latest = dropAt(editor, d.currentX, d.currentY, true);
      dropRef.current = latest;
      if (!cancel && dropRef.current && editor.state.doc === d.doc) {
        if (dropRef.current.pageId) {
          onMoveToPage(
            dropRef.current.pageId,
            blockJsonPaths(d.doc, d.positions),
          );
          setHover(null);
          return;
        }
        const tr =
          d.positions.length > 1
            ? moveBlocks(editor.state, d.positions, dropRef.current.pos)
            : moveBlock(
                editor.state,
                d.positions[0] ?? d.from,
                dropRef.current.pos,
              );
        if (tr) {
          dropRef.current.container?.dispatchEvent(
            new Event("feuillet:unfold"),
          );
          editor.view.dispatch(tr);
          editor.view.focus();
          onMoved(d.positions.length);
        }
      }
      setHover(null);
    }
  };
  return (
    <>
      <div
        className="block-mover"
        style={{
          top: rect.top - base.top,
          left: matchMedia("(max-width:600px)").matches
            ? Math.max(0, rect.right - base.left - 44)
            : rect.left - base.left - 52,
        }}
        onPointerEnter={() => setHover(hover)}
      >
        <button
          title="Ajouter un bloc après"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(hover.pos)}
        >
          <Plus size={15} />
        </button>
        <button
          aria-label="Déplacer ce bloc ou ouvrir ses actions"
          title="Glisser pour déplacer · Cliquer pour les actions · Alt + flèches au clavier"
          className="block-drag-handle"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            suppressClick.current = false;
            const group = selectedBlocks(editor.state);
            const belongs = group.some((pos) => {
              const node = editor.state.doc.nodeAt(pos);
              return (
                node && hover.pos >= pos && hover.pos < pos + node.nodeSize
              );
            });
            drag.current = {
              positions: belongs ? group : [hover.pos],
              from: hover.pos,
              doc: editor.state.doc,
              x: e.clientX,
              y: e.clientY,
              currentX: e.clientX,
              currentY: e.clientY,
              active: false,
              target: e.currentTarget,
              pointer: e.pointerId,
            };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            d.currentX = e.clientX;
            d.currentY = e.clientY;
            if (!d.active && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5)
              return;
            d.active = true;
            document.body.classList.add("block-dragging");
            setGhost({
              x: Math.max(
                8,
                Math.min(
                  innerWidth - Math.min(260, innerWidth - 16) - 8,
                  e.clientX + 18,
                ),
              ),
              y: Math.max(8, Math.min(innerHeight - 48, e.clientY + 14)),
              text:
                d.positions.length > 1
                  ? `${d.positions.length} blocs`
                  : hover.node.textContent.slice(0, 70) || "Déplacer le bloc",
            });
            setDrop(dropAt(editor, e.clientX, e.clientY, true));
          }}
          onPointerUp={() => finish()}
          onPointerCancel={() => finish(true)}
          onLostPointerCapture={() => {
            if (drag.current) finish(true);
          }}
          onClick={(e) => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            onMenu(hover.pos, e.currentTarget);
          }}
          onKeyDown={(e) => {
            if (!e.altKey) return;
            const directions = {
              ArrowUp: "up",
              ArrowDown: "down",
              ArrowLeft: "out",
              ArrowRight: "in",
            } as const;
            const direction = directions[e.key as keyof typeof directions];
            if (!direction) return;
            e.preventDefault();
            const group = blockRoots(
              editor.state.doc,
              selectedBlocks(editor.state),
            );
            const belongs = group.some(
              (b) => hover.pos >= b.pos && hover.pos < b.pos + b.node.nodeSize,
            );
            const sources = belongs ? group : [hover];
            const anchor =
              direction === "down" ? sources[sources.length - 1] : sources[0];
            const to = blockSiblingDestination(
              editor.state,
              anchor.pos,
              direction,
            );
            if (to !== null) {
              const tr =
                sources.length > 1
                  ? moveBlocks(
                      editor.state,
                      sources.map((b) => b.pos),
                      to,
                    )
                  : moveBlock(editor.state, anchor.pos, to);
              if (tr) {
                editor.view.dispatch(tr);
                editor.view.focus();
                setHover(null);
                onMoved(sources.length);
              }
            }
          }}
        >
          <GripVertical size={16} />
        </button>
      </div>
      {ghost &&
        createPortal(
          <>
            <div
              className="block-drag-ghost"
              style={{ left: ghost.x, top: ghost.y }}
            >
              {drop?.pageId
                ? `Déplacer dans « ${drop.title?.slice(0, 50)} »`
                : ghost.text}
            </div>
            {drop && !drop.pageId && (
              <div
                className={`block-drop-line ${drop.inside ? "inside" : ""}`}
                style={{ left: drop.left, top: drop.top, width: drop.width }}
              >
                <span>{drop.inside ? "Dans la section" : ""}</span>
              </div>
            )}
          </>,
          document.body,
        )}
    </>
  );
}
