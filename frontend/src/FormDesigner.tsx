import { useState } from "react";
import {
  Check,
  ImagePlus,
  Palette,
  Sparkles,
  TextCursorInput,
  CheckCircle2,
  X,
} from "lucide-react";
import { Select } from "./Select";

import { api, thumbUrl, type FileRecord } from "./types";
import { uploadAttachment, type Property } from "./database-types";
import { formTemplates, type FormDesign } from "./form-design";
export function FormDesigner({
  value,
  onChange,
  properties,
}: {
  value: FormDesign;
  onChange: (patch: Partial<FormDesign>) => void;
  properties: Property[];
}) {
  const [images, setImages] = useState<FileRecord[] | null>(null);
  const [uploading, setUploading] = useState(false),
    [imageError, setImageError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setImageError("");
    try {
      const record = await uploadAttachment(file, () => {});
      onChange({ coverId: record.id });
    } catch (e) {
      setImageError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setUploading(false);
    }
  }
  async function library() {
    setImageError("");
    try {
      const response = await api("files");
      setImages(
        response.files.filter((f: FileRecord) => f.mime.startsWith("image/")),
      );
    } catch (e) {
      setImageError(
        e instanceof Error ? e.message : "Bibliothèque indisponible.",
      );
    }
  }
  const [tab, setTab] = useState("design");
  function text(
    key: keyof FormDesign,
    label: string,
    large = false,
    max = 2000,
  ) {
    return (
      <label key={key}>
        {label}
        {large ? (
          <textarea
            rows={3}
            maxLength={max}
            value={String(value[key])}
            onChange={(e) => onChange({ [key]: e.target.value })}
          />
        ) : (
          <input
            maxLength={max}
            value={String(value[key])}
            onChange={(e) => onChange({ [key]: e.target.value })}
          />
        )}
      </label>
    );
  }
  return (
    <section className="form-designer">
      <header>
        <span>
          <Sparkles size={18} />
          <strong>Un formulaire à votre image</strong>
        </span>
        <p>
          Les textes des questions peuvent différer des noms des colonnes. Les
          données restent dans la même base.
        </p>
      </header>
      <nav
        className="form-designer-tabs"
        aria-label="Personnalisation du formulaire"
      >
        {[
          ["design", "Apparence", Palette],
          ["before", "Avant l’envoi", TextCursorInput],
          ["questions", "Questions", TextCursorInput],
          ["after", "Après l’envoi", CheckCircle2],
        ].map(([id, label, Icon]) => (
          <button
            type="button"
            key={String(id)}
            aria-pressed={tab === id}
            onClick={() => setTab(String(id))}
          >
            {typeof Icon !== "string" && <Icon size={14} />} {String(label)}
          </button>
        ))}
      </nav>
      {tab === "design" && (
        <>
          <div
            className="form-template-grid"
            role="group"
            aria-label="Modèles de formulaire"
          >
            {formTemplates.map((t) => (
              <button
                type="button"
                key={t.id}
                className={`form-template-option template-${t.id}`}
                aria-pressed={value.template === t.id}
                onClick={() =>
                  onChange({
                    template: t.id,
                    font:
                      t.id === "editorial"
                        ? "fraunces"
                        : t.id === "canvas"
                          ? "quicksand"
                          : "sans",
                    alignment: t.id === "editorial" ? "left" : "center",
                  })
                }
              >
                <span className="template-mini" aria-hidden="true">
                  <i />
                  <b />
                  <em />
                  <em />
                  <em />
                  <small />
                </span>
                <strong>
                  {t.name}
                  {value.template === t.id && <Check size={14} />}
                </strong>
                <small>{t.description}</small>
              </button>
            ))}
          </div>
          <div className="form-design-grid">
            <label>
              Animations
              <Select
                aria-label="Animations du formulaire"
                value={value.animation}
                onChange={(e) => onChange({ animation: e.target.value })}
              >
                <option value="none">Sans animation</option>
                <option value="gentle">Douces</option>
                <option value="immersive">
                  Immersives · célébration à l’envoi
                </option>
              </Select>
            </label>
            <label>
              Police
              <Select
                aria-label="Police du formulaire"
                value={value.font}
                onChange={(e) => onChange({ font: e.target.value })}
              >
                <option value="sans">Sans sérif</option>
                <option value="quicksand">Quicksand</option>
                <option value="fraunces">Fraunces</option>
                <option value="mono">Monospace</option>
              </Select>
            </label>
            <label>
              Accent personnalisé
              <input
                type="color"
                aria-label="Couleur du formulaire"
                value={value.accent || "#38795d"}
                onChange={(e) => onChange({ accent: e.target.value })}
              />
              <button
                type="button"
                className="small-button"
                onClick={() => onChange({ accent: "" })}
              >
                Suivre le thème Feuillet
              </button>
            </label>
            <label>
              Alignement
              <Select
                aria-label="Alignement du formulaire"
                value={value.alignment}
                onChange={(e) => onChange({ alignment: e.target.value })}
              >
                <option value="center">Centré</option>
                <option value="left">À gauche</option>
              </Select>
            </label>
            <label>
              Espacement
              <Select
                aria-label="Espacement du formulaire"
                value={value.density}
                onChange={(e) => onChange({ density: e.target.value })}
              >
                <option value="comfortable">Confortable</option>
                <option value="compact">Compact</option>
              </Select>
            </label>
            <label className="database-checkline">
              <input
                type="checkbox"
                checked={value.showNumbers}
                onChange={(e) => onChange({ showNumbers: e.target.checked })}
              />{" "}
              Numéroter les questions
            </label>
          </div>
          <div className="form-cover-controls">
            {value.coverId && (
              <img
                src={thumbUrl(value.coverId, 640)}
                alt="Couverture du formulaire"
              />
            )}
            <label className="small-button form-cover-upload">
              <ImagePlus size={15} />
              {uploading ? "Envoi de l’image…" : "Importer une couverture"}
              <input
                aria-label="Importer une couverture de formulaire"
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              className="small-button"
              onClick={() => void library()}
            >
              Choisir dans la bibliothèque
            </button>
            {images && (
              <div className="form-cover-library">
                {images.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    title={f.name}
                    onClick={() => {
                      onChange({ coverId: f.id });
                      setImages(null);
                    }}
                  >
                    <img src={thumbUrl(f.id, 320)} alt={f.name} />
                  </button>
                ))}
                {!images.length && <p>Aucune image dans la bibliothèque.</p>}
                <button
                  type="button"
                  className="small-button"
                  onClick={() => setImages(null)}
                >
                  Fermer la bibliothèque
                </button>
              </div>
            )}
            {imageError && <p role="alert">{imageError}</p>}
            {value.coverId && (
              <button
                type="button"
                className="small-button"
                onClick={() => onChange({ coverId: "" })}
              >
                <X size={14} />
                Retirer
              </button>
            )}
            <small>
              La couverture d’un formulaire publié devient accessible aux
              visiteurs. Le reste des fichiers reste privé.
            </small>
          </div>
        </>
      )}
      {tab === "before" && (
        <div className="form-design-grid">
          {text("eyebrow", "Petit titre", false, 120)}
          {text("description", "Texte d’accueil", true)}
          {text("badge", "Mention sous le titre", false, 200)}
          {text(
            "introText",
            "Description dans la carte de la page",
            true,
            1000,
          )}
          {text("openLabel", "Bouton pour ouvrir le formulaire", false, 120)}
          {text("submitLabel", "Bouton pour envoyer la réponse", false, 120)}
          {text("submittingLabel", "Texte pendant l’envoi", false, 120)}
          {text("uploadLabel", "Bouton d’ajout de fichiers", false, 120)}
          {text("attachmentNotice", "Information sur les pièces jointes", true)}
          {text("footer", "Texte en bas du formulaire", true)}
        </div>
      )}
      {tab === "questions" && (
        <div className="form-question-designs">
          {properties.map((p) => (
            <details key={p.id}>
              <summary>
                {value.questions[p.id]?.label || p.name}
                <small>Colonne : {p.name}</small>
              </summary>
              {["label", "help", "placeholder"].map((key, i) => (
                <label key={key}>
                  {
                    [
                      "Texte de la question",
                      "Description / consigne",
                      "Exemple dans le champ",
                    ][i]
                  }
                  <input
                    maxLength={key === "help" ? 1000 : 300}
                    value={value.questions[p.id]?.[key as "label"] || ""}
                    placeholder={key === "label" ? p.name : "Facultatif"}
                    onChange={(e) =>
                      onChange({
                        questions: {
                          ...value.questions,
                          [p.id]: {
                            ...value.questions[p.id],
                            [key]: e.target.value,
                          },
                        },
                      })
                    }
                  />
                </label>
              ))}
              <label className="database-checkline">
                <input
                  type="checkbox"
                  checked={value.questions[p.id]?.required ?? p.required}
                  onChange={(e) =>
                    onChange({
                      questions: {
                        ...value.questions,
                        [p.id]: {
                          ...value.questions[p.id],
                          required: e.target.checked,
                        },
                      },
                    })
                  }
                />{" "}
                Obligatoire dans ce formulaire
              </label>
            </details>
          ))}
          {!properties.length && (
            <p>Choisis d’abord les champs de ton formulaire.</p>
          )}
        </div>
      )}
      {tab === "after" && (
        <div className="form-design-grid">
          {text("successEyebrow", "Petit titre de confirmation", false, 120)}
          {text("successTitle", "Titre de confirmation", false, 300)}
          {text("successText", "Message après l’envoi", true)}
          {text("againLabel", "Bouton pour une nouvelle réponse", false, 120)}
          <label className="database-checkline">
            <input
              type="checkbox"
              checked={value.showAgain}
              onChange={(e) => onChange({ showAgain: e.target.checked })}
            />{" "}
            Proposer une nouvelle réponse
          </label>
          {text("previewHint", "Indication dans l’aperçu", false, 300)}
        </div>
      )}
    </section>
  );
}
