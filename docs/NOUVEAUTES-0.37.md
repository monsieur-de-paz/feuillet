# Feuillet 0.37 — Roue du destin et copie par groupe

Dans la vue de projection d’une base, ouvrir la flèche d’une colonne : **Copier** reprend toutes les lignes chargées. **Copier sur [groupe]** copie seulement ce groupe déplié. Lorsque plusieurs groupes sont ouverts, **Copier les groupes dépliés** réunit leurs lignes. Les groupes fermés sont exclus de ces copies ciblées.

## Roue du destin

Cliquer sur **✦ Roue du destin**, choisir la donnée à tirer (par exemple Nom), une colonne de regroupement (Classe) puis le groupe (4e A). Chaque colonne, groupe et source de formulaire dispose de sa propre roue ; le choix Tous les groupes utilise une roue distincte. La roue considère les lignes de la base correspondant à ce choix, y compris au-delà des 200 lignes visibles dans la projection. Les valeurs vides sont ignorées ; les valeurs identiques de deux lignes restent deux entrées distinctes avec la même chance chacune.

**Faire tourner la roue** déclenche un tirage aléatoire côté serveur. Le résultat est enregistré avant l’animation : fermer ou recharger ne l’efface pas. Après révélation, choisir **Garder dans la roue** ou **Retirer de la roue**. Le retrait concerne uniquement cette roue et ne supprime aucune donnée de la base. Une décision est nécessaire avant de relancer. **Réinitialiser cette roue** demande confirmation puis réintègre les résultats et efface son historique.

L’état est sauvegardé sur le serveur ; la colonne, le groupe et le choix des sons sont mémorisés dans ce navigateur. L’historique conserve les vingt derniers tirages. Les exclusions restent associées aux identifiants des lignes, même si les libellés changent. Limites : 2 000 valeurs dans une roue, et 20 000 lignes parcourues dans la base ou la source sélectionnée. Choisir un groupe plus petit si nécessaire.

## Présentation et accessibilité

Libellés disposés du centre vers le bord des secteurs, avec deux lignes lorsque l’espace le permet et réduction/abréviation pour les roues denses. Le nom du résultat est toujours affiché en grand. Au-delà de 60 entrées, les secteurs représentent des ensembles d’entrées, sans changer leur probabilité individuelle. Les participants complets sont consultables par recherche et pagination dans **Participants et historique**.

Les sons sont générés localement, activés uniquement par une interaction et désactivables. La révélation utilise une lumière douce, sans stroboscope. La préférence de mouvements réduits retire l’animation de rotation. Le clavier permet d’ouvrir, lancer, décider et fermer avec Échap ; le focus reste dans la fenêtre, le résultat est annoncé et le reste de la page est rendu inerte. Les couleurs des secteurs offrent un contraste d’au moins 4,5:1 avec les libellés blancs. Ces contrôles ne remplacent pas les essais sur les appareils et lecteurs d’écran de chaque utilisateur.

## Maintenance

Aucune migration SQL supplémentaire. Les états privés utilisent `app_settings` (`wheel:` et marqueurs `wx:`), avec écriture transactionnelle et contrôle de révision. Les tirages et décisions nécessitent une session administrateur et un jeton CSRF. La base métier n’est jamais modifiée par les retraits de la roue. Les sauvegardes de mise à jour incluent la table `app_settings`.

Validation : suite frontend, tests HTTP des décisions, groupes/colonnes/sources indépendants, états vides, conflits et accès ; navigateur pour la copie ciblée, rotation, résultat, choix, rechargement, plein écran, clavier, sons désactivables et mouvements réduits. Démonstration synthétique laissée ouverte localement.
