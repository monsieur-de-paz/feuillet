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
