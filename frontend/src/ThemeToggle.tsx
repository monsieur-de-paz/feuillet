import { Moon, Sun, ChevronDown } from "lucide-react";
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
  return (
    <div className={`feuillet-theme-toggle ${className}`}>
      <button
        type="button"
        className="icon-button theme-main-button"
        aria-label={dark ? "Activer le mode clair" : "Activer le mode sombre"}
        title={dark ? "Mode clair" : "Mode sombre"}
        onClick={() => onChange(dark ? "light" : "dark")}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <details className="theme-options">
        <summary aria-label="Choisir le thème">
          <ChevronDown size={13} />
        </summary>
        <div>
          {(["light", "dark", "oled"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={mode === value}
              onClick={(e) => {
                onChange(value);
                e.currentTarget.closest("details")?.removeAttribute("open");
              }}
            >
              {value === "light"
                ? "Clair"
                : value === "dark"
                  ? "Sombre"
                  : "Noir OLED"}
            </button>
          ))}
          <button
            type="button"
            onClick={(e) => {
              onChange(null);
              e.currentTarget.closest("details")?.removeAttribute("open");
            }}
          >
            Thème du carnet
          </button>
        </div>
      </details>
    </div>
  );
}
