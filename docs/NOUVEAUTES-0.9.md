# Feuillet 0.9 — un accueil pour chaque carnet

Cliquer sur le logo ou le nom du site ouvre l’accueil général. Cliquer sur un carnet ouvre désormais son propre accueil, sans modifier la publication de ses pages. Cette vue est réservée à l’administrateur.

## Retrouver ses pages

L’accueil affiche le nom et l’icône du carnet, les nombres de pages, de catégories et de pages publiques, puis les six pages les plus récemment modifiées. Une seconde liste donne accès à toutes les pages et sous-pages du carnet, avec leur date et leur statut privé/public. Un bouton permet d’afficher les suivantes par lots de 24. Les sous-pages indiquent le nom de leur parent.

Les catégories du carnet peuvent être choisies dans l’accueil ou dans la barre latérale : les deux sélections restent cohérentes. Le champ de filtre cherche dans les titres, descriptions et étiquettes, sans tenir compte des accents ou des majuscules. Il ne remplace pas la recherche globale dans le contenu. Une catégorie vide propose d’effacer les filtres ; un carnet vide propose de créer sa première page.

## Créer et naviguer

Nouvelle page et Importer une page utilisent le carnet sélectionné. La boîte d’import nomme explicitement le carnet de destination. Une page créée à la racine reste privée par défaut. Le titre du carnet dans le fil d’Ariane d’une page ouvre son accueil. Le logo revient à toutes les activités.

Les adresses index.php?dashboard=1&space=ID peuvent être rechargées ou conservées en favori. Les boutons précédent/suivant du navigateur retrouvent les accueils visités. Si un carnet n’existe plus, l’accueil général sert de repli. Les modifications en attente sont enregistrées avant le changement ; les gardes des formulaires et bases restent actives.

Ces accueils ne sont pas des pages publiques et ne créent pas de partage global du carnet. Les liens publics continuent de montrer uniquement leur branche autorisée.

## Mettre à jour

Utiliser la release 0.9.0 ou transférer le code et les assets compilés en conservant config.php et storage/, puis recharger l’onglet. Aucune migration de contenu n’est nécessaire.
