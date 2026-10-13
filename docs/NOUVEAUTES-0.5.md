# Feuillet 0.5.0 — les détails de l’interface

14 octobre 2026. Cette version modernise les contrôles et harmonise l’éditeur, la navigation, les réglages et les bases, en conservant les documents et droits d’accès existants.

## Choisir dans une liste

Les listes de l’application ont un menu commun avec une coche pour le choix courant. Si la liste dépasse six options, une recherche permet de retrouver un libellé, même sans taper ses accents. Les états colorés affichent leur couleur à côté du nom. Au clavier : Entrée/Espace pour ouvrir, flèches pour parcourir, Entrée pour choisir, Échap pour fermer.

Le contrôle garde les valeurs et validations natives du formulaire. La sélection fonctionne dans les réglages, propriétés, filtres, relations, galeries, présentations de fichiers et formulaires publics React. Les choix multiples et recherches de relations gardent leurs contrôles spécifiques.

![Le sélecteur commun dans un formulaire fictif sur mobile](feuillet-v05-form-mobile.jpg)

## Faire un clic droit

Dans l’administration :

| Cible | Exemples d’actions |
|---|---|
| Une page dans la navigation, ou le document hors d’un champ | Renommer, icône, apparence, propriétés, sous-page, duplication, déplacement, publication, exports, historique, corbeille |
| Un paragraphe ou une sélection | Transformer, couleur, gras, italique, déplacer, dupliquer, supprimer |
| Un fichier, bouton ou aperçu de lien | Modifier sa présentation, déplacer, dupliquer, supprimer |
| Une image dans l’éditeur | Agrandir, aligner, largeur complète, déplacer, dupliquer, supprimer |
| La couverture | Changer, repositionner, retirer |
| Le nom ou l’icône du carnet | Icône, réglages et navigation |
| Une propriété de base | Renommer, modifier, trier, filtrer, masquer, supprimer |
| Une cellule de base | Éditer directement sa valeur |

Le menu d’une page vise réellement la page cliquée, même si une autre est ouverte. Feuillet enregistre d’abord le brouillon avant d’ouvrir cette page pour une action. Un formulaire en cours ou un conflit de version peut empêcher le changement de page ; le message existant reste affiché et l’action ne s’applique pas à la mauvaise page.

Pour mettre en forme au clic droit, une sélection est conservée. Sans sélection, les actions Gras, Italique et Couleur par défaut concernent le paragraphe du curseur. Les commandes de déplacement et duplication concernent le bloc supérieur, notamment pour une liste ou un encadré.

Sur mobile, utilise le bouton d’actions de la ligne, celui de la page ou la poignée de bloc de la barre d’outils. L’appui long dépend du navigateur ; il n’est pas requis. Au clavier, Maj + F10 ou la touche Menu ouvre les actions ; flèches, Début/Fin et Échap permettent de les parcourir et les fermer. Maj + clic droit garde le menu natif. Les champs de saisie et la lecture publique conservent le menu du navigateur.

## Un carnet plus cohérent

La fonte système améliore l’intégration sur chaque appareil ; les autres polices restent disponibles. Les titres s’équilibrent sur plusieurs lignes, les chiffres des tableaux restent stables et les textes secondaires sont plus contrastés. L’accent reste personnalisable et conserve ses variantes automatiques sombre/OLED.

Les cibles des boutons sont agrandies, les groupes de menus sont séparés, le focus clavier est visible et le mouvement est court et discret. Le choix personnel du thème indique aussi si l’on suit le thème du carnet. La barre de sélection se replace après défilement et évite les outils fixes.

La navigation garde **Bibliothèque**, **Bases de données** et **Réglages & sauvegardes** visibles. **Plus d’outils** regroupe **Accueil visiteur**, **Corbeille** et **Se déconnecter**. Ce regroupement laisse davantage de hauteur à l’arborescence. Les espaces et catégories défilent si leur nombre augmente.

## Mise à jour

Aucune base nouvelle ni migration de contenu spécifique à 0.5.0. Sauvegarder puis remplacer les fichiers de la distribution, notamment `public/assets/`, `public/interface.css`, les scripts publics et `app/`. Conserver `config.php` et `storage/`. La version des URL statiques passe à 0.5.0 ; recharger la page après le transfert. Aucun build, abonnement ou service Node à faire tourner sur le mutualisé.

La [charte graphique](CHARTE-GRAPHIQUE.md) décrit les choix et les adaptations des deux dépôts de skills demandés. Le [rapport d’audit](AUDIT-INTERFACE-0.5.md) et les [tests](TESTS.md) distinguent ce qui a été vérifié des limites de validation.
