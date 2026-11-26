import { toLocalDateTime, fromLocalDateTime } from "./database-types";
import { useState } from "react";
import { ColorRule, ruleColors } from "./projection-rules";
export type ProjectionProperty = {
  id: string;
  name: string;
  type: string;
  config?: { options?: string[] };
};
export function ProjectionRules({
  properties,
  rules,
  onSave,
  onClose,
}: {
  properties: ProjectionProperty[];
  rules: ColorRule[];
  onSave: (rules: ColorRule[]) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ColorRule[]>(structuredClone(rules)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const usable = properties.filter((p) =>
    [
      "title",
      "text",
      "number",
      "select",
      "multiselect",
      "checkbox",
      "date",
      "created_at",
      "email",
      "phone",
      "url",
    ].includes(p.type),
  );
  const initial = (id: string) => {
    const p = usable.find((p) => p.id === id)!;
    return p.type === "checkbox"
      ? false
      : p.type === "number"
        ? 0
        : p.config?.options?.[0] || "";
  };
  const patch = (i: number, value: Partial<ColorRule>) =>
    setDraft((d) => d.map((r, j) => (j === i ? { ...r, ...value } : r)));
  return (
    <section className="projection-rules" aria-label="Couleurs conditionnelles">
      <header>
        <div>
          <h2>Des couleurs qui suivent les données</h2>
          <p>
            La première règle qui correspond colore la ligne. Les règles restent
            enregistrées pour cette base.
          </p>
        </div>
        <button type="button" onClick={onClose}>
          Fermer
        </button>
      </header>
      {draft.map((r, i) => {
        const p = usable.find((p) => p.id === r.property);
        return (
          <div className="projection-rule" key={i}>
            <span>Si</span>
            <select
              aria-label={`Colonne de la règle ${i + 1}`}
              value={r.property}
              onChange={(e) =>
                patch(i, {
                  property: e.target.value,
                  operator:
                    usable.find((p) => p.id === e.target.value)?.type ===
                    "multiselect"
                      ? "contains"
                      : "equals",
                  value: initial(e.target.value),
                })
              }
            >
              {usable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              aria-label={`Condition de la règle ${i + 1}`}
              value={r.operator}
              onChange={(e) => patch(i, { operator: e.target.value })}
            >
              <option value="equals">est égal à</option>
              <option value="not_equals">est différent de</option>
              {(p?.type === "number" || p?.type === "created_at") && (
                <>
                  <option value="gt">est supérieur à</option>
                  <option value="lt">est inférieur à</option>
                </>
              )}
              {["text", "title", "multiselect"].includes(p?.type || "") && (
                <option value="contains">contient</option>
              )}
              <option value="empty">n’est pas renseigné</option>
              <option value="not_empty">est renseigné</option>
            </select>
            {!["empty", "not_empty"].includes(r.operator) &&
              (p?.type === "checkbox" ? (
                <select
                  aria-label={`Valeur de la règle ${i + 1}`}
                  value={String(r.value)}
                  onChange={(e) =>
                    patch(i, { value: e.target.value === "true" })
                  }
                >
                  <option value="true">Coché</option>
                  <option value="false">Non coché</option>
                </select>
              ) : p?.type === "select" ? (
                <select
                  aria-label={`Valeur de la règle ${i + 1}`}
                  value={String(r.value ?? "")}
                  onChange={(e) => patch(i, { value: e.target.value })}
                >
                  <option value="">Non renseigné</option>
                  {p.config?.options?.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  aria-label={`Valeur de la règle ${i + 1}`}
                  type={
                    p?.type === "number"
                      ? "number"
                      : p?.type === "date"
                        ? "date"
                        : p?.type === "created_at"
                          ? "datetime-local"
                          : "text"
                  }
                  step={p?.type === "created_at" ? 1 : undefined}
                  value={
                    p?.type === "created_at"
                      ? toLocalDateTime(r.value)
                      : String(r.value ?? "")
                  }
                  onChange={(e) =>
                    patch(i, {
                      value:
                        p?.type === "number"
                          ? Number(e.target.value)
                          : p?.type === "created_at"
                            ? fromLocalDateTime(e.target.value)
                            : e.target.value,
                    })
                  }
                />
              ))}
            <span>alors coloriser en</span>
            <select
              aria-label={`Couleur de la règle ${i + 1}`}
              value={r.color}
              onChange={(e) => patch(i, { color: e.target.value })}
            >
              {Object.entries(ruleColors).map(([v, c]) => (
                <option key={v} value={v}>
                  {c.label}
                </option>
              ))}
            </select>
            <span
              className="projection-color-dot"
              style={{ background: ruleColors[r.color]?.value }}
            />
            <button
              type="button"
              aria-label={`Supprimer la règle ${i + 1}`}
              onClick={() => setDraft((d) => d.filter((_, j) => i !== j))}
            >
              Retirer
            </button>
          </div>
        );
      })}
      {!draft.length && (
        <p>Exemple : si « État » est égal à « Terminé », coloriser en vert.</p>
      )}
      <footer>
        <button
          type="button"
          disabled={busy || draft.length >= 20 || !usable.length}
          onClick={() =>
            setDraft((d) => [
              ...d,
              {
                property: usable[0].id,
                operator:
                  usable[0].type === "multiselect" ? "contains" : "equals",
                value: initial(usable[0].id),
                color: "green",
              },
            ])
          }
        >
          ＋ Ajouter une règle
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onSave(draft);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Enregistrement…" : "Appliquer les règles"}
        </button>
      </footer>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
