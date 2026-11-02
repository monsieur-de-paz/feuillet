# Revue de design 0.19

Mode : full sur le contenu enrichi des pages. React/Tiptap et CSS existants, rendu PHP du lecteur ; pas de nouvelle bibliothèque graphique. Références : capture fournie le 2 novembre 2026 et observation en lecture seule de la page courante dans l’application Notion. Deux groupes côte à côte avec titre et liens icône/texte ont été constatés. Aucune note Notion modifiée. L’outil REA n’étant pas exposé dans cette session, aucune analyse REA n’est revendiquée.

## Couverture

| Catégorie | Preuves inspectées | Résultat |
|---|---|---|
| Typographie | Sous-pages et descriptions, captures lecteur/éditeur | Titres neutres, descriptions secondaires et retours à la ligne lisibles |
| Surfaces | Colonnes, encadrés, galeries, liens de sous-pages | Espacement et rayons harmonisés ; choix entre lien épuré et carte |
| Animations | CSS partagé, survol, focus et préférence reduced-motion | Transitions ciblées courtes ; pas d’animation répétée de chargement |
| Icônes | Emoji et image d’icône, dimensions DOM | 22/28/36 px pour les sous-pages ; miniatures privées de 96 px |
| Performance | HTTP des images, poids et dimensions, cache et droits | Dérivés WebP/PNG ; originaux inchangés ; revalidation après contrôle d’accès |

## Changements

| Importance | Emplacement | Avant | Après | Pourquoi |
|---|---|---|---|---|
| Haute | `public/media.php`, `app/thumbnails.php`, IconPicker et vignettes | Original chargé pour chaque petite image | Dérivé borné, cache privé réutilisable et requêtes conditionnelles | Réduire les transferts et décodages sur les pages riches |
| Moyenne | PageLinkView, `app/render.php` et CSS partagé | Liens publics soulignés, icônes discrètes, peu de choix | Trois présentations et réglages de visuels | Rendre les destinations reconnaissables et agréables à parcourir |
| Moyenne | ColumnsView et commandes de l’éditeur | Deux colonnes proposées, bordures visibles en édition | Deux à quatre colonnes, espaces et proportions, repli responsive | Organiser sans afficher une grille technique |
| Moyenne | CSS des contenus | Rayons et espaces variables entre composants | Rythme, survol et surfaces communs | Continuité entre édition et lecture |
| Moyenne | NodeViewContent Tiptap 3 | Wrapper intermédiaire incompatible avec une grille naïve | Wrapper en display:contents et nombre de colonnes explicite | Garder le même placement dans les deux rendus |

## Choix écartés

- Copier la navigation, le logo ou toute l’interface de Notion : la demande porte sur l’organisation et la qualité d’affichage ; les repères déjà adoptés dans Feuillet sont conservés.
- Supprimer les originaux après réduction : cela dégraderait le zoom et les exports.
- Forcer GD ou une conversion trop volumineuse : l’hébergement mutualisé doit rester utilisable avec repli sûr et mémoire limitée.
- Uniformiser tous les liens en cartes : les liens dans une phrase gardent leur rôle de lien texte et chaque sous-page peut rester épurée.

## Vérifications

Inspection du lecteur en thèmes clair, sombre et OLED. Pas de débordement horizontal à 320, 390 et 430 px. L’éditeur à 390 px empile les colonnes. Le navigateur a confirmé deux colonnes alignées, le passage à trois puis à deux sans disparition des titres, et la transformation d’un lien de sous-page en carte. Les miniatures affichées sont réellement servies en 640 px ; un paysage de test de 141 590 octets devient 1 250 octets en 320 px. Ce gain dépend du fichier et ne constitue pas une promesse pour toutes les images.

Les menus de bases de données, la navigation générale et les flux d’installation n’ont pas été redessinés dans cette version ; leurs styles et tests existants restent en place. Les notes de production ne servent pas de données de test.
