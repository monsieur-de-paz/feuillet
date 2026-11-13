import { useEffect, useId, useMemo, useState } from "react";
import { Plus, Video, Search, RefreshCw, LoaderCircle } from "lucide-react";
import { api } from "./types";
import { searchLabel } from "./interface-geometry";
import type { VideoSource } from "./ExternalEmbed";
import "./online-video-library.css";

type SavedVideo = VideoSource & {
  id: string;
  title: string;
  pages: { id: string; title: string }[];
};
type VideoInventory = { videos: SavedVideo[]; truncated: boolean };

export function OnlineVideoLibrary({
  onInsert,
  disabled = false,
}: {
  onInsert: (video: VideoSource) => void;
  disabled?: boolean;
}) {
  const titleId = useId();
  const [data, setData] = useState<VideoInventory | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(24);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api<VideoInventory>("library_videos", undefined, {}, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Liste indisponible.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  const filtered = useMemo(() => {
    const term = searchLabel(query.trim());
    return (data?.videos || []).filter(
      (video) =>
        !term ||
        searchLabel(
          [
            video.title,
            video.label,
            video.url,
            ...video.pages.map((page) => page.title),
          ].join(" "),
        ).includes(term),
    );
  }, [data, query]);

  return (
    <section className="saved-videos" aria-labelledby={titleId}>
      <header className="saved-videos-heading">
        <div>
          <h3 id={titleId}>Vidéos déjà utilisées</h3>
          <p>Retrouve les vidéos de tes pages et réinsère-les en un clic.</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Actualiser les vidéos déjà utilisées"
          title="Actualiser la liste"
          disabled={loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          {loading ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <RefreshCw size={17} />
          )}
        </button>
      </header>
      <label className="saved-videos-search">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          aria-label="Rechercher une vidéo déjà utilisée"
          placeholder="Titre, service, URL ou page…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(24);
          }}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}{" "}
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
          >
            Réessayer
          </button>
        </p>
      )}
      {loading && !data && (
        <p className="saved-videos-state" role="status">
          Recherche dans tes pages…
        </p>
      )}
      {!loading && !error && !data?.videos.length && (
        <p className="saved-videos-state">
          Aucune vidéo en ligne pour l’instant. Colle un lien ci-dessus ; la
          vidéo apparaîtra ici une fois la page enregistrée.
        </p>
      )}
      {data && data.videos.length > 0 && (
        <>
          <p className="saved-videos-count" role="status">
            {filtered.length} vidéo{filtered.length > 1 ? "s" : ""}
            {query
              ? " trouvée" + (filtered.length > 1 ? "s" : "")
              : " dans tes pages"}
          </p>
          <div className="saved-videos-grid" aria-busy={loading}>
            {filtered.slice(0, limit).map((video) => (
              <button
                type="button"
                className="saved-video-card"
                key={video.id}
                disabled={disabled}
                aria-label={`Insérer la vidéo ${video.title}`}
                onClick={() => {
                  const { url, src, label, kind, portrait, title } = video;
                  onInsert({ url, src, label, kind, portrait, title });
                }}
              >
                <span className="saved-video-symbol" aria-hidden="true">
                  <Video size={22} />
                </span>
                <span className="saved-video-info">
                  <span className="saved-video-provider">{video.label}</span>
                  <strong title={video.title}>{video.title}</strong>
                  <span className="saved-video-url" title={video.url}>
                    {video.url}
                  </span>
                  <span
                    className="saved-video-pages"
                    title={video.pages.map((page) => page.title).join(" · ")}
                  >
                    {video.pages.length} page{video.pages.length > 1 ? "s" : ""}{" "}
                    · {video.pages[0]?.title}
                  </span>
                </span>
                <span className="saved-video-add" aria-hidden="true">
                  <Plus size={17} />
                </span>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <p className="saved-videos-state">
              Aucune vidéo ne correspond à cette recherche.
            </p>
          )}
          {filtered.length > limit && (
            <button
              type="button"
              className="small-button saved-videos-more"
              onClick={() => setLimit((value) => value + 24)}
            >
              Afficher plus de vidéos
            </button>
          )}
          {data.truncated && (
            <p className="muted">
              Les 1 000 premières vidéos distinctes sont affichées, en
              parcourant les pages les plus récemment modifiées.
            </p>
          )}
        </>
      )}
    </section>
  );
}
