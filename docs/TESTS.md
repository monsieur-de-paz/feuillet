# Validation

Les tests HTTP de `tests/smoke.py` utilisent une **copie jetable** du logiciel, un mot de passe aléatoire, une base SQLite indépendante et un serveur PHP local sur un port libre. Ils ne se connectent à aucun serveur de production et ne modifient aucun cours réel. La variable `FEUILLET_CONFIG` est retirée de l'environnement du serveur de test, afin qu'aucune configuration externe ne soit réutilisée.

```sh
python3 tests/smoke.py
```

Pour inspecter les données temporaires et le journal PHP :

```sh
python3 tests/smoke.py --keep
```

Pour tester MySQL avec un binaire **déjà installé** :

```sh
python3 tests/smoke.py --mysql
```

Pour inclure la recherche et l'import réels depuis Wikimedia Commons :

```sh
python3 tests/smoke.py --network
python3 tests/smoke.py --mysql --network
```

Sans `--network`, seul ce scénario distant est ignoré ; les 20 autres ne nécessitent pas Internet.

Le test démarre une instance possédée par le test avec un dossier de données neuf, `--no-defaults`, un port local libre et une base dédiée. Les configurations système et les bases préexistantes ne sont pas lues ni modifiées. Le compte `root` sans mot de passe concerne exclusivement cette instance jetable, liée à `127.0.0.1`. Le serveur est arrêté à la fin. Ne jamais reprendre cette configuration de test en production.

Le chemin de la copie conservée est affiché à la fin. Les copies utilisent le dossier temporaire du système, ou `FEUILLET_TEST_WORKDIR` si cette variable est définie ; supprimer les copies conservées après inspection.

## Ce que vérifient les scénarios

| Scénario | Risque vérifié |
|---|---|
| Installation et connexion | Mot de passe choisi à l'installation, absence de compte prédéfini |
| Authentification et CSRF | Un visiteur ou une requête sans jeton ne peut pas écrire |
| Conflit de version | Une sauvegarde ancienne n'écrase pas une modification récente |
| Brouillon / publication | Les titres et textes du brouillon restent privés après publication d'une version précédente |
| Recherche | Seuls titres et textes publiés sont consultables aux visiteurs ; brouillons, pages privées et solutions de quiz exclus |
| Liens internes | Une référence vers une page privée disparaît du JSON et du HTML publics |
| Lecteur PDF | L’accès au lecteur obéit aux mêmes droits que le fichier, y compris via son URL directe |
| Documents | Un fichier privé est refusé même par son URL directe ; un fichier public supporte les plages d'octets et reste disponible si une autre page publique le référence |
| Quiz | Solutions et explications absentes de la page publique avant soumission ; correction serveur après réponse |
| Corbeille | Une page supprimée et ses descendants deviennent inaccessibles au public |
| Historique | Une ancienne révision se restaure en brouillon |
| Rendu HTML | Les textes sont échappés et les liens JavaScript refusés |
| Hiérarchie | Une page ne peut pas devenir son propre parent |
| Sauvegarde | ZIP lisible contenant JSON, HTML et fichiers ; import en copies privées sans écrasement |
| Espaces | Les noms d’espaces privés restent masqués ; les descendants suivent le déplacement de leur parent |
| Apparence | Styles globaux et overrides, icône image, sauvegarde conservant la couverture, couleurs CSS validées |
| Galeries manuelles | Sélection explicite, galerie vide réellement vide, IDs privés retirés du JSON public |
| Renommage | Noms cohérents dans les versions privées, publiques et anciennes ; extension conservée |
| Markdown | Accents, titres, listes imbriquées/numérotées/cases, tableaux, code, citations, liens/images et aller-retour structuré |
| Sauvegarde v2 | Espaces, styles, icônes et IDs de galeries remappés ; copies privées |
| Wikimedia | Import réel, source/auteur/licence conservés et affichés publiquement ; URLs arbitraires refusées |
| Migration | Passage depuis les colonnes de schéma ancien, conservation des pages et réexécution sans destruction |
| ZIP hostile | Un chemin `../` ne permet pas d'écrire hors du stockage |

## Résultats

Validation locale de **Feuillet 0.2.0**, le **12 octobre 2026** :

- **20/20 scénarios HTTP réussis avec SQLite**, sous PHP 8.5.11.
- **20/20 scénarios HTTP réussis avec MySQL**, sous PHP 8.5.11 et le binaire local MySQL 26.7.0.
- **12 fichiers PHP vérifiés par `php -l`**, aucune erreur de syntaxe.

Les commandes validées comprennent `--network` : la recherche et l’import Commons ont été exécutés réellement sur les deux pilotes. Les scénarios incluent les routes de recherche et de lecture PDF et ont été répétés sur les deux pilotes après leur ajout. La compilation et les gestes navigateur sont vérifiés séparément par le contrôle de l'interface. Les essais initiaux ont été répétés après l'ajout du module de sauvegarde ; aucun échec de sécurité n'est resté ouvert dans ces scénarios.

## Limites

- Le runtime disponible pendant le développement est PHP **8.5.11**. La déclaration PHP 8.3+ devra être complétée par des essais sur 8.3 et 8.4 si ces versions sont utilisées en production.
- Les deux pilotes SQLite et MySQL ont été validés localement. **MariaDB n'a pas été exécuté**, et le serveur MySQL réel d'OVH n'a pas été utilisé. Les paramètres et quotas de cette base restent à vérifier à l'installation.
- Le compte OVH n'a pas été utilisé. La création du multisite, les réglages PHP, DNS, SSL et les performances sur le mutualisé restent à vérifier lors de l'installation réelle.
- Le serveur PHP intégré ne lit pas `.htaccess`. La séparation de `public` et du stockage est testée localement ; les règles Apache doivent être confirmées sur l'hébergement.
- Les tests API ne suffisent pas à vérifier les gestes dans l'éditeur. Les contrôles navigateur sont consignés séparément après exécution.

## Contrôles navigateur exécutés

Une copie locale indépendante a été installée et peuplée de ressources de démonstration. Le logiciel distribué ne contient ni cette base, ni ces fichiers de cours, ni ce mot de passe de test.

- Connexion à l'espace enseignant et création d'une page privée depuis l'interface.
- Saisie `/titre`, filtrage du menu, choix d'un titre 2 avec flèche et Entrée, rédaction d'un paragraphe.
- Sauvegarde automatique confirmée puis persistance du titre et du texte après rechargement.
- Publication depuis le panneau dédié ; une modification ultérieure du brouillon n'apparaît pas dans la lecture publiée.
- Restauration d'une ancienne version depuis l'historique, avec mise à jour effective du contenu de l'éditeur.
- Ajout d'un PDF depuis le sélecteur de fichiers du navigateur, insertion et enregistrement du bloc ; lecteur PDF.js affichant les deux pages, avec navigation entre elles et texte sélectionnable.
- Recherche `station météo` retrouvant un cours par son texte, puis ouverture du résultat.
- Déconnexion et passage à la consultation élève ; notes privées absentes de la navigation. Quiz corrigé à **2/2**, avec explications, dans l'interface React et dans la lecture HTML simple.
- Vue de cours à **390 × 844** : largeur du document égale à celle du viewport (390 px), aucun débordement horizontal ; colonnes réorganisées et navigation accessible par le menu mobile.
- Éditeur à **320 × 780** : titre réorganisé sur plusieurs lignes, outils de rédaction sur deux lignes et menu d'insertion entièrement visible (de 12 à 308 px) ; largeur totale du document 320 px. La navigation fermée est retirée du parcours clavier.

Les captures `editeur-desktop.jpg`, `editeur-mobile.jpg`, `cours-mobile.jpg` et `quiz-mobile.jpg` servent de preuves de rendu. Après les corrections du build, un démarrage neuf de l'interface et une navigation vers le cours avec PDF et quiz ne produisent aucune erreur JavaScript capturée. Ces essais utilisent une taille d'écran mobile dans le navigateur ; ce ne sont pas des tests sur un appareil iOS ou Android physique. Les commandes de déplacement par menu sont implémentées ; le glisser-déposer de blocs façon Notion n'est pas revendiqué dans cette version. La lecture audio/vidéo repose sur les contrôles du navigateur et les formats compatibles, sans conversion serveur.

## Contrôles supplémentaires de la version 0.2

Les gestes suivants ont été exécutés dans la prévisualisation, en conservant les données des essais précédents :

- Création de l’espace « Essais de Feuillet » et d’une page à l’intérieur.
- Sélection de texte, menu flottant, couleur verte et transformation en titre 2 ; couleur et titre conservés après rechargement.
- `/page` créant une sous-page réelle, ouverture de celle-ci et retour au parent avec son lien conservé et son nouveau nom affiché.
- `/galerie` créant une galerie vide ; ajout d’une page existante et création d’une autre, inversion de leur ordre, trois colonnes et une ligne, puis persistance.
- Couverture sélectionnée dans la bibliothèque puis remplacée par une image Commons réellement recherchée et importée ; image chargée et crédits conservés après rechargement.
- Icône image collée depuis le presse-papiers dans son sélecteur.
- Image insérée, largeur réglée à 55 %, alignement à droite, renommage ; poignée déplacée au pointeur, largeur devenue 44 %.
- Import `.md` depuis le sélecteur de fichiers ; titres, accents, listes imbriquées, cases à cocher, citation, tableau et code consultables dans l’éditeur. Le titre initial du Markdown devient le titre de page pour éviter sa duplication dans les nouveaux imports.
- Personnalisation d’une page en serif, largeur large et fond crème ; police globale temporairement changée en monospace, avec conservation de l’exception serif sur cette page. Réglage global rétabli après vérification. Mode plein écran et bouton de sortie vérifiés.
- À 390 × 844 et 320 × 780, `scrollWidth === innerWidth`. À 320 px, les réglages de galerie et le menu de couleurs restent dans l’écran ; panneau de couleurs de x=9 à x=263, y=238 à y=473.

Les captures `feuillet-v02-desktop.jpg` et `feuillet-v02-mobile.jpg` montrent cette version. Le dernier chargement de l’interface ne produit aucune erreur JavaScript capturée.

Deux PDF ont été générés à partir du module de production, avec les mêmes données de démonstration et les médias locaux : deux pages avec couverture, galerie, texte coloré et image alignée ; trois pages avec texte français, gras, italique, listes imbriquées, tableau et 34 paragraphes. Les cinq pages ont été rendues et inspectées ; les accents, les liens et le dernier paragraphe sont conservés. Le navigateur intégré affiche le PDF prêt et son lien d’enregistrement. Son automatisation ne fournit pas d’événement de téléchargement pour ce lien `blob:` ; la récupération du fichier a donc été vérifiée séparément avec le même générateur. Ce contrôle ne prétend pas avoir observé la boîte native d’enregistrement.

Les derniers ajustements Markdown et de lecture galerie ont été recontrôlés localement : 19 scénarios hors réseau réussis, le scénario réseau ignoré dans ce passage ; les essais réseau réels réussis des deux pilotes restent indiqués plus haut.

Compilation finale : TypeScript, Vite et Prettier réussis. Interface principale environ **810 Ko de JavaScript** (251 Ko gzip) et **53 Ko de CSS**. Le générateur PDF et ses polices ne sont chargés qu’à l’export. PDF.js est également chargé séparément. L’audit npm des dépendances de production ne signale aucune vulnérabilité connue à cette date. Le build signale la taille du bundle et ignore l’indication React `use client` de Tiptap ; aucun échec de compilation.


## Version 0.3.0 — 13 octobre 2026

Trois suites HTTP indépendantes utilisent des copies jetables. Résultats locaux :

| Suite | SQLite | MySQL |
|---|---|---|
| Régression générale, publication, médias et sauvegardes | 21/21 réussis, recherche et import Commons réels inclus | 20 réussis, 1 scénario réseau ignoré |
| Personnalisation, catégories, couvertures et lecteur public | 9/9 réussis | 9/9 réussis |
| Bases, relations, formules, formulaires et exports | 12/12 réussis | 12/12 réussis |

La compilation TypeScript/Vite et la syntaxe des 13 fichiers PHP de l’application passent. Les tests des bases vérifient aussi conflits 409, erreurs et cycles de formules, validation des champs, confidentialité des relations et réponses, appartenance des fichiers, fermeture des formulaires et export/import ZIP réel avec remappage des IDs. Les imports restent privés ; les formulaires importés utilisent de nouveaux tokens et sont fermés.

### Parcours contrôlés dans le navigateur intégré

- Création d’une page : titre immédiatement actif, y compris après `/page` ; retour au parent par le fil d’Ariane.
- Repositionnement réel par glissement : pour la couverture portrait d’essai, la position verticale passe de 32 % à environ 19 %. Le réglage horizontal sans recadrage est désormais désactivé.
- Position 32 % enregistrée avec **Terminer**, conservée après rechargement ; la mise à jour publique reste une publication explicite du brouillon.
- Visionneuse d’image : zoom à 125 %, déplacement et fermeture ; modification du libellé et du lien d’un bouton.
- Renommage et ajout de catégories dans l’espace d’essai.
- Thème OLED : fond noir du document et de la fenêtre de réglages, accent violet ; application réelle de Quicksand et Fraunces puis remise à zéro des couleurs.
- Titre, sous-titre et limite d’envoi modifiés dans les réglages ; valeur effective de 1 Mo affichée lorsque choisie sous le plafond PHP.
- Base intégrée par `/base` : données persistantes, formule `7 × 2 = 14`, réponse de formulaire `9 × 2 = 18`.
- Formulaire : questions sélectionnées, ouverture du lien, ajout d’un fichier d’essai, confirmation d’envoi et réponse retrouvée uniquement dans l’administration. La requête HTTP anonyme sur sa pièce jointe reçoit 404.
- Prévention de la perte d’une fiche en cours : le changement de page est refusé tant que les modifications n’ont pas été enregistrées ou annulées.
- Lecture publique : chemin **Feuillet → Enseignement 2026–2027 → Les 4e → Les objets connectés**, retour à la page parente en conservant `read=1`. Aucun titre d’ancêtre privé ni titre de brouillon n’est inséré dans le lecteur ou l’index public.
- Éditeur et bases aux largeurs 390 et 320 px : largeur totale du document égale à celle du viewport. Lecteur public aux mêmes largeurs : chemin horizontal défilant sans débordement de la page ; les séparateurs et le titre courant restent affichables.

Les exports PDF ont également été générés avec le module réel du frontend : couverture recadrée, base avec valeurs calculées et noms de fichiers, formulaire, titres, liens et document Markdown long. Les six pages résultantes ont été extraites et les premières pages rendues pour vérifier leur lisibilité. Le PDF utilise Noto Sans ; les polices de l’interface ne sont pas reproduites dans l’export.

Captures : [lecture publique](feuillet-v03-public.jpg), [thème OLED](feuillet-v03-oled.jpg), [éditeur mobile](feuillet-v03-mobile.jpg). Les limites de validation sur PHP 8.3/8.4, MariaDB, le serveur OVH et Apache restent celles indiquées plus haut.


## Version 0.4.0 — 13 octobre 2026

Les sections précédentes décrivent les comportements des versions historiques, notamment la publication manuelle. En 0.4, la publication automatique des pages déjà publiques est activée par défaut ; les suites historiques la désactivent pour continuer à contrôler la confidentialité du mode brouillon. Toutes les installations de test restent jetables.

| Suite HTTP | SQLite | MySQL local |
|---|---|---|
| `smoke.py` | 21 réussis, réseau Commons réel inclus | 20 réussis, 1 scénario réseau ignoré |
| `customization.py` | 9 réussis | 9 réussis |
| `databases.py` | 12 réussis | 12 réussis |
| `homepage.py` | 6 réussis | 6 réussis |
| `security.py` | 13 réussis | 13 réussis |
| `autopublish.py` | 6 réussis | 6 réussis |
| `reader.py` | 5 réussis | 5 réussis |

Soit **72 scénarios par pilote**, avec le seul scénario réseau ignoré sur MySQL. Les tests couvrent l’accueil et ses droits, les vues liées et leur configuration, la synchronisation atomique des publications, les fichiers privés, les réponses de formulaires, les changements et révocations détectés par le lecteur, ainsi que la valeur zéro dans les cartes publiques. L’audit détaillé expose les attaques effectivement reproduites et les corrections : [Sécurité 0.4](SECURITE-0.4.md).

### Tests du frontend reproductibles

Après `npm ci` dans `frontend/` :

```sh
node tests/frontend.mjs
npm --prefix frontend run format:check
npm --prefix frontend run build
```

Le lanceur compile le code source réel dans un dossier temporaire puis le supprime. **29 contrôles** passent : 13 sur recherche/filtres/tris des vues, 6 sur les présentations, 7 avec Tiptap/ProseMirror sur les transformations et la conservation des contenus, 3 sur la suppression des nœuds texte vides d’un document ancien sans perte de texte. Il ne s’agit pas de 29 parcours navigateur. Les fichiers PHP de `app/` et `public/` passent aussi `php -l`. TypeScript, Vite et Prettier passent.

### Contrôles dans le navigateur intégré

- Boutons **Changer**, **Repositionner** et **Retirer** testés par clic réel, cadrage modifié par glissement et conservé après rechargement.
- PDF changé de lecteur en téléchargement, lien transformé en bouton, identifiants/adresses et contenu environnant conservés.
- Cellule Durée passée de 7 à 9, formule passée de 14 à 18 dans les deux vues liées ; relation recherchée par titre humain.
- Page publique déjà ouverte : description et valeurs de base actualisées sans rechargement ni nouvelle publication manuelle.
- Icône Lucide colorée du carnet identique dans les deux vues, puis remise de la marque par défaut ; modes sombre et OLED contrôlés puis préférence locale remise au thème du carnet.
- Galerie de l’accueil à ratio 4/3 : cartes de **338,5 × 322,664 px**, aperçus de **338,5 × 253,875 px**, titre 13 px dans les deux vues au viewport essayé.
- Galerie de démonstration portrait : cartes **166 × 316,641 px** à 390 px, **131 × 305,766 px** à 320 px dans les deux vues. Aucun débordement horizontal de la page ; les tables défilent dans leur conteneur. Bouton de thème flottant sur mobile.

Captures : [éditeur](feuillet-v04-editor.jpg), [lecture publique](feuillet-v04-public.jpg), [mobile](feuillet-v04-mobile.jpg). Ces exemples utilisent seulement des données fictives et une image de test générée localement.

Le build principal produit environ 947 Ko JS / 292 Ko gzip et 107 Ko CSS / 20 Ko gzip. Les catalogues d’icônes, le PDF et les émojis sont chargés séparément. Vite prévient de la taille de certains chunks ; la compilation réussit. Le repli Noto Color Emoji est un TTF de 10,7 Mo chargé si nécessaire. Les audits npm complets et production ne signalent aucune vulnérabilité connue pour le verrouillage examiné.

Validation locale sur PHP 8.5.11 et MySQL : aucun déploiement ni contrôle de performances sur le mutualisé OVH, PHP 8.3/8.4, MariaDB ou Apache réel. Ces vérifications restent nécessaires lors de l’installation.

L’archive installable 0.4 a été extraite dans un nouveau dossier, puis les 20 scénarios généraux hors réseau ont été rejoués avec succès sur cette distribution, y compris l’installation par clé privée. Aucun fichier de configuration, mot de passe, session, base locale ou média personnel n’est distribué.


## Version 0.4.1 — 13 octobre 2026

| Suite HTTP | SQLite | MySQL local |
|---|---|---|
| `smoke.py` | 20 réussis, 1 réseau ignoré | 20 réussis, 1 réseau ignoré |
| `customization.py` | 9 réussis | 9 réussis |
| `databases.py` | 12 réussis | 12 réussis |
| `homepage.py` | 6 réussis | 6 réussis |
| `security.py` | 13 réussis | 13 réussis |
| `autopublish.py` | 6 réussis | 6 réussis |
| `reader.py` | 5 réussis | 5 réussis |
| `workspace.py` | 12 réussis | 12 réussis |

Soit **84 scénarios par pilote : 83 réussis et un scénario réseau ignoré**. Les contrôles réseau réels de 0.4 restent datés dans leur section ; le chemin d’import Commons n’a pas changé en 0.4.1. Les installations restent jetables et les données réelles du carnet ne sont jamais réutilisées par les suites.

La nouvelle suite couvre raccourcis validés, héritage existant/nouveau/imbriqué, déplacements, restauration, révocation du parent, maintien des brouillons déjà publics, couleur par défaut, couleurs des états et sauvegarde, inventaire public/privé/historique, médias de bases et de formulaires, cartes indirectes de galerie et source d’accent préservée. Les requêtes anonymes sur l’inventaire sont refusées.

`node tests/frontend.mjs` réussit les **42 contrôles** des vues, présentations, documents et raccourcis de navigation, ainsi qu’un groupe de contraste sur **24 accents** en clair/sombre/OLED, texte des boutons et survols. Le groupe d’accent compare les résultats exacts avec PHP CLI. Compilation TypeScript/Vite, Prettier et syntaxe PHP réussies. L’avertissement Vite sur la taille du bundle reste présent ; l’interface principale représente environ 955 Ko JS / 295 Ko gzip.

Parcours observés dans le navigateur intégré :

- Masquage par le bouton près de la recherche, panneau principal revenant à x=0, réaffichage depuis l’en-tête ; raccourci initial L puis configuration B testée et remise à L.
- Sélection d’un paragraphe, application du rouge puis **Texte défaut** : retrait du style fixe, texte conservé ; couleur `rgb(243,244,246)` sur fonds sombre et OLED dans l’éditeur et le lecteur.
- Couleur d’état enregistrée avec le sélecteur, retrouvée en `--tag-color:#d44c47` dans les deux vues.
- Pour la source d’accent `#475569`, variante sombre `#92A1B5` et variante OLED `#7386A1`, identiques dans l’administration et le lecteur. Texte du logo noir sur son accent clair, fond OLED pur.
- Inventaire du fichier fictif : page publique, note privée et historiques affichés ; aucun titre de cours réel n’a été utilisé dans les assertions.
- À 390 et 320 px, ouverture et fermeture du tiroir par les boutons, puis bibliothèque et inventaire : `scrollWidth === innerWidth`, panneau restant dans l’écran.

Captures : [utilisations](feuillet-v041-usages.jpg), [accent OLED](feuillet-v041-oled.jpg), [bibliothèque mobile](feuillet-v041-mobile.jpg). Le thème personnel et le raccourci ont été remis à leur réglage initial après les essais. Les réglages globaux de l’utilisateur n’ont pas été remplacés par une palette de test.

Les limites sur OVH, PHP 8.3/8.4, MariaDB, Apache réel et les performances demeurent celles de la section 0.4.

La distribution 0.4.1 a également été extraite dans un nouveau dossier : les 12 scénarios `workspace.py` passent depuis cette archive. Les audits npm complets et de production du verrouillage 0.4.1 indiquent chacun zéro vulnérabilité connue au moment du contrôle. Cela ne garantit pas l’absence de toute faille dans le logiciel ou l’hébergement.

## Version 0.5.0 — 14 octobre 2026

Les huit suites HTTP ont été rejouées sur copies jetables : smoke 20 réussites + 1 scénario réseau ignoré, customization 9, databases 12, homepage 6, security 13, autopublish 6, reader 5, workspace 12. **83 réussites et un scénario réseau ignoré par pilote**, SQLite et MySQL. Les suites reader et workspace ont également été rejouées après la modification des styles de thèmes ; reader après l’unification du symbole de thème. Ces suites automatiques n’ont pas utilisé la base réelle du carnet.

`node tests/frontend.mjs` réussit **58 cas** : 42 cas existants et 16 cas d’interface (options groupées/désactivées, recherche sans accents, bornage de menus à 320/390/945/1280 px, ouverture au-dessus et viewport de clavier virtuel). Le groupe supplémentaire des **24 accents** réussit le contraste clair/sombre/OLED et la comparaison exacte PHP/JavaScript.

Compilation TypeScript/Vite, Prettier et syntaxe des **19 fichiers PHP** réussies. Aucune nouvelle dépendance npm. Le bundle principal représente environ **969 Ko JS / 300 Ko gzip** ; l’avertissement Vite de taille de chunk reste présent. Les audits npm complets et de production du 14 octobre indiquent chacun **0 vulnérabilité connue**, ce qui ne garantit pas l’absence de faille dans le logiciel ou l’hébergement. SHA-256 de `frontend/package-lock.json` : `1be3ff38a76c7823983860d66b763f48a6fe854ea00b411cbe2f5377bedc0b56`.

### Parcours du navigateur intégré

- Liste longue des raccourcis : recherche B, Entrée change la valeur locale ; réglage non enregistré. Échap ferme la liste et restaure le focus du combobox. Tab rejoint le champ suivant « Taille maximale d’un fichier ».
- Formulaire fictif relié à une base privée : le choix obligatoire vide affiche « Choisis une option » ; choisir « Objets connectés » puis Envoyer produit l’écran de succès. Aucune réponse réelle collectée pour ces essais.
- Bloc de texte fictif : clic droit, duplication puis Annuler ; sélection, clic droit, Gras puis Annuler. La barre de sélection ne recouvre plus les outils fixes.
- Galerie fictive : choix à la souris de trois colonnes, menu fermé et valeur affichée ; retour à deux colonnes sans modifier les cours existants.
- Bouton de poignée : les mêmes actions que le clic droit. Menu de page : Début/Fin, flèches, Échap et groupes de commandes.
- Action de sous-page sur mobile : « Renommer » ouvre réellement la sous-page cliquée, ferme le tiroir et focalise son titre.
- Propriété de base : clic droit, focus automatique sur Renommer, flèche vers Modifier la propriété **sans forcer le focus par un locator**. Recherche « relation » dans les types ; Échap ferme la liste en laissant l’éditeur du champ ouvert. Cellule : clic droit ouvre sa valeur ; Échap ferme seulement sa liste ; annulation sans changement de la fiche.
- Modes personnel Clair, Sombre et OLED : menu lisible, danger rose lisible en sombre, noir effectif `rgb(0,0,0)` en OLED. Lecture publique contrôlée avec la même fonte système et les symboles SVG de thème ; aucun menu d’administration injecté. Le choix personnel initial Clair a été restauré. Les réglages généraux et la publication des cours existants n’ont pas été changés.
- Transition du symbole de thème contrôlée au ralenti à 10 % : override temporaire **dans la copie d’aperçu seulement**, de 150 à 1 500 ms ; états intermédiaires observés, arrivée à opacity/scale 1 et blur 0, changement de sens pendant la transition. CSS normal restauré après l’essai. Le panneau Animations n’a pas été utilisé.
- App et formulaire à **390 × 844** et **320 × 740** : `document.documentElement.scrollWidth === innerWidth`. Menu de page à 320 : x 38, largeur 274 ; contrôles de menu 44 px ; barre supérieure et position sticky des outils à 104 px. Le menu reste dans le viewport. Overrides de viewport réinitialisés et onglets temporaires fermés.

Les essais sont locaux sous PHP 8.5.11, MySQL local et Chromium intégré. Safari/iOS, Firefox, lecteur d’écran, clavier virtuel réel, préférence de réduction du mouvement activée au niveau du système et audit WCAG complet ne sont pas vérifiés. La règle CSS de réduction du mouvement est inspectée. Aucun déploiement ni test de charge OVH, Apache, MariaDB, PHP 8.3/8.4 ou écran OLED physique effectué. [Audit de l’interface](AUDIT-INTERFACE-0.5.md).

La distribution précompilée a aussi été extraite dans un dossier indépendant : les 12 scénarios workspace passent depuis cette copie, et les styles communs de l’éditeur et du lecteur sont identiques dans le ZIP.

## Validation 0.5.1 — 14 octobre 2026

| Suite HTTP actuelle | SQLite | MySQL local |
|---|---:|---:|
| smoke | 20 réussis, 1 réseau ignoré | 20 réussis, 1 réseau ignoré |
| customization | 9 réussis | 9 réussis |
| databases | 12 réussis | 12 réussis |
| sharing (remplace homepage) | 15 réussis | 15 réussis |
| security | 13 réussis | 13 réussis |
| autopublish | 6 réussis | 6 réussis |
| reader | 5 réussis | 5 réussis |
| workspace | 12 réussis | 12 réussis |

**92 réussites et un scénario réseau ignoré par pilote.** Installations et bases jetables ; les tests ne touchent pas les cours de la prévisualisation. Les assertions des anciennes galeries ont été adaptées à la nouvelle règle de branche, en créant leurs cartes comme sous-pages. Les tests de sauvegarde conservent les anciens accueils comme pages ordinaires privées ; l’endpoint historique reçoit 410. Les tests de filtrage/tri des bases de l’ancienne suite homepage sont conservés dans sharing. Cette suite vérifie aussi la suppression du dernier carnet et la non-traversée d’un parent privé.

`node tests/frontend.mjs` : 58 contrôles réussis, plus 24 accents en clair/sombre/OLED et parité PHP/JavaScript. Prettier, TypeScript/Vite et syntaxe des 19 fichiers PHP réussis. Bundle principal environ 966 Ko JS / 299 Ko gzip ; l’avertissement de chunk Vite demeure. Aucun nouveau paquet ; audit npm du 14 octobre : 0 vulnérabilité connue.

Prévisualisation : copie SQLite privée faite avant migration ; comparaison des 27 pages préexistantes montre IDs, titres et versions identiques. Un carnet et des ressources fictives ont ensuite été ajoutés pour les essais de menus et de navigation ; les pages déjà à la corbeille ne sont pas restaurées. Les contenus, titres et versions des cours existants restent identiques ; seul leur rattachement à un carnet a changé dans les métadonnées et snapshots.

Essais Chromium intégré : catégories desktop avec marges 24 px et actions 40 px ; 320/390 px sans débordement et actions 44 px ; bibliothèque, icônes, panneau de fichier, clic droit image et sortie clavier ; sélection sans outline ; mouvement ralenti à 10 % puis CSS normal restauré ; dialogue OLED lisible puis Clair restauré ; galerie publique → sous-page avec racine conservée et fil d’Ariane limité. Signature visible dans l’administration et le lecteur, fournie aussi dans formulaires/installateur/PDF. Voir [audit des menus](AUDIT-INTERFACE-0.5.1.md) pour les mesures et limites.

Non vérifiés sur ce correctif : Safari/iOS, Firefox, lecteur d’écran, clavier virtuel physique, préférence reduced motion du système, PHP 8.3/8.4, MariaDB et déploiement Apache/OVH réel. La racine de navigation n’est pas un dispositif de comptes élèves : une page publique reste accessible par son lien direct.

Dernier contrôle après la capture du titre : exception CSS pour les champs de titre et de description du canevas, avec `outline:none`, bordure 0, ombre absente et fond d’accent à 5 % animé en 120 ms. Focus vérifié dans Chromium en clair et OLED ; la préférence Clair a été restaurée. Construction TypeScript/Vite et formatage relancés après ce correctif. La suite sharing (15 tests) a aussi réussi depuis une copie extraite de l’archive de distribution.

## Ajustements 0.5.2

TypeScript/Vite, Prettier et 58 contrôles frontend réussis, plus contraste/parité de 24 accents. La suite customization (9 tests) réussit sur une copie SQLite jetable. Les 92 contrôles HTTP par pilote de 0.5.1 restent la référence du backend ; ils ne sont pas présentés comme tous rejoués pour ce correctif de présentation. Chromium : carnet actif visible après clic sans changer de page, Classes soulignée, palette mesurée (cercles 28 px, cibles 44 px), réglages sans double marge et 320/390 px sans débordement ; sélection et sauvegarde robot puis restauration 📖 du carnet fictif. Catalogue mobile testé. Les réglages généraux existants sont conservés. Voir AUDIT-INTERFACE-0.5.2.md pour les limites.

### Ajustement 0.5.3

Correctif CSS ciblé du fond du carnet actif : transparent, repère latéral et coche conservés. TypeScript/Vite relancé et état visuel contrôlé dans Chromium. Les autres parcours et règles du backend ne sont pas modifiés.
