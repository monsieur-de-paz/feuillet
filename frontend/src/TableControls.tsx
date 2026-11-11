import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Editor } from "@tiptap/core";
import type { Command } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import { TextSelection } from "@tiptap/pm/state";
import {
  TableMap,
  CellSelection,
  addRowBefore,
  addRowAfter,
  addColumnBefore,
  addColumnAfter,
  deleteRow,
  deleteColumn,
  deleteTable,
  mergeCells,
  splitCell,
  toggleHeaderRow,
  toggleHeaderColumn,
  selectedRect,
  deleteCellSelection,
} from "@tiptap/pm/tables";
import {
  Plus,
  MoreHorizontal,
  GripVertical,
  Table2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Merge,
  Split,
  Heading,
} from "lucide-react";
import { ContextMenu, type MenuAction } from "./ContextMenu";
import {
  selectTableAxis,
  tableAtSelection,
  type TableAxis,
} from "./table-selection";
import "./table-controls.css";

type Metrics = {
  pos: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  visibleTop: number;
  visibleBottom: number;
  rows: { index: number; center: number; start: number; end: number }[];
  columns: { index: number; center: number; start: number; end: number }[];
};
type Menu = { axis: TableAxis | "cell"; x: number; y: number; index?: number };

export function TableControls({ editor }: { editor: Editor }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [hovered, setHovered] = useState({ row: -1, column: -1, corner: false });
  const measured = useRef<Metrics | null>(null);
  measured.current = metrics;
  const [menu, setMenu] = useState<Menu | null>(null);
  const tablePos = useRef<number | null>(null);
  const rangeAnchor = useRef<{
    pos: number;
    axis: TableAxis;
    index: number;
  } | null>(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const pos = tablePos.current;
      const node = pos === null ? null : editor.state.doc.nodeAt(pos);
      const dom = pos === null ? null : editor.view.nodeDOM(pos);
      const table =
        dom instanceof HTMLTableElement
          ? dom
          : dom instanceof HTMLElement
            ? dom.querySelector("table")
            : null;
      if (!node || node.type.name !== "table" || !table?.isConnected) {
        setMetrics(null);
        return;
      }
      const rect = table.getBoundingClientRect();
      const wrapper =
        table.closest(".tableWrapper")?.getBoundingClientRect() ?? rect;
      const headerBottom =
        document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0;
      const left = Math.max(32, rect.left, wrapper.left);
      const right = Math.min(innerWidth - 34, rect.right, wrapper.right);
      const visibleTop = Math.max(headerBottom + 34, rect.top);
      const visibleBottom = Math.min(innerHeight - 40, rect.bottom);
      const map = TableMap.get(node);
      const columns = [
        ...table.querySelectorAll<HTMLTableColElement>("colgroup > col"),
      ];
      setMetrics({
        pos: pos!,
        left,
        right,
        top: rect.top,
        bottom: rect.bottom,
        visibleTop,
        visibleBottom,
        rows: [...table.rows]
          .map((row, index) => {
            const box = row.getBoundingClientRect();
            return { index, center: (box.top + box.bottom) / 2, start: box.top, end: box.bottom };
          })
          .filter(
            (row) => row.center >= visibleTop && row.center <= visibleBottom,
          ),
        columns: Array.from({ length: map.width }, (_, index) => {
          const box = columns[index]?.getBoundingClientRect();
          return {
            index,
            start: box && box.width > 0 ? box.left : rect.left + rect.width * index / map.width,
            end: box && box.width > 0 ? box.right : rect.left + rect.width * (index + 1) / map.width,
            center:
              box && box.width > 0
                ? box.left + box.width / 2
                : rect.left + (rect.width * (index + 0.5)) / map.width,
          };
        }).filter((column) => column.center >= left && column.center <= right),
      });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const fromCell = (cell: HTMLTableCellElement) => {
      const $pos = editor.state.doc.resolve(editor.view.posAtDOM(cell, 0));
      for (let depth = $pos.depth; depth > 0; depth--) {
        if ($pos.node(depth).type.name === "table") return $pos.before(depth);
      }
      return null;
    };
    const hover = (event: PointerEvent) => {
      const cell = (event.target as Element).closest<HTMLTableCellElement>(
        "td,th",
      );
      if (cell && editor.view.dom.contains(cell)) {
        tablePos.current = fromCell(cell);
        schedule();
      }
    };
    const reveal = (event: PointerEvent) => {
      if ((event.target as Element).closest?.(".feuillet-floating")) return;
      const m = measured.current;
      const x = event.clientX, y = event.clientY;
      const nearby = m && x >= m.left - 32 && x <= m.right + 32 && y >= m.visibleTop - 32 && y <= m.visibleBottom + 32;
      const row = nearby ? m.rows.find(r => y >= r.start && y <= r.end)?.index ?? -1 : -1;
      const column = nearby ? m.columns.find(c => x >= c.start && x <= c.end)?.index ?? -1 : -1;
      const corner = !!nearby && x < m.left && y < m.top;
      setHovered(old => old.row === row && old.column === column && old.corner === corner ? old : { row, column, corner });
    };
    const hide = () => setHovered({ row: -1, column: -1, corner: false });
    const update = () => {
      const selected = tableAtSelection(editor.state);
      tablePos.current = selected;
      if (selected === null) setMenu(null);
      schedule();
    };
    const context = (event: Event) => {
      const mouse = event as globalThis.MouseEvent;
      if (mouse.shiftKey) return;
      const cell = (event.target as Element).closest<HTMLTableCellElement>(
        "td,th",
      );
      if (!cell || !editor.view.dom.contains(cell)) return;
      const pos = fromCell(cell);
      if (pos === null) return;
      event.preventDefault();
      event.stopPropagation();
      tablePos.current = pos;
      const cellPos = editor.view.posAtDOM(cell, 0) - 1;
      const selection = editor.state.selection;
      let included = false;
      if (selection instanceof CellSelection)
        selection.forEachCell((_node, p) => {
          if (p === cellPos) included = true;
        });
      if (!included)
        editor.view.dispatch(
          editor.state.tr.setSelection(
            TextSelection.near(editor.state.doc.resolve(cellPos + 1)),
          ),
        );
      schedule();
      setMenu({ axis: "cell", x: mouse.clientX, y: mouse.clientY });
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (
        !editor.view.dom.contains(target) &&
        !target.closest(".feuillet-table-controls,.feuillet-floating")
      ) {
        setMenu(null);
        tablePos.current = tableAtSelection(editor.state);
        schedule();
      }
    };
    editor.view.dom.addEventListener("pointerover", hover);
    editor.view.dom.addEventListener("contextmenu", context, true);
    editor.on("transaction", update);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("pointermove", reveal);
    document.documentElement.addEventListener("pointerleave", hide);
    const observer = new ResizeObserver(schedule);
    observer.observe(editor.view.dom);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      editor.view.dom.removeEventListener("pointerover", hover);
      editor.view.dom.removeEventListener("contextmenu", context, true);
      editor.off("transaction", update);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("pointermove", reveal);
      document.documentElement.removeEventListener("pointerleave", hide);
    };
  }, [editor]);

  function select(axis: TableAxis, index: number, extend = false) {
    if (!metrics || metrics.pos !== tablePos.current) return false;
    const previous = rangeAnchor.current;
    const anchor =
      extend && previous?.pos === metrics.pos && previous.axis === axis
        ? previous.index
        : index;
    const tr = selectTableAxis(editor.state, metrics.pos, axis, index, anchor);
    if (!tr) return false;
    if (!extend || previous?.axis !== axis || previous.pos !== metrics.pos)
      rangeAnchor.current = { pos: metrics.pos, axis, index };
    editor.view.dispatch(tr);
    return true;
  }
  function run(command: Command) {
    if (editor.isDestroyed) return;
    rangeAnchor.current = null;
    editor.view.dispatch(closeHistory(editor.state.tr));
    command(
      editor.state,
      (tr) => editor.view.dispatch(tr.scrollIntoView()),
      editor.view,
    );
    editor.view.dispatch(closeHistory(editor.state.tr));
    editor.view.focus();
  }
  function open(
    event: MouseEvent<HTMLButtonElement>,
    axis: TableAxis,
    index: number,
  ) {
    if (!select(axis, index, event.shiftKey)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    // Keep the row gutter reachable for Shift-click range selection.
    setMenu({ axis, index, x: axis === "row" ? metrics!.left + 10 : rect.left, y: rect.bottom + 4 });
  }
  function append(axis: "row" | "column") {
    if (!metrics || metrics.pos !== tablePos.current) return;
    const node = metrics && editor.state.doc.nodeAt(metrics.pos);
    if (!node) return;
    const map = TableMap.get(node);
    if (select(axis, (axis === "row" ? map.height : map.width) - 1))
      run(axis === "row" ? addRowAfter : addColumnAfter);
  }
  function actions(): MenuAction[] {
    const action = (
      label: string,
      command: Command,
      icon: React.ReactNode,
      group: string,
      danger = false,
    ): MenuAction => ({
      label,
      icon,
      group,
      danger,
      disabled: !command(editor.state),
      run: () => run(command),
    });
    const items = [
      action("Insérer une ligne au-dessus", addRowBefore, <ArrowUp />, "rows"),
      action(
        "Insérer une ligne en dessous",
        addRowAfter,
        <ArrowDown />,
        "rows",
      ),
      action(
        "Supprimer les lignes sélectionnées",
        deleteRow,
        <Trash2 />,
        "rows",
        true,
      ),
      action(
        "Insérer une colonne à gauche",
        addColumnBefore,
        <ArrowLeft />,
        "columns",
      ),
      action(
        "Insérer une colonne à droite",
        addColumnAfter,
        <ArrowRight />,
        "columns",
      ),
      action(
        "Supprimer les colonnes sélectionnées",
        deleteColumn,
        <Trash2 />,
        "columns",
        true,
      ),
      action("Fusionner les cellules", mergeCells, <Merge />, "cells"),
      action("Séparer la cellule", splitCell, <Split />, "cells"),
      action(
        "Vider les cellules sélectionnées",
        deleteCellSelection,
        <Trash2 />,
        "cells",
      ),
      action(
        "Activer / désactiver la ligne d’en-tête",
        toggleHeaderRow,
        <Heading />,
        "headers",
      ),
      action(
        "Activer / désactiver la colonne d’en-tête",
        toggleHeaderColumn,
        <Heading />,
        "headers",
      ),
      action("Supprimer le tableau", deleteTable, <Trash2 />, "delete", true),
    ];
    if (menu?.axis === "cell") {
      const rect = selectedRect(editor.state);
      items.unshift(
        {
          label: "Sélectionner la ligne",
          icon: <MoreHorizontal />,
          group: "select",
          run: () => {
            if (select("row", rect.top)) setMenu({ ...menu, axis: "row" });
          },
          danger: false,
          disabled: false,
        },
        {
          label: "Sélectionner la colonne",
          icon: <GripVertical />,
          group: "select",
          run: () => {
            if (select("column", rect.left))
              setMenu({ ...menu, axis: "column" });
          },
          danger: false,
          disabled: false,
        },
      );
    }
    return items.filter((item) => {
      if (menu?.axis === "row")
        return (
          item.group !== "columns" &&
          item.label !== "Activer / désactiver la colonne d’en-tête" &&
          item.group !== "delete"
        );
      if (menu?.axis === "column")
        return (
          item.group !== "rows" &&
          item.label !== "Activer / désactiver la ligne d’en-tête" &&
          item.group !== "delete"
        );
      if (menu?.axis === "table")
        return item.group !== "rows" && item.group !== "columns";
      return true;
    });
  }

  if (
    !metrics ||
    metrics.right <= metrics.left ||
    metrics.visibleBottom <= metrics.visibleTop
  )
    return null;
  const topVisible = metrics.top >= metrics.visibleTop;
  return (
    <div className="feuillet-table-controls" contentEditable={false}>
      {metrics.rows.map((row) => (
        <button
          type="button"
          className={`table-axis-handle table-row-handle ${hovered.row === row.index || (menu?.axis === "row" && menu.index === row.index) ? "is-revealed" : ""}`}
          style={{ left: metrics.left - 29, top: row.center - 13 }}
          key={row.index}
          aria-haspopup="menu"
          aria-label={`Actions de la ligne ${row.index + 1}`}
          title={`Ligne ${row.index + 1} · Maj + clic pour étendre la sélection`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => open(event, "row", row.index)}
        >
          <MoreHorizontal size={15} />
        </button>
      ))}
      {topVisible &&
        metrics.columns.map((column) => (
          <button
            type="button"
            className={`table-axis-handle table-column-handle ${hovered.column === column.index || (menu?.axis === "column" && menu.index === column.index) ? "is-revealed" : ""}`}
            style={{ left: column.center - 13, top: metrics.top - 29 }}
            key={column.index}
            aria-haspopup="menu"
            aria-label={`Actions de la colonne ${column.index + 1}`}
            title={`Colonne ${column.index + 1} · Maj + clic pour étendre la sélection`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => open(event, "column", column.index)}
          >
            <GripVertical size={15} />
          </button>
        ))}
      {topVisible && (
        <button
          type="button"
          className={`table-axis-handle ${hovered.corner || menu?.axis === "table" ? "is-revealed" : ""}`}
          style={{ left: metrics.left - 29, top: metrics.top - 29 }}
          aria-label="Sélectionner tout le tableau"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => open(event, "table", 0)}
        >
          <Table2 size={15} />
        </button>
      )}
      {metrics.bottom <= metrics.visibleBottom && (
        <button
          type="button"
          className="table-edge-add table-add-row"
          style={{
            left: metrics.left,
            top: metrics.bottom + 4,
            width: metrics.right - metrics.left,
          }}
          aria-label="Ajouter une ligne à la fin du tableau"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => append("row")}
        >
          <Plus size={16} />
          <span>Ajouter une ligne</span>
        </button>
      )}
      <button
        type="button"
        className="table-edge-add table-add-column"
        style={{
          left: metrics.right + 4,
          top: metrics.visibleTop,
          height: metrics.visibleBottom - metrics.visibleTop,
        }}
        aria-label="Ajouter une colonne à la fin du tableau"
        title="Ajouter une colonne"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => append("column")}
      >
        <Plus size={16} />
      </button>
      {menu && (
        <ContextMenu
          point={{ x: menu.x, y: menu.y }}
          title={
            menu.axis === "row"
              ? "Lignes sélectionnées"
              : menu.axis === "column"
                ? "Colonnes sélectionnées"
                : "Tableau et cellules"
          }
          actions={actions()}
          onClose={() => setMenu(null)}
          onRestoreFocus={() => editor.view.focus()}
        />
      )}
    </div>
  );
}
