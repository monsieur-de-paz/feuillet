/* Feuillet: public reading copies only. No API, media or administrator document cache. */
const base = new URL("./", self.location),
  VERSION = "0.31.0",
  PREFIX = "feuillet-" + encodeURIComponent(base.pathname) + "-",
  SHELL = PREFIX + "shell-" + VERSION,
  PAGES = PREFIX + "public-pages-v2",
  SETTINGS = PREFIX + "preferences",
  key = new URL("offline-enabled", base).href;
const assets = [
  "atelier.css",
  "rivage.css",
  "textures/rivage-floor.png",
  "textures/rivage-paper.png",
  "textures/rivage-canvas.png",
  "forms.css",
  "atelier.js",
  "offline.html",
  "offline.js",
  "reading.js",
  "pwa.js",
  "pwa.css",
  "reader.css",
  "gallery.css",
  "interface.css",
  "theme.js",
  "theme-colors.js",
  "theme-toggle.css",
  "emoji-font.css",
  "file-preview.js",
  "file-preview.css",
  "video-lazy.js",
  "embed-channel.js",
  "favicon.svg",
  "icons.svg",
  "feuillet-logo.png",
  "pwa-icon-192.png",
  "pwa-icon-512.png",
  "apple-touch-icon.png",
  "manifest.webmanifest",
];
const enabled = async () => {
  try {
    return Boolean(await (await caches.open(SETTINGS)).match(key));
  } catch {
    return false;
  }
};
const canonical = (url) => {
  const u = new URL("reader-state.php", base);
  const keys = url.searchParams.has("share") ? ["share"] : ["page", "root"];
  for (const k of keys)
    if (url.searchParams.has(k)) u.searchParams.set(k, url.searchParams.get(k));
  return u.href;
};
const revokedKeys = new Set(),
  revokedRoots = new Set(),
  revisions = new Map();
let revocations = 0,
  revocationFailed = false,
  cacheEpoch = 0;
// Cache Storage is optional. A slow/full/locked cache must never hold an online page.
function bounded(task, ms, fallback) {
  let timer;
  return Promise.race([
    task,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(fallback), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
function shellCopy(key) {
  return bounded(
    (async () => (await caches.open(SHELL)).match(key))().catch(() => null),
    200,
    null,
  );
}
async function networkReader(request) {
  const controller = new AbortController();
  let timer,
    headersReceived = false;
  const cancel = () => controller.abort();
  request.signal.addEventListener("abort", cancel, { once: true });
  if (request.signal.aborted) controller.abort();
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new DOMException("Lecture trop lente.", "AbortError"));
    }, 6000);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(request, { signal: controller.signal });
        headersReceived = true;
        const text = await response.clone().text();
        return { response, text };
      })(),
      timeout,
    ]);
  } catch (error) {
    if (headersReceived)
      throw new DOMException("Réponse de lecture interrompue.", "AbortError");
    throw error;
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", cancel);
  }
}
async function cacheSnapshot(url, text, value, revision, epoch) {
  try {
    if (epoch !== cacheEpoch || !(await enabled()) || epoch !== cacheEpoch)
      return true;
    const cache = await caches.open(PAGES),
      cacheKey = canonical(url);
    if (epoch !== cacheEpoch) return true;
    if (value.unavailable) {
      const saved = await cache.match(cacheKey);
      const page =
        saved?.headers.get("X-Feuillet-Page") || url.searchParams.get("page");
      const root =
        saved?.headers.get("X-Feuillet-Root") ||
        url.searchParams.get("root") ||
        page;
      if (root) revokedRoots.add(root);
      await cache.delete(cacheKey);
      for (const entry of await cache.keys()) {
        const cached = await cache.match(entry);
        if (
          (page && cached?.headers.get("X-Feuillet-Page") === page) ||
          (root && cached?.headers.get("X-Feuillet-Root") === root)
        )
          await cache.delete(entry);
      }
    } else if (
      value.html &&
      value.offlineEligible &&
      text.length < 2000000 &&
      revisions.get(cacheKey) === revision &&
      (await enabled()) &&
      epoch === cacheEpoch
    ) {
      await cache.put(
        cacheKey,
        new Response(text, {
          headers: {
            "Content-Type": "application/json",
            "X-Feuillet-Saved": String(Date.now()),
            "X-Feuillet-Title": encodeURIComponent(value.title || "Page"),
            "X-Feuillet-Page": value.pageId || "",
            "X-Feuillet-Root": value.root || "",
          },
        }),
      );
      if (
        epoch !== cacheEpoch ||
        revisions.get(cacheKey) !== revision ||
        revokedKeys.has(cacheKey) ||
        revokedRoots.has(value.root)
      ) {
        await cache.delete(cacheKey);
        return;
      }
      const keys = await cache.keys();
      while (keys.length > 40) await cache.delete(keys.shift());
    }
    return true;
  } catch {
    return false; /* Storage and quota failures never replace a successful online response. */
  }
}
async function prepareShell() {
  const cache = await caches.open(SHELL);
  // Cache each asset separately: one failed download must not discard the others.
  await Promise.allSettled(
    assets.map((asset) =>
      cache.addAll([new Request(new URL(asset, base), { cache: "reload" })]),
    ),
  );
}
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      // Installing a repair must not depend on the disk/quota or one cached asset.
      await bounded(
        prepareShell().catch(() => {}),
        8000,
        null,
      );
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      // Claim first; obsolete-cache cleanup is optional and bounded.
      await self.clients.claim();
      await bounded(
        (async () => {
          for (const name of await caches.keys())
            if (
              (name.startsWith(PREFIX + "shell-") && name !== SHELL) ||
              name === PREFIX + "public-pages"
            )
              await caches.delete(name);
        })().catch(() => {}),
        1000,
        null,
      );
    })(),
  ),
);
self.addEventListener("message", (event) =>
  event.waitUntil(
    (async () => {
      const command = event.data?.command;
      if (command === "enable") {
        await (await caches.open(SETTINGS)).put(key, new Response("yes"));
        // Retry optional assets after an interrupted install without delaying the reply.
        event.waitUntil(
          bounded(
            prepareShell().catch(() => {}),
            8000,
            null,
          ),
        );
      }
      if (command === "clear") {
        cacheEpoch++;
        revokedKeys.clear();
        revokedRoots.clear();
        revisions.clear();
        revocationFailed = false;
        await caches.delete(PAGES);
        await caches.delete(SETTINGS);
      }
      if (command !== "status") event.ports[0]?.postMessage({ ok: true });
      if (command === "status") {
        const c = await caches.open(PAGES),
          entries = [];
        for (const k of await c.keys()) {
          const r = await c.match(k);
          if (!r) continue;
          if (
            Date.now() - Number(r.headers.get("X-Feuillet-Saved")) >
            86400000
          ) {
            await c.delete(k);
            continue;
          }
          entries.push({
            url: k.url,
            title: decodeURIComponent(
              r.headers.get("X-Feuillet-Title") || "Page",
            ),
          });
        }
        event.ports[0]?.postMessage({
          enabled: await enabled(),
          pages: entries.length,
          entries,
        });
      }
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== base.origin ||
    !url.pathname.startsWith(base.pathname)
  )
    return;
  const relative = url.pathname.slice(base.pathname.length);
  if (
    /^fonts\/(Quicksand|Fraunces|NotoSans(?:-Bold|-Italic|-BoldItalic)?)\.ttf$/.test(
      relative,
    )
  ) {
    event.respondWith(
      (async () => {
        const hit = await shellCopy(request);
        if (hit) return hit;
        const r = await fetch(request);
        if (r.ok)
          event.waitUntil(
            bounded(
              (async () => {
                await (await caches.open(SHELL)).put(request, r.clone());
              })().catch(() => {}),
              8000,
              null,
            ),
          );
        return r;
      })(),
    );
    return;
  }
  if (assets.includes(relative)) {
    if (url.searchParams.has("v") && url.searchParams.get("v") !== VERSION) {
      event.respondWith(fetch(request));
      return;
    }
    event.respondWith(
      (async () => {
        const hit = await shellCopy(new URL(relative, base));
        return hit || fetch(request);
      })(),
    );
    return;
  }
  if (relative === "reader-state.php") {
    event.respondWith(
      (async () => {
        const cacheKey = canonical(url),
          revision = (revisions.get(cacheKey) || 0) + 1;
        revisions.set(cacheKey, revision);
        while (revisions.size > 128)
          revisions.delete(revisions.keys().next().value);
        let loaded;
        try {
          loaded = await networkReader(request);
        } catch (error) {
          // An aborted/slow online validation is never permission to reveal an old copy.
          if (
            error.name === "AbortError" ||
            request.signal.aborted ||
            revocations ||
            revocationFailed
          )
            throw error;
          const saved = await bounded(
            (async () => {
              if (!(await enabled())) return null;
              const cache = await caches.open(PAGES),
                copy = await cache.match(cacheKey);
              if (
                !copy ||
                revokedKeys.has(cacheKey) ||
                revokedRoots.has(copy.headers.get("X-Feuillet-Root"))
              )
                return null;
              if (
                Date.now() - Number(copy.headers.get("X-Feuillet-Saved")) >
                86400000
              ) {
                await cache.delete(cacheKey);
                return null;
              }
              return copy;
            })().catch(() => null),
            400,
            null,
          );
          if (!saved || revocations || revocationFailed) throw error;
          return new Response(saved.body, {
            headers: {
              "Content-Type": "application/json",
              "X-Feuillet-Offline": "1",
            },
          });
        }
        const { response, text } = loaded;
        try {
          if (response.ok) {
            const value = JSON.parse(text);
            if (value.unavailable) {
              revokedKeys.add(cacheKey);
              const root = value.root || url.searchParams.get("root");
              if (root) revokedRoots.add(root);
            } else if (value.offlineEligible) {
              revokedKeys.delete(cacheKey);
              if (value.root) revokedRoots.delete(value.root);
            }
            // Quarantine revoked pages before replying; all disk work is off the critical path.
            if (value.unavailable) revocations++;
            const stored = cacheSnapshot(
              url,
              text,
              value,
              revision,
              cacheEpoch,
            );
            if (value.unavailable)
              stored.then((ok) => {
                revocations--;
                if (!ok) revocationFailed = true;
              });
            event.waitUntil(bounded(stored, 8000, null));
          }
        } catch {
          /* Cache/quota errors must never break an online response. */
        }
        return response;
      })(),
    );
    return;
  }
  if (
    request.mode === "navigate" &&
    (relative === "index.php" ||
      relative === "" ||
      /^[a-z0-9][a-z0-9-]{0,63}$/.test(relative)) &&
    !url.searchParams.has("reader-direct") &&
    !url.searchParams.has("edit") &&
    !url.searchParams.has("form") &&
    !url.searchParams.has("project") &&
    !url.searchParams.has("dashboard")
  ) {
    event.respondWith(
      (async () => {
        const network = fetch(request);
        event.waitUntil(network.catch(() => {}));
        if (!(await bounded(enabled(), 300, false))) return network;
        let timer;
        try {
          return await Promise.race([
            network,
            new Promise((resolve) => {
              timer = setTimeout(
                () =>
                  resolve(
                    shellCopy(new URL("offline.html", base)).then(
                      (copy) => copy || network,
                    ),
                  ),
                1800,
              );
            }),
          ]);
        } catch {
          const copy = await shellCopy(new URL("offline.html", base));
          return copy || network;
        } finally {
          clearTimeout(timer);
        }
      })(),
    );
  }
});
