import { useRef, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { publicPageLink, requestNativeShare } from "./public-sharing";
export function PublicLinkSharing({ id }: { id: string }) {
  const url = publicPageLink(id, location.href);
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  async function copy(fallback = false) {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setMessage(
        fallback
          ? "Le lien est copié. Partage-le depuis l’application de ton choix."
          : "Le lien public a été copié.",
      );
    } catch {
      input.current?.focus();
      input.current?.select();
      setMessage(
        "Le lien est sélectionné : copie-le avec le menu de ton appareil ou Ctrl/Cmd + C.",
      );
    }
  }
  async function share() {
    setSharing(true);
    setMessage("");
    try {
      const result = await requestNativeShare(url, navigator);
      if (result === "copy") await copy(true);
    } finally {
      setSharing(false);
    }
  }
  return (
    <section
      className="public-link-sharing"
      aria-label="Partager le lien public"
    >
      <label>
        Lien public de la page
        <input
          ref={input}
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      <div className="public-link-actions">
        <button className="small-button" onClick={() => void copy()}>
          <Copy size={16} />
          Copier le lien
        </button>
        <button
          className="small-button"
          disabled={sharing}
          onClick={() => void share()}
        >
          <Share2 size={16} />
          Partager…
        </button>
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
