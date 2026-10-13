import { useState } from "react";
import { ContextMenu } from "./ContextMenu";
import { Moon, Sun, ChevronDown, Check } from "lucide-react";
import type { Appearance } from "./types";
import "./theme-toggle.css";
export type ThemePreference = "light" | "dark" | "oled" | null;
export const themeStorageKey = "feuillet.theme";
export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(themeStorageKey);
    return value === "light" || value === "dark" || value === "oled"
      ? value
      : null;
  } catch {
    return null;
  }
}
export function storeThemePreference(value: ThemePreference) {
  try {
    if (value) localStorage.setItem(themeStorageKey, value);
    else localStorage.removeItem(themeStorageKey);
  } catch {}
}
export function applyThemePreference(
  appearance: Appearance,
  preference: ThemePreference,
): Appearance {
  if (!preference || preference === appearance.mode) return appearance;
  return {
    ...appearance,
    mode: preference,
    background:
      preference === "light"
        ? "#ffffff"
        : preference === "oled"
          ? "#000000"
          : "#111318",
    text: preference === "light" ? "#37352f" : "#f3f4f6",
  };
}
export function ThemeToggle({
  mode,
  onChange,
  className = "",
}: {
  mode: Appearance["mode"];
  onChange: (value: ThemePreference) => void;
  className?: string;
}) {
  const dark = mode !== "light";
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  return (
    <div className={`feuillet-theme-toggle ${className}`}>
      <button
        type="button"
        className="icon-button theme-main-button"
        aria-label={dark ? "Activer le mode clair" : "Activer le mode sombre"}
        title={dark ? "Mode clair" : "Mode sombre"}
        onClick={() => onChange(dark ? "light" : "dark")}
      >
        <span className={`theme-symbols ${dark ? "is-dark" : ""}`}>
          <Sun size={18} />
          <Moon size={18} />
        </span>
      </button>
      <button
        type="button"
        className="theme-menu-trigger"
        aria-label="Choisir le thème"
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}
      >
        <ChevronDown size={13} />
      </button>
      {anchor && (
        <ContextMenu
          anchor={anchor}
          title="Affichage"
          onClose={() => setAnchor(null)}
          actions={(["light", "dark", "oled", null] as ThemePreference[]).map(
            (value) => ({
              label:
                value === "light"
                  ? "Clair"
                  : value === "dark"
                    ? "Sombre"
                    : value === "oled"
                      ? "Noir OLED"
                      : "Thème du carnet",
              icon:
                readThemePreference() === value ? (
                  <Check size={16} />
                ) : undefined,
              checked: readThemePreference() === value,
              run: () => onChange(value),
              group: value === null ? "inherit" : "mode",
            }),
          )}
        />
      )}
    </div>
  );
}
