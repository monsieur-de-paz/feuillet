# Feuillet 0.17 — Boutons et cartes de liens

Les boutons existants bénéficient d’un survol et d’un focus visibles : fond et bordure accentués, ombre légère et déplacement discret. Le mouvement est désactivé si le système demande des animations réduites.

Dans l’éditeur, utiliser Icône du lien pour choisir un emoji, une icône du catalogue ou une image (fichier, collage ou sélecteur habituel). Retirer permet un bouton sans icône.

Présentation permet de choisir lien texte, bouton ou carte. Les cartes peuvent avoir une image via Image d’aperçu et une description dans Présentation. Les paramètres visuels restent conservés entre bouton et carte. La conversion en texte seul conserve le libellé et l’adresse ; les visuels de carte ne sont pas transportés par ce format.

Un lien texte, y compris importé, peut être sélectionné puis transformé depuis le menu de mise en forme ; le clic droit propose aussi les actions Afficher ce lien en bouton / en carte quand le curseur est dans le lien.

Le collage HTML reconnaît les cartes Notion identifiables (notamment a.bookmark et notion-bookmark-block), et reprend titre, description et image lorsqu’ils sont fournis. Un collage ou export Markdown ne contenant qu’une URL ne permet pas de retrouver la présentation d’origine : utiliser les outils de présentation dans Feuillet. Le rendu s’adapte au thème de Feuillet, sans garantie d’identité graphique exacte avec Notion.

Les images externes importées peuvent expirer selon leur hébergeur ; choisir une image locale pour une miniature durable. Depuis la version 0.18, les cartes peuvent récupérer automatiquement les métadonnées et les images du site distant ; voir [les nouveautés 0.18](NOUVEAUTES-0.18.md). Les icônes et images locales respectent les droits des pages et sont incluses dans les sauvegardes et copies indépendantes.
