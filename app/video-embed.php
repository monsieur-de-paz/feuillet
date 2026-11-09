<?php
declare(strict_types=1);

/** HTTPS browser targets only. The server never downloads direct media. */
function video_embed_url(mixed $value): ?array {
    if (!is_string($value) || strlen($value) > 4000) return null;
    $url = trim($value);
    if (preg_match('/[\x00-\x20\x7f<>"\\\\]/', $url)) return null;
    $parts = parse_url($url);
    if (!$parts || ($parts['scheme'] ?? '') !== 'https' || empty($parts['host'])
        || isset($parts['user']) || isset($parts['pass']) || isset($parts['port'])) return null;
    $host = strtolower($parts['host']);
    $path = $parts['path'] ?? '';
    parse_str($parts['query'] ?? '', $query);
    return [$url, $host, $path, $query];
}

function video_embed_source(mixed $value): ?array {
    $parts = video_embed_url($value);
    if (!$parts) return null;
    [$url, $host, $path, $query] = $parts;
    $src = null;
    $label = 'Vidéo en ligne';
    $kind = 'player';
    $portrait = false;

    if (in_array($host, ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'], true)) {
        $id = $query['v'] ?? null;
        if ($host === 'youtu.be') $id = trim($path, '/');
        elseif (preg_match('~^/(?:embed|shorts|live)/([^/]+)/?$~D', $path, $match)) $id = $match[1];
        if (is_string($id) && preg_match('/^[A-Za-z0-9_-]{11}$/D', $id)) {
            $src = 'https://www.youtube-nocookie.com/embed/'.$id;
            $start = $query['start'] ?? $query['t'] ?? '';
            if (is_string($start) && preg_match('/^([0-9]{1,7})s?$/D', $start, $match)) $src .= '?start='.(int)$match[1];
            $label = 'YouTube';
        }
    } elseif (in_array($host, ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'], true)) {
        if (preg_match('~^/(?:video/|channels/[^/]+/|groups/[^/]+/videos/)?([0-9]{1,15})(?:/([a-zA-Z0-9]{6,64}))?/?$~D', $path, $match)) {
            $src = 'https://player.vimeo.com/video/'.$match[1];
            $hash = $query['h'] ?? $match[2] ?? '';
            if (is_string($hash) && preg_match('/^[a-zA-Z0-9]{6,64}$/D', $hash)) $src .= '?h='.$hash;
            $label = 'Vimeo';
        }
    } elseif (in_array($host, ['dailymotion.com', 'www.dailymotion.com', 'dai.ly', 'geo.dailymotion.com'], true)) {
        // Public player documented in Dailymotion's Video fields reference.
        $player = 'xc394';
        $id = null;
        if ($host === 'geo.dailymotion.com' && preg_match('~^/player/([a-z0-9]{2,30})\.html$~D', $path, $match)) {
            $player = $match[1];
            $id = $query['video'] ?? null;
        } elseif (preg_match($host === 'dai.ly' ? '~^/([a-z0-9]{2,30})/?$~D' : '~^/(?:embed/)?video/([a-z0-9]{2,30})(?:_[^/]*)?/?$~D', $path, $match)) {
            $id = $match[1];
        }
        if (is_string($id) && preg_match('/^[a-z0-9]{2,30}$/D', $id)) {
            $src = 'https://geo.dailymotion.com/player/'.$player.'.html?video='.$id;
            $label = 'Dailymotion';
        }
    } elseif (in_array($host, ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'], true)) {
        if (preg_match('~^/(?:@[^/]+/video|player/v1|embed/v2)/([0-9]{10,25})/?$~D', $path, $match)) {
            $src = 'https://www.tiktok.com/player/v1/'.$match[1];
            $label = 'TikTok';
            $portrait = true;
        }
    } elseif (preg_match('/\.(?:mp4|webm|ogv|ogg|m4v|mov)$/iD', $path)) {
        $src = $url;
        $kind = 'media';
    }
    return $src ? compact('url', 'src', 'label', 'kind', 'portrait') : null;
}

function resolve_video_embed(mixed $value): array {
    if ($video = video_embed_source($value)) return $video;
    $parts = video_embed_url($value);
    if ($parts) {
        [$url, $host, $path] = $parts;
        $shortHost = in_array($host, ['vm.tiktok.com', 'vt.tiktok.com'], true);
        if (($shortHost && preg_match('~^/[A-Za-z0-9]+/?$~D', $path))
            || (in_array($host, ['www.tiktok.com', 'tiktok.com'], true) && preg_match('~^/t/[A-Za-z0-9]+/?$~D', $path))) {
            require_once __DIR__.'/link-preview.php';
            limit_rate('video-resolve', 30, 300);
            try {
                $final = '';
                link_fetch($url, 128000, $final, static function(string $target): bool {
                    $targetHost = video_embed_url($target)[1] ?? '';
                    if (!in_array($targetHost, ['vm.tiktok.com', 'vt.tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'tiktok.com'], true)) {
                        fail('Redirection TikTok inattendue.', 502);
                    }
                    return video_embed_source($target) !== null;
                });
                if ($video = video_embed_source($final)) return $video;
            } catch (AppError) {
                // The full video link also works if TikTok blocks the server-side redirect.
            }
            fail('Impossible de suivre ce lien TikTok. Ouvre-le puis copie l’adresse complète de la vidéo.');
        }
    }
    fail('Ce lien ne donne pas accès à un lecteur reconnu. Essaie le lien de la vidéo ou colle le code du fournisseur dans le bloc Intégration HTML.');
}

function html_embed_height(mixed $height): int {
    return max(200, min(1200, is_numeric($height) ? (int)$height : 450));
}
