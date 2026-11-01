# Feuillet 0.15.2 — Copies indépendantes

Sélectionner un bloc de page, une galerie ou plusieurs blocs, puis utiliser Ctrl/Cmd+C et Ctrl/Cmd+V dans la page de destination. La nouvelle copie possède ses pages, sous-pages, fichiers, couvertures et icônes : les modifications de contenu et les renommages ne changent plus les originaux. Dupliquer le bloc suit la même règle.

Les bases intégrées sont aussi dupliquées, avec leurs lignes, relations et formulaires. Les nouvelles bases restent privées et les nouveaux formulaires fermés, avec de nouveaux liens. Les pages copiées suivent le réglage existant de publication des sous-pages de la destination. Les URL externes restent des liens externes.

Une galerie dynamique devient une sélection fixe de nouvelles pages ; aucun ajout ultérieur dans l’original n’y apparaît. Au sein d’un même lot, les références répétées visent la même nouvelle page afin de préserver la cohérence interne ; deux collages successifs créent deux lots indépendants.

Le collage est enregistré avec ses dépendances dans une transaction. Un conflit ou fichier manquant interrompt la copie sans écraser la destination. Limites par collage : 100 pages, 500 fichiers et 256 Mo de fichiers, 50 bases liées ; réduire la sélection si nécessaire. Les fichiers dupliqués occupent leur propre espace disque.

Les collages réalisés avec les anciennes versions ne sont pas convertis automatiquement : refaire un collage après mise à jour, puis retirer l’ancien bloc lié si nécessaire. L’annulation dans l’éditeur retire les blocs collés ; les pages et fichiers créés restent disponibles dans le carnet et la bibliothèque.
