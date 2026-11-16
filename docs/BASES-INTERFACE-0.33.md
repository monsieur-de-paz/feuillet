# Bases intégrées : choix d’interface — 0.33

## Référence observée

Observation en lecture de l’application Notion le 16 novembre 2026 : barre de
vue à gauche, boutons Filtrer/Trier/Chercher/Nouveau à droite, filtre ouvert
sur place avec sélection de propriété ; menu d’une vue proposant Renommer,
Afficher comme, Modifier la vue et Dupliquer. Aucun contenu de l’espace Notion
n’a été modifié ou copié dans cette distribution.

Sources primaires : [vues, filtres et tris](https://www.notion.com/help/views-filters-and-sorts),
[propriétés](https://www.notion.com/help/database-properties) et
[vue tableau](https://www.notion.com/help/tables).

Feuillet reprend les gestes utiles à son modèle existant. La compatibilité ne
signifie pas une reproduction intégrale de Notion : trois types de vue, un tri
et des filtres ET ; pas de nouvelles vues nommées ni de collaboration ajoutées.

## Décisions

- Un tableau s’affiche immédiatement, y compris à vide, sans bloc de gestion
  imbriqué. La source reste partagée entre ses blocs ; la présentation du bloc
  reste enregistrée dans `viewConfig`.
- Les colonnes exposent leurs actions ; les paramètres détaillés utilisent un
  panneau latéral. Le catalogue reste disponible pour l’administration globale.
- Les panneaux de filtre contiennent des formulaires : ce sont des dialogues
  non modaux, pas des menus à flèches. Les actions de colonne réutilisent le
  menu contextuel clavier de Feuillet et son repli Popover existant.
- Le tableau garde son HTML sémantique, une légende accessible, `scope` et
  `aria-sort` sur la seule colonne triée. Le conteneur défile au clavier et
  conserve les en-têtes. Les lignes React sont réordonnées par clés stables,
  sans reconstruction du tbody par innerHTML ni faux ordre CSS.
- Une cellule simple garde sa saisie dans la grille. `database-editing.ts`
  ordonne les écritures d’une ligne et conserve les contrôles optimistes :
  un champ modifié entre-temps ne peut pas être écrasé silencieusement.
- Le rafraîchissement d’une base déjà chargée conserve le tableau et ses
  composants au lieu de réafficher un squelette après chaque changement.
- `db_create` insère dans une transaction une base privée et sa propriété Nom.
  Les valeurs client ne choisissent ni sa visibilité initiale ni ses champs.

Modern Web Guidance a été consulté avec `DISABLE_TELEMETRY=1` :
`responsive-table`, `sortable-table`, `menu`. Le code conserve les replis
existants plutôt que d’exiger de nouvelles API ou dépendances.
