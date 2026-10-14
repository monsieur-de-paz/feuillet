import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  clampSidebarWidth,
  sidebarMax,
  SIDEBAR_MIN,
  storedSidebarWidth,
} from "./sidebar-width";
const key = "feuillet.sidebar-width";
function readWidth() {
  try {
    return storedSidebarWidth(localStorage.getItem(key));
  } catch {
    return null;
  }
}
export function SidebarResizer() {
  const ref = useRef<HTMLDivElement>(null);
  const [preferred, setPreferred] = useState<number | null>(readWidth);
  const [viewport, setViewport] = useState(() => window.innerWidth);
  const [live, setLive] = useState(260);
  const drag = useRef<{
    pointer: number;
    startX: number;
    startWidth: number;
  } | null>(null);
  const current = useRef(260);
  const host = () => ref.current?.closest<HTMLElement>(".app-shell");
  function show(width: number) {
    const next = clampSidebarWidth(width, window.innerWidth);
    host()?.style.setProperty("--sidebar", `${next}px`);
    current.current = next;
    setLive(next);
    return next;
  }
  function cancelDrag() {
    const start = drag.current;
    drag.current = null;
    document.body.classList.remove("sidebar-resizing");
    if (start) show(start.startWidth);
  }
  useLayoutEffect(() => {
    const shell = host();
    if (!shell) return;
    if (preferred === null) {
      shell.style.removeProperty("--sidebar");
      const width =
        shell.querySelector(".sidebar")?.getBoundingClientRect().width || 260;
      current.current = width;
      setLive(width);
    } else show(preferred);
  }, [preferred, viewport]);
  useEffect(() => {
    try {
      if (preferred === null) localStorage.removeItem(key);
      else localStorage.setItem(key, String(preferred));
    } catch {}
  }, [preferred]);
  useEffect(() => {
    const shell = host();
    const resized = () => {
      if (drag.current) {
        drag.current = null;
        document.body.classList.remove("sidebar-resizing");
      }
      setViewport(window.innerWidth);
    };
    const synced = (event: StorageEvent) => {
      if (event.key === key) setPreferred(storedSidebarWidth(event.newValue));
    };
    window.addEventListener("blur", cancelDrag);
    window.addEventListener("resize", resized);
    window.addEventListener("storage", synced);
    return () => {
      window.removeEventListener("blur", cancelDrag);
      window.removeEventListener("resize", resized);
      window.removeEventListener("storage", synced);
      shell?.style.removeProperty("--sidebar");
      document.body.classList.remove("sidebar-resizing");
    };
  }, []);
  function reset() {
    setPreferred(null);
    const shell = host();
    shell?.style.removeProperty("--sidebar");
    const width =
      shell?.querySelector(".sidebar")?.getBoundingClientRect().width || 260;
    current.current = width;
    setLive(width);
  }
  return (
    <div
      ref={ref}
      className="sidebar-resize-handle"
      role="separator"
      aria-label="Redimensionner la navigation"
      aria-orientation="vertical"
      aria-valuemin={SIDEBAR_MIN}
      aria-valuemax={sidebarMax(viewport)}
      aria-valuenow={Math.round(live)}
      aria-valuetext={`${Math.round(live)} pixels`}
      tabIndex={0}
      title="Glisser pour régler la largeur · ← / → au clavier · Double-clic ou Entrée pour rétablir"
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDoubleClick={reset}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          pointer: event.pointerId,
          startX: event.clientX,
          startWidth: current.current,
        };
        document.body.classList.add("sidebar-resizing");
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (start?.pointer === event.pointerId)
          show(start.startWidth + event.clientX - start.startX);
      }}
      onPointerUp={(event) => {
        if (drag.current?.pointer !== event.pointerId) return;
        drag.current = null;
        setPreferred(current.current);
        document.body.classList.remove("sidebar-resizing");
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={cancelDrag}
      onLostPointerCapture={cancelDrag}
      onKeyDown={(event) => {
        if (
          ![
            "ArrowLeft",
            "ArrowRight",
            "Home",
            "End",
            "Enter",
            "Escape",
          ].includes(event.key)
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Enter") {
          reset();
          return;
        }
        if (event.key === "Escape") {
          const start = drag.current;
          drag.current = null;
          document.body.classList.remove("sidebar-resizing");
          if (start) show(start.startWidth);
          return;
        }
        const width =
          event.key === "Home"
            ? SIDEBAR_MIN
            : event.key === "End"
              ? sidebarMax(viewport)
              : current.current +
                (event.key === "ArrowRight" ? 1 : -1) *
                  (event.shiftKey ? 50 : 10);
        setPreferred(show(width));
      }}
    />
  );
}
