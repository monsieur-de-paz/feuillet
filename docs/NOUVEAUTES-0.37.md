# Feuillet 0.37 — Roue du destin et copie par groupe

Dans la vue de projection d’une base, ouvrir la flèche d’une colonne : **Copier** reprend toutes les lignes chargées. **Copier sur [groupe]** copie seulement ce groupe déplié. Lorsque plusieurs groupes sont ouverts, **Copier les groupes dépliés** réunit leurs lignes. Les groupes fermés sont exclus de ces copies ciblées.

## Roue du destin

Cliquer sur **✦ Roue du destin**, choisir la donnée à tirer (par exemple Nom), une colonne de regroupement (Classe) puis le groupe (4e A). Chaque colonne, groupe et source de formulaire dispose de sa propre roue ; le choix Tous les groupes utilise une roue distincte. La roue considère les lignes de la base correspondant à ce choix, y compris au-delà des 200 lignes visibles dans la projection. Les valeurs vides sont ignorées ; les valeurs identiques de deux lignes restent deux entrées distinctes avec la même chance chacune.

**Faire tourner la roue** déclenche un tirage aléatoire côté serveur. Le résultat est enregistré avant l’animation : fermer ou recharger ne l’efface pas. Après révélation, choisir **Garder dans la roue** ou **Retirer de la roue**. Le retrait concerne uniquement cette roue et ne supprime aucune donnée de la base. Une décision est nécessaire avant de relancer. **Réinitialiser cette roue** demande confirmation puis réintègre les résultats et efface son historique.

L’état est sauvegardé sur le serveur ; la colonne, le groupe et le choix des sons sont mémorisés dans ce navigateur. L’historique conserve les vingt derniers tirages. Les exclusions restent associées aux identifiants des lignes, même si les libellés changent. Limites : 2 000 valeurs dans une roue, et 20 000 lignes parcourues dans la base ou la source sélectionnée. Choisir un groupe plus petit si nécessaire.

## Présentation et accessibilité

Libellés disposés du centre vers le bord des secteurs, avec deux lignes lorsque l’espace le permet et réduction/abréviation pour les roues denses. Le nom du résultat est toujours affiché en grand. Au-delà de 60 entrées, les secteurs représentent des ensembles d’entrées, sans changer leur probabilité individuelle. Les participants complets sont consultables par recherche et pagination dans **Participants et historique**.

Les sons sont générés localement, activés uniquement par une interaction et désactivables. La révélation utilise une lumière douce, sans stroboscope. Par défaut, la préférence de mouvements réduits retire l’animation de rotation ; depuis la version 0.37.1, le sélecteur Animation de la roue permet de changer ce comportement volontairement. Le clavier permet d’ouvrir, lancer, décider et fermer avec Échap ; le focus reste dans la fenêtre, le résultat est annoncé et le reste de la page est rendu inerte. Les couleurs des secteurs offrent un contraste d’au moins 4,5:1 avec les libellés blancs. Ces contrôles ne remplacent pas les essais sur les appareils et lecteurs d’écran de chaque utilisateur.

## Maintenance

Aucune migration SQL supplémentaire. Les états privés utilisent `app_settings` (`wheel:` et marqueurs `wx:`), avec écriture transactionnelle et contrôle de révision. Les tirages et décisions nécessitent une session administrateur et un jeton CSRF. La base métier n’est jamais modifiée par les retraits de la roue. Les sauvegardes de mise à jour incluent la table `app_settings`.

Validation : suite frontend, tests HTTP des décisions, groupes/colonnes/sources indépendants, états vides, conflits et accès ; navigateur pour la copie ciblée, rotation, résultat, choix, rechargement, plein écran, clavier, sons désactivables et mouvements réduits. Démonstration synthétique laissée ouverte localement.


## Correctif 0.37.1 — postes aux animations désactivées

Si le résultat apparaît immédiatement sans rotation, regarder **Animation de la roue**. En mode **Selon le système**, Feuillet explique quand le poste demande de réduire les animations. Ce réglage peut provenir des options d’accessibilité de Windows transmises par Chrome ; il n’indique pas un blocage de framework.

Pour une projection, choisir explicitement **Rotation complète** (environ 5 secondes) ou **Rotation légère** (environ 2 secondes, moins de tours et sans halo animé). **Sans rotation** donne un résultat immédiat. Ce choix est enregistré dans ce navigateur, pour toutes ses roues ; il reste indépendant du son et de l’état des tirages conservé sur le serveur. Le mode automatique continue à respecter le système, y compris si cette préférence change pendant une rotation.

La rotation utilise directement le SVG, sans transition CSS, WebGL, CDN ni animation externe. Une minuterie assure le relais lorsque les images d’animation ne sont plus envoyées. Un onglet suspendu rejoint sa position finale à sa reprise ; fermer la roue interrompt seulement sa présentation, le résultat enregistré peut toujours être retrouvé.

Diagnostic : le symptôme rapporté correspond au chemin de réduction des mouvements du code précédent, également utilisé dans le portfolio. Ce réglage a été reproduit par émulation Chrome ; la configuration réelle du poste de Montastruc reste à confirmer sur place. Référence : [préférence de mouvements réduits et paramètres Windows](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion).

Validation du correctif : suite frontend complète ; politiques auto/manuelles, positions intermédiaires et destination exacte, minuterie sans images, reprise après pause, annulation et fin unique ; trois tests HTTP des états et permissions. Dans Chrome : mode système réduit, rotation complète et légère malgré ce réglage, retour automatique à un résultat sans mouvement quand le système change, absence volontaire de rotation, reprise du résultat et mémorisation après rechargement. Nouveau sélecteur vérifié à 390 px sans débordement horizontal.
