# Feuillet 0.18 — Des cartes de liens automatiques

Quand un lien HTTPS devient une carte, Feuillet récupère le titre, la description, l’icône et l’image d’aperçu disponibles sur la page. Changer l’adresse d’une carte déclenche une nouvelle récupération. Les cartes existantes sans aperçu récupéré sont enrichies lors de leur ouverture dans l’éditeur administrateur.

Le bouton **Actualiser depuis le lien** permet de recommencer sur une carte existante et de contourner le cache d’une heure. Il relit les informations du site : un titre personnalisé avant cette action peut donc être remplacé. Les modifications manuelles effectuées pendant la requête restent prioritaires. Les boutons de personnalisation d’icône et d’image restent disponibles.

Les images sont enregistrées dans la bibliothèque de Feuillet. Elles suivent les droits de la page, les sauvegardes et la copie indépendante. Les visiteurs ne déclenchent aucune récupération de métadonnées. L’aperçu n’est pas une synchronisation continue : il est actualisé à la création, au changement d’adresse ou sur demande.

## Limites

Certains sites refusent les robots, demandent une connexion, ou ne publient aucune miniature. Feuillet conserve alors les informations disponibles et affiche un message dans l’éditeur ; une panne ne détruit pas la carte. Une nouvelle tentative se fait avec le bouton d’actualisation. Aucun contournement de protection ni clé d’API n’est nécessaire.

La récupération accepte HTTPS, sans port personnalisé ni identifiants. Les icônes et images PNG, JPEG, WebP, GIF et AVIF sont conservées ; les favicons ICO contenant du PNG ou certains bitmaps sont convertis en PNG (GD nécessaire pour les bitmaps). Les SVG distants ne sont pas importés. Une icône générique reste affichée si aucun format compatible n’est disponible.

PHP cURL et DOM sont nécessaires ; GD améliore la compatibilité des favicons. La fonction reste compatible avec un hébergement mutualisé, sans service permanent ni VPS.
