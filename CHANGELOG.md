# Historique des versions

## 0.5.3 — 2026-10-14

- Fond du carnet actif retiré à la demande de l’utilisateur ; coche, repère latéral et texte plus marqué conservés.


## 0.5.2 — 2026-10-14

- Carnet actif marqué par fond, coche et état accessible ; catégorie sélectionnée soulignée.
- Palette de couleurs régulière, cases personnalisées lisibles et marges des réglages corrigées.
- Catalogue d’émojis avec recherche et variantes pour les carnets, validé à l’enregistrement.


## 0.5.1 — 2026-10-14

- Sélection des blocs et images sans cadre noir, accent doux animé et focus clavier préservé.
- Marges des vrais dialogues corrigées, actions symétriques et menus adaptatifs.
- Carnets avec leurs pages et catégories ; migration sans perte du pseudo-dossier « Mon carnet ».
- Partage indépendant par branche, liens conservant la racine, filtres serveur sur navigation et recherche ; retrait de l’accueil configurable.
- Signature Feuillet / Sandro de PAZ et lien GitHub au bas des interfaces.
- Sauvegardes compatibles avec les anciennes pages d’accueil, restaurées comme pages privées ordinaires.


## 0.5.0 — 14 octobre 2026

Charte graphique documentaire : fonte système, surfaces neutres, lisibilité et focus ; sélecteurs communs recherchables ; clic droit contextuel et boutons équivalents pour les pages, blocs, couvertures et propriétés ; navigation compacte avec Plus d’outils ; choix du thème accessible au clavier ; barre de sélection repositionnée après défilement. Pas de nouvelle dépendance runtime ni de migration de contenu. [Guide](docs/NOUVEAUTES-0.5.md), [charte](docs/CHARTE-GRAPHIQUE.md), [audit](docs/AUDIT-INTERFACE-0.5.md).

## 0.4.1 — 13 octobre 2026

Navigation masquable par bouton ou raccourci configurable ; texte par défaut adapté aux thèmes ; variantes automatiques de l’accent pour sombre/OLED et contraste des boutons ; paramètre d’héritage public des sous-pages existantes et futures ; couleurs des choix d’état ; inventaire administrateur des utilisations de fichiers, y compris brouillons, publications et historique. URL des ressources versionnées pour les mises à jour. [Guide détaillé](docs/NOUVEAUTES-0.4.1.md).

## 0.4.0 — 13 octobre 2026

Accueil éditable, couvertures cliquables, vues liées et durcissement de la sécurité. Publication automatique des pages publiques, lecteur actualisé sans rechargement, galeries communes, présentations de blocs, icônes du carnet et de pages, émojis complets et thème personnel clair/sombre/OLED. Voir [Nouveautés 0.4](docs/NOUVEAUTES-0.4.md).

## 0.3.0 — 2026-10-13

- Bases de données persistantes : champs typés, relations, formules, agrégations et vues tableau/galerie/graphique.
- Formulaires liés aux bases, envois de fichiers et réponses privées.
- Catégories personnalisées par espace, avec migration des anciennes catégories et retrait réversible.
- Couvertures repositionnables ; réglages limités aux axes recadrés et enregistrement immédiat avec Terminer.
- Fil d’Ariane horizontal dans l’éditeur et le lecteur public, sans titre d’ancêtre privé ou de brouillon.
- Focus du titre à la création d’une page, thèmes blanc/sombre/OLED, palette d’accents et polices locales Quicksand/Fraunces.
- Visionneuse d’images et modification des boutons dans l’éditeur.
- Nom, sous-titre et taille maximale des fichiers configurables ; intitulé initial Feuillet.
- Publication et retrait en privé de toute l’arborescence d’une page.
- Sauvegardes ZIP format 3 : catégories, bases, relations, formulaires et réglages ; imports privés avec nouveaux IDs et tokens.
- Exports Markdown/PDF des blocs de bases et formulaires, valeurs calculées et noms de fichiers lisibles.
- README d’installation sur mutualisé et distribution précompilée sous licence MIT.

## 0.2.0 — 2026-10-12

- Création de sous-pages par `/page`, outils de sélection, couleurs et transformation des blocs.
- Redimensionnement des images, renommage des médias, icônes importées et recherche Wikimedia Commons.
- Galeries composables, espaces, styles globaux et individuels.
- Import/export Markdown, export PDF et sauvegardes enrichies.

## 0.1.0 — 2026-10-12

- Premier carnet web auto-hébergé : éditeur par blocs, pages, médias, publication, galeries et quiz.
- Backend PHP avec MySQL/SQLite et interface compilée utilisant le cœur libre de Tiptap.
