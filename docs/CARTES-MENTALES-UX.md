# Cartes mentales : analyse fonctionnelle et revue de l’interface

Préversion locale, non publiée sur GitHub. Périmètre : bloc de carte mentale, création, liens, dispositions et templates. React/Tiptap, SVG, CSS existante et jsPDF ; aucune nouvelle bibliothèque de rendu ni service externe.

## Parcours visé

| Intention | Geste | Résultat et retour arrière |
| --- | --- | --- |
| Ajouter une sous-idée, à n’importe quel niveau | « + » sous une bulle ou Tab depuis la bulle | Nouvelle idée rattachée, titre prêt à écrire ; Annuler disponible |
| Développer une idée sans ouvrir un formulaire | Double-clic sur le titre, ou Entrée sur la bulle | Saisie sur la carte ; Entrée valide, Maj+Entrée ajoute une ligne, Échap annule la saisie |
| Ajouter le contenu d’une bulle organique | Double-clic dans son contenu, ou Style & détails | Le titre et le contenu restent distincts et sont exportés en PDF |
| Créer une branche en un geste | Tirer la poignée ronde vers une zone vide | Nouvelle sous-idée au point de dépôt, prête à être nommée |
| Rattacher une idée existante | Tirer une branche sur une autre bulle | La cible devient une sous-idée ; un cycle est refusé sans modifier la carte |
| Relier deux idées sans les déplacer dans la hiérarchie | Mode Lien libre, puis tirer un trait ; Alt fonctionne aussi | Relation transversale colorée ; pas de changement de parent |
| Travailler au clavier | Poignée ronde activée au clavier, puis choisir la bulle cible | Même relation que le glisser-déposer ; Échap annule |
| Essayer un autre modèle | Style & disposition → choix illustré | Les textes, contenus et parents restent intacts ; positions mémorisées par disposition et disposition mémorisée par style |
| Explorer plusieurs niveaux | Boutons +/- à côté des idées, ou Tout déplier | Aucune suppression de données ; les cartes organiques montrent d’abord les branches principales |
| Retrouver une idée masquée | Recherche → résultat | Ses ancêtres sont dépliés et la vue est centrée dessus |
| Corriger un geste | Annuler / Rétablir dans la carte | Historique local de 40 étapes, saisies rapprochées regroupées ; l’historique de la page reste disponible |

## Trois styles issus des références

- **Branches colorées** : centre encadré, titres soulignés, courbes et couleurs par grande branche ; sans aplats derrière les idées secondaires. Le texte sans fond suit le thème clair/sombre.
- **Bulles organiques** : formes souples, bandeaux de titre contrastés, contenu séparé et flèches courbes. Le niveau principal sert de vue initiale ; les sous-idées sont toujours disponibles via le dépliage, la recherche et le « + ».
- **Carte classique** : centre ovale, premières branches en blocs colorés, sous-idées sur traits soulignés. Les niveaux supplémentaires conservent le même comportement de création.

Le style Cartes reste disponible. Les dispositions Rayonnante, Arborescence, Organigramme, Parcours, Équilibrée et Étoile sont distinctes du style graphique. Équilibrée répartit les branches de part et d’autre du centre ; Étoile répartit les sous-arbres dans des secteurs pour éviter que les enfants occupent exactement le même point.

## Revue complète des skills

Skills utilisés : Make Interfaces Feel Better, Redesign et le skill `design` installé localement. Ce dernier contient les principes de cohérence visuelle et le routage ; ses sous-skills distincts `ui-ux-pro-max`, `design-system` et `ui-styling` ne sont pas présents dans l’installation inspectée. Aucun recours à des API d’images ni à une nouvelle pile CSS.

| Catégorie | Éléments inspectés | Résultat |
| --- | --- | --- |
| Typographie | Bulles, saisie directe, contenus, titres, zoom | Séparation titre/contenu, lignes longues découpées, lecture adaptée aux surfaces pleines et transparentes |
| Surfaces | Formes SVG, panneau de styles, boutons contextuels, mode sombre | Trois styles réels ; panneau de styles flottant et inspecteur ouvert à droite par défaut, masquable uniquement avec son bouton dédié |
| Animations | Réorganisation rapide, positions, liens, cadrage, glissement | Interpolation interrompable de 360 ms ; pas de transition retardant un déplacement manuel ou une saisie |
| Icônes / états | +, poignées, cibles, sous-niveaux, focus clavier | Zones de 44 pixels pour les poignées même lorsque la carte est réduite, symboles plus petits que leurs zones actives |
| Performance | Transactions Tiptap, chargement public, historique | Le glissement de bulle est local ; une seule transaction est envoyée au dépôt. Pas de nouvelle dépendance d’animation |

| Sévérité | Emplacement | Avant | Après | Pourquoi |
| --- | --- | --- | --- | --- |
| HIGH | `frontend/src/mind-map-model.ts` | Parcours réécrivait les parents | Disposition pure, caches de positions et de styles | Essayer un modèle ne doit pas modifier la signification de la carte |
| HIGH | `frontend/src/MindMap.tsx` | Création principalement depuis les réglages | + sous les bulles, saisie directe, traits tirés vers une cible ou le fond | Proximité des actions et continuité de la création |
| HIGH | `frontend/src/MindMap.tsx` | Liaison essentiellement par formulaire | Aperçu du trait, cible indiquée, refus des cycles, mode Lien libre | Réduire la charge de configuration sans perdre la distinction entre parent et relation |
| HIGH | `frontend/src/MindMapNode.tsx` | Texte foncé sur fond transparent en mode sombre | Texte hérité du thème sur les branches sans fond | Maintenir le contraste et la lisibilité |
| MEDIUM | `frontend/src/MindMapNode.tsx`, `mind-map-geometry.ts` | Quatre dispositions proches avec une seule forme de bulle | Branches, organiques et classique avec géométries et contenus propres | Les références visuelles doivent changer le rendu, pas seulement les coordonnées |
| MEDIUM | `frontend/src/MindMap.tsx` | Panneau permanent et recadrage à chaque sélection | Panneau permanent à droite, bouton dédié pour le masquer et cadrage conservé | Garder le contexte de travail et l’espace de la carte |
| MEDIUM | `frontend/src/MindMap.tsx` | Réorganisation instantanée ou animations désynchronisées | Bulles, branches et caméra interpolées ensemble | Le mouvement doit expliquer l’organisation sans saut visuel |
| MEDIUM | `frontend/src/MindMap.tsx` | Un + à l’échelle de la carte, difficile à retrouver | + visible sous les bulles ; poignées à taille constante | Cibles accessibles quelle que soit l’échelle d’exploration |
| MEDIUM | `frontend/src/MindMap.tsx` | Transaction de page à chaque mouvement du pointeur | Aperçu local puis transaction au dépôt, annulable | Éviter du travail d’éditeur inutile pendant un geste fréquent |
| MEDIUM | `frontend/src/mind-map-model.ts` | Même origine pour plusieurs sous-idées dans les présentations rayonnantes | Secteurs pour les sous-arbres organiques et branches bilatérales | Rendre les différents niveaux repérables |

### Choix écartés

- Changer de police ou toute l’identité de Feuillet : hors du périmètre et incohérent avec les choix déjà validés.
- Ajouter un moteur de diagrammes ou une bibliothèque d’animation : les interactions nécessaires peuvent être faites avec le SVG et React déjà présents.
- Réorganiser toute la carte après chaque idée : ferait perdre le contexte et les placements manuels. Le recentrage reste explicite ; le zoom de saisie n’intervient que lorsque la vue est trop éloignée pour écrire.
- Tout afficher à toute échelle : les cartes détaillées ont besoin de zoom et de niveaux dépliables ; augmenter artificiellement les textes finit par les faire déborder des bulles.

## Vérification et limites

Compilation TypeScript/Vite. Tests frontend sur les allers-retours de modèles, la conservation des parents, textes et notes, les dispositions manuelles, les sous-idées à plusieurs niveaux et les vues repliées. Tests HTTP de sauvegarde/restauration, validation des références, cycles et positions mémorisées ; suite de sécurité.

Les essais navigateur portent sur une carte fictive séparée de la carte utilisée par l’utilisateur : création par +, double-clic, saisie et validation, trait déposé sur une idée, lien libre, trait déposé dans le vide, refus de cycle, Annuler/Rétablir, changement de styles, aperçus SVG et PDF.

Non vérifiés : confort tactile sur un appareil physique, mesure de fréquence d’images à 300 idées et lecture des animations à 10 % dans un panneau d’animation. Les tests à vitesse normale et les changements rapides vérifient le comportement fonctionnel ; ils ne constituent pas un benchmark matériel. Le mode de mouvements réduits est prévu dans le code et doit également être essayé sur les appareils de l’utilisateur.

Verdict : **Approve pour les essais locaux du parcours ordinateur**. Les dernières vérifications navigateur de `0.35.0-dev.7` sont consignées dans le guide de préversion : trois modèles, quatre niveaux de sous-idées, dépliage depuis la recherche, sauvegarde après rechargement, lecteur clair et exports PDF. Pas d’approbation de publication GitHub ; la préversion reste locale.


## Révision : création accompagnée et listes de sous-idées

À la demande de l’utilisateur, le panneau **Style & détails** reste désormais ouvert à droite par défaut. Le bouton de la barre supérieure sert uniquement à le masquer ou le réafficher. Sélectionner une autre idée, écrire par double-clic et ajouter une sous-idée ne le ferment plus. Sur petit écran il reste à droite, superposé au canevas, et le même bouton le masque.

Le choix **En dessous / Au-dessus / Modèle** appartient à chaque idée. Les deux premiers créent des lignes indépendantes, empilées avec un trait commun. **Ajouter plusieurs idées…** accepte une idée par ligne et crée tout le groupe en une opération annulable. L’ajout place uniquement les nouvelles lignes, en cherchant un espace libre du côté choisi. Il ne déplace ni ne reformate les enfants existants ou les branches voisines. Les commandes explicites de placement et de redistribution restent disponibles pour réorganiser le groupe. Les relations ne changent pas. Le recadrage après une création par lot vise le groupe modifié ; Recentrer affiche toujours la carte entière.

Le clic droit appartient à la carte, en plein écran comme dans l’éditeur : écrire, ajouter dessous/dessus, ajouter au même niveau, relier, déplier/replier, supprimer en conservant les enfants. Maj+F10 l’ouvre au clavier, les flèches naviguent, Échap ferme. Les zones de saisie conservent leur menu natif.

La saisie directe a une surface et une couleur issues du thème, indépendantes de la couleur personnalisée de la bulle. Sa surface fait au moins 220 × 100 pixels affichés pour éviter de tronquer les premières lignes à faible zoom. La sélection de texte a un fond bleu et un texte blanc explicites.

Les idées et leurs branches partagent une progression d’apparition/retrait de 360 ms. Les éléments fermés restent montés jusqu’à la fin du retrait ; une réouverture reprend à la progression courante. La création de liens libres s’estompe à l’entrée ; un rattachement trace sa nouvelle branche. Les déplacements de mise en page restent interpolés séparément, et la saisie ne déclenche pas de pulsation par caractère. Les mouvements réduits désactivent ces effets.

| Sévérité | Emplacement | Avant | Après | Motif |
| --- | --- | --- | --- | --- |
| HIGH | `MindMap.tsx`, `mind-map.css` | Texte de saisie foncé sur le canevas sombre | Surface de saisie et sélection adaptées au thème | Lire et corriger sans perdre le texte au double-clic |
| HIGH | `mind-map-model.ts` | Enfants disposés latéralement ; collisions possibles | Lignes au-dessus/dessous, sous-arbres rangés et espace libéré | Développer une idée à tous les niveaux sans recouvrir une autre branche |
| MEDIUM | `MindMap.tsx` | Inspecteur fermé pendant la saisie | Inspecteur stable à droite et bouton unique | Garder les réglages accessibles |
| MEDIUM | `MindMap.tsx` | Menu général du bloc Feuillet | Menu propre à la carte et commandes clavier | Proposer l’action au bon endroit |
| MEDIUM | `mind-map-motion.ts` | Sous-niveaux retirés immédiatement | Présence interpolée et retrait différé, réversible | Comprendre le dépliage sans flash |

Les tests frontend couvrent l’ordre des lignes, les deux côtés, les sous-groupes, le retour au modèle, les collisions, l’absence de mutation de la source et la limite de 300 idées. Un test HTTP supplémentaire vérifie la persistance et refuse les placements non reconnus. Le plafond reste 300 idées par carte ; il n’a pas été remplacé par une promesse de quantité illimitée.

## Révision de l’interopérabilité et de la navigation

Le cas réel du dernier onglet a montré que partager le même cache de positions entre styles, puis appliquer à nouveau le rangement des lignes, empilait les corrections et réutilisait des dimensions inadaptées. La révision `0.35.0-dev.20` utilise un calcul hiérarchique de sous-arbres mesurés et un cache propre à chaque couple style/disposition avec une empreinte de la structure. Redistribuer repart d’un calcul complet et efface ces caches de placements.

Le montage différé d’une idée pouvait aussi faire passer la tentative de focus avant l’existence du textarea. Le focus est désormais appliqué par une référence stable au montage du champ. Une idée en cours de saisie ne subit pas l’animation d’arrivée ni une interpolation de sa position. Le zoom autour du pointeur conserve les coordonnées du point visé.

Les sections importées sont consultables dans une vue de lecture en grand avec navigation entre niveaux et sections. Les fenêtres ont un ordre de tabulation contenu et Échap revient à la carte. Les nouveaux contrôles reprennent les surfaces, couleurs et mouvements de Feuillet ; aucune dépendance de rendu ou d’import externe n’a été ajoutée. Les limites d’import et le caractère indépendant de la copie partagée sont visibles dans le produit et détaillés dans le guide d’import.

## Choix spatial et recherche : révision 29

Le choix du centre utilise le canevas au lieu d’une liste de titres : il conserve le contexte spatial et évite de masquer la carte. Le marqueur de cible est une indication visuelle, pas une réorganisation au survol ; une seule action annulable est enregistrée au clic. L’annulation n’enregistre aucune modification. Le mode propose aussi un parcours clavier.

Revue ciblée : typographie (instructions et compteur courts), surfaces (champ de recherche, réglages et boutons intégrés), animations (focus, cible et arrivée des résultats ; sans variation de largeur de la recherche), icônes (Search/X/ArrowUpRight du jeu déjà utilisé par Feuillet), performance (pas de nouveau calcul de disposition au survol, ni de bibliothèque ajoutée). L’animation du bandeau de choix porte sur l’opacité pour éviter de remplacer sa transformation de centrage pendant l’arrivée.


## Révision locale : création sans effet de bord et sélection multiple

Le petit **+** ouvre un menu animé ancré à la bulle : **Idée indépendante** ou **Sous-idée liée**. Le parent, ses enfants existants, leurs coordonnées et leurs styles sont conservés. Une nouvelle idée ne reprend pas les contenus ou les médias du parent. La saisie et les changements de style ne redistribuent plus automatiquement le groupe.

**Maj + clic** ajoute ou retire des bulles à la sélection. Le panneau droit conserve sa place et présente les actions du groupe. Glisser une bulle sélectionnée déplace le groupe en conservant les espacements internes. **Suppr / Delete / Del**, ainsi que **Retour arrière** sur la carte, suppriment uniquement la sélection ; les enfants non sélectionnés sont rattachés au premier ancêtre conservé. Vider la carte laisse une idée vierge. **Ctrl / Cmd + Z** annule.

**Ctrl / Cmd + C et V**, le clic droit et les boutons du panneau copient et collent la sélection. Les copies ont de nouveaux identifiants, des métadonnées recréées et des liens internes remappés. Une parenté vers une idée extérieure à la sélection est retirée dans la copie. Le collage conserve la géométrie du groupe et cherche un emplacement libre sans déplacer les idées existantes. Le presse-papiers système permet le passage d’une page à l’autre ; le stockage en mémoire sert de repli aux menus lorsque le navigateur interdit son accès. Les champs de texte gardent leurs raccourcis habituels.

Le gestionnaire global de copie des blocs de la page ignore la carte mentale : copier des bulles ne copie jamais l’atome Tiptap entier. Les données collées sont contrôlées (format, tailles, champs, cycles et références) avant insertion, avec la limite totale de 300 idées.

Validation : build TypeScript/Vite, suite frontend, tests navigateur de création liée/libre, Maj + clic, Cmd/Ctrl C-V, clic droit, Suppr, Retour arrière, annulation, déplacement groupé et copie vers une autre page. Contrôle HTTP des sauvegardes : une seule carte dans le document et géométrie/style des bulles originales conservés. Modification d’une copie dans la seconde page sans modification de la première. Préversion uniquement locale.
