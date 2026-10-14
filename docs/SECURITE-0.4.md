# Audit de sécurité Feuillet 0.4

Audit de code et essais HTTP réalisés le **13 octobre 2026**. Les attaques ont ciblé des installations jetables contenant uniquement des données de test, sur SQLite et sur un MySQL local démarré et supprimé par les tests. Aucun test d’attaque n’a utilisé les cours, les réponses d’élèves ou le serveur OVH de l’utilisateur. Le dépôt et les données d’installation n’ont pas été publiés.

L’audit couvre l’installation, les sessions, les API de pages et de bases, les fichiers, les formulaires publics, les formules, les archives et les références de vues. Il établit les résultats ci-dessous pour les scénarios exécutés ; il ne constitue pas une certification ni une garantie d’absence de toute vulnérabilité.

## Problèmes reproduits et corrigés

La référence antérieure est le commit `4a6416a`, extrait en copie isolée avant les corrections. Six tests négatifs échouaient sur cette copie ; les mêmes familles de contrôles réussissent après correction.

| Entrée testée | Résultat antérieur effectivement observé | Correction 0.4 et contrôle |
|---|---|---|
| Page publiée contenant un bloc de base ou formulaire privé et des URL `javascript:` | Identifiants privés et URL actives conservés dans le JSON public. Aucun accès aux lignes privées ni exécution JavaScript n’a été démontré. | Retrait des blocs privés dans la projection publique ; validation des URL de blocs et marques. Test du JSON et du HTML échappé. |
| Corps JSON de plus de 4 Mio envoyé en HTTP `Transfer-Encoding: chunked` | Réponse 200 malgré la limite fondée sur `Content-Length`. | Lecture bornée du flux réel et refus 413, indépendamment de cet en-tête. |
| Texte PHP envoyé sous un nom `.txt` | Téléversement accepté et téléchargement de la source possible. Le fichier était conservé hors du dossier public et aucune exécution PHP n’a été observée. | Refus des MIME PHP et exécutables, y compris dans les sauvegardes. SVG, HTML, faux PDF et images aux dimensions excessives sont également testés. |
| Pièces jointes temporaires proches du quota d’un formulaire | Un envoi supplémentaire était accepté au-delà de 200 Mio. Le quota proche de la limite a été simulé par une taille en base, sans remplir le disque. | Calcul incluant le fichier entrant, verrou partagé par formulaire et contrôle d’appartenance à la session. |
| Formule `count(concat(...))` avec un texte intermédiaire de 110 000 octets | La taille intermédiaire dépassait le budget sans erreur parce que le résultat final était un nombre. | Budget de 100 000 octets appliqué aux concaténations intermédiaires. Aucune évaluation PHP, shell ou JavaScript des expressions. |
| Choix multiple CSV contenant `=1+1` | Export du tableau sous la forme `=1+1`, sans neutralisation. | Conversion puis neutralisation des cellules textuelles, y compris tableaux, espaces initiaux et signes de formule. Test de représentation CSV ; aucune exécution dans Excel n’est revendiquée. |

Les journaux de référence restent dans `work/security-v03-before.log` et `work/security-v03-before-csv.log`, hors de l’archive distribuée. Les tests reproductibles sont livrés dans `tests/security.py`.

## Installation réservée au propriétaire de l’hébergement

Avant correction, le premier visiteur d’un site non installé pouvait obtenir le jeton CSRF puis configurer un carnet SQLite avec son propre mot de passe. Cette possibilité ressortait du parcours d’installation et de l’ancien harness, qui n’exigeait aucun secret privé. Le jeton CSRF identifie une session ; il ne prouve pas la propriété de l’hébergement.

Le premier accès crée maintenant `storage/installation-key.txt`, un secret aléatoire de 32 octets encodé en 64 caractères hexadécimaux. Sa création exclusive est verrouillée, ses droits sont `0600` et sa valeur n’est jamais insérée dans une réponse HTTP. Le propriétaire lit ce fichier via FTP et colle la clé dans l’installateur. CSRF et clé doivent être valides **avant toute ouverture de base ou modification des données**. La clé est supprimée uniquement après activation atomique de la configuration privée.

Le harness vérifie que la clé est absente du HTML, qu’une clé incorrecte donne 403 sans créer de configuration ni base SQLite, qu’une clé correcte permet l’installation et que le fichier disparaît après réussite. Cette vérification est exécutée pour chaque installation de test SQLite ou MySQL. Le mot de passe administrateur exige 12 caractères et au plus 72 octets, conformément à la limite du hachage bcrypt utilisé ici.

Il faut pointer le sous-domaine vers **`public/`**. La configuration, les fichiers physiques, les sessions et la clé se trouvent en dehors de cette racine web. Les règles `.htaccess` privées complètent cette disposition sur Apache ; le serveur PHP de développement ne démontre pas leur exécution sur OVH.

## Contrôles vérifiés

- API privées : refus sans authentification ; opérations d’écriture refusées sans jeton CSRF ; méthodes HTTP contrôlées ; paramètres SQL liés.
- Sessions : refus d’un identifiant choisi par le client, rotation de l’identifiant et du CSRF à la connexion, ancien jeton inutilisable, cookies `HttpOnly` et `SameSite=Lax`, déconnexion et limitation des essais de connexion. Les options de session suivent les recommandations du [manuel PHP](https://www.php.net/manual/en/session.security.ini.php). Le cookie `Secure` dépend du HTTPS ; le transport TLS OVH n’a pas été testé ici.
- Texte et URL : HTML échappé, schémas d’URL contrôlés, titres et labels traités comme texte, CSP et `nosniff`. Les essais portent sur les réponses du serveur, pas sur un pentest complet de chaque navigateur.
- Fichiers : contrôle de format et MIME réel, images limitées à 20 000 pixels par dimension et 64 millions de pixels, noms physiques aléatoires, refus anonyme des fichiers non référencés publiquement, plages HTTP et PDF contrôlés. Ces couches reprennent l’approche du [guide OWASP de téléversement](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) ; elles ne remplacent pas un antivirus.
- Formulaires : token public distinct de l’administration, CSRF de session, typage des réponses, contrôle de propriétaire des fichiers, rejet des fichiers réutilisés ou expirés. Les réponses provenant d’un formulaire restent privées, même si la base est publique. L’utilisation d’un jeton de session pour les écritures suit le [guide CSRF OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
- Bases : filtrage SQL des lignes publiques avant chargement, absence de titres de relations privées dans `relation_labels`, mise à jour d’une cellule sans écrasement des autres champs, version optimiste, colonnes calculées protégées. Suppression de propriété et nettoyage des vues dans une transaction ; retour des versions avant/après pour éviter d’adopter une version étrangère.
- Sauvegardes : rejet des chemins dangereux, entrées ZIP dupliquées, MIME interdits et documents excessivement profonds ; limites de 1 Gio décompressé, 10 000 entrées et manifeste de 16 Mio. Un échec annule les données et retire les fichiers créés. Les identifiants de fichiers, pages, propriétés, bases, formulaires et accueil sont remappés ; les pages restaurées restent privées.
- Import distant : l’API Wikimedia contrôle le titre de fichier et le domaine HTTPS ; aucune URL arbitraire n’est acceptée et les redirections sont désactivées. Le scénario de refus d’une URL arbitraire est exécuté sans accès réseau ; la disponibilité du service Wikimedia n’est pas déduite de ce test.

## Pièces jointes temporaires : expiration sans perte de cours

Une pièce jointe de formulaire non envoyée expire après 24 heures. Avant un nouvel envoi, le nettoyage sous verrou traite au plus 100 pièces expirées. Il conserve les fichiers déjà utilisés dans une réponse, une page, une couverture, une icône de page ou de carnet, une révision ou une valeur fichier de base, publique ou privée. Les cas ambigus sont conservés par prudence.

Les fichiers abandonnés sans référence sont retirés et marqués expirés pour empêcher leur réutilisation. Le contrôle d’âge s’applique également à l’envoi d’une réponse. Le test vieillit des fixtures à 48 heures, confirme le refus d’un fichier expiré et la conservation des fichiers intégrés à un cours ou déjà envoyés. Le nettoyage est déclenché par les envois, sans tâche système obligatoire.

## Publication et confidentialité

La publication automatique est désormais activée par défaut pour les pages **déjà publiques**. Le brouillon et sa version publiée sont mis à jour dans la même transaction ; un conflit annule les deux. Une nouvelle page ou un enfant créé sous une page publique demeure privé. L’option de brouillon reste disponible dans les réglages. Le logo image du carnet devient volontairement public lorsqu’il est choisi par l’administrateur. Voir [REA-PUBLICATION-0.4.md](REA-PUBLICATION-0.4.md) et `tests/autopublish.py`.

Les filtres et colonnes masquées d’une vue règlent la présentation. Ils ne constituent **aucun contrôle d’accès** aux données de l’API : il faut rendre une base ou une fiche privée pour protéger ses valeurs. Un formulaire public permet la collecte, pas la lecture anonyme des réponses.

## Résultats et reproduction

Environnement exécuté : PHP CLI **8.5.11**, serveur HTTP PHP local, SQLite et MySQL local isolé. Les suites ouvrent leur propre port de boucle locale, créent une copie jetable et la suppriment à la fin. Elles n’utilisent pas une base MySQL système ou de production.

| Suite | SQLite | MySQL |
|---|---:|---:|
| `security.py` — attaques et frontières | 13/13 réussis | 13/13 réussis |
| `autopublish.py` — publication et icônes du carnet | 6/6 réussis | 6/6 réussis |
| `smoke.py` — contrats historiques en mode brouillon | 21 réussis, réseau réel inclus | 20 réussis, 1 réseau ignoré |
| `databases.py` — bases et formulaires | 12/12 réussis | 12/12 réussis |

Pour préserver les anciens tests de snapshots manuels, le harness désactive explicitement `auto_publish` après installation ; `autopublish.py` le réactive pour ses propres scénarios et vérifie aussi sa valeur par défaut initiale.

```sh
python3 tests/security.py
python3 tests/security.py --mysql
python3 tests/autopublish.py
python3 tests/autopublish.py --mysql
python3 tests/smoke.py
python3 tests/databases.py
```

L’option `--mysql` nécessite des binaires MySQL déjà présents. Aucun paquet ou service système n’est installé par les tests. Les journaux détaillés restent dans `work/`, séparés de la distribution.

## Limites connues

Il reste nécessaire de mettre à jour PHP, les bibliothèques et le serveur. La résistance à un afflux massif dépend des ressources du mutualisé ; les limitations applicatives ne garantissent pas la disponibilité face à un déni de service. Un formulaire public peut recevoir du spam. Les fichiers autorisés ne sont pas certifiés exempts de contenu malveillant, et le logiciel ne dispose pas d’un antivirus.

La neutralisation CSV réduit l’interprétation initiale de cellules comme formules. Une réouverture après réenregistrement dans certains tableurs peut modifier cette protection ; [OWASP décrit cette limite](https://community.owasp.org/attacks/CSV_Injection). Les essais ne certifient pas le comportement de toutes les versions d’Excel ou de LibreOffice.

Les limites de document, de ZIP et de calcul bornent plusieurs allocations, mais ne sont pas une mesure exhaustive de charge. Le gestionnaire de base conserve une limite de 5 000 fiches par chargement ; les gros volumes exigent des mesures dédiées. PHP 8.3/8.4, le vrai Apache OVH, ses permissions FTP, sa configuration TLS et ses quotas n’ont pas été exécutés dans cet audit local. Les tests HTTP ne remplacent pas une vérification après déploiement, ni un audit indépendant.

## Correction complémentaire après vérification du navigateur

Un document JSON comportant un nœud texte vide est accepté par certains anciens imports mais refusé par ProseMirror. Lors du test de démonstration, cela faisait ouvrir un éditeur vide, avec risque de remplacer le document à la saisie suivante. Le serveur retire les seuls nœuds texte vides et refuse les textes de type invalide ; le frontend applique également ce nettoyage à l’ouverture des anciens documents, sans supprimer leurs paragraphes ni leur contenu valide. Un contrôle supplémentaire couvre ce cas (13 tests de sécurité au total).

Les symboles Lucide sont recoupés avec le manifeste local, et le lecteur périodique force les règles publiques même si un administrateur est connecté. Ses tests couvrent le brouillon non publié, la révocation, les mises à jour des cartes et bases et l’absence de changement lié à une réponse privée.

## Ajouts vérifiés en 0.4.1

L’inventaire `file_usage` exige l’administrateur avant de chercher le fichier ou ses titres privés. L’héritage des sous-pages est désactivé par défaut ; son activation publie explicitement les descendants des parents publics, sans publier de racines privées ni de réponses de formulaire. Les branches supprimées sont ignorées, et les brouillons déjà publiés ne sont pas remplacés. Les couleurs de choix sont limitées à `#RRGGBB`, échappées au rendu ; les variantes d’accent ne traitent que des couleurs validées. La nouvelle suite `tests/workspace.py` couvre ces frontières et les comportements de restauration.

## Interface 0.5.0

Les sélecteurs et menus contextuels n’ajoutent aucun endpoint, rôle ou permission. Ils appellent les commandes déjà protégées par session, CSRF et validation serveur. Le menu public ne reçoit pas les actions d’administration. Une action de page vérifie l’ID réellement ouvert avant sa mutation ; les conflits et formulaires non enregistrés peuvent bloquer le changement de page. Un menu de publication ouvre la fenêtre existante et ne publie rien à l’ouverture du clic droit.

Les libellés, options et noms restent du texte rendu par React. Les couleurs d’état restent soumises à leur validation hexadécimale existante. Les dépôts de skills servent de références locales, sans scripts exécutés ni appel depuis le logiciel distribué. La mise à jour ne dispense pas de protéger l’installation PHP. Voir les résultats datés dans [TESTS.md](TESTS.md).

## Vérifications du partage — 0.5.1

La racine d’un lien est validée côté PHP ; elle doit être une page publiée active. L’index, les listes anonymes, recherches, catégories, carnets, liens de page et galeries n’affichent que sa branche publiée. Les enfants d’un parent privé ne sont pas traversés dans cette branche. Le fil d’Ariane ne révèle pas les parents extérieurs, même si le lecteur a une session administrateur. Sans racine, les listes anonymes sont vides. Les jetons de lecture ne recencent pas les cartes d’autres branches.

La suite `tests/sharing.py` reproduit les racines falsifiées/privées, les références vers une autre branche, le partage direct d’une sous-page, la conservation des racines et la révocation. Le paramètre root n’est pas un secret : une autre page déjà publique reste consultable par son lien direct. Les bases communes explicitement publiques et les médias publiés conservent leurs règles d’accès ; cette fonction n’isole pas les élèves par compte ou mot de passe. Les permissions admin, CSRF, protections médias et réponses privées restent testées par les suites existantes.

La conversion des anciens scopes NULL est transactionnelle et idempotente. Elle ne supprime ni fichier ni document. Les anciens accueils sont gardés et les imports restaurent toujours des copies privées. Aucun secret, cours réel, média privé ou configuration locale n’entre dans la distribution.
