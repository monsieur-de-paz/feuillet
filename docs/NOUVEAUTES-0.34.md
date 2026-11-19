# Feuillet 0.34 — SVG et fichiers de toute extension

## Importer et retrouver ses fichiers

La bibliothèque, le dépôt dans une page et les champs Fichiers des formulaires acceptent désormais toutes les extensions : documents, archives, projets Scratch, fichiers CAO, sources de programmation, fichiers sans extension, etc. Les limites de taille du carnet et de PHP ainsi que les quotas des formulaires restent appliqués. Les fichiers sont conservés sans conversion. Les pièces jointes reçues par formulaire sont visibles dans la bibliothèque administrateur et restent privées tant qu’elles ne sont pas volontairement réutilisées dans une page publique.

Dans **Bibliothèque**, le menu **Filtrer par extension** affiche les extensions présentes, sans distinction entre majuscules et minuscules, et une option **Sans extension**. Le filtre fonctionne avec les dossiers et la recherche par nom. Pour retrouver les projets Scratch, choisir `.sb3`, par exemple.

## Utiliser un SVG

Importer le SVG dans les images, dans le sélecteur d’icône ou comme couverture. Il reste vectoriel, y compris dans les galeries et l’aperçu agrandi. Les dégradés, textes, styles internes, masques et animations SVG déclaratives restent utilisables. L’aperçu de fichier affiche également le SVG. Les icônes SVG récupérées automatiquement depuis un site utilisent le même circuit. Aucun SVG utilisateur n’est injecté dans le HTML de Feuillet.

L’extension PHP DOM est nécessaire ; le setup la vérifie. Les SVG doivent être des documents XML valides avec l’espace de noms SVG ; l’affichage est limité à 10 Mo et reste soumis à la limite générale des envois. Les doctypes SVG standards sont acceptés sans charger leur DTD. Les entités XML et les sous-ensembles internes sont refusés. Les images ou polices externes doivent être intégrées au SVG pour un rendu autonome. Les scripts sont désactivés, y compris lors de l’ouverture directe du fichier dans le navigateur.

## Affichage et téléchargement

Les formats pris en charge par le navigateur gardent leur aperçu. Pour les autres, Feuillet propose le téléchargement et l’ouverture dans l’application adaptée. Accepter une extension ne signifie pas exécuter un programme ou afficher son code HTML. Les sources PHP/HTML et les exécutables sont stockés hors de la racine web sous un nom aléatoire, puis servis en téléchargement `application/octet-stream` avec `nosniff`. Feuillet ne remplace pas l’antivirus de l’appareil qui ouvre les fichiers téléchargés.

Les sauvegardes exportent les originaux et les restaurent avec les mêmes contrôles ; aucune migration SQL n’est nécessaire.

Références de sécurité : [SVG utilisé comme image](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image), [isolation CSP sandbox](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox).
