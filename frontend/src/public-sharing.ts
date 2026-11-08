export function publicPageLink(
  id: string,
  base: string,
  path?: string | null,
  privatePage = false,
): string {
  if (path && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path) && path.length <= 64)
    return new URL(`./${path}`, base).href;
  return new URL(
    `index.php?page=${encodeURIComponent(id)}&${privatePage ? "edit" : "read"}=1`,
    base,
  ).href;
}
export async function requestNativeShare(
  url: string,
  device: { share?: (data: { url: string }) => Promise<void> },
): Promise<"shared" | "cancelled" | "copy"> {
  if (!device.share) return "copy";
  try {
    await device.share({ url });
    return "shared";
  } catch (error) {
    return (error as { name?: string })?.name === "AbortError"
      ? "cancelled"
      : "copy";
  }
}
