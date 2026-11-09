(() => {
  function startVideo(button, src, local) {
    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "none";
    if (local) video.poster = button.querySelector("img")?.getAttribute("src") || "video-placeholder.svg";
    video.setAttribute("aria-label", button.getAttribute("aria-label") || "Vidéo");
    video.src = src;
    button.replaceWith(video);
    video.focus();
    video.play()?.catch(() => {});
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-video-src], [data-embed-src], [data-embed-html]");
    if (!button) return;
    const local = button.dataset.videoSrc;
    if (local && /^media\.php\?id=[a-f0-9-]{36}$/.test(local)) {
      startVideo(button, local, true);
      return;
    }
    const html = button.dataset.embedHtml;
    const source = button.dataset.embedSrc;
    if (source && !source.startsWith("https://")) return;
    if (source && button.dataset.embedKind === "media") {
      startVideo(button, source, false);
      return;
    }
    if (!source && !html) return;
    const frame = document.createElement("iframe");
    frame.title = button.dataset.embedTitle || "Intégration externe";
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    if (html) {
      frame.setAttribute("sandbox", "allow-scripts allow-forms");
      frame.allow = "fullscreen";
      frame.style.height = button.dataset.embedHeight + "px";
      frame.addEventListener("load", () => {
        frame.contentWindow?.postMessage({ feuilletEmbed: html }, "*");
      }, { once: true });
      frame.src = "embed-frame.php";
    } else {
      frame.allow = "autoplay; fullscreen; encrypted-media; picture-in-picture";
      frame.src = source;
    }
    button.replaceWith(frame);
    frame.focus();
  });
})();
