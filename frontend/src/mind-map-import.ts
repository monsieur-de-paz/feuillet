import { arrange, colors, type Bubble, type MapData } from "./mind-map-model";
function plain(text: string) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)")
    .replace(/[*_`]/g, "")
    .trim();
}
function texPlain(text: string) {
  return text
    .replace(/\\(?:href)\{([^}]+)\}\{([^}]+)\}/g, "$2 ($1)")
    .replace(/\\(?:label|index)\{[^}]*\}/g, "")
    .replace(/\\(?:textbf|textit|emph|underline|texttt)\{([^}]+)\}/g, "$1")
    .replace(/\\(?:begin|end)\{(?:itemize|enumerate|document)\}/g, "")
    .replace(/\\item\b/g, "•")
    .replace(/\\\\/g, "\n")
    .replace(/\\([%&#_$])/g, "$1")
    .trim();
}
export function importMindMap(text: string, filename: string): MapData {
  if (text.length > 1_000_000)
    throw new Error("Le document doit faire moins de 1 Mo de texte.");
  const tex = /\.tex$/i.test(filename),
    sections: { level: number; title: string; body: string[] }[] = [];
  let current = {
    level: 0,
    title: filename.replace(/\.(md|markdown|tex)$/i, ""),
    body: [] as string[],
  };
  sections.push(current);
  if (tex) {
    text = text.replace(/(?<!\\)%[^\n]*/g, "");
    const title = text.match(/\\title\{([^}]+)\}/)?.[1];
    if (title) current.title = texPlain(title);
    if (text.includes("\\begin{document}"))
      text = text.split("\\begin{document}").slice(1).join("\\begin{document}");
    text = text.replace(/\\(?:maketitle|tableofcontents)\b/g, "");
    const re =
      /\\(part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?\s*(?:\[[^\]]*\])?\s*\{/g;
    let last = 0,
      m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      current.body.push(texPlain(text.slice(last, m.index)));
      let depth = 1,
        end = re.lastIndex;
      for (; end < text.length && depth; end++) {
        if (text[end] === "{" && text[end - 1] !== "\\") depth++;
        if (text[end] === "}" && text[end - 1] !== "\\") depth--;
      }
      if (depth)
        throw new Error("Un titre TEX contient une accolade non fermée.");
      const title = texPlain(text.slice(re.lastIndex, end - 1));
      current = {
        level:
          [
            "part",
            "chapter",
            "section",
            "subsection",
            "subsubsection",
            "paragraph",
            "subparagraph",
          ].indexOf(m[1]) + 1,
        title,
        body: [],
      };
      sections.push(current);
      last = end;
      re.lastIndex = end;
    }
    current.body.push(
      texPlain(text.slice(last).replace(/\\end\{document\}[\s\S]*/, "")),
    );
  } else {
    let fence = "";
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i],
        code = line.match(/^\s*(`{3,}|~{3,})/);
      if (code) {
        if (!fence) fence = code[1][0];
        else if (fence === code[1][0]) fence = "";
        current.body.push(line);
        continue;
      }
      const atx = !fence && line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*$/),
        setext =
          !fence &&
          i + 1 < lines.length &&
          lines[i + 1].match(/^ {0,3}(=+|-+)\s*$/) &&
          line.trim();
      if (atx || setext) {
        current = {
          level: atx ? atx[1].length : lines[i + 1].trim()[0] === "=" ? 1 : 2,
          title: plain(atx ? atx[2] : line),
          body: [],
        };
        sections.push(current);
        if (setext) i++;
      } else current.body.push(line);
    }
  }
  if (sections.length > 300)
    throw new Error("Ce document contient plus de 300 sections.");
  const nonempty = sections.filter((s, i) => i === 0 || s.title.trim());
  if (
    nonempty[0].body.join("").trim() === "" &&
    nonempty[1]?.level === 1 &&
    nonempty.filter((s) => s.level === 1).length === 1
  ) {
    nonempty.shift();
    nonempty[0].level = 0;
  }
  const nodes: Bubble[] = [],
    stack: { level: number; id: string }[] = [];
  for (const section of nonempty) {
    while (stack.length && stack.at(-1)!.level >= section.level) stack.pop();
    const body = section.body.join("\n").trim();
    if (body.length > 20000)
      throw new Error(
        `La section « ${section.title} » dépasse 20 000 caractères : découpe-la en sous-sections.`,
      );
    const id = crypto.randomUUID();
    nodes.push({
      id,
      parent: nodes.length ? stack.at(-1)?.id || nodes[0].id : "",
      text: section.title.slice(0, 1500),
      note: "",
      content: body,
      x: 0,
      y: 0,
      fill: colors[nodes.length % colors.length],
      ink: "#243A36",
      line: "#73988B",
      bold: !nodes.length,
      italic: false,
      size: nodes.length ? 18 : 24,
      url: "",
      childrenSide: "auto",
      row: false,
    });
    stack.push({ level: section.level, id });
  }
  return arrange(
    {
      title: nodes[0].text,
      theme: "cards",
      layout: "bilateral",
      display: "preview",
      nodes,
      links: [],
    },
    "bilateral",
  );
}
