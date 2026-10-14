# Feuillet 0.7 — composer, retrouver, importer

## Déplacer les blocs

Survoler un bloc, puis glisser sa poignée ⋮⋮. La ligne d’accent indique où il sera déposé. Pour entrer dans un titre dépliable, viser son contenu ou la zone sous son titre : le repère **Dans la section** confirme la destination. La section s’ouvre après le dépôt. Pour en sortir, déposer le bloc avant ou après la section, avec le repère à la largeur de la page.

Textes, images, fichiers, cartes et autres blocs conservent leur contenu et leurs attributs. Le titre d’une section dépliable fait partie de sa section : sa poignée déplace l’ensemble. Un conteneur vidé conserve un paragraphe vide pour rester éditable. Les déplacements sont enregistrés automatiquement et annulables avec Annuler / Ctrl ou Cmd + Z. Échap annule un glissement en cours.

Cliquer la poignée ouvre toujours les actions du bloc. Avec cette poignée au clavier : Alt + ↑/↓ change l’ordre, Alt + ← sort du conteneur, Alt + → entre dans la section dépliable précédente lorsqu’elle existe. Sur mobile, la poignée du bloc actif apparaît à droite, avec une cible de 44 px, sans réduire la largeur du contenu. Le geste utilise les événements de pointeur ; les téléphones réels restent à vérifier.

La [référence Notion et l’observation REA](REA-BLOCS-0.7.md) distinguent les comportements documentés de la reconstruction Feuillet. Une identité complète avec l’éditeur privé de Notion n’est pas affirmée.

## Un accueil réservé à l’administrateur

Le logo et le nom du site, en haut à gauche, ouvrent **l’accueil admin**. Il regroupe les pages récemment créées ou modifiées, leur carnet, leur date d’enregistrement et leur accès public/privé. Une carte permet de reprendre directement la rédaction ; création et import sont accessibles depuis cet écran.

Cet accueil n’est pas une page publique et ne remplace pas le partage par branche. Les visiteurs arrivent toujours sur la page qui leur a été partagée. Aucune télémétrie de consultation n’est créée.

Le bouton pour masquer la navigation se trouve désormais à droite du titre du site. Le raccourci configurable et la largeur réglable sont conservés.

## Importer une page

Le menu **⋯** de la page contient **Importer une page**. Cette action est aussi disponible depuis l’accueil et les réglages.

- **TXT** : paragraphes et retours à la ligne, UTF-8 ou UTF-16 avec marque d’encodage.
- **Markdown** : titres, listes et mises en forme existantes ; `.md` et `.markdown` acceptés.
- **RTF** : texte, gras, italique, soulignement, barré et titres simples. Les objets incorporés, images, métadonnées et texte caché ne sont pas importés. Les polices, tableaux complexes et couleurs Word ne sont pas reproduits.

Limite : 2 Mo et complexité bornée. Le document devient une nouvelle page privée à la racine du carnet actif. Il ne remplace pas la page ouverte. Les formats `.doc`, `.docx` et `.odt` ne sont pas pris en charge par cet import texte ; les fichiers peuvent toujours être déposés comme pièces jointes.

## Une adresse et sa carte

Le bloc **Lieu / Google Maps** est disponible avec `/lieu`, `/carte` ou le bouton d’ajout. Saisir une adresse ou un lieu, puis enregistrer. Une carte Google Maps et un lien pour l’ouvrir sont affichés en édition et en lecture publique.

Aucune clé API, facturation ou compte Google Cloud n’est requis. Il s’agit de l’intégration publique Google Maps. Un lien ou le code obtenu par **Partager → Intégrer une carte** peut aussi être collé dans le champ facultatif ; seul son URL Google autorisé est conservé, jamais le HTML fourni. Les URLs de l’API `/maps/embed/v1/` et les domaines étrangers sont refusés.

L’affichage contacte Google depuis le navigateur et dépend de son service. Le lien externe reste disponible si la carte ne se charge pas. Le Markdown et le PDF conservent l’adresse et le lien ; le réimport d’un Markdown exporté par Feuillet retrouve le bloc de carte.

## Nouvelle identité

Le symbole montagne/lac est un dessin vectoriel original, monochrome et transparent. Il s’adapte à l’accent du thème, y compris sombre/OLED. Le logo reste personnalisable dans **Réglages → Changer le logo du site**. Les icônes de pages ne sont pas remplacées.

Versions fournies : [SVG](../public/feuillet-logo.svg) et [PNG transparent, 1024 × 1024](../public/feuillet-logo.png). Voir [l’identité visuelle](IDENTITE-VISUELLE.md).

## Mise à jour

Sauvegarder, remplacer le code et les assets compilés, conserver `config.php` et `storage/`, puis recharger les onglets. Aucune nouvelle table SQL ou dépendance de production. Après ajout de cartes, utiliser Feuillet 0.7 ou ultérieur ; une ancienne version ne reconnaît pas ce bloc. Voir [installation](INSTALLATION-OVH.md), [architecture](ARCHITECTURE.md), [maintenance](MAINTENANCE.md) et [tests](TESTS.md).
