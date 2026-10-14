import {
  Node,
  mergeAttributes,
  type Editor,
  type NodeViewProps,
} from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useApp } from "./context";

function ToggleHeadingView({ node, editor, getPos }: NodeViewProps) {
  const { admin } = useApp();
  const [open, setOpen] = useState(admin);
  const title = node.firstChild?.textContent || "Titre dépliable";
  return (
    <NodeViewWrapper
      className={`toggle-heading-editor ${open ? "is-open" : ""}`}
    >
      <button
        className="toggle-heading-arrow"
        contentEditable={false}
        aria-label={`${open ? "Replier" : "Déplier"} : ${title}`}
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          // Move the caret out of content that is about to become hidden.
          const pos = getPos();
          if (
            open &&
            admin &&
            typeof pos === "number" &&
            editor.state.selection.from > pos + (node.firstChild?.nodeSize || 0)
          )
            editor.commands.setTextSelection(pos + 2);
          setOpen(!open);
        }}
      >
        <ChevronDown size={18} />
      </button>
      <NodeViewContent className="toggle-heading-content" />
    </NodeViewWrapper>
  );
}

export const ToggleHeading = Node.create({
  name: "toggleHeading",
  group: "block",
  content: "heading block+",
  defining: true,
  parseHTML() {
    return [{ tag: "section[data-toggle-heading]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-toggle-heading": "" }),
      0,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ToggleHeadingView);
  },
  addKeyboardShortcuts() {
    const enterBody = () => {
      const { $from, empty } = this.editor.state.selection;
      if (
        !empty ||
        $from.parent.type.name !== "heading" ||
        $from.depth < 2 ||
        $from.node(-1).type.name !== "toggleHeading"
      )
        return false;
      const tr = this.editor.state.tr;
      tr.setSelection(TextSelection.near(tr.doc.resolve($from.after() + 1)));
      this.editor.view.dispatch(tr);
      return true;
    };
    return {
      Tab: enterBody,
      Enter: () =>
        this.editor.state.selection.$from.parentOffset ===
          this.editor.state.selection.$from.parent.content.size && enterBody(),
    };
  },
});

/** Wrap a text block without flattening its inline marks or replacing siblings. */
export function toggleHeadingCommand(
  level: 1 | 2 | 3,
): import("@tiptap/core").Command {
  return ({ tr, dispatch }) => {
    const { $from } = tr.selection;
    const schema = tr.doc.type.schema;
    if (!$from.parent.isTextblock) return false;
    if (
      $from.depth > 1 &&
      $from.node(-1).type.name === "toggleHeading" &&
      $from.parent.type.name === "heading"
    ) {
      if (dispatch)
        tr.setNodeMarkup($from.before(), undefined, {
          ...$from.parent.attrs,
          level,
        });
      return true;
    }
    const heading = schema.nodes.heading.create(
      { level },
      $from.parent.content,
    );
    const node = schema.nodes.toggleHeading.create(null, [
      heading,
      schema.nodes.paragraph.create(),
    ]);
    if (dispatch) {
      const start = $from.before();
      tr.replaceWith(start, $from.after(), node);
      tr.setSelection(TextSelection.near(tr.doc.resolve(start + 2)));
    }
    return true;
  };
}

export function setToggleHeading(editor: Editor, level: 1 | 2 | 3) {
  return editor.chain().focus().command(toggleHeadingCommand(level)).run();
}

/** Remove only the container; keep its title and every contained block. */
export const unwrapToggleHeading: import("@tiptap/core").Command = ({
  tr,
  dispatch,
}) => {
  const { $from, $to, from, to } = tr.selection;
  if (
    $from.depth < 2 ||
    $from.node(-1).type.name !== "toggleHeading" ||
    $from.parent.type.name !== "heading" ||
    !$from.sameParent($to)
  )
    return true;
  const wrapper = $from.node(-1),
    parent = $from.node(-2),
    index = $from.index(-2);
  if (!parent.canReplace(index, index + 1, wrapper.content)) return false;
  if (dispatch) {
    tr.replaceWith(
      $from.before($from.depth - 1),
      $from.after($from.depth - 1),
      wrapper.content,
    );
    tr.setSelection(TextSelection.create(tr.doc, from - 1, to - 1));
  }
  return true;
};
