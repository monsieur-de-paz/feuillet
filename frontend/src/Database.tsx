import { verifiedFormReceipt, type FormReceipt } from "./form-delivery";
import { queueCellPatch, CellEditConflict } from "./database-editing";
import { DatabasePopover, DatabaseSheet } from "./DatabaseSurface";
import { FormDesigner } from "./FormDesigner";
import { formDesign, formQuestion } from "./form-design";
import { FormAppearance } from "./FormAppearance";
import { groupRecords } from "./database-grouping";
import { FormSkeleton } from "./FormSkeleton";
import {
  ButtonAppearanceFields,
  buttonClasses,
  type ButtonAppearance,
} from "./ButtonAppearance";
import { ContextMenu, type MenuAction } from "./ContextMenu";
import { Select } from "./Select";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  FileInput,
  X,
  AlertCircle,
  Table,
  BarChart3,
  FormInput,
  Filter,
  ArrowDownAZ,
  EyeOff,
  Eye,
  Link as LinkIcon,
  RefreshCw,
  Pencil,
  Monitor,
  Send,
} from "lucide-react";
import { useApp } from "./context";
import {
  api,
  ApiError,
  setCsrf,
  fileUrl,
  thumbUrl,
  safeLink,
  sizeLabel,
  type FileRecord,
} from "./types";
import {
  formatCreatedAt,
  toLocalDateTime,
  fromLocalDateTime,
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
  normalizeDatabaseView,
  defaultDatabaseView,
  databaseViewRows,
  normalizedSearch,
  type DatabaseViewConfiguration,
  type DatabaseViewFilter,
} from "./database-types";
import "./database.css";
import "./database-workbench.css";

export type { DatabaseViewConfiguration } from "./database-types";
const databaseEvent = "feuillet:database-changed";
function broadcastDatabaseChange(
  dbId: string,
  source = "",
  details?: {
    deletedPropertyId?: string;
    pageVersions?: Record<string, { before: number; after: number }>;
  },
) {
  window.dispatchEvent(
    new CustomEvent(databaseEvent, { detail: { dbId, source, ...details } }),
  );
}
function useDatabaseChanges(dbId: string, onChange: () => void, source = "") {
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => {
    const listener = (event: Event) => {
      if (
        (event as CustomEvent<{ dbId: string }>).detail?.dbId === dbId &&
        ((event as CustomEvent<{ source?: string }>).detail?.source || "") !==
          source
      )
        callback.current();
    };
    window.addEventListener(databaseEvent, listener);
    return () => window.removeEventListener(databaseEvent, listener);
  }, [dbId]);
}

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
      property.type === "number" &&
      value !== null &&
      value !== "" &&
      (typeof value !== "number" || !Number.isFinite(value))
    )
      errors[property.id] = "Indique un nombre valide.";
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

const emptyRelationRows: { row: DatabaseRow; properties: Property[] }[] = [];

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
  uploadLabel?: string;
};
function Field({
  property,
  value,
  onChange,
  onUpload,
  files,
  relationRows = emptyRelationRows,
  progress,
  disabled = false,
  error,
  uploadLabel = "Ajouter des fichiers",
}: FieldProps) {
  const controlId = useId();
  const id = `field-${property.id}-${controlId}`;
  const required = !!property.required;
  const options = property.config?.options || [];
  let input: ReactNode;
  if (isComputed(property))
    input = (
      <input
        id={id}
        disabled
        value={
          property.type === "created_at" && typeof value === "string"
            ? formatCreatedAt(value)
            : displayText(value)
        }
      />
    );
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
      <Select
        id={id}
        optionColors={property.config.option_colors}
        required={required}
        disabled={disabled}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{property.placeholder || "Choisir…"}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
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
      <RelationPicker
        property={property}
        selected={asArray(value)}
        rows={relationRows}
        disabled={disabled}
        onChange={onChange}
      />
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
          <FileInput size={15} /> {uploadLabel}
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
        placeholder={property.placeholder}
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
          property.placeholder ||
          (property.type === "url"
            ? "https://…"
            : property.type === "phone"
              ? "+33 …"
              : undefined)
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
      {property.help && (
        <p className="database-field-help form-question-help">
          {property.help}
        </p>
      )}
      {input}
      {property.type === "relation" && (
        <small className="database-field-help">
          Sélectionne une ou plusieurs fiches de la base liée.
        </small>
      )}
      {isComputed(property) && (
        <small className="database-field-help">
          {property.type === "created_at"
            ? "Date et heure enregistrées automatiquement à la création."
            : "Calculé par le serveur à partir des champs de la fiche."}
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

function RelationPicker({
  property,
  selected,
  rows,
  disabled,
  onChange,
}: {
  property: Property;
  selected: string[];
  rows: { row: DatabaseRow; properties: Property[] }[];
  disabled?: boolean;
  onChange: (value: CellValue) => void;
}) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState(rows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openRow, setOpenRow] = useState<string | null>(null);
  const targetId = property.config.target_db_id || "";
  useEffect(() => setCandidates(rows), [rows]);
  async function refresh() {
    if (!targetId) return;
    setLoading(true);
    setError("");
    try {
      const bundle = await api<DatabaseBundle>("db_get", undefined, {
        id: targetId,
      });
      setCandidates(
        bundle.rows.map((row) => ({ row, properties: bundle.properties })),
      );
    } catch (error) {
      setError(errorText(error));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!rows.length) void refresh();
  }, [targetId]);
  useDatabaseChanges(targetId, () => void refresh());
  const filtered = candidates.filter(({ row, properties }) =>
    normalizedSearch(rowTitle(row, properties)).includes(
      normalizedSearch(query),
    ),
  );
  return (
    <div className="database-relation-search">
      <div className="database-relation-selected">
        {selected.map((id) => {
          const record = candidates.find((item) => item.row.id === id);
          return (
            <span key={id}>
              {record
                ? rowTitle(record.row, record.properties)
                : "Fiche indisponible"}
              <button
                type="button"
                disabled={disabled}
                aria-label="Retirer cette relation"
                onClick={() =>
                  onChange(selected.filter((value) => value !== id))
                }
              >
                <X size={12} />
              </button>
            </span>
          );
        })}
      </div>
      <div className="database-search">
        <Search size={15} />
        <input
          type="search"
          aria-label={`Rechercher une fiche liée pour ${property.name}`}
          placeholder="Rechercher par nom…"
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <ErrorBox message={error} />
      <div className="database-relation-options">
        {loading && !candidates.length ? (
          <Loading />
        ) : (
          filtered.slice(0, 60).map(({ row, properties }) => (
            <div key={row.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.includes(row.id)}
                  disabled={disabled}
                  onChange={() =>
                    onChange(
                      selected.includes(row.id)
                        ? selected.filter((value) => value !== row.id)
                        : [...selected, row.id],
                    )
                  }
                />
                <span>{rowTitle(row, properties)}</span>
              </label>
              <button
                type="button"
                title={`Ouvrir ${rowTitle(row, properties)}`}
                disabled={disabled}
                onClick={() => setOpenRow(row.id)}
              >
                <ArrowUpRight size={15} />
              </button>
            </div>
          ))
        )}
        {!loading && !filtered.length && (
          <p className="database-field-help">
            {query
              ? "Aucune fiche ne correspond à ce nom."
              : "Cette base ne contient pas encore de fiche."}
          </p>
        )}
        {filtered.length > 60 && (
          <p className="database-field-help">
            Affine la recherche pour retrouver les autres fiches.
          </p>
        )}
      </div>
      {openRow &&
        createPortal(
          <div className="database-linked-layer">
            <div
              className="database-linked-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Fiche liée"
            >
              <DatabaseManager
                initialDatabaseId={targetId}
                initialRowId={openRow}
                onClose={() => {
                  setOpenRow(null);
                  void refresh();
                }}
              />
            </div>
          </div>,
          document.body,
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
  if (property.type === "created_at" && typeof value === "string")
    return (
      <time className="database-created-at" dateTime={value}>
        {formatCreatedAt(value)}
      </time>
    );
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
          <a
            key={id}
            href={fileUrl(id, true)}
            download
            title={files[id]?.name || `Fichier ${index + 1}`}
          >
            <Download size={13} />
            <span>{files[id]?.name || `Fichier ${index + 1}`}</span>
          </a>
        ))}
      </div>
    );
  if (property.type === "multiselect" || property.type === "select")
    return (
      <div className="database-cell-tags">
        {(Array.isArray(value) ? value : [String(value)]).map((item) => (
          <span
            key={item}
            className="database-status-tag"
            style={
              property.config.option_colors?.[item]
                ? ({
                    "--tag-color": property.config.option_colors[item],
                  } as React.CSSProperties)
                : undefined
            }
          >
            {item}
          </span>
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

function InlineCell({
  bundle,
  row,
  property,
  files,
  relationLabels,
  onSaved,
  disabled = false,
}: {
  bundle: DatabaseBundle;
  row: DatabaseRow;
  property: Property;
  files: Record<string, FileRecord>;
  relationLabels: Record<string, string>;
  onSaved: () => Promise<void>;
  disabled?: boolean;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const simpleRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const inFlight = useRef(false),
    cancelling = useRef(false);
  const baseRow = useRef(row);
  const simple = [
    "title",
    "text",
    "number",
    "date",
    "email",
    "phone",
    "url",
  ].includes(property.type);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<CellValue>(cellValue(row, property));
  const valueRef = useRef(value);
  valueRef.current = value;
  const [draft, setDraft] = useState(String(cellValue(row, property) ?? ""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [progress, setProgress] = useState<
    { name: string; value: number } | undefined
  >();
  const [localFiles, setLocalFiles] = useState(files);
  const [position, setPosition] = useState({ left: 12, top: 80 });
  function open(next: CellValue = cellValue(row, property)) {
    if (disabled || isComputed(property)) return;
    const rect = anchor.current?.getBoundingClientRect();
    if (rect)
      setPosition({
        left: Math.max(
          12,
          Math.min(innerWidth - Math.min(370, innerWidth - 24) - 12, rect.left),
        ),
        top:
          rect.bottom + 270 > innerHeight && rect.top > 230
            ? Math.max(12, rect.top - 330)
            : Math.min(innerHeight - 160, rect.bottom + 7),
      });
    baseRow.current = row;
    setValue(next);
    valueRef.current = next;
    cancelling.current = false;
    setDraft(String(next ?? ""));
    setError("");
    setConflict(false);
    setLocalFiles(files);
    setEditing(true);
  }
  const dirty =
    JSON.stringify(value) !== JSON.stringify(cellValue(row, property));
  const interactions = useRef({ dirty, busy, progress: !!progress });
  interactions.current = { dirty, busy, progress: !!progress };
  async function save(next: CellValue = valueRef.current): Promise<boolean> {
    if (inFlight.current || progress) return false;
    if (formRef.current && !formRef.current.reportValidity()) return false;
    const issues = validateValues([property], { [property.id]: next });
    if (issues[property.id]) {
      setError(issues[property.id]);
      return false;
    }
    if (
      JSON.stringify(next) ===
      JSON.stringify(baseRow.current.values[property.id] ?? null)
    ) {
      setEditing(false);
      return true;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    let committed = false;
    try {
      const result = await queueCellPatch(
        baseRow.current,
        property.id,
        next,
        async (expected) =>
          (
            await api<{ row: DatabaseRow }>("row_patch", {
              id: row.id,
              version: expected,
              property_id: property.id,
              value: next,
            })
          ).row,
      );
      committed = true;
      baseRow.current = result;
      setEditing(false);
      await onSaved();
      return true;
    } catch (e) {
      setError(
        committed
          ? "La cellule est enregistrée. Actualise cette vue pour retrouver la dernière valeur."
          : errorText(e),
      );
      setConflict(
        e instanceof CellEditConflict ||
          (e instanceof ApiError && e.status === 409),
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function reload() {
    if (
      dirty &&
      !confirm(
        "Remplacer cette modification par la valeur enregistrée sur le serveur ?",
      )
    )
      return;
    setBusy(true);
    try {
      const data = await api<DatabaseBundle>("db_get", undefined, {
        id: bundle.database.id,
      });
      const current = data.rows.find((item) => item.id === row.id);
      if (!current) throw new Error("Cette fiche a été supprimée.");
      setValue(cellValue(current, property));
      baseRow.current = current;
      setDraft(String(cellValue(current, property) ?? ""));
      setConflict(false);
      setError("");
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  async function upload(incoming: File[]) {
    setError("");
    for (const file of incoming) {
      setProgress({ name: file.name, value: 0 });
      try {
        const record = await uploadAttachment(file, (value) =>
          setProgress({ name: file.name, value }),
        );
        setLocalFiles((previous) => ({ ...previous, [record.id]: record }));
        const next = [...asArray(valueRef.current), record.id];
        valueRef.current = next;
        setValue(next);
      } catch (error) {
        setError(errorText(error));
        break;
      } finally {
        setProgress(undefined);
      }
    }
  }
  useEffect(() => {
    if (!editing) return;
    if (simple) {
      const frame = requestAnimationFrame(() => {
        simpleRef.current?.focus({ preventScroll: true });
        if (
          simpleRef.current instanceof HTMLInputElement &&
          simpleRef.current.type !== "date"
        )
          simpleRef.current.select();
      });
      return () => cancelAnimationFrame(frame);
    }
    const previous = document.activeElement as HTMLElement | null;
    document.body.classList.add("database-cell-open");
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>(
          'input:not([type=file]),textarea,button[role="combobox"],select:not([aria-hidden="true"])',
        )
        ?.focus(),
    );
    const esc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.querySelector(".feuillet-floating")) return;
        if ((event.target as Element)?.closest(".database-linked-dialog"))
          return;
        event.preventDefault();
        event.stopPropagation();
        const current = interactions.current;
        if (!current.busy && !current.progress) {
          if (
            !current.dirty ||
            confirm("Annuler la modification de cette cellule ?")
          )
            setEditing(false);
        }
      }
    };
    document.addEventListener("keydown", esc, true);
    return () => {
      document.body.classList.remove("database-cell-open");
      document.removeEventListener("keydown", esc, true);
      previous?.focus();
    };
  }, [editing]);
  useEffect(() => {
    if (!editing && !busy) return;
    const block = (event: Event) => {
      if (interactions.current.dirty || inFlight.current)
        event.preventDefault();
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (interactions.current.dirty || inFlight.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    document.addEventListener("feuillet:before-page-change", block);
    window.addEventListener("beforeunload", unload);
    return () => {
      document.removeEventListener("feuillet:before-page-change", block);
      window.removeEventListener("beforeunload", unload);
    };
  }, [editing, busy]);
  function nextCell(backward: boolean) {
    const cell = simpleRef.current?.closest<HTMLElement>("[data-db-cell]");
    const cells = [
      ...(cell
        ?.closest("table")
        ?.querySelectorAll<HTMLElement>('[data-db-editable="true"]') || []),
    ];
    const next = cells[cells.indexOf(cell!) + (backward ? -1 : 1)];
    void save().then((ok) => {
      if (ok)
        requestAnimationFrame(() => {
          const button = next?.querySelector<HTMLButtonElement>(
            "button.database-inline-cell",
          );
          button?.focus({ preventScroll: true });
          if (button?.getAttribute("role") !== "checkbox") button?.click();
        });
    });
  }
  if (simple && editing) {
    const props = {
      value: draft,
      disabled: busy,
      "aria-label": `Modifier ${property.name} de ${rowTitle(row, bundle.properties)}`,
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => {
        const raw = event.target.value;
        setDraft(raw);
        const next =
          property.type === "number"
            ? raw.trim() === ""
              ? null
              : Number(raw.replace(",", "."))
            : raw;
        valueRef.current = next;
        setValue(next);
        setError("");
      },
      onBlur: () => {
        if (!cancelling.current && !inFlight.current && !error) void save();
      },
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          cancelling.current = true;
          setEditing(false);
          requestAnimationFrame(() =>
            anchor.current?.focus({ preventScroll: true }),
          );
        } else if (event.key === "Tab") {
          event.preventDefault();
          nextCell(event.shiftKey);
        } else if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          void save().then((ok) => {
            if (ok)
              requestAnimationFrame(() =>
                anchor.current?.focus({ preventScroll: true }),
              );
          });
        }
      },
    };
    return (
      <div className="database-direct-editor" aria-busy={busy}>
        {property.type === "text" ? (
          <textarea
            ref={(n) => {
              simpleRef.current = n;
            }}
            rows={2}
            {...props}
          />
        ) : (
          <input
            ref={(n) => {
              simpleRef.current = n;
            }}
            type={property.type === "date" ? "date" : "text"}
            inputMode={
              property.type === "number"
                ? "decimal"
                : property.type === "email"
                  ? "email"
                  : property.type === "phone"
                    ? "tel"
                    : undefined
            }
            maxLength={10000}
            {...props}
          />
        )}
        {busy && <LoaderCircle size={12} className="spin" />}
        {error && (
          <div className="database-cell-inline-error" role="alert">
            {error}
            {conflict && (
              <>
                <button
                  onClick={() =>
                    downloadDraft(
                      { property: property.name, value },
                      "cellule-brouillon.json",
                    )
                  }
                >
                  Copier le brouillon dans un fichier
                </button>
                <button onClick={() => void reload()}>
                  Recharger la cellule
                </button>
              </>
            )}
            <button disabled={busy} onClick={() => void save()}>
              Réessayer
            </button>
            <button
              onClick={() => {
                cancelling.current = true;
                setEditing(false);
              }}
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    );
  }
  if (isComputed(property))
    return (
      <span
        className="database-computed-cell"
        title={
          property.type === "created_at"
            ? "Date enregistrée à la création de la fiche"
            : "Valeur calculée : modifie les champs utilisés par la formule ou l’agrégation."
        }
      >
        <Cell
          row={row}
          property={property}
          files={files}
          relations={relationLabels}
        />
      </span>
    );
  const editorButton = (
    <button
      ref={anchor}
      type="button"
      className={`database-inline-cell ${property.type === "title" ? "title-cell" : ""}`}
      disabled={disabled}
      title={`Modifier ${property.name}`}
      aria-label={`Modifier ${property.name} de ${rowTitle(row, bundle.properties)}`}
      role={property.type === "checkbox" ? "checkbox" : undefined}
      aria-checked={
        property.type === "checkbox" ? !!cellValue(row, property) : undefined
      }
      onClick={() => {
        if (property.type === "checkbox") {
          baseRow.current = row;
          void save(!cellValue(row, property));
        } else open();
      }}
      onContextMenu={(event) => {
        if (event.shiftKey) return;
        event.preventDefault();
        event.stopPropagation();
        open();
      }}
    >
      {!["files", "url", "email", "phone"].includes(property.type) && (
        <Cell
          row={row}
          property={property}
          files={files}
          relations={relationLabels}
        />
      )}
      <Pencil className="cell-edit-hint" size={11} />
    </button>
  );
  return (
    <>
      {["files", "url", "email", "phone"].includes(property.type) ? (
        <div className="database-resource-cell">
          <Cell
            row={row}
            property={property}
            files={files}
            relations={relationLabels}
          />
          {editorButton}
        </div>
      ) : (
        editorButton
      )}
      {!editing && error && (
        <span className="database-cell-inline-error" role="alert">
          {error}
        </span>
      )}
      {editing &&
        createPortal(
          <div
            className="database-cell-layer"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !busy && !progress) {
                if (!dirty) setEditing(false);
                else void save();
              }
            }}
          >
            <section
              className="database-cell-popover"
              style={{
                left: position.left,
                top: Math.max(12, position.top),
                maxHeight: Math.max(
                  140,
                  innerHeight - Math.max(12, position.top) - 12,
                ),
              }}
              role="dialog"
              aria-modal="true"
              aria-label={`Modifier ${property.name}`}
            >
              <div className="database-cell-heading">
                <span>
                  {
                    propertyTypes.find((item) => item.type === property.type)
                      ?.symbol
                  }{" "}
                  {property.name}
                </span>
                <button
                  type="button"
                  title="Annuler la modification"
                  disabled={busy || !!progress}
                  onClick={() => {
                    if (
                      !dirty ||
                      confirm("Annuler la modification de cette cellule ?")
                    )
                      setEditing(false);
                  }}
                >
                  <X size={15} />
                </button>
              </div>
              <form
                ref={formRef}
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !["text", "files", "relation", "multiselect"].includes(
                      property.type,
                    )
                  ) {
                    event.preventDefault();
                    void save();
                  }
                }}
              >
                <Field
                  property={property}
                  value={value}
                  onChange={(next) => {
                    valueRef.current = next;
                    setValue(next);
                    if (property.type === "select")
                      requestAnimationFrame(() => void save(next));
                  }}
                  onUpload={(incoming) => void upload(incoming)}
                  files={localFiles}
                  progress={progress}
                  disabled={busy}
                />
                <ErrorBox message={error}>
                  {conflict && (
                    <div className="database-conflict-actions">
                      <button
                        type="button"
                        className="small-button"
                        onClick={() =>
                          downloadDraft(
                            { property: property.name, value },
                            "cellule-brouillon.json",
                          )
                        }
                      >
                        Sauver une copie
                      </button>
                      <button
                        type="button"
                        className="small-button"
                        onClick={() => void reload()}
                      >
                        Recharger
                      </button>
                    </div>
                  )}
                </ErrorBox>
                <div className="database-cell-footer">
                  <small>
                    {dirty
                      ? "Modification non enregistrée"
                      : "Entrée pour enregistrer · Échap pour annuler"}
                  </small>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={busy || !!progress}
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={14} />
                    ) : (
                      <Check size={14} />
                    )}{" "}
                    Enregistrer
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}

function ViewControls({
  bundle,
  config,
  onChange,
  search,
  onSearch,
  onNew,
  onAddProperty,
  onPropertyEdit,
  busy = false,
}: {
  bundle: DatabaseBundle;
  config: DatabaseViewConfiguration;
  onChange: (view: DatabaseViewConfiguration) => void;
  search: string;
  onSearch: (query: string) => void;
  onNew?: () => void;
  onAddProperty?: () => void;
  onPropertyEdit?: (property: Property) => void;
  busy?: boolean;
}) {
  const [panel, setPanel] = useState<
    "filters" | "sort" | "properties" | "groups" | null
  >(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const sortType = bundle.properties.find(
    (p) => p.id === config.sort?.propertyId,
  )?.type;
  function changeFilter(index: number, patch: Partial<DatabaseViewFilter>) {
    onChange({
      ...config,
      filters: config.filters.map((filter, i) =>
        i === index ? { ...filter, ...patch } : filter,
      ),
    });
  }
  return (
    <div className="database-view-controls">
      <div className="database-view-mainbar">
        <div className="database-view-switch" aria-label="Types de vue">
          <button
            className={config.layout === "table" ? "active" : ""}
            aria-pressed={config.layout === "table"}
            onClick={() => onChange({ ...config, layout: "table" })}
          >
            <Table size={13} /> Tableau
          </button>
          <button
            className={config.layout === "gallery" ? "active" : ""}
            aria-pressed={config.layout === "gallery"}
            onClick={() => onChange({ ...config, layout: "gallery" })}
          >
            <LayoutGrid size={13} /> Galerie
          </button>
          <button
            className={config.layout === "chart" ? "active" : ""}
            aria-pressed={config.layout === "chart"}
            onClick={() => onChange({ ...config, layout: "chart" })}
          >
            <BarChart3 size={13} /> Graphique
          </button>
        </div>
        <div className="database-view-actionbar">
          <button
            className={config.groupBy ? "has-setting" : ""}
            onClick={(event) => {
              setAnchor(event.currentTarget);
              setPanel(panel === "groups" ? null : "groups");
            }}
            aria-label="Grouper les lignes"
            title="Grouper les lignes"
            aria-haspopup="dialog"
            aria-expanded={panel === "groups"}
          >
            <List size={15} />
            <span>Grouper</span>
          </button>
          <button
            className={config.filters.length ? "has-setting" : ""}
            onClick={(event) => {
              setAnchor(event.currentTarget);
              setPanel(panel === "filters" ? null : "filters");
            }}
            aria-label="Filtrer les lignes"
            title="Filtrer les lignes"
            aria-haspopup="dialog"
            aria-expanded={panel === "filters"}
          >
            <Filter size={15} />
            <span>Filtres</span>
            {config.filters.length > 0 && (
              <b className="database-tool-count">{config.filters.length}</b>
            )}
          </button>
          <button
            className={config.sort ? "has-setting" : ""}
            onClick={(event) => {
              setAnchor(event.currentTarget);
              setPanel(panel === "sort" ? null : "sort");
            }}
            aria-label="Trier les lignes"
            title="Trier les lignes"
            aria-haspopup="dialog"
            aria-expanded={panel === "sort"}
          >
            <ArrowDownAZ size={15} />
            <span>Trier</span>
          </button>
          <button
            onClick={(event) => {
              setAnchor(event.currentTarget);
              setPanel(panel === "properties" ? null : "properties");
            }}
            aria-label="Propriétés de la vue"
            title="Propriétés de la vue"
            aria-haspopup="dialog"
            aria-expanded={panel === "properties"}
          >
            <Settings size={15} />
            <span>Propriétés</span>
          </button>
          <button
            type="button"
            title="Rechercher dans cette vue"
            aria-label="Rechercher dans cette vue"
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search size={15} />
          </button>
          {(searchOpen || search) && (
            <div className="database-search">
              <Search size={13} />
              <input
                autoFocus
                type="search"
                aria-label="Rechercher dans cette vue"
                placeholder="Rechercher…"
                value={search}
                onChange={(event) => onSearch(event.target.value)}
              />
            </div>
          )}
          {onNew && (
            <button
              className="database-new-row"
              disabled={busy}
              onClick={onNew}
            >
              <Plus size={15} />
              Nouveau
            </button>
          )}
        </div>
      </div>
      {panel === "groups" && (
        <DatabasePopover
          anchor={anchor}
          title="Regrouper les lignes"
          onClose={() => setPanel(null)}
        >
          <div className="database-view-panel">
            <label>
              Regrouper par
              <Select
                aria-label="Regrouper les fiches par"
                value={config.groupBy || ""}
                onChange={(e) =>
                  onChange({ ...config, groupBy: e.target.value || null })
                }
              >
                <option value="">Aucun regroupement</option>
                {bundle.properties
                  .filter((p) => !["files", "relation"].includes(p.type))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </label>
            <small>
              Les réponses identiques sont réunies. Les listes à plusieurs choix
              sont regroupées par combinaison, sans compter une fiche plusieurs
              fois.
            </small>
          </div>
        </DatabasePopover>
      )}
      {panel === "filters" && (
        <DatabasePopover
          anchor={anchor}
          title="Filtrer les lignes"
          onClose={() => setPanel(null)}
        >
          <div className="database-view-panel">
            <small>
              Afficher les fiches qui remplissent toutes ces conditions
            </small>
            {config.filters.map((filter, index) => {
              const property = bundle.properties.find(
                (property) => property.id === filter.propertyId,
              );
              return (
                <div className="database-filter-line" key={index}>
                  <Select
                    aria-label={`Champ du filtre ${index + 1}`}
                    value={filter.propertyId}
                    onChange={(event) =>
                      changeFilter(index, {
                        propertyId: event.target.value,
                        value: "",
                        operator: "contains",
                      })
                    }
                  >
                    {bundle.properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label={`Condition du filtre ${index + 1}`}
                    value={filter.operator}
                    onChange={(event) =>
                      changeFilter(index, {
                        operator: event.target
                          .value as DatabaseViewFilter["operator"],
                        value:
                          property?.type === "checkbox" ? true : filter.value,
                      })
                    }
                  >
                    <option value="contains">contient</option>
                    <option value="equals">est égal à</option>
                    <option value="notEquals">est différent de</option>
                    <option value="isEmpty">est vide</option>
                    <option value="isNotEmpty">n’est pas vide</option>
                    {property &&
                      (property.type === "number" ||
                        property.type === "date" ||
                        isComputed(property)) && (
                        <>
                          <option value="gt">est supérieur à</option>
                          <option value="gte">est au moins</option>
                          <option value="lt">est inférieur à</option>
                          <option value="lte">est au plus</option>
                        </>
                      )}
                  </Select>
                  {!["isEmpty", "isNotEmpty"].includes(filter.operator) &&
                    (property?.type === "checkbox" ? (
                      <Select
                        aria-label={`Valeur du filtre ${index + 1}`}
                        value={String(filter.value === true)}
                        onChange={(event) =>
                          changeFilter(index, {
                            value: event.target.value === "true",
                          })
                        }
                      >
                        <option value="true">Coché</option>
                        <option value="false">Non coché</option>
                      </Select>
                    ) : property?.type === "select" ? (
                      <Select
                        aria-label={`Valeur du filtre ${index + 1}`}
                        value={String(filter.value)}
                        onChange={(event) =>
                          changeFilter(index, { value: event.target.value })
                        }
                      >
                        <option value="">Choisir…</option>
                        {property.config.options?.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <input
                        aria-label={`Valeur du filtre ${index + 1}`}
                        type={
                          property?.type === "number"
                            ? "number"
                            : property?.type === "created_at" &&
                                filter.operator !== "contains"
                              ? "datetime-local"
                              : property?.type === "date"
                                ? "date"
                                : "text"
                        }
                        step={property?.type === "created_at" ? 1 : undefined}
                        value={
                          property?.type === "created_at" &&
                          filter.operator !== "contains"
                            ? toLocalDateTime(filter.value)
                            : String(filter.value)
                        }
                        onChange={(event) =>
                          changeFilter(index, {
                            value:
                              property?.type === "number" &&
                              event.target.value !== ""
                                ? Number(event.target.value)
                                : property?.type === "created_at" &&
                                    filter.operator !== "contains"
                                  ? fromLocalDateTime(event.target.value)
                                  : event.target.value,
                          })
                        }
                      />
                    ))}
                  <button
                    title="Retirer le filtre"
                    onClick={() =>
                      onChange({
                        ...config,
                        filters: config.filters.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
            <div className="database-view-panel-footer">
              <button
                className="text-button"
                disabled={
                  config.filters.length >= 10 || !bundle.properties.length
                }
                onClick={() =>
                  onChange({
                    ...config,
                    filters: [
                      ...config.filters,
                      {
                        propertyId: bundle.properties[0]?.id || "",
                        operator: "contains",
                        value: "",
                      },
                    ],
                  })
                }
              >
                <Plus size={13} /> Ajouter un filtre
              </button>
              {config.filters.length > 0 && (
                <button
                  className="text-button"
                  onClick={() => onChange({ ...config, filters: [] })}
                >
                  Tout effacer
                </button>
              )}
            </div>
          </div>
        </DatabasePopover>
      )}
      {panel === "sort" && (
        <DatabasePopover
          anchor={anchor}
          title="Trier les lignes"
          onClose={() => setPanel(null)}
        >
          <div className="database-view-panel">
            <div className="database-sort-line">
              <Select
                aria-label="Champ de tri"
                value={config.sort?.propertyId || ""}
                onChange={(event) =>
                  onChange({
                    ...config,
                    sort: event.target.value
                      ? {
                          propertyId: event.target.value,
                          direction: config.sort?.direction || "asc",
                        }
                      : null,
                  })
                }
              >
                <option value="">Ordre d’origine</option>
                {bundle.properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Sens du tri"
                disabled={!config.sort}
                value={config.sort?.direction || "asc"}
                onChange={(event) => {
                  if (config.sort)
                    onChange({
                      ...config,
                      sort: {
                        ...config.sort,
                        direction: event.target.value as "asc" | "desc",
                      },
                    });
                }}
              >
                <option value="asc">
                  {sortType === "number" ||
                  sortType === "formula" ||
                  sortType === "rollup"
                    ? "Croissant · 0 → 9"
                    : sortType === "date"
                      ? "Des plus anciennes aux plus récentes"
                      : "Croissant · A → Z"}
                </option>
                <option value="desc">
                  {sortType === "number" ||
                  sortType === "formula" ||
                  sortType === "rollup"
                    ? "Décroissant · 9 → 0"
                    : sortType === "date"
                      ? "Des plus récentes aux plus anciennes"
                      : "Décroissant · Z → A"}
                </option>
              </Select>
              {config.sort && (
                <button
                  className="text-button"
                  onClick={() => onChange({ ...config, sort: null })}
                >
                  Retirer le tri
                </button>
              )}
            </div>
          </div>
        </DatabasePopover>
      )}
      {panel === "properties" && (
        <DatabasePopover
          anchor={anchor}
          title="Propriétés de la vue"
          onClose={() => setPanel(null)}
        >
          <div className="database-view-panel database-visible-properties">
            <small>Champs visibles dans cette vue</small>
            {bundle.properties.map((property) => (
              <div className="database-property-choice" key={property.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={!config.hiddenPropertyIds.includes(property.id)}
                    onChange={() =>
                      onChange({
                        ...config,
                        hiddenPropertyIds: config.hiddenPropertyIds.includes(
                          property.id,
                        )
                          ? config.hiddenPropertyIds.filter(
                              (id) => id !== property.id,
                            )
                          : [...config.hiddenPropertyIds, property.id],
                      })
                    }
                  />
                  {
                    propertyTypes.find((item) => item.type === property.type)
                      ?.symbol
                  }{" "}
                  {property.name}
                </label>
                {onPropertyEdit && property.type !== "created_at" && (
                  <button
                    type="button"
                    aria-label={`Modifier la propriété ${property.name}`}
                    onClick={() => {
                      setPanel(null);
                      onPropertyEdit(property);
                    }}
                  >
                    <Settings size={15} />
                  </button>
                )}
              </div>
            ))}
            {onAddProperty && (
              <button
                className="text-button"
                onClick={() => {
                  setPanel(null);
                  onAddProperty();
                }}
              >
                <Plus size={14} />
                Ajouter une propriété
              </button>
            )}
            <button
              className="text-button"
              onClick={() => onChange({ ...config, hiddenPropertyIds: [] })}
            >
              Tout afficher
            </button>
          </div>
        </DatabasePopover>
      )}
      {config.filters.length > 0 && panel !== "filters" && (
        <div className="database-filter-chips">
          {config.filters.map((filter, index) => (
            <button
              key={index}
              onClick={(event) => {
                setAnchor(event.currentTarget);
                setPanel("filters");
              }}
            >
              <Filter size={11} />
              {
                bundle.properties.find(
                  (property) => property.id === filter.propertyId,
                )?.name
              }{" "}
              {filter.operator === "isEmpty"
                ? "vide"
                : filter.operator === "isNotEmpty"
                  ? "rempli"
                  : String(filter.value)}
            </button>
          ))}
          <button
            title="Effacer les filtres"
            onClick={() => onChange({ ...config, filters: [] })}
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function QuickRow({
  bundle,
  onSaved,
  onExpand,
  disabled,
}: {
  bundle: DatabaseBundle;
  onSaved: () => Promise<void>;
  onExpand: (values: Record<string, CellValue>) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    input = useRef<HTMLInputElement>(null);
  const title =
    bundle.properties.find((p) => p.type === "title") ||
    bundle.properties.find((p) => p.type === "text");
  const values = {
    ...emptyValues(bundle.properties),
    ...(title ? { [title.id]: name } : {}),
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || disabled || !title || !name.trim()) return;
    if (Object.keys(validateValues(bundle.properties, values)).length) {
      onExpand(values);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    let committed = false;
    try {
      await api("row_save", {
        db_id: bundle.database.id,
        values,
        visibility: "public",
      });
      committed = true;
      setName("");
      await onSaved();
      input.current?.focus();
    } catch (e) {
      setError(
        committed
          ? "La ligne est enregistrée. Actualise la vue pour la retrouver."
          : errorText(e),
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="database-quick-row" data-quick-add="">
      {title ? (
        <form onSubmit={(e) => void submit(e)}>
          <Plus size={15} />
          <input
            ref={input}
            aria-label={`Nouvelle ligne dans ${bundle.database.name}`}
            placeholder="Nouvelle ligne…"
            maxLength={10000}
            value={name}
            disabled={disabled || busy}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
          />
          <button
            type="submit"
            disabled={disabled || busy || !name.trim()}
            aria-label="Ajouter cette ligne"
          >
            {busy ? (
              <LoaderCircle size={14} className="spin" />
            ) : (
              <span>
                Ajouter <small>↵</small>
              </span>
            )}
          </button>
        </form>
      ) : (
        <button
          className="text-button"
          disabled={disabled}
          onClick={() => onExpand(values)}
        >
          <Plus size={14} />
          Nouvelle ligne
        </button>
      )}
      {error && (
        <p role="alert">
          {error}
          <button onClick={() => onExpand(values)}>
            Ouvrir la fiche complète
          </button>
        </p>
      )}
    </div>
  );
}

function Records({
  bundle,
  view,
  onEdit,
  onDelete,
  search = "",
  relationLabels = {},
  config,
  onConfigChange,
  onCellSaved,
  editingDisabled = false,
  onPropertyEdit,
  onPropertyDelete,
  onPropertyRename,
  onAddProperty,
}: {
  bundle: DatabaseBundle;
  view: "table" | "gallery" | "chart";
  onEdit?: (
    row: DatabaseRow | null,
    initialValues?: Record<string, CellValue>,
  ) => void;
  onDelete?: (row: DatabaseRow) => void;
  search?: string;
  relationLabels?: Record<string, string>;
  config?: DatabaseViewConfiguration;
  onConfigChange?: (view: DatabaseViewConfiguration) => void;
  onCellSaved?: () => Promise<void>;
  editingDisabled?: boolean;
  onPropertyEdit?: (property: Property) => void;
  onPropertyDelete?: (property: Property) => void;
  onPropertyRename?: (property: Property) => void;
  onAddProperty?: () => void;
}) {
  const files = Object.fromEntries(
    (bundle.files || []).map((file) => [file.id, file]),
  );
  const effective = normalizeDatabaseView(
    config || { ...defaultDatabaseView, layout: view },
    bundle.properties,
  );
  const rows = databaseViewRows(bundle, effective, search, relationLabels);
  const visibleProperties = bundle.properties.filter(
    (property) => !effective.hiddenPropertyIds.includes(property.id),
  );
  const [columnMenu, setColumnMenu] = useState<{
    id: string;
    left: number;
    top: number;
    host?: HTMLElement | null;
  } | null>(null);
  const columnProperty = columnMenu
    ? bundle.properties.find((property) => property.id === columnMenu.id)
    : null;
  function headerMenu(
    property: Property,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    setColumnMenu({
      id: property.id,
      host: event.currentTarget.closest(".course-content")
        ? event.currentTarget.closest<HTMLElement>(".main-panel")
        : null,
      left: Math.max(12, Math.min(innerWidth - 250, rect.left)),
      top: Math.max(12, Math.min(innerHeight - 320, rect.bottom + 6)),
    });
  }
  const columnActions: MenuAction[] = [];
  if (columnProperty) {
    if (onPropertyRename && columnProperty.type !== "created_at")
      columnActions.push({
        label: "Renommer",
        icon: <Pencil />,
        run: () => onPropertyRename(columnProperty),
        group: "property",
      });
    if (onPropertyEdit && columnProperty.type !== "created_at")
      columnActions.push({
        label: "Modifier la propriété",
        icon: <Settings />,
        run: () => onPropertyEdit(columnProperty),
        group: "property",
      });
    if (onConfigChange)
      columnActions.push(
        {
          label: "Trier par ordre croissant",
          icon: <ArrowUp />,
          run: () =>
            onConfigChange({
              ...effective,
              sort: { propertyId: columnProperty.id, direction: "asc" },
            }),
          group: "view",
        },
        {
          label: "Trier par ordre décroissant",
          icon: <ArrowDown />,
          run: () =>
            onConfigChange({
              ...effective,
              sort: { propertyId: columnProperty.id, direction: "desc" },
            }),
          group: "view",
        },
        {
          label: "Filtrer les valeurs remplies",
          icon: <Filter />,
          disabled: effective.filters.length >= 10,
          run: () =>
            onConfigChange({
              ...effective,
              filters: [
                ...effective.filters,
                {
                  propertyId: columnProperty.id,
                  operator: "isNotEmpty",
                  value: "",
                },
              ],
            }),
          group: "view",
        },
        {
          label: "Masquer dans cette vue",
          icon: <EyeOff />,
          run: () =>
            onConfigChange({
              ...effective,
              hiddenPropertyIds: [
                ...effective.hiddenPropertyIds,
                columnProperty.id,
              ],
            }),
          group: "view",
        },
      );
    if (onConfigChange && !["files", "relation"].includes(columnProperty.type))
      columnActions.push({
        label: "Regrouper par cette propriété",
        icon: <List />,
        group: "view",
        run: () => onConfigChange({ ...effective, groupBy: columnProperty.id }),
      });
    if (onPropertyDelete && columnProperty.type !== "created_at")
      columnActions.push({
        label: "Supprimer le champ",
        icon: <Trash2 />,
        danger: true,
        run: () => onPropertyDelete(columnProperty),
        group: "delete",
      });
  }
  const menuContent = columnMenu && columnProperty && (
    <ContextMenu
      point={{ x: columnMenu.left, y: columnMenu.top }}
      title={`${columnProperty.name} · ${propertyLabel(columnProperty.type)}`}
      actions={columnActions}
      onClose={() => setColumnMenu(null)}
    />
  );
  // Keep interactive menus outside the editable node view so ProseMirror cannot steal focus.
  const menu =
    columnMenu?.host && menuContent
      ? createPortal(menuContent, columnMenu.host)
      : menuContent;
  const [chartProperty, setChartProperty] = useState("");
  const numbers = bundle.properties.filter(
    (property) =>
      property.type === "number" ||
      property.type === "formula" ||
      property.type === "rollup",
  );
  const numeric =
    numbers.find((property) => property.id === chartProperty) || numbers[0];
  if (!bundle.properties.length)
    return (
      <div className="database-empty">
        <DatabaseIcon size={30} />
        Ajoute une première colonne pour structurer cette base.
        {onAddProperty && (
          <button className="small-button" onClick={onAddProperty}>
            <Plus size={14} />
            Ajouter une propriété
          </button>
        )}
      </div>
    );
  if (!rows.length && effective.layout !== "table")
    return (
      <div className="database-empty">
        {search
          ? "Aucune fiche ne correspond à la recherche."
          : "Cette base ne contient aucune fiche accessible."}
      </div>
    );
  const groupProperty = bundle.properties.find(
    (p) =>
      p.id === effective.groupBy && !["files", "relation"].includes(p.type),
  );
  if (groupProperty)
    return (
      <div className="database-groups">
        {groupRecords(rows, (row) => cellValue(row, groupProperty)).map(
          (group) => (
            <details className="database-record-group" key={group.key} open>
              <summary>
                <span>{group.label}</span>
                <small>
                  {group.rows.length} fiche{group.rows.length > 1 ? "s" : ""}
                </small>
              </summary>
              <Records
                bundle={{ ...bundle, rows: group.rows }}
                view={view}
                config={{ ...effective, groupBy: null }}
                onConfigChange={
                  onConfigChange
                    ? (next) =>
                        onConfigChange({ ...next, groupBy: effective.groupBy })
                    : undefined
                }
                search=""
                relationLabels={relationLabels}
                onEdit={onEdit}
                onDelete={onDelete}
                onCellSaved={onCellSaved}
                editingDisabled={editingDisabled}
                onPropertyEdit={onPropertyEdit}
                onPropertyDelete={onPropertyDelete}
                onPropertyRename={onPropertyRename}
                onAddProperty={onAddProperty}
              />
            </details>
          ),
        )}
      </div>
    );
  if (effective.layout === "gallery")
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
                src={thumbUrl(
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
              {visibleProperties
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
  if (effective.layout === "chart") {
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
          <Select
            value={numeric?.id || ""}
            onChange={(event) => setChartProperty(event.target.value)}
          >
            {numbers.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </Select>
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
  if (!visibleProperties.length)
    return (
      <div className="database-empty">
        Tous les champs sont masqués dans cette vue.
        {onConfigChange && (
          <button
            className="text-button"
            onClick={() =>
              onConfigChange({ ...effective, hiddenPropertyIds: [] })
            }
          >
            Afficher les champs
          </button>
        )}
      </div>
    );
  return (
    <>
      <div
        className="database-table-wrap"
        role="region"
        aria-label={`Tableau : ${bundle.database.name}`}
        tabIndex={0}
      >
        <table className="database-table database-grid">
          <caption className="database-visually-hidden">
            {bundle.database.name}
          </caption>
          <thead>
            <tr>
              {visibleProperties.map((property) => (
                <th
                  key={property.id}
                  scope="col"
                  aria-sort={
                    effective.sort?.propertyId === property.id
                      ? effective.sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <button
                    type="button"
                    className="database-column-heading"
                    aria-haspopup="menu"
                    aria-expanded={columnMenu?.id === property.id}
                    aria-label={`Menu de la propriété ${property.name}`}
                    onClick={(event) => headerMenu(property, event)}
                    onContextMenu={(event) => {
                      if (event.shiftKey) return;
                      event.preventDefault();
                      event.stopPropagation();
                      headerMenu(property, event);
                    }}
                  >
                    {
                      propertyTypes.find((type) => type.type === property.type)
                        ?.symbol
                    }{" "}
                    <span>{property.name}</span>
                    {effective.sort?.propertyId === property.id ? (
                      effective.sort.direction === "asc" ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : (
                      <ChevronDown size={12} />
                    )}
                  </button>
                </th>
              ))}
              {onAddProperty && (
                <th scope="col" className="database-add-property">
                  <button
                    title="Ajouter une propriété"
                    aria-label="Ajouter une propriété"
                    onClick={onAddProperty}
                  >
                    <Plus size={14} />
                  </button>
                </th>
              )}
              {onEdit && (
                <th scope="col" className="database-actions-heading">
                  <span className="database-visually-hidden">
                    Actions sur la ligne
                  </span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {visibleProperties.map((property, index) => {
                  const CellTag = index === 0 ? "th" : "td";
                  return (
                    <CellTag
                      key={property.id}
                      scope={index === 0 ? "row" : undefined}
                      data-db-cell={`${row.id}:${property.id}`}
                      data-db-editable={!isComputed(property)}
                    >
                      {onCellSaved ? (
                        <InlineCell
                          bundle={bundle}
                          row={row}
                          property={property}
                          files={files}
                          relationLabels={relationLabels}
                          onSaved={onCellSaved}
                          disabled={editingDisabled}
                        />
                      ) : onEdit && property.type === "title" ? (
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
                    </CellTag>
                  );
                })}
                {onAddProperty && <td className="database-add-property" />}
                {onEdit && (
                  <td className="database-row-actions">
                    <div>
                      <button
                        title="Modifier la fiche"
                        onClick={() => onEdit(row)}
                      >
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
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={
                    visibleProperties.length +
                    (onAddProperty ? 1 : 0) +
                    (onEdit ? 1 : 0)
                  }
                  className="database-empty-row"
                >
                  {bundle.rows.length
                    ? "Aucune ligne ne correspond à cette vue. Modifie les filtres ou la recherche."
                    : "Votre tableau est prêt. Ajoutez votre première ligne ci-dessous."}
                </td>
              </tr>
            )}
          </tbody>
          {onCellSaved && onEdit && (
            <tfoot>
              <tr>
                <td
                  colSpan={
                    visibleProperties.length + (onAddProperty ? 1 : 0) + 1
                  }
                >
                  <QuickRow
                    bundle={bundle}
                    onSaved={onCellSaved}
                    onExpand={(values) => onEdit(null, values)}
                    disabled={editingDisabled}
                  />
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {menu}
    </>
  );
}

function RowEditor({
  bundle,
  row,
  onSaved,
  onClose,
  onDirtyChange,
  initialValues,
}: {
  bundle: DatabaseBundle;
  row: DatabaseRow | null;
  onSaved: () => Promise<void>;
  onClose: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  initialValues?: Record<string, CellValue>;
}) {
  const [values, setValues] = useState<Record<string, CellValue>>(() => ({
    ...emptyValues(bundle.properties),
    ...initialValues,
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
          <Select
            disabled={!!row?.from_form}
            value={row?.from_form ? "private" : visibility}
            onChange={(event) => {
              setVisibility(event.target.value as "public" | "private");
              setDirty(true);
            }}
          >
            <option value="public">Visible si cette base est publiée</option>
            <option value="private">Toujours privée</option>
          </Select>
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
  const [optionColors, setOptionColors] = useState<Record<string, string>>(
    property?.config.option_colors || {},
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
    if (config.options)
      config.option_colors = Object.fromEntries(
        config.options
          .filter((label) => optionColors[label])
          .map((label) => [label, optionColors[label]]),
      );
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
        {property &&
          name.trim() !== property.name &&
          bundle.properties.some((item) => item.type === "formula") && (
            <div className="database-private-note">
              <AlertCircle size={15} />
              <span>
                Les formules qui utilisent <code>prop("{property.name}")</code>{" "}
                devront être adaptées au nouveau nom. Les relations et
                agrégations conservent leurs liens par identifiant.
              </span>
            </div>
          )}
        <label>
          Type
          <Select
            aria-label="Type de champ"
            value={type}
            onChange={(event) =>
              change(setType, event.target.value as PropertyType)
            }
          >
            {propertyTypes
              .filter((item) => item.type !== "created_at")
              .map((item) => (
                <option value={item.type} key={item.type}>
                  {item.symbol} {item.label}
                </option>
              ))}
          </Select>
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
        {["select", "multiselect"].includes(type) && (
          <fieldset className="status-color-options">
            <legend>Couleurs des états et des choix</legend>
            {[
              ...new Set(
                options
                  .split(/\n/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              ),
            ].map((label) => (
              <div key={label}>
                <span
                  className="database-status-tag"
                  style={
                    {
                      "--tag-color": optionColors[label] || "#818778",
                    } as React.CSSProperties
                  }
                >
                  {label}
                </span>
                <input
                  type="color"
                  aria-label={`Couleur de ${label}`}
                  value={optionColors[label] || "#818778"}
                  onInput={(e) =>
                    change(setOptionColors, {
                      ...optionColors,
                      [label]: e.currentTarget.value,
                    })
                  }
                  onChange={(e) =>
                    change(setOptionColors, {
                      ...optionColors,
                      [label]: e.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  className="small-button"
                  onClick={() => {
                    const next = { ...optionColors };
                    delete next[label];
                    change(setOptionColors, next);
                  }}
                >
                  Par défaut
                </button>
              </div>
            ))}
          </fieldset>
        )}
        {type === "relation" && (
          <label>
            Base liée
            <Select
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
            </Select>
            <small className="database-field-help">
              La relation sélectionne de vraies fiches de cette base. Elle reste
              accessible à l’administrateur du site.
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
              <Select
                value={previewRow}
                onChange={(event) => setPreviewRow(event.target.value)}
              >
                <option value="">Fiche vide</option>
                {bundle.rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {rowTitle(row, bundle.properties)}
                  </option>
                ))}
              </Select>
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
              <Select
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
              </Select>
            </label>
            <label>
              Champ des fiches liées
              <Select
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
              </Select>
            </label>
            <label>
              Calcul
              <Select
                value={operation}
                onChange={(event) => change(setOperation, event.target.value)}
              >
                <option value="count">Nombre de valeurs</option>
                <option value="sum">Somme</option>
                <option value="avg">Moyenne</option>
                <option value="min">Minimum</option>
                <option value="max">Maximum</option>
              </Select>
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
  const [preview, setPreview] = useState(true);
  const [previewStage, setPreviewStage] = useState<"before" | "after">(
    "before",
  );
  const [design, setDesign] = useState(() => formDesign(form?.config));
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
        config: design,
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
  function toggleRequired(property: Property) {
    setDesign((previous) => ({
      ...previous,
      questions: {
        ...previous.questions,
        [property.id]: {
          ...previous.questions[property.id],
          required: !(
            previous.questions[property.id]?.required ?? property.required
          ),
        },
      },
    }));
    setDirty(true);
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
    <section className="database-editor-card form-studio">
      <h4>{form ? "Configurer le formulaire" : "Créer un formulaire"}</h4>
      <ErrorBox message={error}>
        {conflict && (
          <div className="database-conflict-actions">
            <button
              className="small-button"
              onClick={() =>
                downloadDraft(
                  { name, fields, config: design, public: published },
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
      <div className="form-studio-layout">
        <form className="form-studio-controls" onSubmit={submit}>
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
          <details className="form-source-fields" open={!fields.length}>
            <summary>
              Questions du formulaire{" "}
              <small>{fields.length} sélectionnée(s)</small>
            </summary>
            <p className="database-field-help">
              Sélectionne les questions à présenter. Le nom et le type des
              questions viennent des champs de la base. Les textes personnalisés
              et le réglage « Obligatoire » restent propres à ce formulaire. Les
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
                    {(design.questions[property.id]?.required ??
                      property.required) &&
                      " *"}
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
                          checked={
                            design.questions[property.id]?.required ??
                            property.required
                          }
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
                        disabled={
                          fields.indexOf(property.id) === fields.length - 1
                        }
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
          </details>
          <FormDesigner
            value={design}
            properties={selected}
            onChange={(patch) => {
              setDesign((previous) => ({ ...previous, ...patch }));
              setDirty(true);
            }}
          />
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
              Le formulaire collecte les réponses dans cette base. Ces réponses
              et leurs pièces jointes restent privées, même si le formulaire ou
              la base est public.
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
                if (
                  !dirty ||
                  confirm("Quitter sans enregistrer le formulaire ?")
                )
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
          <aside className="database-form-preview form-studio-preview">
            <header className="form-preview-heading">
              <h4>Aperçu en direct</h4>
              <div>
                <button
                  type="button"
                  className="small-button"
                  aria-pressed={previewStage === "before"}
                  onClick={() => setPreviewStage("before")}
                >
                  Avant l’envoi
                </button>
                <button
                  type="button"
                  className="small-button"
                  aria-pressed={previewStage === "after"}
                  onClick={() => setPreviewStage("after")}
                >
                  Après l’envoi
                </button>
              </div>
            </header>
            <PublicFormFields
              form={{
                id: form?.id || "",
                db_id: bundle.database.id,
                name,
                config: design,
                fields,
                public: false,
                token: "",
                version: 0,
              }}
              properties={selected}
              preview
              previewSuccess={previewStage === "after"}
            />
          </aside>
        )}
      </div>
    </section>
  );
}

function PublicFormFields({
  form,
  properties: originalProperties,
  preview = false,
  previewSuccess = false,
}: {
  form: DatabaseForm;
  properties: Property[];
  preview?: boolean;
  previewSuccess?: boolean;
}) {
  const design = formDesign(form.config);
  const properties = originalProperties.map((p) => formQuestion(p, design));
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
  const [receipt, setReceipt] = useState<FormReceipt | null>(null);
  const [submittedFiles, setSubmittedFiles] = useState<string[]>([]);
  const deliveryAttempt = useRef<{ signature: string; id: string } | null>(
    null,
  );
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
      const signature = JSON.stringify(values);
      if (deliveryAttempt.current?.signature !== signature)
        deliveryAttempt.current = {
          signature,
          id: crypto.randomUUID().replaceAll("-", ""),
        };
      const requestId = deliveryAttempt.current.id;
      const fileIds = [
        ...new Set(
          properties
            .filter((p) => p.type === "files")
            .flatMap((p) => asArray(values[p.id])),
        ),
      ];
      const response = await api(
        "form_submit",
        {
          token: form.token,
          values,
          website,
          request_id: requestId,
        },
        { delivery: requestId },
      );
      const confirmed = verifiedFormReceipt(
        response,
        form.id,
        requestId,
        fileIds.length,
      );
      setReceipt(confirmed);
      setSubmittedFiles(fileIds.map((id) => files[id]?.name || "Pièce jointe"));
      deliveryAttempt.current = null;
      setSubmitted(true);
      setValues(emptyValues(properties));
      setFiles({});
    } catch (error) {
      const message = errorText(error);
      setError(
        /expir|owner|session|apparten|invalide.*fichier/i.test(message)
          ? `${message} Retire les pièces jointes concernées et envoie-les à nouveau avant de soumettre ta réponse.`
          : message,
      );
    } finally {
      setBusy(false);
    }
  }
  if (submitted || (preview && previewSuccess))
    return (
      <FormAppearance design={design} complete>
        <main className="form-page form-complete" role="status">
          {design.animation === "immersive" && (
            <div className="form-celebration" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <i key={i} style={{ "--burst": i } as React.CSSProperties} />
              ))}
            </div>
          )}
          <div className="form-success-orbit">
            <Check size={32} />
          </div>
          <span className="form-eyebrow">{design.successEyebrow}</span>
          <h1>{design.successTitle}</h1>
          <p>{design.successText}</p>
          {receipt && !preview && (
            <div className="form-delivery-receipt">
              <strong>
                Réception confirmée · {receipt.fileCount} fichier
                {receipt.fileCount > 1 ? "s" : ""}
              </strong>
              <time dateTime={receipt.receivedAt}>
                {new Date(receipt.receivedAt).toLocaleString("fr-FR")}
              </time>
              {submittedFiles.length > 0 && (
                <ul>
                  {submittedFiles.map((name, i) => (
                    <li key={i}>{name}</li>
                  ))}
                </ul>
              )}
              <span>
                Référence : <code>{receipt.id}</code>
              </span>
              <button
                type="button"
                className="small-button"
                onClick={() => {
                  const text = `Feuillet — Reçu de dépôt\nFormulaire : ${form.name}\nRéférence : ${receipt.id}\nDate : ${receipt.receivedAt}\nFichiers : ${receipt.fileCount}\n${submittedFiles.join("\n")}\n`;
                  const url = URL.createObjectURL(
                    new Blob([text], { type: "text/plain;charset=utf-8" }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `recu-feuillet-${receipt.id}.txt`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                <Download size={15} />
                Conserver mon reçu
              </button>
            </div>
          )}
          {design.showAgain && (
            <button
              type="button"
              className="small-button"
              disabled={preview}
              onClick={() => setSubmitted(false)}
            >
              {design.againLabel}
            </button>
          )}
        </main>
      </FormAppearance>
    );
  return (
    <FormAppearance design={design}>
      <form className="public-database-form form-page" onSubmit={submit}>
        {design.coverId && (
          <img
            className="form-design-cover"
            src={thumbUrl(design.coverId, 1280)}
            alt=""
          />
        )}
        {
          <header className="form-heading">
            <div className="form-heading-icon">
              <FormInput size={26} />
            </div>
            <span className="form-eyebrow">{design.eyebrow}</span>
            <h1>{form.name}</h1>
            <p>{design.description}</p>
            {design.badge && (
              <span className="form-confidential">
                <ShieldCheck size={15} />
                {design.badge}
              </span>
            )}
          </header>
        }
        <div className="form-sheet">
          <ErrorBox message={error} />
          {properties.map((property, index) => (
            <section className="form-question" key={property.id}>
              {design.showNumbers && (
                <span className="form-question-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
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
                uploadLabel={design.uploadLabel}
              />
            </section>
          ))}
          {!preview &&
            properties.some((property) => property.type === "files") && (
              <p className="database-field-help">{design.attachmentNotice}</p>
            )}
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
            <>
              <button
                type="button"
                className="primary-button form-submit"
                disabled
              >
                <Send size={17} />
                {design.submitLabel}
              </button>
              <p className="database-form-footer">{design.footer}</p>
              <p className="database-form-footer">{design.previewHint}</p>
            </>
          ) : (
            <>
              <button
                className="primary-button form-submit"
                disabled={busy || Object.keys(progress).length > 0}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Send size={17} />
                )}{" "}
                {busy ? design.submittingLabel : design.submitLabel}
              </button>
              <p className="database-form-footer">{design.footer}</p>
            </>
          )}
        </div>
      </form>
    </FormAppearance>
  );
}

export function PublicForm({ token }: { token: string }) {
  const [data, setData] = useState<{
    form: DatabaseForm;
    properties: Property[];
  } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const siteTitle = useRef(document.title);
  useEffect(() => {
    if (data) document.title = `${data.form.name} — ${siteTitle.current}`;
  }, [data?.form.name]);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 12000);
    setData(null);
    setError("");
    void api<{ csrf: string }>("session", undefined, {}, controller.signal)
      .then((session) => {
        setCsrf(session.csrf);
        return api<{ form: DatabaseForm; properties: Property[] }>(
          "form_get",
          undefined,
          { token },
          controller.signal,
        );
      })
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((error) => {
        if (!cancelled)
          setError(
            controller.signal.aborted
              ? "La connexion prend trop de temps. Réessaie dans un instant."
              : errorText(error),
          );
      })
      .finally(() => clearTimeout(deadline));
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(deadline);
    };
  }, [token, attempt]);
  if (error)
    return (
      <main className="form-page form-complete">
        <h2>Formulaire indisponible</h2>
        <ErrorBox message={error} />
        <button
          type="button"
          className="small-button"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Réessayer
        </button>
      </main>
    );
  if (!data) return <FormSkeleton />;
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
  initialRowId?: string;
  onClose?: () => void;
  onChooseDatabase?: (id: string) => void;
  onChooseForm?: (id: string) => void;
};
export function DatabaseManager({
  mode = "manage",
  initialDatabaseId,
  initialFormId,
  initialRowId,
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
  const [managerView, setManagerView] = useState<DatabaseViewConfiguration>({
    ...defaultDatabaseView,
    filters: [],
    hiddenPropertyIds: [],
  });
  const managerSource = useId();
  const [search, setSearch] = useState("");
  const [databaseSearch, setDatabaseSearch] = useState("");
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
  const initialRowOpened = useRef(false);
  const managerRef = useRef<HTMLDivElement>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [newRowValues, setNewRowValues] = useState<Record<string, CellValue>>(
    {},
  );
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
  async function refreshChanged() {
    await refresh();
    broadcastDatabaseChange(selectedId, managerSource);
  }
  useDatabaseChanges(
    selectedId,
    () => {
      void refresh().catch((error) => setError(errorText(error)));
    },
    managerSource,
  );
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
    setManagerView({
      ...defaultDatabaseView,
      filters: [],
      hiddenPropertyIds: [],
    });
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
        if (initialRowId && !initialRowOpened.current) {
          const row = normal.rows.find((row) => row.id === initialRowId);
          if (row) {
            setRowEditor(row);
            setTab("records");
            initialRowOpened.current = true;
          }
        }
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
  async function mutate(action: () => Promise<void>, announce = true) {
    setBusy(true);
    setError("");
    try {
      await action();
      if (announce) broadcastDatabaseChange(selectedId, managerSource);
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (!newName.trim()) return;
    await mutate(async () => {
      const { database } = await api<{ database: Database }>("db_create", {
        name: newName.trim(),
      });
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
  async function renameProperty(property: Property) {
    const name = prompt(
      "Nom de la propriété" +
        (bundle?.properties.some((item) => item.type === "formula")
          ? `\nLes formules prop(\"${property.name}\") devront être adaptées au nouveau nom.`
          : ""),
      property.name,
    );
    if (name === null || !name.trim() || name.trim() === property.name) return;
    await mutate(async () => {
      await api("property_save", { ...property, name: name.trim() });
      await refresh();
    });
  }
  function editColumn(property: Property | null) {
    if (
      editorDirty &&
      !confirm(
        "Fermer les modifications de la fiche avant de configurer ce champ ?",
      )
    )
      return;
    setRowEditor(undefined);
    setFormEditor(undefined);
    setPropertyEditor(property);
    setEditorDirty(false);
    setTab("properties");
  }
  async function deleteProperty(property: Property) {
    if (
      !confirm(
        `Supprimer le champ « ${property.name} » ? Ses valeurs ne seront plus disponibles dans les fiches.`,
      )
    )
      return;
    await mutate(async () => {
      const result = await api("property_delete", {
        id: property.id,
        version: property.version,
      });
      broadcastDatabaseChange(selectedId, managerSource, {
        deletedPropertyId: property.id,
        pageVersions: result.page_versions,
      });
      await refresh();
    }, false);
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
  function editRow(
    row: DatabaseRow | null,
    values: Record<string, CellValue> = {},
  ) {
    if (
      editorDirty &&
      !confirm("Remplacer l’éditeur en cours sans enregistrer ?")
    )
      return;
    setNewRowValues(values);
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
      if (
        managerRef.current &&
        event.target instanceof Node &&
        !managerRef.current.contains(event.target)
      )
        return;
      if (event.key === "Escape") {
        if (document.querySelector(".feuillet-floating")) return;
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
          "button:not(:disabled),input:not(:disabled),select:not(:disabled):not([aria-hidden=true]),textarea:not(:disabled),a[href]",
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
  const roomyManager = mode === "manage" && !!onClose && !initialDatabaseId;
  const visibleDatabases = [...databases]
    .sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }))
    .filter((database) =>
      normalizedSearch(database.name).includes(
        normalizedSearch(databaseSearch),
      ),
    );
  return (
    <div
      ref={managerRef}
      className={`database-manager ${roomyManager ? "database-manager-roomy" : ""}`}
    >
      <header className="database-manager-header">
        <div>
          <DatabaseIcon size={23} />
          <span>
            <h2>
              {mode === "database"
                ? "Choisir une base"
                : mode === "form"
                  ? "Choisir un formulaire"
                  : "Bases de données"}
            </h2>
            <small>
              Retrouve tes fiches, configure les champs et gère les formulaires.
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
          <div className="database-list-label">
            Mes bases <span>{databases.length}</span>
          </div>
          {roomyManager && (
            <label className="database-list-search">
              <Search size={15} />
              <input
                aria-label="Rechercher une base"
                placeholder="Rechercher une base"
                value={databaseSearch}
                onChange={(event) => setDatabaseSearch(event.target.value)}
              />
            </label>
          )}
          <div className="database-list-items">
            {visibleDatabases.map((database) => (
              <button
                key={database.id}
                className={database.id === selectedId ? "active" : ""}
                aria-current={database.id === selectedId ? "true" : undefined}
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
            {!visibleDatabases.length && databaseSearch && (
              <p>Aucune base trouvée.</p>
            )}
          </div>
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
                <div className="database-title-identity">
                  <span className="database-manager-emblem">
                    <Table size={22} />
                  </span>
                  <div>
                    <h3>{bundle.database.name}</h3>
                    <span className="database-visibility-label">
                      {bundle.database.visibility === "public" ? (
                        <Globe size={13} />
                      ) : (
                        <Lock size={13} />
                      )}
                      {bundle.database.visibility === "public"
                        ? "Base publique"
                        : "Base privée"}
                    </span>
                  </div>
                </div>
                <div className="database-title-actions">
                  <a
                    className="small-button"
                    href={`index.php?edit=1&project=${encodeURIComponent(bundle.database.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Monitor size={16} /> Projeter les réponses
                  </a>
                  <details className="database-settings-menu">
                    <summary className="small-button">
                      <Settings size={15} /> Gérer la base{" "}
                      <ChevronDown size={13} />
                    </summary>
                    <div
                      className="database-settings-panel"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button"))
                          e.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                      }}
                    >
                      <button
                        disabled={busy}
                        onClick={() => void renameDatabase()}
                      >
                        <Pencil size={15} /> Renommer
                      </button>
                      <button disabled={busy} onClick={() => void visibility()}>
                        {bundle.database.visibility === "public" ? (
                          <Lock size={15} />
                        ) : (
                          <Globe size={15} />
                        )}{" "}
                        {bundle.database.visibility === "public"
                          ? "Rendre privée"
                          : "Rendre publique"}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void reloadDatabase()}
                      >
                        <RefreshCw size={15} /> Actualiser
                      </button>
                      <a
                        href={`rouedudestin?database=${encodeURIComponent(bundle.database.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ArrowUpRight size={15} /> Créer une roue liée
                      </a>
                      <button
                        className="danger"
                        disabled={busy}
                        onClick={() => void deleteDatabase()}
                      >
                        <Trash2 size={15} /> Supprimer la base
                      </button>
                    </div>
                  </details>
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
                      initialValues={newRowValues}
                      onSaved={refreshChanged}
                      onDirtyChange={setEditorDirty}
                      onClose={() => setRowEditor(undefined)}
                    />
                  )}
                  <div className="database-tools database-records-actions">
                    <div>
                      <h4>Fiches de la base</h4>
                      <p className="database-field-help">
                        Clique dans une cellule pour la modifier.
                      </p>
                    </div>
                    <button
                      className="small-button database-new-record"
                      disabled={
                        busy || !bundle.properties.some((p) => !isComputed(p))
                      }
                      onClick={() => editRow(null)}
                    >
                      <Plus size={16} /> Nouvelle fiche
                    </button>
                  </div>
                  <ViewControls
                    bundle={bundle}
                    config={normalizeDatabaseView(
                      managerView,
                      bundle.properties,
                    )}
                    onChange={setManagerView}
                    search={search}
                    onSearch={setSearch}
                  />
                  <Records
                    bundle={bundle}
                    view={managerView.layout}
                    config={managerView}
                    onConfigChange={setManagerView}
                    onCellSaved={refreshChanged}
                    editingDisabled={busy || editorDirty}
                    onPropertyEdit={(property) => editColumn(property)}
                    onPropertyRename={(property) =>
                      void renameProperty(property)
                    }
                    onPropertyDelete={(property) =>
                      void deleteProperty(property)
                    }
                    onAddProperty={() => editColumn(null)}
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
                      onSaved={refreshChanged}
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
                            {property.type === "created_at"
                              ? " · lecture seule"
                              : isComputed(property)
                                ? " · calculé sur le serveur"
                                : ""}
                          </small>
                        </div>
                        {property.type !== "created_at" && (
                          <>
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
                          </>
                        )}
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
                      onSaved={refreshChanged}
                      onDirtyChange={setEditorDirty}
                      onClose={() => setFormEditor(undefined)}
                    />
                  )}
                  <div className="database-tools">
                    <span className="database-field-help">
                      Les visiteurs répondent sans voir le contenu de la base.
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
                      les fichiers envoyés par les visiteurs restent privés et
                      sont visibles uniquement ici.
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

function FormDeliveryAudit({ dbId }: { dbId: string }) {
  const [audit, setAudit] = useState<{
    counts: Record<string, number>;
    uploads: {
      id: string;
      name: string | null;
      state: string;
      available: boolean;
      url: string | null;
    }[];
    unindexedFiles: number;
    truncated: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="database-settings-forms">
      <h4>Réception des fichiers</h4>
      <p>
        Contrôlez les pièces jointes reçues, y compris celles sans réponse
        associée. Les fichiers restent privés.
      </p>
      <button
        className="small-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            setAudit(await api("form_delivery_audit", undefined, { id: dbId }));
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <ShieldCheck size={15} />
        {busy ? "Vérification…" : "Vérifier les pièces jointes"}
      </button>
      <ErrorBox message={error} />
      {audit && (
        <div className="form-delivery-audit" role="status">
          <p>
            <strong>{audit.counts.received}</strong> fichier(s) rattaché(s) ·{" "}
            <strong>{audit.counts.pending}</strong> en attente ·{" "}
            <strong>{audit.counts.unlinked}</strong> sans ligne associée.
          </p>
          {!!audit.counts.missing && (
            <p>
              {audit.counts.missing} fichier(s) enregistré(s) indisponible(s)
              sur le disque, dont d’éventuels envois expirés.
            </p>
          )}
          {!!audit.unindexedFiles && (
            <p>
              {audit.unindexedFiles} fichier(s) sans métadonnées sur le serveur
              : conserver une sauvegarde FTP pour analyse.
            </p>
          )}
          {audit.truncated && (
            <p>Inventaire limité aux 5 000 pièces jointes les plus récentes.</p>
          )}
          <ul>
            {audit.uploads
              .filter((f) => f.available && f.state !== "received")
              .map((f) => (
                <li key={f.id}>
                  <a href={f.url!}>{f.name || "Fichier reçu"}</a> ·{" "}
                  {f.state === "pending" ? "en attente" : "sans ligne"}
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DatabaseSettings({
  bundle,
  onSaved,
  onDirtyChange,
  onRefresh,
  onForm,
}: {
  bundle: DatabaseBundle;
  onSaved: () => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
  onRefresh: () => void;
  onForm: (form: DatabaseForm | null) => void;
}) {
  const [name, setName] = useState(bundle.database.name),
    [visibility, setVisibility] = useState(bundle.database.visibility);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dirty =
    name !== bundle.database.name || visibility !== bundle.database.visibility;
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api("db_save", {
        ...bundle.database,
        name: name.trim(),
        visibility,
      });
      await onSaved();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="database-settings-body">
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Nom de la base
          <input
            required
            maxLength={160}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Accès à cette base
          <Select
            aria-label="Accès à cette base"
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as "private" | "public")
            }
          >
            <option value="private">Privée · administrateur uniquement</option>
            <option value="public">Publique · dans les pages publiées</option>
          </Select>
        </label>
        <p className="database-access-note">
          <ShieldCheck size={16} />
          <span>
            Pour afficher ce tableau aux visiteurs, choisis « Publique » et
            publie la page. Seules les lignes publiques seront visibles. Les
            réponses aux formulaires restent privées.
          </span>
        </p>
        <ErrorBox message={error} />
        <button
          type="submit"
          className="primary-button"
          disabled={busy || !dirty || !name.trim()}
        >
          {busy ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <Check size={15} />
          )}
          Enregistrer les paramètres
        </button>
      </form>
      <section className="database-settings-forms">
        <h4>Formulaires de cette base</h4>
        <p>Créez et personnalisez vos formulaires sans quitter la page.</p>
        {bundle.forms.map((form) => (
          <button
            className="database-form-shortcut"
            key={form.id}
            disabled={busy || dirty}
            onClick={() => onForm(form)}
          >
            <FormInput size={16} />
            <span>{form.name}</span>
            {form.public ? <Globe size={13} /> : <Lock size={13} />}
          </button>
        ))}
        <button
          className="small-button"
          disabled={busy || dirty || !bundle.properties.length}
          onClick={() => onForm(null)}
        >
          <Plus size={14} />
          Créer un formulaire
        </button>
      </section>
      <FormDeliveryAudit dbId={bundle.database.id} />
      <div className="database-settings-utilities">
        <button disabled={busy || dirty} onClick={onRefresh}>
          <RefreshCw size={15} />
          Actualiser la base
        </button>
        <a
          href={`api.php?action=db_export&id=${encodeURIComponent(bundle.database.id)}`}
        >
          <Download size={15} />
          Exporter en CSV
        </a>
      </div>
      <p className="database-field-help">
        Les données et les propriétés sont communes à toutes les vues de cette
        base. Le tri, les filtres et les colonnes masquées ne concernent que ce
        bloc.
      </p>
    </div>
  );
}

export function DatabaseView({
  dbId,
  viewConfig,
  onViewConfigChange,
}: {
  dbId: string;
  viewConfig?: DatabaseViewConfiguration;
  onViewConfigChange?: (config: DatabaseViewConfiguration) => void;
}) {
  const app = useApp();
  const source = useId();
  const loadedKey = useRef("");
  const viewRef = useRef<HTMLElement>(null);
  const [sheetAnchor, setSheetAnchor] = useState<HTMLElement | null>(null);
  const [formEditor, setFormEditor] = useState<
    DatabaseForm | null | undefined
  >();
  const [bundle, setBundle] = useState<DatabaseBundle | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [config, setConfig] = useState<DatabaseViewConfiguration>(() =>
    normalizeDatabaseView(viewConfig),
  );
  const [revision, setRevision] = useState(0);
  const [rowEditor, setRowEditor] = useState<DatabaseRow | null | undefined>();
  const [propertyEditor, setPropertyEditor] = useState<
    Property | null | undefined
  >();
  const [editorDirty, setEditorDirty] = useState(false);
  const [newRowValues, setNewRowValues] = useState<Record<string, CellValue>>(
    {},
  );
  const [databases, setDatabases] = useState<Database[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(
    () => setConfig(normalizeDatabaseView(viewConfig, bundle?.properties)),
    [JSON.stringify(viewConfig), dbId],
  );
  async function reload() {
    const data = await api<DatabaseBundle>(
      app.admin ? "db_get" : "public_db_get",
      undefined,
      { id: dbId },
    );
    setBundle({
      ...data,
      forms: data.forms || [],
      rows: data.rows || [],
      properties: data.properties || [],
    });
    setConfig((current) => normalizeDatabaseView(current, data.properties));
  }
  useEffect(() => {
    let cancelled = false;
    const key = `${dbId}:${app.admin}`;
    if (loadedKey.current !== key) {
      setBundle(null);
      loadedKey.current = key;
    }
    setError("");
    void api<DatabaseBundle>(
      app.admin ? "db_get" : "public_db_get",
      undefined,
      { id: dbId },
    )
      .then((data) => {
        if (!cancelled) {
          setBundle({
            ...data,
            forms: data.forms || [],
            rows: data.rows || [],
            properties: data.properties || [],
          });
          setConfig((current) =>
            normalizeDatabaseView(current, data.properties),
          );
        }
      })
      .catch((error) => {
        if (!cancelled) setError(errorText(error));
      });
    if (app.admin)
      void api<{ databases: Database[] }>("db_list")
        .then((data) => {
          if (!cancelled) setDatabases(data.databases || []);
        })
        .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dbId, app.admin, revision]);
  useDatabaseChanges(dbId, () => setRevision((value) => value + 1), source);
  function changeView(next: DatabaseViewConfiguration) {
    const clean = normalizeDatabaseView(next, bundle?.properties);
    setConfig(clean);
    if (app.admin) onViewConfigChange?.(clean);
  }
  async function saved() {
    await reload();
    broadcastDatabaseChange(dbId, source);
  }
  function openRow(
    row: DatabaseRow | null,
    values: Record<string, CellValue> = {},
  ) {
    if (
      editorDirty &&
      !confirm("Fermer les modifications non enregistrées de la fiche ?")
    )
      return;
    setSheetAnchor(document.activeElement as HTMLElement);
    setPropertyEditor(undefined);
    setNewRowValues(values);
    setRowEditor(row);
    setEditorDirty(false);
  }
  function openProperty(property: Property | null) {
    if (
      editorDirty &&
      !confirm(
        "Fermer les modifications non enregistrées avant de configurer un champ ?",
      )
    )
      return;
    setSheetAnchor(document.activeElement as HTMLElement);
    setRowEditor(undefined);
    setPropertyEditor(property);
    setEditorDirty(false);
  }
  function renameProperty(property: Property) {
    openProperty(property);
  }
  function closeEditors() {
    if (
      busy ||
      (editorDirty &&
        !confirm("Fermer sans enregistrer les modifications en cours ?"))
    )
      return;
    setRowEditor(undefined);
    setPropertyEditor(undefined);
    setFormEditor(undefined);
    setEditing(false);
    setEditorDirty(false);
  }
  function newRecord() {
    const input =
      config.layout === "table"
        ? viewRef.current?.querySelector<HTMLInputElement>(
            "[data-quick-add] input",
          )
        : null;
    if (input) {
      input.scrollIntoView({ block: "nearest" });
      input.focus();
    } else openRow(null);
  }
  useEffect(() => {
    if (!editorDirty) return;
    const block = (event: Event) => {
      event.preventDefault();
    };
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    document.addEventListener("feuillet:before-page-change", block);
    window.addEventListener("beforeunload", unload);
    return () => {
      document.removeEventListener("feuillet:before-page-change", block);
      window.removeEventListener("beforeunload", unload);
    };
  }, [editorDirty]);
  async function removeProperty(property: Property) {
    if (
      !confirm(
        `Supprimer le champ « ${property.name} » dans cette base et toutes ses vues ? Les valeurs de ce champ seront supprimées.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await api("property_delete", {
        id: property.id,
        version: property.version,
      });
      broadcastDatabaseChange(dbId, source, {
        deletedPropertyId: property.id,
        pageVersions: response.page_versions,
      });
      await reload();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  async function removeRow(row: DatabaseRow) {
    if (
      !bundle ||
      !confirm(`Supprimer la fiche « ${rowTitle(row, bundle.properties)} » ?`)
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api("row_delete", { id: row.id, version: row.version });
      await saved();
    } catch (error) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      ref={viewRef}
      className="database-embedded database-linked-view database-workbench"
      aria-label={bundle?.database.name || "Base de données"}
    >
      <header className="database-embedded-header">
        <h3>
          {app.admin && bundle ? (
            <button
              className="database-name-button"
              title="Renommer ou configurer cette base"
              onClick={(event) => {
                setSheetAnchor(event.currentTarget);
                setEditing(true);
              }}
            >
              <DatabaseIcon size={18} />
              <span>{bundle.database.name}</span>
              <Pencil size={13} className="database-name-edit" />
            </button>
          ) : (
            <>
              <DatabaseIcon size={18} />
              {bundle?.database.name || "Base de données"}
            </>
          )}
        </h3>
        {app.admin && bundle && (
          <div className="database-linked-actions">
            <button
              className="database-access-button"
              onClick={(event) => {
                setSheetAnchor(event.currentTarget);
                setEditing(true);
              }}
              title="Visibilité et réglages de la base"
            >
              {bundle.database.visibility === "public" ? (
                <Globe size={12} />
              ) : (
                <Lock size={12} />
              )}
              <span>
                {bundle.database.visibility === "public"
                  ? "Publique"
                  : "Privée"}
              </span>
            </button>
            <button
              className="icon-button"
              aria-label="Paramètres de la base"
              title="Paramètres de la base"
              onClick={(event) => {
                setSheetAnchor(event.currentTarget);
                setEditing(true);
              }}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        )}
      </header>
      <ErrorBox message={error} />
      {!bundle && !error ? (
        <Loading />
      ) : (
        bundle && (
          <>
            <ViewControls
              bundle={bundle}
              config={normalizeDatabaseView(config, bundle.properties)}
              onChange={changeView}
              search={search}
              onSearch={setSearch}
              onNew={app.admin ? newRecord : undefined}
              onAddProperty={app.admin ? () => openProperty(null) : undefined}
              onPropertyEdit={app.admin ? openProperty : undefined}
              busy={busy || editorDirty}
            />
            <Records
              bundle={bundle}
              view={config.layout}
              config={config}
              onConfigChange={changeView}
              search={search}
              relationLabels={bundle.relation_labels || {}}
              onCellSaved={app.admin ? saved : undefined}
              editingDisabled={busy || editorDirty}
              onEdit={app.admin ? openRow : undefined}
              onDelete={app.admin ? (row) => void removeRow(row) : undefined}
              onPropertyEdit={app.admin ? openProperty : undefined}
              onPropertyRename={app.admin ? renameProperty : undefined}
              onPropertyDelete={
                app.admin
                  ? (property) => void removeProperty(property)
                  : undefined
              }
              onAddProperty={app.admin ? () => openProperty(null) : undefined}
            />
            <footer className="database-view-summary">
              <span>
                {
                  databaseViewRows(
                    bundle,
                    config,
                    search,
                    bundle.relation_labels || {},
                  ).length
                }{" "}
                / {bundle.rows.length} ligne{bundle.rows.length > 1 ? "s" : ""}
              </span>
              {app.admin && (
                <span>
                  <ShieldCheck size={12} />
                  Réponses aux formulaires privées
                </span>
              )}
            </footer>
            {app.admin && rowEditor !== undefined && (
              <DatabaseSheet
                title={
                  rowEditor
                    ? rowTitle(rowEditor, bundle.properties)
                    : "Nouvelle ligne"
                }
                subtitle={bundle.database.name}
                anchor={sheetAnchor}
                onClose={closeEditors}
              >
                <RowEditor
                  key={rowEditor?.id || "new"}
                  bundle={bundle}
                  row={rowEditor}
                  initialValues={newRowValues}
                  onDirtyChange={setEditorDirty}
                  onSaved={saved}
                  onClose={() => {
                    setRowEditor(undefined);
                    setEditorDirty(false);
                  }}
                />
              </DatabaseSheet>
            )}
            {app.admin && propertyEditor !== undefined && (
              <DatabaseSheet
                title={
                  propertyEditor
                    ? `Propriété · ${propertyEditor.name}`
                    : "Nouvelle propriété"
                }
                subtitle={bundle.database.name}
                anchor={sheetAnchor}
                onClose={closeEditors}
              >
                <PropertyEditor
                  key={propertyEditor?.id || "new"}
                  bundle={bundle}
                  property={propertyEditor}
                  databases={databases}
                  onDirtyChange={setEditorDirty}
                  onSaved={saved}
                  onClose={() => {
                    setPropertyEditor(undefined);
                    setEditorDirty(false);
                  }}
                />
              </DatabaseSheet>
            )}
            {app.admin && editing && formEditor === undefined && (
              <DatabaseSheet
                title="Paramètres de la base"
                subtitle={bundle.database.name}
                anchor={sheetAnchor}
                onClose={closeEditors}
              >
                <DatabaseSettings
                  bundle={bundle}
                  onSaved={saved}
                  onDirtyChange={setEditorDirty}
                  onRefresh={() => {
                    setRevision((n) => n + 1);
                    setEditing(false);
                  }}
                  onForm={(form) => {
                    setFormEditor(form);
                    setEditorDirty(false);
                  }}
                />
              </DatabaseSheet>
            )}
            {app.admin && formEditor !== undefined && (
              <DatabaseSheet
                title={formEditor ? formEditor.name : "Nouveau formulaire"}
                subtitle={bundle.database.name}
                anchor={sheetAnchor}
                onClose={closeEditors}
              >
                <FormBuilder
                  key={formEditor?.id || "new"}
                  bundle={bundle}
                  form={formEditor}
                  onSaved={saved}
                  onDirtyChange={setEditorDirty}
                  onClose={() => {
                    setFormEditor(undefined);
                    setEditorDirty(false);
                  }}
                />
              </DatabaseSheet>
            )}
          </>
        )
      )}
    </section>
  );
}

export function FormView({
  formId,
  token,
  buttonAppearance = {},
  onAppearanceChange,
}: {
  formId: string;
  token?: string;
  buttonAppearance?: ButtonAppearance;
  onAppearanceChange?: (value: ButtonAppearance) => void;
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
  useDatabaseChanges(data?.form.db_id || "", () => {
    void api<{ form: DatabaseForm; properties: Property[] }>(
      "form_get",
      undefined,
      token ? { token } : { id: formId },
    )
      .then(setData)
      .catch(() => {});
  });
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
  if (!data) return <FormSkeleton />;
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
              ? "Ce formulaire est accessible aux visiteurs."
              : "Ce formulaire est privé. Publie-le pour permettre les réponses."}{" "}
            Les réponses restent privées.
          </p>
          <div className="database-tools">
            <a
              className="small-button"
              href={`index.php?edit=1&project=${encodeURIComponent(data.form.db_id)}&source=${encodeURIComponent(data.form.id)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Monitor size={14} /> Projeter les réponses
            </a>
            <button
              className="small-button"
              onClick={() => setPreview(!preview)}
            >
              {preview ? "Fermer l’aperçu" : "Prévisualiser les questions"}
            </button>
            {data.form.public && (
              <a
                className={buttonClasses(buttonAppearance)}
                href={formUrl(data.form.token)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={13} />{" "}
                {buttonAppearance.buttonLabel ||
                  formDesign(data.form.config).openLabel}
              </a>
            )}
          </div>
          {onAppearanceChange && (
            <details className="form-button-options">
              <summary>Apparence du bouton</summary>
              <ButtonAppearanceFields
                value={buttonAppearance}
                onChange={onAppearanceChange}
              />
            </details>
          )}
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
