# Charte graphique et interactions de Feuillet

Version 0.5.0, 14 octobre 2026. Cette charte concerne l’éditeur, sa navigation, ses réglages, les bases et la lecture publique. Feuillet est un carnet : les notes occupent le premier plan ; les outils restent proches du contenu. La référence est l’édition documentaire de Notion, avec une interface propre à Feuillet.

## Principes

Une page reste un document, sans décoration imposée sur les textes de l’auteur. Une seule couleur d’accent guide les actions ; les couleurs des états, emoji et images restent des informations choisies par l’auteur. La même page garde sa composition en édition et en lecture. Une interface lisible doit aussi fonctionner au clavier et au toucher.

La modernité vient de détails cohérents : alignements, espacements, retours de sélection, menus qui restent dans l’écran, cibles utilisables et sauvegarde discrète. Pas de défilement détourné, de mouvements continus ou de dépendance externe pour une animation.

## Couleurs et surfaces

| Jeton | Clair | Sombre | OLED | Usage |
|---|---|---|---|---|
| `--surface` | `#FFFFFF` | `#17191D` | `#000000` | Menus et surfaces |
| `--surface-muted` | `#F7F7F5` | `#202329` | `#080808` | Navigation, fonds secondaires |
| `--surface-soft` | `#EEEFED` | `#2A2E35` | `#121212` | Survols et surfaces imbriquées |
| `--line` | `#E4E5E2` | `#373A42` | `#373A42` | Séparation structurelle |
| `--muted` | `#6F716D` | `#AFB3BD` | `#AFB3BD` | Légendes et aides |
| `--danger` | `#B83D32` | `#F28E83` | `#F28E83` | Actions de retrait |
| `--accent` | Choix de l’auteur | Variante calculée | Variante calculée | Focus, sélection, boutons |

Le fond et le texte du document restent personnalisables. Les variantes de l’accent conservent la teinte et adaptent sa luminosité aux surfaces sombres, y compris au fond de sélection. Une couleur de texte explicite reste explicite ; « Défaut » hérite du thème. Ces règles ne garantissent pas le contraste de toute combinaison de couleurs créée manuellement.

Les menus sont surélevés ; les tableaux et la navigation utilisent des bordures structurelles. Les documents ne reçoivent pas de grandes ombres. Les images du contenu ont une séparation neutre et discrète, noire en clair, blanche en sombre.

## Typographie et rythme

La police sans empattements utilise les fontes système, avec repli `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif. Aucun chargement externe. Quicksand, Fraunces, Georgia et monospace restent disponibles. La police choisie dans le carnet ou la page reste respectée.

Les titres ont un interlettrage légèrement resserré et un retour à la ligne équilibré. Les légendes sont moins présentes, mais restent lisibles. Les nombres des tableaux et indicateurs utilisent des chiffres tabulaires. Le texte libre n’est jamais tronqué pour respecter un modèle de vitrine.

L’unité d’espacement est 4 px : 4, 8, 12, 16, 24. Les contrôles ont un rayon de 7 px, les panneaux et menus de 12 px, les dialogues de 16 px. Les options des menus ont un rayon de 7 px, entourées de 5 px : leur rayon extérieur est concentrique.

## Navigation

La barre latérale réserve son espace principal aux pages. La liste des espaces a une hauteur limitée et son propre défilement. Les filtres défilent horizontalement si nécessaire. Les utilitaires principaux restent visibles : Bibliothèque, Bases de données, Réglages & sauvegardes. **Plus d’outils** contient Accueil visiteur, Corbeille et Déconnexion.

La page active est distinguée par son fond, son texte et un repère de couleur. Chaque ligne propose un bouton d’actions, visible au survol, au focus et en permanence sur mobile. Le masquage complet par raccourci ou bouton reste disponible ; sur mobile, la navigation reste un tiroir.

## Sélecteurs

Les listes simples de l’application React utilisent `Select.tsx`. Le contrôle fermé affiche la valeur et un chevron. La liste marque le choix courant avec une coche. Plus de six options : un champ de recherche filtre les libellés sans tenir compte des accents. Les états colorés ont un point de couleur dans leur sélecteur.

Entrée ou Espace ouvre ; ↑/↓ parcourt ; Début/Fin rejoint une extrémité ; Entrée valide ; Échap ferme et restitue le focus. Tab conserve le parcours normal du formulaire. Les options désactivées sont exclues de la navigation. Les longues options peuvent revenir à la ligne dans la liste.

Le `<select>` natif reste présent pour la valeur du formulaire, les événements React et la validation des champs obligatoires. Il est retiré du parcours visuel et du clavier. Un champ obligatoire vide indique une erreur au niveau du contrôle visible. L’installation PHP conserve ses contrôles natifs.

## Menus contextuels

Le clic droit dans l’interface d’administration ouvre des actions selon la cible : page, couverture, carnet, texte/bloc ou propriété de base. Sur une cellule de base, il ouvre directement l’édition de sa valeur. Les boutons ⋯ et la poignée de bloc donnent accès aux mêmes actions sans clic droit ; les propriétés conservent leur bouton de menu.

**Maj + F10** ou la touche Menu ouvre les actions depuis un contrôle de navigation ou l’éditeur. ↑/↓, Début/Fin, Entrée et Échap fonctionnent dans les menus. Les menus ont un nom accessible, des groupes séparés et des actions dangereuses identifiables par leur libellé et leur couleur. Les actions de publication ouvrent la fenêtre de publication ; le clic droit ne publie pas une page à lui seul.

Les champs de saisie gardent leur menu natif pour couper, coller et corriger l’orthographe. **Maj + clic droit** conserve le menu du navigateur ailleurs. Les visiteurs gardent le menu natif : les commandes de modification ne sont accessibles qu’à l’administrateur. Les blocs imbriqués sont organisés par leur bloc supérieur pour monter, descendre, dupliquer ou supprimer.

Les menus utilisent le top layer de l’API Popover, en conservant le thème de leur contexte. Les menus de propriétés des blocs Tiptap sont portés dans le panneau de page, hors du DOM éditable, pour éviter que l’éditeur reprenne le focus. Leur position s’adapte au viewport et au clavier virtuel. Ils s’ouvrent au-dessus du contrôle si l’espace manque en dessous. Les vieux navigateurs dépourvus de Popover disposent d’un repli fixe ; celui-ci peut être limité par les conteneurs du site.

## Mouvement et accessibilité

Les transitions de couleurs durent environ 130 ms ; le changement de symbole de thème environ 150 ms. Les boutons ponctuels ont un retour de pression de `scale(.96)`. Les options, frappes et lignes n’ont pas d’animation d’entrée répétée. Les propriétés animées sont explicites ; aucun `transition: all` ajouté.

`prefers-reduced-motion` supprime ces animations et le déplacement au clic. Les boutons principaux et menus visent 40 px sur ordinateur et 44 px sur mobile. Certains outils denses du texte et commandes secondaires restent plus petits : leur usage au toucher doit continuer d’être surveillé lors des prochaines évolutions. Les focus sont visibles et les menus rendent le focus à leur déclencheur.

La barre de sélection recalcule sa position après un défilement ou un changement de focus. Elle évite la barre d’outils fixe. Une sélection n’est pas perdue lorsque le menu contextuel s’ouvre.

## Sources et adaptations

Skills lus intégralement pour cette évolution, dans des copies de travail séparées ; aucun script d’installation de ces dépôts exécuté, aucune dépendance runtime ajoutée :

- [Make Interfaces Feel Better](https://github.com/jakubkrehel/make-interfaces-feel-better/blob/35545ea1512ad59fa463e6b1f95ca9c052981fe6/skills/make-interfaces-feel-better/SKILL.md), révision `35545ea` : typographie, surfaces, animations, icônes et performance, ainsi que ses cinq guides associés.
- [Taste Skill — Redesign](https://github.com/Leonxlnx/taste-skill/blob/a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9/skills/redesign-skill/SKILL.md), révision `a60a36d` : audit de l’existant et améliorations ciblées.
- [Taste Skill — Minimalist UI](https://github.com/Leonxlnx/taste-skill/blob/a60a36dc2bb3bb77ccf17f2f62041f5ca8a458b9/skills/minimalist-skill/SKILL.md) : hiérarchie documentaire, retenue des surfaces et du mouvement.

Le brief Feuillet prime sur leurs prescriptions génériques : le noir OLED, les emoji, les polices choisies, Lucide déjà intégré et les galeries à colonnes configurables sont conservés. Les propositions de textures, effets cinématiques, fontes nouvelles ou grille asymétrique imposée ne conviennent pas à un carnet de notes. La fonte système évite d’ajouter une dépendance pour une simple finition.

Implémentation : `frontend/src/interface.css`, `Select.tsx`, `FloatingSurface.tsx`, `ContextMenu.tsx`, `interface-geometry.ts`. Le CSS commun est copié dans `public/interface.css` pendant la compilation. [Audit et validation](AUDIT-INTERFACE-0.5.md), [guide des nouveautés](NOUVEAUTES-0.5.md).

## Ajustements 0.5.1

Les modales sont des sœurs de `.app-shell` : leurs règles sont globales, leurs corps partagent une gouttière de 24 px sur ordinateur et 16 px sur mobile. Les actions sans texte ont une taille commune 40/44 px. Les noms de catégories restent sur une ligne entière lorsque les commandes doivent se répartir dessous. La sélection d’une ressource n’altère pas sa taille : elle montre un fond d’accent de 120 ms et, pour les images, une ombre et les poignées. Les champs et commandes gardent un repère clavier. La signature d’auteur est centrée, en 11 px, avec un lien discret souligné. [Audit et vérifications](AUDIT-INTERFACE-0.5.1.md).

Les champs de titre et de description directement dans la page constituent une exception aux outlines des formulaires : ils n’ont ni cadre ni ombre au focus. Un fond d’accent à 5 % et le curseur de saisie indiquent l’édition, avec transition de 120 ms. Les champs des dialogues conservent leur repère clavier partagé.

## Ajustements 0.5.2

Le carnet actif utilise le même soulignement et la même couleur d’accent que la catégorie, sans coche ni fond de surlignage ; la catégorie active est soulignée en 2 px, sans animation supplémentaire. Les échantillons de couleur restent des cercles de 28 px dans une cible ≥44 px. La coche donne une information indépendante de la couleur. Un formulaire imbriqué dans les réglages ne reçoit pas une seconde gouttière.

## Navigation réglable — 0.5.4

Le repère de sélection repose sur un soulignement de 2 px et le poids 600, en couleur d’accent. Le nom tronqué conserve une réserve verticale pour ne pas couper son trait. La poignée de largeur apparaît sur le bord commun navigation/contenu ; le curseur change en col-resize, la ligne d’accent indique survol/focus/glissement. Le mouvement suit directement le pointeur, sans animation de largeur ni déplacement du contenu par transform. Le clavier offre une alternative.

## Rédaction — 0.6

Les commandes permanentes se limitent à l’ajout flottant et à l’historique. La mise en forme apparaît uniquement lorsqu’un texte est sélectionné : la présence du curseur ne suffit pas. Le bandeau s’ancre au-dessus du paragraphe ; sa légère apparition dure 120 ms et disparaît en réduction des mouvements. Le bouton d’ajout devient rond sur mobile. Les thèmes existants fournissent surface, texte et accent ; aucune couleur fixe de menu n’est introduite.

Les titres dépliables gardent la typographie du niveau 1/2/3 et une flèche neutre. Leur contenu est indenté de 28 px, sans cadre de carte. L’ouverture est signalée par la rotation de la flèche et `aria-expanded`. La lecture publique utilise la même hiérarchie typographique.

## Composer et retrouver — 0.7

La poignée ⋮⋮ est une action réelle : cliquer ouvre le menu, glisser déplace le bloc. Le dépôt est indiqué par une ligne d’accent, avec une indentation et le libellé « Dans la section » pour une destination imbriquée. Un aperçu léger accompagne le pointeur. Les titres dépliables gardent leur composition sans cadre supplémentaire. Sur mobile, la poignée active se place à droite avec une cible de 44 px ; le contenu garde sa largeur.

L’accueil admin reprend les surfaces, accents, rayons et typographies du carnet. Cartes récentes et liste d’activité partagent les mêmes noms, icônes et statuts. Le bouton de navigation est près du titre, et la recherche reste consacrée à la saisie. L’accueil est réservé à l’administration. Le nouveau symbole montagne/lac est décrit dans [l’identité visuelle](IDENTITE-VISUELLE.md).

## Installateur et mises à jour — 0.8

L’installation reste une surface claire avant le choix des thèmes : colonne sauge avec symbole montagne/lac et formulaire en trois étapes. La hiérarchie repose sur les titres, labels et espaces ; cibles de 46–48 px, rayon de champ 10 px, notes 12 px. L’illustration et les transitions d’étape utilisent seulement opacité/transform, puis s’arrêtent ; reduced-motion supprime ces mouvements. Les secrets ne sont jamais affichés en clair par défaut.

Le panneau de mises à jour reprend les tokens surface/ink/line/accent des réglages, avec marges 24 px sur ordinateur et 18 px sur mobile. Les décisions sont explicites, les actions occupées sont désactivées et la fermeture du dialogue est bloquée pendant le remplacement. Le résultat possède un texte permanent en plus de l’icône. Voir [la revue ciblée](AUDIT-INSTALLATION-0.8.md).

## Vocabulaire du produit — 0.8.1

Parler de notes, pages, documents, carnets, catégories, visiteurs et administration. Les textes livrés par défaut n’imposent aucun métier. Un usage particulier appartient au contenu rédigé par le propriétaire. Les libellés administratifs et publics utilisent le même vocabulaire ; les formulaires précisent qui reçoit les réponses. La navigation garde ses repères pendant l’affichage de l’accueil.

## Hiérarchie neutre — 0.8.2

Les titres h1–h6 et les champs de titre/sous-titre ne portent pas l’accent. Utiliser --heading-ink : #272727 en clair, #F3F4F6 en sombre/OLED. Les titres de cartes restent neutres, même lorsqu’ils constituent un lien ; les sources et les autres liens gardent l’accent. Neutraliser aussi les marques de couleur anciennes dans un titre sans toucher au document.

## Accueil — 0.8.3

Le logo n’affiche pas de surface ou cadre au survol ; le focus clavier reste distinct. Les deux actions principales de l’accueil partagent une largeur de 180 px. Sans page ouverte, le fil d’Ariane se limite au nom personnalisé du site.

## Accueil de carnet — 0.9.0

Reprendre les cartes, espacements et actions de l’accueil général, avec l’icône et le nom du carnet comme repères. Les catégories actives sont colorées et soulignées, comme dans la barre latérale. Le champ de filtre reste discret et passe sur une ligne entière sur mobile. Les titres gardent la couleur neutre du thème. La liste de pages inclut un statut public/privé et un libellé de parent pour les sous-pages.

## Personnalisation et partage — 0.10

L’accueil ne possède plus de surtitre en capitales. Le nom du carnet se modifie sur place, avec un indice crayon discret et un focus clavier conservé. Son icône ouvre le sélecteur complet. La couverture reprend les outils et gestes des pages, sans nouveau langage graphique. Les contrôles d’import utilisent FileInput (document entrant) ; le partage utilise Share2. Dans la publication, champ d’adresse et deux actions de même largeur forment un groupe lisible ; les actions se superposent sous 480 px et gardent des cibles de 44 px. Titres neutres et couleurs de thème restent conservés.

## Encadrés — 0.10.1

Les callouts utilisent une palette sémantique bleu/vert/jaune/rose/gris commune au lecteur et à l’éditeur, dans interface.css. Sur fond clair, fond pastel et texte du thème ; sur fond sombre ou OLED, teinte à 14 % sur --surface et texte --ink. Éviter les fonds clairs fixes avec un texte héritant du mode sombre. Les couleurs de texte explicitement choisies restent des choix du document.

## Barre du lecteur — 0.12

Fil d’Ariane flexible à gauche ; groupe thème/connexion sans rétrécissement à droite. Hauteur minimale des actions 44 px, espacement 16 px sur ordinateur et 12 px sur mobile. Le nom du site se tronque avant que les actions se chevauchent. Un seul lien Administration dans la barre. Le remplacement automatique reprend la barre entière. Le crédit commun reste discret et ajoute la version à Feuillet, avec lien vers le dépôt.
