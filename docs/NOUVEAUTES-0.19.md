# Feuillet 0.19 — Des pages plus légères et mieux organisées

## Miniatures

Les petites images utilisent des versions réduites : icônes (96 px), bibliothèque et aperçus de liens (320 px), couvertures dans les galeries et cartes (640 px). Le service propose aussi un format 1280 px pour les futurs usages intermédiaires. Les originaux restent disponibles pour les grandes images, le zoom et le téléchargement.

Les miniatures sont créées au premier affichage, puis réutilisées. Le navigateur peut revalider leur cache sans retélécharger les données. Les droits de l’original sont contrôlés avant toute réponse, y compris une réponse « inchangée ». Rendre une page privée coupe également l’accès à ses miniatures. Les anciennes images en profitent automatiquement : aucun réimport nécessaire.

PHP GD est nécessaire pour réduire les images. WebP est utilisé lorsqu’il est disponible, sinon PNG. Si GD manque, si la mémoire est insuffisante, ou si le résultat est plus lourd, l’image d’origine reste utilisée. Les animations GIF ne sont conservées que dans l’original ; la vignette est fixe. Les JPEG sont réorientés d’après leurs informations EXIF.

## Sous-pages

Les blocs de sous-pages ont une nouvelle apparence sans soulignement, avec une icône bien visible, un titre neutre adapté au thème et une flèche de navigation.

Survoler le bloc, ou y accéder au clavier, puis ouvrir **Personnaliser le lien de sous-page**. Sur écran tactile, le bouton reste visible. Trois présentations : **Ligne épurée**, **Carte**, **Compacte**. Choisir la taille de l’icône et l’affichage de l’icône, de la description et de la couverture. Ces choix concernent le lien, pas la page cible. Les pages privées ne sont jamais dévoilées aux visiteurs par ces cartes.

Les anciens blocs de sous-pages adoptent la ligne épurée. Les liens hypertextes ordinaires dans une phrase gardent leur comportement de lien texte.

## Colonnes et cohérence visuelle

Les commandes **Deux colonnes**, **Trois colonnes** et **Quatre colonnes** créent une grille sans bordures, avec des blocs ordinaires dans chaque colonne. Le bouton **Colonnes**, visible au survol ou au focus, permet de régler leur nombre, l’espacement (serré, confortable ou aéré), et les proportions lorsque la grille en contient deux.

Réduire le nombre de colonnes regroupe les blocs des colonnes retirées dans la dernière colonne restante, sans les supprimer. Les colonnes s’empilent sur mobile et dans les zones trop étroites ; quatre colonnes passent d’abord à deux quand l’espace manque. Les titres, liens, cartes, encadrés et galeries partagent les mêmes règles visuelles dans l’éditeur et le lecteur public. Les animations respectent la préférence de réduction du mouvement.

Aucune migration SQL, aucun nouveau service, aucune clé d’API. Voir [les choix de design et leur validation](DESIGN-0.19.md).
