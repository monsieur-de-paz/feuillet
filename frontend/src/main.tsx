import "./style.css";
import "./gallery-layout.css";
import React, { useEffect } from "react";
import { api, defaultAppearance } from "./types";
import { themeStyle } from "./Customization";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PublicForm } from "./Database";
function PublicFormScreen({ token }: { token: string }) {
  useEffect(() => {
    let alive = true;
    void api("settings")
      .then((settings) => {
        if (!alive) return;
        const appearance = { ...defaultAppearance, ...settings.appearance };
        Object.entries(themeStyle(appearance)).forEach(([key, value]) => {
          if (key.startsWith("--"))
            document.documentElement.style.setProperty(key, String(value));
        });
        document.documentElement.style.colorScheme =
          appearance.mode === "light" ? "light" : "dark";
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return <PublicForm token={token} />;
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
