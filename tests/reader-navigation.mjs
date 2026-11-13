import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(process.argv[2] || "public/reading.js", "utf8");
function harness({
  offline = false,
  shell = offline,
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
        (name === "data-reader-offline" && this === body && shell)
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
    DOMParser: class {
      parseFromString(text) {
        const value = JSON.parse(text);
        return {
          title: value.title,
          body: {
            dataset: { baseMode: "dark" },
            getAttribute: () => "--ink:#ffffff",
          },
          querySelector(selector) {
            if (selector === "#root[data-reader-token]")
              return value.invalid
                ? null
                : {
                    dataset: { readerToken: value.token, readerRoot: "branch" },
                    innerHTML: value.html,
                  };
            if (selector === ".reader-header")
              return { innerHTML: "Navigation" };
            return null;
          },
        };
      }
    },
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
    clickLink(page, options = {}) {
      return this.clickUrl(url(page).href, options);
    },
    clickUrl(
      href,
      { target = "", download = false, dataset = {}, modified = false } = {},
    ) {
      let prevented = false;
      const link = {
        href,
        target,
        dataset,
        hasAttribute: (name) => name === "download" && download,
      };
      fire(docEvents, "click", {
        button: 0,
        defaultPrevented: false,
        ctrlKey: modified,
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
function documentReply(title, extra = {}) {
  return {
    ...reply(title),
    status: 200,
    text: async () =>
      JSON.stringify({
        html: `<main>${title}</main>`,
        title,
        token: title,
        ...extra,
      }),
  };
}

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
} else if (process.argv.includes("--rescue-baseline")) {
  const direct = harness({
    href: "https://example.test/notes/index.php?page=start&read=1&reader-direct=1",
  });
  direct.setNetwork(never);
  direct.clickLink("lesson");
  assert.equal(direct.document.querySelector(".reader-network-status"), null);
  assert.equal(direct.redirects.length, 1);
  const shell = harness({ shell: true });
  shell.setNetwork(never);
  const pending = shell.window.FeuilletReaderNavigate(shell.url("lesson"));
  await shell.advance(4000);
  await pending.catch(() => {});
  assert.equal(shell.document.querySelector(".reader-network-status"), null);
  assert.equal(
    shell.requests.filter((r) => r.url.includes("index.php")).length,
    0,
  );
  console.log(
    "REPRODUCED v0.29.0: remembered direct mode has no rescue controls; an online offline-shell timeout removes them and never attempts direct HTML.",
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
    h.setNetwork((url) =>
      String(url).includes("reader-state.php")
        ? body
          ? Promise.resolve({ ...reply("Partial"), json: never })
          : never()
        : Promise.resolve(documentReply("HTML recovered")),
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
    assert.equal(
      h.redirects.length,
      0,
      "HTML recovery does not abandon the document/rescue UI",
    );
    assert.match(h.root.innerHTML, /HTML recovered/);
    assert.equal(h.requests[0].signal.aborted, true);
    assert.equal(
      new URL(h.requests[1].url).searchParams.get("reader-direct"),
      "1",
    );
    assert.equal(new URL(h.requests[1].url).searchParams.get("edit"), "0");
    assert.equal(h.requests[1].cache, "no-store");
    assert.equal(
      h.requests[1].redirect,
      "error",
      "HTML recovery must not follow a redirect into another screen/origin",
    );

    const next = harness({ storage: h.storage });
    next.setNetwork(never);
    assert.equal(next.clickLink("grandchild"), true);
    assert.equal(next.requests.length, 1);
    assert.ok(
      next.document.querySelector(".reader-network-status"),
      "Remembered direct mode keeps rescue controls",
    );
    const rescue = next.document
      .querySelector(".reader-network-status")
      .children.find((n) => n.tagName === "A");
    assert.equal(new URL(rescue.href).searchParams.get("root"), "branch");
    await next.advance(5000);
    assert.equal(
      next.redirects.length,
      0,
      "A second stall cannot cause an endless native reload",
    );
    assert.equal(
      next.root.innerHTML,
      "Page initiale",
      "Previous content remains available",
    );
    assert.equal(
      new URL(next.location.href).searchParams.get("page"),
      "start",
      "Address remains consistent with displayed page",
    );
    assert.match(
      next.document.querySelector(".reader-network-status").textContent,
      /n’a pas abouti/,
    );
    assert.equal(
      next.clickUrl(rescue.href, {
        target: "_self",
        dataset: { readerDirect: "1" },
      }),
      false,
      "Manual rescue stays a real native link",
    );
    assert.equal(next.requests.length, 1, "Rescue is not intercepted again");
  }

  // The PWA shell may be selected by a slow server while the browser is still online.
  h = harness({ shell: true });
  h.setNetwork((url) =>
    String(url).includes("reader-state.php")
      ? never()
      : Promise.resolve(documentReply("Recovered from shell")),
  );
  const shellPending = h.window.FeuilletReaderNavigate(h.url("lesson"));
  await h.advance(4000);
  await shellPending;
  assert.match(h.root.innerHTML, /Recovered from shell/);
  assert.equal(h.redirects.length, 0);

  h = harness();
  h.setNetwork((url) =>
    String(url).includes("reader-state.php")
      ? never()
      : Promise.resolve({ ...documentReply("Invalid", { invalid: true }) }),
  );
  const invalid = h.window.FeuilletReaderNavigate(h.url("lesson"));
  await h.advance(4000);
  await invalid;
  assert.equal(
    h.root.innerHTML,
    "Page initiale",
    "Invalid HTML is not inserted",
  );
  assert.ok(h.document.querySelector(".reader-network-status"));

  for (const href of [
    "https://example.test/notes/partage",
    "https://example.test/notes/index.php?share=partage",
    "https://example.test/notes/index.php?page=lesson&read=1",
  ]) {
    h = harness();
    assert.equal(h.clickUrl(href, { target: "_self" }), true);
    await h.flush();
    assert.equal(h.requests.length, 1);
  }
  for (const [href, options] of [
    ["https://example.test/notes/index.php?form=secret", {}],
    ["https://example.test/notes/index.php?page=lesson&edit=1", {}],
    ["https://example.test/other/index.php?page=lesson", {}],
    ["https://outside.test/notes/partage", {}],
    ["https://example.test/notes/index.php?page=lesson", { target: "_blank" }],
    ["https://example.test/notes/index.php?page=lesson", { download: true }],
    ["https://example.test/notes/index.php?page=lesson", { modified: true }],
  ]) {
    h = harness();
    assert.equal(h.clickUrl(href, options), false);
    assert.equal(h.requests.length, 0);
  }

  for (const body of [false, true]) {
    h = harness({
      href: "https://example.test/notes/index.php?page=start&read=1&reader-direct=1",
    });
    h.setNetwork(
      body
        ? () =>
            Promise.resolve({ ...documentReply("Partial HTML"), text: never })
        : never,
    );
    const pending = h.window.FeuilletReaderNavigate(h.url("lesson"));
    await h.advance(5000);
    await pending;
    assert.equal(h.requests[0].signal.aborted, true);
    assert.equal(h.root.innerHTML, "Page initiale");
    assert.ok(
      h.document
        .querySelector(".reader-network-status")
        .children.some((n) => n.tagName === "BUTTON"),
    );
  }
  h = harness();
  await assert.rejects(
    h.window.FeuilletReaderNavigate(new URL("https://outside.test/page")),
  );
  assert.equal(h.requests.length, 0);
  assert.equal(h.historyEntries.length, 0);
  h = harness({
    href: "https://example.test/notes/index.php?page=start&read=1&reader-direct=1",
  });
  h.setNetwork(() =>
    Promise.resolve({
      ...documentReply("Page indisponible"),
      status: 404,
      ok: false,
    }),
  );
  await h.window.FeuilletReaderNavigate(h.url("private"));
  assert.match(h.root.innerHTML, /Page indisponible/);
  assert.equal(
    h.root.innerHTML.includes("Page initiale"),
    false,
    "HTML 404 replaces old content",
  );

  h = harness({
    href: "https://example.test/notes/index.php?page=start&read=1&reader-direct=1",
  });
  let finishOldHtml;
  h.setNetwork((url) =>
    String(url).includes("page=old")
      ? new Promise((resolve) => (finishOldHtml = resolve))
      : Promise.resolve(documentReply("Newest HTML")),
  );
  const oldHtml = h.window.FeuilletReaderNavigate(h.url("old"));
  await h.window.FeuilletReaderNavigate(h.url("new"));
  assert.equal(h.requests[0].signal.aborted, true);
  finishOldHtml(documentReply("Obsolete HTML"));
  await oldHtml;
  assert.match(h.root.innerHTML, /Newest HTML/);
  assert.equal(h.document.querySelector(".reader-network-status"), null);

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
    "Reader navigation: JSON/HTML deadlines, persistent rescue, repeated stalls, online PWA shell, short paths, cancellation, polling, revocation and offline-loop guards passed.",
  );
}
