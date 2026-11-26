import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { ChevronDown, Maximize, Minimize, Settings2, X } from "lucide-react";
import { api, setCsrf } from "./types";
import type { ProjectionProperty } from "./ProjectionRules";
import { wheelLabel, wheelTarget, type WheelData } from "./destiny-wheel-model";
import {
  animateWheel,
  wheelDuration,
  wheelSeconds,
  wheelSpinTarget,
  wheelDurationKey,
  wheelMotion,
  wheelMotionKey,
  type WheelMotion,
} from "./wheel-motion";
import "./destiny-wheel.css";
const palette = [
  "#D93852",
  "#6554D9",
  "#00788A",
  "#B75A00",
  "#246AC1",
  "#A42AAA",
  "#157F57",
  "#B72E76",
];
export function enterWheelFullscreen(element: HTMLDivElement | null): void {
  if (!element || document.fullscreenElement?.contains(element)) return;
  // Keep the viewport presentation usable if the native request is refused.
  try {
    void element.requestFullscreen?.().catch(() => {});
  } catch {}
}

export function DestinyWheel({
  id,
  source,
  properties,
  initialGroup,
  onClose,
  savedId,
  title,
  screenRef,
}: {
  id: string;
  source: string;
  properties: ProjectionProperty[];
  initialGroup: string;
  onClose: () => void;
  savedId?: string;
  title?: string;
  screenRef: RefObject<HTMLDivElement | null>;
}) {
  const [fullscreenElement, setFullscreenElement] = useState<Element | null>(
    document.fullscreenElement,
  );
  useEffect(() => {
    const sync = () => setFullscreenElement(document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    sync();
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const nativeFullscreen =
    !!fullscreenElement && fullscreenElement === screenRef.current;
  const inheritedFullscreen =
    !!fullscreenElement &&
    !nativeFullscreen &&
    fullscreenElement.contains(screenRef.current);
  function closePresentation() {
    if (
      document.fullscreenElement &&
      document.fullscreenElement === screenRef.current
    )
      void document.exitFullscreen?.().catch(() => {});
    onClose();
  }
  const usable = properties.filter(
    (p) => !["files", "formula", "rollup", "relation"].includes(p.type),
  );
  const preferenceKey = "feuillet:destiny-choice:" + id + ":" + source;
  const preferences = () => {
    try {
      const p = JSON.parse(localStorage.getItem(preferenceKey) || "{}");
      if (p.group !== "*") JSON.parse(p.group);
      return p;
    } catch {
      return {};
    }
  };
  const [participantQuery, setParticipantQuery] = useState(""),
    [participantLimit, setParticipantLimit] = useState(100);
  const [property, setProperty] = useState(
      () =>
        usable.find((p) => p.id === preferences().property)?.id ||
        usable.find((p) => p.type === "title")?.id ||
        usable[0]?.id ||
        "",
    ),
    [groupBy, setGroupBy] = useState(() => {
      const saved = preferences().groupBy;
      return typeof saved === "string" &&
        (saved === "" || usable.some((p) => p.id === saved))
        ? saved
        : initialGroup;
    }),
    [group, setGroup] = useState(() =>
      typeof preferences().group === "string" ? preferences().group : "*",
    );
  const [data, setData] = useState<WheelData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [spinning, setSpinning] = useState(false),
    [muted, setMuted] = useState(() => preferences().muted === true),
    [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(
        preferenceKey,
        JSON.stringify({ property, groupBy, group, muted }),
      );
    } catch {}
  }, [property, groupBy, group, muted, preferenceKey]);
  const [availableGroups, setAvailableGroups] = useState<WheelData["groups"]>(
    [],
  );
  const [motion, setMotion] = useState<WheelMotion>(() => {
    try {
      return wheelMotion(localStorage.getItem(wheelMotionKey));
    } catch {
      return "auto";
    }
  });
  const [customSeconds, setCustomSeconds] = useState<number | null>(() => {
    try {
      const value = localStorage.getItem(wheelDurationKey);
      return value === null ? null : wheelSeconds(Number(value));
    } catch {
      return null;
    }
  });
  const seconds = customSeconds ?? (motion === "light" ? 2 : 5);
  useEffect(() => {
    if (customSeconds !== null) {
      try {
        localStorage.setItem(wheelDurationKey, String(customSeconds));
      } catch {}
    }
  }, [customSeconds]);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    query.addEventListener?.("change", change);
    return () => query.removeEventListener?.("change", change);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(wheelMotionKey, motion);
    } catch {}
  }, [motion]);
  const animation = useRef<ReturnType<typeof animateWheel> | null>(null);
  const rotor = useRef<SVGGElement>(null);
  const rotation = useRef(0);
  const spinSound = useRef<{ step: number; sector: number; at: number } | null>(
    null,
  );
  function paintRotation(angle: number) {
    rotation.current = angle;
    rotor.current?.setAttribute("transform", `rotate(${angle})`);
    const ticking = spinSound.current;
    if (ticking) {
      const sector = Math.floor(angle / ticking.step),
        now = performance.now();
      if (sector !== ticking.sector && now - ticking.at >= 45) {
        sound("tick");
        ticking.at = now;
      }
      ticking.sector = sector;
    }
  }
  useEffect(() => {
    if (motion === "auto" && reduced && spinning) animation.current?.finish();
  }, [motion, reduced, spinning]);
  const lastEntries = useRef<WheelData["entries"]>([]);
  const titleId = useId(),
    dialog = useRef<HTMLDivElement>(null),
    result = useRef<HTMLHeadingElement>(null),
    audio = useRef<AudioContext | null>(null),
    audioGain = useRef<GainNode | null>(null),
    generation = useRef(0),
    inFlight = useRef(false),
    controller = useRef<AbortController | null>(null);
  const scope = savedId
    ? { saved_id: savedId }
    : {
        id,
        source,
        property,
        groupBy,
        all: group === "*",
        group: group === "*" ? null : JSON.parse(group),
      };
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  async function fetchState() {
    const attempt = ++generation.current;
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setData(null);
    setError("");
    setBusy(true);
    try {
      const session = await api("session", undefined, {}, ac.signal);
      setCsrf(session.csrf);
      const next = await api<WheelData>(
        "wheel_state",
        scopeRef.current,
        {},
        ac.signal,
      );
      if (attempt === generation.current) {
        setData(next);
        setAvailableGroups(next.groups);
        lastEntries.current = next.entries;
        const idx = next.state.pending
          ? next.entries.findIndex((e) => e.id === next.state.pending!.id)
          : -1;
        paintRotation(
          idx >= 0
            ? wheelTarget(
                0,
                Math.floor(
                  (idx * Math.min(60, next.entries.length)) /
                    next.entries.length,
                ),
                Math.min(60, next.entries.length),
              )
            : 0,
        );
      }
    } catch (e) {
      if (attempt === generation.current && (e as Error).name !== "AbortError")
        setError((e as Error).message);
    } finally {
      if (attempt === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    void fetchState();
    return () => {
      generation.current++;
      controller.current?.abort();
    };
  }, [id, source, property, groupBy, group, savedId]);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    const restored = new Map<HTMLElement, boolean>();
    let current: Element | null = dialog.current;
    while (current?.parentElement) {
      for (const sibling of current.parentElement.children)
        if (sibling !== current && sibling instanceof HTMLElement) {
          restored.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      current = current.parentElement;
      if (current === document.body) break;
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      restored.forEach((was, node) => {
        node.inert = was;
      });
      document.body.style.overflow = overflow;
      animation.current?.cancel();
      spinSound.current = null;
      void audio.current?.close();
      prior?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (audioGain.current) audioGain.current.gain.value = muted ? 0 : 0.06;
  }, [muted]);
  function sound(kind: "prepare" | "tick" | "win") {
    if (muted) return;
    try {
      if (!audio.current) {
        audio.current = new AudioContext();
        audioGain.current = audio.current.createGain();
        audioGain.current.gain.value = 0.06;
        audioGain.current.connect(audio.current.destination);
      }
      const ctx = audio.current;
      void ctx.resume().catch(() => {});
      if (kind === "prepare") return;
      const notes = kind === "win" ? [523, 659, 784, 1047] : [640];
      notes.forEach((hz, i) => {
        const t = ctx.currentTime + (kind === "win" ? i * 0.15 : 0);
        const osc = ctx.createOscillator(),
          gain = ctx.createGain();
        osc.type = kind === "win" ? "sine" : "triangle";
        osc.frequency.value = hz;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.5, t + 0.005);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          t + (kind === "win" ? 0.4 : 0.035),
        );
        osc.connect(gain);
        gain.connect(audioGain.current!);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    } catch {}
  }
  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!data || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const attempt = generation.current;
    if (action === "wheel_spin") {
      sound("prepare");
    }
    try {
      const session = await api("session");
      setCsrf(session.csrf);
      const next = await api<WheelData>(action, {
        ...scopeRef.current,
        revision: data.state.revision,
        ...extra,
      });
      if (attempt !== generation.current) return;
      lastEntries.current = next.entries;
      setAvailableGroups(next.groups);
      if (action === "wheel_spin" && next.state.pending) {
        const idx = next.entries.findIndex(
          (e) => e.id === next.state.pending!.id,
        );
        if (idx < 0) throw new Error("La liste a changé. Recharge la roue.");
        const duration = wheelDuration(motion, reduced, seconds);
        const destination = wheelSpinTarget(
          rotation.current,
          Math.floor(
            (idx * Math.min(60, next.entries.length)) / next.entries.length,
          ),
          Math.min(60, next.entries.length),
          duration,
          motion === "light",
        );
        setData(next);
        setSpinning(duration > 0);
        animation.current?.cancel();
        const step = 360 / Math.min(60, next.entries.length);
        spinSound.current = duration
          ? { step, sector: Math.floor(rotation.current / step), at: 0 }
          : null;
        animation.current = animateWheel(
          rotation.current,
          destination,
          duration,
          paintRotation,
          () => {
            if (attempt !== generation.current) return;
            spinSound.current = null;
            setSpinning(false);
            sound("win");
            result.current?.focus({ preventScroll: true });
          },
        );
      } else {
        setData(next);
        setConfirmReset(false);
      }
    } catch (e) {
      setError((e as Error).message);
      void audio.current?.close().catch(() => {});
      audio.current = null;
      audioGain.current = null;
    } finally {
      inFlight.current = false;
      if (attempt === generation.current) setBusy(false);
    }
  }
  const entries = data?.entries || lastEntries.current,
    segments = Math.min(60, entries.length),
    winner = !spinning ? data?.state.pending : null;
  return (
    <div
      className="destiny-shade"
      ref={screenRef}
      data-wheel-fullscreen={
        nativeFullscreen
          ? "native"
          : inheritedFullscreen
            ? "inherited"
            : "viewport"
      }
    >
      <div
        className={`destiny-dialog ${motion === "light" || motion === "off" ? "destiny-calm" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialog}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !document.fullscreenElement) {
            e.preventDefault();
            e.stopPropagation();
            closePresentation();
          }
          if (e.key === "Tab") {
            const controls = [
              ...e.currentTarget.querySelectorAll<HTMLElement>(
                'button:not(:disabled),select:not(:disabled),input:not(:disabled),summary,[tabindex="0"]',
              ),
            ].filter((el) => el.getClientRects().length);
            if (e.shiftKey && document.activeElement === controls[0]) {
              e.preventDefault();
              controls.at(-1)?.focus();
            } else if (
              !e.shiftKey &&
              document.activeElement === controls.at(-1)
            ) {
              e.preventDefault();
              controls[0]?.focus();
            }
          }
        }}
      >
        <header>
          <div>
            {title && <span className="destiny-eyebrow">Roue du destin</span>}
            <h2 id={titleId}>{title || "Roue du destin"}</h2>
          </div>
          <div className="destiny-screen-actions">
            <button
              type="button"
              onClick={closePresentation}
              title="Fermer la roue"
              aria-label="Fermer la roue"
            >
              <X size={21} />
            </button>
            {!inheritedFullscreen &&
              typeof document.documentElement.requestFullscreen ===
                "function" && (
                <button
                  type="button"
                  title={
                    nativeFullscreen
                      ? "Quitter le plein écran"
                      : "Activer le plein écran"
                  }
                  aria-label={
                    nativeFullscreen
                      ? "Quitter le plein écran"
                      : "Activer le plein écran"
                  }
                  onClick={() =>
                    nativeFullscreen
                      ? void document.exitFullscreen?.().catch(() => {})
                      : enterWheelFullscreen(screenRef.current)
                  }
                >
                  {nativeFullscreen ? (
                    <Minimize size={19} />
                  ) : (
                    <Maximize size={19} />
                  )}
                </button>
              )}
          </div>
        </header>
        {data?.warning && (
          <p className="destiny-error" role="status">
            {data.warning}
          </p>
        )}
        <div className="destiny-stage">
          <div
            className="destiny-wheel-area"
            data-spinning={spinning}
            data-revealed={!!winner}
          >
            <span className="destiny-pointer" aria-hidden="true">
              ▼
            </span>
            <svg
              className={`destiny-wheel ${spinning ? "is-spinning" : ""}`}
              viewBox="-210 -210 420 420"
              aria-hidden="true"
              style={{
                opacity: busy && !spinning ? 0.45 : 1,
              }}
            >
              <g ref={rotor} transform="rotate(0)" data-wheel-rotor="">
                {segments ? (
                  Array.from({ length: segments }, (_, i) => {
                    const angle = 360 / segments,
                      a = ((-90 + i * angle) * Math.PI) / 180,
                      b = ((-90 + (i + 1) * angle) * Math.PI) / 180,
                      mid = ((-90 + (i + 0.5) * angle) * Math.PI) / 180;
                    const entry =
                      entries[Math.floor((i * entries.length) / segments)];
                    const lines = wheelLabel(entry.label, segments),
                      font = segments > 30 ? 8 : segments > 16 ? 10 : 12;
                    const degree = -90 + (i + 0.5) * angle,
                      readable =
                        degree +
                        ((degree + 360) % 360 > 90 && (degree + 360) % 360 < 270
                          ? 180
                          : 0);
                    return (
                      <g key={i}>
                        {segments === 1 ? (
                          <circle r="198" fill={palette[0]} />
                        ) : (
                          <path
                            d={`M0 0 L${198 * Math.cos(a)} ${198 * Math.sin(a)} A198 198 0 ${angle > 180 ? 1 : 0} 1 ${198 * Math.cos(b)} ${198 * Math.sin(b)} Z`}
                            fill={palette[i % palette.length]}
                            stroke="#ffffff"
                            strokeOpacity=".4"
                            strokeWidth="1.5"
                          />
                        )}
                        <text
                          x={126 * Math.cos(mid)}
                          y={
                            126 * Math.sin(mid) -
                            ((lines.length - 1) * (font + 2)) / 2
                          }
                          transform={`rotate(${readable},${126 * Math.cos(mid)},${126 * Math.sin(mid)})`}
                          fill="white"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize={font}
                          fontWeight="650"
                        >
                          <title>{entry.label}</title>
                          {lines.map((line, j) => (
                            <tspan
                              key={j}
                              x={126 * Math.cos(mid)}
                              dy={j ? font + 2 : 0}
                              textLength={Math.min(
                                segments > 30 ? 90 : 124,
                                line.length * font * 0.58,
                              )}
                              lengthAdjust="spacingAndGlyphs"
                            >
                              {line}
                            </tspan>
                          ))}
                        </text>
                      </g>
                    );
                  })
                ) : (
                  <circle r="198" fill="#263149" />
                )}
                <circle r="39" fill="#f9fafb" />
                <text
                  textAnchor="middle"
                  y="7"
                  fill="#1b2436"
                  fontSize="22"
                  fontWeight="800"
                >
                  ✦
                </text>
              </g>
            </svg>
          </div>
          <section
            className={`destiny-result ${winner ? "is-revealed" : ""}`}
            aria-label="Résultat du tirage"
          >
            <span className="destiny-eyebrow">
              {spinning
                ? "Le destin tourne…"
                : winner
                  ? "C’est à votre tour !"
                  : "Prêts pour le prochain passage ?"}
            </span>
            <h3 tabIndex={-1} ref={result} aria-live="polite">
              {spinning
                ? "À qui le tour ?"
                : winner?.label ||
                  (data
                    ? `${entries.length} valeur${entries.length > 1 ? "s" : ""} en lice`
                    : "Préparation du groupe…")}
            </h3>
            <p>
              {winner
                ? "Garder ce résultat pour un prochain tirage ou le retirer de cette roue ?"
                : "Chaque ligne non vide a la même chance. Les valeurs identiques restent des entrées distinctes."}
            </p>
            {winner ? (
              <div className="destiny-decisions">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void act("wheel_decide", {
                      drawId: winner.drawId,
                      decision: "keep",
                    })
                  }
                >
                  Garder dans la roue
                </button>
                <button
                  type="button"
                  className="destiny-primary"
                  disabled={busy}
                  onClick={() =>
                    void act("wheel_decide", {
                      drawId: winner.drawId,
                      decision: "remove",
                    })
                  }
                >
                  Retirer de la roue
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="destiny-primary destiny-spin"
                disabled={
                  busy || spinning || !entries.length || !!data?.warning
                }
                onClick={() => void act("wheel_spin")}
              >
                {spinning
                  ? "Tirage en cours…"
                  : busy
                    ? "Chargement…"
                    : "Faire tourner la roue"}
              </button>
            )}
            <p className="destiny-count">
              {data
                ? `${entries.length} restantes / ${data.total} au total · État enregistré`
                : "Préparation de la roue…"}
            </p>
            <button
              type="button"
              aria-pressed={muted}
              onClick={() => setMuted((v) => !v)}
            >
              {muted ? "Activer les sons" : "Couper les sons"}
            </button>
            <details className="destiny-options">
              <summary>
                <Settings2 size={16} />{" "}
                {savedId ? "Réglages du tirage" : "Données et animation"}{" "}
                <ChevronDown size={15} />
              </summary>
              <div className="destiny-options-content">
                {!savedId && (
                  <div className="destiny-config">
                    <label>
                      Donnée à tirer
                      <select
                        aria-label="Colonne à tirer au sort"
                        disabled={busy || spinning}
                        value={property}
                        onChange={(e) => setProperty(e.target.value)}
                      >
                        {usable.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Une roue par
                      <select
                        aria-label="Regroupement des roues"
                        disabled={busy || spinning}
                        value={groupBy}
                        onChange={(e) => {
                          setGroupBy(e.target.value);
                          setGroup("*");
                        }}
                      >
                        <option value="">Sans regroupement</option>
                        {usable.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    {groupBy && (
                      <label>
                        Groupe
                        <select
                          aria-label="Groupe de la roue"
                          disabled={busy || spinning}
                          value={group}
                          onChange={(e) => setGroup(e.target.value)}
                        >
                          <option value="*">Tous les groupes</option>
                          {availableGroups.map((g) => (
                            <option key={g.key} value={g.key}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                )}
                <div className="destiny-motion">
                  <label>
                    Animation de la roue
                    <select
                      aria-label="Animation de la roue"
                      value={motion}
                      disabled={busy || spinning}
                      aria-describedby={`${titleId}-motion`}
                      onChange={(e) => setMotion(wheelMotion(e.target.value))}
                    >
                      <option value="auto">Selon le système</option>
                      <option value="full">Rotation complète</option>
                      <option value="light">Rotation légère</option>
                      <option value="off">Sans rotation</option>
                    </select>
                  </label>
                  <div className="destiny-duration">
                    <label htmlFor={`${titleId}-duration`}>
                      Durée de rotation{" "}
                      <output htmlFor={`${titleId}-duration`}>
                        {seconds} s
                      </output>
                    </label>
                    <input
                      id={`${titleId}-duration`}
                      type="range"
                      min="2"
                      max="30"
                      step="1"
                      value={seconds}
                      aria-label="Durée de rotation"
                      aria-valuetext={`${seconds} secondes`}
                      aria-describedby={`${titleId}-duration-help`}
                      disabled={
                        busy ||
                        spinning ||
                        !wheelDuration(motion, reduced, seconds)
                      }
                      onChange={(e) =>
                        setCustomSeconds(wheelSeconds(Number(e.target.value)))
                      }
                    />
                    <small id={`${titleId}-duration-help`}>
                      De 2 à 30 secondes, ralentissement compris.
                    </small>
                  </div>
                  <p id={`${titleId}-motion`}>
                    {motion === "auto" && reduced
                      ? "Ce poste demande de réduire les animations : le résultat apparaît sans rotation. Tu peux choisir une rotation légère ou complète ici."
                      : motion === "full" && reduced
                        ? "Rotation activée à ta demande sur ce poste. Les autres effets restent réduits selon le système."
                        : motion === "light"
                          ? "Moins de tours, sans halo animé. La durée reste réglable, avec le même ralentissement progressif."
                          : motion === "off"
                            ? "Résultat immédiat, sans rotation. Ce choix est mémorisé sur ce navigateur."
                            : "Rotation compatible, sans transition CSS ni accélération graphique requise. Choix mémorisé sur ce navigateur."}
                  </p>
                </div>
              </div>
            </details>
          </section>
        </div>
        {error && (
          <div className="destiny-error" role="alert">
            {error}
            <button
              type="button"
              disabled={spinning || busy}
              onClick={() => void fetchState()}
            >
              Recharger la roue
            </button>
          </div>
        )}
        <details className="destiny-history">
          <summary>Participants et historique</summary>
          <div>
            <label>
              Rechercher un participant
              <input
                aria-label="Rechercher un participant"
                value={participantQuery}
                onChange={(e) => {
                  setParticipantQuery(e.target.value);
                  setParticipantLimit(100);
                }}
              />
            </label>
            <ul>
              {entries
                .filter((e) =>
                  e.label
                    .toLocaleLowerCase()
                    .includes(participantQuery.toLocaleLowerCase()),
                )
                .slice(0, participantLimit)
                .map((e) => (
                  <li key={e.id}>{e.label}</li>
                ))}
            </ul>
            {participantLimit <
              entries.filter((e) =>
                e.label
                  .toLocaleLowerCase()
                  .includes(participantQuery.toLocaleLowerCase()),
              ).length && (
              <button
                type="button"
                onClick={() => setParticipantLimit((n) => n + 100)}
              >
                Afficher plus de participants
              </button>
            )}
            <h4>Derniers résultats</h4>
            <ol>
              {data?.state.history
                .slice(-15)
                .reverse()
                .map((h) => (
                  <li key={h.drawId}>
                    {h.label} —{" "}
                    {h.decision === "remove"
                      ? "retiré"
                      : h.decision === "keep"
                        ? "conservé"
                        : "décision en attente"}
                  </li>
                ))}
            </ol>
          </div>
        </details>
        <footer>
          {confirmReset ? (
            <>
              <span>
                Réintégrer tous les résultats et effacer l’historique de cette
                roue ?
              </span>
              <button type="button" onClick={() => setConfirmReset(false)}>
                Annuler
              </button>
              <button
                type="button"
                disabled={busy || spinning}
                onClick={() => void act("wheel_reset")}
              >
                Confirmer la réinitialisation
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy || spinning || !data}
              onClick={() => setConfirmReset(true)}
            >
              Réinitialiser cette roue
            </button>
          )}
          <small>
            {savedId
              ? "Tirages et exclusions enregistrés pour cette roue."
              : "Une roue indépendante pour chaque colonne, groupe et formulaire."}
          </small>
        </footer>
      </div>
    </div>
  );
}
