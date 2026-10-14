# Audit des menus et des éléments sélectionnés — Feuillet 0.5.1

Audit du 14 octobre 2026, mode **full**. Le périmètre couvre les boîtes de dialogue de l’administration, les catégories, le sélecteur d’icônes, la bibliothèque, les menus de mise en forme, les menus de propriétés des bases, les réglages de galerie et les états de sélection des blocs et champs de titre/description de l’éditeur. React 19 et Tiptap utilisent les feuilles CSS existantes ; aucune bibliothèque de style ou d’animation supplémentaire n’est introduite.

Les comportements d’enregistrement, les autorisations et les contenus des carnets ne sont pas modifiés par ces corrections CSS. Le lecteur public charge la même feuille de langage visuel, mais n’expose pas les contrôles de l’administration.

## Sources et méthode

Les principes appliqués proviennent de [Make Interfaces Feel Better](https://github.com/jakubkrehel/make-interfaces-feel-better/tree/35545ea1512ad59fa463e6b1f95ca9c052981fe6/skills/make-interfaces-feel-better) — compétence principale et ses cinq guides — et de [Taste Redesign](https://github.com/Leonxlnx/taste-skill/tree/a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9/skills/redesign-skill). Les recommandations sont adaptées à la [charte de Feuillet](CHARTE-GRAPHIQUE.md).

La capture fournie montre un contenu de catégories collé aux bords du dialogue et des actions de hauteurs variables. La lecture du DOM dans `App.tsx` révèle deux causes : les modales sont des sœurs de `.app-shell`, alors que plusieurs règles de 0.5 ciblaient ses descendantes ; `CategoriesEditor` et `IconPicker` ne possédaient pas le corps `.modal-form` qui apportait une marge aux autres fenêtres.

| Catégorie | Éléments réellement inspectés | Résultat |
| --- | --- | --- |
| Typographie | Titres, paragraphes et champs de catégories ; styles des modales, bibliothèques et menus ; capture utilisateur | Titres de dialogue équilibrés, texte long pouvant revenir à la ligne ; polices existantes conservées |
| Surfaces | `App.tsx`, `Customization.tsx`, `IconPicker.tsx`, `nodes.tsx` ; `style.css`, `app-v3.css`, `editor-v2.css`, `database.css`, `IconPicker.css`, `interface.css` | Gouttières, grilles, rayons et cibles homogénéisés |
| Animations | Focus de l’éditeur, sélection Tiptap et ressources, image redimensionnable, transition des boutons, bloc reduced motion | Indication d’édition de 120 ms et transitions des contrôles de 130 ms ; pas de séquence à chaque frappe |
| Icônes | Actions haut/bas/suppression des catégories, fermeture des dialogues, bibliothèque et ordre des galeries | Centrage en carrés de 40 px sur ordinateur et 44 px sur mobile, sans changer de bibliothèque |
| Performance | Dépendances, propriétés animées et sélecteurs CSS | Aucune dépendance ; propriétés explicites ; aucun `transition: all`, `will-change` ou keyframe ajouté |

## Constats et corrections

### Surfaces, rythme et alignement

| Sévérité | Emplacement | Avant | Après | Pourquoi |
| --- | --- | --- | --- | --- |
| MEDIUM | `frontend/src/interface.css:243`, `:669` ; `frontend/src/App.tsx:2600` ; `frontend/src/Customization.tsx:210` | Règles `.app-shell .modal` inopérantes ; catégories et icônes sans gouttière | Règles à la racine réelle du dialogue ; corps commun aux formulaires, catégories, icônes, fichiers, historiques et listes de pages ; gouttière 24 px sur ordinateur / 16 px sur mobile | Une surface partagée doit conserver son rythme quel que soit son contenu |
| MEDIUM | `frontend/src/interface.css:735`, `:900` | Ligne flex sans taille d’action fixe, champ comprimé sur petit écran | Grille champ + trois actions 40 px ; champ sur une ligne entière et actions 44 px sous 480 px ; ajout de catégorie séparé sur mobile | Cibles sans collision, actions symétriques et nom de catégorie lisible |
| MEDIUM | `frontend/src/interface.css:658`, `:687`, `:717` | Fermeture, insertion et actions de bibliothèque héritaient de tailles différentes | Fermeture et actions d’icône carrées ; commandes avec texte à hauteur commune ; boutons de bas de dialogue pouvant se répartir sur plusieurs lignes | Aligner les actions et préserver leur utilité tactile |
| MEDIUM | `frontend/src/interface.css:700`, `:710`, `:918` | Titres et bibliothèques longues pouvaient comprimer les actions | Champs flexibles, textes longs pouvant revenir à la ligne ; ressource et actions sur deux lignes sur petit écran | La largeur disponible doit servir à lire le nom et à agir |
| MEDIUM | `frontend/src/interface.css:796`, `:809`, `:812` | Menus de commande, propriétés et formatage avec plusieurs espacements et hauteurs | Conteneurs à 5 px, options à 9 × 10 px, hauteur minimale partagée ; onglets de recherche d’images pouvant se répartir sur plusieurs lignes | Rayon extérieur 12 px = option 7 px + gouttière 5 px ; rythme stable entre menus |
| MEDIUM | `frontend/src/interface.css:821`, `:831`, `:896`, `:924` | Actions d’ordre des galeries de 25 px ; quatre réglages sur une ligne ; titre comprimé | Actions carrées ; réglages sur deux colonnes sur mobile ; titre et ajout séparés sous 480 px | Conserver les commandes de galerie sans zones minuscules ni débordement |

### Sélection, focus et mouvement

| Sévérité | Emplacement | Avant | Après | Pourquoi |
| --- | --- | --- | --- | --- |
| MEDIUM | `frontend/src/interface.css:841` ; `frontend/src/style.css:973`, `frontend/src/database.css:1805` | Cadre natif du contenteditable et outline dur autour des blocs sélectionnés | Pas de cadre autour de l’éditeur ni du bloc ; fond d’accent doux persistant sur la ressource sélectionnée, transition de 120 ms ; image accompagnée d’une ombre légère et de ses poignées | Montrer l’élément édité sans déplacer sa géométrie ni entourer toute la page |
| MEDIUM | `frontend/src/interface.css:27`, `:696`, `:838`, `:864`, `:867` | Focus des dialogues non couvert par la règle partagée ; palette active en couleur d’encre | Focus clavier d’accent conservé sur liens, champs, boutons, poignées et palettes ; panneau de ressource au bord d’accent doux | Retirer le cadre décoratif ne doit pas supprimer l’indication de navigation au clavier |
| MEDIUM | `frontend/src/interface.css` ; `frontend/src/style.css:697` | Le focus partagé réintroduisait un cadre d’accent autour du titre et de la description, notamment quand l’accent était gris | Exception ciblée sur les deux champs du canevas : outline et ombre supprimés, fond d’accent de 5 % en 120 ms, caret conservé | Le titre fait partie de la page ; son focus reste visible sans boîte autour du contenu |
| LOW | `frontend/src/interface.css:55`, `:852`, `:997` | Transitions des boutons limitées à la structure principale ; dialogues hors périmètre reduced motion local | Transitions de couleur/ombre étendues aux dialogues et surfaces flottantes ; neutralisation dans reduced motion | Mouvement cohérent, bref et interruptible, avec indication statique conservée |

## Pistes examinées et rejetées

| Emplacement | Proposition | Raison du rejet |
| --- | --- | --- |
| Blocs de l’éditeur | Faire rebondir ou agrandir chaque bloc à sa sélection | La sélection se répète fréquemment ; le déplacement fatiguerait et pourrait perturber l’édition |
| Contrôles au clavier | Supprimer tous les outlines du site | Le focus clavier serait perdu ; seul le cadre du contenteditable et des blocs est remplacé |
| Menus et galeries | Uniformiser la largeur de tous les boutons ou déséquilibrer volontairement la grille | Les commandes portant du texte ont des longueurs distinctes ; l’utilisateur demande des actions symétriques, une grille configurable et une interface de travail |
| Thèmes et icônes | Remplacer Lucide, les polices personnalisées et le noir OLED pour appliquer toutes les préférences génériques de Taste | Ces choix appartiennent déjà au produit et aux préférences de l’utilisateur ; ce correctif traite les proportions et les états |

## Vérification et limites

Vérifications statiques exécutées :

- `node …/prettier/bin/prettier.cjs --write frontend/src/interface.css` puis `--check` : formatage conforme.
- `git diff --check -- frontend/src/interface.css` : aucune erreur d’espacement.
- `rg -n 'transition: all|will-change|@keyframes' frontend/src/interface.css` : aucun résultat.
- Lecture de l’emplacement réel des modales dans `App.tsx` et des classes de blocs dans `nodes.tsx` : sélecteurs corrigés à leurs racines.

## Vérification après intégration

- Compilation TypeScript/Vite et Prettier réussis ; syntaxe des 19 fichiers PHP valide. Tests frontend : 58 cas et contraste/parité PHP-JavaScript sur 24 accents réussis.
- Dialogue de catégories réellement ouvert dans Chromium intégré à 945 px : corps avec padding `22px 24px 26px`, trois actions identiques de 40 × 40 px ; fermeture, ajout désactivé et navigation de catégories visibles.
- À 320 × 740 : dialogue 292 px de large, padding `18px 16px 22px`, champ sur sa ligne et actions de 44 × 44 px. À 390 × 844 : actions 44 px. `scrollWidth === innerWidth` aux deux tailles.
- Bibliothèque et sélecteur d’icônes ouverts : même gouttière 24 px sur ordinateur, pas de débordement horizontal. Panneau de présentation de fichier ouvert et fermé sans modifier le document.
- Titre et description focalisés après le signalement de la capture : outline `none`, bordure `0px`, ombre `none`, transition `0.12s`, fond d’accent à 5 %. En OLED, titre sans cadre avec texte `rgb(243,244,246)` ; préférence Clair restaurée.
- Sélection d’un fichier : `.ProseMirror-selectednode` et `.resource-selected` sans outline, fond d’accent doux ; éditeur sans cadre natif. Clic droit sur image : image sélectionnée, poignées et ombre d’accent, menu à l’intérieur du viewport. Escape depuis une option referme le menu.
- Mouvement observé à 10 % en portant temporairement à 1,2 s les transitions de sélection de la **copie de prévisualisation uniquement**, puis en rechargeant l’onglet de démonstration. Le fond part de la surface et rejoint l’accent léger sans mouvement géométrique ; changer de bloc retire la sélection. La feuille normale 120 ms a été restaurée. Cette méthode ne passe pas par le panneau Animations du navigateur.
- OLED : dialogue noir, texte `rgb(243,244,246)`, commandes 40 px et focus d’accent. Préférence personnelle Clair restaurée à la fin.
- Navigation publique : galerie → Première ressource → lien de racine conservant `root` dans l’URL. Le fil d’Ariane n’a aucun accueil général ni parent extérieur. À 320 px, sa page et son en-tête ne débordent pas.
- Les huit suites HTTP passent sur SQLite et MySQL : **92 réussites et un scénario réseau ignoré par pilote**. Ces tests incluent conservation des carnets, racines privées/falsifiées, branches extérieures filtrées et sauvegardes anciennes. Voir [TESTS](TESTS.md).

**Verdict : Approve pour le périmètre vérifié.** Non vérifiés : Safari/iOS, Firefox, lecteur d’écran, clavier virtuel réel, préférence OS reduced motion (règles CSS inspectées), contrastes exhaustifs de chaque combinaison et installation OVH réelle. Les galeries et tous les menus spécialisés n’ont pas chacun été parcourus à toutes les tailles dans ce correctif ; les feuilles et leurs contrôles partagés ont été examinés, les parcours centraux ci-dessus ont été testés.
