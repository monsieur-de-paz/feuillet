export const SIDEBAR_MIN = 220;
export const SIDEBAR_MAX = 480;
export function sidebarMax(viewport: number): number {
  return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, viewport - 480));
}
export function clampSidebarWidth(width: number, viewport: number): number {
  return Math.round(
    Math.max(
      SIDEBAR_MIN,
      Math.min(sidebarMax(viewport), Number.isFinite(width) ? width : 260),
    ),
  );
}
export function storedSidebarWidth(value: string | null): number | null {
  if (!value || !/^\d{2,4}$/.test(value)) return null;
  return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, Number(value)));
}
