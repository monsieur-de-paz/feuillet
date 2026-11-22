export type TouchPoint = { x: number; y: number };
export type TouchView = { pan: TouchPoint; zoom: number };
export function touchFrame(points: TouchPoint[]) {
  const a = points[0],
    b = points[1] || a;
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    distance: Math.hypot(a.x - b.x, a.y - b.y),
  };
}
/** Keep the world point under the fingers while they spread and translate. */
export function touchCamera(
  view: TouchView,
  start: ReturnType<typeof touchFrame>,
  current: ReturnType<typeof touchFrame>,
): TouchView {
  const zoom = Math.max(
    0.03,
    Math.min(
      12,
      view.zoom * (start.distance > 0 ? current.distance / start.distance : 1),
    ),
  );
  return {
    zoom,
    pan: {
      x: current.x - ((start.x - view.pan.x) * zoom) / view.zoom,
      y: current.y - ((start.y - view.pan.y) * zoom) / view.zoom,
    },
  };
}
