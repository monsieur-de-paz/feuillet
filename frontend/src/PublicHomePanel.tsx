import { useEffect, useState } from "react";
import { Home, Pencil, ArrowUpRight } from "lucide-react";
import { api, type Page } from "./types";
import { Select } from "./Select";
type HomeState = { page_id: string | null; published: boolean };
export function PublicHomePanel({
  pages,
  onEdit,
}: {
  pages: Page[];
  onEdit: () => void;
}) {
  const [state, setState] = useState<HomeState | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    void api<HomeState>("public_home")
      .then((value) => {
        if (alive) setState(value);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  async function choose(id: string) {
    setBusy(true);
    setError("");
    try {
      setState(await api("public_home", { page_id: id || null }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="public-home-panel" aria-label="Accueil public">
      <div className="public-home-heading">
        <Home size={23} />
        <div>
          <h3>Accueil public</h3>
          <p>
            La page affichée lorsque les visiteurs ouvrent l’adresse du site.
          </p>
        </div>
      </div>
      <p>
        Rédige cet accueil avec les mêmes blocs que tes pages : textes, images,
        liens et galeries. Tu choisis les pages présentées ; les autres partages
        gardent leur propre arborescence.
      </p>
      <label>
        Page d’accueil
        <Select
          aria-label="Page d’accueil public"
          value={state?.page_id || ""}
          disabled={!state || busy}
          onChange={(event) => void choose(event.target.value)}
        >
          <option value="">Accueil simple du site</option>
          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.title} ·{" "}
              {page.visibility === "public" ? "Publique" : "Privée"}
            </option>
          ))}
        </Select>
      </label>
      <div className="public-home-actions">
        <button
          className="small-button"
          type="button"
          disabled={busy}
          onClick={onEdit}
        >
          <Pencil size={16} />
          {state?.page_id ? "Modifier l’accueil" : "Créer l’accueil"}
        </button>
        <a
          className="small-button"
          href="index.php?read=1"
          target="_blank"
          rel="noopener noreferrer"
        >
          Voir l’accueil public <ArrowUpRight size={15} />
        </a>
      </div>
      {state?.page_id && (
        <p className="muted">
          {state.published
            ? "L’accueil utilise la version publiée de cette page."
            : "Cette page reste privée pour le moment. Publie-la depuis l’éditeur pour afficher ton accueil aux visiteurs."}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
