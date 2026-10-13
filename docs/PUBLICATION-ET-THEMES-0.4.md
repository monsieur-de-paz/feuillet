# Publication automatique, galeries et thème de lecture

## Écrire une fois, afficher les changements aux visiteurs

Une nouvelle page reste privée. **Publier** rend publics cette page et ses sous-pages actuelles. Ensuite, par défaut, chaque enregistrement d’une page déjà publique actualise aussi sa version publique : texte, ajout de bloc, média, icône, cadrage de couverture et disposition de galerie. Il n’est plus nécessaire de cliquer sur **Mettre à jour** après chaque modification.

L’éditeur enregistre après environ 900 ms sans nouvelle modification ; le cadrage peut aussi être enregistré avec **Terminer**. Il n’est pas possible d’afficher un changement qui n’a pas encore été envoyé au serveur, notamment hors connexion. L’état **Enregistré** confirme l’enregistrement ; un conflit ou une erreur reste visible et ne remplace pas une version plus récente.

Dans **Réglages & sauvegardes → Mon carnet**, décocher **Mettre à jour automatiquement les pages déjà publiques** permet de retrouver le mode brouillon : les nouvelles modifications restent privées jusqu’à une publication manuelle. Réactiver cette option synchronise les prochains enregistrements ; cela ne publie pas de nouvelles pages privées ni toutes les anciennes modifications sans action de rédaction. Les sous-pages créées après la publication restent privées jusqu’à leur première publication.

La mise en privé retire aussi les sous-pages et leurs documents, sauf lorsqu’un média est encore utilisé dans une autre ressource publique ou comme icône publique du carnet. Les réponses de formulaires restent privées.

## Une page publique déjà ouverte suit les changements

Le lecteur consulte un petit état toutes les **15 secondes** quand l’onglet est visible, ainsi qu’au retour dans l’onglet. Il télécharge le nouveau rendu uniquement lorsqu’un changement pertinent est détecté. Les lignes publiques des bases, les cartes de pages, le nom du carnet et ses réglages participent à cette détection. Les réponses privées ne sont ni rendues, ni chargées dans le calcul des données publiques des bases.

Une lecture audio/vidéo, un PDF actif, une sélection de texte ou un quiz commencé sont préservés : une proposition d’actualisation apparaît pour éviter d’interrompre ce travail. Une page rendue privée est retirée immédiatement au prochain contrôle, même si un exercice était en cours. Ce mécanisme par requêtes PHP fonctionne sans WebSocket, VPS ni service permanent.

Les modifications entre deux onglets administrateur restent soumises aux versions et conflits. Les vues liées d’une même page se mettent à jour après leurs opérations ; l’actualisation des autres onglets d’édition ne remplace pas automatiquement un brouillon en cours.

## Des cartes identiques en public et dans l’éditeur

Les deux vues utilisent le même fichier de styles de galerie, généré depuis `frontend/src/gallery-layout.css` vers `public/gallery.css`. Elles partagent les mêmes classes, les aperçus d’images, les cartes sans couverture, le ratio, les colonnes, les marges, les tailles de texte et la disposition en liste.

Les colonnes choisies s’appliquent sur ordinateur ; sur mobile, les deux vues limitent la grille à deux colonnes pour garder les cartes lisibles. Les mêmes réglages de lignes et **Afficher tout / Afficher moins** existent dans le lecteur. Les pages privées apparaissent uniquement à l’administrateur, avec les contrôles d’édition ; la vue publique ne révèle ni leur titre ni une carte vide les désignant.

## Un thème personnel pour chaque navigateur

Le bouton lune/soleil se trouve en haut à droite sur ordinateur, et dans une commande flottante en bas à droite sur mobile. Son menu propose **Clair**, **Sombre**, **Noir OLED** et **Thème du carnet**. OLED utilise un fond de page noir pur.

Ce choix est conservé dans le navigateur et ne modifie pas les couleurs choisies par l’auteur pour tous les visiteurs. **Thème du carnet** efface la préférence personnelle et revient aux réglages généraux et particuliers de la page. Les paramètres de thème restent disponibles pour définir l’apparence par défaut du carnet. Les couleurs des icônes choisies explicitement restent conservées.

## Références et limites

Les preuves REA et leur périmètre sont dans [Publication — référence Notion](REA-PUBLICATION-0.4.md). Elles portent sur la documentation officielle observée dans un navigateur isolé, sans accès à l’éditeur privé Notion. Feuillet utilise son propre serveur PHP, ses règles de visibilité et un contrôle périodique de lecture ; ce ne sont pas les protocoles internes de Notion.
