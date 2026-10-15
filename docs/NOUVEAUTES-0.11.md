# Feuillet 0.11 — Mises à jour publiques sans clé

Le dépôt Feuillet est public. La vérification, le téléchargement et l’installation des nouvelles versions ne demandent aucun compte ni clé GitHub. Le formulaire correspondant a été retiré et les anciennes données d’authentification sont nettoyées lors de la lecture des préférences. Les notifications, reports et exclusions restent conservés.

## Une vérification adaptée au mutualisé

L’ancien moteur passait par l’API REST GitHub, qui applique un quota anonyme par adresse IP ; un hébergement mutualisé peut partager cette IP avec d’autres sites. Son ancien message regroupait plusieurs refus et ne permettait pas d’attribuer la capture OVH à une cause précise.

Le nouveau moteur télécharge une petite annonce Feuillet-release.json jointe à la dernière release stable, puis les fichiers de la version choisie par leurs liens publics. Aucun appel à l’API REST ni en-tête d’authentification. Les téléchargements publics restent soumis aux protections et à la disponibilité de GitHub ; un échec est affiché sans demander d’identifiant.

Les contrôles restent présents : HTTPS avec certificats vérifiés, dépôt de référence imposé, redirections bornées vers les domaines officiels, version stable, taille maximale, SHA-256 annoncé/checksum/ZIP identiques, contrôle de tous les fichiers du manifeste et syntaxe PHP. Avant activation, sauvegarde du code et de la base ; retour arrière après échec ou interruption.

## Passer d’une ancienne installation à 0.11

Si la vérification est déjà bloquée, effectuer cette première mise à jour par FTP :

1. Exporter une sauvegarde depuis Feuillet et conserver une copie de l’ancien code.
2. Télécharger et décompresser **Feuillet-0.11.0.zip**.
3. Envoyer tous ses fichiers dans le dossier feuillet existant, en conservant **config.php et tout storage/**. Ne pas relancer setup.php.
4. Recharger Feuillet, ouvrir Réglages & sauvegardes puis cliquer **Vérifier**.

L’envoi complet du code, des assets et du manifeste est nécessaire. Les pages et les fichiers restent dans la base et le stockage existants ; aucune réinstallation de base SQL. Les prochaines mises à jour utilisent le nouveau mécanisme intégré. [Guide et restauration](MISES-A-JOUR.md).

## Publier une release compatible

Le script tools/package-release.py produit maintenant trois fichiers à joindre à la release stable : ZIP compilé, fichier .sha256 et Feuillet-release.json. Le dernier reprend la version, le dépôt officiel, la taille du ZIP, son empreinte et les notes du changelog. Le ZIP automatique « Source code » de GitHub ne remplace pas la distribution compilée.

[Validation et limites](TESTS.md).
