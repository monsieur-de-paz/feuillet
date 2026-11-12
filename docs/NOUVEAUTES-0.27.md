# Feuillet 0.27 — trier les tableaux

La version **0.27.0** permet de trier les lignes d’un tableau depuis une colonne choisie. Elle conserve le format des documents existants et ne nécessite ni migration SQL ni configuration supplémentaire.

## Utiliser le tri

1. Placez la souris sur une colonne et ouvrez sa poignée, ou faites un clic droit dans une cellule.
2. Choisissez **Trier les lignes…**.
3. Choisissez la **colonne à trier**, puis **Croissant** ou **Décroissant**.
4. Gardez **Détection automatique**, ou imposez **Texte** ou **Nombres** dans **Comparer comme**.
5. Vérifiez l’option de conservation des en-têtes et cliquez sur **Appliquer le tri**.

Depuis une poignée de colonne, cette colonne est présélectionnée. Depuis une cellule, sa colonne est proposée. L’ensemble du tableau est trié : les lignes restent complètes, sans dissocier les cellules de leurs voisins.

## Texte et nombres

Le tri alphabétique tient compte des accents français sans distinguer les majuscules des minuscules. L’ordre naturel place par exemple « Chapitre 2 » avant « Chapitre 10 ».

Le tri numérique reconnaît les décimales à virgule ou à point, les nombres négatifs et les séparateurs de milliers courants : `1,5`, `-3`, `1 234,50`, `1.234,50`, `1,234.50`. Les symboles de monnaie courants et les pourcentages simples sont acceptés ; aucune conversion de monnaie ni comparaison d’unités n’est effectuée. Une virgule unique est interprétée comme séparateur décimal français.

La détection automatique choisit le mode numérique si toutes les valeurs non vides de la colonne sont reconnues comme des nombres. Sinon, elle choisit le texte. Les cellules vides restent à la fin dans les deux sens. En mode numérique forcé, les valeurs non numériques restent aussi à la fin. Les valeurs égales gardent leur ordre relatif.

## En-têtes, mise en forme et annulation

Les lignes d’en-tête au début du tableau sont détectées et conservées par défaut. Pour un tableau sans en-tête déclaré, l’option permet de garder quand même la première ligne en haut. Décochez-la pour inclure ces lignes dans le tri.

Le tri déplace les lignes entières : textes enrichis, liens, fichiers, couleurs, fusions horizontales et largeurs de cellules sont conservés. Il est annulable en une seule étape avec **Ctrl/Cmd + Z**, puis rétablissable. L’ordre est enregistré par la sauvegarde habituelle ; les visiteurs retrouvent cet ordre dans la version publiée.

**Les cellules fusionnées sur plusieurs lignes doivent être séparées avant de trier.** Le panneau l’indique et désactive l’application, afin de ne pas casser la structure. Il faut au moins deux lignes de données à trier. Les fusions horizontales restent compatibles.

Il s’agit d’un tri ponctuel du contenu des tableaux ordinaires. Il ne crée pas de règle de tri permanente et ne remplace pas les tris des vues de bases de données.

## Mettre à jour

Ouvrez **Réglages & sauvegardes → Mises à jour**, vérifiez puis installez **0.27.0**. Pour un transfert manuel, utilisez **Feuillet-0.27.0.zip** et conservez **config.php et tout storage/**. Le paquet contient les ressources compilées ; aucun outil Node n’est nécessaire sur l’hébergement.

## Validation

Les tests frontend vérifient les ordres numérique et alphabétique, les accents, l’ordre naturel, les valeurs égales et vides, les en-têtes multiples, les fusions horizontales, le refus des fusions verticales, la conservation des lignes et de leur mise en forme, ainsi que l’annulation/rétablissement.

Le navigateur intégré a servi à vérifier les tris croissant/décroissant, le changement de colonne, la case d’en-tête, l’annulation et la conservation après réouverture de la page. Le panneau a été contrôlé à 390 px sans débordement horizontal. Les pages existantes de l’installation locale ont été conservées.
