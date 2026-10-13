import data from "./emoji-data.json";

export type EmojiEntry = {
  e: string;
  fr: string;
  en: string;
  k: string[];
  g: string;
  s: string;
  v: string;
  b: string;
  t: number[];
};
export const emojiVersion = data.version;
export const emojis: EmojiEntry[] = data.entries;
export const emojiGroups = [
  ["Smileys & Emotion", "Visages et émotions", "😀"],
  ["People & Body", "Personnes et corps", "👋"],
  ["Component", "Composants", "🦰"],
  ["Animals & Nature", "Animaux et nature", "🌿"],
  ["Food & Drink", "Alimentation", "🍋"],
  ["Travel & Places", "Voyages et lieux", "🌍"],
  ["Activities", "Activités", "⚽"],
  ["Objects", "Objets", "💡"],
  ["Symbols", "Symboles", "💚"],
  ["Flags", "Drapeaux", "🏳️"],
] as const;
export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
const searchable = new Map(
  emojis.map((item) => [
    item.e,
    normalizeSearch([item.fr, item.en, ...item.k, item.e].join(" ")),
  ]),
);
const families = new Map<string, EmojiEntry[]>();
for (const entry of emojis) {
  const family = families.get(entry.b) || [];
  family.push(entry);
  families.set(entry.b, family);
}
export function selectEmojis(
  query: string,
  group: string,
  tone: number,
  allVariants: boolean,
): EmojiEntry[] {
  const terms = normalizeSearch(query.trim()).split(/\s+/).filter(Boolean);
  const results: EmojiEntry[] = [];
  for (const family of families.values()) {
    const filtered = family.filter(
      (item) =>
        (!group || item.g === group) &&
        terms.every((term) => searchable.get(item.e)!.includes(term)),
    );
    if (!filtered.length) continue;
    if (allVariants) {
      results.push(...filtered);
      continue;
    }
    results.push(
      filtered.find(
        (item) =>
          tone > 0 && item.t.length > 0 && item.t.every((t) => t === tone),
      ) ||
        filtered.find((item) => item.t.length === 0) ||
        filtered[0],
    );
  }
  return results;
}
