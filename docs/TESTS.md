# Validation

Les tests HTTP de `tests/smoke.py` utilisent une **copie jetable** du logiciel, un mot de passe aléatoire, une base SQLite indépendante et un serveur PHP local sur un port libre. Ils ne se connectent à aucun serveur de production et ne modifient aucune page réelle. La variable `FEUILLET_CONFIG` est retirée de l'environnement du serveur de test, afin qu'aucune configuration externe ne soit réutilisée.

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

## Validation 0.5.4

Construction TypeScript/Vite et formatage réussis. `node tests/frontend.mjs` : **70 contrôles** (58 précédents + 12 sur lecture de préférence, données invalides, minimum/maximum, viewport étroit et arrondi), plus les 24 accents et leur parité PHP/JavaScript. Aucune nouvelle dépendance. Le backend ne change que de numéro de version ; ses 92 tests HTTP par pilote de 0.5.1 restent la référence historique, sans les présenter comme rejoués ici.

Chromium intégré : nom du carnet souligné et sans coche, couleur exactement égale à celle de la catégorie ; glissement 230→330 px, marge principale 330 px et aucun débordement ; largeur 330 retrouvée après reload ; flèche droite→340 ; Fin→465 sur viewport 945 ; titre hauteur/scrollHeight 83/83 à cette largeur ; changement de catégorie conserve la largeur ; masquage supprime poignée et marge, puis réaffichage restitue la préférence ; Entrée et double-clic remettent 230 px. À 320 px, aucune poignée, variable desktop supprimée, tiroir 270 px et scrollWidth 320. La largeur 265 px observée avant les essais a été rétablie à la fin.

Les règles de nettoyage de perte de capture et blur sont inspectées ; une interruption physique de drag par changement d’application n’a pas été reproduite. Safari/iOS, Firefox, lecteurs d’écran, préférence OS reduced motion et installation OVH réelle ne sont pas vérifiés ici. Aucun contenu ou réglage de publication modifié dans les essais.

## Validation 0.6 — 14 octobre 2026

Compilation TypeScript/Vite et formatage réussis. `node tests/frontend.mjs` : **100 contrôles** (70 existants + 30 transactions réelles sur les trois niveaux dépliables : marques conservées, voisin intact, changement de niveau, roundtrip et retrait du conteneur), plus 24 couleurs d’accent et leur parité PHP/JavaScript.

Toutes les suites HTTP sont rejouées sur des installations jetables **SQLite et MySQL** : **98 succès et 1 scénario réseau ignoré par pilote** (20 smoke, 9 personnalisation, 12 bases, 15 partage, 13 sécurité, 6 autopublication, 5 lecteur, 12 carnets, 6 éditeur). La nouvelle suite `python3 tests/editor.py` / `python3 tests/editor.py --mysql` vérifie les trois niveaux publics, la confidentialité avant publication, l’imbrication, le retour Markdown, les structures refusées, l’échappement HTML et les révisions. Pas de service distant ajouté.

Chromium intégré : création d’une page avec focus titre, Tab dans la rédaction ; `/titre 2 dépliable`, saisie du titre et Tab vers le contenu ; absence de menu avec un simple curseur, apparition sur sélection, gras et annulation, disparition après désélection ; repli masquant réellement le contenu (`display:none`) et réouverture. À 320×740 : scrollWidth 320, bouton « + » 48×48, menu de sélection 278 px restant dans l’écran. Lecture publique vérifiée : section initialement repliée, ouverture au clic et contenu affiché. Génération d’un PDF de 132 Ko confirmée par le dialogue ; récupération du téléchargement via l’outil navigateur non confirmée. Les tests Markdown conservent exactement le JSON des titres dépliables.

Le téléchargement PDF dans un navigateur ordinaire, les claviers mobiles réels, Safari/iOS, Firefox, lecteur d’écran et hébergement OVH réel restent à vérifier. La préférence de publication des sous-pages n’est pas modifiée par cette version.

### Ajustement 0.6.1

Compilation et formatage rejoués. Dans Chromium intégré : nouvelle page, titre saisi, Entrée → focus « Contenu de la page », titre sans caractère de saut de ligne ; saisie immédiate d’un paragraphe dans le contenu, sans bandeau de texte affiché. Le backend hors numéro de version est identique à 0.6 ; les 98 tests par pilote ci-dessus restent sa validation.

## Validation 0.7 — 14 octobre 2026

Compilation TypeScript/Vite, formatage, syntaxe PHP et contrôle du diff réussis. **125 contrôles frontend**, plus les 24 accents et leur parité PHP/JavaScript. Les 25 contrôles de `block-moving` utilisent les vraies transactions ProseMirror : ordre, entrée/sortie de section, dernière ligne avec placeholder, imbrication, refus de cycle, fichiers/images/cartes et conservation exacte des marques/attributs.

Toutes les suites HTTP ont été rejouées sur copies jetables **SQLite et MySQL** : **105 succès et 1 scénario réseau ignoré par pilote** (98 existants + 7 imports/lieux/accueil). `tests/imports-places.py` contrôle TXT UTF-8/UTF-16, Markdown, styles RTF et Unicode, exclusion d’objets/texte caché, formats refusés, limite de taille, authentification, cartes publiques, URL Google contrôlée et roundtrip Markdown. Cette suite a aussi été rejouée après le refus supplémentaire des paramètres de clé/jeton. L’accueil anonyme n’expose aucune liste de pages privées.

Chromium intégré : déplacement d’un paragraphe sous un autre, entrée dans un titre dépliable et sortie ; fichier placé dans la section ; dépôt dans une section fermée qui s’ouvre ; annuler/rétablir retrouve les positions. À **320×740**, accueil en une colonne, scrollWidth 320, navigation avec un seul bouton à droite du titre (44×44), poignée de bloc à droite (44×44) et déplacement du paragraphe hors de la section. Vue ordinateur et largeur de navigation rétablies après les essais. Import RTF via le menu ⋯ : nouvelle page privée, gras/italique conservés ; clic sur le logo ouvre l’accueil avec cette activité récente. La carte Google charge son interface intégrée sans clé API. PNG du logo : 1024×1024, alpha nul aux coins et 6058 pixels anticrénelés.

L’observation REA porte sur la documentation publique Notion, pas sur les gestes d’un éditeur authentifié. [Preuves et limites](REA-BLOCS-0.7.md). Safari/iOS, Firefox, gestes sur téléphone réel et hébergement OVH réel restent à vérifier. Le téléchargement PDF dans un navigateur ordinaire garde la limite indiquée en 0.6 ; les exports de contenu et les adresses/liens restent contrôlés par les tests et le code.

## Validation 0.8 — 14 octobre 2026

Compilation TypeScript/Vite et formatage réussis, syntaxe des 25 fichiers PHP et du script d’installation vérifiée. Les 125 contrôles frontend et les 24 accents/parité PHP-JS passent. Audit npm de production : 0 vulnérabilité connue au moment du contrôle, sans nouvelle dépendance ajoutée.

Les suites HTTP existantes sont rejouées sur installations neuves jetables SQLite et MySQL. Elles sont complétées par 5 contrôles d’installation JSON et 11 contrôles de mise à jour : **121 réussites et 1 scénario réseau ignoré par moteur**. Installation : CSRF/clé avant SQL, limites de mot de passe, base existante protégée, configuration 0600, authentification immédiate, setup fermé, carnet vide puis création/publication/média/retour en privé. Les tests de fixation et rotation utilisent maintenant le nom de cookie propre à l’installation, sans affaiblir leurs assertions.

Mise à jour : droits/CSRF, contrat JSON des erreurs de vérification, préférences et jeton non renvoyé, chemins dangereux, empreintes et syntaxe PHP, erreur du point d’entrée d’administration détectée par une nouvelle requête, migration ayant changé un titre et créé une table puis restauration exacte, processus tué pendant l’activation, vérification abandonnée, URL GitHub autorisée, fichier non modifiable et dépôt Git, contrôle ne mettant pas les lecteurs en maintenance, succès préservant configuration/pages/médias/session. Une réponse de santé perdue après succès est reconnue comme déjà installée. Les scénarios de ZIP/migration sont des fixtures générées côté disque dans les installations jetables ; aucun endpoint de test ou contournement de vérification n’est livré. La suite updates est rejouée après les ajustements des verrous et du champ metadata `check_error`.

Le téléchargement réel de la release GitHub 0.7 a été contrôlé séparément : HTTPS, taille et SHA-256 de GitHub/fichier checksum concordants. Ce contrôle est historique ; le téléchargement public sans clé de la version actuelle est décrit plus bas.

Chromium intégré : setup étapes Hébergement/Carnet, validation/focus ; vues 320 et 390 px sans débordement, boutons 48 px, illustration et marges ; panneau de mises à jour, choix de notification et deux installations sur le même hôte sans collision de session. Les champs GitHub restent vides dans la copie utilisateur. Les préférences essayées sont remises à leur état initial.

Limites : PHP local 8.5, MySQL local et SQLite ; PHP 8.3/8.4, MariaDB, Safari/iOS, appareil tactile physique, lecteur d’écran, préférence reduced-motion OS et mutualisé OVH réel non vérifiés. La réduction des mouvements est prévue en CSS. Les vérifications de PDF conservent la limite de récupération du téléchargement documentée en 0.6 ; la version ne modifie pas ce moteur. Aucun déploiement OVH effectué.

## Correctif 0.8.1 — 15 octobre 2026

- Build TypeScript/Vite et vérification Prettier réussis.
- 125 contrôles frontend réussis et parité PHP/JS des accents sur 24 couleurs.
- Douze suites HTTP : **121 réussites et un scénario réseau ignoré par pilote**, sur SQLite puis MySQL. Installation neuve, partage, catégories, formulaires, sécurité et restauration des mises à jour vérifiés dans des copies jetables. Les scénarios de mises à jour dérivent maintenant leur version cible depuis la version installée.
- Installation neuve : catégories Notes/Articles et sous-titre généraliste ; absence des anciens textes pédagogiques dans l’installateur.
- Navigateur intégré : anomalie reproduite avant correction en cliquant le titre du fil d’Ariane sur l’accueil ; ce clic désélectionnait le carnet. Après correction, le carnet Essais et la catégorie Documents restent sélectionnés après clics sur nom, logo et fil d’Ariane. Passage à Tout puis ouverture d’une page depuis la barre latérale réussis.
- À 390 × 844 : retour depuis une page vers l’accueil sans fermer le tiroir mobile. Largeur du document égale au viewport, également contrôlée à 320 × 740. Retour au viewport normal après vérification.
- Aucun message d’erreur console observé dans le parcours local. Comparaison avant/après de la prévisualisation : 38 lignes de pages (corbeille comprise), 2 carnets, 12 catégories et 6 réglages identiques.

Les anciens comptes rendus ci-dessous/dans les versions précédentes peuvent citer des exemples de contenus d’enseignement ; ils documentent des vérifications historiques. La version livrée ne contient pas les contenus personnels de la prévisualisation. Le déploiement OVH réel, Safari/iOS et les autres navigateurs ne sont pas validés par ces essais.

## Titres neutres — 0.8.2

Build TypeScript/Vite, Prettier et 125 contrôles frontend réussis ; parité des accents sur 24 couleurs conservée. Vérifications ciblées de themeStyle, appearance_css et du script public theme.js : 36 cas couvrent les trois thèmes, trois accents, une couleur de paragraphe personnalisée et les changements de préférence du visiteur. Les titres restent neutres et l’accent de base est conservé.

Le chargement de l’éditeur actualisé a été observé dans le navigateur intégré. Le contrôle des couleurs calculées et du sélecteur de thème n’a pas pu être terminé : le navigateur a cessé de répondre. La validation visuelle finale des trois thèmes reste donc à faire ; les vérifications de code ne sont pas présentées comme une capture du rendu.

Suites HTTP ciblées `customization.py` et `reader.py` : 14 tests réussis sur SQLite et 14 sur MySQL, dans des installations jetables.

## Finitions de l’accueil — 0.8.3

Build TypeScript/Vite et Prettier réussis. Contrôles dans le navigateur intégré : les deux actions de l’accueil mesurent exactement 180 px ; le fil d’Ariane contient uniquement « Feuillet. » ; le logo effectivement survolé a un fond transparent et aucun contour. Après navigation au clavier (Tab puis Maj+Tab), le logo présente toujours un repère de focus de 2 px. L’ouverture d’une page rétablit le fil d’Ariane du carnet et de la page ; le retour à l’accueil conserve les carnets et catégories. Capture : Feuillet-0.8.3-accueil.png, livrée séparément des sources. Aucun texte ni document personnel n’a été modifié pendant ces vérifications.

## Accueils de carnets — 0.9.0

Build TypeScript/Vite, Prettier et **137 contrôles frontend** réussis ; parité des accents sur 24 couleurs conservée. Les 12 nouveaux contrôles de notebookHomePages couvrent l’isolation des carnets, les sous-pages privées/publiques, les filtres combinés, les recherches sans accents, le tri stable et la conservation des entrées.

Suites HTTP partage et imports : **23 tests réussis par pilote**, sur SQLite puis MySQL. Un scénario supplémentaire vérifie qu’un accueil de carnet ouvert anonymement, avec ou sans read=1, n’expose ni nom de carnet ni page privée et que l’API ne fournit aucun annuaire global. Copies jetables uniquement.

Navigateur intégré : carnets Mes pages (23 pages) et Essais (9 pages), retour au tableau général (32 pages), recherche premiere retrouvant Première ressource, catégorie Classes ne montrant que Les 4e/Les 3e et sélection reflétée dans la barre latérale. Catégorie vide, effacement des filtres, rechargement d’adresse et bouton Retour vérifiés. Le titre de l’onglet et le fil d’Ariane indiquent le carnet.

Une page privée de vérification a été créée depuis l’accueil Essais, retrouvée dans ce carnet puis placée dans la corbeille. La boîte d’import affiche ce même carnet comme destination ; aucun nouveau document n’a été importé dans la prévisualisation pour ce contrôle. Les imports de fichiers sont couverts par la suite HTTP. Aucun message d’erreur console observé.

À 390 × 844, choisir un carnet dans le tiroir le ferme et affiche son accueil. Aucun débordement horizontal à 390 px puis 320 × 740. Le viewport normal est rétabli. Capture Feuillet-0.9-carnet.png livrée séparément. Ces vérifications ne constituent pas un essai sur appareil iOS physique ou sur l’hébergement OVH réel.

## Carnets personnalisables et partage — 0.10.0

Compilation TypeScript/Vite, Prettier, contrôles frontend et parité de 24 couleurs conservés. La suite public-sharing couvre six cas : nettoyage de l’adresse, absence d’API, appel immédiat conservant l’activation utilisateur, succès, annulation et erreur avec repli vers la copie. **143 contrôles frontend** au total ; ils ne constituent pas des essais sur téléphone physique.

Les suites HTTP de régression, personnalisation, bases, partage, sécurité, publication, lecteur, carnets, éditeur, imports et installation passent sur SQLite et MySQL : **116 réussites et un scénario réseau ignoré par pilote**, avant la suite des mises à jour. La nouvelle suite notebooks.py comporte cinq tests : modifications partielles, validation atomique et images seules, confidentialité même avec une page publique, inventaire des utilisations, export/import ZIP réel avec remappage, droits et nettoyage après suppression. La suite de mise à jour passe également ses 11 tests par pilote avec le manifeste de distribution : **127 réussites et un scénario réseau ignoré par moteur** au total. Les contrôles comprennent sauvegarde préalable, installation réussie et retour arrière après erreur ou interruption. Les 26 fichiers PHP de app/ et public/ passent la vérification de syntaxe.

Navigateur intégré, dans une copie indépendante des données de prévisualisation : renommage direct puis persistance après rechargement, Échap annulant un autre nom, choix d’un emoji, ajout de couverture depuis la bibliothèque, position verticale à 100 % enregistrée et conservée, retrait et persistance du retrait. Le lien public copié est vérifié dans le presse-papiers. Le bouton de partage invoque l’API du navigateur ; sa feuille native n’a pas été inspectée et aucun destinataire n’a reçu le lien. Les chemins succès/annulation/repli sont vérifiés séparément dans le code réel par la suite frontend.

À 390 × 844, boutons de partage superposés et de même largeur (294 px). À 320 × 740, dialogue contenu dans l’écran (292 px de large) ; accueil du carnet et partage sans débordement horizontal. Viewport normal rétabli après contrôle. Captures livrées séparément des sources. Aucune modification des pages, noms ou réglages de la prévisualisation utilisateur pour ces tests. Les limites PHP 8.3/8.4, Safari/iOS/Android physiques, Apache et OVH réel restent celles des versions précédentes.

## Encadrés en lecture sombre — 0.10.1

Anomalie reproduite dans le lecteur public : fond bleu rgb(234,242,250) avec texte rgb(243,244,246). Après correction, une page de test isolée comporte les cinq variantes bleu/vert/jaune/rose/gris. Les couleurs calculées sont identiques dans le lecteur PHP et l’éditeur React pour chacun des thèmes clair, sombre et OLED. Contrastes mesurés dans ce scénario : minimum 17,73:1 en clair, 12,13:1 en sombre et 15,80:1 en OLED. Ces mesures concernent le texte par défaut, pas les couleurs personnalisées dans le document.

Le lecteur OLED à 390 × 844 ne présente aucun débordement horizontal. Les contenus et réglages des pages utilisateur sont conservés ; la page de palette est créée uniquement dans une copie de test indépendante. Capture Feuillet-0.10.1-encadres-sombre.png livrée séparément. Build TypeScript/Vite, Prettier, 143 contrôles frontend et parité de 24 couleurs réussis ; suites personnalisation et lecteur : 14 tests réussis sur SQLite et 14 sur MySQL. Les tests complets de 0.10.0 restent le socle de régression ; ils n’ont pas tous été rejoués pour ce correctif CSS.

Les versions des 106 paquets installés sont également comparées au verrou npm après correction des métadonnées fflate et des contraintes Node. Les fichiers compilés utilisent les mêmes dépendances que la version précédente.

## Titres de liens publics — 0.10.2

Anomalie observée sur une page publique en ligne : un lien affichait Sans titre alors que l’ouverture de sa cible affichait bien 4eme. Le lecteur PHP donnait la priorité au label initial du bloc, contrairement à l’éditeur React.

Nouveau scénario reader.py : lien à ancien label dans une colonne ; renommage de cible, publication et rendu HTML échappé ; changement de titre laissé en brouillon invisible même au lecteur public d’un administrateur connecté ; token inchangé pour le brouillon ; token et lien actualisés après publication de la cible sans republier le parent. Le document source conserve son label historique, sans mutation automatique. Les contrôles de partage vérifient toujours les liens vers des cibles privées ou extérieures à la branche.

Suites reader.py, sharing.py et smoke.py : **42 réussites et un scénario réseau ignoré sur SQLite**, puis mêmes résultats sur MySQL. Syntaxe PHP du fichier modifié et git diff --check réussis. Dans une copie de test indépendante, anciens liens Sans titre affichant 4eme et 3eme puis ouverture de 4eme confirmée dans le navigateur. Capture Feuillet-0.10.2-titres-liens.png livrée séparément. Le serveur OVH a seulement été consulté : le remplacement de code y reste à effectuer par l’administrateur. Le frontend compilé est inchangé pour ce correctif PHP.

## Mises à jour publiques sans clé — 0.11

Le dépôt est confirmé public. L’API REST était joignable depuis le poste de développement ; le refus observé sur OVH ne peut donc pas être attribué avec certitude à son quota ou à un ancien identifiant. Le nouveau transport ne dépend d’aucun des deux : annonce et fichiers téléchargés par leurs liens publics, sans requête à l’API REST.

Douze tests updates.py et cinq tests installation.py passent sur SQLite et MySQL (17 réussites par pilote, plus le parcours réseau complet) : droits et préférences, suppression d’anciennes données d’authentification sans les renvoyer, refus de l’ancienne option, validation de l’annonce publique, URLs autorisées/refusées, ZIP et SHA-256, syntaxe PHP, échec du nouveau point d’entrée, migration échouée et restauration exacte, interruption et récupération, délais et verrous, installation conservant configuration/contenus/session. Le nouveau test d’annonce couvre dépôt/tag/format/version/taille/hash et champs de texte invalides.

`python3 tests/update_public.py --network` (également --mysql) réalise une installation complète de la release publique réelle 0.10.2 dans une copie jetable : le code initial simule une version ancienne, garde un manifeste cohérent et est relancé dans un processus propre. L’ancienne préférence invalide est supprimée ; vérification anonyme, revalidation, téléchargement du ZIP/checksum, extraction, sauvegarde code/base, activation et requête de santé réussissent. La note privée et la configuration sont conservées ; le journal de maintenance est retiré. L’annonce publique de 0.10.2 a été ajoutée à sa release pour ce contrôle. Aucun serveur de production n’a été modifié.

Build TypeScript/Vite, Prettier, 143 contrôles frontend et parité de 24 couleurs réussis. Navigateur intégré : panneau 0.11, contrôle Vérifier sans erreur, absence du formulaire GitHub, texte sans clé ni compte et absence de débordement à 390 px. Capture Feuillet-0.11-mises-a-jour.png livrée séparément. Les tests réseau s’exécutent dans des copies privées locales et ne publient aucune note ni donnée utilisateur sur GitHub. Le transfert FTP et le fonctionnement sur le mutualisé OVH réel restent à effectuer et vérifier par l’administrateur.

## Accueil public — 0.12

Compilation TypeScript/Vite, format et 143 contrôles frontend réussis, avec parité de 24 accents. Les 13 suites HTTP passent sur SQLite puis MySQL (régression, personnalisation, bases, partage, sécurité, publication, lecteur, carnet, éditeur, imports, installation, décorations et nouvel accueil). `public_home.py` ajoute six scénarios : permissions et CSRF, création privée réutilisée, snapshots publiés/polling, sélection explicite et isolation des branches, corbeille/retrait, export/import avec remappage et nouveau crédit. Le lecteur PDF a aussi été contrôlé : le crédit ne dépend pas des helpers du rendu HTML.

Dans une copie indépendante : création, rédaction, sélection de deux cartes, publication et visite sans session. La racine affiche la page et son crédit 0.12.0, avec un seul lien Administration en haut. À 320 × 740, actions de thème et connexion séparées de 12 px, document de 320 px sans débordement ; mode OLED activable. Les données de la prévisualisation utilisateur sont conservées. Pas de modification de production OVH ; pas d’essai sur téléphone physique.

Mises à jour : 12 scénarios réussis sur SQLite et 12 sur MySQL, y compris sauvegarde et restauration après échec. Au total : 135 réussites et un scénario réseau ignoré par moteur. Les premiers essais parallèles ont manqué d’espace temporaire local ; après nettoyage des copies générées, les deux suites ont été rejouées séparément avec succès. Syntaxe des 27 fichiers PHP vérifiée. Actualisation réelle de l’accueil dans le navigateur : texte publié remplacé sans rechargement, lien Administration unique et groupe de thème conservés.

## Sélection et déplacements groupés — 0.13

La nouvelle suite `block-selection` passe 36 contrôles avec le vrai schéma Tiptap/ProseMirror : ordre, blocs non contigus, parents différents, insertion/extraction de sections, dernier enfant remplacé par un paragraphe valide, médias et attributs intacts, refus de dépôt dans son propre contenu, limites, normalisation parent/enfants, une annulation et un rétablissement, remappage des positions et décorations temporaires, intersections de rectangle. Avec les suites existantes : 179 contrôles frontend, plus la parité sur 24 accents. TypeScript/Vite et Prettier réussis.

Dans une copie locale indépendante, gestes souris réels : rectangle sur trois paragraphes ; déplacement ensemble sous une section ; insertion du groupe dans un titre replié qui s’ouvre ; sélection des trois enfants seuls puis sortie vers la racine ; Annuler/Rétablir en une action. Une anomalie de poignée disparaissant dans la marge a été corrigée et le parcours rejoué. Le résultat conserve l’ordre et la sauvegarde automatique. L’accueil public 0.12 et ses suites SQLite/MySQL restent le socle backend ; cette version change l’éditeur et la version affichée, sans SQL ni nouveau contrat API.

Compléments navigateur : ordre conservé après rechargement et disparition de la surbrillance temporaire ; sélection de texte laissant apparaître sa barre de mise en forme sans sélectionner de blocs ; Échap remettant le compteur à zéro ; rectangle commencé à droite sélectionnant les mêmes trois blocs. Suites HTTP éditeur et accueil rejouées : 12 tests réussis par moteur sur SQLite puis MySQL. Une frontière d’historique explicite sépare le déplacement de la frappe précédente ; la suite de sélection comporte désormais 36 contrôles, soit 179 contrôles frontend au total.

Archive 0.13 : les 12 scénarios de mise à jour passent séparément sur SQLite puis MySQL, dont échecs contrôlés, interruption et restauration. Contrôles du ZIP : CRC, empreintes de chaque fichier, cohérence version PHP/npm et annonce de release, exclusion de config.php et des données storage. Racine exacte / visitée anonymement, nouveau crédit 0.13.0, un seul lien Administration dans la top-bar, aucune commande d’éditeur et aucune page privée de test. À 390 × 844 OLED : largeur de document 390 px, commandes hautes de 44 px avec écart de 12 px.
