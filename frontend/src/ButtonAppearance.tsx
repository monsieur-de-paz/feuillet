import { Select } from "./Select";
export type ButtonAppearance = { buttonStyle?: string; buttonSize?: string };
export function buttonClasses(value: ButtonAppearance = {}) {
  const style = ["solid", "soft", "outline", "minimal"].includes(
    value.buttonStyle || "",
  )
    ? value.buttonStyle
    : "soft";
  const size = ["compact", "regular", "large"].includes(value.buttonSize || "")
    ? value.buttonSize
    : "regular";
  return `resource-button feuillet-action action-${style} action-${size}`;
}
export function ButtonAppearanceFields({
  value,
  onChange,
}: {
  value: ButtonAppearance;
  onChange: (value: ButtonAppearance) => void;
}) {
  return (
    <div className="button-appearance-fields">
      <label>
        Style du bouton
        <Select
          aria-label="Style du bouton"
          value={value.buttonStyle || "soft"}
          onChange={(e) => onChange({ buttonStyle: e.target.value })}
        >
          <option value="soft">Doux</option>
          <option value="solid">Accentué</option>
          <option value="outline">Contour</option>
          <option value="minimal">Discret</option>
        </Select>
      </label>
      <label>
        Taille du bouton
        <Select
          aria-label="Taille du bouton"
          value={value.buttonSize || "regular"}
          onChange={(e) => onChange({ buttonSize: e.target.value })}
        >
          <option value="compact">Compact</option>
          <option value="regular">Standard</option>
          <option value="large">Grand</option>
        </Select>
      </label>
      <span className={buttonClasses(value)} aria-hidden="true">
        Aperçu du bouton <span>↗</span>
      </span>
    </div>
  );
}
