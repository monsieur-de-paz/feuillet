# Feuillet 0.33 — Vos bases, directement dans la page

L’affichage Tableau se concentre désormais sur les lignes et les colonnes.
Les actions courantes sont à portée de clic, sans aller modifier la base dans
un autre écran puis revenir dans votre page.

![Un tableau éditable dans une page Feuillet, données fictives](assets/0.33-database-page.jpg)

## Commencer

Tapez `/base` ou choisissez **Base de données** dans l’ajout de blocs. Recherchez
une base existante, ou donnez un nom et créez une base vide. La colonne **Nom**
est prête ; la base commence en privé. Même sans ligne, les en-têtes restent
visibles et permettent d’ajouter des propriétés.

## Remplir et modifier

- Cliquez une cellule de texte, nom, nombre, date, e-mail, téléphone ou URL pour
  la modifier directement. **Entrée** ou sortir de la cellule enregistre ;
  **Tab/Maj+Tab** passe à une autre cellule ; **Échap** annule la saisie.
- Une case se coche en un clic ; un choix unique s’enregistre à la sélection.
  Fichiers, relations et choix multiples disposent d’un éditeur spécialisé.
- **Nouvelle ligne…**, en bas du tableau, permet de saisir un nom et d’ajouter
  avec Entrée. Les autres champs obligatoires ouvrent la fiche complète en
  conservant ce nom. **Nouveau** rejoint cette zone, ou ouvre une fiche dans
  les autres types de vue.
- Les écritures sur une même ligne sont ordonnées. Un conflit conserve la
  saisie et propose de la récupérer ; les versions du serveur sont vérifiées.

## Régler la vue

Les trois types de vue — **Tableau, Galerie, Graphique** — sont à gauche.
À droite : regroupement par propriété, filtres, tri, propriétés visibles,
recherche et ajout. Les réglages s’ouvrent au-dessus du tableau ; Échap ferme
un sélecteur imbriqué avant le panneau situé derrière lui.

Les filtres se combinent avec ET. Un tri est actif à la fois. Les présentations
restent propres à chaque bloc ; cette version ne crée pas un système de vues
nommées multiples. Les données et propriétés restent communes à la base.

Cliquez l’en-tête d’une colonne pour modifier sa propriété, trier, regrouper ou
masquer la colonne. Le bouton **+** ajoute une propriété. Relations, formules
et agrégations conservent leur fonctionnement et leur validation habituels.

## Régler la base et ses formulaires

Le nom du tableau et le bouton **…** ouvrent les paramètres de la base dans la
page : nom, accès privé/public, formulaires, actualisation et export CSV. Le
panneau de propriété ou de fiche se ferme pour retrouver le même tableau.

Rendre la base publique ne publie pas la page. Pour les visiteurs, les deux
conditions sont nécessaires : base publique et page publiée. Les lignes
privées et toutes les réponses aux formulaires, avec leurs pièces jointes,
restent privées. Le changement de présentation suit la sauvegarde et les
réglages de publication de votre page.

## Installer

Installer **0.33.0** depuis Réglages & sauvegardes → Mises à jour, puis recharger
les onglets. L’archive compilée contient aussi `database-workbench.css` et le
nouveau manifeste ; transférer l’ensemble pour une mise à jour manuelle, en
conservant **config.php et tout storage/**. Aucune migration SQL spécifique ni
nouvelle dépendance de production.

Voir [l’architecture](ARCHITECTURE.md), les [tests](TESTS.md) et
[l’étude d’ergonomie](BASES-INTERFACE-0.33.md).
