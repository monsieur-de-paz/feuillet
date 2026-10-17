import { jsPDF } from "jspdf";
import {
  type Page,
  type Doc,
  type Appearance,
  type Attribution,
  type FileRecord,
  api,
  fileUrl,
  pageUrl,
} from "./types";

import {
  databaseViewRows,
  normalizeDatabaseView,
  type DatabaseBundle,
} from "./database-types";

let fontCache: Promise<[string, string, string, string]> | null = null;
function bytes64(bytes: Uint8Array) {
  let value = "";
  for (let offset = 0; offset < bytes.length; offset += 8192)
    value += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(value);
}
async function fonts(): Promise<[string, string, string, string]> {
  if (!fontCache)
    fontCache = Promise.all(
      [
        "fonts/NotoSans.ttf",
        "fonts/NotoSans-Bold.ttf",
        "fonts/NotoSans-Italic.ttf",
        "fonts/NotoSans-BoldItalic.ttf",
      ].map(async (url) => {
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(
            "Les polices PDF sont indisponibles. Vérifie que le dossier fonts est présent sur le serveur.",
          );
        return bytes64(new Uint8Array(await response.arrayBuffer()));
      }),
    ) as Promise<[string, string, string, string]>;
  try {
    return await fontCache;
  } catch (error) {
    fontCache = null;
    throw error;
  }
}
const textOf = (n: Doc): string =>
  n.type === "hardBreak"
    ? "\n"
    : n.text || (n.content || []).map(textOf).join("");
// Les emojis n'ont pas de glyphe dans Noto Sans : éviter les carrés vides dans le PDF.
const printable = (text: string) =>
  text.replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu, "");
export async function exportPdf(
  page: Page,
  appearance: Appearance,
  pages: Page[] = [],
) {
  const [regular, bold, italic, bolditalic] = await fonts();
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  pdf.addFileToVFS("NotoSans.ttf", regular);
  pdf.addFont("NotoSans.ttf", "NotoSans", "normal");
  pdf.addFileToVFS("NotoSans-Bold.ttf", bold);
  pdf.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
  pdf.addFileToVFS("NotoSans-Italic.ttf", italic);
  pdf.addFont("NotoSans-Italic.ttf", "NotoSans", "italic");
  pdf.addFileToVFS("NotoSans-BoldItalic.ttf", bolditalic);
  pdf.addFont("NotoSans-BoldItalic.ttf", "NotoSans", "bolditalic");
  const margin = 18,
    width = 174,
    bottom = 276;
  let y = margin;
  const color = /^#[0-9a-f]{6}$/i.test(appearance.text)
    ? appearance.text
    : "#37352f";
  function background() {
    if (/^#[0-9a-f]{6}$/i.test(appearance.background)) {
      pdf.setFillColor(appearance.background);
      pdf.rect(0, 0, 210, 297, "F");
    }
  }
  background();
  function newPage() {
    pdf.addPage();
    background();
    y = margin;
  }
  function ensure(height: number) {
    if (y + height > bottom) newPage();
  }
  function line(text: string, size = 10, strong = false, indent = 0) {
    pdf.setFont("NotoSans", strong ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(color);
    const height = size * 0.45 + 1;
    const wrapped = pdf.splitTextToSize(
      printable(text),
      width - indent,
    ) as string[];
    for (const value of wrapped) {
      ensure(height);
      pdf.text(value, margin + indent, y + height * 0.8);
      y += height;
    }
    y += 2;
  }
  function rich(n: Doc, size = 10, strong = false, indent = 0, prefix = "") {
    type Run = { text: string; marks: any[] };
    const runs: Run[] = [];
    function flatten(item: Doc) {
      if (item.type === "hardBreak") runs.push({ text: "\n", marks: [] });
      else if (item.text)
        runs.push({ text: item.text, marks: item.marks || [] });
      else for (const child of item.content || []) flatten(child);
    }
    if (prefix) runs.push({ text: prefix, marks: [] });
    flatten(n);
    const height = size * 0.45 + 1,
      start = margin + indent;
    let x = start;
    for (const run of runs) {
      const m = run.marks;
      const isBold = strong || m.some((mark) => mark.type === "bold"),
        isItalic = m.some((mark) => mark.type === "italic");
      const font = isItalic
        ? isBold
          ? "bolditalic"
          : "italic"
        : isBold
          ? "bold"
          : "normal";
      const ink = m.find((mark) => mark.type === "textStyle")?.attrs?.color;
      const highlight = m.find((mark) => mark.type === "highlight");
      const href = m.find((mark) => mark.type === "link")?.attrs?.href;
      pdf.setFont("NotoSans", font);
      pdf.setFontSize(size);
      for (const token of printable(run.text).split(/(\n|[ \t]+)/)) {
        if (!token) continue;
        if (token === "\n") {
          y += height;
          x = start;
          continue;
        }
        const blank = /^[ \t]+$/.test(token);
        if (blank && x === start) continue;
        // Split exceptionally long words/URLs so they cannot run outside the paper.
        const pieces = pdf.splitTextToSize(token, width - indent) as string[];
        for (const piece of pieces) {
          const tokenWidth = pdf.getTextWidth(piece);
          if (x + tokenWidth > margin + width && x > start) {
            y += height;
            x = start;
            if (blank) continue;
          }
          const before = y;
          ensure(height);
          if (y !== before) x = start;
          if (highlight) {
            const fill = highlight.attrs?.color;
            pdf.setFillColor(
              /^#[0-9a-f]{6}$/i.test(fill || "") ? fill : "#fff1ba",
            );
            pdf.rect(x, y, tokenWidth, height, "F");
          }
          pdf.setTextColor(/^#[0-9a-f]{6}$/i.test(ink || "") ? ink : color);
          pdf.text(piece, x, y + height * 0.8);
          if (
            m.some((mark) => mark.type === "underline" || mark.type === "link")
          ) {
            pdf.setDrawColor(/^#[0-9a-f]{6}$/i.test(ink || "") ? ink : color);
            pdf.line(x, y + height * 0.9, x + tokenWidth, y + height * 0.9);
          }
          if (m.some((mark) => mark.type === "strike")) {
            pdf.setDrawColor(color);
            pdf.line(x, y + height * 0.5, x + tokenWidth, y + height * 0.5);
          }
          if (href && /^https?:\/\//.test(href))
            pdf.link(x, y, tokenWidth, height, { url: href });
          x += tokenWidth;
        }
      }
    }
    y += height + 2;
  }
  const metadata = new Map<string, Promise<FileRecord | null>>();
  async function fileMetadata(id: string): Promise<FileRecord | null> {
    if (!id) return null;
    if (!metadata.has(id))
      metadata.set(
        id,
        api("file_info", undefined, { id })
          .then((result) => result.file as FileRecord)
          .catch(() => null),
      );
    return metadata.get(id)!;
  }
  function credit(value?: Attribution | null) {
    if (!value) return;
    line(
      [value.author || value.source_name || "Wikimedia Commons", value.license]
        .filter(Boolean)
        .join(" · "),
      8,
    );
    if (value.source_url)
      rich(
        {
          type: "text",
          text: value.source_url,
          marks: [{ type: "link", attrs: { href: value.source_url } }],
        },
        8,
      );
    if (value.license_url && value.license_url !== value.source_url)
      rich(
        {
          type: "text",
          text: "Licence : " + value.license_url,
          marks: [{ type: "link", attrs: { href: value.license_url } }],
        },
        8,
      );
  }
  async function image(
    url: string,
    alt: string,
    maxHeight = 90,
    attribution?: Attribution | null,
    widthPercent = 100,
    alignment = "left",
    cropPosition?: { x: number; y: number },
  ) {
    if (!url || !url.startsWith("media.php?")) {
      if (alt) line(`Image : ${alt}`);
      credit(attribution);
      return;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("image inaccessible");
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1400 / bitmap.width);
      canvas.width = Math.round(bitmap.width * scale);
      if (cropPosition)
        canvas.height = Math.round((canvas.width * maxHeight) / width);

      if (!cropPosition) canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas indisponible");
      context.fillStyle = /^#[0-9a-f]{6}$/i.test(appearance.background)
        ? appearance.background
        : "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (cropPosition) {
        const zoom = Math.max(
          canvas.width / bitmap.width,
          canvas.height / bitmap.height,
        );
        const sw = canvas.width / zoom,
          sh = canvas.height / zoom;
        const sx =
          ((bitmap.width - sw) * Math.max(0, Math.min(100, cropPosition.x))) /
          100;
        const sy =
          ((bitmap.height - sh) * Math.max(0, Math.min(100, cropPosition.y))) /
          100;
        context.drawImage(
          bitmap,
          sx,
          sy,
          sw,
          sh,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      } else context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      let w =
          (width * Math.max(10, Math.min(100, Number(widthPercent) || 100))) /
          100,
        h = (w * canvas.height) / canvas.width;
      if (h > maxHeight) {
        h = maxHeight;
        w = (h * canvas.width) / canvas.height;
      }
      ensure(h + 6);
      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.86),
        "JPEG",
        margin +
          (alignment === "right"
            ? width - w
            : alignment === "center"
              ? (width - w) / 2
              : 0),
        y,
        w,
        h,
      );
      y += h + 6;
      if (alt) line(alt, 8);
    } catch {
      line(alt ? `Image : ${alt}` : "Image (voir la page en ligne)", 9);
    }
    credit(attribution);
  }
  async function node(n: Doc, indent = 0) {
    const a = n.attrs || {},
      c = n.content || [];
    switch (n.type) {
      case "paragraph":
        if (textOf(n)) rich(n, 10, false, indent);
        else y += 3;
        break;
      case "heading":
        ensure(18);
        y += 3;
        rich(
          n,
          [20, 16, 13][Math.max(0, Math.min(2, Number(a.level || 1) - 1))],
          true,
          indent,
        );
        break;
      case "horizontalRule":
        ensure(6);
        pdf.setDrawColor(190);
        pdf.line(margin, y, width + margin, y);
        y += 6;
        break;
      case "bulletList":
      case "orderedList":
      case "taskList":
        for (let i = 0; i < c.length; i++) {
          const item = c[i],
            prefix =
              n.type === "orderedList"
                ? `${i + Number(a.start || 1)}. `
                : n.type === "taskList"
                  ? item.attrs?.checked
                    ? "[x] "
                    : "[ ] "
                  : "• ";
          const [first, ...rest] = item.content || [];
          if (first) rich(first, 10, false, Math.min(indent + 3, 60), prefix);
          for (const child of rest) await node(child, Math.min(indent + 7, 60));
        }
        break;
      case "codeBlock":
        line(textOf(n), 9, false, indent + 3);
        break;
      case "blockquote":
      case "callout":
        line(n.type === "callout" ? "À retenir" : "Citation", 9, true, indent);
        for (const item of c) await node(item, indent + 5);
        break;
      case "mapBlock":
        line("Lieu : " + (a.address || ""), 10, true, indent);
        line(
          "https://www.google.com/maps/search/?api=1&query=" +
            encodeURIComponent(a.address || ""),
          9,
          false,
          indent,
        );
        break;
      case "toggleHeading":
        for (const item of c) await node(item, indent);
        break;
      case "details":
        if (a.summary || a.title) line(a.summary || a.title, 11, true, indent);
        for (const item of c) await node(item, indent);
        break;
      case "image": {
        const file = await fileMetadata(String(a.fileId || ""));
        await image(
          a.fileId ? fileUrl(a.fileId) : a.src,
          a.alt || a.title || file?.name || "",
          160,
          file?.attribution || a.attribution,
          a.width || 100,
          a.align || "center",
        );
        break;
      }
      case "fileBlock": {
        const file = await fileMetadata(String(a.fileId || ""));
        line(
          `Pièce jointe : ${file?.name || a.name || "Fichier"}`,
          10,
          true,
          indent,
        );
        rich(
          {
            type: "text",
            text: new URL(fileUrl(a.fileId, true), location.href).href,
            marks: [
              {
                type: "link",
                attrs: {
                  href: new URL(fileUrl(a.fileId, true), location.href).href,
                },
              },
            ],
          },
          8,
          false,
          indent,
        );
        credit(file?.attribution);
        break;
      }
      case "bookmark":
      case "buttonLink":
        line(a.title || a.label || "Ressource", 11, true, indent);
        if (a.description) line(a.description, 10, false, indent);
        if (a.href) line(a.href, 8, false, indent);
        break;
      case "pageLink":
        line(
          pages.find((p) => String(p.id) === String(a.pageId))?.title ||
            a.label ||
            "Sous-page",
          11,
          true,
          indent,
        );
        line(new URL(pageUrl(a.pageId), location.href).href, 8, false, indent);
        break;
      case "gallery": {
        line(a.title || "Collection", 12, true, indent);
        const selected: Page[] = a.manual
          ? (a.pageIds || [])
              .map((id: string) =>
                pages.find((p) => String(p.id) === String(id)),
              )
              .filter(Boolean)
          : pages.filter(
              (p) =>
                String(p.id) !== String(page.id) &&
                (!a.parentId || String(p.parent_id) === String(a.parentId)) &&
                (!a.kind || p.kind === a.kind),
            );
        for (const card of selected) {
          line(card.title || "Sans titre", 11, true, indent);
          if (card.description) line(card.description, 10, false, indent);
          line(new URL(pageUrl(card.id), location.href).href, 8, false, indent);
        }
        if (!selected.length) line("Collection vide", 9, false, indent);
        break;
      }
      case "databaseView": {
        try {
          const bundle = await api<DatabaseBundle>("db_get", undefined, {
            id: String(a.dbId),
          });
          const view = normalizeDatabaseView(a.viewConfig, bundle.properties);
          const rows = databaseViewRows(
            bundle,
            view,
            "",
            bundle.relation_labels || {},
          );
          line(bundle.database.name || "Base de données", 12, true, indent);
          const properties = bundle.properties.filter(
            (p) => p.type === "title" || !view.hiddenPropertyIds.includes(p.id),
          );
          const attachedFiles = new Map<string, FileRecord>(
            (bundle.files || []).map((file: FileRecord) => [file.id, file]),
          );
          const relations = new Map<string, any>();
          for (const row of rows) {
            for (const property of properties) {
              let value =
                row.derived?.[property.id] ?? row.values?.[property.id];
              if (property.type === "files" && Array.isArray(value))
                value = value.map(
                  (id: string) => attachedFiles.get(id)?.name || "Fichier",
                );
              if (
                property.type === "relation" &&
                Array.isArray(value) &&
                property.config.target_db_id
              ) {
                const targetId = property.config.target_db_id;
                if (!relations.has(targetId))
                  relations.set(
                    targetId,
                    await api("db_get", undefined, { id: targetId }),
                  );
                const target = relations.get(targetId);
                const title =
                  target.properties.find((p: any) => p.type === "title") ||
                  target.properties.find((p: any) => p.type === "text");
                value = value.map((id: string) => {
                  const related = target.rows.find((r: any) => r.id === id);
                  return related && title
                    ? related.values[title.id] || "Sans titre"
                    : "Fiche";
                });
              }
              if (row.errors?.[property.id]) value = "Calcul indisponible";
              const display = Array.isArray(value)
                ? value.join(", ")
                : value === true
                  ? "Oui"
                  : value === false
                    ? "Non"
                    : String(value ?? "—");
              line(property.name + ": " + display, 9, false, indent);
            }
            y += 3;
          }
          if (!rows.length)
            line("Aucune fiche dans cette vue", 9, false, indent);
        } catch {
          line("Base de données (voir la page en ligne)", 10, true, indent);
        }
        break;
      }
      case "formView": {
        try {
          const bundle = await api("form_get", undefined, {
            id: String(a.formId),
          });
          line(bundle.form.name || "Formulaire", 12, true, indent);
          line(
            new URL("index.php?form=" + bundle.form.token, location.href).href,
            8,
            false,
            indent,
          );
          for (const p of bundle.properties)
            line(p.name + (p.required ? " *" : ""), 10, false, indent);
        } catch {
          line("Formulaire (voir la page en ligne)", 10, true, indent);
        }
        break;
      }
      case "quiz":
        line(a.title || "Quiz", 13, true, indent);
        for (const q of a.questions || []) {
          line(q.prompt || q.question || "Question", 11, true, indent);
          for (const option of q.options || [])
            line("□ " + option, 10, false, indent + 4);
          if (q.type === "short") {
            ensure(12);
            y += 10;
          }
        }
        break;
      case "table": {
        pdf.setTextColor(color);
        const count = Math.max(
            1,
            ...c.map((row) => (row.content || []).length),
          ),
          cellWidth = width / count;
        for (let i = 0; i < c.length; i++) {
          const cells = c[i].content || [];
          pdf.setFont("NotoSans", i === 0 ? "bold" : "normal");
          pdf.setFontSize(9);
          const texts = cells.map(
            (cell) =>
              pdf.splitTextToSize(
                printable(textOf(cell)),
                cellWidth - 4,
              ) as string[],
          );
          const height = Math.max(8, ...texts.map((t) => t.length * 4.5 + 4));
          // Very tall cells flow as paragraphs rather than clipping a whole page.
          if (height > bottom - margin) {
            for (let j = 0; j < texts.length; j++)
              line(textOf(cells[j]), 9, i === 0);
            continue;
          }
          ensure(height);
          pdf.setDrawColor(190);
          for (let j = 0; j < count; j++) {
            pdf.rect(margin + j * cellWidth, y, cellWidth, height);
            pdf.text(texts[j] || [], margin + j * cellWidth + 2, y + 5, {
              lineHeightFactor: 1.35,
            });
          }
          y += height;
        }
        y += 5;
        break;
      }
      default:
        for (const item of c) await node(item, indent);
    }
  }
  pdf.setProperties({
    title: page.title || "Sans titre",
    creator: "Feuillet",
    subject: "Export du carnet",
  });
  if (page.cover_id) {
    const file = await fileMetadata(page.cover_id);
    await image(
      fileUrl(page.cover_id),
      "",
      55,
      file?.attribution || page.cover_attribution,
      100,
      "left",
      page.cover_position || { x: 50, y: 50 },
    );
  }
  if (page.icon_id) {
    const file = await fileMetadata(page.icon_id);
    await image(
      fileUrl(page.icon_id),
      "",
      16,
      file?.attribution || page.icon_attribution,
    );
  }
  line(page.title || "Sans titre", 23, true);
  if (page.description) line(page.description, 11);
  await node(page.content || { type: "doc", content: [] });
  const count = pdf.getNumberOfPages();
  for (let i = 1; i <= count; i++) {
    pdf.setPage(i);
    pdf.setFont("NotoSans", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`${i} / ${count}`, 192, 288, { align: "right" });
    pdf.text("Feuillet", 18, 288);
  }
  const filename = (page.title || "page")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .slice(0, 100);
  return { blob: pdf.output("blob"), filename: filename + ".pdf" };
}
