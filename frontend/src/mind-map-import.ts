import { arrange, colors, type Bubble, type MapData } from "./mind-map-model";
export function markdownPlain(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/^\s*(`{3,}|~{3,}).*$/gm, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt) =>
      alt ? `Illustration : ${alt}` : "",
    )
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/^\s*\[[^\]]+\]:.*$/gm, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+(?:\[[ xX]\]\s*)?/gm, "• ")
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, "")
    .replace(/^\s*(?:---+|===+|\*\*\*+)\s*$/gm, "")
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a, b) => a || b)
    .replace(/\*([^*\n]+)\*|_([^_\n]+)_/g, (_, a, b) => a || b)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\\([\\`*_{}\[\]()>#+.!-])/g, "$1")
    .replace(
      /&(?:amp|lt|gt|quot|nbsp);/g,
      (e) =>
        ({
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&nbsp;": " ",
        })[e]!,
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function plain(text: string) {
  return markdownPlain(text);
}
function group(text: string, at: number, open = "{", close = "}") {
  if (text[at] !== open) return null;
  let depth = 1,
    i = at + 1;
  for (; i < text.length && depth; i++) {
    if (text[i] === "\\") {
      i++;
      continue;
    }
    if (text[i] === open) depth++;
    if (text[i] === close) depth--;
  }
  if (depth) throw new Error("Une accolade ou option TeX n’est pas fermée.");
  return { text: text.slice(at + 1, i - 1), end: i };
}
export function texPlain(text: string, depth = 0): string {
  if (depth > 32)
    throw new Error("Le document TeX contient trop de niveaux imbriqués.");
  text = text
    .replace(/(?<!\\)%[^\n]*/g, "")
    .replace(
      /\\begin\{(tikzpicture|pgfpicture|axis|lstlisting|minted|verbatim)\}[\s\S]*?\\end\{\1\}/g,
      "\n[Schéma ou code du document non importé]\n",
    );
  let out = "",
    i = 0;
  const drop = new Set([
    "documentclass",
    "usepackage",
    "geometry",
    "usetikzlibrary",
    "vspace",
    "hspace",
    "rule",
    "label",
    "index",
    "input",
    "include",
    "bibliography",
    "bibliographystyle",
    "setlength",
    "addtolength",
    "definecolor",
    "newcommand",
    "renewcommand",
    "pagestyle",
    "thispagestyle",
    "pagecolor",
    "color",
    "fontsize",
    "cline",
  ]);
  while (i < text.length) {
    const c = text[i];
    if (c === "{" || c === "}") {
      i++;
      continue;
    }
    if (c !== "\\") {
      out += c === "$" ? "" : c === "&" ? " · " : c === "~" ? " " : c;
      i++;
      continue;
    }
    i++;
    if (i >= text.length) break;
    if (text[i] === "\\") {
      out += "\n";
      i++;
      if (text[i] === "[") {
        const g = group(text, i, "[", "]");
        if (g) i = g.end;
      }
      continue;
    }
    if (!/[a-zA-Z]/.test(text[i])) {
      const ch = text[i++];
      out +=
        ch === "%" ||
        ch === "&" ||
        ch === "_" ||
        ch === "#" ||
        ch === "$" ||
        ch === "{" ||
        ch === "}"
          ? ch
          : ch === " "
            ? " "
            : "";
      continue;
    }
    const match = text.slice(i).match(/^[a-zA-Z]+/)!;
    const cmd = match[0];
    i += cmd.length;
    if (text[i] === "*") i++;
    while (text[i] === " " || text[i] === "\t") i++;
    if (text[i] === "[") {
      const opt = group(text, i, "[", "]");
      if (opt) i = opt.end;
    }
    while (text[i] === " " || text[i] === "\t") i++;
    if (cmd === "begin" || cmd === "end") {
      const env = group(text, i);
      if (!env) continue;
      i = env.end;
      if (cmd === "begin") {
        if (text[i] === "[") {
          const opt = group(text, i, "[", "]");
          if (opt) i = opt.end;
        }
        if (["tabular", "tabularx", "array", "minipage"].includes(env.text)) {
          while (text[i] === "{") {
            const spec = group(text, i)!;
            i = spec.end;
          }
        }
      }
      out += "\n";
      continue;
    }
    if (cmd === "includegraphics") {
      const g = group(text, i);
      if (g) {
        out += "\n[Illustration du document]\n";
        i = g.end;
      }
      continue;
    }
    if (drop.has(cmd)) {
      while (text[i] === "{") {
        const g = group(text, i)!;
        i = g.end;
      }
      continue;
    }
    if (
      [
        "newpage",
        "clearpage",
        "par",
        "hfill",
        "vfill",
        "newline",
        "linebreak",
        "smallskip",
        "medskip",
        "bigskip",
      ].includes(cmd)
    ) {
      out += "\n";
      continue;
    }
    if (cmd === "item") {
      out += "\n• ";
      continue;
    }
    if (cmd === "href") {
      const url = group(text, i);
      if (url) {
        i = url.end;
        const label = group(text, i);
        if (label) {
          out += texPlain(label.text, depth + 1) + " (" + url.text + ")";
          i = label.end;
        }
      }
      continue;
    }
    if (cmd === "frac") {
      const a = group(text, i);
      if (a) {
        i = a.end;
        const b = group(text, i);
        if (b) {
          out +=
            texPlain(a.text, depth + 1) + " / " + texPlain(b.text, depth + 1);
          i = b.end;
        }
      }
      continue;
    }
    const symbols: Record<string, string> = {
      leq: "≤",
      geq: "≥",
      neq: "≠",
      times: "×",
      cdot: "·",
      rightarrow: "→",
      leftarrow: "←",
      infty: "∞",
      alpha: "α",
      beta: "β",
      pi: "π",
      ldots: "…",
      textbackslash: "",
      LaTeX: "LaTeX",
      TeX: "TeX",
    };
    if (cmd in symbols) {
      out += symbols[cmd];
      continue;
    }
    // Formatting commands keep their balanced textual argument. Names of unknown
    // commands disappear; nothing is evaluated and external files are never read.
    const arg = group(text, i);
    if (arg) {
      out +=
        (cmd === "sqrt" ? "√(" : "") +
        texPlain(arg.text, depth + 1) +
        (cmd === "sqrt" ? ")" : "");
      i = arg.end;
    }
  }
  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/(?: · )+\n/g, "\n")
    .trim();
}
export function readableImportedContent(text: string): string {
  try {
    return /\\(?:begin|end|textbf|textit|vspace|includegraphics|noindent|rule|hspace|LARGE|section)\b/.test(
      text,
    )
      ? texPlain(text)
      : markdownPlain(text);
  } catch {
    return text
      .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, "")
      .replace(/[{}]/g, "")
      .trim();
  }
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
    const titleAt = text.match(/\\title\s*\{/);
    const title = titleAt
      ? group(text, titleAt.index! + titleAt[0].length - 1)?.text
      : undefined;
    if (title) current.title = texPlain(title);
    else {
      const centered = text.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/);
      if (centered) {
        const heading = texPlain(centered[1])
          .split("\n")
          .map((v) => v.trim())
          .find(Boolean);
        if (heading) current.title = heading;
      }
    }
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
    const body = tex
      ? section.body.join("\n").trim()
      : markdownPlain(section.body.join("\n"));
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
