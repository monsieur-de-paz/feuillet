export function navigationShortcutMatches(
  binding: string,
  event: Pick<
    KeyboardEvent,
    | "key"
    | "code"
    | "ctrlKey"
    | "metaKey"
    | "shiftKey"
    | "altKey"
    | "repeat"
    | "isComposing"
  >,
): boolean {
  if (
    !binding ||
    event.repeat ||
    event.isComposing ||
    event.altKey ||
    !event.shiftKey ||
    !(event.ctrlKey || event.metaKey)
  )
    return false;
  const key = /^Digit[0-9]$/.test(event.code)
    ? event.code.slice(-1)
    : event.key.toUpperCase();
  return key === binding.split("+").at(-1);
}
