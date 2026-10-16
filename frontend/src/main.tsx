import "./style.css";
import "./gallery-layout.css";
import React, { useEffect, useState } from "react";
import { api, defaultAppearance } from "./types";
import { themeStyle } from "./Customization";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./interface.css";
import { PoweredBy } from "./PoweredBy";
import { PublicForm } from "./Database";
import { FeuilletIcon } from "./IconPicker";
import {
  ThemeToggle,
  applyThemePreference,
  readThemePreference,
  storeThemePreference,
  type ThemePreference,
} from "./ThemeToggle";
function PublicFormScreen({ token }: { token: string }) {
  const [base, setBase] = useState(defaultAppearance);
  const [brand, setBrand] = useState({
    title: "Feuillet.",
    icon: "feuillet",
    icon_id: null as string | null,
  });
  const [preference, setPreference] =
    useState<ThemePreference>(readThemePreference);
  const appearance = applyThemePreference(base, preference);
  useEffect(() => {
    let alive = true;
    void api("settings")
      .then((settings) => {
        if (!alive) return;
        setBase({ ...defaultAppearance, ...settings.appearance });
        setBrand({
          title: settings.notebook.title,
          icon: settings.notebook.icon,
          icon_id: settings.notebook.icon_id,
        });
      })
      .catch(() => {});
    useEffect(() => {
      Object.entries(themeStyle(appearance)).forEach(([key, value]) => {
        if (key.startsWith("--"))
          document.documentElement.style.setProperty(key, String(value));
      });
      document.documentElement.style.colorScheme =
        appearance.mode === "light" ? "light" : "dark";
      document.documentElement.dataset.theme = appearance.mode;
      document.body.style.background = appearance.background;
      document.body.style.color = appearance.text;
    }, [base, preference]);
    return () => {
      alive = false;
    };
  }, []);
  return (
    <>
      <header className="reader-header">
        <nav className="reader-breadcrumbs" aria-label="Site">
          <a className="reader-brand" href="index.php">
            <FeuilletIcon icon={brand.icon} iconId={brand.icon_id} size={24} />
            <span>{brand.title}</span>
          </a>
        </nav>
        <div className="reader-header-actions">
          <ThemeToggle
            mode={appearance.mode}
            onChange={(value) => {
              storeThemePreference(value);
              setPreference(value);
            }}
          />
          <a className="reader-edit-link" href="index.php?edit=1">
            Administration
          </a>
        </div>
      </header>
      <PublicForm token={token} />
      <PoweredBy />
    </>
  );
}
const target =
  document.getElementById("root") || document.getElementById("app");
if (target)
  createRoot(target).render(
    <React.StrictMode>
      {new URLSearchParams(location.search).get("form") ? (
        <PublicFormScreen
          token={new URLSearchParams(location.search).get("form")!}
        />
      ) : (
        <App />
      )}
    </React.StrictMode>,
  );
