import { useEffect, useRef, useState } from "react";
import { importMindMap } from "./mind-map-import";
import type { MapData } from "./mind-map-model";
export function MindMapImport({
  onImport,
}: {
  onImport: (data: MapData) => void;
}) {
  const [source, setSource] = useState<"file" | "text">("file"),
    [format, setFormat] = useState("md"),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const parse = (text: string, name: string) => {
    try {
      if (!text.trim())
        throw new Error("Ajoute un document ou du texte pour continuer.");
      onImport(importMindMap(text, name));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="mm-import-source">
      <div
        className="mm-import-tabs"
        role="group"
        aria-label="Source de l’import"
      >
        <button
          type="button"
          aria-pressed={source === "file"}
          onClick={() => {
            generation.current++;
            setBusy(false);
            setSource("file");
            setError("");
          }}
        >
          Choisir un fichier
        </button>
        <button
          type="button"
          aria-pressed={source === "text"}
          onClick={() => {
            generation.current++;
            setBusy(false);
            setSource("text");
            setError("");
          }}
        >
          Coller du texte
        </button>
      </div>
      {source === "file" ? (
        <label className="mm-import-file">
          Fichier Markdown ou TeX
          <input
            type="file"
            accept=".md,.markdown,.tex"
            disabled={busy}
            aria-label="Fichier de carte mentale"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setError("");
              if (file.size > 1_000_000) {
                setError("Fichier limité à 1 Mo.");
                return;
              }
              if (!/\.(md|markdown|tex)$/i.test(file.name)) {
                setError("Choisis un fichier .md, .markdown ou .tex.");
                return;
              }
              const attempt = ++generation.current;
              setBusy(true);
              try {
                const raw = await file.text();
                if (attempt === generation.current) parse(raw, file.name);
              } catch {
                if (attempt === generation.current)
                  setError("Impossible de lire ce fichier.");
              } finally {
                if (attempt === generation.current) setBusy(false);
              }
            }}
          />
          <small>
            Les titres et sections deviennent les idées de la carte.
          </small>
        </label>
      ) : (
        <>
          <label>
            Format du texte
            <select
              aria-label="Format du texte importé"
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                setError("");
              }}
            >
              <option value="md">Markdown (.md)</option>
              <option value="tex">LaTeX (.tex)</option>
            </select>
          </label>
          <label>
            Texte du document
            <textarea
              aria-label="Texte à importer dans la carte mentale"
              placeholder={
                format === "md"
                  ? "# Mon sujet\n## Une première idée"
                  : "\\title{Mon sujet}\n\\section{Une première idée}"
              }
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError("");
              }}
              maxLength={1_000_001}
            />
          </label>
          <button
            type="button"
            disabled={!text.trim()}
            onClick={() => parse(text, "Document." + format)}
          >
            Importer ce texte
          </button>
        </>
      )}
      {busy && <p role="status">Lecture du document…</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
