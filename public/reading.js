(() => {
  function readerQuery(url) {
    const path = url.pathname.split("/").pop();
    const share =
      url.searchParams.get("share") ||
      (/^[a-z0-9][a-z0-9-]{0,63}$/.test(path) ? path : "");
    if (share) return new URLSearchParams({ share });
    const query = new URLSearchParams({
      page: url.searchParams.get("page") || "",
    });
    if (url.searchParams.has("root"))
      query.set("root", url.searchParams.get("root"));
    return query;
  }
  let token = document.querySelector("#root")?.dataset.readerToken || "",
    timer = null,
    busy = false,
    pending = null;
  const directParameter = "reader-direct",
    directKey =
      "feuillet.reader.direct:" + new URL(".", location.href).pathname;
  let directUntil = 0,
    activeNavigation = null,
    activeCheck = null;
  try {
    directUntil = Number(sessionStorage.getItem(directKey)) || 0;
  } catch {}
  const prefersDirect = () => Date.now() < directUntil;
  function rememberDirect() {
    directUntil = Date.now() + 900000;
    try {
      sessionStorage.setItem(directKey, String(directUntil));
    } catch {}
  }
  const directUrl = (url) => {
    const target = new URL(url);
    // Bypass legacy workers too, while explicitly retaining the public reader.
    target.searchParams.set("read", "1");
    target.searchParams.set("edit", "0");
    target.searchParams.set(directParameter, "1");
    return target;
  };
  if (new URL(location.href).searchParams.get(directParameter) === "1") {
    rememberDirect();
    const canonical = new URL(location.href);
    canonical.searchParams.delete(directParameter);
    if (canonical.searchParams.get("edit") === "0")
      canonical.searchParams.delete("edit");
    history.replaceState(history.state, "", canonical);
  }
  // The deadline covers response headers AND the JSON body, including a stalled worker.
  async function requestPage(
    url,
    signal,
    timeout,
    priority = "high",
    html = false,
  ) {
    if (signal.aborted)
      throw new DOMException("Lecture annulée.", "AbortError");
    const controller = new AbortController();
    let deadline, abort;
    const stopped = new Promise((_, reject) => {
      abort = () => {
        controller.abort();
        reject(new DOMException("Lecture annulée.", "AbortError"));
      };
      signal.addEventListener("abort", abort, { once: true });
      deadline = setTimeout(() => {
        controller.abort();
        reject(new Error("reader_timeout"));
      }, timeout);
    });
    try {
      return await Promise.race([
        (async () => {
          const response = await fetch(url, {
            credentials: "same-origin",
            cache: "no-store",
            redirect: html ? "error" : "follow",
            priority,
            signal: controller.signal,
          });
          if (!response.ok && !(html && response.status === 404))
            throw Error("Page indisponible");
          let result;
          if (html) {
            const parsed = new DOMParser().parseFromString(
                await response.text(),
                "text/html",
              ),
              root = parsed.querySelector("#root[data-reader-token]"),
              header = parsed.querySelector(".reader-header");
            if (
              !root ||
              !header ||
              !root.dataset.readerToken ||
              !root.innerHTML.trim()
            )
              throw Error("Réponse de lecture invalide.");
            result = {
              html: root.innerHTML,
              header: header.innerHTML,
              token: root.dataset.readerToken,
              root: root.dataset.readerRoot || "",
              title: parsed.title,
              appearance: parsed.body.getAttribute("style") || "",
              mode: parsed.body.dataset.baseMode || "system",
              unavailable: response.status === 404,
            };
          } else result = await response.json();
          return { response, result };
        })(),
        stopped,
      ]);
    } finally {
      clearTimeout(deadline);
      signal.removeEventListener("abort", abort);
    }
  }
  const requestState = (...args) => requestPage(...args);
  const requestDocument = (url, signal) =>
    requestPage(directUrl(url).href, signal, 5000, "high", true);
  let displayedUrl = new URL(location.href);
  const userBusy = () =>
    [...document.querySelectorAll("audio,video")].some((e) => !e.paused) ||
    document.querySelector("form.quiz:focus-within") ||
    document.querySelector('form.quiz[data-touched="1"]') ||
    document.activeElement?.tagName === "IFRAME" ||
    Boolean(window.getSelection()?.toString());
  function replace(result) {
    const root = document.querySelector("#root");
    if (!root || !result.html) return;
    const expanded = [...root.querySelectorAll(".gallery-v2")]
      .filter(
        (g) =>
          g
            .querySelector("[data-gallery-toggle]")
            ?.getAttribute("aria-expanded") === "true",
      )
      .map((g) => g.querySelector(".gallery-heading h3")?.textContent);
    const previousScroll = window.scrollY;
    root.innerHTML = result.html;
    root.querySelectorAll(".gallery-v2").forEach((g) => {
      if (
        expanded.includes(g.querySelector(".gallery-heading h3")?.textContent)
      ) {
        g.querySelectorAll("[data-gallery-extra]").forEach(
          (c) => (c.hidden = false),
        );
        const toggle = g.querySelector("[data-gallery-toggle]");
        if (toggle) {
          toggle.setAttribute("aria-expanded", "true");
          toggle.textContent = "Afficher moins";
        }
      }
    });
    token = result.token;
    root.dataset.readerToken = token;
    const header = document.querySelector(".reader-header");
    if (header) {
      if (result.header) header.innerHTML = result.header;
      else {
        const actions = header.querySelector(".reader-header-actions");
        header.innerHTML = result.breadcrumbs;
        if (actions) header.append(actions);
      }
    }
    document.title = result.title;
    window.FeuilletReaderTheme?.setBase(result.appearance, result.mode);
    window.scrollTo({
      top: Math.min(
        previousScroll,
        document.documentElement.scrollHeight - innerHeight,
      ),
      behavior: "instant",
    });
    pending = null;
    document.querySelector(".reader-update-notice")?.remove();
  }
  function offer(result) {
    pending = result;
    let notice = document.querySelector(".reader-update-notice");
    if (!notice) {
      notice = document.createElement("div");
      notice.className = "reader-update-notice";
      notice.setAttribute("role", "status");
      const text = document.createElement("span");
      text.textContent = "Une nouvelle version est disponible.";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Afficher la nouvelle version";
      button.addEventListener("click", () => {
        if (pending) replace(pending);
      });
      notice.append(text, button);
      document.body.append(notice);
    }
  }
  async function check(force = false) {
    if (
      busy ||
      activeNavigation ||
      document.hidden ||
      (!force && prefersDirect())
    )
      return;
    const root = document.querySelector("#root");
    if (!root?.hasAttribute("data-reader-token")) return;
    busy = true;
    const view = readerView(root),
      pass = navigation,
      controller = new AbortController();
    activeCheck = controller;
    try {
      const qs = root.dataset.readerShare
        ? new URLSearchParams({ share: root.dataset.readerShare, token })
        : new URLSearchParams({
            page: root.dataset.readerPage || "",
            root: root.dataset.readerRoot || root.dataset.readerPage || "",
            token,
          });
      const { result } = await requestState(
        "reader-state.php?" + qs,
        controller.signal,
        5000,
        "low",
      );
      if (
        controller.signal.aborted ||
        pass !== navigation ||
        view !== readerView(root)
      )
        return;
      if (result.token === token && !result.unavailable) return;
      if (result.html) {
        if (result.unavailable) {
          memory.clear();
          replace(result);
        } else if (!userBusy()) replace(result);
        else offer(result);
      }
    } catch {
    } finally {
      if (activeCheck === controller) {
        activeCheck = null;
        busy = false;
      }
    }
  }

  const memory = new Map();
  let navigation = 0;
  const readerView = (root) =>
    JSON.stringify([
      root.dataset.readerShare,
      root.dataset.readerPage,
      root.dataset.readerRoot,
    ]);
  const key = (url) => readerQuery(url).toString();
  function setReaderLocation(root, url, resolvedRoot = "") {
    const query = readerQuery(url);
    root.dataset.readerShare = query.get("share") || "";
    root.dataset.readerPage = query.get("page") || "";
    root.dataset.readerRoot = resolvedRoot || query.get("root") || "";
  }
  function note(message, url, retry = false) {
    let n = document.querySelector(".reader-network-status");
    if (!message) {
      n?.remove();
      return;
    }
    if (!n) {
      n = document.createElement("div");
      n.className = "reader-network-status";
      n.setAttribute("role", "status");
      document.body.append(n);
    }
    n.textContent = message;
    if (url) {
      const link = document.createElement("a");
      link.href = directUrl(url).href;
      link.target = "_self";
      link.textContent = "Ouvrir directement";
      link.dataset.readerDirect = "1";
      n.append(" ", link);
      if (retry) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Réessayer";
        button.addEventListener(
          "click",
          () => void navigate(url).catch(() => {}),
        );
        n.append(button);
      }
    }
  }
  function show(result, url) {
    const root = document.querySelector("#root");
    setReaderLocation(root, url, result.root);
    replace(result);
    displayedUrl = new URL(url);
    window.scrollTo(0, 0);
  }
  async function navigate(url, push = true) {
    url = new URL(url, location.href);
    if (url.origin !== location.origin)
      throw Error("Adresse de lecture invalide.");
    const useDocument = prefersDirect() && navigator.onLine !== false;
    const pass = ++navigation;
    activeNavigation?.abort();
    activeCheck?.abort();
    activeCheck = null;
    busy = false;
    const controller = new AbortController();
    activeNavigation = controller;
    const cacheKey = key(url);
    let hit = memory.get(cacheKey);
    if (hit && Date.now() - hit.time >= 600000) {
      memory.delete(cacheKey);
      hit = null;
    }
    note("Ouverture de la page…", url);
    if (push) history.pushState({ feuillet: true }, "", url);
    const qs = readerQuery(url);
    if (hit) qs.set("token", hit.result.token);
    try {
      const loaded = useDocument
        ? await requestDocument(url, controller.signal)
        : await requestState("reader-state.php?" + qs, controller.signal, 4000);
      const response = loaded.response;
      let result = loaded.result;
      if (pass !== navigation) return;
      const offline = response.headers.get("X-Feuillet-Offline") === "1";
      if (!result.html && !offline && hit && result.token === hit.result.token)
        result = hit.result;
      if (!result.html) throw Error("Page indisponible");
      if (result.unavailable) memory.clear();
      else if (!offline) {
        memory.set(cacheKey, { result, time: Date.now() });
        while (memory.size > 20) memory.delete(memory.keys().next().value);
      }
      show(result, url);
      note(offline ? "Copie enregistrée · connexion indisponible." : null);
    } catch (error) {
      if (pass !== navigation) return;
      if (navigator.onLine !== false) {
        // Keep the current document and its rescue controls alive. A native reload
        // can itself stall or select the offline shell before any reader code runs.
        try {
          if (useDocument) throw error;
          rememberDirect();
          note("Connexion lente · récupération directe de la page…", url);
          const { result } = await requestDocument(url, controller.signal);
          if (pass !== navigation) return;
          if (result.unavailable) memory.clear();
          show(result, url);
          note(null);
        } catch {
          if (pass !== navigation) return;
          history.replaceState(history.state, "", displayedUrl);
          note(
            "Le chargement n’a pas abouti. La page précédente reste affichée.",
            url,
            true,
          );
        }
        return;
      }
      const root = document.querySelector("#root");
      setReaderLocation(root, url);
      token = "";
      const main = document.createElement("main");
      main.className = "reader-page";
      const h = document.createElement("h1");
      h.textContent = "Cette page est indisponible.";
      const p = document.createElement("p");
      p.textContent =
        "La consultation nécessite une réponse du serveur ou une copie enregistrée hors connexion.";
      main.append(h, p);
      root.replaceChildren(main);
      note("");
      throw error;
    } finally {
      if (activeNavigation === controller) activeNavigation = null;
    }
  }
  window.FeuilletReaderClear = () => memory.clear();
  window.FeuilletReaderNavigate = navigate;
  window.FeuilletReaderRefresh = () => {
    token = "";
    void check(true);
  };
  window.addEventListener("popstate", () => {
    const url = new URL(location.href);
    void navigate(url, false).catch(() => {});
  });
  window.addEventListener("pagehide", () => {
    ++navigation;
    activeNavigation?.abort();
    activeCheck?.abort();
    clearTimeout(timer);
  });
  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const a = event.target.closest("a[href]");
    if (
      !a ||
      (a.target && a.target.toLowerCase() !== "_self") ||
      a.hasAttribute("download")
    )
      return;
    if (a.dataset?.readerDirect === "1") {
      ++navigation;
      activeNavigation?.abort();
      activeCheck?.abort();
      rememberDirect();
      return;
    }
    const url = new URL(a.href),
      base = new URL(".", location.href),
      path = url.pathname.slice(base.pathname.length),
      internal =
        url.pathname.startsWith(base.pathname) &&
        ((path === "index.php" &&
          (url.searchParams.has("page") || url.searchParams.has("share"))) ||
          /^[a-z0-9][a-z0-9-]{0,63}$/.test(path));
    if (
      url.origin !== location.origin ||
      !internal ||
      url.searchParams.has("edit") ||
      url.searchParams.has("form") ||
      url.searchParams.has("project") ||
      url.searchParams.has("dashboard") ||
      url.searchParams.has("print") ||
      url.hash
    )
      return;
    event.preventDefault();
    void navigate(url).catch(() => {});
  });
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      await check();
      schedule();
    }, 15000);
  }
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      activeNavigation = activeCheck = null;
      busy = false;
      note(null);
      schedule();
      if (location.href !== displayedUrl.href)
        void navigate(new URL(location.href), false).catch(() => {});
      else void check(true);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void check();
  });
  window.addEventListener("focus", () => void check());
  schedule();
  document.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-gallery-toggle]");
    if (!toggle) return;
    const gallery = toggle.closest(".gallery-v2"),
      expanded = toggle.getAttribute("aria-expanded") === "true";
    gallery
      .querySelectorAll("[data-gallery-extra]")
      .forEach((card) => (card.hidden = expanded));
    toggle.setAttribute("aria-expanded", String(!expanded));
    toggle.textContent = expanded ? "Afficher tout" : "Afficher moins";
  });
  document.addEventListener("input", (event) => {
    const form = event.target.closest("form.quiz");
    if (form) form.dataset.touched = "1";
  });
  document.addEventListener("reset", (event) => {
    const form = event.target.closest("form.quiz");
    if (!form) return;
    form.dataset.touched = "0";
    form.querySelectorAll(".quiz-feedback,.quiz-score").forEach((el) => {
      el.textContent = "";
      el.classList.remove("correct", "incorrect");
    });
    if (pending) replace(pending);
  });
  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("form.quiz");
    if (!form) return;
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    form.dataset.touched = "1";
    const answers = {};
    form.querySelectorAll("fieldset").forEach((field) => {
      answers[field.dataset.question] =
        field.dataset.type === "short"
          ? field.querySelector("input").value
          : [...field.querySelectorAll("input:checked")].map((el) =>
              Number(el.value),
            );
    });
    try {
      const session = await fetch("api.php?action=session").then((r) =>
        r.json(),
      );
      const response = await fetch("api.php?action=quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": session.csrf,
        },
        body: JSON.stringify({
          page_id: form.dataset.page,
          quiz_id: form.dataset.quiz,
          answers,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Correction indisponible.");
      form.querySelector(".quiz-score").textContent =
        `Résultat : ${result.score} / ${result.total}`;
      result.results.forEach((q) => {
        const field = [...form.querySelectorAll("fieldset")].find(
          (el) => el.dataset.question === q.id,
        );
        if (!field) return;
        const feedback = field.querySelector(".quiz-feedback");
        feedback.className =
          "quiz-feedback " + (q.correct ? "correct" : "incorrect");
        feedback.textContent =
          (q.correct
            ? "✓ Bonne réponse. "
            : "↻ À revoir. Réponse attendue : " +
              q.expected.join(", ") +
              ". ") + q.explanation;
      });
    } catch (error) {
      form.querySelector(".quiz-score").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
})();
