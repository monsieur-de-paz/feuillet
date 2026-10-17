import { closeHistory } from "@tiptap/pm/history";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Fragment } from "@tiptap/pm/model";
import { dropAt, type Drop } from "./BlockMover";
import { uploadAttachment } from "./database-types";
import { useApp } from "./context";
import { fileUrl, type FileRecord } from "./types";
export const uploadKey = new PluginKey<{ pos: number; label: string } | null>(
  "feuillet-upload-position",
);
export function uploadPositionPlugin() {
  return new Plugin<{ pos: number; label: string } | null>({
    key: uploadKey,
    state: {
      init: () => null,
      apply(tr, previous) {
        const change = tr.getMeta(uploadKey);
        if (change !== undefined) return change;
        if (!previous) return null;
        const mapped = tr.mapping.mapResult(previous.pos, 1);
        return mapped.deletedAcross ? null : { ...previous, pos: mapped.pos };
      },
    },
    props: {
      decorations(state) {
        const anchor = uploadKey.getState(state);
        if (!anchor) return null;
        return DecorationSet.create(state.doc, [
          Decoration.widget(
            anchor.pos,
            () => {
              const el = document.createElement("div");
              el.className = "file-drop-progress";
              el.setAttribute("role", "status");
              el.contentEditable = "false";
              el.textContent = anchor.label;
              return el;
            },
            { side: 1 },
          ),
        ]);
      },
    },
  });
}
export function uploadedNode(file: FileRecord) {
  return file.mime.startsWith("image/")
    ? {
        type: "image",
        attrs: {
          fileId: file.id,
          src: fileUrl(file.id),
          alt: file.name,
          width: 100,
          align: "center",
          attribution: file.attribution || null,
        },
      }
    : {
        type: "fileBlock",
        attrs: {
          fileId: file.id,
          name: file.name,
          mime: file.mime,
          size: file.size,
          mode:
            file.mime === "application/pdf"
              ? "pdf"
              : file.mime.startsWith("audio/")
                ? "audio"
                : file.mime.startsWith("video/")
                  ? "video"
                  : "download",
        },
      };
}
export function insertUploadedFiles(
  state: EditorState,
  files: FileRecord[],
  pos: number,
) {
  const nodes = files.map((f) => state.schema.nodeFromJSON(uploadedNode(f))),
    $pos = state.doc.resolve(pos);
  if (!nodes.length) return null;
  if ($pos.index() === $pos.parent.childCount) {
    const withParagraph = [...nodes, state.schema.nodes.paragraph.create()];
    if (
      $pos.parent.canReplace(
        $pos.index(),
        $pos.index(),
        Fragment.fromArray(withParagraph),
      )
    )
      nodes.push(state.schema.nodes.paragraph.create());
  }
  const fragment = Fragment.fromArray(nodes);
  if (!$pos.parent.canReplace($pos.index(), $pos.index(), fragment))
    return null;
  const tr = state.tr.insert(pos, fragment);
  tr.doc.check();
  return closeHistory(tr).scrollIntoView();
}
export function EditorFileDrop({
  editor,
  wrap,
}: {
  editor: Editor;
  wrap: RefObject<HTMLDivElement | null>;
}) {
  const app = useApp(),
    appRef = useRef(app);
  appRef.current = app;
  const [line, setLine] = useState<Drop | null>(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let live = true,
      pending = false;
    editor.registerPlugin(uploadPositionPlugin());
    const anchor = (value: { pos: number; label: string } | null) => {
      if (live && !editor.isDestroyed)
        editor.view.dispatch(
          editor.state.tr
            .setMeta(uploadKey, value)
            .setMeta("addToHistory", false),
        );
    };
    const over = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = pending ? "none" : "copy";
      setLine(dropAt(editor, event.clientX, event.clientY));
    };
    const leave = (event: DragEvent) => {
      if (!el.contains(event.relatedTarget as Node)) setLine(null);
    };
    const before = (event: Event) => {
      if (pending) {
        event.preventDefault();
        appRef.current.notify(
          "L’envoi des fichiers est en cours. Patiente avant de changer de page.",
        );
      }
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (pending) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const drop = async (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes("Files")) return;
      event.preventDefault();
      event.stopPropagation();
      setLine(null);
      const files = Array.from(event.dataTransfer.files);
      if (!files.length) return;
      if (pending) {
        appRef.current.notify("Un envoi est déjà en cours sur cette page.");
        return;
      }
      const target = dropAt(editor, event.clientX, event.clientY);
      if (!target || !editor.isEditable) return;
      pending = true;
      anchor({
        pos: target.pos,
        label: `Envoi de ${files.length} fichier${files.length > 1 ? "s" : ""}…`,
      });
      const uploaded: FileRecord[] = [],
        errors: string[] = [];
      try {
        for (const [index, file] of files.entries()) {
          try {
            const result = await uploadAttachment(file, (progress) => {
              if (!live || editor.isDestroyed) return;
              const current = uploadKey.getState(editor.state);
              if (current)
                anchor({
                  ...current,
                  label: `${index + 1}/${files.length} · ${file.name} · ${progress} %`,
                });
            });
            uploaded.push(result);
            appRef.current.uploadedFile(result);
          } catch (error) {
            errors.push(`${file.name} : ${(error as Error).message}`);
          }
        }
        if (!live || editor.isDestroyed) {
          appRef.current.notify(
            "Les fichiers envoyés sont disponibles dans la bibliothèque.",
          );
          return;
        }
        const position = uploadKey.getState(editor.state);
        anchor(null);
        if (uploaded.length && position) {
          const transaction = insertUploadedFiles(
            editor.state,
            uploaded,
            position.pos,
          );
          if (!transaction)
            throw new Error(
              "Cet emplacement a changé. Les fichiers sont disponibles dans la bibliothèque.",
            );
          editor.view.dispatch(transaction);
          appRef.current.notify(
            `${uploaded.length} fichier${uploaded.length > 1 ? "s" : ""} ajouté${uploaded.length > 1 ? "s" : ""} à la page.${errors.length ? " Certains fichiers n’ont pas pu être envoyés : " + errors.join(" · ") : ""}`,
          );
        } else if (uploaded.length)
          appRef.current.notify(
            "L’emplacement a été supprimé. Les fichiers sont disponibles dans la bibliothèque.",
          );
        if (!uploaded.length && errors.length)
          appRef.current.notify(errors.join(" · "));
      } catch (error) {
        appRef.current.notify((error as Error).message);
      } finally {
        pending = false;
        anchor(null);
      }
    };
    el.addEventListener("dragover", over, true);
    el.addEventListener("dragleave", leave);
    el.addEventListener("drop", drop, true);
    document.addEventListener("feuillet:before-page-change", before);
    window.addEventListener("beforeunload", unload);
    return () => {
      live = false;
      el.removeEventListener("dragover", over, true);
      el.removeEventListener("dragleave", leave);
      el.removeEventListener("drop", drop, true);
      document.removeEventListener("feuillet:before-page-change", before);
      window.removeEventListener("beforeunload", unload);
      if (!editor.isDestroyed) editor.unregisterPlugin(uploadKey);
    };
  }, [editor, wrap]);
  return line
    ? createPortal(
        <div
          className="block-drop-line file-drop-line"
          style={{ left: line.left, top: line.top, width: line.width }}
        >
          <span>Déposer les fichiers ici</span>
        </div>,
        document.body,
      )
    : null;
}
