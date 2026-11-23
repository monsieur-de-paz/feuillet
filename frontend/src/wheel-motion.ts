import { wheelTarget } from "./destiny-wheel-model";
export type WheelMotion = "auto" | "full" | "light" | "off";
export const wheelMotionKey = "feuillet:wheel-motion";
export const wheelDurationKey = "feuillet:wheel-duration";
export function wheelSeconds(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(2, Math.min(30, Math.round(value)))
    : 5;
}
export function wheelMotion(value: unknown): WheelMotion {
  return value === "full" || value === "light" || value === "off"
    ? value
    : "auto";
}
export function wheelDuration(
  mode: WheelMotion,
  reduced: boolean,
  seconds = mode === "light" ? 2 : 5,
): number {
  return mode === "off" || (mode === "auto" && reduced)
    ? 0
    : wheelSeconds(seconds) * 1000;
}

export function wheelSpinTarget(
  rotation: number,
  index: number,
  count: number,
  duration: number,
  light: boolean,
) {
  // Keep a convincing initial impulse at every duration instead of stretching a
  // fixed five turns into an almost motionless long spin. Only whole turns vary;
  // the server-selected destination is never changed.
  const turns = Math.max(1, Math.round((duration / 1000) * (light ? 0.35 : 1)));
  return wheelTarget(rotation, index, count) + (turns - 5) * 360;
}

export function wheelProgress(progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  // Constant friction after the initial impulse: angular velocity decreases
  // linearly to zero. No final snap, rebound, or invisible waiting at rest.
  return t * (2 - t);
}

type Scheduler = {
  now: () => number;
  frame: (callback: () => void) => number;
  cancelFrame: (id: number) => void;
  later: (callback: () => void, delay: number) => number;
  cancelLater: (id: number) => void;
};
// SVG attributes remain usable when CSS transitions or GPU compositing are disabled.
// The timer also drives progress if animation frames stop arriving. Both clocks use
// elapsed time, so a slow/background tab never queues thousands of old frames.
export function animateWheel(
  from: number,
  to: number,
  duration: number,
  paint: (angle: number) => void,
  done: () => void,
  clock: Scheduler = {
    now: () => performance.now(),
    frame: (cb) =>
      window.requestAnimationFrame ? window.requestAnimationFrame(cb) : 0,
    cancelFrame: (id) => window.cancelAnimationFrame?.(id),
    later: (cb, delay) => window.setTimeout(cb, delay),
    cancelLater: (id) => window.clearTimeout(id),
  },
) {
  const start = clock.now();
  let stopped = false,
    frame = 0,
    timer = 0,
    lastPaint = start;
  function cancel() {
    stopped = true;
    clock.cancelFrame(frame);
    clock.cancelLater(timer);
  }
  function finish() {
    if (stopped) return;
    cancel();
    paint(to);
    done();
  }
  function tick() {
    if (stopped) return;
    const progress = Math.min(1, Math.max(0, (clock.now() - start) / duration));
    if (progress >= 1) return finish();
    paint(from + (to - from) * wheelProgress(progress));
    lastPaint = clock.now();
  }
  function nextFrame() {
    tick();
    if (!stopped) frame = clock.frame(nextFrame);
  }
  function watchdog() {
    if (stopped) return;
    if (clock.now() - lastPaint >= 60 || clock.now() - start >= duration)
      tick();
    if (!stopped) timer = clock.later(watchdog, 80);
  }
  if (duration <= 0) finish();
  else {
    paint(from);
    frame = clock.frame(nextFrame);
    timer = clock.later(watchdog, 80);
  }
  return { cancel, finish };
}
