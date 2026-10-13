# Bases et vues liées — Feuillet 0.4

Vérification et implémentation du 13 octobre 2026. Le parcours principal est désormais **cliquer une cellule → modifier sa valeur → enregistrer → retrouver la même valeur dans les autres vues de cette base**. Une fiche liée se cherche par son titre et peut être ouverte directement.

## Ce qui a été appris, et avec quelles preuves

L’investigation utilise le dépôt REA fourni, son scénario navigateur et les sources officielles de Notion. L’observation du compte privé Notion n’a pas été possible : nous ne prétendons donc pas avoir manipulé ses cellules ni ses menus dans une session authentifiée.

| Comportement de référence | Source primaire | Adaptation dans Feuillet |
| --- | --- | --- |
| Table : lignes et propriétés, menu de colonne, modification des valeurs | [Tables](https://www.notion.com/help/tables), [Propriétés](https://www.notion.com/help/database-properties) | Cellules typées directement éditables, menu de chaque en-tête, fiche complète facultative |
| Une relation relie des fiches de bases différentes | [Relations et agrégations](https://www.notion.com/help/relations-and-rollups) | Recherche par titre, sélection multiple, ouverture d’une vraie fiche de la base cible |
| Une vue liée affiche la même source ; modifier les données agit sur cette source, alors que sa présentation reste indépendante | [Sources et bases liées](https://www.notion.com/help/data-sources-and-linked-databases) | Chaque bloc conserve sa présentation ; toutes ses cellules viennent de la même base |
| Les vues ont leurs propres dispositions, filtres, propriétés visibles et tris | [Vues, filtres et tris](https://www.notion.com/help/views-filters-and-sorts) | Tableau/galerie/graphique, filtres simples, tri et colonnes visibles configurables par bloc |

Une nouvelle capture REA a réellement chargé la documentation officielle des sources liées dans un navigateur **isolé**, sans cookies du compte de l’utilisateur :

- Commande : `rea capture-browser-scenario database-docs-scenario.json --format json`.
- Preuve : `ev_2aeb50c9c25e22fb7e97936a5d3187863711f3d11a7bd640ca378aa212097915`.
- URL observée : `https://www.notion.com/help/data-sources-and-linked-databases`.
- Scénario : navigation, attente du titre visible, capture finale de l’URL, de l’image et de l’arbre d’accessibilité.
- Environnement : Chromium 155.0.8059.39, 1200 × 1400, thème clair, langue fr-FR. Le processus créé par le fournisseur a été fermé à la fin.
- Image : [capture REA](rea-linked-databases-0.4.png), SHA-256 `a91edbb129b5ed359b61092d2c493c74e6705d18d42ab4f360de8f9b323240d7`.
- Métadonnées : [résumé de la preuve](rea-linked-databases-0.4.json). Le texte intégral de la documentation n’est pas redistribué ; ses empreintes sont conservées.

Cette preuve confirme l’affichage réel de la documentation et de ses sections dans le navigateur, **pas une expérimentation de l’éditeur privé**. Les gestes de bases décrits ci-dessus sont documentés par Notion. Les observations publiques antérieures du cours fourni — couverture, galeries et liens — restent disponibles dans [ANALYSE-NOTION.md](ANALYSE-NOTION.md).

## Utilisation concrète

### Modifier depuis une page de cours

Dans une base intégrée à une page, cliquer une cellule ouvre un contrôle adapté à son type. Les cellules contenant un lien ou un fichier disposent d’un crayon séparé : le lien reste ouvrable. Entrée enregistre les champs simples ; un clic hors du contrôle enregistre une modification valide. Échap permet d’annuler. Pour les champs multilignes, le bouton Enregistrer reste disponible.

L’enregistrement utilise `row_patch` avec l’identifiant de la propriété et la version de la fiche. Les autres cellules et la visibilité sont conservées. Les formules et agrégations sont calculées côté serveur et ne sont pas éditées comme du texte. En cas de conflit de version, le brouillon reste affiché avec les actions permettant de sauvegarder une copie ou recharger le serveur.

### Configurer les propriétés

Le menu de colonne propose renommer, configurer, trier, filtrer, masquer ou supprimer. Le bouton `+` de l’en-tête ajoute une propriété. Les changements de schéma utilisent les API réelles ; masquer une propriété change uniquement cette vue.

**Renommer une propriété ne réécrit pas automatiquement les formules `prop("Ancien nom")`.** Un avertissement est affiché avant un renommage lorsqu’il existe des formules ; leurs expressions doivent être adaptées. Les relations et agrégations qui utilisent des identifiants de propriétés restent distinctes de cette limite des noms de formules.

Lors d’une suppression de propriété, le serveur fournit les versions de pages avant/après la mise à jour de leurs vues. Le navigateur n’adopte la version suivante que s’il connaissait exactement la version précédente, afin de conserver le texte du cours en cours d’écriture sans écraser un autre changement.

### Choisir une relation

Les choix sont de vraies fiches de la base cible, obtenues depuis le serveur. La recherche ignore la casse et les accents. Les choix affichent les titres plutôt que des identifiants techniques ; les fiches sélectionnées restent visibles dans des pastilles. Le bouton d’ouverture permet de modifier cette fiche dans un dialogue dédié puis de revenir à la sélection. La liste affiche au maximum 60 résultats simultanés et invite à préciser la recherche.

### Afficher la même base dans plusieurs pages

Insérer une base existante crée une vue liée à son identifiant. Modifier une fiche depuis cette vue modifie la base source. Les autres vues ouvertes dans le **même onglet** se rechargent après la mutation. Chaque bloc conserve ses propres filtres, tri, disposition et propriétés masquées dans `viewConfig`, enregistré avec la page. La recherche courante reste temporaire. Dans le gestionnaire des bases, ces réglages de vue sont temporaires et ne sont pas annoncés comme sauvegardés.

Un lecteur public peut utiliser une recherche ou un filtre temporaire. Il n’obtient ni les commandes d’administration, ni les fiches privées. La disposition enregistrée par l’enseignant s’applique au bloc publié et aux rendus serveur/PDF selon le parcours d’export.

## Contrat des vues

```json
{
  "layout": "table",
  "filters": [{"propertyId": "id_du_champ", "operator": "contains", "value": "solaire"}],
  "sort": {"propertyId": "id_du_champ", "direction": "asc"},
  "hiddenPropertyIds": []
}
```

Dispositions : `table`, `gallery`, `chart`. Filtres : `contains`, `equals`, `notEquals`, `isEmpty`, `isNotEmpty`, `gt`, `gte`, `lt`, `lte`. Dix conditions maximum, combinées avec ET ; un seul tri. Les filtres sur relations comparent les titres autorisés, ceux sur fichiers comparent leurs noms. Les tris numériques respectent les nombres, les valeurs vides se placent à la fin. Les identifiants inconnus sont retirés et les listes sont bornées. Une restauration doit remapper les identifiants dans `filters[*].propertyId`, `sort.propertyId` et `hiddenPropertyIds[*]`.

Les filtres et colonnes masquées sont des choix d’affichage, **pas des permissions d’accès**. Le serveur applique séparément les restrictions de publication, de relations et de fichiers. Les réponses de formulaires restent privées, même lorsque la base est publique. Les pièces jointes déposées sans envoyer le formulaire expirent après 24 heures ; l’interface explique cette durée et invite à les envoyer à nouveau en cas d’expiration.

## Vérifications et limites

TypeScript (`tsc --noEmit`) passe. Treize contrôles des helpers réels passent : recherche avec accents, titres de relations, noms de fichiers, combinaison ET, nombres, dates, multisélection, booléens, tableaux vides, tri ascendant/descendant avec vides en fin, identifiants supprimés, bornes et absence de modification des données sources. Les API utilisées ne sont pas simulées par l’interface ; le parcours navigateur et les tests des versions/conflits/publication sont vérifiés dans la validation globale de la livraison.

La comparaison reste volontairement partielle : pas de filtres OU imbriqués, tri multiple, regroupement, largeur des colonnes glissable, relation réciproque automatique ni contenu riche propre à chaque fiche. Les fiches s’ouvrent dans un formulaire de propriétés. Il n’y a pas de synchronisation collaborative en temps réel entre plusieurs onglets ; Actualiser récupère leurs changements, et les versions protègent les écritures. Le langage de formule est le sous-ensemble sûr de Feuillet, pas une copie exhaustive du langage Notion.
