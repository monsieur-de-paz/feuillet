# Installer ton carnet sur OVH

**Feuillet** est le nom du logiciel. L'archive contient le logiciel libre et les fichiers de l'interface déjà compilés. Elle ne contient aucune note personnelle ni mot de passe initial.

1. Décompresse `Feuillet-0.8.2.zip` sur ton ordinateur. Tu obtiens le dossier `feuillet`.
2. Envoie ce dossier sur ton hébergement par FTP, en dehors du dossier public de ton site principal si possible.
3. Dans la configuration multisite OVH, associe `notes.exemple.fr` au dossier **`feuillet/public`**. C'est ce dossier précis qui doit être la racine web, afin de garder la configuration et les fichiers privés hors du web.
4. Active un certificat SSL couvrant ce sous-domaine et choisis une version PHP maintenue, au minimum 8.3.
5. Crée ou réserve **une** base MySQL/MariaDB. Note le serveur SQL, le nom de la base, l'utilisateur et son mot de passe.
6. Ouvre `https://notes.exemple.fr/setup.php`. À la première ouverture, une clé privée est créée dans `storage/installation-key.txt`. Lis-la par FTP/SFTP, puis saisis-la dans **Clé d’installation**. Elle sera supprimée après installation. Renseigne le nom du carnet, ton mot de passe administrateur et les paramètres SQL. L'installateur vérifie les prérequis et crée les tables.
7. Crée ta première page. Tape `/titre`, `/pdf` ou ouvre le bouton **+** pour insérer un bloc. L'enregistrement est automatique. Clique sur **Publier** lorsque tu veux rendre cette version accessible aux visiteurs.

Les visiteurs n'ont pas besoin de compte. Tes pages restent privées par défaut. Rendre une page publique rend également accessibles les documents présents dans la version publiée. Publier une page publie aussi ses sous-pages actuelles ; la rendre privée les retire également. Les quiz corrigent les réponses sans enregistrer de résultats nominatifs.

Avant d'y mettre tes documents habituels, vérifie avec un petit PDF de test la publication, le téléchargement et le retour en privé. Les tests locaux passent, mais la configuration exacte du serveur OVH, ses quotas et ses règles Apache doivent être confirmés à cette étape.

Guide complet : [INSTALLATION-OVH.md](INSTALLATION-OVH.md). Documentation du logiciel : [README](../README.md). Résultats des contrôles : [TESTS.md](TESTS.md). Preuves REA : [ANALYSE-NOTION.md](ANALYSE-NOTION.md).

Fonctions ajoutées et procédure de mise à jour : [NOUVEAUTES-0.4.md](NOUVEAUTES-0.4.md). La recherche Commons nécessite cURL et une connexion HTTPS sortante, sans clé API.

## Créer un carnet et partager une branche

Dans **Carnets → +**, créer un carnet puis ses pages et catégories. Publier une page et copier son lien public. Les visiteurs commencent leur navigation sur cette page et consultent ses sous-pages ; les autres branches ne sont pas listées. Une sous-page partagée directement est sa propre racine. Il n’y a plus d’accueil à composer. Les contenus publics restent accessibles à qui possède leur lien. [Guide 0.5.1](NOUVEAUTES-0.5.1.md).

## Modifier une base depuis une page

Cliquer sur une cellule pour modifier son champ ; les calculs restent en lecture seule. Les menus des colonnes et les outils de vue permettent de choisir les propriétés affichées, le tri et les filtres. Une même base peut être intégrée à plusieurs pages avec des présentations différentes. Voir [Bases : interface 0.4](BASES-UX-0.4.md).

La navigation se replie avec le bouton près de la recherche ou Ctrl/Cmd + Maj + L, configurable dans les réglages. Le menu de couleur **Défaut** suit le thème. Les couleurs d’état se règlent via le menu de colonne, et la bibliothèque affiche **Utilisations** pour chaque média. L’héritage public des sous-pages possède un réglage général, désactivé par défaut : [guide 0.4.1](NOUVEAUTES-0.4.1.md).

## Les nouveaux menus

Un clic droit dans l’administration propose les actions de la page, du bloc ou de la propriété visée. Les boutons ⋯ et la poignée du bloc donnent le même accès sur mobile. Les longues listes ont une recherche. **Plus d’outils**, en bas de la navigation, contient la corbeille et la déconnexion. Voir [les nouveautés 0.5](NOUVEAUTES-0.5.md).

## Ajustements 0.5.2

Le carnet actif affiche une coche ; la catégorie active est soulignée. Dans Modifier le carnet, développer Choisir un émoji pour ce carnet, rechercher ou parcourir les catégories, puis Enregistrer. Les choix de couleur sont dans Réglages & sauvegardes → Apparence générale du carnet.

Le carnet actif et la catégorie sont soulignés de la même couleur. Sur ordinateur, glisser le bord droit de la navigation pour changer sa largeur. La poignée accepte les flèches gauche/droite au clavier ; double-clic ou Entrée remet la largeur habituelle. [Guide 0.5.4](NOUVEAUTES-0.5.4.md).

## Retrouver et composer ses pages — 0.7

Cliquer le logo pour retrouver les dernières pages modifiées dans l’accueil admin. Importer un TXT/Markdown/RTF depuis le menu ⋯ ; la nouvelle page reste privée. Déplacer un bloc par sa poignée ⋮⋮ et suivre la ligne de dépôt : « Dans la section » l’insère dans un titre dépliable. `/lieu` ajoute une adresse et sa carte Google Maps sans clé API. Les détails et limites sont dans [le guide 0.7](NOUVEAUTES-0.7.md).

## Installation et mises à jour intégrées — 0.8

Utiliser l’archive installable de la release et conserver `update-manifest.json`. L’installateur guidé demande la clé privée lue par FTP dans `storage/installation-key.txt`, puis les réglages du carnet et la base dédiée. cURL, ZIP, tokenizer et l’écriture du code sont nécessaires aux mises à jour depuis GitHub. Le dépôt encore privé nécessite un jeton GitHub limité à la lecture du contenu de ce dépôt ; aucun changement de visibilité n’est effectué.

Les notifications et choix sont dans `storage/updates/settings.json`. Le déploiement prépare une extraction vérifiée, sauvegarde le code et la base, conserve configuration/médias, pose `storage/update-journal.json` et remplace les fichiers sous verrou exclusif. `public/update-guard.php` précède le bootstrap sur les points d’entrée ordinaires. `public/update-health.php` valide le nouveau processus ; `public/recover.php` et la copie privée du moteur de récupération peuvent rétablir la version précédente. Les sauvegardes ne sont pas servies publiquement et restent téléchargeables par l’admin après succès ou retour arrière.

La restauration dépend des droits, de l’espace disque et de SQL. Les médias ne sont pas recopiés. Voir [les étapes et la procédure FTP](MISES-A-JOUR.md) avant de supprimer un dossier de sauvegarde. Aucun cron, shell système ou service permanent n’est requis. L’installation OVH réelle reste à vérifier sur l’offre de l’utilisateur.
