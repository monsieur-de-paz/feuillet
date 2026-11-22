# Feuillet 0.35 — Cartes mentales

- Cartes mentales intégrées comme blocs : six dispositions, quatre styles, couleurs et contours personnalisables, sous-idées, liens libres, sections et contenus multimédias.
- Création accompagnée : choix idée indépendante ou sous-idée depuis le petit +, saisie immédiate, redistribution autour d’une bulle choisie directement sur la carte, animations et annulation.
- Sélection multiple par Maj + clic, déplacement groupé, suppression au clavier et copies indépendantes au clavier ou par clic droit, y compris entre pages.
- Import Markdown et TEX en cartes structurées, recherche, lecture des sections en grand, lien de partage personnalisable et export PDF.
- Consultation mobile : plein écran, commandes adaptées, recherche avec zoom sur l’idée, déplacement tactile et pincement. Les gestes physiques à plusieurs doigts restent à confirmer sur les appareils cibles.
- Projection des bases de données : boutons de téléchargement des pièces jointes et copie d’une colonne en liste.
- Isolation du presse-papiers des cartes vis-à-vis de l’éditeur ; validation serveur des contenus, références et médias.

## Utilisation

Dans une page, saisir `/carte mentale`. Le petit **+** propose une idée libre ou une sous-idée. **Maj + clic** sélectionne plusieurs bulles ; **Ctrl/Cmd + C et V** copie et colle des éléments indépendants. **Suppr** retire la sélection ; **Ctrl/Cmd + Z** annule. La recherche et le plein écran sont disponibles pour les visiteurs.

Le panneau **Style & détails** rassemble la présentation et les contenus. **Redistribuer** demande de choisir une bulle directement sur la carte. Importer un fichier MD ou TEX construit sa hiérarchie sans exécuter de code TeX.

La mise à jour ne demande pas de migration SQL. Installer l’archive complète depuis les réglages de Feuillet ; conserver `config.php` et `storage/` lors d’un transfert manuel. Les anciennes versions ne reconnaissent pas les nouveaux blocs : faire une sauvegarde avant toute restauration vers une version antérieure.

Les comptes rendus des essais locaux sont conservés dans [le guide des cartes mentales](CARTES-MENTALES-PREVERSION.md). Les gestes physiques de pincement doivent encore être essayés sur un véritable téléphone ; les calculs sont testés et les formats portrait/paysage ont été vérifiés dans le navigateur.

## Correctif 0.35.1

Une nouvelle carte part d’un écran vide. Saisir son titre puis choisir **Créer l’idée centrale** pour ouvrir les outils avec une seule bulle. Le titre devient celui de la carte et de son idée centrale par défaut. Les cartes déjà enregistrées ne sont pas modifiées.

Dans une bulle éditée par double-clic, **Entrée** ajoute une ligne. Cliquer en dehors de la bulle valide la saisie. La description conserve ses sauts de ligne à l’affichage et après enregistrement.

## Correctif 0.35.2

La création commence par **Feuille vierge** ou **Importer du Markdown / TeX**. Le premier parcours demande le titre de l’idée centrale ; le second propose **Choisir un fichier** (.md, .markdown, .tex) ou **Coller du texte**. Pour le texte, sélectionner Markdown ou LaTeX puis importer. Le même panneau est accessible depuis **Importer MD / TEX** dans une carte existante ; la confirmation permet d’ajouter les idées ou de remplacer la carte avec annulation possible. Aucun code TeX ou HTML n’est exécuté.

## Correctif 0.35.3

La lecture d’une section affiche les bulles de la carte plutôt qu’une liste de sous-sections. La bulle courante est signalée par **Vous êtes ici**. Cliquer sur une autre bulle change de section ; le chemin des parents, la vue d’ensemble, le zoom et le déplacement permettent de se repérer.

Les nouveaux imports retirent les commandes TeX de mise en page et les marqueurs Markdown du texte visible, tout en conservant la hiérarchie et les contenus utiles. Le lecteur nettoie aussi les anciens contenus sans les réécrire en base. L’import ne compile pas TeX : les schémas générés par du code et les images locales absentes ne peuvent pas être reconstruits ; un repère textuel signale ces éléments.

Validation : document TeX de référence anonymisé, tests des commandes imbriquées, titres centrés, tableaux, Markdown et ancien contenu mal formé ; navigation navigateur entre parent et sous-idées, vue d’ensemble et petit écran.
