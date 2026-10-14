# Audit de navigation et réglages — Feuillet 0.5.2

14 octobre 2026, mode **full**, périmètre : sélection de carnets/catégories, marges des réglages généraux et de l’apparence, palette, champs personnalisés et choix d’émoji du carnet. React/Tiptap et CSS existants, sans bibliothèque supplémentaire. Application des principes de [Make Interfaces Feel Better](https://github.com/jakubkrehel/make-interfaces-feel-better) et [Taste Redesign](https://github.com/Leonxlnx/taste-skill), selon la [charte](CHARTE-GRAPHIQUE.md).

| Domaine | Éléments inspectés | Résultat |
|---|---|---|
| Typographie | Noms des carnets, catégories, labels et codes de couleur | Nom actif en 600, catégorie soulignée, hexadécimal lisible |
| Surfaces | App, Customization, IconPicker et feuilles communes | Repères persistants, palette régulière, suppression de la double marge |
| Animations | Transitions de navigation et des contrôles existants | Aucun nouveau mouvement répétitif ; sélection marquée statiquement |
| Icônes | Coche de carnet, coche de couleur, catalogue d’émojis | Repères supplémentaires et catalogue partagé sans copier les données |
| Performance | Imports, build, pagination du catalogue | Aucune dépendance, chargement différé et pagination conservés |

| Sévérité | Emplacement | Avant | Après | Pourquoi |
|---|---|---|---|---|
| MEDIUM | App.tsx / interface.css, espaces-navigation | Carnet actif peu différencié, état non exposé sur son bouton | Fond d’accent, repère latéral, coche et aria-pressed | Comprendre quel carnet pilote la liste sans dépendre d’une couleur subtile |
| MEDIUM | App.tsx / interface.css, sidebar-filters | Couleur seule pour la catégorie active | Soulignement 2 px, poids 600, état aria-pressed | Cue statique lisible même avec un accent gris |
| MEDIUM | Customization.tsx / interface.css, theme-palette | Petits boutons colorés avec dimensions héritées et cercle inégal | Cible ≥44 px, cercle 28 px, coche contrastée | Cohérence géométrique et cible tactile sans confondre apparence et zone cliquable |
| MEDIUM | Customization.tsx / interface.css, appearance-colors | Champs natifs et valeurs sans présentation commune | Swatch et code hex, grille responsive | Couleurs personnalisées lisibles et champs alignés |
| MEDIUM | interface.css, notebook-controls | Formulaire imbriqué portant une deuxième gouttière | Une seule gouttière 24/16 px, séparateurs espacés | Ne pas comprimer le contenu du dialogue |
| MEDIUM | interface.css, cases des réglages | Champs de largeur 100 % hérités par les cases à cocher | Cases de 18 px, texte adjacent et alignement commun | Éviter une grande zone vide entre la case et son libellé |
| MEDIUM | App.tsx / IconPicker.tsx, carnet | Champ emoji manuel sans liste | Catalogue complet, recherche et variantes, choix confirmé par Enregistrer | Rendre le choix découvrable sans demander de connaître ou coller l’emoji |

Pistes rejetées : remplacer le navigateur natif de couleur par une bibliothèque lourde (contrôle natif suffisant et pas de dépendance) ; lancer une animation à chaque changement de catégorie (interaction fréquente, cue statique plus discret) ; dupliquer une liste réduite d’émojis (catalogue existant réutilisable).

Vérifications : TypeScript/Vite et Prettier ; 58 tests frontend, plus contraste/parité PHP-JavaScript sur 24 accents ; 9 tests HTTP customization sur SQLite jetable. Dans Chromium intégré : clic de carnet sans changement de page, coche et fond persistants ; Classes soulignée en 600 ; marges du panneau mesurées à 22/24/26 px et formulaire interne 0/0/24 px ; 16 cibles de palette identiques, cercles 28 × 28, coche sur l’accent ; 320 et 390 px sans débordement. Recherche robot, sélection, enregistrement et relecture du carnet fictif réussis ; son émoji d’origine 📖 restauré. Catalogue de carnet à 320 px sans débordement. Aucun réglage général ni cours existant modifié pour ces essais.

**Verdict : Approve dans le périmètre testé.** Non vérifiés : Safari/iOS, Firefox, lecteur d’écran et popup natif de couleur sur chaque OS ; préférence OS reduced motion, hébergement OVH réel. Les thèmes utilisent les variables adaptatives existantes, mais toutes les combinaisons de couleurs personnelles n’ont pas été parcourues visuellement.
