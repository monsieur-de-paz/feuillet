# Feuillet 0.6 — une rédaction plus discrète

La barre de rédaction permanente laisse place à des outils proches du texte sélectionné. La publication et les réglages existants sont conservés.

## Écrire sans bandeau permanent

- À la création, le titre reçoit le focus. **Entrée** ou **Tab** mène directement au contenu ; **Maj + Tab** conserve le parcours inverse habituel.
- Le bouton flottant **Ajouter un bloc** ouvre le catalogue avec recherche. Si le paragraphe courant contient déjà du texte, un nouveau paragraphe est créé après lui ; un paragraphe vide est réutilisé. Les commandes `/` restent disponibles.
- **Annuler** et **Rétablir** sont placés au-dessus de l’éditeur. Les raccourcis Ctrl/Cmd + Z restent disponibles.
- Les contrôles de type, couleur, gras, italique, soulignement et lien apparaissent **uniquement pendant une sélection de texte**, au-dessus du paragraphe concerné. Un simple curseur ne les affiche pas. Ils disparaissent lors de la désélection ou du passage à un autre champ.
- Le menu de bloc reste accessible par sa poignée et par clic droit.

Sur mobile, l’ajout prend la forme d’un bouton rond « + ». Les outils suivent la sélection lors du défilement et restent dans la largeur de l’écran. Les animations respectent le réglage de réduction des mouvements.

## Titres dépliables

Choisir **Titre 1 dépliable**, **Titre 2 dépliable** ou **Titre 3 dépliable** depuis `/titre`, le catalogue d’ajout ou le menu de transformation du texte sélectionné. Le titre est un vrai champ de rédaction : sa mise en forme est conservée lors de la transformation. Son contenu peut comprendre du texte, des fichiers, des images ou d’autres blocs.

La flèche replie ou déplie la section. Les sections sont ouvertes pendant l’édition et initialement repliées dans la lecture publique. L’état ouvert/replié est propre à la consultation, pas une modification de contenu. **Tab** depuis le titre, ou **Entrée** à sa fin, mène au contenu de la section. Transformer ce titre en titre ordinaire conserve le contenu de la section.

L’export PDF comprend le titre et tout le contenu, même si la section est repliée. Le Markdown exporté reste lisible sous forme de titres ordinaires ; ses métadonnées Feuillet permettent de retrouver les blocs dépliables lors d’un réimport dans Feuillet. Une modification du Markdown hors Feuillet sans ces métadonnées conserve le texte, mais pas son caractère dépliable.

## Publication des sous-pages

Aucun changement des règles de partage : cocher **Publier automatiquement les sous-pages** dans les réglages généraux pour que les sous-pages existantes et futures de parents publics deviennent publiques. Cette option peut publier des sous-pages actuellement privées ; vérifier les contenus avant de l’activer. La synchronisation automatique du contenu d’une page publique est un réglage distinct.

## Ajustement 0.6.1

Entrée depuis le titre de la page mène directement à sa rédaction, sans saut de ligne. Maj + Entrée permet un saut volontaire ; la validation d’une composition de texte n’interrompt pas cette composition.

## Installer la mise à jour

Sauvegarder, puis remplacer les fichiers du logiciel et les assets compilés ; conserver `config.php` et `storage/`. Recharger les onglets d’édition. Aucune nouvelle table SQL ni dépendance. Après création de titres dépliables, conserver Feuillet 0.6 ou une version ultérieure : les versions antérieures ne reconnaissent pas ce nouveau type de bloc. Voir [maintenance](MAINTENANCE.md), [architecture](ARCHITECTURE.md) et [validation](TESTS.md).
