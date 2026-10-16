# Feuillet 0.13.1 — Réparer les mises à jour après FTP

## Le blocage

Le moteur précédent vérifiait les empreintes de tous les fichiers déjà installés avec la même exigence que pour la nouvelle archive. Un README modifié, des fins de ligne converties ou un fichier de documentation absent pouvaient ainsi provoquer « La distribution est incomplète ou endommagée » avant toute installation.

Ce message a été reproduit sur une copie jetable en modifiant un README. Le message HTTP 400 de la console fournie ne contient pas le détail de la réponse : il ne permet pas de nommer le fichier différent sur le serveur de l’utilisateur. Les messages runtime.lastError/background.js concernent l’environnement d’extensions du navigateur et ne sont pas une trace PHP de Feuillet.

## Ce qui change

Le manifeste local sert à inventorier les chemins à sauvegarder et remplacer. Son format, les chemins, les tables et les liens symboliques restent contrôlés. La sauvegarde contient les **octets réellement présents**, y compris les modifications locales, et conserve la connaissance des fichiers absents. Son contenu est vérifié avant de remplacer le code. En cas d’échec, la restauration rétablit cet état local exact ; les nouveaux fichiers qui n’existaient pas auparavant sont retirés.

Le téléchargement reste soumis aux contrôles HTTPS, dépôt officiel, taille et SHA-256. Tous les fichiers de la nouvelle archive restent vérifiés, ainsi que la syntaxe PHP et le démarrage après activation. Le diagnostic mentionne le chemin relatif d’un fichier manquant ou incorrect. Aucune désactivation de ces contrôles pour la nouvelle distribution.

La fenêtre d’échec indique l’étape réellement interrompue. Elle n’affiche plus « sauvegarder et installer » comme réussi lorsque l’arrêt s’est produit avant le remplacement. Elle distingue une installation conservée sans changement d’un retour arrière effectif.

## Débloquer une version précédente

Une ancienne version qui refuse ses propres fichiers ne peut pas installer le correctif toute seule : elle exécutera d’abord son ancien moteur. Une petite archive de dépannage est fournie avec la release : **Feuillet-Correctif-MAJ-0.13.1.zip**.

1. Fermer la fenêtre de mise à jour et vérifier que Feuillet s’ouvre. Si le site reste en maintenance, utiliser d’abord la restauration décrite dans [le guide](MISES-A-JOUR.md).
2. Télécharger une sauvegarde depuis Feuillet et conserver une copie locale du fichier actuel `feuillet/app/updates.php`.
3. Décompresser le correctif. Il contient les instructions et un dossier `A_ENVOYER_DANS_FEUILLET/app/` avec **un seul fichier : updates.php**.
4. En FTP, ouvrir **feuillet/app/** sur le serveur et remplacer uniquement **updates.php**, en transfert binaire. Les autres fichiers et la racine web feuillet/public restent en place. Ne pas effacer ni synchroniser les dossiers.
5. Recharger Feuillet, cliquer **Vérifier** puis installer **0.13.1**. Si la vérification vient d’être faite, attendre une minute avant de la relancer.

Le numéro de l’ancienne version reste affiché après ce seul remplacement : c’est normal, le correctif ne change pas bootstrap.php ou le manifeste. Le numéro passe à 0.13.1 après la mise à jour complète. Le correctif ne contient ni config.php, ni storage, ni base SQL, ni compte ou clé. Ne pas relancer setup.php ni réinitialiser la base.

Depuis une installation déjà à jour et cohérente, la release complète reste installable directement depuis Réglages & sauvegardes.

## Développement et vérification

Les tests distinguent une distribution téléchargée corrompue d’une copie installée modifiée. Ils couvrent la sauvegarde/restauration exacte, les fichiers absents, les chemins protégés et les liens symboliques refusés. Un scénario opt-in part d’une véritable archive 0.11.0, applique seulement le correctif, puis installe la distribution courante en conservant une note privée, un média, la configuration et la session. [Validation](TESTS.md).
