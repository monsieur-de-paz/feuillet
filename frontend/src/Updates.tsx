import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Download,
  RefreshCw,
  BellOff,
  ShieldCheck,
  X,
} from "lucide-react";
import { api, ApiError } from "./types";
export type UpdateState = {
  installed_version: string;
  notifications: boolean;
  token_configured: boolean;
  checked_at: number;
  release: null | { version: string; name: string; notes: string; url: string };
  available: boolean;
  show_notification: boolean;
  check_error: string | null;
  ready: boolean;
  checks: Record<string, boolean>;
  job: null | {
    id: string;
    phase: string;
    message: string;
    version: string;
    updated_at: number;
    has_backup: boolean;
  };
};
export function useUpdates(
  authenticated: boolean,
  csrf: string,
  beforeInstall: () => Promise<boolean>,
) {
  const [status, setStatus] = useState<UpdateState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{
    phase: string;
    message: string;
    id?: string;
  } | null>(null);
  const busyRef = useRef(false),
    saveRef = useRef(beforeInstall);
  saveRef.current = beforeInstall;
  useEffect(() => {
    if (!authenticated) {
      setStatus(null);
      return;
    }
    let live = true;
    const check = async () => {
      try {
        const current = await api<UpdateState>("update_status");
        if (!live) return;
        setStatus(current);
        setError("");
        if (
          current.notifications &&
          current.checked_at < Date.now() / 1000 - 86400 &&
          !current.job?.phase.match(/^(download|extract|apply|validating)$/)
        ) {
          const checked = await api<UpdateState>("update_check", {});
          if (live) setStatus(checked);
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    };
    void check();
    window.addEventListener("focus", check);
    return () => {
      live = false;
      window.removeEventListener("focus", check);
    };
  }, [authenticated]);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setStatus(await api("update_check", { force: true }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function preference(choice: string) {
    try {
      setStatus(await api("update_preferences", { choice }));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function token(value: string) {
    setBusy(true);
    setError("");
    try {
      setStatus(await api("update_preferences", { token: value }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function endpoint(path: string, body: object) {
    const response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "La mise à jour a échoué.");
    return result;
  }
  async function step(id: string) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await api("update_step", { id });
      } catch (e) {
        if (
          !(e instanceof ApiError) ||
          e.code !== "update_busy" ||
          attempt >= 8
        )
          throw e;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
  async function install() {
    if (busyRef.current || !status?.release || !status.ready) return;
    if (!(await saveRef.current())) {
      setError("Enregistre la page avant de mettre Feuillet à jour.");
      return;
    }
    if (
      !document.dispatchEvent(
        new Event("feuillet:before-page-change", { cancelable: true }),
      )
    )
      return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    let id = "";
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", unload);
    try {
      setProgress({ phase: "download", message: "Préparation de la release…" });
      const started = await api("update_start", {
        version: status.release.version,
      });
      id = started.job.id;
      let job = started.job;
      setProgress(job);
      while (["download", "extract", "apply"].includes(job.phase)) {
        const result = await step(id);
        job = result.job;
        setProgress(job);
      }
      await endpoint("update-health.php", { id });
      setProgress({
        phase: "complete",
        message: `Feuillet ${status.release.version} est installé.`,
        id,
      });
    } catch (e) {
      let message = (e as Error).message;
      let completed = false;
      if (id) {
        try {
          const recovered = await endpoint("recover.php", { id });
          if (recovered.already_installed) {
            completed = true;
            setProgress({ phase: "complete", message: recovered.message, id });
          } else message += " La version précédente est disponible.";
        } catch {
          message +=
            " Ouvre la procédure de restauration si l’installation reste indisponible.";
        }
      }
      if (!completed) setProgress({ phase: "failed", message, id });
      try {
        setStatus(await api("update_status"));
      } catch {
        /* standalone recovery remains available */
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
      window.removeEventListener("beforeunload", unload);
    }
  }
  return {
    status,
    busy,
    error,
    progress,
    refresh,
    preference,
    token,
    install,
    recover: async () => {
      try {
        await endpoint("recover.php", { id: status?.job?.id });
        location.reload();
      } catch (e) {
        setError((e as Error).message);
      }
    },
    dismiss: () => {
      if (progress?.phase === "complete") location.reload();
      else setProgress(null);
    },
  };
}
type Controller = ReturnType<typeof useUpdates>;
export function UpdateBanner({
  updates,
  onOpen,
}: {
  updates: Controller;
  onOpen: () => void;
}) {
  if (!updates.status?.show_notification) return null;
  return (
    <aside className="update-banner" aria-label="Mise à jour disponible">
      <RefreshCw size={17} />
      <span>Feuillet {updates.status.release?.version} est disponible.</span>
      <button onClick={onOpen}>
        Voir la mise à jour <ArrowUpRight size={14} />
      </button>
      <button
        className="update-postpone"
        onClick={() => void updates.preference("later")}
        aria-label="Reporter la notification de sept jours"
      >
        <X size={16} />
      </button>
    </aside>
  );
}
export function UpdatePanel({ updates }: { updates: Controller }) {
  const { status, busy, error } = updates;
  const [secret, setSecret] = useState("");
  const [editToken, setEditToken] = useState(false);
  return (
    <section className="update-panel" aria-label="Mises à jour de Feuillet">
      <header>
        <div className="update-symbol">
          <RefreshCw size={23} />
        </div>
        <div>
          <h3>Feuillet, toujours à jour.</h3>
          <p>Version installée {status?.installed_version || "…"}</p>
        </div>
        <button
          className="small-button"
          onClick={() => void updates.refresh()}
          disabled={busy}
        >
          <RefreshCw size={15} className={busy ? "update-spin" : ""} />
          Vérifier
        </button>
      </header>
      {status?.available && status.release ? (
        <div className="update-release">
          <div className="update-release-heading">
            <strong>Version {status.release.version}</strong>
            <a
              href={status.release.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Notes de version <ArrowUpRight size={14} />
            </a>
          </div>
          <p className="update-notes">{status.release.notes}</p>
          <div className="update-safety">
            <ShieldCheck size={18} />
            <span>
              Le code et la base seront sauvegardés. Tes fichiers resteront
              conservés.
            </span>
          </div>
          <button
            className="primary-button"
            disabled={busy || !status.ready}
            onClick={() => void updates.install()}
          >
            <Download size={16} />
            Installer la mise à jour
          </button>
          <div className="update-choices">
            <button
              disabled={busy}
              onClick={() => void updates.preference("later")}
            >
              Reporter de 7 jours
            </button>
            <button
              disabled={busy}
              onClick={() => void updates.preference("next")}
            >
              Attendre la suivante
            </button>
            <button
              disabled={busy}
              onClick={() => void updates.preference("ignore")}
            >
              Ignorer cette version
            </button>
          </div>
        </div>
      ) : (
        <p className="update-empty">
          {status?.checked_at && !status.check_error
            ? "Tu utilises la dernière version vérifiée."
            : "Vérifie les releases GitHub pour connaître les nouveautés."}
        </p>
      )}
      {status && !status.ready && (
        <p className="update-warning">
          {status.checks.git_checkout
            ? "Cette copie est un dépôt de développement. Utilise une archive installable pour les mises à jour intégrées."
            : "Installation intégrée indisponible : vérifie cURL, ZIP, tokenizer, le manifeste et les droits d’écriture. La mise à jour par FTP reste possible."}
        </p>
      )}
      {(error || status?.check_error) && (
        <p className="form-error" role="alert">
          {error || status?.check_error}
        </p>
      )}
      <div className="update-preferences">
        <label>
          <input
            type="checkbox"
            checked={status?.notifications ?? true}
            disabled={!status || busy}
            onChange={(e) =>
              void updates.preference(e.target.checked ? "enable" : "mute")
            }
          />
          <span>M’informer des nouvelles versions</span>
        </label>
        <small>
          Une vérification par jour lorsque tu ouvres Feuillet. Aucune
          installation sans ton choix.
        </small>
      </div>
      <button
        className="update-text-button"
        onClick={() => setEditToken(!editToken)}
        aria-expanded={editToken}
      >
        {status?.token_configured
          ? "Accès GitHub privé configuré"
          : "Configurer l’accès à un dépôt privé"}
      </button>
      {editToken && (
        <div className="update-token">
          <label htmlFor="github-token">
            Jeton GitHub — lecture du contenu de ce dépôt
          </label>
          <input
            id="github-token"
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            autoComplete="new-password"
            placeholder="Le jeton reste dans le stockage privé"
            maxLength={255}
          />
          <div>
            <button
              className="small-button"
              disabled={busy || !secret}
              onClick={() => {
                void updates.token(secret);
                setSecret("");
              }}
            >
              Enregistrer le jeton
            </button>
            {status?.token_configured && (
              <button
                className="small-button"
                disabled={busy}
                onClick={() => void updates.token("")}
              >
                Supprimer le jeton
              </button>
            )}
          </div>
        </div>
      )}
      {status?.job && (
        <div className="update-last-job">
          <small>
            Dernière opération : {status.job.message || status.job.phase}
          </small>
          {["complete", "rolled_back"].includes(status.job.phase) &&
            status.job.has_backup && (
              <a
                href={`api.php?action=update_backup&id=${encodeURIComponent(status.job.id)}`}
              >
                <Download size={14} />
                Sauvegarde avant installation
              </a>
            )}
          {["download", "extract", "apply", "validating"].includes(
            status.job.phase,
          ) && (
            <button
              className="small-button"
              disabled={busy}
              onClick={() => void updates.recover()}
            >
              Rétablir la version précédente
            </button>
          )}
        </div>
      )}
    </section>
  );
}
export function UpdateProgress({ updates }: { updates: Controller }) {
  const progress = updates.progress;
  if (!progress) return null;
  const finished = ["complete", "failed"].includes(progress.phase);
  const hasBackup =
    progress.phase === "complete" ||
    (updates.status?.job?.id === progress.id &&
      updates.status?.job?.has_backup);
  const labels = [
    "Télécharger",
    "Vérifier",
    "Sauvegarder et installer",
    "Ouvrir Feuillet",
  ];
  const current =
    progress.phase === "download"
      ? 0
      : progress.phase === "extract"
        ? 1
        : progress.phase === "apply"
          ? 2
          : 3;
  return (
    <div className="update-progress">
      <div className={`update-progress-icon ${finished ? "" : "update-spin"}`}>
        {progress.phase === "complete" ? (
          <Check size={30} />
        ) : progress.phase === "failed" ? (
          <BellOff size={30} />
        ) : (
          <RefreshCw size={30} />
        )}
      </div>
      <p role="status" aria-live="polite">
        {progress.message}
      </p>
      <ol>
        {labels.map((label, i) => (
          <li
            key={label}
            className={
              i < current || progress.phase === "complete"
                ? "done"
                : i === current
                  ? "current"
                  : ""
            }
          >
            <span>
              {i < current || progress.phase === "complete" ? (
                <Check size={13} />
              ) : (
                i + 1
              )}
            </span>
            {label}
          </li>
        ))}
      </ol>
      {finished ? (
        <div className="update-progress-actions">
          <button className="primary-button" onClick={() => location.reload()}>
            Ouvrir Feuillet
          </button>
          {progress.id && hasBackup && (
            <a
              href={`api.php?action=update_backup&id=${encodeURIComponent(progress.id)}`}
              className="small-button"
            >
              Télécharger la sauvegarde
            </a>
          )}
          <button className="small-button" onClick={updates.dismiss}>
            Fermer
          </button>
        </div>
      ) : (
        <small>
          Garde cet onglet ouvert. En cas d’interruption pendant l’installation,
          la restauration reprend automatiquement.
        </small>
      )}
    </div>
  );
}
