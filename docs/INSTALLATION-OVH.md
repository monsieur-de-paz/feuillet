# Installation sur le mutualisé OVH

Ce guide prépare une installation sur un hébergement mutualisé OVHcloud. Remplacer **`notes.exemple.fr`** par votre domaine ou sous-domaine. Une base SQL et un dossier suffisent ; la compatibilité de l’offre exacte et les limites PHP se vérifient dans l’installateur. Ce guide ne constitue pas une validation sur votre compte OVH réel.

## 1. Préparer le dossier et la base

Créer une base MySQL/MariaDB dédiée depuis l'espace client OVH. Conserver son nom, son utilisateur, son mot de passe et **son nom d'hôte exact** ; sur un mutualisé OVH, ce nom n'est généralement pas `localhost`. L'application ne requiert qu'une base.

Décompresser l'archive de distribution sur l'ordinateur puis envoyer **tout le dossier** `feuillet` par FTP/SFTP. Activer l'affichage des fichiers cachés afin de transférer aussi `.htaccess`. Exemple de disposition :

```text
racine FTP/
└── feuillet/
    ├── app/              code PHP interne
    ├── public/           seule racine web
    │   ├── assets/       interface compilée
    │   ├── index.php
    │   ├── api.php
    │   ├── media.php
    │   └── setup.php
    ├── storage/          fichiers et stockage privés
    └── config.php        créé lors de l'installation
```

Ne choisir ni `feuillet` ni `feuillet/storage` comme racine web. Seul `feuillet/public` doit être exposé. Les protections `.htaccess` complètent cette disposition ; elles ne remplacent pas le choix de la bonne racine.

Le compte FTP doit pouvoir créer `config.php` et écrire dans `storage/`. Utiliser les droits suffisants pour le propriétaire de l'hébergement ; ne pas rendre les fichiers inscriptibles par tous avec `777`.

## 2. Relier le sous-domaine

Dans l'espace client OVH, ouvrir l'hébergement puis **Multisite**. Ajouter `notes.exemple.fr` en pointant le dossier racine vers **`feuillet/public`** (ou son chemin relatif réel depuis la racine FTP).

Configurer l'entrée DNS pour qu'elle pointe vers l'hébergement. Si OVH gère la zone, suivre les valeurs proposées par l'espace client, sans recopier une adresse IP d'exemple. Activer le certificat SSL pour ce sous-domaine et attendre qu'il soit opérationnel avant l'installation.

[Guide OVH pour le multisite](https://docs.ovhcloud.com/fr/guides/web-cloud/web-hosting/multisites-configure-multisite).

## 3. Vérifier PHP

Choisir PHP **8.3 ou plus récent** parmi les versions proposées pour l'offre. L'installation vérifie les extensions nécessaires : `PDO`, `pdo_mysql`, `mbstring`, `fileinfo`, `zip`, ainsi que le stockage et les sessions. SQLite nécessite `pdo_sqlite` uniquement si ce mode est choisi ; MySQL/MariaDB est recommandé pour cette installation OVH.

La version PHP et l'environnement peuvent se régler dans l'espace client ou par `.ovhconfig`, selon la configuration existante. Si une modification globale affecte d'autres sites, utiliser la configuration propre au sous-domaine prévue par OVH. Ne pas écraser aveuglément le fichier de l'hébergement.

[Documentation OVH de `.ovhconfig`](https://docs.ovhcloud.com/fr/guides/web-cloud/web-hosting/configure-your-web-hosting).

## 4. Terminer dans le navigateur

Ouvrir `https://notes.exemple.fr/setup.php`. Compléter les paramètres de la base et choisir son nom et un mot de passe personnel robuste. L'installation prépare les tables et la configuration. Une fois installée, elle doit refuser une seconde installation.

Se connecter, créer une page privée, envoyer un petit PDF, puis publier la page. Dans un navigateur privé, vérifier la lecture et le téléchargement. Repasser la page en privé et vérifier que **le lien direct du PDF** n'est plus accessible, sauf si le même fichier est également utilisé dans une autre page publique.

Vérifier qu’une modification enregistrée dans une page déjà publiée apparaît automatiquement chez les visiteurs. Pour préparer des modifications privées, désactiver la publication automatique dans les réglages du carnet ; dans ce mode, la page conserve son ancienne version jusqu’à « Publier ». Une page publique n'a pas besoin de compte visiteur ; un lien peut donc être partagé au-delà de la classe.

## 5. Quotas et médias

Les 200 Go concernent le stockage de l'hébergement. Les bases disposent de quotas distincts. Les limites PHP d'envoi et le temps d'exécution restent indépendants de l'espace disque disponible. Consulter le diagnostic de l'application pour connaître les limites réellement actives et essayer d'abord des fichiers modestes.

Les PDF, l'audio et les vidéos compatibles avec le navigateur sont consultables en ligne. Les autres formats sont téléchargeables. La vidéo n'est ni transcodée ni recompressée. Préparer un format adapté et une taille raisonnable avant l'envoi ; pour de grandes vidéos, utiliser un hébergement externe intégré par lien.

OVH décrit les limites des bases et du mutualisé dans [ses spécificités techniques](https://docs.ovhcloud.com/fr/guides/web-cloud/web-hosting/hosting-technical-specificities). La validation locale ne mesure pas la capacité de l'hébergement à diffuser plusieurs grandes vidéos simultanément.

## 6. Sauvegarder et restaurer

Conserver régulièrement un export ZIP de l'application **hors du serveur**, dans un espace privé. Pour une reprise complète, sauvegarder également la base via OVH, `config.php` et le dossier `storage/` via FTP. La base, le stockage et la configuration doivent provenir d'une même sauvegarde cohérente.

L'export contient les brouillons actuels, les pièces jointes, des versions HTML de secours et les snapshots publiés comme données de récupération. Il exclut la configuration, le compte et l'historique des révisions. L'import restaure les brouillons en **copies privées**, sans écraser les pages existantes et sans republier automatiquement les anciens snapshots. Les HTML de secours ne remplacent pas le logiciel pour les quiz ou les liens internes.

Pour une restauration de contenus, installer d'abord le logiciel sur une copie séparée et utiliser l'import ZIP. Vérifier les pages, documents et états de publication avant de basculer le sous-domaine. Le mot de passe administrateur de la nouvelle installation n'est pas celui de l'export de contenus.

Ne publier sur GitHub que le code et la documentation. Exclure `config.php`, les bases SQLite, les fichiers envoyés, les exports, les logs et les données personnelles.

## Si une étape échoue

- Connexion à la base : vérifier le nom d'hôte, les identifiants et la création effective de la base ; le serveur SQL peut refuser les connexions depuis l'extérieur d'OVH.
- Écriture impossible : vérifier le propriétaire et les droits de `storage/` et du dossier de configuration.
- Interface vide : vérifier que `public/assets` a été transféré entièrement et consulter les journaux PHP OVH.
- Envoi refusé : consulter le diagnostic, la taille du fichier et son format. Un gros fichier peut dépasser la limite de la requête avant que PHP ne le reçoive.
- Certificat invalide : finir l'activation SSL et la propagation DNS dans OVH avant de saisir ses identifiants.

Aucune commande SSH, installation Composer ou compilation Node.js n'est nécessaire à ces opérations.

## Mot de passe oublié

Le logiciel ne dépend pas d'un service e-mail pour récupérer le compte. Si un accès SSH est disponible, exécuter `php tools/reset-password.php` depuis le dossier Feuillet, puis saisir le nouveau mot de passe sur l'entrée standard. Il n'est pas passé en argument de commande. L'outil ferme les anciennes sessions.

Sans SSH, exécuter localement `php tools/create-password-hash.php` avec un PHP installé, puis remplacer uniquement la valeur `password_hash` dans une copie privée de `config.php` et la renvoyer par FTP. Ne pas envoyer ce fichier à un service de génération de mots de passe en ligne. Après remplacement, supprimer les fichiers de session de `storage/sessions/` pour fermer les anciennes connexions, sans supprimer les pages ni les pièces jointes.

## Lecteur PDF

Le lecteur PDF.js est fourni dans `public/vendor/pdfjs/` avec ses licences. Il fonctionne sans CDN et propose changement de page, zoom, sélection du texte et téléchargement. Les PDF scannés restent des images : aucune reconnaissance de caractères n'est effectuée. L'accès au lecteur et au fichier original est soumis à la visibilité du document.

La limite d'envoi effective est la plus petite des limites PHP et de `max_upload` dans `config.php` (100 Mo par défaut pour le logiciel). L'écran Réglages affiche cette limite. La version 0.1 ne propose pas l'envoi par morceaux ni l'import de médias par FTP ; réduire les fichiers trop gros ou relever les limites autorisées lorsque l'hébergement le permet.

Fonctions ajoutées et procédure de mise à jour : [NOUVEAUTES-0.2.md](NOUVEAUTES-0.2.md). La recherche Commons nécessite cURL et une connexion HTTPS sortante, sans clé API.

## Préparer les carnets et liens publics (0.5.1)

Créer les carnets, puis leurs pages et catégories. Publier chaque page destinée à un groupe et copier son lien public. Tester ce lien dans une fenêtre privée : la page partagée doit être la première du fil d’Ariane, ses sous-pages doivent y revenir, et les autres branches ne doivent pas être listées. `index.php?read=1` affiche seulement une invitation à utiliser un lien partagé. `index.php?edit=1` ouvre la connexion administrateur.

Lors d’une mise à jour, les pages autrefois hors espace sont déplacées automatiquement dans un vrai carnet « Mes pages », renommable. Les anciens accueils restent des pages ordinaires. Sauvegarder SQL, configuration et médias avant de transférer le code, et conserver `config.php` et `storage/`. Voir [Maintenance](MAINTENANCE.md) et [les nouveautés 0.5.1](NOUVEAUTES-0.5.1.md).

## Clé privée de première installation

Sur un hébergement neuf, ouvrir `setup.php` crée `storage/installation-key.txt`, en dehors de la racine web. Lire son contenu par FTP/SFTP et le coller dans **Clé d’installation**, avec les autres paramètres. Le site n’affiche jamais cette clé. L’installateur ne crée aucun compte ni base sans elle ; elle est supprimée quand la configuration est enregistrée. Si sa création échoue, vérifier les droits du propriétaire sur `storage/`. Cette étape ne concerne pas la mise à jour d’un carnet déjà installé.

## Réglages de navigation et publication (0.4.1)

Dans **Réglages & sauvegardes → Mon carnet**, personnaliser le raccourci de navigation. Pour rendre publiques automatiquement les sous-pages existantes et futures d’un parent public, activer l’option dédiée puis enregistrer. Cette option est désactivée par défaut ; sa désactivation laisse publiques les pages déjà publiées. Le bouton **Utilisations** de la bibliothèque aide à vérifier les références et l’accessibilité d’un fichier avant de partager son lien. [Guide 0.4.1](NOUVEAUTES-0.4.1.md).

## Distribution 0.5.0

L’interface est précompilée dans la distribution. Transférer également `public/interface.css` ; l’installation mutualisée ne nécessite ni package de skills, ni dépendance Node, ni abonnement. Pour une mise à jour, suivre [MAINTENANCE.md](MAINTENANCE.md), conserver configuration et stockage, puis recharger les pages. [Guide des contrôles 0.5](NOUVEAUTES-0.5.md).

## Après installation de Feuillet 0.7

Connecté, cliquer le logo/nom pour ouvrir l’accueil admin. Le menu ⋯ d’une page permet l’import TXT, Markdown ou RTF (2 Mo maximum) ; l’import crée une racine privée du carnet actif. Les cartes Google utilisent une intégration publique depuis le navigateur, sans clé API ni compte de facturation à configurer. Le serveur ne contacte pas Google pour cette fonction.

Pour mettre à jour, conserver `config.php` et `storage/`, remplacer le code et les assets ensemble, puis recharger les onglets. Aucune nouvelle table SQL ni extension PHP supplémentaire. Ne pas revenir à une version antérieure à 0.7 après création de blocs de carte sans conversion des blocs ou restauration d’une sauvegarde. [Nouveautés et usages](NOUVEAUTES-0.7.md).

## Installation et mises à jour intégrées — 0.8

Utiliser l’archive installable de la release et conserver `update-manifest.json`. L’installateur guidé demande la clé privée lue par FTP dans `storage/installation-key.txt`, puis les réglages du carnet et la base dédiée. cURL, ZIP, tokenizer et l’écriture du code sont nécessaires aux mises à jour depuis GitHub. Le dépôt encore privé nécessite un jeton GitHub limité à la lecture du contenu de ce dépôt ; aucun changement de visibilité n’est effectué.

Les notifications et choix sont dans `storage/updates/settings.json`. Le déploiement prépare une extraction vérifiée, sauvegarde le code et la base, conserve configuration/médias, pose `storage/update-journal.json` et remplace les fichiers sous verrou exclusif. `public/update-guard.php` précède le bootstrap sur les points d’entrée ordinaires. `public/update-health.php` valide le nouveau processus ; `public/recover.php` et la copie privée du moteur de récupération peuvent rétablir la version précédente. Les sauvegardes ne sont pas servies publiquement et restent téléchargeables par l’admin après succès ou retour arrière.

La restauration dépend des droits, de l’espace disque et de SQL. Les médias ne sont pas recopiés. Voir [les étapes et la procédure FTP](MISES-A-JOUR.md) avant de supprimer un dossier de sauvegarde. Aucun cron, shell système ou service permanent n’est requis. L’installation OVH réelle reste à vérifier sur l’offre de l’utilisateur.
