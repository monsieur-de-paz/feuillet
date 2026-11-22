import { useEffect, useState } from "react";
import type { MapData } from "./mind-map-model";
import { nodeWidth, nodeHeight, linkPath } from "./mind-map-geometry";
import { MindMapNode } from "./MindMapNode";
export function MindMapSectionNav({
  data,
  currentId,
  onNavigate,
}: {
  data: MapData;
  currentId: string;
  onNavigate: (id: string) => void;
}) {
  const [all, setAll] = useState(false),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 });
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentId, all]);
  const current = data.nodes.find((n) => n.id === currentId)!;
  const nearby = new Set(
    data.nodes
      .filter(
        (n) =>
          n.id === current.id ||
          n.id === current.parent ||
          n.parent === current.id ||
          (!!current.parent && n.parent === current.parent),
      )
      .map((n) => n.id),
  );
  const shown = data.nodes.filter((n) => all || nearby.has(n.id));
  const w = nodeWidth(data.theme),
    left = Math.min(...shown.map((n) => n.x - w / 2)) - 45,
    right = Math.max(...shown.map((n) => n.x + w / 2)) + 45,
    top =
      Math.min(...shown.map((n) => n.y - nodeHeight(n, data.theme) / 2)) - 45,
    bottom =
      Math.max(...shown.map((n) => n.y + nodeHeight(n, data.theme) / 2)) + 45;
  const viewWidth = (right - left) / zoom,
    viewHeight = Math.max(bottom - top, (right - left) * 0.65) / zoom;
  const x = (left + right) / 2 - viewWidth / 2 + pan.x,
    y = (top + bottom) / 2 - viewHeight / 2 + pan.y;
  const parents = [];
  let ancestor = current;
  const seen = new Set<string>();
  while (ancestor.parent && !seen.has(ancestor.id)) {
    seen.add(ancestor.id);
    const p = data.nodes.find((n) => n.id === ancestor.parent);
    if (!p) break;
    parents.unshift(p);
    ancestor = p;
  }
  return (
    <nav
      className="mm-section-map"
      aria-label="Navigation visuelle de la carte"
    >
      <header>
        <strong>Se repérer dans la carte</strong>
        <small>Choisis une bulle pour explorer sa section.</small>
      </header>
      <div className="mm-section-trail">
        {parents.map((n) => (
          <button key={n.id} type="button" onClick={() => onNavigate(n.id)}>
            {n.text}
            <span aria-hidden="true"> ›</span>
          </button>
        ))}
        <strong>{current.text}</strong>
      </div>
      <svg
        role="group"
        aria-label="Bulles de navigation"
        viewBox={`${x} ${y} ${viewWidth} ${viewHeight}`}
        onPointerDown={(e) => {
          if ((e.target as Element).closest("[data-section-id]")) return;
          const el = e.currentTarget,
            rect = el.getBoundingClientRect(),
            start = { x: e.clientX, y: e.clientY },
            before = pan;
          el.setPointerCapture(e.pointerId);
          const move = (ev: PointerEvent) =>
            setPan({
              x: before.x - ((ev.clientX - start.x) * viewWidth) / rect.width,
              y: before.y - ((ev.clientY - start.y) * viewHeight) / rect.height,
            });
          const stop = () => {
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerup", stop);
            el.removeEventListener("pointercancel", stop);
          };
          el.addEventListener("pointermove", move);
          el.addEventListener("pointerup", stop);
          el.addEventListener("pointercancel", stop);
        }}
      >
        {data.nodes
          .filter(
            (n) =>
              shown.some((s) => s.id === n.id) &&
              shown.some((s) => s.id === n.parent),
          )
          .map((n) => {
            const p = data.nodes.find((v) => v.id === n.parent)!;
            return (
              <path
                key={n.id}
                d={linkPath(data, p, n)}
                fill="none"
                stroke={n.line}
                strokeWidth={4}
                opacity={0.65}
              />
            );
          })}
        {shown.map((n) => (
          <g
            key={n.id}
            data-section-id={n.id}
            transform={`translate(${n.x},${n.y})`}
            role="button"
            tabIndex={0}
            aria-label={`Explorer : ${n.text}`}
            aria-current={n.id === currentId ? "step" : undefined}
            onClick={() => onNavigate(n.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onNavigate(n.id);
              }
            }}
          >
            <MindMapNode
              data={data}
              node={n}
              zoom={Math.min(1, 360 / viewWidth)}
              selected={n.id === currentId}
              editable={false}
            />
            {n.id === currentId && (
              <g pointerEvents="none">
                <rect
                  x={-w / 2}
                  y={-nodeHeight(n, data.theme) / 2 - 30}
                  width={w}
                  height={24}
                  rx={12}
                  fill="var(--accent,#52796c)"
                />
                <text
                  x={0}
                  y={-nodeHeight(n, data.theme) / 2 - 13}
                  textAnchor="middle"
                  fontSize={13}
                  fill="var(--accent-#fff)"
                >
                  Vous êtes ici
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
      <div className="mm-section-map-tools">
        <button
          type="button"
          aria-label="Réduire le zoom de navigation"
          onClick={() => setZoom((z) => Math.max(0.5, z / 1.3))}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Augmenter le zoom de navigation"
          onClick={() => setZoom((z) => Math.min(4, z * 1.3))}
        >
          ＋
        </button>
        <button
          type="button"
          onClick={() => {
            setAll((v) => !v);
          }}
        >
          {" "}
          {all ? "Autour de cette idée" : "Toute la carte"}
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          Recentrer
        </button>
      </div>
    </nav>
  );
}
