import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
let clock = Date.now();
class Clock extends Date {
  static now() {
    return clock;
  }
}
const listeners = {},
  stores = new Map();
let putGate = null,
  openGate = null,
  deleteGate = null,
  keysGate = null,
  addAllGate = null,
  skipped = 0,
  claimed = 0,
  fastTimers = false,
  lastSignal = null,
  bodyResponse = null,
  lastTasks = [];
const caches = {
  async open(name) {
    if (openGate) await openGate;
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return {
      async match(k) {
        return m.get(typeof k === "string" ? k : k.url)?.clone();
      },
      async put(k, v) {
        if (putGate && name.endsWith("public-pages-v2")) await putGate;
        m.set(typeof k === "string" ? k : k.url, v.clone());
      },
      async delete(k) {
        if (deleteGate && name.endsWith("public-pages-v2")) await deleteGate;
        return m.delete(typeof k === "string" ? k : k.url);
      },
      async keys() {
        return [...m.keys()].map((u) => new Request(u));
      },
      async addAll() {
        if (addAllGate) await addAllGate;
      },
    };
  },
  async keys() {
    if (keysGate) await keysGate;
    return [...stores.keys()];
  },
  async delete(k) {
    return stores.delete(k);
  },
};
let online = true,
  value = {
    html: "<h1>Public</h1>",
    title: "Une page",
    token: "a",
    offlineEligible: true,
  };
let networkGate = null;
const network = async (_request, options) => {
  lastSignal = options?.signal;
  if (networkGate) await networkGate;
  if (!online) throw Error("offline");
  return (
    bodyResponse ||
    new Response(JSON.stringify(value), {
      headers: { "Content-Type": "application/json" },
    })
  );
};
const workerTimeout = (fn, ms) =>
  setTimeout(fn, fastTimers && [6000, 400, 8000, 1000].includes(ms) ? 30 : ms);
runInNewContext(readFileSync(process.argv[2] || "public/sw.js", "utf8"), {
  self: {
    location: "https://example.test/feuillet/sw.js",
    addEventListener: (n, f) => (listeners[n] = f),
    clients: {
      claim: async () => {
        claimed++;
      },
    },
    skipWaiting: () => {
      skipped++;
    },
  },
  URL,
  Request,
  Response,
  caches,
  fetch: network,
  setTimeout: workerTimeout,
  clearTimeout,
  Date: Clock,
  Boolean,
  JSON,
  Number,
  AbortController,
  DOMException,
  encodeURIComponent,
  decodeURIComponent,
});
async function command(command) {
  let data;
  const tasks = [];
  listeners.message({
    data: { command },
    ports: [{ postMessage: (v) => (data = v) }],
    waitUntil: (p) => tasks.push(p),
  });
  await Promise.all(tasks);
  return data;
}
async function request(path, waitForBackground = true) {
  const tasks = [];
  let result;
  listeners.fetch({
    request: new Request("https://example.test/feuillet/" + path),
    respondWith: (p) => (result = p),
    waitUntil: (p) => tasks.push(p),
  });
  if (!result) return null;
  const r = await result;
  lastTasks = tasks;
  if (waitForBackground) await Promise.all(tasks);
  return r;
}
// A cache problem must not prevent a repaired worker from replacing its predecessor.
fastTimers = true;
for (const operation of ["open", "asset"]) {
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  if (operation === "open") openGate = gate;
  else addAllGate = gate;
  const before = skipped,
    tasks = [];
  listeners.install({ waitUntil: (p) => tasks.push(p) });
  assert.equal(
    await Promise.race([
      Promise.all(tasks).then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 200)),
    ]),
    true,
    "A blocked " + operation + " must not trap worker installation",
  );
  assert.equal(skipped, before + 1);
  release();
  openGate = addAllGate = null;
}
let releaseKeys;
keysGate = new Promise((resolve) => (releaseKeys = resolve));
const activation = [];
listeners.activate({ waitUntil: (p) => activation.push(p) });
await Promise.resolve();
assert.equal(claimed, 1, "Clients are claimed before touching obsolete caches");
assert.equal(
  await Promise.race([
    Promise.all(activation).then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 200)),
  ]),
  true,
  "Obsolete-cache cleanup cannot trap activation",
);
releaseKeys();
keysGate = null;
fastTimers = false;
console.log(
  "PWA lifecycle: blocked storage and assets do not prevent repair activation or client takeover",
);
assert.equal((await command("status")).pages, 0);
await request("reader-state.php?page=one&root=root");
assert.equal((await command("status")).pages, 0);
await command("enable");
await request("reader-state.php?page=one&root=root");
assert.equal((await command("status")).pages, 1);
// A roaming profile / full disk may hold Cache Storage indefinitely. Online text must still arrive.
let releasePut;
putGate = new Promise((resolve) => (releasePut = resolve));
let delivered = await Promise.race([
  request("reader-state.php?page=one&root=root", false).then((r) => r.json()),
  new Promise((resolve) => setTimeout(() => resolve(null), 200)),
]);
assert.equal(
  delivered?.html,
  value.html,
  "A blocked cache.put must not block an online page",
);
releasePut();
putGate = null;
await Promise.all(lastTasks);
let releaseOpen;
openGate = new Promise((resolve) => (releaseOpen = resolve));
delivered = await Promise.race([
  request("reader-state.php?page=one&root=root", false).then((r) => r.json()),
  new Promise((resolve) => setTimeout(() => resolve(null), 200)),
]);
assert.equal(
  delivered?.html,
  value.html,
  "A blocked cache.open must not delay the network request or response",
);
const blockedOpenTasks = lastTasks.slice();
const script = await Promise.race([
  request("reading.js", false),
  new Promise((resolve) => setTimeout(() => resolve(null), 600)),
]);
assert.ok(
  script?.ok,
  "Scripts and styles must fall back to the network if the shell cache is locked",
);
releaseOpen();
openGate = null;
await Promise.all(blockedOpenTasks);
// Aborting a slow validation is not permission to expose the saved page.
fastTimers = true;
let releaseSlow;
networkGate = new Promise((resolve) => (releaseSlow = resolve));
await assert.rejects(request("reader-state.php?page=one&root=root", false), {
  name: "AbortError",
});
assert.equal(lastSignal.aborted, true);
releaseSlow();
networkGate = null;
let closeBody;
bodyResponse = new Response(
  new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"html":"'));
      closeBody = () => controller.close();
    },
  }),
);
await assert.rejects(request("reader-state.php?page=one&root=root", false), {
  name: "AbortError",
});
assert.equal(lastSignal.aborted, true);
closeBody();
bodyResponse = new Response(
  new ReadableStream({
    start(controller) {
      controller.error(new TypeError("Truncated JSON body"));
    },
  }),
);
await assert.rejects(
  request("reader-state.php?page=one&root=root", false),
  { name: "AbortError" },
  "A truncated response must never turn into a saved private/stale copy",
);
bodyResponse = null;
fastTimers = false;
console.log(
  "PWA regression: blocked cache reads/writes never hold online pages; header/body deadlines abort without revealing stale copies",
);
online = false;
let r = await request("reader-state.php?page=one&root=root&token=a");
assert.equal(r.headers.get("X-Feuillet-Offline"), "1");
assert.equal((await r.json()).html, value.html);
await assert.rejects(request("reader-state.php?page=one&root=other"));
assert.equal(await request("api.php?action=pages"), null);
assert.equal(await request("media.php?id=secret"), null);
assert.equal(await request("pdf-viewer.php?id=secret"), null);
online = true;
value = { ...value, html: "ADMIN", offlineEligible: false };
await request("reader-state.php?page=admin");
assert.equal((await command("status")).pages, 1);
value = { ...value, html: "new", offlineEligible: true, token: "b" };
await request("reader-state.php?page=one&root=root");
online = false;
assert.equal(
  (await (await request("reader-state.php?page=one&root=root")).json()).html,
  "new",
);
online = true;
value = { ...value, unavailable: true, offlineEligible: false };
await request("reader-state.php?page=one&root=root");
assert.equal((await command("status")).pages, 0);
value = { html: "Cours publiés", title: "Bessières", offlineEligible: true };
await request("reader-state.php?share=bessieres");
online = false;
r = await request("reader-state.php?share=bessieres&token=a");
assert.equal((await r.json()).html, value.html);
await assert.rejects(request("reader-state.php?share=prive"));
online = true;
value = {
  html: "Page indisponible",
  unavailable: true,
  offlineEligible: false,
};
await request("reader-state.php?share=bessieres");
assert.equal((await command("status")).pages, 0);
value = {
  html: "Ancienne page publique",
  title: "Page",
  pageId: "same-id",
  root: "same-id",
  offlineEligible: true,
};
await request("reader-state.php?share=alias");
await request("reader-state.php?page=same-id");
let releaseNetwork;
networkGate = new Promise((resolve) => (releaseNetwork = resolve));
value = {
  html: "Page indisponible",
  unavailable: true,
  offlineEligible: false,
};
let revokedDelivered = false;
const revoked = request("reader-state.php?share=alias", false).then(
  (response) => {
    revokedDelivered = true;
    return response.json();
  },
);
await new Promise((resolve) => setTimeout(resolve, 1550));
assert.equal(
  revokedDelivered,
  false,
  "No stale copy while online visibility is being checked",
);
releaseNetwork();
assert.equal((await revoked).html, "Page indisponible");
networkGate = null;
online = false;
await assert.rejects(request("reader-state.php?page=same-id"));
assert.equal((await command("status")).pages, 0);
online = true;
value = { html: "public", title: "Page", offlineEligible: true };
for (let i = 0; i < 42; i++) await request("reader-state.php?page=" + i);
assert.equal((await command("status")).pages, 40);
clock += 86400001;
assert.equal((await command("status")).pages, 0);
await command("clear");
assert.equal((await command("status")).enabled, false);
assert.equal((await command("status")).pages, 0);
let intercepted = false;
listeners.fetch({
  request: {
    url: "https://example.test/feuillet/index.php?page=one&read=1&reader-direct=1",
    method: "GET",
    mode: "navigate",
  },
  respondWith() {
    intercepted = true;
  },
  waitUntil() {},
});
assert.equal(
  intercepted,
  false,
  "A recovery navigation must bypass the offline shell completely",
);

await command("enable");
online = true;
value = {
  html: "Old published data",
  title: "Page",
  pageId: "same",
  root: "same",
  offlineEligible: true,
};
await request("reader-state.php?page=same&root=same");
await request("reader-state.php?share=alias");
let releaseDelete;
deleteGate = new Promise((resolve) => (releaseDelete = resolve));
value = { html: "Unavailable", unavailable: true, offlineEligible: false };
assert.equal(
  (await (await request("reader-state.php?share=alias", false)).json())
    .unavailable,
  true,
);
const pendingPurge = lastTasks.slice();
online = false;
await assert.rejects(
  request("reader-state.php?page=same&root=same", false),
  "A pending revocation purge must quarantine old aliases",
);
releaseDelete();
deleteGate = null;
await Promise.all(pendingPurge);
assert.equal((await command("status")).pages, 0);

online = true;
value = { html: "Fresh public page", title: "Page", offlineEligible: true };
let releaseAfterClear;
putGate = new Promise((resolve) => (releaseAfterClear = resolve));
await request("reader-state.php?page=cleared", false);
const pendingWrite = lastTasks.slice();
await command("clear");
releaseAfterClear();
putGate = null;
await Promise.all(pendingWrite);
assert.equal((await command("status")).pages, 0);
assert.equal(
  (await command("status")).enabled,
  false,
  "A pending write cannot re-enable storage after Clear",
);

await command("enable");
await request("reader-state.php?page=slow-cache");
online = false;
fastTimers = true;
let releaseOfflineOpen;
openGate = new Promise((resolve) => (releaseOfflineOpen = resolve));
await assert.rejects(
  request("reader-state.php?page=slow-cache", false),
  "An offline cache lookup must also have a deadline",
);
releaseOfflineOpen();
openGate = null;
fastTimers = false;
online = true;
await command("clear");
console.log(
  "PWA recovery: native bypass, revoked-copy quarantine, clear/write race and bounded offline cache access passed",
);
console.log(
  "PWA: opt-in, offline copy, root isolation, no admin/API/media caching, refresh, revocation, 40-page bound and clear passed",
);
