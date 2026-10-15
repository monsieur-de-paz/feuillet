# Feuillet 0.10 — Carnets personnalisables et partage

## Un carnet qui vous ressemble

Ouvrez un carnet dans la navigation. Depuis son accueil, cliquez sur le titre pour le renommer : Entrée ou un clic ailleurs enregistre ; Échap annule. Cliquez sur l’icône pour choisir un emoji, une icône web ou une image depuis un fichier, le presse-papiers, la bibliothèque ou la recherche d’images existante.

**Ajouter une couverture** ouvre la bibliothèque et la recherche Internet. Une couverture possède les mêmes outils que celle d’une page : Changer, Repositionner, Retirer. Après déplacement ou réglage au clavier des curseurs, **Terminer** enregistre ; **Annuler** rétablit la position précédente. Les changements du carnet sont sauvegardés automatiquement, sans publier ses pages.

Ces décorations appartiennent à l’accueil administrateur. Elles ne donnent pas d’accès public à leurs fichiers. La bibliothèque indique les carnets qui les utilisent ; les sauvegardes ZIP conservent images et positions et remappent leurs références à l’import. L’icône globale du site, visible aux visiteurs, reste un réglage distinct.

## Partager une page

Sur une page déjà publiée, ouvrez **Publiée**. Le panneau affiche son adresse publique avec **Copier le lien** et **Partager…**. Le second utilise la feuille de partage native lorsque le navigateur la propose ; seuls l’adresse de la page et ses paramètres publics sont transmis à l’application choisie. Le titre ou le texte d’un brouillon ne sont pas inclus dans la demande de partage. Annuler la feuille n’affiche pas d’erreur.

Le partage natif dépend du navigateur et nécessite un contexte sécurisé, normalement HTTPS sur votre hébergement. En cas d’absence ou d’échec de l’API, Feuillet copie le lien. Si le navigateur refuse également le presse-papiers, le champ reste sélectionnable et une instruction de copie manuelle apparaît. Voir [Web Share sur MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) et [Clipboard sur MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText). Aucune application ni API payante n’est nécessaire.

## Finitions

Le surtitre de l’accueil général est retiré. Une icône de document avec flèche entrante remplace l’ancienne flèche montante pour l’import de pages, de sauvegardes et l’ajout de fichiers. Le véritable partage utilise son propre symbole.

Aucune nouvelle dépendance de production ni colonne SQL. La distribution compilée s’installe comme les versions précédentes ; conservez config.php et storage/. Les résultats et limites des vérifications sont dans [TESTS.md](TESTS.md).

## Correctif 0.10.1 — encadrés lisibles

Les cinq couleurs d’encadrés suivent maintenant les thèmes clair, sombre et OLED, aussi bien dans l’éditeur que dans la lecture publique. Les fonds pastel sont réservés au thème clair ; les thèmes sombres emploient une teinte à 14 % mélangée à la surface courante. Le texte par défaut suit le thème. Aucun contenu enregistré ni réglage de publication n’est modifié.

## Correctif 0.10.2 — titres des sous-pages

Lorsqu’un bloc de lien était créé avant de nommer une sous-page, il gardait un libellé « Sans titre ». L’éditeur affichait le titre actuel, mais le lecteur serveur privilégiait ce libellé ancien. Le lecteur utilise désormais le titre de la page cible obtenu avec les mêmes droits de lecture : titre publié pour un visiteur, sans divulguer un changement encore en brouillon.

Les liens existants sont corrigés à l’affichage, y compris dans les colonnes. Aucune migration SQL ni modification des contenus n’est nécessaire. Pour une installation 0.10.x, le correctif ponctuel consiste à remplacer app/render.php par le fichier de cette version, puis recharger la page publique. Pour installer toute la version 0.10.2, utiliser la mise à jour intégrée ou l’archive compilée en conservant config.php et storage/.
