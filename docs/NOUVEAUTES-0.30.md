# Feuillet 0.30 — Réutiliser ses vidéos en ligne

## Insérer une vidéo déjà utilisée

1. Dans l’éditeur, ajouter un bloc **Vidéo**, depuis `/vidéo` ou **Ajouter un bloc**.
2. Choisir **Vidéo en ligne**.
3. Sous le champ de nouveau lien, retrouver **Vidéos déjà utilisées**.
4. Rechercher un titre, un service, une URL ou le nom d’une page, puis cliquer sur une carte pour insérer la vidéo à l’emplacement choisi.

La liste affiche le titre enregistré, le service, l’URL et le nombre de pages qui utilisent ce lecteur. Le nom d’une première page est visible ; les autres noms figurent au survol. La recherche ignore les accents et la casse. Le bouton d’actualisation relit les pages enregistrées ; rouvrir l’onglet Vidéo en ligne actualise aussi la liste.

L’option **Fichier vidéo** conserve la bibliothèque et l’import des vidéos hébergées sur votre serveur. Il reste possible de coller un nouveau lien dans l’option Vidéo en ligne.

## Une liste automatique, des blocs indépendants

Les vidéos des pages existantes sont disponibles dès la mise à jour. Aucune réimportation ou nouvelle table SQL n’est nécessaire.

L’inventaire parcourt les blocs de vidéo en ligne des brouillons et des versions encore publiées, y compris dans les colonnes, encadrés et titres dépliables. Les pages supprimées et les anciennes révisions non publiées sont exclues. Une vidéo retirée du brouillon reste donc disponible si elle figure encore dans la version publiée de la page.

Les lecteurs identiques sont regroupés, même lorsque les adresses reconnues diffèrent : par exemple un lien `youtu.be` et un lien `youtube.com/watch` vers le même lecteur et le même point de départ. Les points de départ et les liens privés Vimeo sont conservés. Les pages d’origine sont comptées une seule fois par vidéo.

Une insertion crée un **nouveau bloc indépendant**, avec le lien et les informations du lecteur. Modifier ensuite son titre ou son lien ne modifie pas la vidéo placée dans l’autre page. La vidéo reste hébergée par le service d’origine ; elle n’est pas téléchargée sur le serveur Feuillet.

## Affichage léger et accès privé

Aucun lecteur, miniature distante ou recherche de métadonnées n’est lancé par l’inventaire. Les informations viennent des pages enregistrées ; le lecteur fonctionne après insertion selon le comportement habituel de Feuillet. Les services reconnus sont YouTube, Dailymotion, Vimeo, TikTok et les liens directs vers des fichiers vidéo HTTPS.

La liste est réservée à l’administrateur : elle peut contenir les titres et les liens de pages privées. L’API refuse l’accès aux visiteurs et renvoie une réponse sans cache. Les adresses sont revalidées par le même analyseur que les blocs ; aucun code d’intégration HTML arbitraire n’est repris.

L’inventaire contient au maximum 1 000 lecteurs distincts, en parcourant les pages les plus récemment modifiées. Les cartes sont affichées par lots de 24 avec **Afficher plus de vidéos** ; la recherche porte sur l’ensemble de la liste reçue. Les vidéos présentes uniquement dans un bloc d’intégration HTML ou un simple lien ne sont pas ajoutées à cette liste.

## Mise à jour et vérifications

Installer la **0.30.0** depuis les mises à jour de Feuillet, puis recharger les onglets ouverts. Conserver `config.php` et tout `storage/` lors d’une mise à jour manuelle. Aucune migration SQL ni modification des pages, fichiers, formulaires ou liens de partage.

Les tests d’inventaire sont exécutés sur SQLite et MySQL : accès administrateur, méthode GET, absence de cache HTTP, vidéos imbriquées, lecteurs dupliqués, snapshot publié, retrait, corbeille, limite de résultats et réutilisation indépendante. Les intégrations existantes, l’éditeur, la lecture publique, la sécurité, les tests frontend et les correctifs de navigation/PWA sont également vérifiés.

Essai dans le navigateur intégré sur des données fictives : six utilisations donnent cinq cartes, recherche sans accents par nom de page et titre, insertion d’une vidéo, sauvegarde puis rechargement, réouverture avec compteur actualisé. Affichage clair et sombre vérifié ; aucun iframe n’est présent dans la liste. Aucun contenu ou formulaire de production n’a été modifié.
