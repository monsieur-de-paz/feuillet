<?php
declare(strict_types=1);

// This document is an isolated host for provider HTML. The sandbox also applies
// if someone opens the endpoint directly or changes the enclosing iframe.
header("Content-Security-Policy: sandbox allow-scripts allow-forms; default-src 'none'; script-src https: 'unsafe-inline'; style-src https: 'unsafe-inline'; img-src https: data: blob:; media-src https: blob:; font-src https: data:; connect-src https:; frame-src https:; frame-ancestors 'self'; form-action https:; base-uri 'none'; object-src 'none'");
header('Cache-Control: no-store');
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
?>
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Intégration externe</title>
<style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}body{overflow:hidden}</style>
</head>
<body>
<script>
const nonce = new URLSearchParams(location.search).get("challenge") || "";
if (parent !== window && /^[a-f0-9]{32}$/.test(nonce)) {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
        channel.port1.close();
        const code = event.data;
        if (typeof code !== "string" || !code || code.length > 32000) return;
        const frame = document.createElement("iframe");
        frame.title = "Contenu du fournisseur";
        frame.setAttribute("sandbox", "allow-scripts allow-forms");
        frame.allow = "fullscreen";
        frame.srcdoc = code;
        document.body.append(frame);
    };
    parent.postMessage({ feuilletEmbedReady: nonce }, location.origin, [channel.port2]);
}
</script>
</body>
</html>
