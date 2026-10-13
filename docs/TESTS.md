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
