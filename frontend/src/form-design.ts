import { adaptiveAccent, contrast, luminance, mixColor } from "./theme-colors";
import type { Property } from "./database-types";
export const formTemplates = [
  { id: "atelier", name: "Atelier", description: "Calme et accueillant" },
  {
    id: "editorial",
    name: "Éditorial",
    description: "De grands titres, du caractère",
  },
  { id: "canvas", name: "Studio", description: "Coloré, précis et graphique" },
  { id: "aurora", name: "Aurore", description: "Lumière et mouvement" },
  {
    id: "minimal",
    name: "Essentiel",
    description: "Toute la place aux réponses",
  },
] as const;
export type QuestionDesign = {
  label?: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
};
export const defaultFormDesign = {
  template: "atelier",
  animation: "gentle",
  font: "sans",
  accent: "",
  alignment: "center",
  density: "comfortable",
  showNumbers: true,
  showAgain: true,
  coverId: "",
  eyebrow: "À vous de jouer",
  description: "Complète les champs ci-dessous, puis envoie ta réponse.",
  badge: "Réponse privée",
  cardEyebrow: "Formulaire",
  cardNote:
    "Réponses et fichiers privés · Seul l’administrateur peut les consulter.",
  introText: "Une réponse à transmettre, simplement.",
  openLabel: "Remplir le formulaire",
  submitLabel: "Envoyer ma réponse",
  submittingLabel: "Envoi en cours…",
  successEyebrow: "Envoi confirmé",
  successTitle: "Ta réponse est bien arrivée.",
  successText:
    "Merci ! Elle sera consultable uniquement par l’administrateur du site.",
  againLabel: "Envoyer une autre réponse",
  footer:
    "Les champs marqués * sont obligatoires. Tes réponses et tes fichiers sont transmis à l’administrateur du site et ne sont pas affichés aux autres visiteurs.",
  attachmentNotice:
    "Les pièces jointes non envoyées avec ta réponse expirent après 24 heures. Les fichiers envoyés restent privés et accessibles à l’administrateur du site.",
  uploadLabel: "Ajouter des fichiers",
  previewHint: "Aperçu : aucune réponse n’est envoyée ici.",
  questions: {} as Record<string, QuestionDesign>,
};
export type FormDesign = typeof defaultFormDesign;
export function formDesign(value?: Partial<FormDesign> | null): FormDesign {
  return {
    ...defaultFormDesign,
    ...value,
    questions:
      value?.questions && !Array.isArray(value.questions)
        ? value.questions
        : {},
  };
}
export function formQuestion(p: Property, design: FormDesign): Property {
  const q = design.questions[p.id];
  return {
    ...p,
    name: q?.label || p.name,
    required: q?.required ?? p.required,
    help: q?.help || "",
    placeholder: q?.placeholder || "",
  };
}

export function formAccent(accent: string, background: string): string {
  if (!accent) return "";
  const bg = /^#[0-9a-f]{6}$/i.test(background) ? background : "#ffffff";
  const mode =
    bg.toLowerCase() === "#000000"
      ? "oled"
      : luminance(bg) < 0.3
        ? "dark"
        : "light";
  const derived = adaptiveAccent(accent, mode, bg);
  if (contrast(derived, bg) >= 4.5) return derived;
  for (let step = 1; step <= 20; step++) {
    const candidate = mixColor(
      derived,
      mode === "light" ? "#000000" : "#FFFFFF",
      step / 20,
    );
    if (contrast(candidate, bg) >= 4.5) return candidate;
  }
  return mode === "light" ? "#000000" : "#FFFFFF";
}
