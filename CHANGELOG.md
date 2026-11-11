# Historique des versions

## 0.24.1 — 2026-11-11

- Les poignées des tableaux apparaissent uniquement au survol de la ligne ou de la colonne correspondante, avec une transition discrète. Elles restent accessibles au clavier, visibles sur écran tactile et maintenues pendant leur menu.

## 0.24.0 — 2026-11-11

- Tableaux : boutons + en bas et à droite pour ajouter une ligne ou une colonne, poignées de sélection et menus contextuels près des cellules.
- Insertion au-dessus, en dessous, à gauche ou à droite ; suppression, en-têtes, fusion, séparation et vidage des cellules. Maj + clic étend la sélection à plusieurs lignes ou colonnes.
- Actions annulables, commandes accessibles au clavier, couleurs adaptées aux thèmes et tableaux larges défilants sur petit écran. Aucun changement de base de données.

## 0.23.1 — 2026-11-09

- Le code HTML est remis au cadre Feuillet identifié par un défi aléatoire, puis transmis par un canal attaché à ce document. Les lecteurs vidéo dans l’éditeur utilisent des points d’intégration validés.
- La consultation attend la confirmation de visibilité du serveur avant de réutiliser une page en mémoire. Le cache hors ligne utilise les copies en cas d’échec réseau et retire les autres adresses enregistrées pour une même page lorsqu’il détecte une dépublication. Les anciennes copies sont renouvelées au premier démarrage de cette version.
- Le plafond des formulaires compte aussi les pièces jointes déjà soumises, avec un total de 1 Go par formulaire. Le contrôle de propriété précède la validation des références de fichiers.
- Les règles Apache bloquent aussi les archives et journaux SQLite transférés dans la racine web. Les adresses ambiguës sont écartées avant les requêtes serveur vers des services externes.

## 0.23.0 — 2026-11-09

- Bloc Vidéo avec choix entre fichier local ou bibliothèque et lien Internet. Détection de YouTube, Dailymotion, TikTok, Vimeo et des fichiers vidéo HTTPS directs.
- Bloc Intégration HTML avec hauteur ajustable et chargement au clic dans un cadre isolé.
- Le bouton Ajouter un bloc est placé au-dessus du sélecteur de thème sur mobile.

## 0.22.0 — 2026-11-08

- Adresses courtes personnalisées pour les pages publiques et privées, configurables depuis le panneau de partage.
- Les pages privées exigent toujours la connexion administrateur. Les anciens liens et adresses personnalisées restent valides selon la visibilité de leur page.
- Les adresses sont uniques par installation. La lecture publique et le cache hors connexion suivent les mêmes droits d’accès que les liens d’origine.

## 0.21.1 — 2026-11-03

- Protection Apache contre les fichiers cachés, métadonnées Git, configurations et sauvegardes copiées accidentellement dans la racine web ; validation HTTPS conservée.
- HSTS sur les réponses HTTPS et exclusions Git/distribution renforcées pour les données privées, clés et sauvegardes.
- Contrôle des fichiers suivis, de l’historique et des archives avant publication, workflow GitHub à permissions minimales et suivi des dépendances.
- Politique de sécurité et bilan daté de l’audit du dépôt et des 36 archives ZIP déjà publiées.

## 0.21.0 — 2026-11-03

- Navigation publique par fragments de contenu, historique conservé et réutilisation des pages déjà consultées en mémoire avec vérification réseau.
- Moins de lectures SQL répétées pendant une requête publique et libération du verrou de session avant le rendu et les contrôles de médias.
- Priorité basse des images, décodage asynchrone, audio sans préchargement et préférence pour les emoji natifs.
- Manifest et service worker PWA : installation navigateur, copies publiques hors connexion sur activation explicite, limites de durée/nombre, actualisation et effacement.

## 0.20.0 — 2026-11-02

- Accent monochrome adaptatif : gris foncé en clair, gris très clair en sombre et OLED, avec contraste adapté des boutons.
- Mode personnalisé avec accents indépendants pour les thèmes clair, sombre et OLED, dans les réglages généraux ou ceux d’une page.
- Même résolution des couleurs côté PHP, éditeur et lecteur public ; choix conservés et retour aux couleurs de base complet.
- Apparence sauvegardée appliquée dès la connexion administrateur, sans devoir recharger la page.

## 0.19.1 — 2026-11-02

- Aperçus PDF sur OVH : suppression de la longueur HTTP forcée du moteur PDF.js et de son worker, incompatible avec la compression gzip appliquée après PHP.
- Nouvelle version des URL de chargement pour éviter les réponses incorrectes déjà mises en cache.
- Vérification du rendu de deux pages, du zoom et de la récupération complète des modules derrière Apache/gzip ; tests d’accès privés/publics conservés.

## 0.19.0 — 2026-11-02

- Miniatures privées de 96 à 1280 px, générées à la demande et réutilisées pour les icônes, galeries, aperçus de liens, vidéos et bibliothèque ; originaux conservés.
- Sous-pages : lignes épurées, cartes ou format compact, icônes redimensionnables, description et couverture optionnelles ; même structure visuelle en édition et lecture.
- Colonnes sans bordures : deux à quatre colonnes, espacement et proportions réglables, regroupement sans perte lorsque leur nombre diminue, adaptation aux petites largeurs.
- Rythme, surfaces des encadrés et galeries et états de survol harmonisés dans les thèmes clair, sombre et OLED.

## 0.18.0 — 2026-11-02

- Cartes de liens : titre, description, favicon et miniature récupérés automatiquement depuis Open Graph, Twitter Cards et les balises HTML.
- Actualisation explicite depuis le lien, cache d’une heure, images conservées localement et personnalisations faites pendant le chargement préservées.
- Accès administrateur et CSRF, téléchargements HTTPS bornés, validation DNS et redirections, rejet des réseaux non publics et des images actives.

## 0.17.0 — 2026-11-02

- Survol et focus des boutons et cartes avec couleur, bordure et léger déplacement ; mouvement réduit respecté.
- Icônes des liens : emoji, icône web, fichier ou image, avec retrait possible.
- Cartes avec image personnalisable ; visuels conservés entre présentations bouton/carte et remappés à la copie et à la restauration.
- Reconnaissance de cartes Notion HTML identifiables et conversion de liens texte par le menu contextuel.


## 0.16.2 — 2026-11-01

- Espacement des titres de contenu rééquilibré : davantage d’espace avant, moins après, en édition et en lecture publique.
- Styles partagés avec les encadrés et titres dépliables, sans ajouter de vide en tête de leur conteneur.


## 0.16.1 — 2026-11-01

- Onglets placés au-dessus du fil d’Ariane dans un groupe fixe commun, sans décalage lié à la hauteur des barres.
- Navigation ordinaire dans l’onglet actif ; ouverture supplémentaire uniquement par + ou Ouvrir dans un nouvel onglet du menu contextuel.
- Action contextuelle disponible dans la navigation, les cartes d’accueil et les liens de pages/galeries de l’éditeur.


## 0.16.0 — 2026-11-01

- Vidéos chargées uniquement après clic, dans le lecteur public et l’éditeur ; aperçu visuel et bouton Lecture accessibles.
- Miniatures personnalisables, capture d’une image après lancement dans l’éditeur ; droits, copie indépendante et sauvegarde des miniatures conservés.
- Onglets d’administration : ouverture des pages, sauvegarde avant changement, fermeture sans suppression, nouvelle page, titres actualisés et mémorisation locale des identifiants.
- Navigation clavier et barre horizontale adaptée au mobile et aux thèmes.


## 0.15.2 — 2026-11-01

- Collage indépendant des pages, galeries et pièces jointes ; nouveaux identifiants et fichiers physiques séparés.
- Sous-pages, couvertures, icônes, bases liées, relations, lignes, formulaires et quiz remappés dans la copie.
- Collage et création des dépendances dans une transaction, conflits sans écrasement et nettoyage des fichiers après échec.
- Dupliquer le bloc utilise le même moteur ; galeries dynamiques figées sur les pages copiées.
- Les anciennes copies liées ne sont pas réécrites ; refaire le collage après mise à jour pour les dissocier.


## 0.15.1 — 2026-11-01

- Couleurs explicites des textes et de tous les titres respectées, dans les encadrés et ailleurs, en édition et en lecture publique. Titres neutres par défaut.
- Sélecteur complet d’emoji partagé avec les pages, recherche et variantes ; action Retirer pour un encadré sans emoji.
- Absence d’emoji conservée à l’enregistrement et dans le rendu public.


## 0.15.0 — 2026-10-17

- Suppression du fond coloré des galeries dans l’éditeur, y compris en sélection.
- Nouvelles cartes de fichiers publiques : nom, format et taille hiérarchisés, aperçu et téléchargement séparés, mise en page mobile adaptée aux thèmes.
- PDF.js et worker servis par PHP avec type JavaScript explicite ; types MIME Apache fournis, scripts versionnés et alternative de téléchargement en cas d’échec.
- Commandes de couverture isolées des zones qui se chevauchent, zoom 100–300 %, cadrage publié/exporté et annulation fiable sur les carnets.
- Copier-coller structuré entre pages : Ctrl/Cmd+C puis Ctrl/Cmd+V, mises en forme, pièces jointes, galeries et titres dépliables conservés, collage annulable en une action.
- Validation du presse-papiers, limites de taille/profondeur et refus des URL actives ; droits des fichiers privés conservés.

## 0.14.0 — 2026-10-17

- Recherche d’images commune : Openverse, Wikimedia Commons et NASA Images, provenance/licence conservées et repli si un moteur est indisponible. Correction du domaine officiel des miniatures Wikimedia.
- Déplacement atomique d’un bloc ou d’une sélection vers une sous-page, une galerie ou la barre latérale, avec vérification des versions et annulation du transfert.
- Dépôt de plusieurs fichiers depuis l’ordinateur à une position précise, progression, insertion dans l’ordre et conservation des envois réussis en cas d’échec partiel.
- Aperçu des pièces jointes dans une fenêtre accessible commune à l’éditeur et au lecteur : PDF, images, audio, vidéo et texte ; téléchargement pour les autres formats.
- Thème Système par défaut, suivi des changements de l’appareil et conservation des choix manuels clair/sombre/OLED.
- Contrôles de sécurité des téléchargements d’images distantes et des aperçus, documentation utilisateur et technique actualisée.

## 0.13.1 — 16 octobre 2026

- Correction des mises à jour bloquées par une différence dans les fichiers déjà installés après FTP ; le manifeste local sert d’inventaire de sauvegarde.
- Sauvegarde des octets réellement présents, vérifiée avant remplacement, avec restauration des modifications et des absences après échec.
- Intégrité stricte conservée pour les téléchargements et le code activé ; chemin relatif indiqué en cas de fichier incorrect.
- Étape réellement interrompue affichée, sans fausses coches de réussite ; distinction entre absence de remplacement et restauration effective.
- Correctif de dépannage limité à app/updates.php pour les installations dont l’ancien moteur bloque la mise à jour.
- Typage du raccourci Alt + flèches pour le groupe de blocs corrigé et compilation complète rejouée.

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
