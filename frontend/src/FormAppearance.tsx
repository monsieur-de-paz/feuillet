import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { accentForeground, accentHover } from "./theme-colors";
import { formAccent, type FormDesign } from "./form-design";
export function FormAppearance({
  design,
  children,
  complete = false,
}: {
  design: FormDesign;
  children: ReactNode;
  complete?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [background, setBackground] = useState("#ffffff");
  useEffect(() => {
    const read = () => {
      const v = ref.current?.parentElement;
      if (v)
        setBackground(
          getComputedStyle(v).getPropertyValue("--surface").trim() || "#ffffff",
        );
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-theme", "style"],
    });
    const scope = ref.current?.closest(".app-shell");
    if (scope)
      observer.observe(scope, {
        attributes: true,
        attributeFilter: ["style", "class"],
      });
    return () => observer.disconnect();
  }, []);
  const accent = formAccent(design.accent, background);
  const fonts: Record<string, string> = {
    sans: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    quicksand: "Quicksand,system-ui,sans-serif",
    fraunces: "Fraunces,Georgia,serif",
    mono: "ui-monospace,monospace",
  };
  const style = {
    fontFamily: fonts[design.font],
    ...(accent
      ? {
          "--accent": accent,
          "--accent-contrast": accentForeground(accent),
          "--accent-hover": accentHover(accent),
        }
      : {}),
  } as CSSProperties;
  return (
    <div
      ref={ref}
      style={style}
      className={`form-experience template-${design.template} animation-${design.animation} align-${design.alignment} density-${design.density}${complete ? " is-complete" : ""}`}
    >
      <div className="form-ambient" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {children}
    </div>
  );
}
