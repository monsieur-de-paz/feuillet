# Sécurité de Feuillet

Installer la dernière version stable disponible depuis les releases officielles. Les anciennes distributions restent accessibles pour les besoins de restauration mais ne reçoivent pas de correctifs séparés.

## Signaler un problème

Utiliser **Security → Report a vulnerability** sur GitHub lorsque le signalement privé est disponible. Ne pas publier de mot de passe, fichier config.php, export de carnet, contenu d’élève ou preuve contenant un secret dans une issue publique. À défaut de signalement privé, ouvrir une issue indiquant seulement la catégorie et demander un moyen d’échange privé avant de transmettre les détails.

## Données privées et publication

La racine web doit rester `feuillet/public`. Conserver config.php, storage/, bases, sessions et sauvegardes hors de cette racine et hors de Git. `.gitignore` et `.htaccess` sont des fichiers publics normaux : ils servent à prévenir des publications et accès accidentels. Ils ne contiennent pas les identifiants de l’installation. Gitignore ne retire pas un fichier déjà suivi par Git.

Avant publication : `python3 tools/audit-publication.py --history`. Avant diffusion d’une distribution : ajouter `--archive /chemin/Feuillet-version.zip`. Ce contrôle recherche les chemins de données privées et des motifs connus de secrets ; il ne remplace pas la revue humaine. Une absence de détection ne prouve pas l’absence de toute faille.

Les protections GitHub de détection de secrets et de blocage au push complètent le workflow de publication et l’audit npm. En cas de secret réellement publié, le révoquer immédiatement : supprimer le fichier courant ne retire pas les copies, forks, releases et anciens commits. Préparer ensuite le nettoyage de l’historique en coordination avec les contributeurs.

Les copies hors connexion sont facultatives, publiques uniquement et réservées aux appareils de confiance. Une dépublication distante ne peut pas être vérifiée hors réseau. Voir les limites documentées de la PWA.
