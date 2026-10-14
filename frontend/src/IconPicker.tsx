import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import manifest from "../../public/icons.json";
import { FeuilletLogo } from "./FeuilletLogo";
import { fileUrl } from "./types";
import type { EmojiEntry } from "./emoji-data";
import "./IconPicker.css";

export type IconValue = {
  emoji: string;
  webIcon: string | null;
  iconId: string | null;
};
export type IconImageAction = "upload" | "library" | "internet" | "paste";
export type IconPickerProps = {
  value: IconValue;
  onEmoji: (emoji: string) => void;
  onWebIcon: (icon: string) => void;
  onImage?: (action: IconImageAction, file?: File) => void;
  onRemove?: () => void;
  busy?: boolean;
  defaultTab?: "emoji" | "web" | "image";
  emojiOnly?: boolean;
};
const spriteUrl = new URL("../../public/icons.svg", import.meta.url).href;
const iconNames = new Set(manifest.names);
export function parseWebIcon(
  icon: string,
): { slug: string; color: string | null } | null {
  const match =
    /^lucide:([a-z0-9]+(?:-[a-z0-9]+)*)(?::(#[a-fA-F0-9]{6}))?$/.exec(icon);
  return match && iconNames.has(match[1])
    ? { slug: match[1], color: match[2] || null }
    : null;
}
export function webIconValue(slug: string, color = "#37352F"): string {
  if (!iconNames.has(slug)) return "lucide:file";
  const value = `lucide:${slug}:${/^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : "#37352F"}`;
  return value.length <= 64 ? value : `lucide:${slug}`;
}
export function FeuilletIcon({
  icon = "📄",
  iconId,
  value,
  size = 24,
  className = "",
  label,
}: {
  icon?: string;
  iconId?: string | null;
  value?: IconValue;
  size?: number;
  className?: string;
  label?: string;
}) {
  const stored = value ? value.webIcon || value.emoji : icon;
  const imageId = value ? value.iconId : iconId;
  const parsed = parseWebIcon(stored);
  const style = {
    "--fi-size": `${Math.max(10, Math.min(128, size))}px`,
    color: parsed?.color || undefined,
  } as CSSProperties;
  return (
    <span
      className={`feuillet-icon ${className}`}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {imageId ? (
        <img src={fileUrl(imageId)} alt="" loading="lazy" />
      ) : parsed ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
        >
          <use href={`${spriteUrl}#${parsed.slug}`} />
        </svg>
      ) : stored === "f." || stored === "feuillet" ? (
        <FeuilletLogo size={size} />
      ) : (
        <span className="feuillet-icon-emoji">
          {stored.startsWith("lucide:") ? "📄" : stored || "📄"}
        </span>
      )}
    </span>
  );
}

type Catalog = typeof import("./emoji-data");
type WebEntry = {
  slug: string;
  name: string;
  label: string;
  aliases: string[];
};
const tones = ["👋", "👋🏻", "👋🏼", "👋🏽", "👋🏾", "👋🏿"];
const colors = [
  "#37352F",
  "#787774",
  "#9F6B53",
  "#D9730D",
  "#CB912F",
  "#448361",
  "#337EA9",
  "#9065B0",
  "#C14C8A",
  "#D44C47",
];
// French search expansions complement the complete English Lucide identifiers.
const frenchAliases: Record<string, string[]> = {
  livre: ["book", "notebook"],
  cours: ["book", "graduation", "school", "presentation"],
  ecole: ["school", "graduation"],
  dossier: ["folder"],
  fichier: ["file"],
  document: ["file", "notebook"],
  note: ["notebook", "sticky-note", "pencil"],
  musique: ["music", "audio", "headphone"],
  son: ["audio", "volume", "speaker"],
  video: ["video", "film", "camera"],
  image: ["image", "picture", "camera"],
  photo: ["image", "camera"],
  recherche: ["search"],
  loupe: ["search"],
  coeur: ["heart"],
  etoile: ["star", "sparkle"],
  soleil: ["sun"],
  lune: ["moon"],
  maison: ["house", "home"],
  calendrier: ["calendar"],
  horloge: ["clock", "alarm", "timer"],
  personne: ["user", "person"],
  utilisateur: ["user"],
  telephone: ["phone", "smartphone"],
  ordinateur: ["computer", "laptop", "monitor"],
  ecran: ["screen", "monitor"],
  fleche: ["arrow", "chevron", "move"],
  lien: ["link"],
  cadenas: ["lock"],
  cle: ["key"],
  reglages: ["settings", "sliders"],
  carte: ["map", "card"],
  monde: ["globe", "earth"],
  terre: ["earth", "globe"],
  langue: ["languages"],
  ajouter: ["plus"],
  supprimer: ["trash", "delete", "minus"],
  modifier: ["edit", "pencil"],
  crayon: ["pencil"],
  telecharger: ["download"],
  envoyer: ["send", "upload"],
  partage: ["share"],
  imprimer: ["printer"],
  presse: ["newspaper"],
  journal: ["newspaper", "notebook"],
  exercice: ["list", "clipboard", "pencil"],
  sciences: ["flask", "atom", "microscope", "test-tube"],
  chimie: ["flask", "test-tube"],
  maths: ["calculator", "sigma", "square"],
  technologie: ["cpu", "circuit", "wrench", "cog"],
  outil: ["wrench", "hammer", "tool"],
  sport: ["ball", "bike", "trophy"],
  sourire: ["smile"],
  visage: ["face", "smile", "frown"],
  animal: ["cat", "dog", "rabbit", "bird", "fish"],
  couleur: ["palette", "paint"],
  peinture: ["paint", "brush", "palette"],
  argent: ["dollar", "euro", "bank", "wallet"],
  voiture: ["car"],
  train: ["train"],
  avion: ["plane"],
  voyage: ["plane", "luggage", "map"],
};
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
function webMatches(entry: WebEntry, query: string) {
  const target = normalize(
    [entry.slug, entry.name, entry.label, ...entry.aliases].join(" "),
  );
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every(
      (term) =>
        target.includes(term) ||
        frenchAliases[term]?.some((alias) => target.includes(alias)),
    );
}
const webGroups: [string, string, string[]][] = [
  ["", "Toutes", []],
  [
    "study",
    "Cours et notes",
    [
      "book",
      "file",
      "notebook",
      "school",
      "graduation",
      "clipboard",
      "pencil",
      "list",
    ],
  ],
  [
    "media",
    "Médias",
    ["audio", "music", "video", "image", "camera", "film", "headphone"],
  ],
  [
    "people",
    "Personnes",
    ["user", "person", "contact", "baby", "accessibility"],
  ],
  [
    "nature",
    "Nature",
    [
      "tree",
      "flower",
      "leaf",
      "sun",
      "moon",
      "cloud",
      "earth",
      "bird",
      "fish",
      "cat",
      "dog",
    ],
  ],
  [
    "tools",
    "Outils",
    [
      "settings",
      "wrench",
      "hammer",
      "cpu",
      "cog",
      "flask",
      "atom",
      "calculator",
    ],
  ],
  [
    "navigation",
    "Navigation",
    ["arrow", "chevron", "move", "map", "compass", "globe"],
  ],
];

export function IconPicker({
  value,
  onEmoji,
  onWebIcon,
  onImage,
  onRemove,
  busy = false,
  defaultTab = "emoji",
  emojiOnly = false,
}: IconPickerProps) {
  const availableTabs: (readonly ["emoji" | "web" | "image", string])[] =
    emojiOnly
      ? [["emoji", "Émojis"]]
      : [
          ["emoji", "Émojis"],
          ["web", "Icônes"],
          ["image", "Image"],
        ];
  const [tab, setTab] = useState(emojiOnly ? "emoji" : defaultTab);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [webGroup, setWebGroup] = useState("");
  const [tone, setTone] = useState(0);
  const [allVariants, setAllVariants] = useState(false);
  const [limit, setLimit] = useState(144);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [webEntries, setWebEntries] = useState<WebEntry[]>([]);
  const [loadError, setLoadError] = useState("");
  const [color, setColor] = useState(
    parseWebIcon(value.webIcon || "")?.color || "#37352F",
  );
  const [previewSize, setPreviewSize] = useState(28);
  const [hint, setHint] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    if (tab === "emoji" && !catalog)
      import("./emoji-data")
        .then((module) => {
          if (active) setCatalog(module);
        })
        .catch(() => {
          if (active)
            setLoadError(
              "Le catalogue ne peut pas être chargé. Rechargez la page.",
            );
        });
    if (tab === "web" && !webEntries.length)
      import("./web-icon-data.json")
        .then((module) => {
          if (active) setWebEntries(module.default);
        })
        .catch(() => {
          if (active)
            setLoadError(
              "Le catalogue ne peut pas être chargé. Rechargez la page.",
            );
        });
    return () => {
      active = false;
    };
  }, [tab, catalog, webEntries.length]);
  useEffect(() => {
    setLimit(144);
  }, [query, group, webGroup, tone, allVariants, tab]);
  const emojiResults: EmojiEntry[] = useMemo(
    () => catalog?.selectEmojis(query, group, tone, allVariants) || [],
    [catalog, query, group, tone, allVariants],
  );
  const webResults = useMemo(() => {
    const terms = webGroups.find((item) => item[0] === webGroup)?.[2] || [];
    return webEntries.filter(
      (entry) =>
        (!terms.length || terms.some((term) => entry.slug.includes(term))) &&
        webMatches(entry, query),
    );
  }, [webEntries, query, webGroup]);
  const results = tab === "emoji" ? emojiResults : webResults;
  function changeTab(next: typeof tab) {
    setTab(next);
    setQuery("");
    setHint("");
  }
  function acceptFile(file: File, action: IconImageAction) {
    if (!file.type.startsWith("image/")) {
      setHint("Choisissez un fichier image.");
      return;
    }
    setHint("");
    onImage?.(action, file);
  }
  async function pasteImage() {
    if (!navigator.clipboard?.read) {
      setHint("Collez votre image ici avec ⌘V ou Ctrl+V.");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) {
          const blob = await item.getType(type);
          acceptFile(
            new File([blob], `icone-collee.${type.split("/")[1] || "png"}`, {
              type,
            }),
            "paste",
          );
          return;
        }
      }
      setHint(
        "Aucune image dans le presse-papiers. Copiez une image, puis collez-la ici.",
      );
    } catch {
      setHint("Collez votre image ici avec ⌘V ou Ctrl+V.");
    }
  }
  return (
    <div
      className="icon-picker"
      aria-label="Choisir une icône"
      onPaste={(event) => {
        if (tab !== "image" || busy) return;
        const file = Array.from(event.clipboardData.files).find((item) =>
          item.type.startsWith("image/"),
        );
        if (file) {
          event.preventDefault();
          acceptFile(file, "paste");
        }
      }}
    >
      <div className="icon-picker-current">
        <FeuilletIcon value={value} size={32} />
        <span>Icône actuelle</span>
        {onRemove && (
          <button type="button" disabled={busy} onClick={onRemove}>
            Retirer
          </button>
        )}
      </div>
      <div
        className="icon-picker-tabs"
        role="tablist"
        aria-label="Type d’icône"
      >
        {availableTabs.map(([id, name]) => (
          <button
            type="button"
            key={id}
            role="tab"
            id={`icon-tab-${id}`}
            aria-controls={`icon-panel-${id}`}
            aria-selected={tab === id}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => changeTab(id)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                return;
              event.preventDefault();
              const tabs = availableTabs.map(([id]) => id);
              const next =
                tabs[
                  (tabs.indexOf(tab) +
                    (event.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                    tabs.length
                ];
              changeTab(next);
              requestAnimationFrame(() =>
                document.getElementById(`icon-tab-${next}`)?.focus(),
              );
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        className="icon-picker-panel"
        id={`icon-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`icon-tab-${tab}`}
      >
        {tab !== "image" ? (
          <>
            <label className="icon-picker-search">
              <span>Rechercher en français ou en anglais</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  tab === "emoji"
                    ? "Sourire, livre, drapeau…"
                    : "Livre, book, crayon…"
                }
              />
            </label>
            {tab === "emoji" ? (
              <>
                <div
                  className="icon-picker-groups"
                  aria-label="Catégories d’émojis"
                >
                  <button
                    type="button"
                    aria-pressed={!group}
                    onClick={() => setGroup("")}
                  >
                    Tous
                  </button>
                  {catalog?.emojiGroups.map(([id, name, emoji]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={group === id}
                      title={name}
                      onClick={() => setGroup(id)}
                    >
                      <span className="feuillet-icon-emoji">{emoji}</span>{" "}
                      {name}
                    </button>
                  ))}
                </div>
                <div className="icon-picker-variants">
                  <fieldset>
                    <legend>Teint de peau</legend>
                    {tones.map((emoji, index) => (
                      <button
                        type="button"
                        key={index}
                        aria-label={
                          index
                            ? `Teint ${index} sur 5`
                            : "Sans variante de teint"
                        }
                        aria-pressed={tone === index}
                        disabled={allVariants}
                        onClick={() => setTone(index)}
                        className="feuillet-icon-emoji"
                      >
                        {emoji}
                      </button>
                    ))}
                  </fieldset>
                  <label>
                    <input
                      type="checkbox"
                      checked={allVariants}
                      onChange={(event) => setAllVariants(event.target.checked)}
                    />
                    Toutes les variantes
                  </label>
                </div>
              </>
            ) : (
              <>
                <div
                  className="icon-picker-groups"
                  aria-label="Catégories d’icônes"
                >
                  {webGroups.map(([id, name]) => (
                    <button
                      type="button"
                      key={id}
                      aria-pressed={webGroup === id}
                      onClick={() => setWebGroup(id)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <div className="icon-picker-web-options">
                  <label>
                    Couleur{" "}
                    <input
                      aria-label="Couleur de l’icône"
                      type="color"
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                    />
                  </label>
                  <div className="icon-picker-swatches">
                    {colors.map((hex) => (
                      <button
                        type="button"
                        key={hex}
                        style={{ backgroundColor: hex }}
                        title={hex}
                        aria-label={`Couleur ${hex}`}
                        aria-pressed={color.toLowerCase() === hex.toLowerCase()}
                        onClick={() => setColor(hex)}
                      />
                    ))}
                  </div>
                  <label>
                    Aperçu : {previewSize} px
                    <input
                      type="range"
                      min="20"
                      max="44"
                      value={previewSize}
                      onChange={(event) =>
                        setPreviewSize(Number(event.target.value))
                      }
                    />
                  </label>
                </div>
              </>
            )}
            <div className="icon-picker-count" role="status">
              {loadError ||
                (!(tab === "emoji" ? catalog : webEntries.length)
                  ? "Chargement du catalogue…"
                  : `${results.length.toLocaleString("fr-FR")} ${tab === "emoji" ? "émojis" : "icônes"} disponibles`)}
            </div>
            <div
              className="icon-picker-grid"
              style={{ "--preview-size": `${previewSize}px` } as CSSProperties}
            >
              {tab === "emoji"
                ? emojiResults.slice(0, limit).map((entry) => (
                    <button
                      type="button"
                      disabled={busy}
                      key={entry.e}
                      title={`${entry.fr} · ${entry.en}`}
                      aria-label={entry.fr}
                      aria-pressed={
                        !value.iconId &&
                        !value.webIcon &&
                        value.emoji === entry.e
                      }
                      onClick={() => onEmoji(entry.e)}
                    >
                      <span className="feuillet-icon-emoji">{entry.e}</span>
                    </button>
                  ))
                : webResults.slice(0, limit).map((entry) => (
                    <button
                      type="button"
                      disabled={busy}
                      key={entry.slug}
                      title={entry.label}
                      aria-label={entry.label}
                      aria-pressed={
                        !value.iconId &&
                        parseWebIcon(value.webIcon || "")?.slug === entry.slug
                      }
                      onClick={() => onWebIcon(webIconValue(entry.slug, color))}
                    >
                      <FeuilletIcon
                        icon={webIconValue(entry.slug, color)}
                        size={previewSize}
                      />
                    </button>
                  ))}
            </div>
            {!!results.length && results.length > limit && (
              <button
                type="button"
                className="icon-picker-more"
                onClick={() => setLimit((current) => current + 144)}
              >
                Afficher davantage ({Math.min(144, results.length - limit)})
              </button>
            )}
            {results.length === 0 &&
              (tab === "emoji" ? catalog : webEntries.length > 0) && (
                <p className="icon-picker-empty">
                  Aucun résultat. Essayez un autre mot.
                </p>
              )}
            <p className="icon-picker-footnote">
              {tab === "emoji"
                ? `Unicode ${catalog?.emojiVersion || "18.0"} · Le dessin dépend de votre appareil. « Toutes les variantes » inclut les combinaisons de teints.`
                : `Lucide ${manifest.version} · ${manifest.names.length.toLocaleString("fr-FR")} dessins · La taille s’adapte à chaque emplacement.`}
            </p>
          </>
        ) : (
          <div className="icon-picker-image">
            {value.iconId && (
              <img
                className="icon-picker-image-preview"
                src={fileUrl(value.iconId)}
                alt="Icône actuelle"
              />
            )}
            <p>Importez une image ou choisissez un fichier de votre carnet.</p>
            <input
              ref={uploadRef}
              hidden
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) acceptFile(file, "upload");
                event.target.value = "";
              }}
            />
            <div className="icon-picker-image-actions">
              <button
                type="button"
                disabled={busy || !onImage}
                onClick={() => uploadRef.current?.click()}
              >
                Importer une image
              </button>
              <button
                type="button"
                disabled={busy || !onImage}
                onClick={() => onImage?.("library")}
              >
                Bibliothèque
              </button>
              <button
                type="button"
                disabled={busy || !onImage}
                onClick={() => onImage?.("internet")}
              >
                Chercher sur Internet
              </button>
              <button
                type="button"
                disabled={busy || !onImage}
                onClick={pasteImage}
              >
                Coller une image
              </button>
            </div>
            <p className="icon-picker-footnote">
              Vous pouvez aussi coller une image ici avec ⌘V ou Ctrl+V. Les
              crédits des images Internet restent attachés au fichier.
            </p>
            {hint && <p role="status">{hint}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
