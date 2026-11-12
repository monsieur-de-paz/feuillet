import { Select } from "./Select";
export type ButtonAppearance = {
  buttonStyle?: string;
  buttonSize?: string;
  buttonLabel?: string;
};
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
  showLabel = true,
}: {
  showLabel?: boolean;
  value: ButtonAppearance;
  onChange: (value: ButtonAppearance) => void;
}) {
  return (
    <div className="button-appearance-fields">
      {showLabel && (
        <label>
          Texte du bouton
          <input
            aria-label="Texte du bouton"
            maxLength={120}
            value={value.buttonLabel || ""}
            placeholder="Texte du formulaire"
            onChange={(e) => onChange({ buttonLabel: e.target.value })}
          />
        </label>
      )}
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
        {value.buttonLabel || "Aperçu du bouton"} <span>↗</span>
      </span>
    </div>
  );
}
