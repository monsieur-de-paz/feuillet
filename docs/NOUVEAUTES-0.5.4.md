# Feuillet 0.5.4 — une navigation cohérente et réglable

Le carnet actif est désormais souligné et utilise la couleur d’accent, comme la catégorie sélectionnée. La coche et le repère latéral sont retirés. Le nom du carnet garde son fond transparent.

## Régler la largeur de la barre latérale

Sur ordinateur, glisser la petite poignée au milieu du bord droit de la navigation. La largeur est conservée dans ce navigateur et retrouvée lors du rechargement ou de l’ouverture d’une autre page. Les onglets utilisant cette version se synchronisent.

Au clavier, sélectionner la poignée avec Tab, puis :

- ← / → : retirer ou ajouter 10 pixels ; avec Maj, 50 pixels.
- Début / Fin : largeur minimale ou maximale disponible.
- Entrée ou double-clic : rétablir la largeur habituelle.
- Échap pendant le glissement : annuler le changement en cours.

La largeur va de 220 à 480 pixels, avec une borne supplémentaire pour garder au moins 480 pixels à la zone principale. Aucun contenu de cours n’est modifié par ce réglage. Le titre adapte sa hauteur lorsque la zone de rédaction change de largeur. Le réglage est local au navigateur, pas à la base de données ou aux sauvegardes.

La poignée est absente lorsque la navigation est masquée, en mode plein écran, sur mobile et à l’impression. Le tiroir mobile garde son fonctionnement et sa largeur habituels.

## Mise à jour

Remplacer les fichiers du logiciel et les assets compilés, sans toucher à `config.php` ni `storage/`, puis recharger les onglets. Aucune nouvelle migration SQL ou dépendance. Les règles de partage de 0.5.1 sont conservées. Voir [Architecture](ARCHITECTURE.md) et [tests](TESTS.md).
