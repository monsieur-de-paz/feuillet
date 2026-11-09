import { useEffect, useRef, useState, type FormEvent } from "react";
import { Node } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { api } from "./types";

export type VideoSource = {
  url: string;
  src: string;
  label: string;
  kind: "player" | "media";
  portrait: boolean;
};

export function OnlineVideoForm({
  url = "",
  onInsert,
}: {
  url?: string;
  onInsert: (video: VideoSource) => void;
}) {
  const [link, setLink] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const { video } = await api<{ video: VideoSource }>("video_resolve", {
        url: link,
      });
      if (mounted.current) onInsert(video);
    } catch (cause) {
      if (mounted.current) setError((cause as Error).message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <form className="modal-form embed-form" onSubmit={submit}>
      <label>
        Lien de la vidéo
        <input
          type="url"
          required
          placeholder="https://…"
          value={link}
          onChange={(event) => setLink(event.target.value)}
        />
      </label>
      <p className="muted">
        Colle un lien YouTube, Dailymotion, TikTok, Vimeo ou un lien direct vers
        un fichier vidéo HTTPS.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" disabled={busy}>
        {busy
          ? "Vérification…"
          : url
            ? "Enregistrer le lien"
            : "Insérer la vidéo"}
      </button>
    </form>
  );
}

declare global {
  interface Window {
    FeuilletMountEmbed?: (frame: HTMLIFrameElement, code: string) => () => void;
  }
}

function HtmlFrame({ code, height }: { code: string; height: number }) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (frame.current) return window.FeuilletMountEmbed?.(frame.current, code);
  }, [code]);
  return (
    <iframe
      ref={frame}
      title="Intégration externe"
      sandbox="allow-scripts allow-forms"
      allow="fullscreen"
      style={{ height }}
    />
  );
}

function httpsLink(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  try {
    const link = new URL(value);
    return link.protocol === "https:" &&
      !link.username &&
      !link.password &&
      !link.port
      ? link
      : null;
  } catch {
    return null;
  }
}

function videoPlayer(link: URL): boolean {
  switch (link.hostname) {
    case "www.youtube-nocookie.com":
      return /^\/embed\/[A-Za-z0-9_-]{11}$/.test(link.pathname);
    case "player.vimeo.com":
      return /^\/video\/[0-9]{1,15}$/.test(link.pathname);
    case "geo.dailymotion.com":
      return /^\/player\/[a-z0-9]{2,30}\.html$/.test(link.pathname);
    case "www.tiktok.com":
      return /^\/player\/v1\/[0-9]{10,25}$/.test(link.pathname);
    default:
      return false;
  }
}

function ExternalEmbedView({ node, editor, updateAttributes }: NodeViewProps) {
  const isHtml = node.type.name === "htmlEmbed";
  const { code, height, url, src, kind, label, portrait } = node.attrs;
  const [editing, setEditing] = useState(
    editor.isEditable && (isHtml ? !code : !url),
  );
  const [loaded, setLoaded] = useState(false);
  const safeUrl = httpsLink(url);
  const source = httpsLink(src);
  const safeSrc =
    source &&
    (kind === "media" ? source.href === safeUrl?.href : videoPlayer(source))
      ? source.href
      : "";
  const [html, setHtml] = useState(code ?? "");
  const [frameHeight, setFrameHeight] = useState(height ?? 450);
  const [error, setError] = useState("");
  useEffect(() => setLoaded(false), [src, code, height]);

  function saveHtml(event: FormEvent) {
    event.preventDefault();
    if (new TextEncoder().encode(html).length > 32000) {
      setError("Le code d’intégration doit faire au maximum 32 Ko.");
      return;
    }
    updateAttributes({ code: html.trim(), height: Number(frameHeight) });
    setEditing(false);
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={`external-embed ${isHtml ? "" : "external-video"} ${portrait ? "portrait-video" : ""}`}
    >
      {editing && isHtml ? (
        <form className="modal-form embed-form" onSubmit={saveHtml}>
          <label>
            Code d’intégration HTML
            <textarea
              required
              rows={5}
              value={html}
              maxLength={32000}
              placeholder={'<iframe src="https://…"></iframe>'}
              onChange={(event) => setHtml(event.target.value)}
              spellCheck={false}
            />
          </label>
          <label>
            Hauteur de l’intégration (px)
            <input
              type="number"
              required
              min={200}
              max={1200}
              value={frameHeight}
              onChange={(event) => setFrameHeight(event.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button">Enregistrer l’intégration</button>
        </form>
      ) : editing ? (
        <OnlineVideoForm
          url={url}
          onInsert={(video) => {
            updateAttributes(video);
            setEditing(false);
          }}
        />
      ) : (
        (isHtml ? code : safeSrc) && (
          <>
            {!loaded ? (
              <button
                type="button"
                className="external-embed-trigger"
                onClick={() => setLoaded(true)}
              >
                {isHtml ? "Afficher l’intégration" : `▶ Lire sur ${label}`}
              </button>
            ) : isHtml ? (
              <HtmlFrame code={code} height={Number(height)} />
            ) : kind === "media" ? (
              <video
                controls
                autoPlay
                playsInline
                preload="none"
                src={safeSrc}
                aria-label={label}
              />
            ) : (
              <iframe
                title={`Vidéo · ${label}`}
                src={safeSrc}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              />
            )}
            {safeUrl && (
              <a href={safeUrl.href} target="_blank" rel="noopener noreferrer">
                Ouvrir la vidéo ↗
              </a>
            )}
          </>
        )
      )}
      {editor.isEditable && (editing ? Boolean(isHtml ? code : url) : true) && (
        <button
          type="button"
          className="small-button"
          onClick={() => {
            setHtml(code ?? "");
            setFrameHeight(height ?? 450);
            setError("");
            setEditing(!editing);
          }}
        >
          {editing
            ? "Annuler"
            : isHtml
              ? "Modifier le code"
              : "Modifier le lien"}
        </button>
      )}
    </NodeViewWrapper>
  );
}

export const WebVideo = Node.create({
  name: "webVideo",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      url: { default: "" },
      src: { default: "" },
      kind: { default: "player" },
      label: { default: "Vidéo en ligne" },
      portrait: { default: false },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ExternalEmbedView);
  },
  parseHTML() {
    return [{ tag: "div[data-feuillet-video]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-feuillet-video": "" }];
  },
});

export const HtmlEmbed = Node.create({
  name: "htmlEmbed",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      code: { default: "" },
      height: { default: 450 },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ExternalEmbedView);
  },
  parseHTML() {
    return [{ tag: "div[data-feuillet-embed]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-feuillet-embed": "" }];
  },
});
