export type CoverPosition = { x: number; y: number; zoom?: number };
export function coverZoom(position: CoverPosition) {
  return Math.max(
    1,
    Math.min(3, Number.isFinite(position.zoom) ? position.zoom! : 1),
  );
}
export function coverOverflow(
  naturalWidth: number,
  naturalHeight: number,
  width: number,
  height: number,
  zoom = 1,
) {
  if (!naturalWidth || !naturalHeight || !width || !height)
    return { x: 0, y: 0, ready: false };
  const scale =
    Math.max(width / naturalWidth, height / naturalHeight) *
    Math.max(1, Math.min(3, zoom));
  return {
    x: Math.max(0, naturalWidth * scale - width),
    y: Math.max(0, naturalHeight * scale - height),
    ready: true,
  };
}
export function coverImageStyle(position: CoverPosition) {
  const origin = `${position.x}% ${position.y}%`;
  return {
    objectPosition: origin,
    transform: `scale(${coverZoom(position)})`,
    transformOrigin: origin,
  };
}
