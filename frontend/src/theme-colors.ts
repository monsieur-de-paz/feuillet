/** Derived colors only. The author's stored accent never changes. */
export function luminance(hex: string): number {
  const values = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
export function contrast(a: string, b: string): number {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function hexColor(rgb: number[]): string {
  return (
    "#" +
    rgb
      .map((c) =>
        Math.floor(Math.max(0, Math.min(1, c)) * 255 + 0.5)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()
  );
}
function hsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map(
      (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
    ),
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min,
    l = (max + min) / 2;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? (g - b) / d + (g < b ? 6 : 0)
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return [h / 6, s, l];
}
function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s,
    t = h * 6,
    x = c * (1 - Math.abs((t % 2) - 1)),
    m = l - c / 2;
  const rgb =
    t < 1
      ? [c, x, 0]
      : t < 2
        ? [x, c, 0]
        : t < 3
          ? [0, c, x]
          : t < 4
            ? [0, x, c]
            : t < 5
              ? [x, 0, c]
              : [c, 0, x];
  return hexColor(rgb.map((v) => v + m));
}
export function mixColor(a: string, b: string, weight: number): string {
  return hexColor(
    [1, 3, 5].map(
      (i) =>
        (parseInt(a.slice(i, i + 2), 16) / 255) * weight +
        (parseInt(b.slice(i, i + 2), 16) / 255) * (1 - weight),
    ),
  );
}
export function adaptiveAccent(
  accent: string,
  mode: string,
  background: string,
): string {
  const original = accent.toUpperCase();
  if (mode === "light") return original;
  const surfaces =
    mode === "oled"
      ? [background, "#000000", "#080808", "#121212"]
      : [background, "#17191D", "#202329", "#2A2E35"];
  const minimum = (c: string) =>
    Math.min(
      ...surfaces.map((bg) => contrast(c, bg)),
      contrast(c, mixColor(c, mode === "oled" ? "#000000" : "#17191D", 0.22)),
    );
  if (minimum(original) >= 4.5) return original;
  const [h, s, l] = hsl(original),
    goal = minimum("#FFFFFF") >= minimum("#000000") ? 1 : 0;
  let failing = l,
    passing = goal;
  // Target 4.55 includes room for integer RGB rounding.
  for (let i = 0; i < 24; i++) {
    const middle = (failing + passing) / 2;
    if (minimum(fromHsl(h, s, middle)) >= 4.55) passing = middle;
    else failing = middle;
  }
  return fromHsl(h, s, passing);
}
export function accentForeground(accent: string): string {
  return contrast(accent, "#FFFFFF") >= contrast(accent, "#000000")
    ? "#FFFFFF"
    : "#000000";
}
export function accentHover(accent: string): string {
  const target = accentForeground(accent) === "#000000" ? 1 : 0;
  return hexColor(
    [1, 3, 5].map(
      (i) =>
        (parseInt(accent.slice(i, i + 2), 16) / 255) * 0.92 + target * 0.08,
    ),
  );
}
