import type { CellValue } from "./database-types";
export type ColorRule = {
  property: string;
  operator: string;
  value: CellValue;
  color: string;
};
export const ruleColors: Record<string, { label: string; value: string }> = {
  green: { label: "Vert", value: "#42a779" },
  blue: { label: "Bleu", value: "#538fce" },
  orange: { label: "Orange", value: "#d9913e" },
  rose: { label: "Rose", value: "#ce718e" },
  purple: { label: "Violet", value: "#9774cd" },
  gray: { label: "Gris", value: "#8a929b" },
};
export function ruleMatches(
  rule: ColorRule,
  value: CellValue | undefined,
): boolean {
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && !value.length);
  if (rule.operator === "empty") return empty;
  if (rule.operator === "not_empty") return !empty;
  if (rule.operator === "equals")
    return (
      value === rule.value ||
      (empty && (rule.value === null || rule.value === ""))
    );
  if (rule.operator === "not_equals")
    return !ruleMatches({ ...rule, operator: "equals" }, value);
  if (empty) return false;
  if (rule.operator === "contains")
    return String(value)
      .toLocaleLowerCase()
      .includes(String(rule.value ?? "").toLocaleLowerCase());
  if (typeof value !== "number" || typeof rule.value !== "number") return false;
  return rule.operator === "gt"
    ? value > rule.value
    : rule.operator === "lt"
      ? value < rule.value
      : false;
}
export function rowTint(
  rules: ColorRule[],
  values: Record<string, CellValue>,
): string | undefined {
  const rule = rules.find((r) => ruleMatches(r, values[r.property]));
  return rule ? ruleColors[rule.color]?.value : undefined;
}
