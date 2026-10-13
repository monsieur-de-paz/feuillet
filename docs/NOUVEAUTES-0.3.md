# Feuillet 0.3 — Un carnet à votre mesure

Cette version ajoute les bases de données et les formulaires, et complète les outils de rédaction et de personnalisation.

| Fonction | Où l’utiliser |
|---|---|
| Repositionner une couverture | **Repositionner**, glisser l’image ou ajuster l’axe actif, puis **Terminer**. Le cadrage est enregistré dans le brouillon ; publier pour mettre à jour la lecture publique. |
| Naviguer dans l’arborescence | Le fil d’Ariane horizontal en haut de l’éditeur et du lecteur public permet de revenir aux pages parentes. Sur mobile, le chemin peut défiler. |
| Saisir un nouveau titre | La création d’une page ou `/page` place le curseur dans son titre. |
| Changer le thème | **Réglages & sauvegardes → Apparence générale** : 16 accents, couleurs libres, blanc, sombre et noir OLED. Les propriétés d’une page proposent des réglages individuels. |
| Quicksand et Fraunces | Choix de police dans l’apparence. Les fichiers sont hébergés localement et accompagnés de leur licence. |
| Agrandir une image | Dans l’éditeur, cliquer sur une image ouvre la visionneuse animée. Zoom, déplacement et fermeture par Échap. |
| Modifier un bouton | Cliquer sur le bouton dans l’éditeur, modifier le texte ou l’adresse, puis enregistrer. |
| Renommer le carnet | Titre et sous-titre modifiables dans les réglages. L’intitulé initial est **Feuillet.** |
| Publier une arborescence | La publication inclut les sous-pages actuelles. La liste concernée est visible dans le panneau de publication. Le retour en privé concerne aussi les sous-pages. |
| Remettre les couleurs de base | Le bouton dédié remet le fond blanc, le texte et l’accent d’origine ; il conserve le choix de police et la largeur. |
| Limiter les fichiers | Limite choisie dans les réglages, accompagnée du plafond PHP et de la limite effective. |
| Personnaliser les catégories | Roue dentée sous la recherche : ajout, nom, ordre et retrait propres à l’espace actif. Attribution dans les propriétés des pages. |
| Créer une base | **Bases de données** ou `/base` : fiches, champs typés, relations, formules, agrégations et vues tableau, galerie ou graphique. |
| Collecter des réponses | `/formulaire` ou l’onglet **Formulaires** d’une base : questions, champs obligatoires, lien public et fichiers. Les réponses restent privées. |

Les bases stockent les données dans SQL, indépendamment des pages. La publication de la page ne publie pas automatiquement une base privée. Les formules et la configuration des champs sont décrites dans [BASES-ET-FORMULAIRES.md](BASES-ET-FORMULAIRES.md).

L’export Markdown et l’export PDF incluent une lecture des données intégrées. Pour restaurer les bases, relations, formulaires et médias ensemble, utiliser le ZIP de sauvegarde de format 3. Les sauvegardes précédentes restent importables ; toutes les copies importées sont privées.

## Mise à jour depuis 0.1 ou 0.2

1. Sauvegarder la base SQL, `config.php` et `storage/`, ainsi que les contenus exportés.
2. Envoyer la nouvelle version du code et remplacer les anciens assets compilés.
3. Conserver le fichier de configuration et tous les fichiers du stockage existant.
4. Ouvrir le carnet : les nouvelles tables et colonnes sont ajoutées automatiquement.
5. Vérifier une page privée, une page publique, un média, les catégories et une sauvegarde.

Les catégories historiques Classes/Articles deviennent des catégories modifiables dans chaque espace. Aucune page n’est supprimée par cette migration.
