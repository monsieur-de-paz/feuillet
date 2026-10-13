# Feuillet 0.2 — guide des nouveaux outils

Feuillet est le nom définitif du logiciel. Cette version enrichit le carnet personnel et conserve le déploiement PHP/MySQL sur un hébergement mutualisé.

## Rédiger et organiser

- `/page` crée une nouvelle sous-page privée. Le lien inséré dans la page parente permet ensuite de l’ouvrir. La commande de lien vers une page existante reste distincte.
- Sélectionner du texte ouvre les outils de mise en forme : type de bloc, gras, italique, lien, couleur du texte et du fond. Transformer un titre ou une liste agit sur les blocs qui contiennent la sélection.
- `/galerie` crée une galerie indépendante, vide. Ajouter ou créer des pages, réordonner les cartes, choisir une liste ou une grille, puis régler les colonnes, les lignes et la forme des aperçus. Les anciennes galeries automatiques restent lisibles.
- Les espaces sous la recherche permettent de regrouper les pages par établissement ou activité. Ils ne créent pas de comptes supplémentaires et ne modifient pas les droits des pages.

## Images et fichiers

- Redimensionner une image avec ses poignées latérales, ou régler sa largeur avec les commandes de l’image ; choisir son alignement.
- Renommer un fichier depuis la bibliothèque ou les commandes du média. Son identifiant et son contenu restent stables.
- L’icône de page peut être un emoji ou une image importée. Ouvrir son choix d’icône avant de coller une image du presse-papiers avec Ctrl+V ou Cmd+V.
- Le même choix d’image sert aux icônes, aux couvertures et aux images du document. Il permet un fichier local, une image déjà importée ou une recherche Wikimedia Commons.
- Une image Commons choisie est téléchargée dans le stockage de Feuillet ; ses informations d’auteur, de licence et de provenance sont conservées. Certaines images imposent une attribution ou une licence spécifique : consulter l’indication affichée lors du choix.

## Importer, exporter et personnaliser

- Importer un fichier `.md` le transforme en page privée modifiable. Le Markdown décrit du texte structuré ; les fonctionnalités propres à un autre logiciel ne deviennent pas automatiquement des blocs Feuillet équivalents.
- Exporter en Markdown fournit le texte de la page et les références aux médias. Ce fichier seul ne contient pas les octets des pièces jointes ; le ZIP de sauvegarde reste le format pour les conserver ensemble.
- Exporter en PDF génère un document paginé dans le navigateur, puis affiche un lien **Enregistrer le PDF**. Les médias interactifs deviennent des références imprimables ; un PDF n’embarque pas les lecteurs audio, vidéo ou les actions du quiz. L’export utilise Noto Sans pour garantir les caractères français ; les colonnes du document deviennent une lecture séquentielle sur papier.
- Les réglages d’apparence globaux s’appliquent à toutes les pages qui en héritent. Une page peut avoir ses propres couleurs, sa typographie, sa largeur et son mode d’affichage.

## Mettre à jour une installation existante

Sauvegarder la base SQL, `config.php` et le dossier `storage/`. Remplacer les fichiers de code, les assets et les polices avec ceux de la nouvelle archive, en conservant la configuration et le stockage. Les nouvelles colonnes et tables sont créées automatiquement lors de l’accès à la base. Ne pas relancer `setup.php` sur une installation existante.

La prévisualisation locale est une installation séparée. Le remplacement du code n’efface pas les pages créées pendant les essais.
