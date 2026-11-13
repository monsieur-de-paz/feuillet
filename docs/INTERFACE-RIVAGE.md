# Rivage — charte graphique de Feuillet 0.31

Exploration commencée le 13 novembre 2026 sur `design/rivage-local`, à partir de Feuillet 0.30.0 (`3a45ae6`), puis validée par Sandro pour la version **0.31.0**. Cette charte conserve les décisions des essais locaux.

## Intention

Une interface calme, tactile et éditoriale : la navigation accompagne le document, les commandes prennent moins de place, les objets partagent les mêmes proportions. L’accueil utilise Fraunces pour ses grandes entrées ; les documents conservent la police et les couleurs choisies par leur auteur.

- Fond légèrement chaud, feuille de travail continue, contours fins plutôt que grosses ombres.
- Accueil avec une carte principale et des cartes secondaires ; les deux actions de création et d’import ont une largeur commune.
- Carnets et catégories sélectionnés toujours soulignés, sans coche ajoutée.
- Onglets discrets au-dessus du fil d’Ariane, outils flottants, menus plus espacés.
- Fenêtres arrondies, réglages à dimensions stables avec navigation illustrée, bibliothèque par dossiers.
- Même vocabulaire graphique en édition et en lecture, avec adaptations clair, sombre et noir OLED.
- Galeries sans fond coloré ; les cartes restent des objets distincts.

## Matières et couleurs

Trois textures originales générées par code, sans dépendance ou service externe :

| Surface | Texture | Intensité maximale |
| --- | --- | --- |
| Fond latéral et navigation | `public/textures/rivage-floor.png` | alpha 9/255 |
| Cartes, menus et fenêtres | `public/textures/rivage-paper.png` | alpha 5/255 |
| Pages visitées et éditeur (papier ivoire) | `public/textures/rivage-canvas.png` | alpha 18/255 |
| Boutons d’action | même grain fin, à une échelle plus serrée | alpha 5/255 |

Les trois petites images répétées pèsent environ **40 Ko au total**. Le grain est immobile : aucun filtre de turbulence exécuté en continu, aucun calque bloquant le pointeur, aucune animation du bruit. Les photos ne sont pas texturées. Le fond OLED reste noir pur ; les surfaces de contenu peuvent garder leur grain fin. Les textures sont désactivées à l’impression.

L’accent personnel de Feuillet continue à piloter les actions et sélections. Les titres par défaut utilisent la couleur de texte adaptée au thème ; cette exploration ne réécrit pas les couleurs explicites des documents.

## Mouvement

| Interaction | Durée indicative | Principe |
| --- | --- | --- |
| Survol et pression | 180–350 ms | teinte, contour, déplacement très court |
| Ouverture d’un menu | 320 ms | translation de 5 px et échelle 0,98 → 1 |
| Fenêtre | 420 ms | translation de 12 px et échelle 0,975 → 1 |
| Changement de sélection | 440 ms | une surface glisse et change de largeur |
| Entrée de page | 520 ms | quelques éléments se posent sur 10 px |
| Ajout et réorganisation de blocs | 340 ms | déplacement des éléments visibles |

Courbe commune : `cubic-bezier(.22,1,.36,1)`. Pas de voile blanc ni d’effacement de la page pendant la transition. La frappe, Entrée, Retour arrière, Suppression et les compositions de texte n’animent pas le document : scinder ou fusionner un paragraphe ou un élément de liste reste immédiat. Écrire interrompt aussi une éventuelle animation d’arrivée de page encore en cours. Un geste de souris réactive les transitions des actions volontaires sur les blocs. Les outils fixes ne sont pas inclus dans une transformation de leur ancêtre. Les mesures des sélecteurs sont regroupées avant les écritures, bornées à 16 groupes et déclenchées à la demande ; aucune boucle de rendu permanente.

`prefers-reduced-motion` coupe les mouvements ; changer cette préférence annule les animations JavaScript en cours. Les observateurs se déconnectent à la fermeture et reprennent lors d’un retour depuis le cache de navigation du navigateur.

## Organisation des fichiers

- `public/rivage.css` : couche visuelle commune, chargée après les styles existants.
- `public/atelier.js` : mouvements de présentation et sélections qui se transforment ; aucune requête réseau ou écriture de document.
- `frontend/src/AdminHome.tsx`, `SettingsWorkspace.tsx`, `LibraryNavigator.tsx` : structure de l’accueil, icônes des réglages et libellés de bibliothèque.
- `frontend/src/block-motion.ts` : mouvement des blocs de l’éditeur.
- `public/index.php`, `public/offline.html`, `public/sw.js` : chargement des styles et disponibilité des textures hors connexion.
- `tools/preview-rivage.py` : environnement local isolé et persistant.
- `tests/rivage-motion.mjs` et `tests/frontend/block-motion.ts` : garde-fous de mouvement, rédaction et cycle de vie.

Aucune migration de données, modification de permissions publiques ou nouvelle dépendance n’est nécessaire. Les correctifs de navigation et de cache de la version de départ sont conservés.

## Tester et reprendre le prototype

Depuis la racine du dépôt :

```sh
npm --prefix frontend run build
python3 tools/preview-rivage.py
```

Le serveur utilise uniquement `127.0.0.1`, sur le port 8766 ou le prochain port libre. L’adresse choisie est affichée dans le terminal. Le navigateur intégré est connecté au compte administrateur de démonstration.

La configuration, le compte local et les notes de test sont dans **`.private/rivage/`**, ignoré par Git et situé hors de `public/`. Le script ne réinitialise pas un environnement déjà créé : les essais de l’utilisateur sont conservés. Les identifiants se trouvent uniquement dans le fichier privé `access.json`. Les tests d’intégration excluent aussi `.private` de leurs copies temporaires. Ne jamais envoyer ces fichiers dans une archive de distribution.

L’environnement utilise du contenu fictif : carnets, pages publiques et privées, couvertures originales, galerie, tableau de données et PDF de démonstration. Le site OVH et ses données ne sont pas modifiés.

## Vérifications réalisées

- Compilation TypeScript/Vite et contrôles de syntaxe JavaScript/PHP.
- Suite frontend : édition, déplacement et copie de blocs, tables, onglets, thèmes, galeries, médias et formulaires.
- Tests d’intégration : éditeur (9), lecteur (8), partage et périmètres publics (17).
- Contrôles PWA et navigation : délais bornés, reprise, révocation, cache indisponible et retour hors connexion.
- Test de mouvement : entrée bornée, frappe stable, regroupement des mesures, géométrie avec défilement, outils fixes, réduction des mouvements et cycle BFCache.
- Navigateur intégré : accueil clair/sombre, éditeur, sélection et gras avec sauvegarde, bibliothèque, réglages et changement d’onglet, outil de cadrage et zoom 105 % puis annulation, insertion de blocs, navigation publique et aperçu PDF rendu.
- Formats contrôlés : ordinateur, tablette 800 px, téléphone 390 et 320 px. Aucun débordement horizontal observé aux formats vérifiés ; la marge tablette suit bien la largeur de la navigation. Vérification du fond OLED noir pur.

Ces contrôles portent sur ce prototype local. La direction esthétique est validée par l’utilisateur. Un essai sur téléphones physiques reste utile pour les comportements propres à chaque système.

## Ajustement après essai — grain et stabilité de l’écriture

La feuille claire utilise désormais un fond clair `#FBFBFB`, avec une texture plus présente que celle des cartes. Le papier clair du prototype est fixé à `#FBFBFB`, selon le dernier choix de l’utilisateur. Le thème sombre conserve sa surface sombre et un grain plus fin. L’ancienne déclaration `background` en ligne du lecteur effaçait les images de fond : seules la couleur et l’image de fond du papier la surchargent maintenant explicitement, sans toucher aux couleurs et polices des textes.

Le mouvement de blocs distingue les événements de rédaction des gestes de souris. Les événements clavier, saisie native et composition sont observés sans être consommés ; ils annulent les déplacements visuels et gardent la disposition immédiate. Les écouteurs sont retirés à la destruction de l’éditeur. Les tests utilisent de vrais documents et commandes ProseMirror pour scinder/fusionner des paragraphes et des listes à puces ; les déplacements à la souris restent animés.

L’essai intégré de cet ajustement a été réalisé dans une page privée distincte, « Écrire au calme », pour préserver les notes de l’utilisateur : Entrée après un paragraphe, création de puces, Entrée entre deux éléments et Retour arrière fusionnant deux puces. L’écriture interrompt aussi les transitions d’arrivée de page. Le papier du lecteur et de l’éditeur a été vérifié par son style effectif et une capture. La compilation, la suite frontend (dont le nouveau test de rédaction), les garde-fous Rivage et les tests PWA/navigation passent. Validation locale réalisée avant publication de la version 0.31.0.

Dernier ajustement visuel : fond de feuille `#FBFBFB` en édition et en lecture. La tuile de grain de 128 pixels est affichée sur 64 pixels (48 pixels pour les boutons) pour obtenir un grain plus fin. Les variantes sombres et OLED sont conservées.
