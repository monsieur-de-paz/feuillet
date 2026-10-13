import { Select } from "./Select";
import {
  Node,
  mergeAttributes,
  type NodeViewProps,
  type Editor,
} from "@tiptap/core";
import Image from "@tiptap/extension-image";
import {
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import {
  FileText,
  Download,
  ExternalLink,
  ArrowUpRight,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  Image as ImageIcon,
  BookOpen,
  Settings,
  ArrowUp,
  ArrowDown,
  Pencil,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RefreshCw,
  LayoutGrid,
  List,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useApp } from "./context";
import { DatabaseView, FormView } from "./Database";
import { imageSource } from "./MediaLightbox";
import { FeuilletIcon } from "./IconPicker";
import {
  api,
  fileUrl,
  pageUrl,
  safeLink,
  sizeLabel,
  type FileRecord,
} from "./types";

type MediaAttribution = {
  author?: string;
  license?: string;
  source_url?: string;
  license_url?: string;
};
function MediaCredit({
  attribution,
  compact = false,
}: {
  attribution: MediaAttribution | null | undefined;
  compact?: boolean;
}) {
  if (!attribution) return null;
  const author = attribution.author || "Wikimedia Commons";
  return (
    <div
      className={`image-attribution ${compact ? "compact" : ""}`}
      aria-label="Crédits de l’image"
    >
      <span>{author}</span>
      {attribution.license && (
        <>
          {" · "}
          {attribution.license_url ? (
            <a
              href={safeLink(attribution.license_url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {attribution.license}
            </a>
          ) : (
            <span>{attribution.license}</span>
          )}
        </>
      )}
      {attribution.source_url && (
        <>
          {" · "}
          <a
            href={safeLink(attribution.source_url)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Source
          </a>
        </>
      )}
    </div>
  );
}

function ResizableImageView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const app = useApp();
  const container = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    width: number;
    parentWidth: number;
    edge: number;
    last: number;
  } | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const width = Math.max(10, Math.min(100, Number(node.attrs.width) || 100));
  const align = ["left", "center", "right"].includes(node.attrs.align)
    ? node.attrs.align
    : "center";
  const label = node.attrs.title || node.attrs.alt || "Image";
  const [storedAttribution, setStoredAttribution] =
    useState<MediaAttribution | null>(null);
  useEffect(() => {
    let cancelled = false;
    setStoredAttribution(null);
    if (node.attrs.fileId && !node.attrs.attribution) {
      void api("file_info", undefined, { id: String(node.attrs.fileId) })
        .then(({ file }) => {
          if (!cancelled) setStoredAttribution(file.attribution || null);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [node.attrs.fileId, node.attrs.attribution]);
  const rename = () => {
    if (!node.attrs.fileId) return;
    app.renameFile({
      id: String(node.attrs.fileId),
      name: label,
      mime: "image/*",
      size: 0,
      url: node.attrs.src,
    });
  };
  const resize = (
    event: React.PointerEvent<HTMLButtonElement>,
    edge: number,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    if (!container.current) return;
    drag.current = {
      x: event.clientX,
      width: width,
      parentWidth: container.current.getBoundingClientRect().width,
      edge,
      last: width,
    };
    setPreview(width);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const d = drag.current;
    const delta = (event.clientX - d.x) * d.edge;
    const factor = align === "center" ? 2 : 1;
    d.last = Math.max(
      10,
      Math.min(
        100,
        d.width + (delta / Math.max(1, d.parentWidth)) * 100 * factor,
      ),
    );
    setPreview(d.last);
  };
  const finish = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    updateAttributes({ width: Math.round(drag.current.last) });
    drag.current = null;
    setPreview(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return (
    <NodeViewWrapper
      className={`resizable-image-node ${selected ? "is-selected" : ""}`}
      contentEditable={false}
    >
      <div ref={container} className="image-resize-container">
        <div
          className={`image-resize-frame align-${align}`}
          style={{ width: `${preview ?? width}%` }}
        >
          <img
            src={
              node.attrs.fileId ? fileUrl(node.attrs.fileId) : node.attrs.src
            }
            alt={node.attrs.alt || ""}
            title={node.attrs.title || undefined}
            draggable={false}
            loading="lazy"
            role="button"
            tabIndex={0}
            aria-label={`Agrandir : ${label}`}
            className="zoomable-image"
            onClick={() =>
              app.zoomImage(
                node.attrs.fileId
                  ? fileUrl(node.attrs.fileId)
                  : imageSource(node.attrs.src),
                label,
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                app.zoomImage(
                  node.attrs.fileId
                    ? fileUrl(node.attrs.fileId)
                    : imageSource(node.attrs.src),
                  label,
                );
              }
            }}
          />
          {app.admin &&
            [-1, 1].map((edge) => (
              <button
                key={edge}
                className={`image-resize-handle edge-${edge === -1 ? "left" : "right"}`}
                aria-label={`Redimensionner l’image, poignée ${edge === -1 ? "gauche" : "droite"}`}
                role="slider"
                aria-valuemin={10}
                aria-valuemax={100}
                aria-valuenow={Math.round(preview ?? width)}
                aria-valuetext={`${Math.round(preview ?? width)} %`}
                onPointerDown={(event) => resize(event, edge)}
                onPointerMove={move}
                onPointerUp={finish}
                onPointerCancel={finish}
                onKeyDown={(event) => {
                  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                    event.preventDefault();
                    updateAttributes({
                      width: Math.max(
                        10,
                        Math.min(
                          100,
                          width +
                            (event.key === "ArrowRight" ? 1 : -1) *
                              (event.shiftKey ? 10 : 1),
                        ),
                      ),
                    });
                  }
                }}
              >
                <span />
              </button>
            ))}
        </div>
      </div>
      <MediaCredit attribution={node.attrs.attribution || storedAttribution} />
      {app.admin && (
        <div className="image-block-tools">
          <span>{Math.round(preview ?? width)} %</span>
          <label>
            Largeur
            <input
              aria-label="Largeur de l’image"
              type="range"
              min="10"
              max="100"
              value={Math.round(preview ?? width)}
              onChange={(event) =>
                updateAttributes({ width: Number(event.target.value) })
              }
            />
          </label>
          <button
            title="Aligner à gauche"
            aria-pressed={align === "left"}
            onClick={() => updateAttributes({ align: "left" })}
          >
            <AlignLeft size={15} />
          </button>
          <button
            title="Centrer l’image"
            aria-pressed={align === "center"}
            onClick={() => updateAttributes({ align: "center" })}
          >
            <AlignCenter size={15} />
          </button>
          <button
            title="Aligner à droite"
            aria-pressed={align === "right"}
            onClick={() => updateAttributes({ align: "right" })}
          >
            <AlignRight size={15} />
          </button>
          <button
            title="Remplacer l’image"
            onClick={() =>
              app.chooseImage("image", (file) =>
                updateAttributes({
                  fileId: String(file.id),
                  src: fileUrl(file.id),
                  alt: file.name,
                  title: file.name,
                  attribution:
                    (
                      file as FileRecord & {
                        attribution?: MediaAttribution | null;
                      }
                    ).attribution || null,
                }),
              )
            }
          >
            <RefreshCw size={15} />
            <span>Remplacer</span>
          </button>
          <button title="Renommer l’image" onClick={rename}>
            <Pencil size={15} />
            <span>Renommer</span>
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fileId: { default: null },
      width: { default: 100 },
      align: { default: "center" },
      attribution: { default: null },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const { admin } = useApp();
  return (
    <NodeViewWrapper className={`callout tone-${node.attrs.tone}`}>
      <div contentEditable={false} className="callout-glyph">
        {admin ? (
          <button
            className="icon-edit"
            title="Changer l’emoji"
            onClick={() => {
              const icon = prompt("Emoji de l’encadré", node.attrs.icon);
              if (icon !== null) updateAttributes({ icon });
            }}
          >
            {node.attrs.icon || "💡"}
          </button>
        ) : (
          node.attrs.icon || "💡"
        )}
      </div>
      <NodeViewContent className="callout-content" />
      {admin && (
        <Select
          aria-label="Couleur de l’encadré"
          className="tone-select"
          contentEditable={false}
          value={node.attrs.tone}
          onChange={(e) => updateAttributes({ tone: e.target.value })}
        >
          <option value="blue">Bleu</option>
          <option value="green">Vert</option>
          <option value="amber">Jaune</option>
          <option value="red">Rose</option>
          <option value="gray">Gris</option>
        </Select>
      )}
    </NodeViewWrapper>
  );
}
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { tone: { default: "blue" }, icon: { default: "💡" } };
  },
  parseHTML() {
    return [{ tag: "aside[data-callout]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-callout": "",
        class: `callout tone-${HTMLAttributes.tone}`,
      }),
      0,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});
export const Columns = Node.create({
  name: "columns",
  group: "block",
  content: "column{2,3}",
  defining: true,
  parseHTML() {
    return [{ tag: "div[data-columns]" }];
  },
  renderHTML() {
    return ["div", { "data-columns": "", class: "columns" }, 0];
  },
});
export const Column = Node.create({
  name: "column",
  content: "block+",
  defining: true,
  parseHTML() {
    return [{ tag: "div[data-column]" }];
  },
  renderHTML() {
    return ["div", { "data-column": "", class: "column" }, 0];
  },
});
function DetailsView({ node, updateAttributes }: NodeViewProps) {
  const { admin } = useApp();
  const [open, setOpen] = useState(admin);
  return (
    <NodeViewWrapper className={`details-block ${open ? "is-open" : ""}`}>
      <div className="details-heading" contentEditable={false}>
        <button
          className="details-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <ChevronDown size={18} />
        </button>
        {admin ? (
          <input
            aria-label="Titre de la partie repliable"
            value={node.attrs.summary}
            onChange={(e) => updateAttributes({ summary: e.target.value })}
          />
        ) : (
          <button onClick={() => setOpen(!open)}>{node.attrs.summary}</button>
        )}
      </div>
      <div hidden={!open}>
        <NodeViewContent className="details-content" />
      </div>
    </NodeViewWrapper>
  );
}
export const Details = Node.create({
  name: "details",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { summary: { default: "Voir le corrigé" } };
  },
  parseHTML() {
    return [{ tag: "details" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-details": "" }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DetailsView);
  },
});
function PageLinkView({ node }: NodeViewProps) {
  const app = useApp();
  const page = app.pages.find(
    (p) => String(p.id) === String(node.attrs.pageId),
  );
  return (
    <NodeViewWrapper contentEditable={false} className="page-link-block">
      <a
        href={pageUrl(node.attrs.pageId)}
        onClick={(e) => {
          e.preventDefault();
          app.openPage(String(node.attrs.pageId));
        }}
      >
        <span>
          <FeuilletIcon
            icon={page?.icon || node.attrs.icon || "📄"}
            iconId={page?.icon_id}
            size={20}
          />
        </span>
        <span>{page?.title || node.attrs.label || "Page"}</span>
        <ArrowUpRight size={17} />
      </a>
    </NodeViewWrapper>
  );
}
export const PageLink = Node.create({
  name: "pageLink",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      pageId: { default: "" },
      label: { default: "Page" },
      icon: { default: "📄" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-page-link]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-page-link": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PageLinkView);
  },
});
export type LinkPresentation = "inline" | "button" | "card";
export function linkPresentationContent(
  mode: LinkPresentation,
  href: string,
  label: string,
  description = "",
) {
  const url = safeLink(href);
  if (mode === "inline")
    return {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: label || href,
          marks: [{ type: "link", attrs: { href: url } }],
        },
      ],
    };
  if (mode === "button")
    return { type: "buttonLink", attrs: { href: url, label: label || href } };
  return {
    type: "bookmark",
    attrs: { href: url, title: label || href, description, source: url },
  };
}
export function transformSelectedLink(editor: Editor, mode: LinkPresentation) {
  const href = editor.getAttributes("link").href;
  if (!href || safeLink(href) === "#") return false;
  editor.commands.extendMarkRange("link");
  const { from, to } = editor.state.selection;
  const label = editor.state.doc.textBetween(from, to, " ") || href;
  if (mode === "inline") return true;
  return editor
    .chain()
    .focus()
    .insertContentAt({ from, to }, linkPresentationContent(mode, href, label))
    .run();
}
function LinkResourceView({ node, editor, getPos, selected }: NodeViewProps) {
  const app = useApp();
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<LinkPresentation>(
    node.type.name === "bookmark" ? "card" : "button",
  );
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const first = useRef<HTMLInputElement>(null);
  const edit = () => {
    setMode(node.type.name === "bookmark" ? "card" : "button");
    setLabel(node.attrs.label || node.attrs.title || "");
    setHref(node.attrs.href || "");
    setDescription(node.attrs.description || "");
    setError("");
    setEditing(true);
  };
  useEffect(() => {
    if (editing) requestAnimationFrame(() => first.current?.focus());
  }, [editing]);
  useEffect(() => {
    const open = (event: Event) => {
      if ((event as CustomEvent<{ pos: number }>).detail?.pos === getPos())
        edit();
    };
    document.addEventListener("feuillet-edit-resource", open);
    document.addEventListener("feuillet-edit-button", open);
    return () => {
      document.removeEventListener("feuillet-edit-resource", open);
      document.removeEventListener("feuillet-edit-button", open);
    };
  }, [node.attrs, getPos]);
  const isCard = node.type.name === "bookmark";
  return (
    <NodeViewWrapper
      contentEditable={false}
      className={`${isCard ? "bookmark-block" : "button-block"} ${selected ? "resource-selected" : ""}`}
    >
      <div className="resource-presentation-row">
        {isCard ? (
          <a
            href={safeLink(node.attrs.href)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="bookmark-symbol">
              <BookOpen size={25} />
            </div>
            <div>
              <strong>{node.attrs.title || node.attrs.href}</strong>
              {node.attrs.description && <p>{node.attrs.description}</p>}
              <small>{node.attrs.href}</small>
            </div>
            <ArrowUpRight size={18} />
          </a>
        ) : (
          <a
            className="resource-button"
            href={safeLink(node.attrs.href)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {node.attrs.label}
            <ExternalLink size={16} />
          </a>
        )}
        {app.admin && (
          <button
            className="small-button resource-settings"
            aria-label="Modifier la présentation du lien"
            title="Modifier la présentation du lien"
            aria-expanded={editing}
            onClick={edit}
          >
            <Settings size={16} />
            <span>Présentation</span>
          </button>
        )}
      </div>
      {app.admin && editing && (
        <form
          className="inline-button-editor resource-config"
          onSubmit={(event) => {
            event.preventDefault();
            const url = safeLink(href);
            if (!href.trim() || url === "#") {
              setError("Indique une adresse HTTP, HTTPS ou un lien valide.");
              return;
            }
            if (!label.trim()) {
              setError("Donne un libellé au lien.");
              return;
            }
            const pos = getPos();
            if (typeof pos !== "number" || editor.isDestroyed) return;
            editor
              .chain()
              .focus()
              .insertContentAt(
                { from: pos, to: pos + node.nodeSize },
                linkPresentationContent(
                  mode,
                  url,
                  label.trim(),
                  description.trim(),
                ),
              )
              .run();
            setEditing(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setEditing(false);
            }
          }}
        >
          <label>
            Présentation
            <Select
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as LinkPresentation)
              }
            >
              <option value="inline">Lien dans le texte</option>
              <option value="button">Bouton</option>
              <option value="card">Carte avec aperçu</option>
            </Select>
          </label>
          <label>
            Texte du lien
            <input
              ref={first}
              value={label}
              maxLength={240}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <label>
            Adresse du lien
            <input
              value={href}
              onChange={(event) => setHref(event.target.value)}
              placeholder="https://…"
            />
          </label>
          {mode === "card" && (
            <label>
              Description de l’aperçu
              <textarea
                value={description}
                maxLength={2000}
                onChange={(event) => setDescription(event.target.value)}
              />
              <small>
                Aperçu rédigé ici ; aucune récupération automatique du site
                distant.
              </small>
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div>
            <button
              type="button"
              className="small-button"
              onClick={() => setEditing(false)}
            >
              Annuler
            </button>
            <button className="primary-button">
              <Check size={15} />
              Appliquer
            </button>
          </div>
        </form>
      )}
    </NodeViewWrapper>
  );
}
export const ButtonLink = Node.create({
  name: "buttonLink",
  group: "block",
  atom: true,
  addAttributes() {
    return { href: { default: "" }, label: { default: "Ouvrir la ressource" } };
  },
  parseHTML() {
    return [{ tag: "div[data-button-link]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-button-link": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(LinkResourceView);
  },
});
export const Bookmark = Node.create({
  name: "bookmark",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      href: { default: "" },
      title: { default: "" },
      description: { default: "" },
      source: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-bookmark]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-bookmark": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(LinkResourceView);
  },
});
function FileView({ node, updateAttributes, getPos, selected }: NodeViewProps) {
  const app = useApp();
  const [editing, setEditing] = useState(false);
  const { fileId, name, mime, size, mode } = node.attrs;
  const supportedMode =
    mime === "application/pdf"
      ? "pdf"
      : String(mime).startsWith("audio/")
        ? "audio"
        : String(mime).startsWith("video/")
          ? "video"
          : "download";
  const effectiveMode = mode === supportedMode ? mode : "download";
  useEffect(() => {
    const open = (event: Event) => {
      if ((event as CustomEvent<{ pos: number }>).detail?.pos === getPos())
        setEditing(true);
    };
    document.addEventListener("feuillet-edit-resource", open);
    return () => document.removeEventListener("feuillet-edit-resource", open);
  }, [getPos]);
  const url = fileUrl(fileId);
  return (
    <NodeViewWrapper
      contentEditable={false}
      className={`file-block mode-${effectiveMode} ${selected ? "resource-selected" : ""}`}
    >
      {effectiveMode === "pdf" && (
        <iframe
          src={`pdf-viewer.php?id=${encodeURIComponent(fileId)}`}
          title={name || "Document PDF"}
          loading="lazy"
        />
      )}
      {effectiveMode === "audio" && <audio controls preload="none" src={url} />}{" "}
      {effectiveMode === "video" && (
        <video controls preload="metadata" src={url} />
      )}
      <div className="file-caption">
        <FileText size={19} />
        <div>
          <strong>{name || "Document"}</strong>
          <small>
            {sizeLabel(size || 0)} · {mime}
          </small>
        </div>
        {app.admin && (
          <button
            className="small-button resource-settings"
            title="Modifier la présentation du fichier"
            aria-label="Modifier la présentation du fichier"
            aria-expanded={editing}
            onClick={() => setEditing(!editing)}
          >
            <Settings size={16} />
            <span>Présentation</span>
          </button>
        )}
        {app.admin && (
          <button
            className="file-rename-button"
            title="Renommer ce média"
            onClick={() =>
              app.renameFile({
                id: String(fileId),
                name,
                mime,
                size,
                url: fileUrl(fileId),
              })
            }
          >
            <Pencil size={15} />
            <span>Renommer</span>
          </button>
        )}
        <a href={fileUrl(fileId, true)} download title="Télécharger">
          <Download size={18} />
          <span>Télécharger</span>
        </a>
      </div>
      {app.admin && editing && (
        <div
          className="resource-config"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setEditing(false);
            }
          }}
        >
          <label>
            Présentation du fichier
            <Select
              autoFocus
              value={effectiveMode}
              onChange={(event) =>
                updateAttributes({ mode: event.target.value })
              }
            >
              <option value="download">Fichier téléchargeable</option>
              {supportedMode !== "download" && (
                <option value={supportedMode}>
                  {supportedMode === "pdf"
                    ? "PDF affiché dans la page"
                    : supportedMode === "audio"
                      ? "Lecteur audio"
                      : "Lecteur vidéo"}
                </option>
              )}
            </Select>
          </label>
          <small>
            Le même fichier est conservé. Seul son affichage change.
          </small>
          <button
            type="button"
            className="small-button"
            onClick={() => setEditing(false)}
          >
            Terminer
          </button>
        </div>
      )}
    </NodeViewWrapper>
  );
}
export const FileBlock = Node.create({
  name: "fileBlock",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      fileId: { default: "" },
      name: { default: "" },
      mime: { default: "" },
      size: { default: 0 },
      mode: { default: "download" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-file]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-file": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FileView);
  },
});
function GalleryView({ node, updateAttributes }: NodeViewProps) {
  const app = useApp();
  const [settings, setSettings] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const attrsRef = useRef(node.attrs);
  attrsRef.current = node.attrs;
  const manual = node.attrs.manual === true;
  const ids: string[] = Array.isArray(node.attrs.pageIds)
    ? node.attrs.pageIds.map(String)
    : [];
  const pages = manual
    ? ids
        .map((id) => app.pages.find((page) => String(page.id) === id))
        .filter((page): page is NonNullable<typeof page> => !!page)
    : app.pages.filter(
        (page) =>
          String(page.id) !== app.currentId &&
          (!node.attrs.parentId ||
            String(page.parent_id) === String(node.attrs.parentId)) &&
          (!node.attrs.kind || page.kind === node.attrs.kind),
      );
  const columns = Math.max(1, Math.min(6, Number(node.attrs.columns) || 2));
  const layout = node.attrs.layout === "list" ? "list" : "grid";
  const rows = Math.max(
    0,
    Math.min(
      12,
      Number.isFinite(Number(node.attrs.rows)) ? Number(node.attrs.rows) : 2,
    ),
  );
  const limit =
    rows === 0 ? pages.length : rows * (layout === "list" ? 1 : columns);
  const visible = showAll ? pages : pages.slice(0, limit);
  const aspect = ["16/9", "4/3", "1/1", "3/4", "auto"].includes(
    node.attrs.aspect,
  )
    ? node.attrs.aspect
    : "16/9";
  function makeManual() {
    if (!manual)
      updateAttributes({
        manual: true,
        pageIds: pages.map((page) => String(page.id)),
      });
  }
  function addPage(id: string) {
    if (!id) return;
    const current = attrsRef.current.manual
      ? ((attrsRef.current.pageIds || []) as string[]).map(String)
      : pages.map((page) => String(page.id));
    updateAttributes({
      manual: true,
      pageIds: current.includes(id) ? current : [...current, id],
    });
  }
  async function create() {
    if (busy) return;
    setBusy(true);
    try {
      const page = await app.createPage(app.currentId, {
        title: newTitle.trim() || "Sans titre",
        open: false,
      });
      if (page) {
        addPage(String(page.id));
        setNewTitle("");
      }
    } catch (error) {
      app.notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function reorder(index: number, direction: number) {
    const current = manual ? [...ids] : pages.map((page) => String(page.id));
    const next = index + direction;
    if (next < 0 || next >= current.length) return;
    [current[index], current[next]] = [current[next], current[index]];
    updateAttributes({ manual: true, pageIds: current });
  }
  const style = {
    "--gallery-columns": columns,
    "--gallery-mobile-columns": Math.min(2, columns),
    "--gallery-aspect": aspect === "auto" ? "auto" : aspect,
  } as CSSProperties;
  return (
    <NodeViewWrapper
      contentEditable={false}
      className={`gallery-block gallery-v2 layout-${layout}`}
      style={style}
    >
      <div className="gallery-heading">
        <h3>{node.attrs.title || "Collection"}</h3>
        {app.admin && (
          <div className="gallery-v2-actions">
            <button
              className="small-button"
              onClick={() => setAdding(!adding)}
              aria-expanded={adding}
            >
              <Plus size={14} /> Ajouter une page
            </button>
            <button
              className="icon-button"
              title="Configurer la galerie"
              aria-expanded={settings}
              onClick={() => setSettings(!settings)}
            >
              <Settings size={16} />
            </button>
          </div>
        )}
      </div>
      {app.admin && settings && (
        <div className="gallery-settings">
          <label>
            Titre
            <input
              aria-label="Titre de la galerie"
              value={node.attrs.title || ""}
              onChange={(event) =>
                updateAttributes({ title: event.target.value })
              }
            />
          </label>
          <div className="gallery-setting-row">
            <label>
              Disposition
              <Select
                aria-label="Disposition de la galerie"
                value={layout}
                onChange={(event) =>
                  updateAttributes({ layout: event.target.value })
                }
              >
                <option value="grid">Galerie de cartes</option>
                <option value="list">Liste</option>
              </Select>
            </label>
            <label>
              Colonnes
              <Select
                aria-label="Nombre de colonnes"
                value={columns}
                disabled={layout === "list"}
                onChange={(event) => {
                  updateAttributes({ columns: Number(event.target.value) });
                  setShowAll(false);
                }}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Lignes visibles
              <Select
                aria-label="Nombre de lignes visibles"
                value={rows}
                onChange={(event) => {
                  updateAttributes({ rows: Number(event.target.value) });
                  setShowAll(false);
                }}
              >
                <option value="0">Toutes</option>
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              Format d’image
              <Select
                aria-label="Format des images de la galerie"
                value={aspect}
                onChange={(event) =>
                  updateAttributes({ aspect: event.target.value })
                }
              >
                <option value="16/9">Paysage 16:9</option>
                <option value="4/3">Paysage 4:3</option>
                <option value="1/1">Carré</option>
                <option value="3/4">Portrait</option>
                <option value="auto">Format original</option>
              </Select>
            </label>
          </div>
          {!manual && (
            <div className="gallery-legacy-notice">
              Cette ancienne galerie utilise un filtre automatique.{" "}
              <button className="text-button" onClick={makeManual}>
                Choisir ses pages manuellement
              </button>
            </div>
          )}
          <div className="gallery-order-list">
            {pages.map((page, index) => (
              <div key={page.id}>
                <span>
                  <FeuilletIcon
                    icon={page.icon}
                    iconId={page.icon_id}
                    size={16}
                  />
                </span>
                <strong>{page.title || "Sans titre"}</strong>
                <button
                  title="Monter cette page"
                  disabled={index === 0}
                  onClick={() => reorder(index, -1)}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  title="Descendre cette page"
                  disabled={index === pages.length - 1}
                  onClick={() => reorder(index, 1)}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  title="Retirer de la galerie"
                  onClick={() =>
                    updateAttributes({
                      manual: true,
                      pageIds: (manual
                        ? ids
                        : pages.map((p) => String(p.id))
                      ).filter((id) => id !== String(page.id)),
                    })
                  }
                >
                  <XIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {app.admin && adding && (
        <div className="gallery-add-panel">
          <label>
            Ajouter une page existante
            <Select
              aria-label="Choisir une page pour la galerie"
              value=""
              onChange={(event) => addPage(event.target.value)}
            >
              <option value="">Choisir une page…</option>
              {app.pages
                .filter(
                  (page) =>
                    String(page.id) !== app.currentId &&
                    !ids.includes(String(page.id)),
                )
                .map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.icon?.startsWith("lucide:") ? "◇" : page.icon}{" "}
                    {page.title || "Sans titre"}
                  </option>
                ))}
            </Select>
          </label>
          <div className="gallery-create-row">
            <input
              aria-label="Titre de la nouvelle page de galerie"
              placeholder="Titre d’une nouvelle page…"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void create();
                }
              }}
            />
            <button
              className="small-button"
              disabled={busy}
              onClick={() => void create()}
            >
              <Plus size={14} />
              {busy ? "Création…" : "Créer une page"}
            </button>
          </div>
          <small>
            La nouvelle page sera privée, à l’intérieur de cette page. L’ajout à
            la galerie ne la publie pas.
          </small>
        </div>
      )}
      <div className="gallery-grid gallery-v2-grid">
        {visible.map((page) => (
          <div key={page.id} className="gallery-card">
            <a
              className="gallery-card-main"
              href={pageUrl(page.id)}
              onClick={(event) => {
                event.preventDefault();
                app.openPage(String(page.id));
              }}
            >
              {page.cover_id ? (
                <img
                  src={fileUrl(page.cover_id)}
                  alt=""
                  loading="lazy"
                  style={{
                    objectPosition: `${page.cover_position?.x ?? 50}% ${page.cover_position?.y ?? 50}%`,
                  }}
                />
              ) : (
                <div className="gallery-placeholder">
                  <span>
                    <FeuilletIcon
                      icon={page.icon}
                      iconId={page.icon_id}
                      size={30}
                    />
                  </span>
                </div>
              )}
              <div className="gallery-card-text">
                <strong>
                  <FeuilletIcon
                    icon={page.icon}
                    iconId={page.icon_id}
                    size={13}
                  />{" "}
                  {page.title || "Sans titre"}
                </strong>
                {page.description && <p>{page.description}</p>}
                {page.kind === "article" && page.source_name && (
                  <small>{page.source_name}</small>
                )}
              </div>
            </a>
            {page.cover_id && (
              <MediaCredit
                compact
                attribution={
                  (
                    page as typeof page & {
                      cover_attribution?: MediaAttribution | null;
                    }
                  ).cover_attribution
                }
              />
            )}{" "}
            {page.icon_id && (
              <MediaCredit
                compact
                attribution={
                  (
                    page as typeof page & {
                      icon_attribution?: MediaAttribution | null;
                    }
                  ).icon_attribution
                }
              />
            )}
          </div>
        ))}
      </div>
      {!pages.length && (
        <div className="empty-collection">
          <LayoutGrid size={25} />
          <span>
            {app.admin
              ? "Ta galerie est vide. Ajoute une page existante ou crée une nouvelle page."
              : "Aucune ressource publiée dans cette collection pour le moment."}
          </span>
          {app.admin && !adding && (
            <button className="small-button" onClick={() => setAdding(true)}>
              <Plus size={14} /> Ajouter
            </button>
          )}
        </div>
      )}
      {pages.length > limit && (
        <button
          className="gallery-show-more"
          onClick={() => setShowAll(!showAll)}
        >
          <ChevronDown size={15} />
          {showAll
            ? "Afficher moins"
            : `Afficher les ${pages.length - limit} autres ressources`}
        </button>
      )}
    </NodeViewWrapper>
  );
}
function XIcon() {
  return (
    <span aria-hidden="true" style={{ fontSize: 19, lineHeight: 1 }}>
      ×
    </span>
  );
}
export const Gallery = Node.create({
  name: "gallery",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      parentId: { default: "" },
      kind: { default: "" },
      title: { default: "Ressources" },
      manual: { default: false },
      pageIds: { default: [] },
      layout: { default: "grid" },
      columns: { default: 2 },
      rows: { default: 2 },
      aspect: { default: "16/9" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-gallery]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-gallery": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(GalleryView);
  },
});

type Question = {
  id: string;
  type: "single" | "multiple" | "boolean" | "short";
  prompt: string;
  options: string[];
  correct: number[];
  answers: string[];
  explanation: string;
};
function newQuestion(): Question {
  return {
    id: crypto.randomUUID(),
    type: "single",
    prompt: "",
    options: ["", ""],
    correct: [0],
    answers: [],
    explanation: "",
  };
}
function QuizView({ node, updateAttributes }: NodeViewProps) {
  const app = useApp();
  const questions: Question[] = node.attrs.questions || [];
  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number[] | string>>({});
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = (i: number, patch: Partial<Question>) => {
    const next = [...questions];
    next[i] = { ...next[i], ...patch };
    updateAttributes({ questions: next });
  };
  async function submit() {
    setBusy(true);
    setError("");
    try {
      setResult(
        await api("quiz", {
          page_id: app.currentId,
          quiz_id: node.attrs.quizId,
          answers,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <NodeViewWrapper contentEditable={false} className="quiz-block">
      <div className="quiz-heading">
        <span className="quiz-label">À toi de jouer</span>
        {app.admin && (
          <button className="small-button" onClick={() => setEditing(!editing)}>
            {editing ? "Voir l’exercice" : "Modifier les questions"}
          </button>
        )}
      </div>
      {editing ? (
        <>
          <input
            className="quiz-title-input"
            aria-label="Titre du quiz"
            value={node.attrs.title}
            onChange={(e) => updateAttributes({ title: e.target.value })}
          />
          {questions.map((q, i) => (
            <fieldset className="question-editor" key={q.id}>
              <legend>Question {i + 1}</legend>
              <div className="question-controls">
                <Select
                  aria-label="Type de question"
                  value={q.type}
                  onChange={(e) => {
                    const type = e.target.value as Question["type"];
                    change(i, {
                      type,
                      options:
                        type === "boolean" ? ["Vrai", "Faux"] : q.options,
                      correct: [0],
                    });
                  }}
                >
                  <option value="single">Un seul choix</option>
                  <option value="multiple">Plusieurs choix</option>
                  <option value="boolean">Vrai ou faux</option>
                  <option value="short">Réponse courte</option>
                </Select>
                <button
                  className="icon-button danger"
                  title="Supprimer cette question"
                  onClick={() =>
                    updateAttributes({
                      questions: questions.filter((_, j) => i !== j),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <textarea
                placeholder="Énoncé de la question"
                aria-label={`Énoncé ${i + 1}`}
                value={q.prompt}
                onChange={(e) => change(i, { prompt: e.target.value })}
              />
              {q.type === "short" ? (
                <input
                  aria-label="Réponses acceptées"
                  placeholder="Réponses acceptées, séparées par un point-virgule"
                  value={(q.answers || []).join("; ")}
                  onChange={(e) =>
                    change(i, {
                      answers: e.target.value.split(";").map((a) => a.trim()),
                    })
                  }
                />
              ) : (
                <>
                  <small>Coche les bonnes réponses.</small>
                  {q.options.map((opt, j) => (
                    <div className="option-editor" key={j}>
                      <input
                        aria-label={`Réponse ${j + 1} correcte`}
                        type={q.type === "multiple" ? "checkbox" : "radio"}
                        name={`correct-${q.id}`}
                        checked={(q.correct || []).includes(j)}
                        onChange={() =>
                          change(i, {
                            correct:
                              q.type === "multiple"
                                ? q.correct.includes(j)
                                  ? q.correct.filter((n) => n !== j)
                                  : [...q.correct, j]
                                : [j],
                          })
                        }
                      />
                      <input
                        aria-label={`Réponse ${j + 1}`}
                        value={opt}
                        onChange={(e) =>
                          change(i, {
                            options: q.options.map((o, k) =>
                              k === j ? e.target.value : o,
                            ),
                          })
                        }
                      />
                      {q.type !== "boolean" && q.options.length > 2 && (
                        <button
                          title="Retirer cette réponse"
                          onClick={() =>
                            change(i, {
                              options: q.options.filter((_, k) => k !== j),
                              correct: q.correct
                                .filter((n) => n !== j)
                                .map((n) => (n > j ? n - 1 : n)),
                            })
                          }
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {q.type !== "boolean" && (
                    <button
                      className="text-button"
                      onClick={() => change(i, { options: [...q.options, ""] })}
                    >
                      + Ajouter un choix
                    </button>
                  )}
                </>
              )}
              <textarea
                aria-label="Explication du corrigé"
                placeholder="Explication après correction"
                value={q.explanation || ""}
                onChange={(e) => change(i, { explanation: e.target.value })}
              />
            </fieldset>
          ))}
          <button
            className="small-button"
            onClick={() =>
              updateAttributes({ questions: [...questions, newQuestion()] })
            }
          >
            <Plus size={15} /> Ajouter une question
          </button>
        </>
      ) : (
        <>
          <h3>{node.attrs.title || "Vérifie ce que tu as compris"}</h3>
          {questions.map((q, i) => {
            const feedback = result?.results?.find((r: any) => r.id === q.id);
            return (
              <fieldset className="quiz-question" key={q.id}>
                <legend>
                  {i + 1}. {q.prompt || "Question à compléter"}
                </legend>
                {q.type === "short" ? (
                  <input
                    aria-label={`Réponse à la question ${i + 1}`}
                    placeholder="Ta réponse…"
                    value={
                      typeof answers[q.id] === "string"
                        ? (answers[q.id] as string)
                        : ""
                    }
                    onChange={(e) => {
                      setAnswers({ ...answers, [q.id]: e.target.value });
                      setResult(null);
                    }}
                  />
                ) : (
                  q.options.map((opt, j) => (
                    <label className="quiz-option" key={j}>
                      <input
                        type={q.type === "multiple" ? "checkbox" : "radio"}
                        name={`answer-${node.attrs.quizId}-${q.id}`}
                        checked={
                          Array.isArray(answers[q.id]) &&
                          (answers[q.id] as number[]).includes(j)
                        }
                        onChange={() => {
                          const previous = Array.isArray(answers[q.id])
                            ? (answers[q.id] as number[])
                            : [];
                          setAnswers({
                            ...answers,
                            [q.id]:
                              q.type === "multiple"
                                ? previous.includes(j)
                                  ? previous.filter((n) => n !== j)
                                  : [...previous, j]
                                : [j],
                          });
                          setResult(null);
                        }}
                      />
                      {opt}
                    </label>
                  ))
                )}
                {feedback && (
                  <div
                    className={`quiz-feedback ${feedback.correct ? "correct" : "incorrect"}`}
                  >
                    <strong>
                      {feedback.correct ? "✓ Bonne réponse" : "À revoir"}
                    </strong>
                    {feedback.explanation && <p>{feedback.explanation}</p>}
                    {!feedback.correct && feedback.expected !== undefined && (
                      <p>
                        Réponse attendue :{" "}
                        {Array.isArray(feedback.expected)
                          ? feedback.expected.join(", ")
                          : String(feedback.expected)}
                      </p>
                    )}
                  </div>
                )}
              </fieldset>
            );
          })}
          {!questions.length && <p>Ajoute une question pour commencer.</p>}
          {questions.length > 0 && (
            <div className="quiz-footer">
              {app.admin ? (
                <span className="muted">
                  La correction sera disponible sur la version publiée.
                </span>
              ) : (
                <button
                  className="primary-button"
                  disabled={
                    busy ||
                    questions.some(
                      (q) =>
                        answers[q.id] === undefined ||
                        answers[q.id] === "" ||
                        (Array.isArray(answers[q.id]) && !answers[q.id].length),
                    )
                  }
                  onClick={submit}
                >
                  {busy ? "Correction…" : "Vérifier mes réponses"}
                </button>
              )}
              {result && (
                <strong>
                  <Check size={16} /> {result.score} / {result.total}
                </strong>
              )}
              {result && (
                <button
                  className="text-button"
                  onClick={() => {
                    setAnswers({});
                    setResult(null);
                  }}
                >
                  Recommencer
                </button>
              )}
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </NodeViewWrapper>
  );
}
export const Quiz = Node.create({
  name: "quiz",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      quizId: { default: "" },
      title: { default: "Vérifie ce que tu as compris" },
      questions: { default: [] },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-quiz]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-quiz": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(QuizView);
  },
});

function DatabaseBlockView({ node, updateAttributes }: NodeViewProps) {
  return (
    <NodeViewWrapper
      contentEditable={false}
      className="embedded-database-block"
    >
      <DatabaseView
        dbId={String(node.attrs.dbId || "")}
        viewConfig={node.attrs.viewConfig || undefined}
        onViewConfigChange={(viewConfig) => updateAttributes({ viewConfig })}
      />
    </NodeViewWrapper>
  );
}
function FormBlockView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper contentEditable={false} className="embedded-form-block">
      <FormView formId={String(node.attrs.formId || "")} />
    </NodeViewWrapper>
  );
}
export const DatabaseEmbed = Node.create({
  name: "databaseView",
  group: "block",
  atom: true,
  addAttributes() {
    return { dbId: { default: "" }, viewConfig: { default: null } };
  },
  parseHTML() {
    return [{ tag: "div[data-database-view]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-database-view": "" }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DatabaseBlockView);
  },
});
export const FormEmbed = Node.create({
  name: "formView",
  group: "block",
  atom: true,
  addAttributes() {
    return { formId: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "div[data-form-view]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-form-view": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FormBlockView);
  },
});
