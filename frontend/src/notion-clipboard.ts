import type { JSONContent } from "@tiptap/core";
import {
  DOMParser as ProseMirrorParser,
  type Node as PMNode,
  type Schema,
} from "@tiptap/pm/model";

type RecordData = Record<string, unknown>;
type ClipboardBlock = {
  blockId?: string;
  blockSubtree?: { block?: Record<string, { value?: RecordData }> };
};
const tones: Record<string, string> = {
  gray: "#787774",
  brown: "#936650",
  orange: "#c45500",
  yellow: "#a36b00",
  green: "#307b60",
  blue: "#2b74a8",
  purple: "#8051a9",
  pink: "#ac457b",
  red: "#bd423e",
};
const backgrounds: Record<string, string> = {
  gray: "#e8e7e5",
  brown: "#f0e4dc",
  orange: "#fae7d4",
  yellow: "#f8efcc",
  green: "#dfede6",
  blue: "#dcecf8",
  purple: "#eee3f6",
  pink: "#f5e2ed",
  red: "#f8dfdd",
};
const paragraph = (): JSONContent => ({ type: "paragraph" });
const string = (value: unknown) => (typeof value === "string" ? value : "");
const record = (value: unknown): RecordData =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordData)
    : {};
const notionId = (value: string) =>
  /^[a-f\d]{8}(?:-?[a-f\d]{4}){3}-?[a-f\d]{12}$/i.test(value);
const fileLabel = /\.[a-z\d]{1,9}$/i;
const pageIcon =
  /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*)\s+/u;

function webUrl(value: unknown, image = false): string {
  try {
    const url = new URL(string(value));
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return "";
    // These addresses are short-lived or require an authenticated Notion session.
    if (
      image &&
      (/\b(?:secure\.notion-static\.com|prod-files-secure\.s3[.-])/i.test(
        url.hostname,
      ) ||
        /(?:[?&](?:X-Amz-Signature|Signature|token)=)/i.test(url.search))
    )
      return "";
    return url.href;
  } catch {
    return "";
  }
}
function notionPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /(?:^|\.)(?:notion\.com|notion\.so|notion\.site)$/i.test(
        parsed.hostname,
      ) &&
      /[a-f\d]{32}\/?$/i.test(parsed.pathname.replace(/-/g, "")) &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}
function reference(label: string, href = "", icon = ""): JSONContent {
  const match = label.match(pageIcon);
  return {
    type: "pageLink",
    attrs: {
      label:
        (match ? label.slice(match[0].length) : label).trim().slice(0, 255) ||
        "Page Notion",
      href,
      icon: icon || match?.[1] || "📄",
    },
  };
}
function missingFile(label: string): JSONContent {
  return {
    type: "fileBlock",
    attrs: { name: label.trim().slice(0, 240) || "Fichier Notion" },
  };
}
function calloutTone(value: string): string {
  const color = value.replace(/_background$/, "").replace(/^block-color-/, "");
  return color === "orange" || color === "yellow"
    ? "amber"
    : ["blue", "green", "red"].includes(color)
      ? color
      : "gray";
}
function inline(value: unknown): JSONContent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((part): JSONContent[] => {
    if (!Array.isArray(part) || typeof part[0] !== "string") return [];
    const marks: NonNullable<JSONContent["marks"]> = [];
    for (const mark of Array.isArray(part[1]) ? part[1].slice(0, 20) : []) {
      if (!Array.isArray(mark)) continue;
      const type = (
        {
          b: "bold",
          i: "italic",
          _: "underline",
          s: "strike",
          c: "code",
        } as Record<string, string>
      )[string(mark[0])];
      if (type) marks.push({ type });
      if (mark[0] === "a" && webUrl(mark[1]))
        marks.push({ type: "link", attrs: { href: webUrl(mark[1]) } });
      if (mark[0] === "h") {
        const color = string(mark[1]);
        if (tones[color])
          marks.push({ type: "textStyle", attrs: { color: tones[color] } });
        if (
          backgrounds[color.replace(/_background$/, "")] &&
          color.endsWith("_background")
        )
          marks.push({
            type: "highlight",
            attrs: { color: backgrounds[color.replace(/_background$/, "")] },
          });
      }
    }
    return part[0]
      .split("\n")
      .flatMap((text: string, index: number) => [
        ...(index ? [{ type: "hardBreak" }] : []),
        ...(text
          ? [{ type: "text", text, ...(marks.length ? { marks } : {}) }]
          : []),
      ]);
  });
}
function plain(value: unknown): string {
  return Array.isArray(value)
    ? value.map((part) => (Array.isArray(part) ? string(part[0]) : "")).join("")
    : string(value);
}
function groupLists(items: JSONContent[]): JSONContent[] {
  const out: JSONContent[] = [];
  for (const item of items) {
    const prev = out.at(-1);
    if (
      prev &&
      prev.type === item.type &&
      ["bulletList", "orderedList", "taskList"].includes(item.type || "")
    )
      prev.content!.push(...(item.content || []));
    else out.push(item);
  }
  return out;
}

/** Interpret the records actually carried by Notion's clipboard, without resolving IDs over the network. */
export function notionRecords(
  raw: string,
): { items: (JSONContent[] | null)[] } | null {
  if (!raw || raw.length > 2_000_000) return null;
  try {
    const payload = JSON.parse(raw);
    if (
      !Array.isArray(payload?.blocks) ||
      !payload.blocks.length ||
      payload.blocks.length > 2500
    )
      return null;
    const store = new Map<string, RecordData>();
    for (const entry of payload.blocks as ClipboardBlock[]) {
      if (!entry || !entry.blockSubtree) continue;
      for (const [id, item] of Object.entries(
        record(entry.blockSubtree.block),
      )) {
        if (notionId(id) && item && typeof item === "object")
          store.set(id, record(record(item).value));
        if (store.size > 5000) return null;
      }
    }
    let count = 0;
    const ancestors = new Set<string>();
    function block(id: string, depth: number): JSONContent[] | null {
      if (depth > 24 || ++count > 5000 || ancestors.has(id)) return null;
      const data = store.get(id);
      if (!data || data.alive === false) return null;
      const props = record(data.properties),
        format = record(data.format);
      const title = inline(props.title);
      const label = plain(props.title);
      const childrenIds = Array.isArray(data.content) ? data.content : [];
      const type = string(data.type);
      let children: JSONContent[] = [];
      if (
        childrenIds.length &&
        !["page", "file", "image", "pdf", "video", "audio"].includes(type)
      ) {
        ancestors.add(id);
        const resolved = childrenIds.map((child) =>
          block(string(child), depth + 1),
        );
        ancestors.delete(id);
        if (resolved.some((child) => !child)) return null;
        children = groupLists(resolved.flatMap((child) => child || []));
      }
      const body = children.length ? children : [paragraph()];
      const text = (type = "paragraph"): JSONContent => ({
        type,
        ...(title.length ? { content: title } : {}),
      });
      const level = (
        { header: 1, sub_header: 2, sub_sub_header: 3 } as Record<
          string,
          number
        >
      )[type];
      if (level || type === "toggle") {
        const heading = { ...text("heading"), attrs: { level: level || 3 } };
        return type === "toggle" || format.toggleable === true
          ? [{ type: "toggleHeading", content: [heading, ...body] }]
          : [heading, ...children];
      }
      if (type === "callout") {
        const icon = string(format.page_icon);
        return [
          {
            type: "callout",
            attrs: {
              icon: /^\p{Extended_Pictographic}/u.test(icon)
                ? icon.slice(0, 24)
                : "",
              tone: calloutTone(string(format.block_color)),
            },
            content: [...(title.length ? [text()] : []), ...children].length
              ? [...(title.length ? [text()] : []), ...children]
              : [paragraph()],
          },
        ];
      }
      if (type === "text") return [text(), ...children];
      if (type === "quote")
        return [{ type: "blockquote", content: [text(), ...children] }];
      if (type === "divider") return [{ type: "horizontalRule" }];
      if (type === "code")
        return [
          {
            type: "codeBlock",
            attrs: {
              language: plain(props.language).toLowerCase().slice(0, 40),
            },
            content: label ? [{ type: "text", text: label }] : [],
          },
        ];
      if (
        type === "bulleted_list" ||
        type === "numbered_list" ||
        type === "to_do"
      ) {
        const kind =
          type === "to_do"
            ? "taskList"
            : type === "bulleted_list"
              ? "bulletList"
              : "orderedList";
        return [
          {
            type: kind,
            content: [
              {
                type: kind === "taskList" ? "taskItem" : "listItem",
                ...(kind === "taskList"
                  ? { attrs: { checked: plain(props.checked) === "Yes" } }
                  : {}),
                content: [text(), ...children],
              },
            ],
          },
        ];
      }
      if (type === "page")
        return [
          reference(
            label,
            "https://www.notion.so/" + id.replace(/-/g, ""),
            string(format.page_icon).match(/^\p{Extended_Pictographic}/u)
              ? string(format.page_icon).slice(0, 24)
              : "",
          ),
        ];
      if (type === "column") return [{ type: "column", content: body }];
      if (type === "column_list")
        return children.length >= 2 &&
          children.length <= 6 &&
          children.every((c) => c.type === "column")
          ? [{ type: "columns", content: children }]
          : children.flatMap((child) => child.content || []);
      if (type === "image") {
        const src =
          webUrl(plain(props.source), true) ||
          webUrl(format.display_source, true);
        return src
          ? [
              {
                type: "image",
                attrs: { src, alt: plain(props.caption).slice(0, 240) },
              },
            ]
          : [missingFile(label || plain(props.caption) || "Image Notion")];
      }
      if (["file", "pdf", "video", "audio"].includes(type))
        return [missingFile(label || plain(props.caption) || "Fichier Notion")];
      if (type === "bookmark") {
        const href = webUrl(plain(props.link));
        return href
          ? [
              {
                type: "bookmark",
                attrs: {
                  href,
                  title: label || href,
                  description: plain(props.description),
                },
              },
            ]
          : [text()];
      }
      return null;
    }
    return {
      items: payload.blocks.map((entry: ClipboardBlock) =>
        block(string(entry?.blockId), 0),
      ),
    };
  } catch {
    return null;
  }
}

function normalizeHtml(root: DocumentFragment) {
  // Work inside an inert template. Only ProseMirror nodes parsed from this fragment are inserted.
  const document = root.ownerDocument;
  const element = (tag: string, attrs: Record<string, string>) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) =>
      el.setAttribute(key, value),
    );
    return el;
  };
  root
    .querySelectorAll(
      "script,style,iframe,object,embed,template,svg,base,link,meta,form,input",
    )
    .forEach((node) => node.remove());
  for (const node of root.querySelectorAll("*")) {
    for (const attr of [...node.attributes]) {
      if (
        /^on|^srcdoc$|^data-(?!(?:block-type|notion-file(?:-alias)?|emoji)$)|^(?:pageid|fileid|posterid|iconid|dbid|formid|code)$/i.test(
          attr.name,
        )
      ) {
        node.removeAttribute(attr.name);
      }
    }
  }
  // Notion also serializes some callouts as two escaped delimiter paragraphs.
  const openers = new Map<Node, Element[]>();
  for (const marker of root.querySelectorAll("p")) {
    const parent = marker.parentNode;
    if (!parent || marker.children.length) continue;
    const value = marker.textContent?.trim();
    if (value === "<aside>") {
      const stack = openers.get(parent) || [];
      stack.push(marker);
      openers.set(parent, stack);
    } else if (value === "</aside>") {
      const opener = openers.get(parent)?.pop();
      if (!opener || opener.nextElementSibling === marker) continue;
      const box = element("aside", {
        "data-callout": "",
        tone: "gray",
        icon: "",
      });
      while (opener.nextSibling && opener.nextSibling !== marker)
        box.append(opener.nextSibling);
      opener.replaceWith(box);
      marker.remove();
    }
  }
  const standalone = (anchor: Element) => {
    const p = anchor.parentElement;
    return p?.tagName === "P" &&
      p.children.length === 1 &&
      p.textContent?.trim() === anchor.textContent?.trim()
      ? p
      : anchor;
  };
  root
    .querySelectorAll("figure.callout,aside.callout,[data-block-type=callout]")
    .forEach((node) => {
      const icon =
        node.querySelector(".icon")?.getAttribute("data-emoji") ||
        node.querySelector(".icon")?.textContent?.trim() ||
        "";
      const colored = [
        ...node.classList,
        ...[...node.children].flatMap((child) => [...child.classList]),
      ].find((cls) => cls.startsWith("block-color-"));
      const box = element("aside", {
        "data-callout": "",
        tone: calloutTone(colored || ""),
        icon: icon.slice(0, 24),
      });
      for (const child of [...node.childNodes]) {
        if (
          child instanceof Element &&
          (child.matches(".icon,.callout-icon") ||
            (child.querySelector(".icon") && child.children.length === 1))
        )
          continue;
        box.append(child);
      }
      if (!box.childNodes.length) box.append(document.createElement("p"));
      node.replaceWith(box);
    });
  [...root.querySelectorAll("details")].reverse().forEach((node) => {
    const summary = node.querySelector(":scope > summary");
    if (!summary) return;
    const heading =
      summary.querySelector("h1,h2,h3") || document.createElement("h3");
    if (!heading.parentElement) heading.append(...summary.childNodes);
    const wrapper = element("section", { "data-toggle-heading": "" });
    wrapper.append(heading);
    summary.remove();
    if (node.childNodes.length) wrapper.append(...node.childNodes);
    else wrapper.append(document.createElement("p"));
    node.replaceWith(wrapper);
  });
  root
    .querySelectorAll(
      "figure.link-to-page,figure.page,figure.file,figure.pdf,figure.audio,figure.video",
    )
    .forEach((node) => {
      const anchor = node.querySelector("a[href]");
      const label =
        anchor?.textContent?.trim() || node.textContent?.trim() || "";
      const href = webUrl(anchor?.getAttribute("href"));
      node.replaceWith(
        node.matches(".page,.link-to-page")
          ? element("div", {
              "data-page-link": "",
              label,
              href,
              icon:
                node.querySelector(".icon")?.getAttribute("data-emoji") ||
                node.querySelector(".icon")?.textContent?.trim() ||
                "📄",
            })
          : element("div", {
              "data-file": "",
              name: label || "Fichier Notion",
            }),
      );
    });
  root.querySelectorAll("a[data-notion-file]").forEach((anchor) => {
    const container = anchor.closest("figure") || standalone(anchor);
    const name =
      anchor.getAttribute("data-notion-file-alias") ||
      anchor.textContent?.trim() ||
      "Fichier Notion";
    container.replaceWith(element("div", { "data-file": "", name }));
  });
  root.querySelectorAll("a[href]").forEach((anchor) => {
    const href = webUrl(anchor.getAttribute("href"));
    const label = anchor.textContent?.trim() || "";
    const container = standalone(anchor);
    if (
      notionPage(href) &&
      (container !== anchor || anchor.matches(".page-link"))
    ) {
      const block = reference(label, href);
      container.replaceWith(
        element("div", {
          "data-page-link": "",
          label: block.attrs!.label,
          href,
          icon: block.attrs!.icon,
        }),
      );
    } else if (
      container !== anchor &&
      fileLabel.test(label) &&
      (anchor.hasAttribute("download") ||
        /notion-static|prod-files-secure/i.test(href))
    ) {
      container.replaceWith(element("div", { "data-file": "", name: label }));
    } else if (href) anchor.setAttribute("href", href);
    else anchor.removeAttribute("href");
  });
  root.querySelectorAll("img").forEach((image) => {
    const src = webUrl(image.getAttribute("src"), true);
    if (src) image.setAttribute("src", src);
    else {
      const label = image.getAttribute("alt")?.trim();
      const block = image.closest("figure") || image.closest("p");
      if (
        block &&
        block.textContent?.trim() === "" &&
        block.querySelectorAll("img").length === 1
      )
        block.replaceWith(
          element("div", { "data-file": "", name: label || "Image Notion" }),
        );
      else image.replaceWith(document.createTextNode(label || ""));
    }
  });
}

export function normalizeNotionClipboard(
  clipboard: DataTransfer,
  schema: Schema,
): { nodes: PMNode[]; flattened: boolean } | null {
  const custom = [...clipboard.types].find((type) =>
    /^text\/_notion-blocks-v3(?:-|$)/i.test(type),
  );
  const html = clipboard.getData("text/html");
  if (
    !custom &&
    !/<!--\s*notionvc:|class=["'][^"']*\bnotion-(?:callout|page|toggle)|<details\b/i.test(
      html,
    )
  )
    return null;
  if (html.length > 2_000_000) return null;
  const structured = notionRecords(custom ? clipboard.getData(custom) : "");
  const asNodes = (items: JSONContent[]) =>
    groupLists(items).map((item) => {
      const node = schema.nodeFromJSON(item);
      node.check();
      return node;
    });
  try {
    if (structured?.items.every((item) => item !== null))
      return {
        nodes: asNodes(structured.items.flatMap((item) => item || [])),
        flattened: false,
      };
  } catch {
    /* A malformed custom format can still have useful HTML. */
  }
  const flattened = !!structured?.items.some((item) => item === null);
  if (!html) return flattened ? { nodes: [], flattened } : null;
  const document = window.document;
  const template = document.createElement("template");
  template.innerHTML = html;
  normalizeHtml(template.content);
  if (
    !template.content.textContent?.trim() &&
    !template.content.querySelector("img,hr,[data-file],[data-page-link]")
  )
    return flattened ? { nodes: [], flattened } : null;
  const container = document.createElement("div");
  container.append(template.content);
  const parsed = ProseMirrorParser.fromSchema(schema).parse(container);
  const nodes: PMNode[] = [];
  parsed.forEach((node) => nodes.push(node));
  if (flattened && structured) {
    const unknown = structured.items.indexOf(null);
    if (unknown === structured.items.lastIndexOf(null)) {
      try {
        const known = (items: (JSONContent[] | null)[]) =>
          asNodes(items.flatMap((item) => item || [])).filter(
            (node) => node.type.name !== "paragraph" || node.childCount,
          );
        const before = known(structured.items.slice(0, unknown));
        const after = known(structured.items.slice(unknown + 1));
        const matching = (a: PMNode, b: PMNode) =>
          a.type === b.type &&
          a.textContent.replace(/\s+/g, " ").trim() ===
            b.textContent.replace(/\s+/g, " ").trim();
        const end = nodes.length - after.length;
        if (
          end >= before.length &&
          before.every((node, index) => matching(node, nodes[index])) &&
          after.every((node, index) => matching(node, nodes[end + index]))
        ) {
          // One opaque block with a heading and a body is serialized as a flat run.
          const middle = nodes.slice(before.length, end);
          const [head, ...body] = middle;
          const fold = (source: PMNode[]): PMNode => {
            const [title, ...children] = source;
            const content: PMNode[] = [title];
            for (let i = 0; i < children.length;) {
              const child = children[i];
              let next = i + 1;
              if (child.type.name === "heading") {
                while (
                  next < children.length &&
                  (children[next].type.name !== "heading" ||
                    children[next].attrs.level > child.attrs.level)
                )
                  next++;
              }
              content.push(
                next > i + 1 ? fold(children.slice(i, next)) : child,
              );
              i = next;
            }
            return schema.nodes.toggleHeading.createChecked(null, content);
          };
          const opaque =
            head?.type.name === "heading" &&
            body.length &&
            body.every(
              (node) =>
                node.type.name !== "heading" ||
                node.attrs.level > head.attrs.level,
            )
              ? [fold(middle)]
              : middle;
          return { nodes: [...before, ...opaque, ...after], flattened };
        }
      } catch {
        /* Preserve the HTML when the custom records do not fit the editor schema. */
      }
    }
  }
  return { nodes, flattened };
}
