/* A sandboxed frame has an opaque origin. Authenticate its initial document
 * before delivering HTML, then use a port bound to that document. */
window.FeuilletMountEmbed = (frame, code) => {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, "0")).join("");
  const timeout = setTimeout(cleanup, 15000);

  function cleanup() {
    window.removeEventListener("message", receive);
    clearTimeout(timeout);
  }

  function receive(event) {
    const port = event.ports[0];
    if (event.source !== frame.contentWindow || event.origin !== "null"
        || event.data?.feuilletEmbedReady !== nonce || !port) return;
    cleanup();
    port.postMessage(code);
    port.close();
  }

  window.addEventListener("message", receive);
  frame.src = "embed-frame.php?challenge=" + nonce;
  return cleanup;
};
