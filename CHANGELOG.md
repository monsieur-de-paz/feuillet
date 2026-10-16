# Historique des versions

## 0.13.0 — 16 octobre 2026

- Sélection de plusieurs blocs par rectangle depuis les marges, surbrillance adaptée au thème, ajout avec Maj et désélection par Échap.
- Déplacement groupé depuis une poignée, ordre conservé, entrée/sortie des titres dépliables et ouverture de la section de destination.
- Une transaction et une annulation pour le groupe ; contenus, attributs et fichiers conservés, paragraphes vides de structure valides.
- Poignées stabilisées dans les marges et près des enfants sélectionnés ; le texte reste sélectionnable normalement depuis un paragraphe.
- Référence REA et documentation Notion conservées avec limites explicites ; pas de modification du document pour la surbrillance.

## 0.12.0 — 16 octobre 2026

- Accueil public éditable à la racine : création dédiée ou choix d’une page, textes et blocs habituels, publication explicite.
- Galeries manuelles et liens choisis pour présenter des pages sans exposer un annuaire global ; chaque partage conserve sa branche.
- Administration uniquement dans la barre supérieure du lecteur ; thème et connexion regroupés à droite, adaptés au mobile et conservés après actualisation automatique.
- Crédit commun avec version courante et nouvelle signature « Monsieur de PAZ, enseignant en France », y compris installation, formulaires et lecteur PDF.
- Réglage d’accueil inclus dans les sauvegardes ZIP, remappé à l’import et privé après restauration.

## 0.11.0 — 16 octobre 2026

- Mises à jour par téléchargements publics GitHub, sans clé ni dépendance au quota anonyme de son API REST.
- Annonce Feuillet-release.json générée avec le ZIP et son SHA-256 ; version, taille, empreintes et chemins vérifiés avant installation.
- Suppression du formulaire d’authentification GitHub et nettoyage des anciennes préférences correspondantes.
- Préférences de notification, sauvegarde avant activation et retour arrière conservés ; guides de mise à jour actualisés.

## 0.10.2 — 16 octobre 2026

- Les liens vers les sous-pages affichent leur titre publié actuel au lieu du libellé conservé à la création, notamment « Sans titre ».
- Même comportement dans les colonnes et après actualisation automatique du lecteur ; les titres de brouillon restent privés.
- Correction immédiate des liens existants, sans réécriture de contenu ni nouvelle publication du parent.

## 0.10.1 — 15 octobre 2026

- Encadrés bleu, vert, jaune, rose et gris adaptés aux thèmes sombre et OLED en lecture publique et dans l’éditeur.
- Palette partagée : fond teinté sombre et texte du thème, au lieu d’un fond pastel clair sous du texte blanc.
- Métadonnées du verrou npm corrigées pour fflate et les versions minimales de Node, sans changement des bibliothèques compilées.

## 0.10.0 — 15 octobre 2026

- Accueil épuré : suppression du surtitre et icône d’import représentant un document entrant, dans toute l’interface.
- Publication : lien public sélectionnable, copie et partage natif avec repli vers la copie selon le navigateur.
- Carnets personnalisables directement depuis leur accueil : titre modifiable sur place, sélecteur complet d’icônes et couverture ajoutable, remplaçable, repositionnable ou retirable.
- Décorations privées conservées dans les sauvegardes ZIP, avec remappage des fichiers à l’import et inventaire des utilisations dans la bibliothèque.
- Enregistrements partiels validés et atomiques, sans migration de schéma SQL.

## 0.9.0 — 15 octobre 2026

- Accueil dédié à chaque carnet : pages récentes, toutes les pages et sous-pages, dates et statuts privé/public.
- Catégories synchronisées avec la barre latérale et filtre par titre, description ou étiquettes, sans mélanger les carnets.
- Création et import dans le carnet sélectionné, adresse d’accueil rechargeable et navigation précédent/suivant.
- Fil d’Ariane et titre d’onglet propres au carnet ; logo toujours relié à l’accueil général.
- Les réponses tardives d’ouverture d’une page ne remplacent plus une navigation ultérieure.

## 0.8.3 — 15 octobre 2026

- Logo du site sans fond ni cadre au survol, avec repère de focus clavier conservé.
- Boutons Nouvelle page et Importer une page de même largeur sur l’accueil.
- Fil d’Ariane de l’accueil réduit au nom personnalisé du site, sans séparateur, icône ou libellé Accueil.

## 0.8.2 — 15 octobre 2026

- Titres et sous-titres neutres : noir doux en clair, blanc en sombre et OLED, indépendamment de l’accent choisi.
- Même présentation dans l’éditeur et le lecteur public, pour les titres dépliables, galeries, quiz et fenêtres de réglages.
- Les anciennes couleurs de texte dans les titres sont neutralisées à l’affichage ; liens, sources et contrôles conservent leur accentuation.

## 0.8.1 — 15 octobre 2026

- Présentation de Feuillet centrée sur les notes enrichies auto-hébergées : installation, connexion, partage, formulaires, exports et guides.
- Nouveaux carnets initialisés avec Notes et Articles ; descriptions et catégories personnalisées conservées.
- Retour à l’accueil sans désélectionner le carnet ni fermer la navigation mobile ; titre du fil d’Ariane utilisable même sans page ouverte.
- Correction d’un accès nullable dans la progression des mises à jour ; scénarios de mise à jour indépendants de la version de développement.

## 0.8.0 — 14 octobre 2026

- Installateur moderne en trois étapes, illustration animée montagne/lac, réduction des mouvements, contrôles et erreurs conservant le formulaire.
- Refus d’une base déjà utilisée par Feuillet, reprise identifiée d’installation et configuration privée protégée.
- Mises à jour depuis les releases GitHub, contrôle quotidien, report/attente/ignorance et désactivation des notifications ; téléchargements publics sans clé dans la version actuelle.
- ZIP et manifeste vérifiés, sauvegarde préalable du code et de la base, verrou de maintenance et test du nouveau code par une nouvelle requête.
- Retour arrière après erreur de démarrage/migration ou interruption, moteur indépendant du bootstrap, archive privée de secours.
- Documentation d’installation et de restauration actualisée ; tests d’installation neuve et d’échecs de mise à jour sur SQLite/MySQL.

## 0.7.0 — 2026-10-14

- Poignée de déplacement fonctionnelle pour les blocs, repères de dépôt et entrée/sortie des sections dépliables.
- Contenu, médias et attributs conservés ; déplacement annulable et compatible avec la sauvegarde automatique.
- Accueil admin : pages récentes, activité de création/modification, reprise de rédaction.
- Logo/nom ouvrent cet accueil ; bouton de navigation déplacé près du titre.
- Import TXT, Markdown et RTF depuis le menu de page, l’accueil et les réglages.
- Bloc de lieu avec intégration publique Google Maps sans clé API ; URLs contrôlées.
- Nouveau logo vectoriel montagne/lac, PNG transparent et favicon.

## 0.6.1 — 2026-10-14

- Entrée depuis le titre mène directement au contenu, comme Tab, sans insérer un saut de ligne.
- Composition de texte au clavier préservée ; Maj + Entrée reste disponible pour un saut volontaire.

## 0.6.0 — 2026-10-14

- Tab du titre vers la rédaction ; retrait du bandeau permanent.
- Ajout de blocs par bouton flottant, commandes annuler/rétablir au-dessus du document.
- Mise en forme flottante uniquement pendant une sélection de texte.
- Titres dépliables 1/2/3 avec titre riche, contenu imbriqué et rendu public.
- Normalisation serveur du nouveau bloc ; Markdown, PDF et historique compatibles.
- Règles de publication existantes conservées.

## 0.5.4 — 2026-10-14

- Carnet actif souligné et coloré comme la catégorie ; coche, repère latéral et fond retirés.
- Largeur de navigation réglable à la souris et au clavier, bornée et mémorisée par navigateur.
- Rétablissement par double-clic/Entrée ; tiroir mobile et navigation masquée préservés.
- Hauteur du titre recalculée lorsque la zone de rédaction change de largeur.


## 0.5.3 — 2026-10-14

- Fond du carnet actif retiré à la demande de l’utilisateur ; coche, repère latéral et texte plus marqué conservés.


## 0.5.2 — 2026-10-14

- Carnet actif marqué par fond, coche et état accessible ; catégorie sélectionnée soulignée.
- Palette de couleurs régulière, cases personnalisées lisibles et marges des réglages corrigées.
- Catalogue d’émojis avec recherche et variantes pour les carnets, validé à l’enregistrement.


## 0.5.1 — 2026-10-14

- Sélection des blocs et images sans cadre noir, accent doux animé et focus clavier préservé.
- Marges des vrais dialogues corrigées, actions symétriques et menus adaptatifs.
- Carnets avec leurs pages et catégories ; migration sans perte du pseudo-dossier « Mon carnet ».
- Partage indépendant par branche, liens conservant la racine, filtres serveur sur navigation et recherche ; retrait de l’accueil configurable.
- Signature Feuillet / Sandro de PAZ et lien GitHub au bas des interfaces.
- Sauvegardes compatibles avec les anciennes pages d’accueil, restaurées comme pages privées ordinaires.


## 0.5.0 — 14 octobre 2026

Charte graphique documentaire : fonte système, surfaces neutres, lisibilité et focus ; sélecteurs communs recherchables ; clic droit contextuel et boutons équivalents pour les pages, blocs, couvertures et propriétés ; navigation compacte avec Plus d’outils ; choix du thème accessible au clavier ; barre de sélection repositionnée après défilement. Pas de nouvelle dépendance runtime ni de migration de contenu. [Guide](docs/NOUVEAUTES-0.5.md), [charte](docs/CHARTE-GRAPHIQUE.md), [audit](docs/AUDIT-INTERFACE-0.5.md).

## 0.4.1 — 13 octobre 2026

Navigation masquable par bouton ou raccourci configurable ; texte par défaut adapté aux thèmes ; variantes automatiques de l’accent pour sombre/OLED et contraste des boutons ; paramètre d’héritage public des sous-pages existantes et futures ; couleurs des choix d’état ; inventaire administrateur des utilisations de fichiers, y compris brouillons, publications et historique. URL des ressources versionnées pour les mises à jour. [Guide détaillé](docs/NOUVEAUTES-0.4.1.md).

## 0.4.0 — 13 octobre 2026

Accueil éditable, couvertures cliquables, vues liées et durcissement de la sécurité. Publication automatique des pages publiques, lecteur actualisé sans rechargement, galeries communes, présentations de blocs, icônes du carnet et de pages, émojis complets et thème personnel clair/sombre/OLED. Voir [Nouveautés 0.4](docs/NOUVEAUTES-0.4.md).

## 0.3.0 — 2026-10-13

- Bases de données persistantes : champs typés, relations, formules, agrégations et vues tableau/galerie/graphique.
- Formulaires liés aux bases, envois de fichiers et réponses privées.
- Catégories personnalisées par espace, avec migration des anciennes catégories et retrait réversible.
- Couvertures repositionnables ; réglages limités aux axes recadrés et enregistrement immédiat avec Terminer.
- Fil d’Ariane horizontal dans l’éditeur et le lecteur public, sans titre d’ancêtre privé ou de brouillon.
- Focus du titre à la création d’une page, thèmes blanc/sombre/OLED, palette d’accents et polices locales Quicksand/Fraunces.
- Visionneuse d’images et modification des boutons dans l’éditeur.
- Nom, sous-titre et taille maximale des fichiers configurables ; intitulé initial Feuillet.
- Publication et retrait en privé de toute l’arborescence d’une page.
- Sauvegardes ZIP format 3 : catégories, bases, relations, formulaires et réglages ; imports privés avec nouveaux IDs et tokens.
- Exports Markdown/PDF des blocs de bases et formulaires, valeurs calculées et noms de fichiers lisibles.
- README d’installation sur mutualisé et distribution précompilée sous licence MIT.

## 0.2.0 — 2026-10-12

- Création de sous-pages par `/page`, outils de sélection, couleurs et transformation des blocs.
- Redimensionnement des images, renommage des médias, icônes importées et recherche Wikimedia Commons.
- Galeries composables, espaces, styles globaux et individuels.
- Import/export Markdown, export PDF et sauvegardes enrichies.

## 0.1.0 — 2026-10-12

- Premier carnet web auto-hébergé : éditeur par blocs, pages, médias, publication, galeries et quiz.
- Backend PHP avec MySQL/SQLite et interface compilée utilisant le cœur libre de Tiptap.
