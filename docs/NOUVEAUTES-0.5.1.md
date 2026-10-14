# Feuillet 0.5.1 — carnets et partage par branche

## Ce qui change

- La sélection d’un bloc utilise un fond d’accent doux, avec une transition de 120 ms. L’image sélectionnée conserve ses poignées et une ombre discrète. Les champs de titre et de description utilisent un fond d’accent à 5 %, sans cadre ni ombre. Les gros cadres noirs sont supprimés ; les liens, champs et boutons gardent un focus visible au clavier. Les préférences de réduction des animations sont respectées.
- Les dialogues partagent leurs marges : catégories, icônes, bibliothèque et formulaires. Les actions sans texte sont carrées, 40 px sur ordinateur et 44 px sur mobile. Les noms et actions des catégories se répartissent sur deux lignes sur petit écran.
- **Carnets** remplace **Espaces**. Chaque carnet possède ses pages, sous-pages et catégories. Il n’y a plus de pseudo-dossier « Mon carnet » affichant les pages hors carnet.
- La signature « Propulsé par Feuillet, créé par Sandro de PAZ » et son lien GitHub apparaît au bas de l’éditeur, du lecteur, des formulaires, de l’installation et du lecteur PDF.
- Le système d’accueil visiteur est retiré. Chaque lien partagé ouvre une branche indépendante.

## Organiser ses carnets

Dans **Carnets**, le bouton **+** crée un carnet. Le bouton **⋯** de sa ligne change son nom et son icône. Ses catégories apparaissent juste au-dessous ; la roue de réglages permet de les ajouter, renommer, ordonner et retirer. La propriété Catégorie d’une page utilise les rubriques de son carnet.

Créer une sous-page lui attribue le carnet de sa page parente. **Déplacer** permet de changer de carnet ; les sous-pages suivent la page. Supprimer un carnet conserve les pages et les catégories dans un autre carnet. Si c’est le dernier carnet, un nouveau carnet « Mes pages » est créé pour conserver les contenus.

## Partager sans accueil général

1. Ouvrir la page destinée au groupe.
2. Publier la page et les sous-pages à rendre disponibles.
3. Copier le lien public dans le panneau **Publier / Publiée**.
4. Vérifier ce lien dans une fenêtre privée.

Un lien `index.php?page=ma-page&read=1` fait de **ma-page** la racine du visiteur. Les liens vers ses enfants ajoutent `root=<identifiant>` pour garder cette racine lors de la navigation, du rechargement, du retour arrière et de l’actualisation automatique. Une sous-page partagée directement devient sa propre racine. Le fil d’Ariane ne montre pas ses parents extérieurs au partage.

Les galeries automatiques ou manuelles et les blocs `/page` visibles par le lecteur ne proposent que des pages publiées de cette branche. Une carte vers une autre branche reste dans le brouillon de l’administrateur, mais elle est masquée dans ce partage. Pour l’afficher, déplacer la page dans la branche concernée. Les dispositions et ratios choisis restent conservés.

L’adresse sans page affiche une invitation à ouvrir le lien reçu, avec un accès enseignant. Elle ne liste aucun cours. **Espace enseignant** ou `index.php?edit=1` ouvre la connexion ; **Modifier** permet de revenir à l’éditeur lorsqu’on est déjà connecté.

### Portée du partage

La racine limite la navigation et la découverte, pas l’autorisation par groupe. Toute personne possédant le lien d’une **page publique** peut la consulter directement. Les bases explicitement publiques et leurs données restent partagées selon leurs règles propres ; une base commune insérée dans plusieurs branches conserve ses lignes publiques. Les réponses aux formulaires restent privées. Pour réserver des contenus à des personnes identifiées, il faudrait ajouter des accès ou liens protégés dans une version ultérieure.

## Mettre à jour

Sauvegarder SQL, `config.php` et `storage/`, puis transférer le code compilé de cette version. Ne remplacer ni la configuration ni les fichiers privés. Au premier chargement, une migration transactionnelle et idempotente transforme les anciennes pages et catégories sans carnet en un carnet **Mes pages**, renommable. Les carnets existants sont conservés ; aucun cours n’est réécrit ou republié et les versions ne sont pas incrémentées.

Les anciens accueils restent des pages ordinaires, avec leur contenu, leur publication et leurs fichiers. Leur désignation en tant qu’accueil devient inactive. Les anciens ZIP de sauvegarde restent importables ; les pages sont restaurées comme copies privées, dans de vrais carnets. Le champ historique `homepage_id` est ignoré. Le contrat `spaces` / `space_id` reste utilisé en interne et dans les sauvegardes pour la compatibilité ; l’interface affiche « Carnets ».

Voir [Maintenance](MAINTENANCE.md), [Architecture](ARCHITECTURE.md), [tests](TESTS.md) et [audit des menus](AUDIT-INTERFACE-0.5.1.md).
