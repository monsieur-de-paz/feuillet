# Feuillet 0.8.1 — des notes pour tous les usages

Feuillet permet de prendre des notes enrichies, de les organiser dans des carnets et de les centraliser sur son propre hébergement. Idées personnelles, documents, projets, lectures ou journal : aucun usage professionnel particulier n’est imposé.

## Une installation et une interface généralistes

L’installateur présente les notes et documents privés, puis leur partage facultatif avec des visiteurs. La connexion s’appelle **Administration** ; les formulaires s’adressent aux visiteurs et indiquent que leurs réponses restent privées, accessibles à l’administrateur du site. Les quiz restent disponibles, sous ce nom.

Les nouveaux carnets proposent **Notes** et **Articles**, renommables comme toutes les catégories. Le sous-titre initial devient **Mes notes, simplement**. Seul l’ancien sous-titre livré par défaut est remplacé automatiquement ; un sous-titre personnalisé est conservé. Les pages, noms de carnets, catégories existantes, fichiers et versions ne sont pas renommés.

## L’accueil conserve la navigation

Cliquer sur le logo ou le nom du site affiche l’accueil administrateur. Le carnet sélectionné, sa catégorie, la recherche et les pages de la barre latérale restent disponibles. Le menu mobile conserve son état d’ouverture. Le titre du fil d’Ariane sur l’accueil ne désélectionne plus le carnet : ce clic pouvait auparavant vider les catégories et la liste des pages.

Le bouton de masquage et le raccourci de navigation restent disponibles. Ouvrir une page depuis la barre fonctionne comme auparavant, y compris après un passage par l’accueil.

## Installer le correctif

Utiliser la release **0.8.1** ou remplacer le code et les fichiers compilés en conservant **config.php** et **storage/**. Recharger l’onglet pour obtenir l’interface actualisée. Aucun renommage massif des contenus ou changement de droits de partage n’est effectué.

Les identifiants historiques `kind=class`, `course-content` et les marqueurs des anciennes valeurs par défaut restent des détails internes de compatibilité. Ils ne constituent plus des libellés d’interface.
