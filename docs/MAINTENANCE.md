# Maintenance de Feuillet

Ce guide concerne un carnet PHP auto-hébergé, notamment sur un mutualisé OVHcloud. Aucune commande serveur ni installation npm n'est nécessaire pour remplacer une distribution déjà compilée. Les commandes de développement s'exécutent sur une copie de travail locale.

## Sauvegarder avant une intervention

Conserver une sauvegarde hors de l'hébergement avant une mise à jour ou un changement PHP :

1. Exporter le ZIP du carnet depuis ses réglages.
2. Sauvegarder la base SQL avec les outils de l'hébergeur, ou le fichier SQLite quand aucune écriture n'est en cours.
3. Copier `config.php` et tout `storage/` par FTP/SFTP.
4. Conserver le code de la version utilisée pour pouvoir revenir à cet ensemble cohérent.

Le ZIP portable contient aussi les notes et réponses privées. Il ne doit pas être publié dans GitHub ou un répertoire web. Il crée des copies privées à l'import et ferme les formulaires importés avec de nouveaux tokens. SQL + configuration + stockage restent nécessaires pour une restauration identique.

Éviter les modifications pendant la sauvegarde complète : une copie SQL et une copie de médias prises à des moments différents peuvent manquer une pièce jointe. Vérifier régulièrement une restauration sur un sous-domaine de test indépendant avec sa propre base et son propre stockage.

## Mettre à jour sur OVH sans VPS

Télécharger la distribution de la version choisie et vérifier son origine. Envoyer le nouveau code et l'ensemble de ses fichiers statiques : `app/`, scripts de `public/`, `public/assets/`, `public/vendor/` et polices. Conserver **`config.php` et tout `storage/`**. Ne pas recopier un carnet de développement avec ses données ni relancer `setup.php` sur l'installation existante.

La racine du sous-domaine reste `feuillet/public`. Les `.htaccess` de protection dans le dossier racine, `app/` et `storage/` doivent être conservés ; cette protection complète la séparation des dossiers. Ne pas rendre `feuillet/` lui-même public.

Au premier accès, les migrations ajoutent les éléments manquants. Vérifier connexion, sauvegarde d'un brouillon, lecture anonyme, PDF, lien direct d'un fichier privé et formulaire. Avec la publication automatique activée, une page déjà publique doit refléter une modification enregistrée. Désactiver ensuite cette option et vérifier que le brouillon reste privé jusqu’à une publication explicite.

Pour revenir en arrière après une migration, restaurer l'ensemble cohérent sauvegardé : ancien code **et** ancienne base, configuration et stockage. Remplacer seulement le code ancien peut le rendre incompatible avec le schéma nouveau.

Sur OVH, les paramètres PHP dépendent de l'offre et de `.ovhconfig`. L'espace de stockage n'augmente pas les plafonds d'envoi, la mémoire, la durée de requête ou les limites SQL. La limite choisie dans Feuillet reste plafonnée par PHP. Voir [le guide d'installation](INSTALLATION-OVH.md) et [la configuration PHP officielle OVHcloud](https://docs.ovhcloud.com/fr/guides/web-cloud/web-hosting/configure-your-web-hosting).

## Contrôles réguliers

| Moment | Contrôle concret |
|---|---|
| Avant de publier beaucoup de contenus | Export sauvegardé, espace disque disponible et petit téléchargement testé |
| Après une mise à jour | Connexion, brouillon/public, médias privés, base publique et envoi de formulaire |
| Quand une erreur apparaît | Diagnostic Feuillet et journal PHP de l'hébergeur, avec date et action reproduite |
| Quand une dépendance signale un avis | Vérifier version verrouillée, conditions de l'avis et nécessité d'une correction |
| Avant de distribuer une nouvelle version | Compilation, tests locaux, avis/licences et archive contenant les assets préparés |

Le résultat d'un diagnostic ou d'un audit doit garder sa date : ni l'offre OVH, ni les avis de sécurité des dépendances ne sont figés.

## Dépendances : état vérifié le 13 octobre 2026

Le verrouillage examiné est `frontend/package-lock.json`, SHA-256 :

```text
f70660263aae74f95044cf3123e3e64bf97253d6a03f37b5c9c8c827837099d3
```

Le passage final porte sur le verrouillage de la version **0.4.0**. Les commandes `npm audit --json` et `npm audit --omit=dev --json` ont chacune indiqué **0 vulnérabilité connue** pour le verrouillage, sur 166 paquets déclarés. Ce résultat couvre le registre npm consulté, pas une analyse complète du code PHP, des configurations de l'hébergement ou des fichiers PDF reçus. Aucune dépendance n'a été modifiée pendant cet audit. [Périmètre de la commande npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit).

| Composant | Version verrouillée | Vérification et évolution disponible |
|---|---|---|
| Tiptap et ses extensions directes | 3.31.4 | Le registre proposait 3.32.0 dans la plage autorisée ; mise à jour à tester ensemble |
| React / React DOM | 19.3.0 | Même version pour les deux composants ; application navigateur sans packages RSC |
| jsPDF | 4.2.1 | Inclut le correctif de l'avis d'injection HTML publié en mars 2026 |
| PDF.js `pdfjs-dist` | 5.4.296, fixé explicitement | Fichiers distribués vérifiés en 5.4.296 ; registre proposant 6.4.299, changement majeur à évaluer |
| Vite | 7.3.7 | Inclut le correctif d'octobre 2026 pour la branche 7 ; 8.3.4 proposé hors plage actuelle |
| TypeScript | 5.9.3 | 7.0.2 proposé hors plage actuelle ; outil de développement |
| Lucide React | 0.468.0 | 1.56.0 proposé hors plage actuelle ; vérifier les imports d'icônes avant migration |
| Prettier | 3.9.10 | Outil de mise en forme, absent du serveur de production |

`npm outdated` distingue `wanted` (dans la plage déclarée) de `latest` (version publiée la plus récente). Les versions proposées ci-dessus sont un constat daté, pas une mise à jour appliquée.

### Avis primaires rapprochés des versions

- **jsPDF** : GHSA-wfv2-pwc8-crg5 concerne les versions jusqu'à 4.2.0 ; la correction commence en 4.2.1. Le code Feuillet examiné produit un blob PDF et n'utilise pas les fenêtres HTML de sortie concernées. [Avis du projet jsPDF](https://github.com/parallax/jsPDF/security/advisories/GHSA-wfv2-pwc8-crg5).
- **Vite** : GHSA-rq7h-c2jc-7f22, publié le 6 octobre 2026, est corrigé en 7.3.7 sur la branche utilisée. Cet avis vise un serveur de développement exposé avec certaines conditions de chemins. Vite ne tourne pas sur OVH en production. [Avis du projet Vite](https://github.com/vitejs/vite/security/advisories/GHSA-rq7h-c2jc-7f22).
- **PDF.js** : l'avis de 2024 est corrigé depuis 4.2.67. L'avis de juillet 2026 indique une introduction à partir de 5.6.83 et un correctif en 6.2.108 ; la version 5.4.296 examinée est antérieure à cette plage. Une migration future vers la branche 6 doit viser une version corrigée, puis vérifier le worker et les ressources associés. [Avis 2024](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq), [avis 2026](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j).
- **React Server Components** : l'avis officiel porte sur des paquets de traitement serveur. Aucun paquet `react-server-dom-*` n'était présent dans le verrouillage examiné et Feuillet exécute son backend en PHP. Cette conclusion reste limitée à l'architecture et aux dépendances de ce dépôt. [Avis officiel React](https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components).

Ces rapprochements ne garantissent pas l'absence d'autres failles. Relancer l'audit lorsque le verrouillage change ou avant une nouvelle distribution.

## Mettre à jour les dépendances sur une copie locale

Utiliser une version de Node compatible avec les `engines` du verrouillage. Pour Vite 7.3.7, la plage déclarée est `^20.19.0 || >=22.12.0`. Ne pas choisir une ancienne version de Node uniquement pour satisfaire ce minimum : utiliser une version maintenue et compatible, suivant [le calendrier officiel Node.js](https://nodejs.org/en/about/previous-releases).

```sh
cd frontend
npm ci
npm audit
npm audit --omit=dev
npm outdated
```

Après décision sur les versions, mettre à jour les déclarations et le verrouillage de façon contrôlée. Conserver les packages Tiptap cohérents entre eux. Éviter `npm audit fix --force` comme procédure automatique : un changement majeur peut casser les extensions, les ressources PDF ou les outils de compilation.

```sh
npm run format:check
npm run build
```

Le build prépare aussi PDF.js. Vérifier que sa version et celle du worker sont identiques ; mettre à jour tout `public/vendor/pdfjs`, pas seulement le script principal. Réexaminer les notices et licences si le verrouillage change. Les dépendances optionnelles ne sont pas toutes présentes dans le bundle final ; l'archive reste à contrôler après compilation.

Puis, depuis le dossier du projet :

```sh
python3 tests/smoke.py
python3 tests/customization.py
python3 tests/databases.py
python3 tests/sharing.py
python3 tests/security.py
```

`--mysql` utilise un serveur local jetable lorsque les binaires existent déjà ; `--network` sur `smoke.py` vérifie l'image Commons réellement. Les tests ne doivent jamais cibler les données du serveur public. Les parcours dans un navigateur restent nécessaires : clavier/menu `/`, sauvegarde, publication, lecteur PDF, formulaires et petit écran.

## Mot de passe oublié et journaux

Avec accès à PHP en ligne de commande, `tools/reset-password.php` lit le nouveau mot de passe sur l'entrée standard, remplace son hash et ferme les anciennes sessions. Il refuse l'exécution web.

Sans SSH, préparer le hash avec `tools/create-password-hash.php` sur un ordinateur disposant de PHP, puis modifier uniquement `password_hash` dans une copie privée de `config.php` avant retransfert. Préserver les autres champs et supprimer les anciennes sessions de `storage/sessions/` pour fermer les connexions existantes. Ne jamais placer un script de réinitialisation accessible publiquement.

Les erreurs détaillées vont au journal PHP ; le navigateur reçoit un message général. Lors d'un signalement, fournir version, action, statut HTTP et erreur utile, en retirant mot de passe, paramètres SQL, token de formulaire non partagé et contenu d'élève.

## Limites de maintenance encore ouvertes

Les vérifications locales documentées portent sur PHP 8.5.11 et MySQL, avec SQLite également. PHP 8.3/8.4, MariaDB, Apache et le compte OVH réel ne sont pas équivalents à ces essais et doivent être vérifiés dans leur environnement.

Les archives et grandes vidéos restent soumises aux ressources du mutualisé. Il n'existe pas de transcodage, d'OCR ni de worker permanent. Les essais de petite largeur dans le navigateur ne remplacent pas des tests sur de vrais téléphones. Consulter [TESTS.md](TESTS.md) pour les contrôles effectivement réalisés sur la version distribuée.

## Première installation et clé privée (0.4)

Le premier accès à `setup.php` crée `storage/installation-key.txt`, hors de la racine web. Le propriétaire doit lire cette clé par FTP/SFTP et la saisir dans l’installateur. Aucun secret d’installation n’est renvoyé par HTTP. La clé est supprimée après enregistrement réussi de `config.php`. Une mise à jour d’un carnet déjà installé ne demande pas cette clé et ne doit pas relancer l’installation.

## Vérifications supplémentaires après mise à jour 0.4

Vérifier que `public/gallery.css` correspond à sa source, que `emoji-font.css`, `icons.svg`, `icons.json` et les nouvelles ressources de polices ont été transférés. Remplacer les fichiers de code et assets ; conserver `config.php` et les données de `storage/`. Les anciennes ressources hashées peuvent être retirées après transfert complet.

Tester une modification de page publique et sa lecture dans un autre onglet, le mode brouillon désactivable, une relation de base, les trois onglets d’icônes, la présentation d’un PDF et le thème personnel. Le contrôle périodique du lecteur ne tourne pas dans les onglets cachés. Évaluer la charge de lecture réelle sur l’hébergement avant d’ouvrir de nombreuses bases volumineuses.

Les catalogues et fontes possèdent leurs licences et empreintes dans [ICONES-0.4.md](ICONES-0.4.md). La police Apple n’est pas redistribuée. Le PDF continue à utiliser sa police d’export propre ; la fidélité des émojis colorés n’est pas garantie.

Les contrôles du frontend se reproduisent avec `node tests/frontend.mjs` à la racine, après `npm ci` dans `frontend/`. Le relevé de livraison, les résultats par moteur et les limites de validation sont dans [TESTS.md](TESTS.md).

## Vérifications après mise à jour 0.4.1

Tester le bouton près de la recherche, le raccourci configuré dans un texte en cours, le défaut de couleur sous clair/sombre/OLED, les étiquettes d’état et le bouton Utilisations. La route d’inventaire doit refuser une requête anonyme. L’héritage des sous-pages est désactivé par défaut : son activation publie les branches existantes ; évaluer ce choix dans les réglages du carnet. Faire ses tests d’activation sur une copie de contenus fictifs. Les réponses de formulaires demeurent privées. Les CSS et scripts fixes portent le numéro de version dans leur URL afin d’éviter une ancienne interface après mise à jour.

Commande de régression supplémentaire : `python3 tests/workspace.py`, et `--mysql` pour le serveur jetable local. Aucun paquet npm ni extension PHP supplémentaire.

Contrôler aussi les accents sombres dans l’éditeur et le lecteur. `tests/frontend/theme-colors.ts` vérifie 24 couleurs dans les trois modes, le contraste des premiers plans/survols et la parité exacte PHP/JavaScript ; ce groupe nécessite PHP CLI. Le verrouillage 0.4.1 n’introduit aucune dépendance nouvelle. Son SHA-256 est `1af67495f0100a813eccbd3d7dbc02e12a284465472c8e4e27a360d4f9d15cc9`.

## Vérifier les interactions après une mise à jour 0.5

Transférer `public/interface.css` avec tous les assets de la version. Recharger les onglets ouverts ; ne pas remplacer `config.php` ou `storage/`. Aucune migration de contenu spécifique à 0.5.0. Les URL statiques incluent le numéro de version pour le cache.

Tester une liste courte et une longue : recherche, flèches, Entrée, Échap, Tab, champ obligatoire vide et option désactivée. Un sélecteur dans une fiche de base doit se fermer avec Échap sans fermer la fiche. Vérifier le clic droit sur une sélection de texte, une autre page de la navigation et une propriété de base ; vérifier aussi les boutons équivalents sur mobile. Le menu natif reste accessible avec Maj + clic droit.

Les menus utilisent Popover sur les navigateurs modernes. Contrôler les versions effectivement utilisées par les lecteurs ; le repli fixe des navigateurs anciens peut être contraint par des conteneurs. Vérifier clair, sombre, OLED, `prefers-reduced-motion` et le focus visible. La charte et son audit ne constituent pas une certification d’accessibilité.

Les composants 0.5 n’ajoutent aucun paquet npm et ne transmettent pas de données aux dépôts de skills. `node tests/frontend.mjs` inclut les cas de géométrie de menus et d’options groupées/désactivées. Les résultats datés et le verrouillage de la distribution sont dans [TESTS.md](TESTS.md).

## Mise à jour vers 0.5.1

Sauvegarder l’ensemble base/configuration/médias et transférer l’interface compilée, notamment `public/interface.css`. Le premier chargement transforme les pages et catégories sans carnet en un carnet réel et renommable. La migration conserve le contenu et les versions ; elle met à jour les IDs de carnets des snapshots publiés. Vérifier les anciens cours, leurs médias et les carnets avant de partager de nouveaux liens.

Le choix historique de page d’accueil n’est plus utilisé. Cette page reste disponible dans l’administration. Remplacer les anciens liens sans `page` par les liens directs des pages à partager. Vérifier une branche, puis une sous-page et le retour par fil d’Ariane, dans une fenêtre privée. Les galeries ne montreront plus les cartes extérieures à la branche. La documentation 0.4 et 0.5 reste historique ; utiliser le [guide actuel](NOUVEAUTES-0.5.1.md).

Pour revenir à une version antérieure, restaurer son code et la sauvegarde de base correspondante : revenir uniquement aux anciens assets ne défait pas la migration des carnets. La sauvegarde portable conserve les anciens accueils comme pages ordinaires et ne contient plus `homepage_id`.

## Ajustements 0.5.2

Remplacer les fichiers compilés et public/interface.css, garder config.php et storage/, puis recharger les onglets. Aucun changement SQL supplémentaire. Vérifier carnet actif, catégorie soulignée, Apparence générale et Modifier le carnet → Choisir un émoji. Le contrôle de couleur natif peut avoir une présentation différente selon le navigateur.
