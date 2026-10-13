# Installer ton carnet sur OVH

**Feuillet** est le nom du logiciel. L'archive contient le logiciel libre et les fichiers de l'interface déjà compilés. Elle ne contient aucun cours personnel ni mot de passe initial.

1. Décompresse `Feuillet-0.4.0.zip` sur ton ordinateur. Tu obtiens le dossier `feuillet`.
2. Envoie ce dossier sur ton hébergement par FTP, en dehors du dossier public de ton site principal si possible.
3. Dans la configuration multisite OVH, associe `cours.exemple.fr` au dossier **`feuillet/public`**. C'est ce dossier précis qui doit être la racine web, afin de garder la configuration et les fichiers privés hors du web.
4. Active un certificat SSL couvrant ce sous-domaine et choisis une version PHP maintenue, au minimum 8.3.
5. Crée ou réserve **une** base MySQL/MariaDB. Note le serveur SQL, le nom de la base, l'utilisateur et son mot de passe.
6. Ouvre `https://cours.exemple.fr/setup.php`. À la première ouverture, une clé privée est créée dans `storage/installation-key.txt`. Lis-la par FTP/SFTP, puis saisis-la dans **Clé d’installation**. Elle sera supprimée après installation. Renseigne le nom du carnet, ton mot de passe administrateur et les paramètres SQL. L'installateur vérifie les prérequis et crée les tables.
7. Crée ta première page. Tape `/titre`, `/pdf` ou ouvre le bouton **+** pour insérer un bloc. L'enregistrement est automatique. Clique sur **Publier** lorsque tu veux rendre cette version accessible aux élèves.

Les élèves n'ont pas besoin de compte. Tes pages restent privées par défaut. Rendre une page publique rend également accessibles les documents présents dans la version publiée. Publier une page publie aussi ses sous-pages actuelles ; la rendre privée les retire également. Les quiz corrigent les réponses sans enregistrer de résultats nominatifs.

Avant d'y mettre tes documents habituels, vérifie avec un petit PDF de test la publication, le téléchargement et le retour en privé. Les tests locaux passent, mais la configuration exacte du serveur OVH, ses quotas et ses règles Apache doivent être confirmés à cette étape.

Guide complet : [INSTALLATION-OVH.md](INSTALLATION-OVH.md). Documentation du logiciel : [README](../README.md). Résultats des contrôles : [TESTS.md](TESTS.md). Preuves REA : [ANALYSE-NOTION.md](ANALYSE-NOTION.md).

Fonctions ajoutées et procédure de mise à jour : [NOUVEAUTES-0.4.md](NOUVEAUTES-0.4.md). La recherche Commons nécessite cURL et une connexion HTTPS sortante, sans clé API.

## Composer l’accueil visiteur

Ouvrir **Accueil visiteur** dans la barre latérale. Créer une page d’accueil, la modifier comme une page de cours et composer ses galeries avec les seules ressources souhaitées. Les titres, descriptions, sections et blocs sont éditables. Publier, puis consulter `index.php?read=1`. Le choix de l’accueil ne publie pas les pages liées.

## Modifier une base depuis une page

Cliquer sur une cellule pour modifier son champ ; les calculs restent en lecture seule. Les menus des colonnes et les outils de vue permettent de choisir les propriétés affichées, le tri et les filtres. Une même base peut être intégrée à plusieurs pages avec des présentations différentes. Voir [Bases : interface 0.4](BASES-UX-0.4.md).
