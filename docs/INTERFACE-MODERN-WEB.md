# Feuillet 0.32 — interactions Rivage et Modern Web Guidance

Exploration locale commencée le 14 novembre 2026 sur `design/modern-web-local`,
à partir de la version 0.31.1. Direction validée par Sandro le 15 novembre 2026
pour la release 0.32.0. Ce document conserve les choix de conception et le
périmètre de validation de cette évolution.

## Intention

Conserver les pages blanches (#FFFFFF), sans grain, les couleurs adaptatives et
la direction Rivage. Donner plus de présence aux interactions, sans animer la
rédaction : la visibilité du mouvement vient de son amplitude et de sa courbe,
pas d’un clignotement ou d’une animation permanente.

- Cartes d’accueil : titres structurés et liens natifs, avec une surface entière
  cliquable, un focus clavier visible et un survol qui soulève la carte de 6 px.
- Fenêtres : ouverture de 580 ms, translation de 28 px et échelle de 0,94 à 1 ;
  fermeture de 220 ms depuis la transformation courante pour éviter un saut si
  la fermeture intervient pendant l’ouverture. Le fond s’assombrit par opacité.
- Menus : ouverture de 460 ms depuis leur commande ; mesures de position basées
  sur les dimensions de mise en page, indépendantes de l’échelle d’animation.
- Navigation : arrivée des textes en 620 ms ; cartes d’accueil en 680 ms avec un
  léger décalage progressif, limité aux six premières cartes. Aucun effet sur
  le premier chargement ni sur un rafraîchissement de la même page publique.
- Sélection d’onglets : indicateur géométrique animé, sans modifier la largeur
  ou la hauteur des boutons ni déplacer les contours de focus.
- Éditeur : les déplacements par la souris et insertions explicites peuvent
  s’animer en 460 ms. Entrée, Retour arrière, composition et saisie restent
  immobiles ; toute animation d’arrivée cède immédiatement à la rédaction.
- Réglages, listes et cartes : espacements et tailles de texte harmonisés.
  Cibles tactiles principales de 44 px ; actions de fichier adaptées à la
  largeur réelle de leur colonne grâce aux container queries.
- Mouvement réduit : règles par composant, sans durée universelle artificielle
  de 0,01 ms. Les contenus restent visibles et les états de couleur persistent.

Les animations spatiales privilégient les transformations et l’opacité. Les
ombres larges ne sont plus interpolées sur les principales cartes. Les
popovers manuels conservent leur fallback existant pour les navigateurs sans
API Popover. Aucune nouvelle dépendance de production n’est ajoutée.

## Skill et confidentialité du poste de développement

Installation demandée : `npx modern-web-guidance@latest install`, exécutée avec
`DISABLE_TELEMETRY=1`. Package 1.0.0 ; guides au millésime
`2026_11_09-5bcc021b`. Guides appliqués : `natural-interactions`, `motion`, `card`
et `form-factor-adaptation`.

La variable `export DISABLE_TELEMETRY=1` est persistée dans les profils Zsh
`.zprofile` et `.zshrc` et vérifiée dans un nouveau shell. Les fichiers précédents
ont été sauvegardés avant modification. Cela vise la télémétrie documentée de
Modern Web Guidance, pas un réglage global de tous les logiciels Google.

Le skill est installé pour ce projet dans `.agents/skills/modern-web-guidance`.
Ce dossier et son lockfile sont exclus localement des commits et ne font pas
partie de la distribution Feuillet. Ils sont disponibles pour les prochains
échanges dans ce projet. Référence :
[Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance).

## Validation

- Compilation TypeScript et Vite : réussie. L’avertissement de taille des
  bundles préexistants reste présent ; cette exploration n’effectue pas leur
  découpage.
- `node tests/frontend.mjs` : réussi, notamment les commandes réelles
  ProseMirror Entrée, Retour arrière et listes, le nettoyage des écouteurs,
  l’annulation du mouvement par la frappe et les déplacements par pointeur.
- `node tests/rivage-motion.mjs` : réussi, avec couverture du premier rendu,
  du nombre borné d’éléments animés, de la géométrie après défilement, de la
  préférence de mouvement réduit, du BFCache et du polling du lecteur public.
- `node tests/reader-navigation.mjs` et `node tests/pwa.mjs` : réussis.
- Navigateur intégré : navigation depuis une carte de l’accueil, ouverture des
  réglages, sélection de la police, fermeture par Échap, saisie Entrée/Retour
  arrière, mode sombre, aperçu PDF et contrôles à 390 px puis 320 px. Pas de
  débordement horizontal observé ; le menu des sections défile horizontalement
  à 320 px, sans élargir la fenêtre.

Ces vérifications ne constituent pas une mesure de cadence sur tous les
matériels : le test utilisateur reste nécessaire pour apprécier l’amplitude
et la fluidité sur son appareil, notamment les machines les moins puissantes.

## Tester et reprendre

Lancer `python3 tools/preview-rivage.py` depuis le dépôt. Le serveur écoute sur
la boucle locale, normalement au port 8766 :
<http://127.0.0.1:8766/index.php?dashboard=1>.

Les notes de démonstration et leurs modifications sont conservées dans
`.private/rivage` (ignoré par Git). Ne pas effacer ce dossier pour relancer le
prototype. La configuration et les données du serveur OVH ne sont pas touchées.

Le code réseau, les droits de publication, le service worker et les mécanismes
de récupération du lecteur n’ont pas été modifiés. Aucun effet ne retarde les
requêtes pour attendre une animation. La distribution 0.32.0 est reconstruite avec son numéro de version et son
manifeste ; les tests d’installation et de mise à jour sur une copie jetable
complètent les essais visuels selon la procédure de publication habituelle.
