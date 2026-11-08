import { useRef, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { publicPageLink, requestNativeShare } from "./public-sharing";
import { api } from "./types";

export function PublicLinkSharing({
  pageId,
  slug,
  path,
  privatePage,
  onPathChange,
}: {
  pageId: string;
  slug: string;
  path: string | null;
  privatePage: boolean;
  onPathChange: (path: string | null) => void;
}) {
  const url = publicPageLink(
    privatePage ? pageId : slug || pageId,
    location.href,
    path,
    privatePage,
  );
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const [address, setAddress] = useState(path ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveAddress(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ path: string | null }>("save_share_path", {
        id: pageId,
        path: address,
      });
      onPathChange(result.path);
      setAddress(result.path ?? "");
      setMessage(
        result.path ? "Adresse enregistrée." : "Lien par défaut rétabli.",
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function copy(fallback = false) {
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setMessage(
        fallback
          ? "Le lien est copié. Partage-le depuis l’application de ton choix."
          : "Le lien a été copié.",
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
    <section className="public-link-sharing" aria-label="Adresse de partage">
      <form className="share-address-form" onSubmit={saveAddress}>
        <label>
          Adresse personnalisée
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="ex. bessieres"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={65}
            disabled={saving}
            aria-describedby="share-address-help"
          />
        </label>
        <button
          className="small-button"
          disabled={saving || address === (path ?? "")}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <p id="share-address-help" className="muted">
          Lettres sans accent, chiffres et tirets. Vide le champ pour rétablir
          le lien par défaut. Les adresses déjà partagées restent valides.
        </p>
      </form>
      {error && (
        <p role="alert" className="muted">
          {error}
        </p>
      )}
      <label>
        {privatePage
          ? "Lien privé · connexion requise"
          : "Lien public de la page"}
        <input
          ref={input}
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      <div className="public-link-actions">
        <button
          className="small-button"
          disabled={saving}
          onClick={() => void copy()}
        >
          <Copy size={16} />
          Copier le lien
        </button>
        <button
          className="small-button"
          disabled={sharing || saving}
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
