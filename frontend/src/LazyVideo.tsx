import { useEffect, useRef, useState } from "react";
import { api, fileUrl, thumbUrl } from "./types";
import { useApp } from "./context";
export function LazyVideo({
  src,
  name,
  posterId,
  onPoster,
}: {
  src: string;
  name: string;
  posterId?: string;
  onPoster?: (id: string) => void;
}) {
  const [started, setStarted] = useState(false),
    video = useRef<HTMLVideoElement>(null),
    captured = useRef(false),
    app = useApp();
  useEffect(() => {
    setStarted(false);
    captured.current = false;
  }, [src]);
  useEffect(() => {
    if (started) void video.current?.play().catch(() => {});
  }, [started]);
  async function capture() {
    const el = video.current;
    if (
      !onPoster ||
      posterId ||
      captured.current ||
      !el ||
      el.currentTime < 1 ||
      !el.videoWidth
    )
      return;
    captured.current = true;
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(960 / el.videoWidth, 540 / el.videoHeight, 1);
      canvas.width = Math.max(1, Math.round(el.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(el.videoHeight * scale));
      canvas.getContext("2d")!.drawImage(el, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.8),
      );
      if (!blob) return;
      const data = new FormData();
      data.append("file", blob, "miniature-video.jpg");
      const result = await api("upload", data);
      app.uploadedFile(result.file);
      onPoster(result.file.id);
    } catch {
      /* Playback stays available even if thumbnail generation fails. */
    }
  }
  const poster = posterId ? thumbUrl(posterId) : "video-placeholder.svg";
  return started ? (
    <video
      ref={video}
      controls
      playsInline
      preload="none"
      src={src}
      poster={poster}
      onTimeUpdate={() => void capture()}
      aria-label={name || "Vidéo"}
    />
  ) : (
    <button
      type="button"
      className="video-preview"
      onClick={() => setStarted(true)}
      aria-label={`Lire la vidéo : ${name || "Vidéo"}`}
    >
      <img src={poster} alt="" loading="lazy" />
      <span className="video-play" aria-hidden="true">
        ▶
      </span>
      <span className="video-preview-label">Lire la vidéo</span>
    </button>
  );
}
