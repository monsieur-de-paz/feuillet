import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(process.argv[2] || "public/reading.js", "utf8");
function harness({
  offline = false,
  storage = new Map(),
  href = "https://example.test/notes/index.php?page=start&read=1&root=branch",
} = {}) {
  let clock = 1000,
    next = 0,
    network = () => Promise.resolve(reply("Page suivante")),
    document;
  const timers = new Map(),
    events = new Map(),
    docEvents = new Map(),
    requests = [],
    redirects = [],
    historyEntries = [];
  class Element {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.dataset = {};
      this.attrs = {};
      this.className = "";
      this._text = "";
      this._html = "";
    }
    set textContent(text) {
      this._text = text;
      this.children = [];
    }
    get textContent() {
      return this._text;
    }
    set innerHTML(text) {
      this._html = text;
    }
    get innerHTML() {
      return this._html;
    }
    setAttribute(name, value) {
      this.attrs[name] = value;
    }
    hasAttribute(name) {
      return (
        name in this.attrs ||
        (name === "data-reader-token" && this === root) ||
        (name === "data-reader-offline" && this === body && offline)
      );
    }
    append(...nodes) {
      for (const node of nodes) {
        this.children.push(node);
        if (typeof node === "object") node.parent = this;
      }
    }
    replaceChildren(...nodes) {
      this.children = [];
      this._html = "";
      this.append(...nodes);
    }
    remove() {
      if (this.parent)
        this.parent.children = this.parent.children.filter((n) => n !== this);
    }
    querySelector() {
      return null;
    }
    querySelectorAll() {
      return [];
    }
    addEventListener() {}
  }
  const root = new Element("div"),
    body = new Element("body");
  body.append(root);
  root.dataset = {
    readerPage: "start",
    readerRoot: "branch",
    readerToken: "initial",
  };
  root.innerHTML = "Page initiale";
  const location = {
    href,
    get origin() {
      return new URL(this.href).origin;
    },
    replace(url) {
      redirects.push(String(url));
      this.href = String(url);
    },
    assign(url) {
      redirects.push(String(url));
      this.href = String(url);
    },
  };
  const history = {
    state: null,
    pushState(state, _title, url) {
      this.state = state;
      location.href = String(url);
      historyEntries.push(String(url));
    },
    replaceState(state, _title, url) {
      this.state = state;
      location.href = String(url);
    },
  };
  const listen = (map, name, fn) => {
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(fn);
  };
  const fire = (map, name, event = {}) => {
    for (const fn of map.get(name) || []) fn(event);
  };
  document = {
    body,
    hidden: false,
    activeElement: null,
    title: "Initiale",
    documentElement: { scrollHeight: 2000 },
    querySelector(selector) {
      if (selector === "#root") return root;
      return (
        body.children.find((n) => n.className === selector.slice(1)) || null
      );
    },
    querySelectorAll() {
      return [];
    },
    createElement: (tag) => new Element(tag),
    addEventListener: (name, fn) => listen(docEvents, name, fn),
  };
  const window = {
    addEventListener: (name, fn) => listen(events, name, fn),
    scrollTo() {},
    getSelection: () => "",
    FeuilletReaderTheme: { setBase() {} },
  };
  const context = {
    window,
    document,
    location,
    history,
    navigator: { onLine: !offline },
    innerHeight: 800,
    URL,
    URLSearchParams,
    AbortController,
    DOMException,
    Error,
    Date: class extends Date {
      static now() {
        return clock;
      }
    },
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    setTimeout: (fn, delay) => {
      const id = ++next;
      timers.set(id, { fn, due: clock + delay });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    fetch: (url, options) => {
      requests.push({ url: String(url), ...options });
      return network(url, options);
    },
  };
  runInNewContext(source, context);
  const flush = async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve();
  };
  async function advance(ms) {
    const end = clock + ms;
    while (true) {
      const due = [...timers]
        .filter(([, t]) => t.due <= end)
        .sort((a, b) => a[1].due - b[1].due)[0];
      if (!due) break;
      clock = due[1].due;
      timers.delete(due[0]);
      due[1].fn();
      await flush();
    }
    clock = end;
    await flush();
  }
  const url = (page) =>
    new URL(`index.php?page=${page}&read=1&root=branch`, location.href);
  return {
    window,
    document,
    root,
    requests,
    redirects,
    storage,
    historyEntries,
    location,
    advance,
    flush,
    url,
    setNetwork(fn) {
      network = fn;
    },
    event: (name, event) => fire(events, name, event),
    clickLink(page) {
      let prevented = false;
      const link = {
        href: url(page).href,
        target: "",
        hasAttribute: () => false,
      };
      fire(docEvents, "click", {
        button: 0,
        defaultPrevented: false,
        target: {
          closest: (selector) => (selector === "a[href]" ? link : null),
        },
        preventDefault() {
          prevented = true;
        },
      });
      return prevented;
    },
  };
}
function reply(title, extra = {}) {
  return {
    ok: true,
    headers: { get: () => null },
    json: async () => ({
      html: `<main>${title}</main>`,
      title,
      token: title,
      root: "branch",
      appearance: "",
      mode: "light",
      ...extra,
    }),
  };
}
const never = () => new Promise(() => {});

if (process.argv.includes("--baseline")) {
  const h = harness();
  h.setNetwork(never);
  let finished = false;
  void h.window
    .FeuilletReaderNavigate(h.url("lesson"))
    .then(() => (finished = true));
  await h.advance(120000);
  assert.equal(finished, false);
  assert.equal(h.redirects.length, 0);
  assert.equal(h.root.innerHTML, "Page initiale");
  console.log(
    "REPRODUCED v0.27.0: after 120 simulated seconds, navigation is still pending, with no direct fallback.",
  );
} else {
  let h = harness();
  await h.window.FeuilletReaderNavigate(h.url("lesson"));
  assert.match(h.root.innerHTML, /Page suivante/);
  assert.equal(h.root.dataset.readerPage, "lesson");
  assert.equal(h.redirects.length, 0);
  assert.equal(h.requests[0].cache, "no-store");
  assert.equal(h.requests[0].priority, "high");

  for (const body of [false, true]) {
    h = harness();
    h.setNetwork(
      body
        ? () => Promise.resolve({ ...reply("Partial"), json: never })
        : never,
    );
    const pending = h.window.FeuilletReaderNavigate(h.url("lesson"));
    await h.advance(3999);
    assert.equal(h.redirects.length, 0);
    const status = h.document.querySelector(".reader-network-status");
    const direct = status.children.find((n) => n.tagName === "A");
    assert.equal(new URL(direct.href).searchParams.get("root"), "branch");
    assert.equal(direct.target, "_self");
    await h.advance(1);
    await pending;
    assert.equal(h.redirects.length, 1);
    assert.equal(
      new URL(h.redirects[0]).searchParams.get("reader-direct"),
      "1",
    );
    assert.equal(h.requests[0].signal.aborted, true);
    assert.equal(
      h.root.innerHTML,
      "Page initiale",
      "Timeout never exposes another cached page",
    );
    const next = harness({ storage: h.storage, href: h.redirects[0] });
    assert.equal(
      new URL(next.location.href).searchParams.has("reader-direct"),
      false,
      "Recovery parameter is removed from the displayed URL",
    );
    assert.equal(
      next.clickLink("grandchild"),
      true,
      "Following links use native navigation for 15 minutes",
    );
    assert.equal(next.requests.length, 0);
    assert.equal(next.redirects.length, 1);
    assert.equal(new URL(next.redirects[0]).searchParams.get("read"), "1");
    assert.equal(
      new URL(next.redirects[0]).searchParams.get("edit"),
      "0",
      "Legacy workers also bypass recovery URLs",
    );
    assert.equal(
      new URL(next.location.href).searchParams.get("root"),
      "branch",
    );
  }

  h = harness();
  let releaseFirst;
  h.setNetwork((url) =>
    String(url).includes("page=first")
      ? new Promise((resolve) => (releaseFirst = resolve))
      : Promise.resolve(reply("Second")),
  );
  const first = h.window.FeuilletReaderNavigate(h.url("first"));
  await h.window.FeuilletReaderNavigate(h.url("second"));
  assert.equal(h.requests[0].signal.aborted, true);
  assert.match(h.root.innerHTML, /Second/);
  releaseFirst(reply("Old first"));
  await first;
  await h.advance(5000);
  assert.match(h.root.innerHTML, /Second/);
  assert.equal(
    h.redirects.length,
    0,
    "A superseded request cannot redirect the new page",
  );

  h = harness();
  h.setNetwork(never);
  await h.advance(15000);
  assert.equal(h.requests.length, 1, "Polling begins once");
  h.setNetwork(() => Promise.resolve(reply("Destination")));
  await h.window.FeuilletReaderNavigate(h.url("destination"));
  assert.equal(
    h.requests[0].signal.aborted,
    true,
    "Navigation aborts the background poll",
  );
  assert.match(h.root.innerHTML, /Destination/);

  h = harness();
  h.setNetwork(never);
  await h.advance(20000);
  assert.equal(
    h.requests[0].signal.aborted,
    true,
    "A background poll is bounded",
  );
  assert.equal(h.redirects.length, 0);
  h.setNetwork(() => Promise.resolve(reply("Refreshed")));
  await h.advance(15000);
  assert.equal(
    h.requests.length,
    2,
    "Timed-out polling does not leave the busy flag stuck",
  );
  assert.match(h.root.innerHTML, /Refreshed/);

  h = harness();
  h.setNetwork(never);
  const leaving = h.window.FeuilletReaderNavigate(h.url("lesson"));
  h.event("pagehide");
  await leaving;
  await h.advance(10000);
  assert.equal(h.requests[0].signal.aborted, true);
  assert.equal(
    h.redirects.length,
    0,
    "Unloading cannot start another navigation",
  );

  h = harness();
  await h.window.FeuilletReaderNavigate(h.url("lesson"));
  h.setNetwork(() =>
    Promise.resolve(reply("Page indisponible", { unavailable: true })),
  );
  await h.window.FeuilletReaderNavigate(h.url("lesson"));
  assert.match(h.root.innerHTML, /Page indisponible/);
  assert.equal(
    h.redirects.length,
    0,
    "Revocation does not display the old memory copy",
  );

  h = harness({ offline: true });
  h.setNetwork(() => Promise.reject(Error("offline")));
  await assert.rejects(h.window.FeuilletReaderNavigate(h.url("unknown")));
  assert.equal(
    h.redirects.length,
    0,
    "Offline shell cannot enter a reload loop",
  );

  console.log(
    "Reader navigation: header/body deadlines, direct fallback and scoped mode, manual link, cancellation, polling recovery, revocation and offline-loop guards passed.",
  );
}
