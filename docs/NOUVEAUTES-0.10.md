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
