export function fitPopover({
  x,
  y,
  width,
  height,
  viewportWidth,
  viewportHeight,
  anchorTop,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  anchorTop?: number;
}) {
  const gap = 8;
  const maxHeight = Math.max(40, viewportHeight - gap * 2);
  const h = Math.min(height, maxHeight);
  let top = y + 4;
  if (
    top + h > viewportHeight - gap &&
    anchorTop !== undefined &&
    anchorTop - h - gap >= gap
  )
    top = anchorTop - h - gap;
  return {
    left: Math.max(
      gap,
      Math.min(
        x,
        viewportWidth - Math.min(width, viewportWidth - 2 * gap) - gap,
      ),
    ),
    top: Math.max(gap, Math.min(top, viewportHeight - h - gap)),
    maxHeight,
  };
}
export function searchLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
}
