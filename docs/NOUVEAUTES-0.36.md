# Feuillet 0.36 — Suivre les passages, en direct

Ouvrir la vue de projection d’une base de données. Dans **Colonnes**, afficher les propriétés utiles, par exemple le nom, l’état et une case « Passé ». Les cases à cocher et les choix uniques se modifient directement dans le tableau et s’enregistrent dans la base. Cette vue reste réservée à l’administrateur.

Choisir **Regrouper les réponses par**, puis cliquer sur le nom d’un groupe pour le fermer ou l’ouvrir. **Tout replier** et **Tout déplier** agissent sur tous les groupes affichés. Les colonnes, le regroupement et les groupes repliés sont mémorisés sur ce navigateur ; l’actualisation toutes les dix secondes conserve leur état.

**Couleurs des lignes** permet de construire une règle lisible :

> Si **État** **est égal à** **Terminé**, alors coloriser en **Vert**.

Les conditions proposées dépendent de la colonne : égalité, différence, champ renseigné ou vide, texte contenu, comparaison numérique. Les règles sont enregistrées sur le serveur pour cette base, même si la colonne concernée est masquée. La première règle correspondante gagne ; supprimer une règle retire son effet lors de la prochaine application. Vingt règles et six couleurs sont disponibles. Les cases restent lisibles dans les thèmes clairs et sombres.

Les modifications concurrentes sont signalées : Feuillet ne remplace pas silencieusement une valeur modifiée ailleurs. Réessayer après actualisation. Le tableau de projection conserve sa limite de 200 lignes récentes et les liens de téléchargement existants.

Aucune migration SQL supplémentaire. Distribution complète nécessaire ; conserver `config.php` et `storage/` en mise à jour manuelle.

Validation : navigateur (plein écran natif, groupes, cases, états, règle, actualisation et rechargement), suite frontend et tests HTTP des versions, données masquées, accès invités, CSRF et règles mal formées.

Dans chaque en-tête, la petite flèche ouvre les actions de colonne, dont **Copier la colonne**. La copie inclut toutes les lignes chargées, même dans un groupe replié.
