export function publicPageLink(id: string, base: string): string {
  return new URL(`index.php?page=${encodeURIComponent(id)}&read=1`, base).href;
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
