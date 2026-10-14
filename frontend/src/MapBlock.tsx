import { Node, mergeAttributes, type NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { MapPin, ExternalLink, Pencil } from "lucide-react";
import { useState } from "react";
import { useApp } from "./context";
export function mapEmbed(value: string): string {
  const source = value.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || value;
  if (!source) return "";
  try {
    const url = new URL(source);
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      ["www.google.com", "maps.google.com"].includes(url.hostname) &&
      url.pathname === "/maps/embed" &&
      !!url.searchParams.get("pb") &&
      !Array.from(url.searchParams.keys()).some((key) =>
        ["key", "api_key", "signature", "token"].includes(key.toLowerCase()),
      )
      ? url.href
      : "";
  } catch {
    return "";
  }
}
function MapView({ node, updateAttributes }: NodeViewProps) {
  const { admin } = useApp();
  const [editing, setEditing] = useState(!node.attrs.address),
    [address, setAddress] = useState(node.attrs.address || ""),
    [embed, setEmbed] = useState(node.attrs.embedUrl || ""),
    [error, setError] = useState("");
  const query = String(node.attrs.address || "");
  const href =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(query);
  const src =
    mapEmbed(node.attrs.embedUrl || "") ||
    (query
      ? "https://maps.google.com/maps?q=" +
        encodeURIComponent(query) +
        "&z=14&output=embed"
      : "");
  return (
    <NodeViewWrapper className="map-block" contentEditable={false}>
      {admin && editing ? (
        <form
          className="map-editor"
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = mapEmbed(embed);
            if (embed && !parsed) {
              setError(
                "Colle le lien ou le code « Intégrer une carte » de Google Maps.",
              );
              return;
            }
            if (!address.trim()) return;
            updateAttributes({
              address: address.trim().slice(0, 500),
              embedUrl: parsed,
            });
            setEditing(false);
            setError("");
          }}
        >
          <label>
            Adresse ou lieu
            <input
              aria-label="Adresse ou lieu"
              value={address}
              maxLength={500}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Ex. : Toulouse, place du Capitole"
              autoFocus
            />
          </label>
          <label>
            Intégration Google Maps (facultatif)
            <input
              aria-label="Lien d’intégration Google Maps"
              value={embed}
              onChange={(event) => setEmbed(event.target.value)}
              placeholder="Lien ou code fourni par Partager → Intégrer une carte"
              maxLength={6000}
            />
          </label>
          <div className="map-editor-actions">
            <button
              type="submit"
              className="small-button"
              disabled={!address.trim()}
            >
              Enregistrer le lieu
            </button>
            {query && (
              <button
                type="button"
                className="small-button"
                onClick={() => setEditing(false)}
              >
                Annuler
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </form>
      ) : (
        <>
          <header>
            <MapPin size={18} />
            <strong>{query || "Lieu à renseigner"}</strong>
            {admin && (
              <button
                aria-label="Modifier ce lieu"
                onClick={() => {
                  setAddress(query);
                  setEmbed(node.attrs.embedUrl || "");
                  setEditing(true);
                }}
              >
                <Pencil size={15} />
              </button>
            )}
          </header>
          {src && (
            <iframe
              title={"Carte : " + query}
              src={src}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          )}
          {query && (
            <a href={href} target="_blank" rel="noopener noreferrer">
              Ouvrir dans Google Maps <ExternalLink size={13} />
            </a>
          )}
        </>
      )}
    </NodeViewWrapper>
  );
}
export const MapBlock = Node.create({
  name: "mapBlock",
  group: "block",
  atom: true,
  addAttributes() {
    return { address: { default: "" }, embedUrl: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "div[data-map-block]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-map-block": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MapView);
  },
});
