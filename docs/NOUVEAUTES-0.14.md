# Feuillet 0.14 — Images, fichiers et blocs entre pages

## Une recherche d’images commune

Le sélecteur d’images réunit **Wikimedia Commons, Openverse et NASA Images** dans une seule liste. Il fonctionne pour les couvertures, icônes et images de contenu. Chaque résultat indique sa provenance et ses conditions de réutilisation ; la source, l’auteur et la licence restent attachés au fichier importé.

Wikimedia utilise aussi `thumb.wikimedia.org` pour ses miniatures : ce domaine officiel est désormais accepté. Openverse élargit les collections aux sources qu’il indexe. NASA Images apporte notamment des photographies de la Terre, des paysages, des sciences et de l’espace. Ses résultats renvoient à ses conditions de réutilisation, sans être présentés comme une licence Creative Commons.

Aucune clé n’est requise. Les résultats sont conservés dix minutes sur le serveur. Si un fournisseur ne répond pas ou limite ses requêtes, les autres continuent à fournir des images et un message le signale. Les résultats dépendent de la recherche et des services disponibles ; essayer aussi des mots-clés anglais peut aider.

## Déplacer des blocs dans une autre page

1. Saisir la poignée d’un bloc, ou sélectionner plusieurs blocs avec le rectangle de sélection.
2. Glisser sur un lien de sous-page, une carte de galerie, une sous-page en bas du document ou une page de la barre latérale.
3. Relâcher quand la destination est mise en évidence.

Les blocs rejoignent la fin du contenu de la destination, dans leur ordre initial. La page source est enregistrée avant l’opération. Les deux contenus sont modifiés dans une transaction ; un conflit de version conserve les contenus existants. **Annuler le déplacement** restaure les deux pages si aucune modification plus récente n’est intervenue. Les pièces jointes conservent leurs identifiants et leur nom.

Les réglages de publication de chaque page continuent de s’appliquer. Avec la synchronisation automatique désactivée, une modification de contenu reste un brouillon jusqu’à sa publication.

## Déposer des fichiers depuis son ordinateur

Déposer un ou plusieurs fichiers à l’endroit souhaité dans le contenu de la page. Un repère indique la position avant de relâcher la souris. Une progression apparaît pendant l’envoi ; les images sont insérées comme images et les PDF, sons et vidéos utilisent leur lecteur habituel. Les autres fichiers deviennent des pièces jointes à télécharger.

L’emplacement suit les changements du document pendant l’envoi. Un échec partiel conserve les fichiers déjà envoyés et signale ceux qui ont échoué. Si l’emplacement disparaît, les fichiers restent dans la bibliothèque. Les limites de taille et les formats autorisés de l’installation restent applicables. Le changement de page est suspendu pendant l’envoi.

## Aperçu des pièces jointes

Le bouton **Aperçu** ouvre une fenêtre au-dessus de la page, avec un fond assombri, le nom du fichier, un téléchargement et une fermeture. Les PDF utilisent PDF.js, les images et médias les lecteurs du navigateur, les textes un affichage échappé. Les formats bureautiques, archives ou autres formats sans lecteur disponible proposent un téléchargement. Aucun document privé n’est envoyé à un service tiers pour produire l’aperçu.

La même fenêtre est disponible pour l’administrateur et les visiteurs autorisés. Elle s’adapte aux petits écrans et aux thèmes clair, sombre et OLED. Échap ferme la fenêtre et le focus revient au bouton d’origine.

## Thème du système par défaut

Sans préférence enregistrée, Feuillet suit **Système** : clair ou sombre selon l’appareil, y compris si le système change pendant la lecture. Un choix manuel **Clair**, **Sombre** ou **Noir OLED** reste mémorisé. **Thème du carnet** permet de suivre l’apparence choisie par l’auteur.

## Installation et mise à jour

Cette version utilise les mêmes prérequis PHP et SQL. Elle ne modifie pas le schéma de la base. Depuis une installation existante, ouvrir **Réglages & sauvegardes → Vérifier**, puis installer la version proposée. La sauvegarde et le retour à la version précédente restent assurés par le système de mise à jour. Ne jamais remplacer `config.php` ni le contenu de `storage/` avec des fichiers d’une autre installation.
