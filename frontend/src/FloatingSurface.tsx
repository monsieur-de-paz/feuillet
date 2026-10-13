import {
  useLayoutEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import { fitPopover } from "./interface-geometry";

/** A top-layer surface stays inside its theme and dialog in the DOM. */
export function FloatingSurface({
  children,
  anchor,
  point,
  onClose,
  className = "",
  label,
  role = "menu",
}: {
  children: ReactNode;
  anchor?: HTMLElement | null;
  point?: { x: number; y: number };
  onClose: () => void;
  className?: string;
  label: string;
  role?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    const node = ref.current!;
    // Manual popovers allow nested menus inside a modal without closing its parent.
    if (node.showPopover) node.showPopover();
    else node.style.display = "block";
    const place = () => {
      const rect = anchor?.getBoundingClientRect();
      const vp = window.visualViewport;
      const width = vp?.width || innerWidth,
        height = vp?.height || innerHeight;
      const offsetX = vp?.offsetLeft || 0,
        offsetY = vp?.offsetTop || 0;
      node.style.maxWidth = `${Math.max(40, width - 16)}px`;
      const size = node.getBoundingClientRect();
      const fit = fitPopover({
        x: (point?.x ?? rect?.left ?? 8) - offsetX,
        y: (point?.y ?? rect?.bottom ?? 8) - offsetY,
        width: size.width,
        height: size.height,
        viewportWidth: width,
        viewportHeight: height,
        anchorTop: rect ? rect.top - offsetY : undefined,
      });
      node.style.left = `${fit.left + offsetX}px`;
      node.style.top = `${fit.top + offsetY}px`;
      node.style.maxHeight = `${fit.maxHeight}px`;
      if (rect) node.style.minWidth = `${Math.min(rect.width, width - 16)}px`;
    };
    place();
    const outside = (e: PointerEvent) => {
      if (
        !node.contains(e.target as Node) &&
        !anchor?.contains(e.target as Node)
      )
        close.current();
    };
    const dismiss = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close.current();
      }
    };
    const scroll = (e: Event) => {
      if (!node.contains(e.target as Node)) close.current();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", dismiss, true);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", place);
    window.visualViewport?.addEventListener("resize", place);
    const observer = new ResizeObserver(place);
    observer.observe(node);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", dismiss, true);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("resize", place);
      if (node.matches(":popover-open")) node.hidePopover();
    };
  }, [anchor, point?.x, point?.y]);
  return (
    <div
      ref={ref}
      popover="manual"
      role={role}
      aria-label={label}
      className={`feuillet-floating ${className}`}
      style={{ margin: 0 } as CSSProperties}
    >
      {children}
    </div>
  );
}
