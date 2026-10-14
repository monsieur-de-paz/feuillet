# Feuillet 0.5.2 — repérer son carnet et choisir ses couleurs

- Le carnet sélectionné garde un fond d’accent, un repère latéral et une coche. Son bouton expose aussi l’état sélectionné aux outils d’accessibilité, même quand on change de carnet sans ouvrir une autre page.
- La catégorie active (Tout, Classes, Articles ou rubrique personnalisée) est soulignée et plus marquée. Le repère ne dépend plus seulement de la couleur de texte.
- La palette générale possède des pastilles rondes de 28 px, des cibles de 44 px et une coche contrastée sur la couleur choisie. Les couleurs personnalisées Fond / Texte / Accent affichent leur valeur hexadécimale dans des champs réguliers. Les contrôles passent sur une colonne sur petit écran.
- Le panneau Réglages n’a plus de double marge à l’intérieur du formulaire. Les sections et commandes gardent un espacement régulier. Les cases à cocher restent alignées avec leur texte, sans hériter de la largeur des champs de saisie.
- **Modifier le carnet → Choisir un émoji pour ce carnet** ouvre le catalogue existant : recherche français/anglais, catégories, teints et variantes. Le choix reste dans le formulaire jusqu’à **Enregistrer** ; fermer le dialogue l’annule. Entrée dans la recherche ne valide pas accidentellement le carnet.

La version conserve les règles de partage et la migration des carnets de [0.5.1](NOUVEAUTES-0.5.1.md). Remplacer le code et les assets de l’archive, sans toucher à `config.php` ni `storage/`, puis recharger les onglets ouverts. Aucune nouvelle migration SQL, dépendance, permission ou modification de cours n’est introduite.

Voir [audit du correctif](AUDIT-INTERFACE-0.5.2.md) et [contrôles](TESTS.md).
