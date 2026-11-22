import { useEffect, useState } from "react";
import { api, fileUrl, type FileRecord } from "./types";
export type IdeaMedia = {
  kind: "file" | "link" | "video" | "form";
  title: string;
  fileId?: string;
  mime?: string;
  url?: string;
  src?: string;
  player?: boolean;
  token?: string;
};
export function IdeaMediaView({ items }: { items: IdeaMedia[] }) {
  return (
    <div className="mm-media-list">
      {items.map((item, i) => (
        <section key={i}>
          <strong>{item.title}</strong>
          {item.kind === "file" && item.fileId ? (
            <>
              {item.mime?.startsWith("image/") ? (
                <img
                  src={fileUrl(item.fileId)}
                  alt={item.title}
                  loading="lazy"
                />
              ) : item.mime?.startsWith("video/") ? (
                <video src={fileUrl(item.fileId)} controls preload="none" />
              ) : item.mime?.startsWith("audio/") ? (
                <audio src={fileUrl(item.fileId)} controls preload="none" />
              ) : null}
              <a
                href={fileUrl(item.fileId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ouvrir le fichier ↗
              </a>
            </>
          ) : item.kind === "video" && item.src?.startsWith("https://") ? (
            <>
              {item.player ? (
                <iframe
                  src={item.src}
                  title={item.title}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <video src={item.src} controls preload="none" />
              )}
              {item.url && /^https?:\/\//i.test(item.url) && (
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  Ouvrir la vidéo chez le fournisseur ↗
                </a>
              )}
            </>
          ) : item.kind === "form" &&
            /^[a-f0-9]{40}$/.test(item.token || "") ? (
            <>
              <iframe
                src={"index.php?form=" + item.token}
                title={item.title}
                loading="lazy"
              />
              <a
                href={"index.php?form=" + item.token}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ouvrir le formulaire ↗
              </a>
            </>
          ) : item.url && /^https?:\/\//i.test(item.url) ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              {item.url} ↗
            </a>
          ) : null}
        </section>
      ))}
    </div>
  );
}
export function IdeaMediaEditor({
  items,
  onChange,
}: {
  items: IdeaMedia[];
  onChange: (items: IdeaMedia[]) => void;
}) {
  const [files, setFiles] = useState<FileRecord[]>([]),
    [url, setUrl] = useState(""),
    [kind, setKind] = useState<"link" | "video" | "form">("link"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void api<{ files: FileRecord[] }>("files")
      .then((r) => setFiles(r.files))
      .catch(() => {});
  }, []);
  const add = (item: IdeaMedia) => {
    if (items.length >= 30) {
      setError("30 contenus maximum par idée.");
      return;
    }
    onChange([...items, item]);
  };
  async function addUrl() {
    setError("");
    setBusy(true);
    try {
      const parsed = new URL(url, location.href);
      if (!["https:", "http:"].includes(parsed.protocol))
        throw Error("Utilise une adresse HTTP ou HTTPS.");
      if (kind === "video") {
        const { video } = await api<any>("video_resolve", { url });
        add({
          kind: "video",
          title: video.title || video.label,
          url: video.url,
          src: video.src,
          player: video.kind === "player",
        });
      } else if (kind === "form") {
        const token = parsed.searchParams.get("form") || "";
        if (parsed.origin !== location.origin || !/^[a-f0-9]{40}$/.test(token))
          throw Error("Colle le lien d’un formulaire Feuillet de ce site.");
        add({ kind: "form", title: "Formulaire Feuillet", token });
      } else add({ kind: "link", title: parsed.hostname, url: parsed.href });
      setUrl("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mm-media-editor">
      <strong>Contenus de l’idée</strong>
      <p>Ils s’ouvrent dans la section en grand.</p>
      <select
        aria-label="Ajouter depuis la bibliothèque"
        value=""
        onChange={(e) => {
          const f = files.find((f) => f.id === e.target.value);
          if (f)
            add({ kind: "file", fileId: f.id, title: f.name, mime: f.mime });
        }}
      >
        <option value="">Bibliothèque : images, vidéos, documents…</option>
        {files.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <label>
        Importer un fichier
        <input
          type="file"
          aria-label="Importer un fichier dans l’idée"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            setError("");
            try {
              const body = new FormData();
              body.append("file", f);
              const result = await api<{ file: FileRecord }>("upload", body);
              add({
                kind: "file",
                fileId: result.file.id,
                title: result.file.name,
                mime: result.file.mime,
              });
              setFiles((old) => [result.file, ...old]);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <select
        aria-label="Type de contenu web"
        value={kind}
        onChange={(e) => setKind(e.target.value as typeof kind)}
      >
        <option value="link">Lien web</option>
        <option value="video">Vidéo en ligne</option>
        <option value="form">Formulaire Feuillet</option>
      </select>
      <input
        aria-label="Adresse du contenu"
        placeholder="https://…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        type="button"
        disabled={busy || !url.trim()}
        onClick={() => void addUrl()}
      >
        {busy ? "Ajout…" : "Ajouter ce contenu"}
      </button>
      {items.map((item, i) => (
        <div key={i}>
          {item.title}
          <button
            type="button"
            aria-label={"Retirer " + item.title}
            onClick={() => onChange(items.filter((_, j) => i !== j))}
          >
            ×
          </button>
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
