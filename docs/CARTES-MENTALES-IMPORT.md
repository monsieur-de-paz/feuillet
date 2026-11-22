# Cartes mentales : import, navigation et partage

Préversion locale `0.35.0-dev.20`, non publiée sur GitHub.

## Importer

Dans l’en-tête de la carte : **Importer MD / TEX**. Le fichier est lu dans le navigateur, sans service externe. La confirmation indique le nombre d’idées et propose soit de les ajouter comme un nouveau groupe indépendant, soit de remplacer la carte. Les deux actions sont annulables.

- Markdown : titres `#` à `######` et titres soulignés avec `===` ou `---`. Les faux titres dans les blocs de code sont ignorés.
- TEX : `part`, `chapter`, `section`, `subsection`, `subsubsection`, `paragraph`, `subparagraph`, y compris les formes étoilées et titres courts facultatifs. Les accolades de titres sont équilibrées ; les titres et paragraphes sont convertis en texte.
- Le texte entre deux titres devient le contenu de sa section. Le contenu reste éditable dans **Texte de la section** à droite. Un clic côté lecteur ouvre la section en grand ; côté administrateur, utiliser **Explorer la section**. Les boutons de sous-section et précédent/suivant permettent de parcourir le document avec un déplacement de caméra.
- TEX n’est pas compilé. Les macros arbitraires, fichiers inclus, scripts, HTML et commandes shell ne sont jamais exécutés. L’import ne promet pas le rendu mathématique ou la mise en page d’un moteur LaTeX. Le texte des commandes non reconnues reste du texte.
- Limites explicites : fichier de 1 Mo, 300 idées au total, 20 000 caractères par section. Un document trop volumineux doit être découpé. Le fichier source reste sur l’ordinateur ; Feuillet enregistre la structure et le contenu extraits, pas une pièce jointe source.

Exemples : [Markdown](examples/carte-mentale.md), [TEX](examples/carte-mentale.tex).

## Créer et organiser

**＋ Idée libre**, le double-clic dans le fond et **Clic droit → Créer une idée indépendante** ne choisissent aucun parent. Le double-clic et le clic droit utilisent le point visé dans le repère de la carte ; le bouton cherche un espace libre proche du centre. La saisie reçoit son focus à son montage, sans attendre une animation de placement. Les boutons de sous-idée et Tab restent explicitement rattachés à leur parent.

Le clic droit d’une idée propose **Convertir en idée indépendante** ou **Convertir en sous-idée…**, avec sélection du parent. Les descendants sont conservés et les choix créant un cycle sont exclus. **Redistribuer** recalcule toutes les positions et cadre toutes les racines ; l’historique permet de revenir au placement antérieur.

Le zoom à la molette est ancré sous le pointeur, sur le fond comme sur les bulles. Les boutons de zoom utilisent le dernier point du canevas survolé, ou son centre si aucun point n’est disponible.

## Styles et dispositions

Le style ne change plus la disposition choisie. Chaque couple style/disposition a sa propre mémoire de positions. Un cache n’est restauré que si les idées, leurs parents, les textes, contenus, tailles et alignements correspondent toujours à son empreinte. Les anciennes mémoires par disposition sont conservées dans les sauvegardes pour compatibilité mais ne sont plus réutilisées entre styles.

La redistribution mesure les bulles et leurs sous-arbres, range les idées indépendantes en groupes et conserve les alignements au-dessus/en dessous explicitement choisis. Les liaisons adaptent leurs points d’attache aux branches verticales. Les tests couvrent les 24 couples sans chevauchement des surfaces sur une carte mêlant sous-groupes et racines indépendantes.

## Affichage et partage

Cliquer la poignée du bloc dans la page, puis **Options de la carte mentale**. Le bouton ⋯ de l’en-tête donne accès au même panneau. Les choix sont bouton d’ouverture, aperçu et carte entière.

**Créer une page dédiée** crée une copie indépendante, d’abord privée. On peut ouvrir et modifier cette page, personnaliser son adresse, puis publier cette copie seule. La page d’origine ne devient pas publique. Le lien utilise les mêmes règles d’unicité, de contrôle d’accès et d’adresses réservées que les pages Feuillet. Les changements ultérieurs de la carte source ne sont pas répercutés sur cette copie : éditer la page dédiée pour mettre à jour la carte partagée. Aucune dépendance cachée entre les deux cartes.

## Vérification

Compilation TypeScript/Vite et suite frontend complète ; tests de 24 couples style/disposition, conservation des relations et placements valides, redistribution déterministe, créations indépendantes, refus des cycles, invariance du point de zoom et imports MD/TEX. Six tests HTTP couvrent sauvegarde, publication, sections et validation des mémoires ; 14 tests de sécurité passent.

Dans le navigateur intégré : problème initial reproduit dans le dernier onglet ; essais suivants sur une copie locale sauvegardée, imports MD et TEX, ouverture et navigation de sections, créations avec focus vérifié, double-clic à un point contrôlé, conversions dans les deux sens, changement de styles et des six dispositions, redistribution, zoom mesuré loin de la racine, options depuis la poignée, création d’une copie privée puis publication locale avec adresse personnalisée et lecture sans connexion.

Le zoom testé conserve le point du monde sous le pointeur à l’erreur d’arrondi près. Ces vérifications ne constituent pas un benchmark de fréquence d’images à 300 bulles ni un essai tactile sur appareil physique. Les animations respectent la préférence de mouvements réduits ; le défilement de section est une vue de lecture, pas un moteur de présentations Prezi complet.

Aperçus de la validation finale : [carte et groupes](assets/cartes-mentales-navigation-import.png), [section en grand](assets/cartes-mentales-section.png). Le dernier contrôle de console de la préversion n’a signalé aucune erreur. Les essais de focus ont confirmé que le champ est l’élément actif dès sa création, y compris par le menu du fond.
