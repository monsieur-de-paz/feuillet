import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { MindMap, makeMap } from "./MindMap";
function View({ node, updateAttributes, editor }: NodeViewProps) {
  return (
    <NodeViewWrapper contentEditable={false}>
      <MindMap
        data={node.attrs.map || makeMap()}
        onChange={
          editor.isEditable ? (map) => updateAttributes({ map }) : undefined
        }
      />
    </NodeViewWrapper>
  );
}
export const MindMapBlock = Node.create({
  name: "mindMap",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { map: { default: null } };
  },
  parseHTML() {
    return [{ tag: "section[data-mind-map]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "section",
      mergeAttributes(HTMLAttributes, { "data-mind-map": "1" }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(View, { stopEvent: () => true });
  },
});
