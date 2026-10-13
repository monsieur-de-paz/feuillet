import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  CheckSquare,
  ChevronDown,
  Copy,
  Database as DatabaseIcon,
  Download,
  ExternalLink,
  FileText,
  Globe,
  LayoutGrid,
  List,
  LoaderCircle,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  AlertCircle,
  Table,
  BarChart3,
  FormInput,
  Link as LinkIcon,
  RefreshCw,
  Pencil,
} from "lucide-react";
import { useApp } from "./context";
import {
  api,
  ApiError,
  setCsrf,
  fileUrl,
  safeLink,
  sizeLabel,
  type FileRecord,
} from "./types";
import {
  type Database,
  type DatabaseBundle,
  type DatabaseRow,
  type DatabaseForm,
  type Property,
  type PropertyType,
  type CellValue,
  propertyTypes,
  isComputed,
  canUseInForm,
  cellValue,
  rowTitle,
  emptyValues,
  formUrl,
  errorText,
  uploadAttachment,
} from "./database-types";
import "./database.css";

function Loading() {
  return (
    <div className="database-loading">
      <LoaderCircle className="spin" size={18} /> Chargement…
    </div>
  );
}
function ErrorBox({
  message,
  children,
}: {
  message: string;
  children?: ReactNode;
}) {
  return message ? (
    <div className="database-error" role="alert">
      <AlertCircle size={17} />
      <div>
        <p>{message}</p>
        {children}
      </div>
    </div>
  ) : null;
}
const propertyLabel = (type: PropertyType) =>
  propertyTypes.find((p) => p.type === type)?.label || type;
function asArray(value: CellValue | undefined) {
  return Array.isArray(value) ? value.map(String) : [];
}
function displayText(value: CellValue | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number") return value.toLocaleString("fr-FR");
  return String(value);
}
function validateValues(
  properties: Property[],
  values: Record<string, CellValue>,
) {
  const errors: Record<string, string> = {};
  for (const property of properties) {
    const value = values[property.id];
    if (
      property.required &&
      (value === undefined ||
        value === null ||
        value === "" ||
        value === false ||
        (Array.isArray(value) && !value.length))
    )
      errors[property.id] = "Ce champ est obligatoire.";
    if (
      property.type === "email" &&
      typeof value === "string" &&
      value &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    )
      errors[property.id] = "Indique une adresse e-mail valide.";
    if (property.type === "url" && typeof value === "string" && value) {
      try {
        const parsed = new URL(value);
        if (!["https:", "http:"].includes(parsed.protocol)) throw new Error();
      } catch {
        errors[property.id] = "Indique une adresse HTTP ou HTTPS complète.";
      }
    }
  }
  return errors;
}
function downloadDraft(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

type FieldProps = {
  property: Property;
  value: CellValue | undefined;
  onChange: (value: CellValue) => void;
  onUpload: (files: File[]) => void;
  files: Record<string, FileRecord>;
  relationRows?: { row: DatabaseRow; properties: Property[] }[];
  progress?: { name: string; value: number };
  disabled?: boolean;
  error?: string;
};
function Field({
  property,
  value,
  onChange,
  onUpload,
  files,
  relationRows = [],
  progress,
  disabled = false,
  error,
}: FieldProps) {
  const controlId = useId();
  const id = `field-${property.id}-${controlId}`;
  const required = !!property.required;
  const options = property.config?.options || [];
  let input: ReactNode;
  if (isComputed(property))
    input = <input id={id} disabled value={displayText(value)} />;
  else if (property.type === "checkbox")
    input = (
      <label className="database-checkline">
        <input
          id={id}
          type="checkbox"
          required={required}
          checked={value === true}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        Oui
      </label>
    );
  else if (property.type === "select")
    input = (
      <select
        id={id}
        required={required}
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Choisir…</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  else if (property.type === "multiselect")
    input = (
      <div className="database-field-choices" id={id}>
        {options.map((option) => (
          <label key={option}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={asArray(value).includes(option)}
              onChange={() =>
                onChange(
                  asArray(value).includes(option)
                    ? asArray(value).filter((item) => item !== option)
                    : [...asArray(value), option],
                )
              }
            />
            {option}
          </label>
        ))}
      </div>
    );
  else if (property.type === "relation")
    input = (
      <select
        id={id}
        className="database-relation-picker"
        multiple
        disabled={disabled}
        value={asArray(value)}
        onChange={(event) =>
          onChange(
            Array.from(event.target.selectedOptions).map(
              (option) => option.value,
            ),
          )
        }
      >
        {relationRows.map(({ row, properties }) => (
          <option key={row.id} value={row.id}>
            {rowTitle(row, properties)}
          </option>
        ))}
      </select>
    );
  else if (property.type === "files")
    input = (
      <>
        <div className="database-attachment-list">
          {asArray(value).map((fileId, index) => (
            <div key={fileId}>
              <FileText size={15} />
              <span>{files[fileId]?.name || `Fichier ${index + 1}`}</span>
              {!disabled && (
                <button
                  type="button"
                  title="Retirer ce fichier de la réponse"
                  onClick={() =>
                    onChange(asArray(value).filter((id) => id !== fileId))
                  }
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        <label className="database-file-input">
          <Upload size={15} /> Ajouter des fichiers
          <input
            type="file"
            multiple
            disabled={disabled || !!progress}
            aria-label={`Fichiers pour ${property.name}`}
            onChange={(event) => {
              if (event.target.files?.length)
                onUpload(Array.from(event.target.files));
              event.target.value = "";
            }}
          />
        </label>
        {progress && (
          <div className="database-upload-progress" role="status">
            <progress value={progress.value} max={100} />
            <span>
              {progress.name} ·{" "}
              {progress.value < 100 ? `${progress.value} %` : "Vérification…"}
            </span>
          </div>
        )}
      </>
    );
  else if (property.type === "text")
    input = (
      <textarea
        id={id}
        rows={3}
        required={required}
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  else
    input = (
      <input
        id={id}
        type={
          property.type === "number"
            ? "number"
            : property.type === "date"
              ? "date"
              : property.type === "email"
                ? "email"
                : property.type === "phone"
                  ? "tel"
                  : property.type === "url"
                    ? "url"
                    : "text"
        }
        step={property.type === "number" ? "any" : undefined}
        required={required}
        disabled={disabled}
        value={value === null || value === undefined ? "" : String(value)}
        placeholder={
          property.type === "url"
            ? "https://…"
            : property.type === "phone"
              ? "+33 …"
              : undefined
        }
        onChange={(event) =>
          onChange(
            property.type === "number"
              ? event.target.value === ""
                ? null
                : Number(event.target.value)
              : event.target.value,
          )
        }
      />
    );
  return (
    <div className="database-field">
      <label className="database-form-label" htmlFor={id}>
        {property.name}
        {required && (
          <span className="database-required" aria-label="obligatoire">
            *
          </span>
        )}
      </label>
      {input}
      {property.type === "relation" && (
        <small className="database-field-help">
          Sélectionne une ou plusieurs fiches de la base liée.
        </small>
      )}
      {isComputed(property) && (
        <small className="database-field-help">
          Calculé par le serveur à partir des champs de la fiche.
        </small>
      )}
      {error && (
        <span className="database-field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function Cell({
  row,
  property,
  files = {},
  relations = {},
}: {
  row: DatabaseRow;
  property: Property;
  files?: Record<string, FileRecord>;
  relations?: Record<string, string>;
}) {
  const value = cellValue(row, property);
  if (row.errors?.[property.id])
    return (
      <span className="database-cell-error" title={row.errors[property.id]}>
        Calcul indisponible : {row.errors[property.id]}
      </span>
    );
  if (value === null || value === undefined || value === "")
    return <span className="muted">—</span>;
  if (property.type === "checkbox")
    return value ? (
      <Check size={15} aria-label="Oui" />
    ) : (
      <span className="muted">—</span>
    );
  if (property.type === "files")
    return (
      <div className="database-cell-files">
        {asArray(value).map((id, index) => (
          <a key={id} href={fileUrl(id, true)} download>
            <Download size={13} />
            {files[id]?.name || `Fichier ${index + 1}`}
          </a>
        ))}
      </div>
    );
  if (property.type === "multiselect" || property.type === "select")
    return (
      <div className="database-cell-tags">
        {(Array.isArray(value) ? value : [String(value)]).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    );
  if (property.type === "relation")
    return (
      <div className="database-cell-tags">
        {asArray(value).map((id) => (
          <span key={id}>{relations[id] || "Fiche liée"}</span>
        ))}
      </div>
    );
  if (property.type === "url")
    return (
      <a
        href={safeLink(String(value))}
        target="_blank"
        rel="noopener noreferrer"
      >
        {String(value)} <ExternalLink size={11} />
      </a>
    );
  if (property.type === "email")
    return (
      <a href={`mailto:${encodeURIComponent(String(value))}`}>
        {String(value)}
      </a>
    );
  if (property.type === "phone")
    return (
      <a href={`tel:${String(value).replace(/[^+\d]/g, "")}`}>
        {String(value)}
      </a>
    );
  if (property.type === "date" && typeof value === "string") {
    const date = new Date(`${value}T12:00:00`);
    return (
      <span>
        {Number.isNaN(date.getTime())
          ? value
          : date.toLocaleDateString("fr-FR")}
      </span>
    );
  }
  return <span>{displayText(value)}</span>;
}

function Records({
  bundle,
  view,
  onEdit,
  onDelete,
  search = "",
  relationLabels = {},
}: {
  bundle: DatabaseBundle;
  view: "table" | "gallery" | "chart";
  onEdit?: (row: DatabaseRow) => void;
  onDelete?: (row: DatabaseRow) => void;
  search?: string;
  relationLabels?: Record<string, string>;
}) {
  const files = Object.fromEntries(
    (bundle.files || []).map((file) => [file.id, file]),
  );
  const rows = bundle.rows.filter(
    (row) =>
      !search ||
      bundle.properties.some((property) =>
        displayText(cellValue(row, property))
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
  );
  const [chartProperty, setChartProperty] = useState("");
  const numbers = bundle.properties.filter(
    (property) => property.type === "number" || isComputed(property),
  );
  const numeric =
    numbers.find((property) => property.id === chartProperty) || numbers[0];
  if (!bundle.properties.length)
    return (
      <div className="database-empty">
        <DatabaseIcon size={30} />
        Ajoute un champ pour structurer cette base.
      </div>
    );
  if (!rows.length)
    return (
      <div className="database-empty">
        {search
          ? "Aucune fiche ne correspond à la recherche."
          : "Cette base ne contient aucune fiche accessible."}
      </div>
    );
  if (view === "gallery")
    return (
      <div className="database-gallery">
        {rows.map((row) => (
          <div className="database-record-card" key={row.id}>
            {bundle.properties
              .filter((property) => property.type === "files")
              .flatMap((property) => asArray(cellValue(row, property)))
              .find((id) => files[id]?.mime.startsWith("image/")) && (
              <img
                className="database-record-cover"
                src={fileUrl(
                  bundle.properties
                    .filter((property) => property.type === "files")
                    .flatMap((property) => asArray(cellValue(row, property)))
                    .find((id) => files[id]?.mime.startsWith("image/"))!,
                )}
                alt=""
                loading="lazy"
              />
            )}
            <h4>{rowTitle(row, bundle.properties)}</h4>
            <dl>
              {bundle.properties
                .filter((property) => property.type !== "title")
                .slice(0, 6)
                .map((property) => (
                  <div key={property.id}>
                    <dt>{property.name}</dt>
                    <dd>
                      <Cell
                        row={row}
                        property={property}
                        files={files}
                        relations={relationLabels}
                      />
                    </dd>
                  </div>
                ))}
            </dl>
            {onEdit && (
              <button onClick={() => onEdit(row)}>
                <Pencil size={13} /> Modifier la fiche
              </button>
            )}
            {row.visibility === "private" && onEdit && (
              <span className="database-badge">
                <Lock size={11} /> Privée
              </span>
            )}
          </div>
        ))}
      </div>
    );
  if (view === "chart") {
    const values = numeric
      ? rows
          .filter(
            (row) =>
              cellValue(row, numeric) !== null &&
              cellValue(row, numeric) !== "",
          )
          .map((row) => ({
            row,
            value:
              typeof cellValue(row, numeric) === "number" ||
              typeof cellValue(row, numeric) === "string"
                ? Number(cellValue(row, numeric))
                : NaN,
          }))
          .filter((item) => Number.isFinite(item.value))
      : [];
    const max = Math.max(1, ...values.map((item) => Math.abs(item.value)));
    return (
      <div className="database-chart">
        <label className="database-form-label">
          Champ numérique
          <select
            value={numeric?.id || ""}
            onChange={(event) => setChartProperty(event.target.value)}
          >
            {numbers.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </label>
        {!numbers.length ? (
          <p className="database-empty">
            Ajoute un champ nombre ou un calcul numérique pour afficher un
            graphique.
          </p>
        ) : (
          values.slice(0, 50).map(({ row, value }) => (
            <div className="database-chart-line" key={row.id}>
              <span title={rowTitle(row, bundle.properties)}>
                {rowTitle(row, bundle.properties)}
              </span>
              <div className="database-chart-bar">
                <div style={{ width: `${(Math.abs(value) / max) * 100}%` }} />
              </div>
              <span>{value.toLocaleString("fr-FR")}</span>
            </div>
          ))
        )}
        {values.length > 50 && (
          <p className="database-field-help">
            Les 50 premières fiches sont représentées.
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="database-table-wrap">
      <table className="database-table">
        <thead>
          <tr>
            {bundle.properties.map((property) => (
              <th key={property.id}>
                {
                  propertyTypes.find((type) => type.type === property.type)
                    ?.symbol
                }{" "}
                {property.name}
              </th>
            ))}
            {onEdit && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {bundle.properties.map((property) => (
                <td key={property.id}>
                  {onEdit && property.type === "title" ? (
                    <button
                      className="database-row-title"
                      onClick={() => onEdit(row)}
                    >
                      {displayText(cellValue(row, property))}
                    </button>
                  ) : (
                    <Cell
                      row={row}
                      property={property}
                      files={files}
                      relations={relationLabels}
                    />
                  )}
                </td>
              ))}
              {onEdit && (
                <td className="database-row-actions">
                  <button title="Modifier la fiche" onClick={() => onEdit(row)}>
                    <Pencil size={15} />
                  </button>
                  {onDelete && (
                    <button
                      title="Supprimer la fiche"
                      onClick={() => onDelete(row)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  {row.visibility === "private" && (
                    <Lock size={12} aria-label="Fiche privée" />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowEditor({
  bundle,
  row,
  onSaved,
  onClose,
  onDirtyChange,
}: {
  bundle: DatabaseBundle;
  row: DatabaseRow | null;
  onSaved: () => Promise<void>;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [values, setValues] = useState<Record<string, CellValue>>(() => ({
    ...emptyValues(bundle.properties),
    ...row?.values,
  }));
  const [visibility, setVisibility] = useState<"public" | "private">(
    row?.visibility || "public",
  );
  const [version, setVersion] = useState(row?.version);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [relations, setRelations] = useState<
    Record<string, { row: DatabaseRow; properties: Property[] }[]>
  >({});
  const [files, setFiles] = useState<Record<string, FileRecord>>(() =>
    Object.fromEntries((bundle.files || []).map((file) => [file.id, file])),
  );
  const [progress, setProgress] = useState<
    Record<string, { name: string; value: number }>
  >({});
  const valuesRef = useRef(values);
  valuesRef.current = values;
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty]);
  useEffect(() => {
    let cancelled = false;
    void api("files")
      .then(({ files: records }) => {
        if (!cancelled)
          setFiles(
            Object.fromEntries(
              records.map((file: FileRecord) => [file.id, file]),
            ),
          );
      })
      .catch(() => {});
    const targets = [
      ...new Set(
        bundle.properties
          .filter(
            (property) =>
              property.type === "relation" && property.config.target_db_id,
          )
          .map((property) => property.config.target_db_id!),
      ),
    ];
    for (const id of targets)
      void api<DatabaseBundle>("db_get", undefined, { id })
        .then((target) => {
          if (!cancelled)
            setRelations((previous) => ({
              ...previous,
              [id]: target.rows.map((row) => ({
                row,
                properties: target.properties,
              })),
            }));
        })
        .catch((error) => {
          if (!cancelled) setError(errorText(error));
        });
    return () => {
      cancelled = true;
    };
  }, [bundle.database.id]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const blockPageChange = (event: Event) => event.preventDefault();
    document.addEventListener("feuillet:before-page-change", blockPageChange);
    window.addEventListener("beforeunload", prevent);
    return () => {
      window.removeEventListener("beforeunload", prevent);
      document.removeEventListener(
        "feuillet:before-page-change",
        blockPageChange,
      );
    };
  }, [dirty]);
  function change(id: string, value: CellValue) {
    const next = { ...valuesRef.current, [id]: value };
    valuesRef.current = next;
    setValues(next);
    setDirty(true);
    setFieldErrors((previous) => ({ ...previous, [id]: "" }));
  }
  async function upload(property: Property, incoming: File[]) {
    setError("");
    setDirty(true);
    for (const file of incoming) {
      setProgress((previous) => ({
        ...previous,
        [property.id]: { name: file.name, value: 0 },
      }));
      try {
        const record = await uploadAttachment(file, (value) =>
          setProgress((previous) => ({
            ...previous,
            [property.id]: { name: file.name, value },
          })),
        );
        setFiles((previous) => ({ ...previous, [record.id]: record }));
        change(property.id, [
          ...asArray(valuesRef.current[property.id]),
          record.id,
        ]);
      } catch (error) {
        setError(errorText(error));
        break;
      } finally {
        setProgress((previous) => {
          const next = { ...previous };
          delete next[property.id];
          return next;
        });
      }
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateValues(
      bundle.properties.filter((property) => !isComputed(property)),
      values,
    );
    setFieldErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    setError("");
    try {
      await api("row_save", {
        id: row?.id,
        db_id: bundle.database.id,
        values,
        visibility: row?.from_form ? "private" : visibility,
        version,
      });
      setDirty(false);
      await onSaved();
      onClose();
    } catch (error) {
      setError(errorText(error));
      setConflict(error instanceof ApiError && error.status === 409);
    } finally {
      setBusy(false);
    }
  }
  async function reload() {
    if (!row) return;
    if (
      dirty &&
      !confirm(
        "Recharger remplacera les modifications de cette fiche. Continuer ?",
      )
    )
      return;
    try {
      const next = await api<DatabaseBundle>("db_get", undefined, {
        id: bundle.database.id,
      });
      const current = next.rows.find((item) => item.id === row.id);
      if (!current) throw new Error("Cette fiche a été supprimée.");
      setValues({ ...emptyValues(next.properties), ...current.values });
      setVersion(current.version);
      setVisibility(current.visibility);
      setDirty(false);
      setConflict(false);
      setError("");
    } catch (error) {
      setError(errorText(error));
    }
  }
  return (
    <section className="database-editor-card database-row-form">
      <h4>
        {row ? "Modifier une fiche" : "Nouvelle fiche"}{" "}
        {dirty && (
          <span className="database-dirty">
            · modifications non enregistrées
          </span>
        )}
      </h4>
      <ErrorBox message={error}>
        {conflict && (
          <div className="database-conflict-actions">
            <button
              className="small-button"
              type="button"
              onClick={() =>
                downloadDraft({ values, visibility }, "fiche-brouillon.json")
              }
            >
              Sauver une copie
            </button>
            <button
              className="small-button"
              type="button"
              onClick={() => void reload()}
            >
              Recharger la version du serveur
            </button>
          </div>
        )}
      </ErrorBox>
      <form onSubmit={submit}>
        {bundle.properties.map((property) => (
          <Field
            key={property.id}
            property={property}
            value={
              isComputed(property) && row
                ? cellValue(row, property)
                : values[property.id]
            }
            onChange={(value) => change(property.id, value)}
            onUpload={(files) => void upload(property, files)}
            files={files}
            relationRows={relations[property.config.target_db_id || ""]}
            progress={progress[property.id]}
            disabled={busy || isComputed(property)}
            error={fieldErrors[property.id] || row?.errors?.[property.id]}
          />
        ))}
        <label className="database-form-label">
          Visibilité de cette fiche
          <select
            disabled={!!row?.from_form}
            value={row?.from_form ? "private" : visibility}
            onChange={(event) => {
              setVisibility(event.target.value as "public" | "private");
              setDirty(true);
            }}
          >
            <option value="public">Visible si cette base est publiée</option>
            <option value="private">Toujours privée</option>
          </select>
        </label>
        <p className="database-field-help">
          Les réponses envoyées depuis un formulaire restent privées. Leur
          contenu n’est pas publié avec la base.
        </p>
        <div className="database-editor-actions">
          <button
            type="button"
            className="small-button"
            onClick={() => {
              if (!dirty || confirm("Quitter sans enregistrer cette fiche ?"))
                onClose();
            }}
          >
            Annuler
          </button>
          <button
            className="primary-button"
            disabled={busy || Object.keys(progress).length > 0}
          >
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Check size={15} />
            )}{" "}
            Enregistrer la fiche
          </button>
        </div>
      </form>
    </section>
  );
}

function PropertyEditor({
  bundle,
  databases,
  property,
  onSaved,
  onClose,
  onDirtyChange,
}: {
  bundle: DatabaseBundle;
  databases: Database[];
  property: Property | null;
  onSaved: () => Promise<void>;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [name, setName] = useState(property?.name || "");
  const [type, setType] = useState<PropertyType>(property?.type || "text");
  const [required, setRequired] = useState(!!property?.required);
  const [options, setOptions] = useState(
    (property?.config.options || []).join("\n"),
  );
  const [targetDb, setTargetDb] = useState(property?.config.target_db_id || "");
  const [expression, setExpression] = useState(
    property?.config.expression || "",
  );
  const [relationProperty, setRelationProperty] = useState(
    property?.config.relation_property_id || "",
  );
  const [targetProperty, setTargetProperty] = useState(
    property?.config.target_property_id || "",
  );
  const [operation, setOperation] = useState(
    property?.config.operation || "count",
  );
  const [targetProperties, setTargetProperties] = useState<Property[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [preview, setPreview] = useState<{
    value?: CellValue;
    error?: string;
  } | null>(null);
  const [previewRow, setPreviewRow] = useState(bundle.rows[0]?.id || "");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty]);
  useEffect(() => {
    let cancelled = false;
    const relation = bundle.properties.find(
      (item) => item.id === relationProperty,
    );
    const id = type === "rollup" ? relation?.config.target_db_id : targetDb;
    if (id && ["relation", "rollup"].includes(type))
      void api<DatabaseBundle>("db_get", undefined, { id })
        .then((result) => {
          if (!cancelled) setTargetProperties(result.properties);
        })
        .catch((error) => {
          if (!cancelled) setError(errorText(error));
        });
    else setTargetProperties([]);
    return () => {
      cancelled = true;
    };
  }, [targetDb, relationProperty, type]);
  const change = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setDirty(true);
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const config: Property["config"] = {};
    if (["select", "multiselect"].includes(type))
      config.options = [
        ...new Set(
          options
            .split(/\n/)
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ];
    if (type === "relation") config.target_db_id = targetDb;
    if (type === "formula") config.expression = expression;
    if (type === "rollup")
      Object.assign(config, {
        relation_property_id: relationProperty,
        target_property_id: targetProperty,
        operation,
      });
    try {
      await api("property_save", {
        id: property?.id,
        db_id: bundle.database.id,
        name,
        type,
        config,
        required: !["formula", "rollup"].includes(type) && required,
        sort_order: property?.sort_order ?? bundle.properties.length * 10,
        version: property?.version,
      });
      setDirty(false);
      await onSaved();
      onClose();
    } catch (error) {
      setError(errorText(error));
      setConflict(error instanceof ApiError && error.status === 409);
    } finally {
      setBusy(false);
    }
  }
  async function computePreview() {
    setBusy(true);
    setPreview(null);
    try {
      setPreview(
        await api("formula_preview", {
          db_id: bundle.database.id,
          expression,
          row_id: previewRow || undefined,
        }),
      );
    } catch (error) {
      setPreview({ error: errorText(error) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="database-editor-card">
      <h4>{property ? "Modifier le champ" : "Ajouter un champ"}</h4>
      <ErrorBox message={error}>
        {conflict && (
          <div className="database-conflict-actions">
            <button
              className="small-button"
              onClick={() =>
                downloadDraft(
                  {
                    name,
                    type,
                    required,
                    options,
                    targetDb,
                    expression,
                    relationProperty,
                    targetProperty,
                    operation,
                  },
                  "champ-brouillon.json",
                )
              }
            >
              Sauver une copie
            </button>
            <button
              className="small-button"
              onClick={() => {
                if (
                  confirm("Recharger et fermer ce brouillon non enregistré ?")
                )
                  void onSaved().then(onClose);
              }}
            >
              Recharger la version du serveur
            </button>
          </div>
        )}
      </ErrorBox>
      <form onSubmit={submit}>
        <label>
          Nom du champ
          <input
            required
            value={name}
            onChange={(event) => change(setName, event.target.value)}
          />
        </label>
        <label>
          Type
          <select
            aria-label="Type de champ"
            value={type}
            onChange={(event) =>
              change(setType, event.target.value as PropertyType)
            }
          >
            {propertyTypes.map((item) => (
              <option value={item.type} key={item.type}>
                {item.symbol} {item.label}
              </option>
            ))}
          </select>
        </label>
        {["select", "multiselect"].includes(type) && (
          <label>
            Choix proposés, un par ligne
            <textarea
              required
              rows={4}
              value={options}
              onChange={(event) => change(setOptions, event.target.value)}
            />
          </label>
        )}
        {type === "relation" && (
          <label>
            Base liée
            <select
              required
              value={targetDb}
              onChange={(event) => change(setTargetDb, event.target.value)}
            >
              <option value="">Choisir une base…</option>
              {databases.map((database) => (
                <option key={database.id} value={database.id}>
                  {database.name}
                </option>
              ))}
            </select>
            <small className="database-field-help">
              La relation sélectionne de vraies fiches de cette base. Elle reste
              accessible à l’enseignant.
            </small>
          </label>
        )}
        {type === "formula" && (
          <>
            <label>
              Expression
              <textarea
                required
                value={expression}
                placeholder={'if(prop("Note") >= 10, "Validé", "À revoir")'}
                onChange={(event) => change(setExpression, event.target.value)}
              />
            </label>
            <p className="database-formula-reference">
              Champs : <code>prop("Nom du champ")</code>. Fonctions :{" "}
              <code>if</code>, <code>concat</code>, <code>round</code>,{" "}
              <code>sum</code>, <code>count</code>, <code>avg</code>,{" "}
              <code>min</code>, <code>max</code>, <code>abs</code>,{" "}
              <code>floor</code>, <code>ceil</code>, <code>empty</code>,{" "}
              <code>contains</code>. Opérateurs : + − * / % ^, == != &gt; &gt;=
              &lt; &lt;=, && || !.
            </p>
            <label className="database-form-label">
              Fiche pour la prévisualisation
              <select
                value={previewRow}
                onChange={(event) => setPreviewRow(event.target.value)}
              >
                <option value="">Fiche vide</option>
                {bundle.rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {rowTitle(row, bundle.properties)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="small-button"
              disabled={busy || !expression.trim()}
              onClick={() => void computePreview()}
            >
              Prévisualiser le calcul
            </button>
            {preview && (
              <div className="database-computed-preview" role="status">
                {preview.error ? (
                  `Calcul indisponible : ${preview.error}`
                ) : (
                  <>
                    Résultat calculé par le serveur :{" "}
                    <strong>{displayText(preview.value)}</strong>
                  </>
                )}
              </div>
            )}
          </>
        )}
        {type === "rollup" && (
          <>
            <label>
              Champ relation
              <select
                required
                value={relationProperty}
                onChange={(event) => {
                  change(setRelationProperty, event.target.value);
                  setTargetProperty("");
                }}
              >
                <option value="">Choisir une relation…</option>
                {bundle.properties
                  .filter(
                    (item) =>
                      item.type === "relation" && item.id !== property?.id,
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Champ des fiches liées
              <select
                required
                value={targetProperty}
                onChange={(event) =>
                  change(setTargetProperty, event.target.value)
                }
              >
                <option value="">Choisir un champ…</option>
                {targetProperties.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Calcul
              <select
                value={operation}
                onChange={(event) => change(setOperation, event.target.value)}
              >
                <option value="count">Nombre de valeurs</option>
                <option value="sum">Somme</option>
                <option value="avg">Moyenne</option>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
              </select>
            </label>
            <p className="database-field-help">
              Le résultat suit les fiches réellement liées à chaque
              enregistrement.
            </p>
          </>
        )}
        {!["formula", "rollup"].includes(type) && (
          <label className="database-checkline">
            <input
              type="checkbox"
              checked={required}
              onChange={(event) => change(setRequired, event.target.checked)}
            />
            Champ obligatoire dans les fiches et les formulaires qui l’utilisent
          </label>
        )}
        {property && (
          <p className="database-field-help">
            Les valeurs existantes conservent ce champ. Si tu changes son type,
            vérifie leur compatibilité avant de modifier les fiches.
          </p>
        )}
        <div className="database-editor-actions">
          <button
            className="small-button"
            type="button"
            onClick={() => {
              if (!dirty || confirm("Quitter sans enregistrer ce champ ?"))
                onClose();
            }}
          >
            Annuler
          </button>
          <button
            className="primary-button"
            disabled={
              busy ||
              (type === "relation" && !targetDb) ||
              (type === "rollup" && (!relationProperty || !targetProperty))
            }
          >
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Check size={15} />
            )}{" "}
            Enregistrer le champ
          </button>
        </div>
      </form>
    </section>
  );
}

function FormBuilder({
  bundle,
  form,
  onSaved,
  onClose,
  onDirtyChange,
}: {
  bundle: DatabaseBundle;
  form: DatabaseForm | null;
  onSaved: () => Promise<void>;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [name, setName] = useState(form?.name || "");
  const [fields, setFields] = useState<string[]>(form?.fields || []);
  const [published, setPublished] = useState(!!form?.public);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [preview, setPreview] = useState(false);
  const eligible = bundle.properties.filter(canUseInForm);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty]);
  const selected = fields
    .map((id) => eligible.find((property) => property.id === id))
    .filter((property): property is Property => !!property);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected.length) {
      setError("Choisis au moins un champ pour ce formulaire.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("form_save", {
        id: form?.id,
        db_id: bundle.database.id,
        name,
        fields: fields.filter((id) =>
          eligible.some((property) => property.id === id),
        ),
        public: published,
        version: form?.version,
      });
      setDirty(false);
      await onSaved();
      onClose();
    } catch (error) {
      setError(errorText(error));
      setConflict(error instanceof ApiError && error.status === 409);
    } finally {
      setBusy(false);
    }
  }
  async function toggleRequired(property: Property) {
    setBusy(true);
    setError("");
    try {
      await api("property_save", { ...property, required: !property.required });
      await onSaved();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  function reorder(id: string, direction: number) {
    const next = [...fields];
    const index = next.indexOf(id);
    if (index < 0 || index + direction < 0 || index + direction >= next.length)
      return;
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    setFields(next);
    setDirty(true);
  }
  return (
    <section className="database-editor-card">
      <h4>{form ? "Configurer le formulaire" : "Créer un formulaire"}</h4>
      <ErrorBox message={error}>
        {conflict && (
          <div className="database-conflict-actions">
            <button
              className="small-button"
              onClick={() =>
                downloadDraft(
                  { name, fields, public: published },
                  "formulaire-brouillon.json",
                )
              }
            >
              Sauver une copie
            </button>
            <button
              className="small-button"
              onClick={() => {
                if (
                  confirm("Recharger et fermer ce brouillon non enregistré ?")
                )
                  void onSaved().then(onClose);
              }}
            >
              Recharger la version du serveur
            </button>
          </div>
        )}
      </ErrorBox>
      <form onSubmit={submit}>
        <label>
          Titre du formulaire
          <input
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setDirty(true);
            }}
          />
        </label>
        <p className="database-field-help">
          Sélectionne les questions à présenter. Le nom et le type des questions
          viennent des champs de la base. Le réglage « Obligatoire » est partagé
          avec les fiches et les autres formulaires qui utilisent ce champ. Les
          relations et les calculs restent internes.
        </p>
        <div className="database-form-fields">
          {eligible.map((property) => (
            <div key={property.id} className="database-form-field-row">
              <input
                type="checkbox"
                aria-label={`Inclure ${property.name}`}
                checked={fields.includes(property.id)}
                onChange={() => {
                  setFields(
                    fields.includes(property.id)
                      ? fields.filter((id) => id !== property.id)
                      : [...fields, property.id],
                  );
                  setDirty(true);
                }}
              />
              <span>
                {property.name}
                {property.required && " *"}
                <small>
                  {propertyLabel(property.type)}
                  {fields.includes(property.id)
                    ? ` · question ${fields.indexOf(property.id) + 1}`
                    : ""}
                </small>
              </span>
              {fields.includes(property.id) && (
                <>
                  <label className="database-checkline database-question-required">
                    <input
                      type="checkbox"
                      aria-label={`Question ${property.name} obligatoire`}
                      checked={property.required}
                      disabled={busy}
                      onChange={() => void toggleRequired(property)}
                    />{" "}
                    Obligatoire
                  </label>
                  <button
                    type="button"
                    title="Monter la question"
                    disabled={fields.indexOf(property.id) === 0}
                    onClick={() => reorder(property.id, -1)}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    title="Descendre la question"
                    disabled={fields.indexOf(property.id) === fields.length - 1}
                    onClick={() => reorder(property.id, 1)}
                  >
                    <ArrowDown size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        {!eligible.length && (
          <p className="database-empty">
            Ajoute un champ texte, choix, date, fichier ou coordonnées pour
            commencer.
          </p>
        )}
        <label className="database-checkline">
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => {
              setPublished(event.target.checked);
              setDirty(true);
            }}
          />
          Rendre le formulaire accessible par son lien
        </label>
        <div className="database-private-note">
          <ShieldCheck size={17} />
          <span>
            Le formulaire collecte les réponses dans cette base. Ces réponses et
            leurs pièces jointes restent privées, même si le formulaire ou la
            base est public.
          </span>
        </div>
        {form?.public && (
          <a
            href={formUrl(form.token)}
            target="_blank"
            rel="noopener noreferrer"
            className="database-form-link"
          >
            {formUrl(form.token)}
          </a>
        )}
        <div className="database-editor-actions">
          <button
            type="button"
            className="small-button"
            onClick={() => setPreview(!preview)}
          >
            {preview ? "Fermer l’aperçu" : "Prévisualiser les questions"}
          </button>
          <button
            className="small-button"
            type="button"
            onClick={() => {
              if (!dirty || confirm("Quitter sans enregistrer le formulaire ?"))
                onClose();
            }}
          >
            Annuler
          </button>
          <button
            className="primary-button"
            disabled={busy || !selected.length}
          >
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Check size={15} />
            )}{" "}
            Enregistrer le formulaire
          </button>
        </div>
      </form>
      {preview && (
        <div className="database-form-preview">
          <h4>{name || "Aperçu du formulaire"}</h4>
          <PublicFormFields
            form={{
              id: form?.id || "",
              db_id: bundle.database.id,
              name,
              fields,
              public: false,
              token: "",
              version: 0,
            }}
            properties={selected}
            preview
          />
        </div>
      )}
    </section>
  );
}

function PublicFormFields({
  form,
  properties,
  preview = false,
}: {
  form: DatabaseForm;
  properties: Property[];
  preview?: boolean;
}) {
  const [values, setValues] = useState<Record<string, CellValue>>(() =>
    emptyValues(properties),
  );
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const [files, setFiles] = useState<Record<string, FileRecord>>({});
  const [progress, setProgress] = useState<
    Record<string, { name: string; value: number }>
  >({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [website, setWebsite] = useState("");
  function change(id: string, value: CellValue) {
    const next = { ...valuesRef.current, [id]: value };
    valuesRef.current = next;
    setValues(next);
    setFieldErrors((previous) => ({ ...previous, [id]: "" }));
  }
  async function upload(property: Property, incoming: File[]) {
    if (preview) return;
    setError("");
    for (const file of incoming) {
      setProgress((previous) => ({
        ...previous,
        [property.id]: { name: file.name, value: 0 },
      }));
      try {
        const record = await uploadAttachment(
          file,
          (value) =>
            setProgress((previous) => ({
              ...previous,
              [property.id]: { name: file.name, value },
            })),
          form.token,
        );
        setFiles((previous) => ({ ...previous, [record.id]: record }));
        change(property.id, [
          ...asArray(valuesRef.current[property.id]),
          record.id,
        ]);
      } catch (error) {
        setError(errorText(error));
        break;
      } finally {
        setProgress((previous) => {
          const next = { ...previous };
          delete next[property.id];
          return next;
        });
      }
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (preview) return;
    const validation = validateValues(properties, values);
    setFieldErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    setError("");
    try {
      const session = await api<{ csrf: string }>("session");
      setCsrf(session.csrf);
      await api("form_submit", { token: form.token, values, website });
      setSubmitted(true);
      setValues(emptyValues(properties));
      setFiles({});
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  if (submitted)
    return (
      <div className="database-success" role="status">
        <Check size={22} />
        <h3>Ta réponse a bien été envoyée.</h3>
        <p>Merci ! Elle sera consultable uniquement par l’enseignant.</p>
        <button className="small-button" onClick={() => setSubmitted(false)}>
          Envoyer une autre réponse
        </button>
      </div>
    );
  return (
    <form className="public-database-form" onSubmit={submit}>
      {!preview && <h2>{form.name}</h2>}
      <ErrorBox message={error} />
      {properties.map((property) => (
        <Field
          key={property.id}
          property={property}
          value={values[property.id]}
          onChange={(value) => change(property.id, value)}
          onUpload={(incoming) => void upload(property, incoming)}
          files={files}
          progress={progress[property.id]}
          disabled={busy || (preview && property.type === "files")}
          error={fieldErrors[property.id]}
        />
      ))}
      <div className="database-honeypot" aria-hidden="true">
        <label>
          Site web
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>
      {preview ? (
        <p className="database-form-footer">
          Aperçu des questions : aucune réponse n’est envoyée ici.
        </p>
      ) : (
        <>
          <button
            className="primary-button"
            disabled={busy || Object.keys(progress).length > 0}
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <ArrowUpRight size={16} />
            )}{" "}
            Envoyer ma réponse
          </button>
          <p className="database-form-footer">
            Les champs marqués * sont obligatoires. Tes réponses et tes fichiers
            sont transmis à l’enseignant et ne sont pas affichés aux autres
            visiteurs.
          </p>
        </>
      )}
    </form>
  );
}

export function PublicForm({ token }: { token: string }) {
  const [data, setData] = useState<{
    form: DatabaseForm;
    properties: Property[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    void api<{ csrf: string }>("session")
      .then((session) => {
        setCsrf(session.csrf);
        return api<{ form: DatabaseForm; properties: Property[] }>(
          "form_get",
          undefined,
          { token },
        );
      })
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((error) => {
        if (!cancelled) setError(errorText(error));
      });
    return () => {
      cancelled = true;
    };
  }, [token]);
  if (error)
    return (
      <div className="public-database-form">
        <h2>Formulaire indisponible</h2>
        <ErrorBox message={error} />
      </div>
    );
  if (!data) return <Loading />;
  const properties = data.form.fields
    .map((id) => data.properties.find((property) => property.id === id))
    .filter(
      (property): property is Property => !!property && canUseInForm(property),
    );
  return (
    <PublicFormFields
      key={`${data.form.id}-${data.form.version}`}
      form={data.form}
      properties={properties}
    />
  );
}

export type DatabaseManagerProps = {
  mode?: "manage" | "database" | "form";
  initialDatabaseId?: string;
  initialFormId?: string;
  onClose?: () => void;
  onChooseDatabase?: (id: string) => void;
  onChooseForm?: (id: string) => void;
};
export function DatabaseManager({
  mode = "manage",
  initialDatabaseId,
  initialFormId,
  onClose,
  onChooseDatabase,
  onChooseForm,
}: DatabaseManagerProps) {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedId, setSelectedId] = useState(initialDatabaseId || "");
  const [bundle, setBundle] = useState<DatabaseBundle | null>(null);
  const [tab, setTab] = useState<"records" | "properties" | "forms">(
    initialFormId || mode === "form" ? "forms" : "records",
  );
  const [view, setView] = useState<"table" | "gallery" | "chart">("table");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [propertyEditor, setPropertyEditor] = useState<
    Property | null | undefined
  >(undefined);
  const [rowEditor, setRowEditor] = useState<DatabaseRow | null | undefined>(
    undefined,
  );
  const [formEditor, setFormEditor] = useState<DatabaseForm | null | undefined>(
    undefined,
  );
  const [relationLabels, setRelationLabels] = useState<Record<string, string>>(
    {},
  );
  const initialFormOpened = useRef(false);
  const managerRef = useRef<HTMLDivElement>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const dirtyRef = useRef(editorDirty);
  dirtyRef.current = editorDirty;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  async function loadList() {
    const response = await api<{ databases: Database[] }>("db_list");
    setDatabases(response.databases || []);
    return response.databases || [];
  }
  async function refresh() {
    if (!selectedId) return;
    const data = await api<DatabaseBundle>("db_get", undefined, {
      id: selectedId,
    });
    setBundle({
      ...data,
      forms: data.forms || [],
      rows: data.rows || [],
      properties: data.properties || [],
    });
    await loadList();
  }
  useEffect(() => {
    let cancelled = false;
    void loadList()
      .then((list) => {
        if (!cancelled && !selectedId && list.length) setSelectedId(list[0].id);
        else if (!cancelled && !list.length) setLoading(false);
      })
      .catch((error) => {
        if (!cancelled) {
          setError(errorText(error));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (initialDatabaseId) setSelectedId(initialDatabaseId);
  }, [initialDatabaseId]);
  useEffect(() => {
    if (!selectedId) {
      setBundle(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setBundle(null);
    setRowEditor(undefined);
    setPropertyEditor(undefined);
    setFormEditor(undefined);
    setSearch("");
    void api<DatabaseBundle>("db_get", undefined, { id: selectedId })
      .then((data) => {
        if (cancelled) return;
        const normal = {
          ...data,
          forms: data.forms || [],
          rows: data.rows || [],
          properties: data.properties || [],
        };
        setBundle(normal);
        if (initialFormId && !initialFormOpened.current) {
          const form = normal.forms.find((form) => form.id === initialFormId);
          if (form) {
            setFormEditor(form);
            setTab("forms");
            initialFormOpened.current = true;
          }
        }
      })
      .catch((error) => {
        if (!cancelled) setError(errorText(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);
  useEffect(() => {
    if (!bundle) return;
    let cancelled = false;
    setRelationLabels({});
    const targets = [
      ...new Set(
        bundle.properties
          .filter(
            (property) =>
              property.type === "relation" && property.config.target_db_id,
          )
          .map((property) => property.config.target_db_id!),
      ),
    ];
    for (const id of targets)
      void api<DatabaseBundle>("db_get", undefined, { id })
        .then((data) => {
          if (!cancelled)
            setRelationLabels((previous) => ({
              ...previous,
              ...Object.fromEntries(
                data.rows.map((row) => [
                  row.id,
                  rowTitle(row, data.properties),
                ]),
              ),
            }));
        })
        .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [bundle]);
  async function mutate(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (!newName.trim()) return;
    await mutate(async () => {
      const { database } = await api<{ database: Database }>("db_save", {
        name: newName.trim(),
      });
      try {
        await api("property_save", {
          db_id: database.id,
          name: "Nom",
          type: "title",
          config: {},
          required: false,
          sort_order: 0,
        });
      } catch (error) {
        setError(
          `La base a été créée. Le champ par défaut n’a pas pu être ajouté : ${errorText(error)}`,
        );
      }
      await loadList();
      setSelectedId(database.id);
      setNewName("");
      setTab("records");
      setPropertyEditor(undefined);
    });
  }
  async function visibility() {
    if (!bundle) return;
    const next = bundle.database.visibility === "public" ? "private" : "public";
    if (
      next === "public" &&
      !confirm(
        "Les fiches marquées publiques seront visibles lorsque cette base sera insérée dans une page publiée. Les réponses de formulaires restent privées. Continuer ?",
      )
    )
      return;
    await mutate(async () => {
      await api("db_save", {
        id: bundle.database.id,
        name: bundle.database.name,
        visibility: next,
        version: bundle.database.version,
      });
      await refresh();
    });
  }
  async function renameDatabase() {
    if (!bundle) return;
    const name = prompt("Nom de la base", bundle.database.name);
    if (name === null || !name.trim()) return;
    await mutate(async () => {
      await api("db_save", {
        id: bundle.database.id,
        name: name.trim(),
        visibility: bundle.database.visibility,
        version: bundle.database.version,
      });
      await refresh();
    });
  }
  async function deleteDatabase() {
    if (
      !bundle ||
      !confirm(
        `Supprimer « ${bundle.database.name} », ses fiches et ses formulaires ? Cette action ne peut pas être annulée.`,
      )
    )
      return;
    await mutate(async () => {
      await api("db_delete", {
        id: bundle.database.id,
        version: bundle.database.version,
      });
      setBundle(null);
      const list = await loadList();
      setSelectedId(list[0]?.id || "");
    });
  }
  async function deleteRow(row: DatabaseRow) {
    if (
      !bundle ||
      !confirm(`Supprimer la fiche « ${rowTitle(row, bundle.properties)} » ?`)
    )
      return;
    await mutate(async () => {
      await api("row_delete", { id: row.id, version: row.version });
      await refresh();
    });
  }
  async function deleteProperty(property: Property) {
    if (
      !confirm(
        `Supprimer le champ « ${property.name} » ? Ses valeurs ne seront plus disponibles dans les fiches.`,
      )
    )
      return;
    await mutate(async () => {
      await api("property_delete", {
        id: property.id,
        version: property.version,
      });
      await refresh();
    });
  }
  function navigateTab(next: typeof tab) {
    if (editorDirty) {
      if (
        !confirm(
          "Fermer l’éditeur en cours ? Les modifications non enregistrées seront perdues.",
        )
      )
        return;
    }
    setRowEditor(undefined);
    setPropertyEditor(undefined);
    setFormEditor(undefined);
    setTab(next);
  }
  async function toggleForm(form: DatabaseForm) {
    await mutate(async () => {
      await api("form_save", { ...form, public: !form.public });
      await refresh();
    });
  }
  async function copyLink(form: DatabaseForm) {
    try {
      await navigator.clipboard.writeText(formUrl(form.token));
      setError("");
    } catch {
      setError(
        "La copie automatique est indisponible. Sélectionne le lien affiché pour le copier.",
      );
    }
  }
  async function reloadDatabase() {
    if (
      editorDirty &&
      !confirm(
        "Actualiser fermera l’éditeur en cours et remplacera ses modifications non enregistrées. Continuer ?",
      )
    )
      return;
    setRowEditor(undefined);
    setPropertyEditor(undefined);
    setFormEditor(undefined);
    setEditorDirty(false);
    await mutate(refresh);
  }
  function closeManager() {
    if (
      editorDirty &&
      !confirm("Quitter sans enregistrer les modifications en cours ?")
    )
      return;
    onClose?.();
  }
  function editRow(row: DatabaseRow | null) {
    if (
      editorDirty &&
      !confirm("Remplacer l’éditeur en cours sans enregistrer ?")
    )
      return;
    setRowEditor(row);
    setEditorDirty(false);
  }
  function editProperty(property: Property | null) {
    if (
      editorDirty &&
      !confirm("Remplacer l’éditeur en cours sans enregistrer ?")
    )
      return;
    setPropertyEditor(property);
    setEditorDirty(false);
  }
  function editForm(form: DatabaseForm | null) {
    if (
      editorDirty &&
      !confirm("Remplacer l’éditeur en cours sans enregistrer ?")
    )
      return;
    setFormEditor(form);
    setEditorDirty(false);
  }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    managerRef.current
      ?.querySelector<HTMLElement>("button,input,select")
      ?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (
          dirtyRef.current &&
          !confirm("Quitter sans enregistrer les modifications en cours ?")
        )
          return;
        closeRef.current?.();
      }
      if (event.key === "Tab" && closeRef.current) {
        const controls = managerRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
        );
        if (!controls?.length) return;
        const first = controls[0],
          last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    if (!editorDirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const blockPageChange = (event: Event) => event.preventDefault();
    document.addEventListener("feuillet:before-page-change", blockPageChange);
    window.addEventListener("beforeunload", prevent);
    return () => {
      window.removeEventListener("beforeunload", prevent);
      document.removeEventListener(
        "feuillet:before-page-change",
        blockPageChange,
      );
    };
  }, [editorDirty]);
  const chooseFormMode = mode === "form";
  return (
    <div ref={managerRef} className="database-manager">
      <header className="database-manager-header">
        <div>
          <DatabaseIcon size={23} />
          <span>
            <h2>
              {mode === "database"
                ? "Choisir une base"
                : mode === "form"
                  ? "Choisir un formulaire"
                  : "Bases & formulaires"}
            </h2>
            <small>
              Des fiches structurées, des liens entre elles et des réponses
              privées.
            </small>
          </span>
        </div>
        {onClose && (
          <button
            className="icon-button"
            title="Fermer les bases"
            onClick={closeManager}
          >
            <X size={18} />
          </button>
        )}
      </header>
      <div className="database-manager-shell">
        <aside className="database-list">
          <div className="database-list-label">Mes bases</div>
          {databases.map((database) => (
            <button
              key={database.id}
              className={database.id === selectedId ? "active" : ""}
              onClick={() => {
                if (
                  editorDirty &&
                  !confirm("Quitter l’éditeur en cours sans enregistrer ?")
                )
                  return;
                setSelectedId(database.id);
              }}
            >
              <DatabaseIcon size={15} />
              <span>{database.name}</span>
              {database.visibility === "private" ? (
                <Lock size={11} />
              ) : (
                <Globe size={11} />
              )}
            </button>
          ))}
          <form
            className="database-create-box"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <input
              aria-label="Nom d’une nouvelle base"
              placeholder="Nom d’une nouvelle base…"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <button className="small-button" disabled={busy || !newName.trim()}>
              <Plus size={13} /> Créer une base
            </button>
          </form>
        </aside>
        <section className="database-workspace">
          <ErrorBox message={error} />
          {loading ? (
            <Loading />
          ) : bundle ? (
            <>
              <div className="database-title-bar">
                <h3>{bundle.database.name}</h3>
                <div className="database-title-actions">
                  <button
                    className="small-button"
                    disabled={busy}
                    onClick={() => void visibility()}
                  >
                    {bundle.database.visibility === "public" ? (
                      <Globe size={13} />
                    ) : (
                      <Lock size={13} />
                    )}{" "}
                    {bundle.database.visibility === "public"
                      ? "Publique"
                      : "Privée"}
                  </button>
                  <button
                    className="icon-button"
                    title="Actualiser la base"
                    aria-label="Actualiser la base"
                    disabled={busy}
                    onClick={() => void reloadDatabase()}
                  >
                    <RefreshCw
                      size={15}
                      className={busy ? "spin" : undefined}
                    />
                  </button>
                  <button
                    className="icon-button"
                    title="Renommer la base"
                    onClick={() => void renameDatabase()}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button danger"
                    title="Supprimer la base"
                    disabled={busy}
                    onClick={() => void deleteDatabase()}
                  >
                    <Trash2 size={15} />
                  </button>
                  {mode === "database" && onChooseDatabase && (
                    <button
                      className="database-choice-button"
                      onClick={() => {
                        if (
                          !editorDirty ||
                          confirm(
                            "Fermer les modifications non enregistrées avant d’insérer cette base ?",
                          )
                        )
                          onChooseDatabase(bundle.database.id);
                      }}
                    >
                      <Check size={15} /> Insérer cette base
                    </button>
                  )}
                </div>
              </div>
              <nav className="database-tabs" aria-label="Vues de la base">
                <button
                  className={tab === "records" ? "active" : ""}
                  onClick={() => navigateTab("records")}
                >
                  <Table size={14} /> Fiches ({bundle.rows.length})
                </button>
                <button
                  className={tab === "properties" ? "active" : ""}
                  onClick={() => navigateTab("properties")}
                >
                  <Settings size={14} /> Champs ({bundle.properties.length})
                </button>
                <button
                  className={tab === "forms" ? "active" : ""}
                  onClick={() => navigateTab("forms")}
                >
                  <FormInput size={14} /> Formulaires ({bundle.forms.length})
                </button>
              </nav>
              {tab === "records" && (
                <>
                  {rowEditor !== undefined && (
                    <RowEditor
                      key={rowEditor?.id || "new"}
                      bundle={bundle}
                      row={rowEditor}
                      onSaved={refresh}
                      onDirtyChange={setEditorDirty}
                      onClose={() => setRowEditor(undefined)}
                    />
                  )}
                  <div className="database-tools">
                    <div className="database-search">
                      <Search size={15} />
                      <input
                        aria-label="Chercher dans les fiches"
                        placeholder="Rechercher une fiche…"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </div>
                    <div className="database-view-switch">
                      <button
                        className={view === "table" ? "active" : ""}
                        onClick={() => setView("table")}
                      >
                        <Table size={13} /> Tableau
                      </button>
                      <button
                        className={view === "gallery" ? "active" : ""}
                        onClick={() => setView("gallery")}
                      >
                        <LayoutGrid size={13} /> Galerie
                      </button>
                      <button
                        className={view === "chart" ? "active" : ""}
                        onClick={() => setView("chart")}
                      >
                        <BarChart3 size={13} /> Graphique
                      </button>
                    </div>
                    <button
                      className="small-button"
                      disabled={busy || !bundle.properties.length}
                      onClick={() => editRow(null)}
                    >
                      <Plus size={14} /> Nouvelle fiche
                    </button>
                  </div>
                  <Records
                    bundle={bundle}
                    view={view}
                    search={search}
                    relationLabels={relationLabels}
                    onEdit={editRow}
                    onDelete={(row) => void deleteRow(row)}
                  />
                  <div className="database-statusline">
                    <ShieldCheck size={13} />
                    {
                      bundle.rows.filter((row) => row.visibility === "private")
                        .length
                    }{" "}
                    fiche(s) privée(s). Les réponses des formulaires restent
                    privées.
                  </div>
                </>
              )}
              {tab === "properties" && (
                <>
                  {propertyEditor !== undefined && (
                    <PropertyEditor
                      key={propertyEditor?.id || "new"}
                      bundle={bundle}
                      databases={databases}
                      property={propertyEditor}
                      onSaved={refresh}
                      onDirtyChange={setEditorDirty}
                      onClose={() => setPropertyEditor(undefined)}
                    />
                  )}
                  <div className="database-tools">
                    <span className="database-field-help">
                      Définis les informations communes à chaque fiche.
                    </span>
                    <button
                      className="small-button"
                      disabled={busy}
                      onClick={() => editProperty(null)}
                    >
                      <Plus size={14} /> Ajouter un champ
                    </button>
                  </div>
                  <div className="database-properties">
                    {bundle.properties.map((property) => (
                      <div className="database-property-row" key={property.id}>
                        <span className="database-property-symbol">
                          {
                            propertyTypes.find(
                              (type) => type.type === property.type,
                            )?.symbol
                          }
                        </span>
                        <div>
                          <strong>
                            {property.name}
                            {property.required && " *"}
                          </strong>
                          <small>
                            {propertyLabel(property.type)}
                            {isComputed(property)
                              ? " · calculé sur le serveur"
                              : ""}
                          </small>
                        </div>
                        <button onClick={() => editProperty(property)}>
                          Modifier
                        </button>
                        <button
                          title="Supprimer le champ"
                          disabled={busy}
                          onClick={() => void deleteProperty(property)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {!bundle.properties.length && (
                    <div className="database-empty">
                      Un champ « Titre » est un bon point de départ. Ajoute
                      ensuite les dates, choix, fichiers ou calculs utiles.
                    </div>
                  )}
                </>
              )}
              {tab === "forms" && (
                <>
                  {formEditor !== undefined && (
                    <FormBuilder
                      key={formEditor?.id || "new"}
                      bundle={bundle}
                      form={formEditor}
                      onSaved={refresh}
                      onDirtyChange={setEditorDirty}
                      onClose={() => setFormEditor(undefined)}
                    />
                  )}
                  <div className="database-tools">
                    <span className="database-field-help">
                      Les élèves répondent sans voir le contenu de la base.
                    </span>
                    <button
                      className="small-button"
                      disabled={busy || !bundle.properties.some(canUseInForm)}
                      onClick={() => editForm(null)}
                    >
                      <Plus size={14} /> Nouveau formulaire
                    </button>
                  </div>
                  {bundle.forms.map((form) => (
                    <div className="database-form-card" key={form.id}>
                      <h4>{form.name}</h4>
                      <p>
                        {form.fields.length} question(s) ·{" "}
                        {form.public ? "Accessible par son lien" : "Privé"} ·{" "}
                        {
                          bundle.rows.filter(
                            (row) =>
                              (
                                row as DatabaseRow & {
                                  source_form_id?: string | null;
                                }
                              ).source_form_id === form.id,
                          ).length
                        }{" "}
                        réponse(s)
                      </p>
                      <div className="database-form-card-actions">
                        <button
                          className="small-button"
                          onClick={() => editForm(form)}
                        >
                          <Settings size={13} /> Configurer
                        </button>
                        <button
                          className="small-button"
                          disabled={busy}
                          onClick={() => void toggleForm(form)}
                        >
                          {form.public ? (
                            <Lock size={13} />
                          ) : (
                            <Globe size={13} />
                          )}{" "}
                          {form.public
                            ? "Rendre privé"
                            : "Publier le formulaire"}
                        </button>
                        {form.public && (
                          <>
                            <a
                              className="small-button"
                              href={formUrl(form.token)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink size={13} /> Ouvrir
                            </a>
                            <button
                              className="small-button"
                              onClick={() => void copyLink(form)}
                            >
                              <Copy size={13} /> Copier le lien
                            </button>
                          </>
                        )}
                        {onChooseForm &&
                          (chooseFormMode || mode === "manage") && (
                            <button
                              className="database-choice-button"
                              onClick={() => {
                                if (
                                  !editorDirty ||
                                  confirm(
                                    "Fermer les modifications non enregistrées avant d’insérer le formulaire ?",
                                  )
                                )
                                  onChooseForm(form.id);
                              }}
                            >
                              <Check size={13} /> Insérer ce formulaire
                            </button>
                          )}
                      </div>
                      {form.public && (
                        <a
                          className="database-form-link"
                          href={formUrl(form.token)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {formUrl(form.token)}
                        </a>
                      )}
                    </div>
                  ))}
                  {!bundle.forms.length && (
                    <div className="database-empty">
                      Crée un formulaire à partir des champs de cette base.
                    </div>
                  )}
                  <div className="database-private-note">
                    <ShieldCheck size={16} />
                    <span>
                      Publier un formulaire partage ses questions. Les fiches et
                      les fichiers envoyés par les élèves restent privés et sont
                      visibles uniquement ici.
                    </span>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="database-empty">
              <DatabaseIcon size={34} />
              Crée ta première base pour organiser des fiches ou recueillir des
              réponses.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function DatabaseView({ dbId }: { dbId: string }) {
  const app = useApp();
  const [bundle, setBundle] = useState<DatabaseBundle | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [view, setView] = useState<"table" | "gallery" | "chart">("table");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setBundle(null);
    setError("");
    void api<DatabaseBundle>(
      app.admin ? "db_get" : "public_db_get",
      undefined,
      { id: dbId },
    )
      .then((data) => {
        if (!cancelled)
          setBundle({
            ...data,
            forms: data.forms || [],
            rows: data.rows || [],
            properties: data.properties || [],
          });
      })
      .catch((error) => {
        if (!cancelled) setError(errorText(error));
      });
    return () => {
      cancelled = true;
    };
  }, [dbId, app.admin, revision]);
  return (
    <section className="database-embedded">
      <div className="database-embedded-header">
        <h3>
          <DatabaseIcon size={18} />{" "}
          {bundle?.database.name || "Base de données"}
        </h3>
        {app.admin && !editing && (
          <button className="small-button" onClick={() => setEditing(true)}>
            <Settings size={13} />{" "}
            {editing ? "Fermer la gestion" : "Gérer cette base"}
          </button>
        )}
      </div>
      {error ? (
        <ErrorBox message={error} />
      ) : !bundle ? (
        <Loading />
      ) : (
        <>
          <div className="database-tools">
            <div className="database-view-switch">
              <button
                className={view === "table" ? "active" : ""}
                onClick={() => setView("table")}
              >
                <Table size={13} /> Tableau
              </button>
              <button
                className={view === "gallery" ? "active" : ""}
                onClick={() => setView("gallery")}
              >
                <LayoutGrid size={13} /> Galerie
              </button>
            </div>
            {app.admin && (
              <span className="database-badge">
                {bundle.database.visibility === "public" ? (
                  <Globe size={12} />
                ) : (
                  <Lock size={12} />
                )}{" "}
                {bundle.database.visibility === "public"
                  ? "Base publique"
                  : "Base privée"}
              </span>
            )}
          </div>
          <Records bundle={bundle} view={view} />
          {app.admin && (
            <p className="database-field-help">
              L’aperçu enseignant contient aussi les fiches privées. Seules les
              fiches publiques seront accessibles aux élèves après publication
              de la base et de la page.
            </p>
          )}
        </>
      )}
      {app.admin && editing && (
        <div className="database-inline-manager">
          <DatabaseManager
            initialDatabaseId={dbId}
            onClose={() => {
              setEditing(false);
              setRevision((value) => value + 1);
            }}
          />
        </div>
      )}
    </section>
  );
}

export function FormView({
  formId,
  token,
}: {
  formId: string;
  token?: string;
}) {
  const app = useApp();
  const [data, setData] = useState<{
    form: DatabaseForm;
    properties: Property[];
  } | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    void api<{ form: DatabaseForm; properties: Property[] }>(
      "form_get",
      undefined,
      token ? { token } : { id: formId },
    )
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((error) => {
        if (!cancelled) setError(errorText(error));
      });
    return () => {
      cancelled = true;
    };
  }, [formId, token, app.admin, revision]);
  if (error)
    return (
      <section className="database-embedded">
        <ErrorBox message={error} />
      </section>
    );
  if (!data) return <Loading />;
  const properties = data.form.fields
    .map((id) => data.properties.find((property) => property.id === id))
    .filter(
      (property): property is Property => !!property && canUseInForm(property),
    );
  return (
    <section className="database-embedded">
      {app.admin ? (
        <>
          <div className="database-embedded-header">
            <h3>
              <FormInput size={18} /> {data.form.name}
            </h3>
            {!editing && (
              <button className="small-button" onClick={() => setEditing(true)}>
                <Settings size={13} /> Configurer
              </button>
            )}
          </div>
          <p className="database-field-help">
            {data.form.public
              ? "Ce formulaire est accessible aux élèves."
              : "Ce formulaire est privé. Publie-le pour permettre les réponses."}{" "}
            Les réponses restent privées.
          </p>
          <div className="database-tools">
            <button
              className="small-button"
              onClick={() => setPreview(!preview)}
            >
              {preview ? "Fermer l’aperçu" : "Prévisualiser les questions"}
            </button>
            {data.form.public && (
              <a
                className="small-button"
                href={formUrl(data.form.token)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={13} /> Ouvrir le formulaire
              </a>
            )}
          </div>
          {preview && (
            <PublicFormFields
              form={data.form}
              properties={properties}
              preview
            />
          )}
          {editing && (
            <div className="database-inline-manager">
              <DatabaseManager
                initialDatabaseId={data.form.db_id}
                initialFormId={data.form.id}
                onClose={() => {
                  setEditing(false);
                  setRevision((value) => value + 1);
                }}
              />
            </div>
          )}
        </>
      ) : (
        <PublicFormFields
          key={`${data.form.id}-${data.form.version}`}
          form={data.form}
          properties={properties}
        />
      )}
    </section>
  );
}

export default DatabaseManager;
