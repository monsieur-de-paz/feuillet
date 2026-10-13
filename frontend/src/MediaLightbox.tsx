import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink } from "lucide-react";
import "./editor-v2.css";
export type ZoomImage = { src: string; alt: string };
export function imageSource(src: string): string {
  try {
    const url = new URL(src, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function ImageLightbox({
  image,
  onClose,
}: {
  image: ZoomImage | null;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false),
    [scale, setScale] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 });
  const dialog = useRef<HTMLDivElement>(null),
    closeButton = useRef<HTMLButtonElement>(null),
    closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const drag = useRef<{
    x: number;
    y: number;
    px: number;
    py: number;
    moved: boolean;
  } | null>(null);
  const url = image ? imageSource(image.src) : "";
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    closeTimer.current = setTimeout(onClose, 170);
  };
  useEffect(() => {
    if (!image) return;
    const before = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setClosing(false);
    setScale(1);
    setPan({ x: 0, y: 0 });
    requestAnimationFrame(() => closeButton.current?.focus());
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, [image?.src]);
  useEffect(() => {
    if (!image) return;
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setScale((s) => Math.min(3, s + 0.25));
      } else if (event.key === "-") {
        event.preventDefault();
        setScale((s) => Math.max(1, s - 0.25));
      } else if (event.key === "0") {
        setScale(1);
        setPan({ x: 0, y: 0 });
      } else if (event.key === "Tab") {
        const buttons = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href]",
        );
        if (!buttons?.length) return;
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", keyboard, true);
    return () => document.removeEventListener("keydown", keyboard, true);
  }, [image?.src, closing]);
  if (!image || !url) return null;
  return createPortal(
    <div
      className={`image-lightbox ${closing ? "is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || "Image agrandie"}
      ref={dialog}
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="image-lightbox-toolbar">
        <span>{image.alt || "Image"}</span>
        <div>
          <button
            title="Réduire"
            aria-label="Réduire l’image"
            disabled={scale === 1}
            onClick={() => setScale((s) => Math.max(1, s - 0.25))}
          >
            <ZoomOut size={19} />
          </button>
          <button
            title="Agrandir"
            aria-label="Agrandir l’image"
            disabled={scale === 3}
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
          >
            <ZoomIn size={19} />
          </button>
          <button
            title="Ajuster à l’écran"
            aria-label="Ajuster à l’écran"
            onClick={() => {
              setScale(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <RotateCcw size={18} />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvrir l’original"
            aria-label="Ouvrir l’image originale"
          >
            <ExternalLink size={18} />
          </a>
          <button
            ref={closeButton}
            title="Fermer (Échap)"
            aria-label="Fermer l’image agrandie"
            onClick={requestClose}
          >
            <X size={22} />
          </button>
        </div>
      </div>
      <div
        className="image-lightbox-stage"
        onClick={(event) => {
          if (event.target === event.currentTarget) requestClose();
        }}
      >
        <img
          src={url}
          alt={image.alt}
          draggable={false}
          style={{
            transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})`,
          }}
          className={scale > 1 ? "is-zoomed" : ""}
          onPointerDown={(event) => {
            if (scale <= 1 || event.button !== 0) return;
            event.preventDefault();
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              px: pan.x,
              py: pan.y,
              moved: false,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const d = drag.current,
              dx = event.clientX - d.x,
              dy = event.clientY - d.y;
            if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
            setPan({ x: d.px + dx, y: d.py + dy });
          }}
          onPointerUp={(event) => {
            if (!drag.current) return;
            const moved = drag.current.moved;
            drag.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
            suppressClick.current = true;
            if (!moved) {
              setScale(1);
              setPan({ x: 0, y: 0 });
            }
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            if (scale === 1) setScale(1.75);
          }}
        />
      </div>
      <div className="image-lightbox-help">
        {Math.round(scale * 100)} % ·{" "}
        {scale > 1
          ? "Déplace l’image pour l’explorer"
          : "Clique sur l’image pour zoomer"}{" "}
        · Échap pour fermer
      </div>
    </div>,
    document.body,
  );
}
