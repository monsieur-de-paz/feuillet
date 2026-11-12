import { useLayoutEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  ArrowLeft,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDown01,
  ArrowUp01,
} from "lucide-react";
import { FloatingSurface } from "./FloatingSurface";
import { Select } from "./Select";
import {
  tableHeaderRows,
  tableSortInfo,
  type TableSortMode,
  type TableSortOptions,
} from "./table-sorting";
import { TableMap } from "@tiptap/pm/tables";
import "./table-sort-picker.css";

export function TableSortPicker({
  editor,
  pos,
  column,
  point,
  onClose,
  onBack,
  onApply,
}: {
  editor: Editor;
  pos: number;
  column: number;
  point: { x: number; y: number };
  onClose: () => void;
  onBack: () => void;
  onApply: (options: TableSortOptions) => void;
}) {
  const table = editor.state.doc.nodeAt(pos)!;
  const map = TableMap.get(table);
  const headers = tableHeaderRows(table);
  const [chosen, setChosen] = useState(column);
  const [mode, setMode] = useState<TableSortMode>("auto");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [keepHeader, setKeepHeader] = useState(headers > 0);
  const back = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    back.current?.focus({ preventScroll: true });
  }, []);
  const options = {
    column: chosen,
    mode,
    direction,
    headerRows: keepHeader ? Math.max(1, headers) : 0,
  };
  const info = tableSortInfo(table, options);
  const numeric = info.mode === "number";
  const Ascending = numeric ? ArrowDown01 : ArrowDownAZ;
  const Descending = numeric ? ArrowUp01 : ArrowUpAZ;
  return (
    <FloatingSurface
      point={point}
      label="Trier le tableau"
      role="dialog"
      className="table-sort-picker"
      onClose={onClose}
    >
      <header>
        <button
          ref={back}
          type="button"
          className="icon-button"
          aria-label="Retour aux actions du tableau"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <strong>Trier les lignes</strong>
          <p>Chaque ligne reste complète, avec ses couleurs et ses fichiers.</p>
        </div>
      </header>
      <label>
        Colonne à trier
        <Select
          aria-label="Colonne à trier"
          value={chosen}
          onChange={(e) => setChosen(Number(e.target.value))}
        >
          {Array.from({ length: map.width }, (_, i) => {
            const title = headers
              ? table.nodeAt(map.map[i])?.textContent.trim().slice(0, 60)
              : "";
            return (
              <option key={i} value={i}>
                Colonne {i + 1}
                {title ? ` · ${title}` : ""}
              </option>
            );
          })}
        </Select>
      </label>
      <label>
        Comparer comme
        <Select
          aria-label="Type de tri"
          value={mode}
          onChange={(e) => setMode(e.target.value as TableSortMode)}
        >
          <option value="auto">Détection automatique</option>
          <option value="text">Texte</option>
          <option value="number">Nombres</option>
        </Select>
      </label>
      <div
        role="group"
        aria-label="Ordre du tri"
        className="table-sort-directions"
      >
        <button
          type="button"
          aria-pressed={direction === "asc"}
          onClick={() => setDirection("asc")}
        >
          <Ascending size={20} />
          <strong>Croissant</strong>
          <small>{numeric ? "Du plus petit au plus grand" : "De A à Z"}</small>
        </button>
        <button
          type="button"
          aria-pressed={direction === "desc"}
          onClick={() => setDirection("desc")}
        >
          <Descending size={20} />
          <strong>Décroissant</strong>
          <small>{numeric ? "Du plus grand au plus petit" : "De Z à A"}</small>
        </button>
      </div>
      <label className="table-sort-header">
        <input
          type="checkbox"
          checked={keepHeader}
          onChange={(e) => setKeepHeader(e.target.checked)}
        />
        {headers > 1
          ? `Conserver les ${headers} lignes d’en-tête`
          : "Conserver la première ligne en en-tête"}
      </label>
      {info.error ? (
        <p className="table-sort-error" role="alert">
          {info.error}
        </p>
      ) : (
        <p className="table-sort-note" role="status">
          {numeric ? "Tri numérique" : "Tri alphabétique"} ·{" "}
          {map.height - options.headerRows} lignes. Les cellules vides
          {numeric ? " et les valeurs non numériques" : ""} restent à la fin.
        </p>
      )}
      <footer>
        <small>Annulable avec Ctrl/Cmd + Z.</small>
        <button
          type="button"
          className="primary"
          disabled={!!info.error}
          onClick={() => onApply(options)}
        >
          Appliquer le tri
        </button>
      </footer>
    </FloatingSurface>
  );
}
