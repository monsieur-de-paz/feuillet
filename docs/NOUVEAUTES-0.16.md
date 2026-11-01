# Feuillet 0.16 — Onglets et vidéos à la demande

## Vidéos

Les vidéos intégrées ne possèdent aucun lecteur chargé à l’ouverture de la page : un bouton Lecture sur un aperçu léger les remplace. Cliquer ou appuyer sur Entrée lance uniquement la vidéo choisie. Le navigateur peut ensuite mettre cette vidéo en mémoire tampon normalement ; les autres restent en attente. Le comportement s’applique aux blocs existants sans les recréer.

Dans l’éditeur, ouvrir Présentation du fichier puis Choisir la miniature pour choisir une image avec le sélecteur habituel. Une miniature peut également être produite après environ une seconde de lecture d’une vidéo dans l’éditeur, si le navigateur sait en extraire une image. Cette capture reste une opération du navigateur ; le serveur n’a pas besoin de FFmpeg. En l’absence d’image, un visuel léger par défaut est affiché. La miniature est un fichier image soumis aux mêmes droits, sauvegardes et copies indépendantes que le reste du contenu.

## Onglets d’administration

Chaque page ouverte depuis la navigation apparaît dans une barre sous le fil d’Ariane. Cliquer sur un onglet pour reprendre sa rédaction. La page courante est enregistrée avant le changement ; en cas d’erreur, elle reste ouverte. Fermer un onglet ne supprime pas sa page. Fermer le dernier revient à l’accueil. Le bouton + crée une page dans un nouvel onglet.

Les onglets (32 maximum) sont mémorisés dans ce navigateur pour cette installation. Seuls leurs identifiants sont conservés localement ; les titres et contenus sont relus depuis le serveur après connexion. Les flèches gauche/droite permettent de changer d’onglet au clavier. Sur mobile, la barre défile horizontalement. Les onglets ne sont pas affichés aux visiteurs.
