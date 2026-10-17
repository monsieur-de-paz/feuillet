import { useState, useEffect } from "react";
import { ContextMenu } from "./ContextMenu";
import { Moon, Sun, ChevronDown, Check, Monitor } from "lucide-react";
import type { Appearance } from "./types";
import "./theme-toggle.css";
export type ThemePreference = "light" | "dark" | "oled" | "system" | null;
export const themeStorageKey = "feuillet.theme";
export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(themeStorageKey);
    return value === "inherit"
      ? null
      : value === "light" || value === "dark" || value === "oled"
        ? value
        : "system";
  } catch {
    return "system";
  }
}
export function storeThemePreference(value: ThemePreference) {
  try {
    localStorage.setItem(themeStorageKey, value || "inherit");
  } catch {}
}
export function useSystemDark() {
  const [dark, setDark] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const change = () => setDark(query.matches);
    change();
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return dark;
}
export function applyThemePreference(
  appearance: Appearance,
  preference: ThemePreference,
  systemDark = typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches,
): Appearance {
  if (preference === null) return appearance;
  const mode =
    preference === "system" ? (systemDark ? "dark" : "light") : preference;
  if (mode === appearance.mode) return appearance;
  return {
    ...appearance,
    mode,
    background:
      mode === "light" ? "#ffffff" : mode === "oled" ? "#000000" : "#111318",
    text: mode === "light" ? "#37352f" : "#f3f4f6",
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
          actions={(
            ["system", "light", "dark", "oled", null] as ThemePreference[]
          ).map((value) => ({
            label:
              value === "system"
                ? "Système"
                : value === "light"
                  ? "Clair"
                  : value === "dark"
                    ? "Sombre"
                    : value === "oled"
                      ? "Noir OLED"
                      : "Thème du carnet",
            icon:
              readThemePreference() === value ? (
                <Check size={16} />
              ) : value === "system" ? (
                <Monitor size={16} />
              ) : undefined,
            checked: readThemePreference() === value,
            run: () => onChange(value),
            group: value === null ? "inherit" : "mode",
          }))}
        />
      )}
    </div>
  );
}
