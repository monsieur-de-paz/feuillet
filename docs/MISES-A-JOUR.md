# Mises à jour de Feuillet

À partir de 0.8, les installations faites depuis l’archive **Feuillet-x.y.z.zip** peuvent télécharger et installer les releases stables de `monsieur-de-paz/feuillet`, sans SSH, Composer, Node ou VPS. L’installation demande toujours un clic de l’administrateur. Une visite publique ne déclenche aucun contrôle GitHub.

## Choisir quand installer

Une vérification a lieu au plus une fois par jour à l’ouverture ou au retour dans l’administration, tant que les notifications sont activées. Elle n’interrompt pas la rédaction. Le bandeau ouvre **Réglages & sauvegardes → Mises à jour** ; le bouton Vérifier permet un contrôle manuel, avec au moins une minute entre requêtes.

- **Installer** : enregistrer la page courante, télécharger, vérifier, sauvegarder, remplacer le code et tester le démarrage.
- **Reporter de 7 jours** : masquer les notifications pendant une semaine. L’installation manuelle reste disponible.
- **Attendre la suivante** : ne plus notifier cette version ou une version antérieure ; notifier une version stable ultérieure.
- **Ignorer cette version** : masquer ce numéro uniquement.
- Décocher **M’informer des nouvelles versions** : arrêter les notifications et les vérifications automatiques. Le contrôle manuel reste utilisable.

Réactiver les notifications remet à zéro les reports et exclusions. Ces choix sont conservés dans le stockage du serveur, pas seulement dans un navigateur. Les brouillons et les préversions GitHub sont exclus ; aucune rétrogradation automatique n’est proposée.

## Hébergement et téléchargements publics

PHP 8.3+, `curl`, `zip`, `tokenizer`, HTTPS sortant vers `github.com` et les serveurs officiels de téléchargement GitHub, ainsi que les droits du propriétaire sur le code et le stockage sont nécessaires. Aucun `777` n’est requis. Un espace libre suffisant pour la release, l’extraction, le code précédent et la base est indispensable. Le contrôle d’espace disponible est indicatif : une erreur d’écriture interrompt l’installation avant toute activation ou déclenche une restauration.

Un dossier contenant `.git` est une copie de développement : utiliser Git pour cette copie, ou installer une distribution ZIP séparée. Le manifeste vérifie les fichiers originaux de la distribution. Des modifications manuelles du code rendent cette vérification invalide ; conserver ces modifications séparément et les intégrer avant de mettre à jour par FTP.

Les mises à jour sont publiques : aucune clé, aucun jeton ni compte GitHub n’est nécessaire. Depuis 0.11, Feuillet lit `https://github.com/monsieur-de-paz/feuillet/releases/latest/download/Feuillet-release.json`, puis revalide l’annonce de la version choisie et télécharge son ZIP et son fichier SHA-256 par leurs adresses publiques. Il ne contacte plus l’API REST GitHub. Cela évite son quota anonyme par IP, partagé entre hébergements utilisant une même adresse sortante. Les téléchargements web restent soumis aux protections et disponibilités de GitHub.

Chaque release stable doit joindre **trois fichiers** : Feuillet-x.y.z.zip, Feuillet-x.y.z.sha256 et **Feuillet-release.json**. Le script `tools/package-release.py` les produit ensemble. L’annonce décrit le dépôt, la version stable, la taille, l’empreinte et les notes. Les adresses sont reconstruites pour le seul dépôt officiel, jamais exécutées depuis un champ libre. Le ZIP, son checksum, ses fichiers et son manifeste sont vérifiés avant activation. HTTPS et la vérification des certificats restent obligatoires.

Les anciennes préférences d’authentification sont supprimées automatiquement du stockage de mise à jour. Aucun formulaire d’identifiant GitHub n’est conservé. Voir [les limites de l’API GitHub](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) et [les téléchargements de releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases).

Si une ancienne installation ne peut pas atteindre les releases, effectuer une première mise à jour **par FTP vers 0.11 ou plus récent** : exporter une sauvegarde, conserver une copie du code existant, envoyer tous les fichiers de l’archive compilée en gardant config.php et tout storage/. Recharger ensuite Feuillet puis cliquer Vérifier. Il faut transférer l’ensemble du code, des assets et update-manifest.json pour que les empreintes de la distribution installée soient cohérentes ; remplacer uniquement app/updates.php ne constitue pas une mise à jour complète.

## Vérification et sauvegarde

La release doit fournir `Feuillet-x.y.z.zip`, son fichier `.sha256` et une empreinte SHA-256 identique dans `Feuillet-release.json`. L’archive contient `update-manifest.json` : protocole, version, PHP minimal, extensions, tables du logiciel et empreintes des fichiers. Les chemins dangereux, liens symboliques, doublons, fichiers non déclarés, configuration, médias et PHP de syntaxe invalide sont refusés. Limites : ZIP 100 Mio, extraction 200 Mio, 10 000 entrées, 64 Mio par fichier. L’intégrité dépend de la release publiée dans le dépôt de référence ; ces empreintes ne constituent pas une signature indépendante de son propriétaire.

Avant activation, `storage/updates/<identifiant>/` reçoit :

- `code.zip` et `backup.json` : anciens fichiers du logiciel et leurs empreintes ; les nouveaux fichiers pourront être supprimés au retour arrière.
- `config.php` : copie privée de la configuration.
- `database.sqlite` ou `database.jsonl` : base exacte avant mise à jour. MySQL est sauvegardé par PDO, sans `mysqldump` ni commande shell.
- `job.json` : progression et résultat. La copie du moteur de récupération est conservée séparément dans `storage/updates/recovery-engine.php`.

Les médias et les sessions restent à leur emplacement. Ils ne sont ni remplacés ni recopiés. Cette sauvegarde avant mise à jour complète la sauvegarde exportable des carnets ; elle n’est pas une copie externe de tous les médias.

Les requêtes PHP ordinaires conservent un verrou partagé. L’activation prend le verrou exclusif, attend que les requêtes précédentes soient terminées ou signale une opération en cours, et met les visiteurs en maintenance HTTP 503. Chaque remplacement de fichier utilise un fichier temporaire puis un renommage ; un journal permet de restaurer l’ensemble si le lot reste incomplet. Un seul déploiement peut s’exécuter à la fois.

## En cas d’échec

Une erreur de téléchargement ou de validation laisse le logiciel installé intact. Une erreur après début d’activation restaure les fichiers précédents. Si le test de démarrage a commencé à migrer la base, sa sauvegarde est aussi restaurée. La nouvelle version est validée par une **nouvelle requête PHP**, qui charge son code, vérifie la version, le manifeste, les tables, les réglages, un rendu de document et l’exécution de la page d’administration.

Garder l’onglet ouvert jusqu’au résultat, puis cliquer **Ouvrir Feuillet** pour charger les nouveaux assets. Si le navigateur est fermé ou si PHP est interrompu pendant l’activation, la prochaine requête normale restaure la copie précédente. Si l’activation est terminée mais la vérification n’arrive pas, une maintenance de 120 secondes laisse le navigateur terminer ; passé ce délai, la prochaine requête restaure. Aucun processus de fond n’est nécessaire.

Une réponse perdue après validation ne provoque pas de retour arrière : la récupération identifie une version déjà installée. Une demande portant sur un autre identifiant ne peut pas annuler l’opération courante.

Une préparation abandonnée peut être annulée depuis les réglages avec **Rétablir la version précédente**. Le point d’entrée `recover.php` fonctionne indépendamment du nouveau bootstrap, avec la session administrateur et le jeton CSRF. Si une interruption survient pendant la sauvegarde, avant modification du code, le carnet reste intact.

La restauration elle-même dépend des droits d’écriture, de l’espace disque et de la disponibilité de la base. Si elle échoue, Feuillet reste en maintenance et conserve les sauvegardes. Il ne prétend pas avoir restauré des données incomplètes. Un disque plein, une panne du serveur ou un accès SQL perdu peuvent nécessiter une intervention FTP/hébergeur.

## Restauration par FTP

1. Conserver une copie locale de `storage/updates/` et de `config.php`. Ne pas exposer ces fichiers sur le web.
2. Retrouver l’identifiant dans `storage/update-journal.json`. Extraire `code.zip` et remettre ses fichiers à leurs chemins d’origine dans `feuillet/`, avec les fichiers cachés. `backup.json` liste aussi les fichiers apparus pendant l’installation : ceux sans empreinte ancienne doivent être supprimés. Ne pas toucher aux médias.
3. Si la configuration a été perdue, remettre la copie privée `config.php` et vérifier son chemin de stockage.
4. Se reconnecter à l’administration si nécessaire. Le garde de déploiement et `recover.php` reprennent la restauration à partir du journal. Pour MySQL, cela utilise les identifiants privés et le fichier JSONL ; aucun outil CLI n’est requis. Si SQL est indisponible, rétablir d’abord la connexion auprès de l’hébergeur.
5. Si une intervention manuelle SQL est nécessaire, demander une restauration à partir de la sauvegarde de l’hébergeur, ou utiliser le moteur de récupération avec le propriétaire du serveur. **Ne pas supprimer le journal de maintenance avant d’avoir restauré la base** lorsque `database_changed` vaut true.

Le bouton **Sauvegarde avant installation** télécharge une archive privée du code, de la configuration et de la base après une opération terminée ou restaurée. Elle contient les identifiants SQL : la conserver hors du web. Les copies restent sur le serveur ; après validation et téléchargement, les anciens dossiers d’opérations terminées peuvent être supprimés par FTP pour récupérer de l’espace. Ne pas supprimer le dossier actif, son journal ni le moteur de récupération.

## Publier une prochaine release

Mettre à jour `FEUILLET_VERSION`, les versions npm et les docs, construire l’interface, préparer les fichiers Git, puis exécuter `python3 tools/package-release.py --output <dossier>`. Cet outil reconstruit le manifeste à partir des fichiers suivis et génère le ZIP, son SHA-256 et `Feuillet-release.json`. Committer aussi le manifeste généré et joindre **les trois fichiers** à une release stable portant `vX.Y.Z`. Ne pas remplacer l’archive par le ZIP automatique « Source code » de GitHub. Une future migration qui ajoute des tables doit mettre à jour `database_tables` dans le générateur et les tests de restauration.

### Sessions d’installation

Chaque installation possède un nom de cookie dérivé de son stockage et de son chemin web. Plusieurs copies de test sur un même hôte n’écrasent pas la connexion de l’autre. Le chemin reste identique pendant une mise à jour ; le test de démarrage et la récupération autonome utilisent le même calcul. Après mise à jour manuelle depuis 0.7, se reconnecter une fois.
