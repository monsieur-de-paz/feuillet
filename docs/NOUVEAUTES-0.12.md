# Feuillet 0.12 — Un accueil public à composer

La racine du site peut afficher une page de votre choix. L’accueil de travail de l’administrateur et les accueils des carnets restent indépendants.

## Configurer l’accueil

1. Ouvrir **Accueil public** dans la barre latérale, ou la section correspondante de **Réglages & sauvegardes**.
2. Cliquer **Créer l’accueil** pour obtenir une page privée avec une introduction et une galerie vide. Il est aussi possible de choisir une page existante dans le sélecteur.
3. Rédiger avec les blocs habituels : titre, texte, couverture, images, liens, fichiers, colonnes et galeries.
4. Pour une sélection de pages, utiliser une galerie manuelle et choisir ses cartes, ou ajouter des liens de pages. Les cibles doivent être publiées.
5. **Publier** la page puis ouvrir **Voir l’accueil public**. Le bouton Administration de cette vue ramène à la connexion ; une fois connecté, Modifier ouvre l’éditeur de cet accueil.

Les brouillons restent privés. La publication automatique, si elle est activée, garde son fonctionnement habituel. Choisir une page privée ne publie rien : un accueil simple avec le nom et le sous-titre du site reste affiché en attendant sa publication. Le choix « Accueil simple du site » retire la configuration sans supprimer la page.

## Partager sans mélanger les groupes

L’accueil ne liste pas automatiquement toutes les pages publiques. Il montre sa branche publiée et les cartes/liens explicitement choisis dans son contenu publié. Une carte sélectionnée ouvre sa propre branche : les autres partages ne deviennent pas visibles dans son fil d’Ariane. Une page privée n’apparaît jamais comme carte publique.

La désignation d’une page comme accueil ne change pas son adresse ni ses droits. Pour retirer un ancien partage, il faut rendre sa page privée. Retirer une carte de l’accueil enlève son affichage à cet endroit, sans révoquer son lien public existant.

## Une barre supérieure cohérente

Le thème et Administration sont groupés à droite, avec une zone de connexion distincte et des espacements conservés sur petit écran. Le lecteur ne duplique plus ce lien dans le corps. L’actualisation automatique conserve l’ensemble des contrôles. Les formulaires publics utilisent également cette barre.

Le pied de page indique la version installée : « Propulsé par Feuillet 0.12.0, créé par Monsieur de PAZ, enseignant en France. » Le nom du logiciel reste lié à son dépôt GitHub.

## Installation et sauvegardes

Depuis 0.11, ouvrir **Réglages & sauvegardes → Vérifier** puis installer la version. Aucune clé GitHub et aucune migration SQL manuelle. Le réglage d’accueil est sauvegardé avec les pages : à l’import ZIP, il est appliqué seulement si les réglages sont demandés, et pointe vers la copie importée, qui reste privée.
