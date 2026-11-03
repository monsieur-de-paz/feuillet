# Audit de sécurité et de publication — 3 novembre 2026

Audit du dépôt public `monsieur-de-paz/feuillet`, de l’historique accessible et des distributions publiées, avant la version corrective 0.21.1. Les tests applicatifs ont utilisé des installations jetables, pas les données d’un serveur de production. Aucun déploiement distant n’a été effectué pendant cet audit.

## Résultat sur les fichiers publiés

- Historique de départ : 36 commits et 1 353 blobs uniques ; première recherche sur 1 092 blobs texte, avec revue manuelle des alertes de mots de passe littéraux et d’URL contenant des identifiants.
- Aucun `config.php` réel, fichier `.env`, base de données, export SQL, journal ou clé privée repéré dans les chemins suivis de cet historique. Aucun jeton fournisseur ou clé privée identifié par les motifs recherchés. Les alertes relues concernaient des champs de formulaire et des données de test fictives.
- 34 releases, soit 36 archives ZIP attachées, contrôlées pour leurs chemins privés et motifs de secrets connus. Chaque archive locale réutilisée a été comparée au SHA-256 publié par GitHub ; les autres ont été récupérées depuis leur pièce jointe publique. Aucun élément sensible repéré par ces contrôles.
- Dépendances npm verrouillées : 166 dépendances signalées par l’inventaire d’audit ; zéro avis connu de vulnérabilité dans la réponse du registre à cette date. Ce résultat peut changer avec de nouveaux avis.
- Les alertes GitHub de secrets et de dépendances étaient vides après activation de leurs services.

`.gitignore`, `.htaccess`, le code source, le verrouillage npm et les outils de test sont normalement publics dans un projet open source. `.gitignore` indique ce qui doit rester local, sans contenir les identifiants de l’installation ; il est conservé. Aucune réécriture d’historique ni suppression de release n’a été nécessaire d’après les éléments trouvés.

## Défaut confirmé et corrections

Les anciennes règles de `public/.htaccess` ne bloquaient pas explicitement les fichiers sensibles copiés accidentellement dans la racine web. Dans un document root temporaire possédé par le test, neuf fichiers sentinelles étaient accessibles : `.env`, `.gitignore`, `.git/HEAD`, `sub/.git/config`, `config.php.bak`, `config.php.2026.tmp`, `notes.sql.gz`, `debug.log`, `private.key`. Cela démontre une faiblesse de protection en cas de mauvais transfert FTP, pas la présence de ces secrets dans le dépôt ou sur un serveur réel.

La version 0.21.1 refuse ces accès avec 403/404 dans les `.htaccess` du projet et de `public/`. Le test Apache réel confirme les neuf blocages et l’accès conservé au manifest, à un fichier public ordinaire et au chemin ACME de validation HTTPS. La racine du site doit toujours être `feuillet/public` ; Nginx et les serveurs ignorant `.htaccess` nécessitent des règles équivalentes.

Les exclusions Git et du packager couvrent davantage de sauvegardes, exports et clés privées. HSTS est émis lorsque PHP reçoit une requête HTTPS : un an, sans `includeSubDomains` ni préchargement. Les accès HTTP locaux restent inchangés.

## Prévention sur GitHub

Activés sur le dépôt lors de l’audit : détection de secrets, blocage des secrets au push, alertes de dépendances, correctifs de sécurité automatisés et signalement privé des vulnérabilités. Ces réglages restent propres au dépôt GitHub.

Ajouts au code : politique `.github/SECURITY.md`, contrôleur de publication réutilisable, workflow à permissions de lecture avec actions épinglées et audit npm, et configuration Dependabot hebdomadaire. Le contrôle inspecte aussi les anciens noms de fichiers, pas seulement le dernier nom associé à un blob. Le packager lance le contrôle Git avant de créer la distribution.

## Revue et validation

La revue a porté sur les sessions et l’authentification, CSRF, requêtes SQL, visibilité des pages et médias, installation, mises à jour/restauration, accès PDF, téléchargements distants/SSRF et frontières du cache PWA. Aucun nouveau contournement d’authentification ni accès aux contenus privés n’a été identifié dans les scénarios examinés. Les tests reproductibles et leurs résultats sont consignés dans [TESTS.md](TESTS.md).

## Limites

Il s’agit d’un audit du code et des publications accessibles, avec recherches ciblées et tests locaux, pas d’un test d’intrusion exhaustif de chaque hébergement. Les motifs automatisés ne reconnaissent pas tous les secrets ou mots de passe possibles ; les binaires et images ne sont pas intégralement analysés sémantiquement. Les gros blobs ne sont pas intégralement inspectés comme texte. Les forks, copies téléchargées et journaux privés d’autres services ne sont pas accessibles à cet audit. L’absence de détection ne garantit pas l’absence de toute faille.

Si un secret est découvert ultérieurement : le révoquer en premier, conserver une preuve privée et coordonner le retrait des fichiers, archives et anciens commits. Une simple suppression dans la dernière version ne suffit pas.
