# Feuillet 0.26 — une interface plus fluide

La version **0.26.0** renouvelle l’interface de rédaction et de lecture. Elle conserve les pages, carnets, médias, liens de partage et réglages existants. Elle ne demande ni VPS, ni nouvelle dépendance, ni changement de schéma SQL.

## Une même identité dans l’éditeur et le lecteur

L’accueil met en avant la dernière page et l’activité récente. La navigation, les cartes, les menus, les fenêtres et les marges partagent désormais les mêmes repères graphiques. Les titres restent neutres ; les accents suivent les préférences du thème clair, sombre ou OLED.

Les transitions sont courtes et interrompables. Les changements de page, les ajouts et déplacements de blocs utilisent de petits déplacements, sans faire disparaître le texte. Les fenêtres restent opaques pendant que le voile s’assombrit. La préférence système de réduction des animations est respectée. Le bandeau public possède le même espacement au-dessus et au-dessous.

## Des réglages mieux organisés et enregistrés automatiquement

Ouvrez **Réglages & sauvegardes** et choisissez :

- **Votre espace** : logo, titre, sous-titre, publication automatique, raccourci et taille des fichiers.
- **Apparence** : thèmes, accents, polices, largeur de lecture et plein écran.
- **Accueil public** : choix ou création de la page présentée à la racine du site.
- **Vos données** : import, sauvegarde et restauration.
- **Mises à jour** : disponibilité des releases et installation.

La fenêtre conserve les mêmes dimensions entre les sections ; son contenu défile. Les préférences générales ne nécessitent plus de bouton **Enregistrer**. Elles sont enregistrées lorsque vous quittez le formulaire ou fermez les réglages. L’apparence et le choix de l’accueil public conservent leur sauvegarde immédiate.

La fermeture et le démarrage d’une mise à jour attendent les écritures en cours. En cas de valeur invalide ou d’erreur de sauvegarde, corrigez le problème avant de réessayer ; l’installation ne démarre pas avec ces modifications en attente.

## Une bibliothèque par dossiers

La bibliothèque propose **Documents, Images, Audio, Vidéos, Autres fichiers** et **Liens**. Ces dossiers sont virtuels : les fichiers restent au même endroit sur le serveur. Le bouton de vue permet de retrouver la liste ; votre choix est conservé sur cet appareil.

Le dossier Liens regroupe les liens enregistrés dans les pages, avec leur page source et son état public ou privé. Cet inventaire est réservé à l’administrateur et limité à 1 000 entrées. Il ne télécharge pas les sites référencés. La recherche, le renommage, le téléchargement et le bouton Utilisations restent disponibles pour les fichiers.

## Cadrer une couverture directement sur l’image

Cliquez sur **Repositionner**, puis déplacez l’image dans son cadre. Les repères de tiers facilitent le cadrage. Réglez le zoom, recentrez ou annulez ; **Terminer** valide la position. Les flèches déplacent le cadrage, Maj accélère le déplacement, Entrée termine et Échap annule.

Les miniatures de galerie et d’accueil respectent la position et le zoom de la couverture, sans déborder de leur carte.

## Les vidéos en ligne montrent leur lecteur dès l’ouverture

Les lecteurs des fournisseurs reconnus — YouTube, Dailymotion, TikTok et Vimeo — sont intégrés dès le chargement de la page, sans lecture automatique ajoutée. YouTube affiche sa miniature, son titre et sa commande de lecture. Lors d’une nouvelle insertion, Feuillet tente aussi de récupérer le titre via oEmbed ; une indisponibilité de ces métadonnées n’empêche pas l’intégration.

Ce comportement contacte le fournisseur vidéo dès l’ouverture de la page. Les fichiers vidéo locaux, les fichiers HTTPS directs et les intégrations HTML libres conservent leur activation au clic. Les restrictions de droits ou de domaine du fournisseur peuvent toujours empêcher une intégration ; le lien d’origine reste proposé.

## Installer cette mise à jour

Depuis une installation existante, ouvrez **Réglages & sauvegardes → Mises à jour**, vérifiez les releases et installez **0.26.0**. Le mécanisme habituel sauvegarde le code et la base avant le remplacement, puis vérifie le démarrage et restaure en cas d’échec contrôlé.

Pour un transfert manuel, utilisez **Feuillet-0.26.0.zip** et conservez **config.php et tout storage/**. Transférez aussi les fichiers cachés et les nouvelles ressources `public/atelier.css` et `public/atelier.js`. Gardez `feuillet/public` comme seule racine web. Ne relancez pas l’installateur sur une installation existante.

Le cache de l’application web est versionné en 0.26.0. Après mise à jour, contrôlez la version affichée en bas de page et dans les réglages. La disponibilité d’une release GitHub ne prouve pas que votre hébergement l’a installée.

Voir [le guide OVH](INSTALLATION-OVH.md), [les mises à jour et la restauration](MISES-A-JOUR.md), [la charte de l’interface](INTERFACE-0.26.md) et [l’architecture](ARCHITECTURE.md).


## Validation de la distribution

La préparation de 0.26.0 comprend 195 tests HTTP réussis : suites de régression sur SQLite, 16 tests du moteur de mise à jour/restauration et 5 tests d’installation sur MySQL local temporaire. Les suites frontend et PWA passent, ainsi que l’analyse syntaxique de 37 fichiers PHP et les protections sur Apache temporaire.

L’archive compilée est contrôlée fichier par fichier contre son manifeste. Une copie jetable de l’archive officielle 0.25.1 a été mise à jour vers le paquet 0.26.0 en conservant configuration, page privée, fichier et préférences ; les empreintes installées ont été revérifiées. Une installation neuve depuis le même paquet a aussi réussi. L’audit de publication inspecte l’arbre Git, son historique et le ZIP sans publier de valeur sensible.

Ces essais n’effectuent aucune mise à jour sur un hébergement utilisateur. La version installée et le comportement réel d’OVH restent à contrôler après installation.
