import { MapBlock } from "./MapBlock";
import { BlockMover, blockAtElement } from "./BlockMover";
import {
  selectedBlock,
  moveBlock,
  blockSiblingDestination,
} from "./block-moving";
import { editableDocument } from "./types";
import { ContextMenu, type MenuAction } from "./ContextMenu";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import {
  ToggleHeading,
  setToggleHeading,
  unwrapToggleHeading,
} from "./ToggleHeading";
import { Mark, mergeAttributes } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  Table,
  TableRow,
  TableHeader,
  TableCell,
} from "@tiptap/extension-table";
import Highlight from "@tiptap/extension-highlight";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Highlighter,
  Plus,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Code,
  Table as TableIcon,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Paperclip,
  LayoutGrid,
  Columns2,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  ExternalLink,
  BookOpen,
  GripVertical,
  Undo2,
  Redo2,
  Database as DatabaseIcon,
  ClipboardList,
} from "lucide-react";
import {
  Callout,
  Columns,
  Column,
  Details,
  PageLink,
  ButtonLink,
  Bookmark,
  FileBlock,
  Gallery,
  Quiz,
  ResizableImage,
  DatabaseEmbed,
  FormEmbed,
  transformSelectedLink,
} from "./nodes";
import { type Doc, safeLink, fileUrl, isThemeTextColor } from "./types";
import { useApp } from "./context";
import "./editor-v2.css";

const textColors = [
  { label: "Défaut", value: "inherit" },
  { label: "Gris", value: "#787774" },
  { label: "Marron", value: "#9F6B53" },
  { label: "Orange", value: "#D9730D" },
  { label: "Jaune", value: "#CB912F" },
  { label: "Vert", value: "#448361" },
  { label: "Bleu", value: "#337EA9" },
  { label: "Violet", value: "#9065B0" },
  { label: "Rose", value: "#C14C8A" },
  { label: "Rouge", value: "#D44C47" },
];
const backgroundColors = [
  { label: "Gris", value: "#F1F1EF" },
  { label: "Marron", value: "#F3EEEE" },
  { label: "Orange", value: "#FAEBDD" },
  { label: "Jaune", value: "#FBF3DB" },
  { label: "Vert", value: "#EDF3EC" },
  { label: "Bleu", value: "#E7F3F8" },
  { label: "Violet", value: "#F4F0F7" },
  { label: "Rose", value: "#F9EEF3" },
  { label: "Rouge", value: "#FDEBEC" },
];
const TextStyle = Mark.create({
  name: "textStyle",
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.color,
        renderHTML: (attributes) =>
          !isThemeTextColor(attributes.color)
            ? { style: `color:${attributes.color}` }
            : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[style]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },
});

type Command = {
  id: string;
  label: string;
  description: string;
  keywords: string;
  icon: React.ReactNode;
  run: (editor: Editor) => void;
};
export type EditorRequest =
  | "image"
  | "pdf"
  | "audio"
  | "video"
  | "file"
  | "pageLink"
  | "bookmark"
  | "buttonLink";
type Props = {
  content: Doc;
  admin: boolean;
  onChange: (doc: Doc) => void;
  onRequest: (kind: EditorRequest, editor: Editor) => void;
  onReady?: (editor: Editor) => void;
};
export default function CourseEditor({
  content,
  admin,
  onChange,
  onRequest,
  onReady,
}: Props) {
  const app = useApp();
  const [formatMenu, setFormatMenu] = useState<"transform" | "colors" | null>(
    null,
  );
  const creatingPage = useRef(false);
  const [menu, setMenu] = useState<{
    query: string;
    from: number;
    to: number;
    left: number;
    top: number;
    manual: boolean;
  } | null>(null);
  const [active, setActive] = useState(0);
  const [selection, setSelection] = useState(0);
  const [bubble, setBubble] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [blockMenu, setBlockMenu] = useState(false);
  const [blockAnchor, setBlockAnchor] = useState<HTMLButtonElement | null>(
    null,
  );
  const [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const [help, setHelp] = useState(false);
  const activeBlockRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef(menu);
  const activeRef = useRef(active);
  const commandsRef = useRef<Command[]>([]);
  const onChangeRef = useRef(onChange);
  const onRequestRef = useRef(onRequest);
  onChangeRef.current = onChange;
  onRequestRef.current = onRequest;
  menuRef.current = menu;
  activeRef.current = active;
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: !admin,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
        heading: { levels: [1, 2, 3] },
      }),
      ResizableImage,
      TextStyle,
      Placeholder.configure({
        placeholder: ({ node }) =>
          node.type.name === "heading"
            ? "Titre…"
            : "Écris ici, ou tape / pour ajouter un bloc…",
        showOnlyCurrent: true,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: admin }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight.configure({ multicolor: true }),
      Callout,
      Columns,
      Column,
      Details,
      ToggleHeading,
      MapBlock,
      PageLink,
      ButtonLink,
      Bookmark,
      FileBlock,
      Gallery,
      Quiz,
      DatabaseEmbed,
      FormEmbed,
    ],
    content: editableDocument(content) as any,
    editable: admin,
    immediatelyRender: true,
    editorProps: {
      attributes: {
        class: "course-content",
        spellcheck: "true",
        "aria-label": "Contenu de la page",
      },
      handleKeyDown: (_view, event) => {
        if (
          admin &&
          ((event.key === "F10" && event.shiftKey) ||
            event.key === "ContextMenu")
        ) {
          const coords = _view.coordsAtPos(_view.state.selection.from);
          event.preventDefault();
          activeBlockRef.current = null;
          setContext({ x: coords.left, y: coords.bottom });
          return true;
        }
        const current = menuRef.current;
        if (current) {
          const options = commandsRef.current;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((activeRef.current + 1) % Math.max(options.length, 1));
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive(
              (activeRef.current - 1 + Math.max(options.length, 1)) %
                Math.max(options.length, 1),
            );
            return true;
          }
          if (event.key === "Enter" && options[activeRef.current]) {
            event.preventDefault();
            execute(options[activeRef.current]);
            return true;
          }
          if (event.key === "Escape") {
            setMenu(null);
            event.preventDefault();
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (admin) onChangeRef.current(ed.getJSON() as Doc);
      checkSlash(ed);
      setSelection((n) => n + 1);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      checkSlash(ed);
      setSelection((n) => n + 1);
    },
  });
  function checkSlash(ed: Editor) {
    if (!admin) return;
    const { selection: sel } = ed.state;
    if (!sel.empty || !sel.$from.parent.isTextblock) {
      if (!menuRef.current?.manual) setMenu(null);
      return;
    }
    const text = sel.$from.parent.textBetween(
      0,
      sel.$from.parentOffset,
      "\0",
      "\0",
    );
    const match = text.match(/^\/(.*)$/);
    if (match) {
      const coords = ed.view.coordsAtPos(sel.from);
      const query = match[1];
      setMenu((prev) => ({
        ...{
          query,
          from: sel.from - text.length,
          to: sel.from,
          left: Math.max(
            12,
            Math.min(
              innerWidth - Math.min(320, innerWidth - 24) - 12,
              coords.left,
            ),
          ),
          top: Math.max(12, Math.min(innerHeight - 330, coords.bottom + 8)),
          manual: false,
        },
      }));
      if (menuRef.current?.query !== query) setActive(0);
    } else if (!menuRef.current?.manual) setMenu(null);
  }
  // Re-anchor after the browser scrolls on focus, instead of keeping stale coordinates.
  useEffect(() => {
    if (!editor || !admin) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sel = editor.state.selection;
        const focused = document.activeElement;
        if (
          sel.empty ||
          sel instanceof NodeSelection ||
          !sel.$from.parent.isTextblock ||
          (!editor.view.dom.contains(focused) &&
            !(
              focused instanceof Element &&
              focused.closest(".selection-toolbar")
            ))
        ) {
          setBubble(null);
          setFormatMenu(null);
          return;
        }
        const start = editor.view.coordsAtPos(sel.from);
        const dom = editor.view.domAtPos(sel.from).node;
        const block = (
          dom instanceof Element ? dom : dom.parentElement
        )?.closest("p,h1,h2,h3,pre,li");
        const rect = block?.getBoundingClientRect();
        const top = rect?.top ?? start.top;
        // Stay above the active paragraph; hide when it scrolls out of view.
        if (top < 64 || top > innerHeight) {
          setBubble(null);
          return;
        }
        const y = Math.max(8, top - 54);
        setBubble({
          left: Math.max(
            8,
            Math.min(
              innerWidth - Math.min(480, innerWidth - 16) - 8,
              rect?.left ?? start.left,
            ),
          ),
          top: Math.max(8, y),
        });
      });
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("focus", update);
    editor.on("blur", update);
    document.addEventListener("focusin", update);
    document.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("focus", update);
      editor.off("blur", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [editor, admin]);
  const insertNode = (ed: Editor, node: any) =>
    ed
      .chain()
      .focus()
      .insertContent([node, { type: "paragraph" }])
      .run();
  const commands: Command[] = [
    {
      id: "text",
      label: "Texte",
      description: "Un paragraphe simple",
      keywords: "paragraphe texte",
      icon: <FileText />,
      run: (ed) =>
        ed.chain().focus().command(unwrapToggleHeading).setParagraph().run(),
    },
    ...[1, 2, 3].map((level) => ({
      id: `h${level}`,
      label: `Titre ${level}`,
      description:
        level === 1
          ? "Un grand titre de section"
          : level === 2
            ? "Un titre de sous-partie"
            : "Un petit titre",
      keywords: "titre heading section",
      icon:
        level === 1 ? <Heading1 /> : level === 2 ? <Heading2 /> : <Heading3 />,
      run: (ed: Editor) =>
        ed
          .chain()
          .focus()
          .command(unwrapToggleHeading)
          .setHeading({ level: level as 1 | 2 | 3 })
          .run(),
    })),
    ...[1, 2, 3].map((level) => ({
      id: `toggle-h${level}`,
      label: `Titre ${level} dépliable`,
      description: "Un titre et son contenu à ouvrir ou refermer",
      keywords: "titre depliable repliable toggle section",
      icon: <ChevronDown />,
      run: (ed: Editor) => setToggleHeading(ed, level as 1 | 2 | 3),
    })),
    {
      id: "bullet",
      label: "Liste à puces",
      description: "Des idées faciles à parcourir",
      keywords: "liste puces bullet",
      icon: <List />,
      run: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      id: "ordered",
      label: "Liste numérotée",
      description: "Une suite d’étapes",
      keywords: "liste numero etapes",
      icon: <ListOrdered />,
      run: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      id: "task",
      label: "Cases à cocher",
      description: "Une liste de choses à faire",
      keywords: "tache todo case liste",
      icon: <ListChecks />,
      run: (ed) => ed.chain().focus().toggleTaskList().run(),
    },
    {
      id: "callout",
      label: "Encadré",
      description: "Une consigne ou une idée à retenir",
      keywords: "encadre callout consigne attention",
      icon: <span>💡</span>,
      run: (ed) =>
        insertNode(ed, {
          type: "callout",
          attrs: { tone: "blue", icon: "💡" },
          content: [{ type: "paragraph" }],
        }),
    },
    {
      id: "quote",
      label: "Citation",
      description: "Mettre un extrait en valeur",
      keywords: "citation quote",
      icon: <Quote />,
      run: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      id: "details",
      label: "Partie repliable",
      description: "Un corrigé à ouvrir au clic",
      keywords: "replier deplier corrige details",
      icon: <ChevronDown />,
      run: (ed) =>
        insertNode(ed, {
          type: "details",
          attrs: { summary: "Voir le corrigé" },
          content: [{ type: "paragraph" }],
        }),
    },
    {
      id: "columns",
      label: "Deux colonnes",
      description: "Deux contenus côte à côte",
      keywords: "colonnes columns deux",
      icon: <Columns2 />,
      run: (ed) =>
        insertNode(ed, {
          type: "columns",
          content: [
            { type: "column", content: [{ type: "paragraph" }] },
            { type: "column", content: [{ type: "paragraph" }] },
          ],
        }),
    },
    {
      id: "table",
      label: "Tableau",
      description: "Comparer et organiser",
      keywords: "tableau table",
      icon: <TableIcon />,
      run: (ed) =>
        ed
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      id: "separator",
      label: "Séparateur",
      description: "Une ligne entre deux parties",
      keywords: "separateur ligne divider",
      icon: <Minus />,
      run: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },
    {
      id: "code",
      label: "Code",
      description: "Un extrait avec une police monospace",
      keywords: "code informatique",
      icon: <Code />,
      run: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: "page",
      label: "Page",
      description: "Créer une vraie sous-page",
      keywords: "page souspage nouvelle creer",
      icon: <FileText />,
      run: async (ed) => {
        if (creatingPage.current) return;
        creatingPage.current = true;
        try {
          const page = await app.createPage(app.currentId, { open: false });
          if (page && !ed.isDestroyed) {
            insertNode(ed, {
              type: "pageLink",
              attrs: {
                pageId: String(page.id),
                label: page.title,
                icon: page.icon,
              },
            });
            app.openPage(String(page.id));
          }
        } catch (error) {
          app.notify((error as Error).message);
        } finally {
          creatingPage.current = false;
        }
      },
    },
    ...(
      [
        {
          id: "image",
          label: "Image",
          description: "Une illustration pour ta page",
          icon: <ImageIcon />,
          keywords: "photo image",
        },
        {
          id: "pdf",
          label: "PDF",
          description: "Un document à lire et télécharger",
          icon: <FileText />,
          keywords: "pdf fichier document",
        },
        {
          id: "audio",
          label: "Audio",
          description: "Un lecteur audio",
          icon: <Music />,
          keywords: "audio son musique",
        },
        {
          id: "video",
          label: "Vidéo",
          description: "Un lecteur vidéo",
          icon: <Video />,
          keywords: "video film",
        },
        {
          id: "file",
          label: "Fichier",
          description: "Une pièce jointe à télécharger",
          icon: <Paperclip />,
          keywords: "fichier telecharger document",
        },
        {
          id: "pageLink",
          label: "Lien vers une page",
          description: "Naviguer dans ton espace",
          icon: <ArrowUp />,
          keywords: "pagelink lien page existante",
        },
        {
          id: "buttonLink",
          label: "Bouton",
          description: "Un accès direct à une ressource",
          icon: <ExternalLink />,
          keywords: "bouton lien outil",
        },
        {
          id: "bookmark",
          label: "Article ou lien",
          description: "Une carte de ressource commentée",
          icon: <BookOpen />,
          keywords: "article presse lien signet bookmark",
        },
      ] as const
    ).map((c) => ({
      ...c,
      run: (ed: Editor) => {
        if (c.id === "image") {
          app.chooseImage("image", (file) => {
            if (!ed.isDestroyed)
              insertNode(ed, {
                type: "image",
                attrs: {
                  fileId: String(file.id),
                  src: fileUrl(file.id),
                  alt: file.name,
                  title: file.name,
                  width: 100,
                  align: "center",
                  attribution:
                    (
                      file as typeof file & {
                        attribution?: {
                          author?: string;
                          license?: string;
                          source_url?: string;
                          license_url?: string;
                        } | null;
                      }
                    ).attribution || null,
                },
              });
          });
        } else onRequestRef.current(c.id, ed);
      },
    })),
    {
      id: "database",
      label: "Base de données",
      description: "Une base personnalisée à afficher dans la page",
      keywords: "base database tableau table données",
      icon: <DatabaseIcon />,
      run: (ed) =>
        app.chooseDatabase((dbId) => {
          if (!ed.isDestroyed)
            insertNode(ed, { type: "databaseView", attrs: { dbId } });
        }),
    },
    {
      id: "form",
      label: "Formulaire",
      description: "Recueillir des réponses reliées à une base",
      keywords: "formulaire form réponses enquête",
      icon: <ClipboardList />,
      run: (ed) =>
        app.chooseForm((formId) => {
          if (!ed.isDestroyed)
            insertNode(ed, { type: "formView", attrs: { formId } });
        }),
    },
    {
      id: "map",
      label: "Lieu / Google Maps",
      description: "Une adresse et sa carte interactive",
      keywords: "lieu carte adresse maps plan",
      icon: <span>⌖</span>,
      run: (ed) =>
        insertNode(ed, {
          type: "mapBlock",
          attrs: { address: "", embedUrl: "" },
        }),
    },
    {
      id: "gallery",
      label: "Galerie",
      description: "Une collection de pages en cartes",
      keywords: "galerie cartes collection notes ressources",
      icon: <LayoutGrid />,
      run: (ed) =>
        insertNode(ed, {
          type: "gallery",
          attrs: {
            title: "Ressources",
            manual: true,
            pageIds: [],
            layout: "grid",
            columns: 2,
            rows: 2,
            aspect: "16/9",
          },
        }),
    },
    {
      id: "quiz",
      label: "Quiz",
      description: "Des questions et une correction immédiate",
      keywords: "quiz qcm questionnaire question",
      icon: <ListChecks />,
      run: (ed) =>
        insertNode(ed, {
          type: "quiz",
          attrs: {
            quizId: crypto.randomUUID(),
            title: "Vérifie ce que tu as compris",
            questions: [],
          },
        }),
    },
  ];
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const filtered = commands.filter((c) =>
    normalize(c.label + " " + c.keywords).includes(
      normalize(menu?.query || ""),
    ),
  );
  commandsRef.current = filtered;
  function execute(command: Command) {
    if (!editor) return;
    const current = menuRef.current;
    if (current && !current.manual)
      editor
        .chain()
        .focus()
        .deleteRange({ from: current.from, to: current.to })
        .run();
    setMenu(null);
    setActive(0);
    command.run(editor);
  }
  function addBlock() {
    if (!editor) return;
    const selection = editor.state.selection;
    if (
      !selection.$from.parent.isTextblock ||
      selection.$from.parent.content.size > 0
    ) {
      const pos =
        selection instanceof NodeSelection || selection.$from.depth === 0
          ? selection.to
          : selection.$from.after();
      const tr = editor.state.tr.insert(
        pos,
        editor.schema.nodes.paragraph.create(),
      );
      tr.setSelection(TextSelection.near(tr.doc.resolve(pos + 1)));
      editor.view.dispatch(tr);
    }
    openInsert();
  }
  function openInsert() {
    if (!editor) return;
    const coords = editor.view.coordsAtPos(editor.state.selection.from);
    setMenu({
      query: "",
      from: editor.state.selection.from,
      to: editor.state.selection.to,
      left: Math.max(
        12,
        Math.min(innerWidth - Math.min(320, innerWidth - 24) - 12, coords.left),
      ),
      top: Math.max(12, Math.min(innerHeight - 380, coords.bottom + 8)),
      manual: true,
    });
    setActive(0);
  }
  useEffect(() => {
    if (editor) onReady?.(editor);
  }, [editor]);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!(event.target as Element)?.closest(".command-menu, .insert-button"))
        setMenu(null);
    };
    if (menu) {
      document.addEventListener("mousedown", close);
      return () => document.removeEventListener("mousedown", close);
    }
  }, [!!menu]);
  useEffect(() => {
    if (menu)
      document
        .getElementById(`command-${filtered[active]?.id}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, menu?.query]);
  function currentBlock() {
    if (!editor) return null;
    const pos = activeBlockRef.current;
    const node = pos !== null ? editor.state.doc.nodeAt(pos) : null;
    return node && pos !== null ? { pos, node } : selectedBlock(editor.state);
  }
  function insertAfter(pos: number) {
    if (!editor) return;
    const node = editor.state.doc.nodeAt(pos);
    if (!node) return;
    const after = pos + node.nodeSize;
    const tr = editor.state.tr.insert(
      after,
      editor.schema.nodes.paragraph.create(),
    );
    tr.setSelection(TextSelection.near(tr.doc.resolve(after + 1)));
    editor.view.dispatch(tr);
    editor.view.focus();
    openInsert();
  }
  function editCurrentBlock() {
    if (!editor) return;
    const found = currentBlock();
    if (!found) return;
    const { pos, node } = found;
    if (["buttonLink", "bookmark", "fileBlock"].includes(node.type.name)) {
      document.dispatchEvent(
        new CustomEvent("feuillet-edit-resource", { detail: { pos } }),
      );
      setBlockMenu(false);
    }
  }

  const mutateBlock = (action: "up" | "down" | "duplicate" | "delete") => {
    if (!editor) return;
    const found = currentBlock();
    if (!found) return;
    const { pos, node } = found;
    const state = editor.state,
      $pos = state.doc.resolve(pos),
      parent = $pos.parent,
      index = $pos.index();
    let tr = state.tr;
    if (action === "delete") {
      if (parent.canReplace(index, index + 1))
        tr.delete(pos, pos + node.nodeSize);
      else
        tr.replaceWith(
          pos,
          pos + node.nodeSize,
          state.schema.nodes.paragraph.create(),
        );
    } else if (action === "duplicate") {
      tr.insert(pos + node.nodeSize, node);
    } else {
      const to = blockSiblingDestination(state, pos, action);
      if (to === null) return;
      const moved = moveBlock(state, pos, to);
      if (!moved) return;
      tr = moved;
    }
    editor.view.dispatch(tr);
    editor.view.focus();
    activeBlockRef.current = null;
    setBlockMenu(false);
  };
  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href || "";
    const value = prompt("Adresse du lien (vide pour le retirer)", previous);
    if (value === null) return;
    if (!value)
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else if (safeLink(value) !== "#")
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: safeLink(value) })
        .run();
  }
  useEffect(() => {
    if (!formatMenu) return;
    const close = (event: MouseEvent) => {
      if (
        !(event.target as Element).closest(
          ".format-popover,.transform-control,.text-color-control",
        )
      )
        setFormatMenu(null);
    };
    const esc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFormatMenu(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [formatMenu]);
  const currentType = editor?.isActive("heading", { level: 1 })
    ? "Titre 1"
    : editor?.isActive("heading", { level: 2 })
      ? "Titre 2"
      : editor?.isActive("heading", { level: 3 })
        ? "Titre 3"
        : editor?.isActive("bulletList")
          ? "Liste à puces"
          : editor?.isActive("orderedList")
            ? "Liste numérotée"
            : editor?.isActive("taskList")
              ? "Cases à cocher"
              : editor?.isActive("blockquote")
                ? "Citation"
                : "Texte";
  function transform(type: string) {
    if (!editor) return;
    if (type.startsWith("toggle-h")) {
      setToggleHeading(editor, Number(type.slice(-1)) as 1 | 2 | 3);
      setFormatMenu(null);
      return;
    }
    const chain = editor.chain().focus().command(unwrapToggleHeading);
    const lists = ["bulletList", "orderedList", "taskList"];
    if (
      (lists.includes(type) && editor.isActive(type)) ||
      (type === "blockquote" && editor.isActive("blockquote"))
    ) {
      setFormatMenu(null);
      return;
    }
    if (!lists.includes(type)) {
      if (editor.isActive("bulletList")) chain.toggleBulletList();
      if (editor.isActive("orderedList")) chain.toggleOrderedList();
      if (editor.isActive("taskList")) chain.toggleTaskList();
    }
    if (type !== "blockquote" && editor.isActive("blockquote"))
      chain.toggleBlockquote();
    if (type === "paragraph") chain.setParagraph().run();
    else if (type.startsWith("h"))
      chain.setHeading({ level: Number(type[1]) as 1 | 2 | 3 }).run();
    else if (type === "bulletList")
      chain.setParagraph().toggleBulletList().run();
    else if (type === "orderedList")
      chain.setParagraph().toggleOrderedList().run();
    else if (type === "taskList") chain.setParagraph().toggleTaskList().run();
    else if (type === "blockquote")
      chain.setParagraph().toggleBlockquote().run();
    setFormatMenu(null);
  }
  function blockContextActions(): MenuAction[] {
    if (!editor) return [];
    const found = currentBlock();
    if (!found) return [];
    const { pos, node } = found;
    const $pos = editor.state.doc.resolve(pos),
      index = $pos.index(),
      parent = $pos.parent;
    const text =
      node.isTextblock ||
      node.type.name.endsWith("List") ||
      node.type.name === "blockquote";
    const items: MenuAction[] = [];
    const formatSelection = (run: () => void) => {
      if (editor.state.selection instanceof NodeSelection && node.isTextblock)
        editor.commands.setTextSelection({
          from: pos + 1,
          to: pos + 1 + node.content.size,
        });
      if (
        editor.state.selection.empty &&
        editor.state.selection.$from.parent.isTextblock
      ) {
        const $from = editor.state.selection.$from;
        editor.commands.setTextSelection({
          from: $from.start(),
          to: $from.end(),
        });
      }
      run();
    };
    if (["buttonLink", "bookmark", "fileBlock"].includes(node.type.name))
      items.push({
        label: "Modifier la présentation",
        icon: <Link />,
        run: editCurrentBlock,
        group: "edit",
      });
    if (node.type.name === "image") {
      items.push({
        label: "Agrandir l’image",
        icon: <ImageIcon />,
        run: () =>
          app.zoomImage(
            node.attrs.fileId ? fileUrl(node.attrs.fileId) : node.attrs.src,
            node.attrs.alt,
          ),
        group: "edit",
      });
      for (const [align, label] of [
        ["left", "Aligner à gauche"],
        ["center", "Centrer"],
        ["right", "Aligner à droite"],
      ])
        items.push({
          label,
          icon: <ImageIcon />,
          run: () => {
            editor.chain().focus().updateAttributes("image", { align }).run();
          },
          group: "edit",
        });
      items.push({
        label: "Largeur complète",
        icon: <Columns2 />,
        run: () => {
          editor
            .chain()
            .focus()
            .updateAttributes("image", { width: 100 })
            .run();
        },
        group: "edit",
      });
    }
    if (text) {
      items.push(
        {
          label: "Transformer en…",
          icon: <Heading2 />,
          run: () => {
            editor.view.focus();
            setFormatMenu("transform");
          },
          group: "edit",
        },
        {
          label: "Couleur du texte et du fond",
          icon: <Highlighter />,
          run: () => {
            editor.view.focus();
            setFormatMenu("colors");
          },
          group: "edit",
        },
        {
          label: "Gras",
          icon: <Bold />,
          run: () => {
            formatSelection(() => {
              editor.chain().focus().toggleBold().run();
            });
          },
          group: "format",
          shortcut: "⌘/Ctrl B",
        },
        {
          label: "Italique",
          icon: <Italic />,
          run: () => {
            formatSelection(() => {
              editor.chain().focus().toggleItalic().run();
            });
          },
          group: "format",
          shortcut: "⌘/Ctrl I",
        },
        {
          label: "Couleur par défaut",
          icon: <FileText />,
          run: () => {
            formatSelection(() => {
              editor.chain().focus().unsetMark("textStyle").run();
            });
          },
          group: "format",
        },
      );
    }
    items.push(
      {
        label: "Ajouter un bloc après",
        icon: <Plus />,
        run: () => {
          insertAfter(pos);
        },
        group: "organize",
      },
      {
        label: "Monter",
        icon: <ArrowUp />,
        run: () => mutateBlock("up"),
        disabled: index === 0,
        group: "organize",
      },
      {
        label: "Descendre",
        icon: <ArrowDown />,
        run: () => mutateBlock("down"),
        disabled: index === parent.childCount - 1,
        group: "organize",
      },
      {
        label: "Dupliquer le bloc",
        icon: <Copy />,
        run: () => mutateBlock("duplicate"),
        group: "organize",
      },
      {
        label: "Supprimer le bloc",
        icon: <Trash2 />,
        run: () => mutateBlock("delete"),
        danger: true,
        group: "delete",
      },
    );
    return items;
  }
  const formattingControls = (
    <>
      <button
        className="transform-control"
        title="Transformer le texte sélectionné"
        aria-expanded={formatMenu === "transform"}
        onClick={() =>
          setFormatMenu(formatMenu === "transform" ? null : "transform")
        }
      >
        <span>{currentType}</span>
        <ChevronDown size={13} />
      </button>
      <button
        className="text-color-control"
        title="Couleur du texte et du fond"
        aria-expanded={formatMenu === "colors"}
        onClick={() => setFormatMenu(formatMenu === "colors" ? null : "colors")}
      >
        <span
          style={{
            color: editor?.getAttributes("textStyle").color || undefined,
          }}
        >
          A
        </span>
        <ChevronDown size={12} />
      </button>
    </>
  );
  const popoverAbove = !!bubble && bubble.top > innerHeight - bubble.top - 45;
  const popoverHeight = bubble
    ? Math.max(
        80,
        Math.min(
          340,
          popoverAbove ? bubble.top - 14 : innerHeight - bubble.top - 58,
        ),
      )
    : Math.max(100, Math.min(340, innerHeight - 160));
  const formatPopover = formatMenu && (
    <div
      className={`format-popover ${formatMenu === "colors" ? "color-popover" : ""} ${popoverAbove ? "popover-above" : ""}`}
      style={{ maxHeight: popoverHeight }}
      role="dialog"
      aria-label={
        formatMenu === "colors"
          ? "Couleurs du texte"
          : "Transformer la sélection"
      }
      onMouseDown={(event) => event.preventDefault()}
    >
      {formatMenu === "transform" ? (
        <>
          <small>Transformer en</small>
          {editor?.isActive("link") && (
            <>
              <button
                onClick={() => {
                  transformSelectedLink(editor, "button");
                  setFormatMenu(null);
                }}
              >
                <ExternalLink size={16} />
                Lien → bouton
              </button>
              <button
                onClick={() => {
                  transformSelectedLink(editor, "card");
                  setFormatMenu(null);
                }}
              >
                <BookOpen size={16} />
                Lien → carte avec aperçu
              </button>
            </>
          )}
          {[
            { type: "paragraph", label: "Texte", icon: <FileText size={16} /> },
            { type: "h1", label: "Titre 1", icon: <Heading1 size={16} /> },
            { type: "h2", label: "Titre 2", icon: <Heading2 size={16} /> },
            { type: "h3", label: "Titre 3", icon: <Heading3 size={16} /> },
            ...[1, 2, 3].map((level) => ({
              type: `toggle-h${level}`,
              label: `Titre ${level} dépliable`,
              icon: <ChevronDown size={16} />,
            })),
            {
              type: "bulletList",
              label: "Liste à puces",
              icon: <List size={16} />,
            },
            {
              type: "orderedList",
              label: "Liste numérotée",
              icon: <ListOrdered size={16} />,
            },
            {
              type: "taskList",
              label: "Cases à cocher",
              icon: <ListChecks size={16} />,
            },
            {
              type: "blockquote",
              label: "Citation",
              icon: <Quote size={16} />,
            },
          ].map((item) => (
            <button
              key={item.type}
              aria-pressed={currentType === item.label}
              onClick={() => transform(item.type)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </>
      ) : (
        <>
          <small>Couleur du texte</small>
          <div className="color-palette">
            {textColors.map((color) => (
              <button
                key={color.value}
                title={`Texte ${color.label.toLowerCase()}`}
                aria-label={`Texte ${color.label.toLowerCase()}`}
                style={{ color: color.value }}
                aria-pressed={
                  color.label === "Défaut"
                    ? isThemeTextColor(editor?.getAttributes("textStyle").color)
                    : editor?.getAttributes("textStyle").color === color.value
                }
                onClick={() => {
                  if (color.label === "Défaut")
                    editor?.chain().focus().unsetMark("textStyle").run();
                  else
                    editor
                      ?.chain()
                      .focus()
                      .setMark("textStyle", { color: color.value })
                      .run();
                  setFormatMenu(null);
                }}
              >
                A
              </button>
            ))}
          </div>
          <small>Couleur de fond</small>
          <div className="color-palette">
            <button
              title="Sans couleur de fond"
              aria-label="Sans couleur de fond"
              onClick={() => {
                editor?.chain().focus().unsetHighlight().run();
                setFormatMenu(null);
              }}
            >
              ∅
            </button>
            {backgroundColors.map((color) => (
              <button
                key={color.value}
                title={`Fond ${color.label.toLowerCase()}`}
                aria-label={`Fond ${color.label.toLowerCase()}`}
                style={{ backgroundColor: color.value }}
                aria-pressed={
                  editor?.getAttributes("highlight").color === color.value
                }
                onClick={() => {
                  editor
                    ?.chain()
                    .focus()
                    .setHighlight({ color: color.value })
                    .run();
                  setFormatMenu(null);
                }}
              >
                A
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
  const toolbar = (
    <>
      <button
        title="Gras (Ctrl/Cmd+B)"
        aria-pressed={editor?.isActive("bold")}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <Bold size={17} />
      </button>
      <button
        title="Italique"
        aria-pressed={editor?.isActive("italic")}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <Italic size={17} />
      </button>
      <button
        title="Souligner"
        aria-pressed={editor?.isActive("underline")}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      >
        <Underline size={17} />
      </button>
      <button
        title="Barrer"
        aria-pressed={editor?.isActive("strike")}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={17} />
      </button>
      <button
        title="Surligner"
        aria-pressed={editor?.isActive("highlight")}
        onClick={() => editor?.chain().focus().toggleHighlight().run()}
      >
        <Highlighter size={17} />
      </button>
      <button
        title="Lien"
        aria-pressed={editor?.isActive("link")}
        onClick={setLink}
      >
        <Link size={17} />
      </button>
    </>
  );
  return (
    <div
      className={`editor-shell ${admin ? "editable" : "readonly"}`}
      data-selection={selection}
    >
      {admin && (
        <div
          className="editor-history"
          role="toolbar"
          aria-label="Historique de rédaction"
        >
          <button
            title="Annuler"
            aria-label="Annuler"
            disabled={!editor?.can().undo()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 size={17} />
          </button>
          <button
            title="Rétablir"
            aria-label="Rétablir"
            disabled={!editor?.can().redo()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 size={17} />
          </button>
          <button
            className="editor-help"
            aria-label="Aide à la rédaction"
            aria-expanded={help}
            onClick={() => setHelp(!help)}
          >
            ?
          </button>
        </div>
      )}
      {admin && (
        <button
          className="insert-button floating-insert"
          aria-label="Ajouter un bloc"
          aria-expanded={!!menu}
          onMouseDown={(e) => e.preventDefault()}
          onClick={addBlock}
        >
          <Plus size={20} />
          <span>Ajouter un bloc</span>
        </button>
      )}
      {help && (
        <div className="editor-tips">
          Tape <kbd>/</kbd> au début d’un paragraphe pour choisir un bloc.
          Utilise ↑ ↓ puis Entrée. Sélectionne du texte pour le mettre en forme.
          Le menu ⋮ permet de déplacer ou dupliquer le bloc courant.{" "}
          <kbd>Ctrl/Cmd + Z</kbd> annule la dernière action.
        </div>
      )}
      {admin && editor?.isActive("table") && (
        <div className="table-tools">
          <button onClick={() => editor.chain().focus().addRowAfter().run()}>
            + Ligne
          </button>
          <button onClick={() => editor.chain().focus().addColumnAfter().run()}>
            + Colonne
          </button>
          <button onClick={() => editor.chain().focus().deleteRow().run()}>
            − Ligne
          </button>
          <button onClick={() => editor.chain().focus().deleteColumn().run()}>
            − Colonne
          </button>
          <button onClick={() => editor.chain().focus().deleteTable().run()}>
            Supprimer le tableau
          </button>
        </div>
      )}
      <div
        ref={contentRef}
        className="editor-content-wrap"
        onContextMenu={(event) => {
          if (!admin || !editor || event.shiftKey) return;
          if (
            (event.target as HTMLElement).closest(
              'input,textarea,select,[role="combobox"],.feuillet-floating',
            )
          )
            return;
          const found = blockAtElement(editor, event.target as Element);
          if (!found) return;
          event.preventDefault();
          event.stopPropagation();
          const { pos, node } = found;
          activeBlockRef.current = pos;
          const hit = editor.view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          const sel = editor.state.selection;
          if (!(
            hit &&
            !sel.empty &&
            hit.pos >= sel.from &&
            hit.pos <= sel.to
          )) {
            if (node.isAtom) editor.commands.setNodeSelection(pos);
            else
              editor.commands.setTextSelection(
                Math.min(hit?.pos ?? pos + 1, editor.state.doc.content.size),
              );
          }
          setBlockMenu(false);
          setMenu(null);
          setFormatMenu(null);
          setContext({ x: event.clientX, y: event.clientY });
        }}
      >
        {admin && editor && (
          <BlockMover
            editor={editor}
            wrap={contentRef}
            onInsert={insertAfter}
            onMenu={(pos, anchor) => {
              activeBlockRef.current = pos;
              editor.commands.setNodeSelection(pos);
              setBlockAnchor(anchor);
              setBlockMenu(true);
            }}
            onMoved={() => {
              activeBlockRef.current = null;
              app.notify("Bloc déplacé.");
            }}
          />
        )}
        {blockMenu && (
          <ContextMenu
            anchor={blockAnchor}
            title="Bloc sélectionné"
            actions={blockContextActions()}
            onClose={() => setBlockMenu(false)}
            onRestoreFocus={() => editor?.view.focus()}
          />
        )}
        {context && (
          <ContextMenu
            point={context}
            title={
              editor?.state.selection.empty ? "Ce bloc" : "Sélection et bloc"
            }
            actions={blockContextActions()}
            onClose={() => setContext(null)}
            onRestoreFocus={() => editor?.view.focus()}
          />
        )}
        <EditorContent editor={editor} />
      </div>
      {admin &&
        bubble &&
        !menu &&
        !context &&
        !blockMenu &&
        createPortal(
          <div
            className="selection-toolbar selection-toolbar-v2"
            onContextMenu={(event) => {
              if (!admin || event.shiftKey) return;
              event.preventDefault();
              event.stopPropagation();
              activeBlockRef.current = null;
              setContext({ x: event.clientX, y: event.clientY });
              setFormatMenu(null);
            }}
            role="toolbar"
            aria-label="Mise en forme du texte sélectionné"
            style={{
              left: Math.max(
                8,
                Math.min(
                  innerWidth - Math.min(480, innerWidth - 16) - 8,
                  bubble.left,
                ),
              ),
              top: bubble.top,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {formattingControls}
            {toolbar}
            {formatPopover}
          </div>,
          document.body,
        )}
      {menu &&
        createPortal(
          <div
            className="command-menu"
            role="dialog"
            aria-label="Ajouter un bloc"
            style={{ left: menu.left, top: menu.top }}
          >
            {menu.manual ? (
              <input
                autoFocus
                placeholder="Chercher un bloc…"
                aria-label="Chercher un bloc"
                value={menu.query}
                onChange={(e) => {
                  setMenu({ ...menu, query: e.target.value });
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setMenu(null);
                    editor?.commands.focus();
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((active + 1) % Math.max(filtered.length, 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive(
                      (active - 1 + Math.max(filtered.length, 1)) %
                        Math.max(filtered.length, 1),
                    );
                  }
                  if (e.key === "Enter" && filtered[active]) {
                    e.preventDefault();
                    execute(filtered[active]);
                  }
                }}
              />
            ) : (
              <div className="command-heading">
                Ajouter un bloc <kbd>/{menu.query}</kbd>
              </div>
            )}
            <div className="command-list" role="listbox">
              {filtered.map((command, i) => (
                <button
                  id={`command-${command.id}`}
                  key={command.id}
                  role="option"
                  aria-selected={i === active}
                  className={i === active ? "selected" : ""}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => execute(command)}
                >
                  <span className="command-icon">{command.icon}</span>
                  <span>
                    <strong>{command.label}</strong>
                    <small>{command.description}</small>
                  </span>
                </button>
              ))}
              {!filtered.length && (
                <p className="no-command">Aucun bloc trouvé.</p>
              )}
            </div>
            <div className="command-footer">
              ↑ ↓ choisir · Entrée insérer · Échap fermer
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
