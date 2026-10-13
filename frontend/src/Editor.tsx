import { editableDocument } from "./types";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
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
  const [help, setHelp] = useState(false);
  const [hoverBlock, setHoverBlock] = useState<{
    top: number;
    index: number;
  } | null>(null);
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
        "aria-label": admin ? "Contenu de la page" : "Contenu du cours",
      },
      handleKeyDown: (_view, event) => {
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
      if (
        admin &&
        !ed.state.selection.empty &&
        !(ed.state.selection instanceof NodeSelection)
      ) {
        const rect = window
          .getSelection()
          ?.getRangeAt(0)
          .getBoundingClientRect();
        if (rect)
          setBubble({
            left: Math.max(
              8,
              Math.min(innerWidth - 300, rect.left + rect.width / 2 - 130),
            ),
            top: Math.max(8, rect.top - 49),
          });
      } else {
        setBubble(null);
        setFormatMenu(null);
      }
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
      run: (ed) => ed.chain().focus().setParagraph().run(),
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
          .setHeading({ level: level as 1 | 2 | 3 })
          .run(),
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
          keywords: "pdf cours document",
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
      id: "gallery",
      label: "Galerie",
      description: "Une collection de pages en cartes",
      keywords: "galerie cartes collection classe ressources",
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
      keywords: "quiz qcm exercice question",
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
    if (!blockMenu) return;
    const close = (event: MouseEvent) => {
      if (
        !(event.target as Element).closest(
          ".block-control,.block-hover-rail,.block-dropdown",
        )
      )
        setBlockMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBlockMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [blockMenu]);
  useEffect(() => {
    if (menu)
      document
        .getElementById(`command-${filtered[active]?.id}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, menu?.query]);
  function hoveredPosition() {
    if (!editor || !hoverBlock) return null;
    let pos = 0;
    for (
      let i = 0;
      i < hoverBlock.index && i < editor.state.doc.childCount;
      i++
    )
      pos += editor.state.doc.child(i).nodeSize;
    const node = editor.state.doc.child(hoverBlock.index);
    return { pos, node };
  }
  function focusHovered() {
    if (!editor) return;
    const found = hoveredPosition();
    if (!found) return;
    if (found.node.isAtom) editor.commands.setNodeSelection(found.pos);
    else
      editor.commands.setTextSelection(
        Math.min(found.pos + 1, editor.state.doc.content.size),
      );
  }
  function addAfterHovered() {
    if (!editor) return;
    const found = hoveredPosition();
    if (!found) return;
    const pos = found.pos + found.node.nodeSize;
    const tr = editor.state.tr.insert(
      pos,
      editor.schema.nodes.paragraph.create(),
    );
    tr.setSelection(TextSelection.create(tr.doc, pos + 1));
    editor.view.dispatch(tr);
    editor.view.focus();
    openInsert();
  }
  function editCurrentBlock() {
    if (!editor) return;
    const index = editor.state.selection.$from.index(0);
    if (index >= editor.state.doc.childCount) return;
    const node = editor.state.doc.child(index);
    let pos = 0;
    for (let i = 0; i < index; i++) pos += editor.state.doc.child(i).nodeSize;
    if (["buttonLink", "bookmark", "fileBlock"].includes(node.type.name)) {
      document.dispatchEvent(
        new CustomEvent("feuillet-edit-resource", { detail: { pos } }),
      );
      setBlockMenu(false);
    }
  }

  const mutateBlock = (action: "up" | "down" | "duplicate" | "delete") => {
    if (!editor) return;
    const { state } = editor;
    const index = state.selection.$from.index(0);
    let pos = 0;
    for (let i = 0; i < index; i++) pos += state.doc.child(i).nodeSize;
    const node = state.doc.child(index);
    let tr = state.tr;
    if (action === "delete") {
      tr = tr.delete(pos, pos + node.nodeSize);
      if (!tr.doc.childCount)
        tr.insert(0, state.schema.nodes.paragraph.create());
    } else if (action === "duplicate") {
      tr = tr.insert(pos + node.nodeSize, node.copy(node.content));
    } else if (action === "up" && index > 0) {
      const previous = state.doc.child(index - 1);
      tr = tr
        .delete(pos, pos + node.nodeSize)
        .insert(pos - previous.nodeSize, node);
      tr = tr.setSelection(
        TextSelection.near(tr.doc.resolve(pos - previous.nodeSize + 1)),
      );
    } else if (action === "down" && index < state.doc.childCount - 1) {
      const next = state.doc.child(index + 1);
      tr = tr
        .delete(pos, pos + node.nodeSize)
        .insert(pos + next.nodeSize, node);
      tr = tr.setSelection(
        TextSelection.near(tr.doc.resolve(pos + next.nodeSize + 1)),
      );
    }
    editor.view.dispatch(tr);
    editor.view.focus();
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
    const chain = editor.chain().focus();
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
          className="editor-toolbar"
          role="toolbar"
          aria-label="Outils de rédaction"
        >
          <button
            className="insert-button"
            aria-label="Ajouter un bloc"
            onClick={openInsert}
          >
            <Plus size={17} />
            <span>Ajouter</span>
          </button>
          <div className="toolbar-divider" />
          {formattingControls}
          {toolbar}
          {!bubble && formatPopover}
          <div className="toolbar-divider" />
          <button
            title="Annuler"
            disabled={!editor?.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 size={17} />
          </button>
          <button
            title="Rétablir"
            disabled={!editor?.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 size={17} />
          </button>
          <div className="block-control">
            <button
              title="Actions sur le bloc courant"
              aria-expanded={blockMenu}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setBlockMenu(!blockMenu)}
            >
              <GripVertical size={17} />
            </button>
            {blockMenu && (
              <div className="dropdown block-dropdown">
                <small>Bloc sélectionné</small>
                {editor &&
                  ["buttonLink", "bookmark", "fileBlock"].includes(
                    editor.state.doc.child(
                      Math.min(
                        editor.state.selection.$from.index(0),
                        editor.state.doc.childCount - 1,
                      ),
                    ).type.name,
                  ) && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={editCurrentBlock}
                    >
                      <Link />
                      Modifier la présentation
                    </button>
                  )}
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => mutateBlock("up")}
                >
                  <ArrowUp />
                  Monter
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => mutateBlock("down")}
                >
                  <ArrowDown />
                  Descendre
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => mutateBlock("duplicate")}
                >
                  <Copy />
                  Dupliquer
                </button>
                <button
                  className="danger"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => mutateBlock("delete")}
                >
                  <Trash2 />
                  Supprimer
                </button>
              </div>
            )}
          </div>
          <button
            className="editor-help"
            aria-label="Aide à la rédaction"
            onClick={() => setHelp(!help)}
          >
            ?
          </button>
        </div>
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
        onMouseMove={(event) => {
          if (!admin || !editor || !contentRef.current) return;
          const top = Array.from(editor.view.dom.children).find((el) =>
            el.contains(event.target as HTMLElement),
          );
          if (!top) return;
          const index = Array.from(editor.view.dom.children).indexOf(top);
          if (index >= editor.state.doc.childCount) return;
          setHoverBlock({
            index,
            top:
              top.getBoundingClientRect().top -
              contentRef.current.getBoundingClientRect().top,
          });
        }}
      >
        {admin && hoverBlock && (
          <div className="block-hover-rail" style={{ top: hoverBlock.top }}>
            <button
              title="Ajouter un bloc ici"
              onMouseDown={(e) => e.preventDefault()}
              onClick={addAfterHovered}
            >
              <Plus size={15} />
            </button>
            <button
              title="Déplacer, dupliquer ou supprimer ce bloc"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                focusHovered();
                setBlockMenu(!blockMenu);
              }}
            >
              <GripVertical size={15} />
            </button>
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
      {admin &&
        bubble &&
        createPortal(
          <div
            className="selection-toolbar selection-toolbar-v2"
            role="toolbar"
            aria-label="Mise en forme du texte sélectionné"
            style={{
              left: Math.max(
                8,
                Math.min(
                  innerWidth - Math.min(370, innerWidth - 16) - 8,
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
                  if (e.key === "Escape") setMenu(null);
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
