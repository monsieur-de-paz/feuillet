# Feuillet 0.4 — un accueil à composer et des bases plus simples à utiliser

## Un accueil visiteur entièrement éditable

Dans la barre latérale, **Accueil visiteur** permet de créer une page d’accueil ou d’utiliser une page existante. **Modifier l’accueil** ouvre cette page dans l’éditeur habituel. Son titre, son sous-titre (description), ses sections, images, boutons, liens et galeries sont tous éditables.

La nouvelle page contient une galerie vide. Ouvrir ses réglages pour choisir les pages, les ordonner, modifier le titre de la section, le nombre de colonnes, les lignes et la disposition. Les visiteurs ne voient que les pages publiées de cette sélection. Une autre galerie permet une autre section : aucune liste de tous les documents n’est ajoutée automatiquement.

L’accueil possède un brouillon et une version publiée comme les autres pages. Cliquer une première fois sur **Publier**, puis consulter `index.php?read=1`. Après la première publication, ses modifications sont automatiquement visibles après enregistrement, sauf si le mode de publication automatique est désactivé. Un accueil privé, absent ou mis à la corbeille laisse un message d’attente sans exposer de documents privés. Le choix d’une page ne la publie pas à lui seul. Si elle possède des sous-pages, la publication suit les règles habituelles de Feuillet.

Le nom et le sous-titre du carnet, visibles dans l’en-tête et l’accueil d’attente, se modifient dans **Réglages & sauvegardes → Mon carnet**. Le logo `f.` est désormais commun aux vues publique et administrateur, ainsi qu’à l’icône de l’onglet.

## Couvertures : les boutons redeviennent cliquables

À certaines largeurs d’écran, le conteneur de l’icône débordait sur les boutons **Changer**, **Repositionner** et **Retirer**. Ce conteneur laisse maintenant passer les clics hors de l’icône ; les commandes de couverture restent au-dessus de l’image. Le réglage au curseur, le glisser de l’image, l’annulation et la sauvegarde du cadrage restent disponibles.

## Des vues liées sur les mêmes données

Cliquer dans une cellule modifiable ouvre son contrôle adapté au type du champ. L’enregistrement ne modifie que ce champ et contrôle la version de la fiche. Les propriétés calculées restent en lecture seule. Les titres des colonnes donnent accès à leurs réglages ; les relations proposent une recherche parmi les titres des fiches liées.

Une base peut être intégrée à plusieurs pages. Les fiches sont partagées ; chaque bloc conserve sa propre vue, son tri, ses filtres et les colonnes affichées. La version publiée de la page conserve ses réglages de présentation. Les données des bases publiques restent mises à jour en direct, indépendamment du brouillon de la page.

**Masquer une colonne ou appliquer un filtre n’est pas une restriction d’accès.** Les lecteurs peuvent obtenir toutes les fiches publiques d’une base rendue accessible. Pour cacher une information, rendre la fiche ou la base privée. Les réponses aux formulaires restent privées.

Les références utilisées, le fonctionnement et les limites sont décrits dans [Bases : interface 0.4](BASES-UX-0.4.md). Il s’agit d’une adaptation pour un mutualisé, sans promesse de parité complète avec Notion.

## Présentation, icônes et actualisation

Les blocs fichiers disposent d’un menu **Présentation** : afficher le PDF, l’audio ou la vidéo compatible, ou proposer un téléchargement. Un lien se transforme entre texte cliquable, bouton et carte avec titre/description, en conservant son adresse. L’aperçu de carte est rédigé dans Feuillet ; les métadonnées du site distant ne sont pas récupérées automatiquement. [Guide des blocs](BLOCS-0.4.md).

La page et le carnet disposent de trois onglets d’icônes : **Émojis**, **Icônes**, **Image**. Le catalogue contient 3 972 séquences Unicode 18 et 1 544 icônes Lucide colorables. Apple Color Emoji est utilisé lorsqu’il est installé ; Noto libre sert de repli local. [Catalogue et licences](ICONES-0.4.md).

Les pages déjà publiques se mettent à jour après chaque enregistrement. Un lecteur déjà ouvert détecte leurs changements sans rechargement manuel ; le mode brouillon reste disponible. Un bouton personnel clair/sombre/OLED est accessible sur ordinateur et mobile. Les galeries partagent maintenant le même rendu dans les deux vues. [Publication et thèmes](PUBLICATION-ET-THEMES-0.4.md).

## Contrôles de sécurité et documentation

Sur une installation neuve, une clé privée créée dans `storage/installation-key.txt` doit être lue par FTP/SFTP et saisie dans l’installateur. Un visiteur ne peut plus créer le premier compte uniquement en ouvrant le site. Cette étape ne concerne pas les mises à jour.

L’audit et les correctifs sont détaillés dans [Sécurité 0.4](SECURITE-0.4.md). Les tests se déroulent sur des copies jetables, avec accès anonymes, contrôles d’autorisation, documents malveillants, fichiers et sauvegardes. Une absence de vulnérabilité connue dans les dépendances ne prouve pas l’absence de faille dans l’application.

La [maintenance](MAINTENANCE.md), l’[architecture](ARCHITECTURE.md), l’[installation OVH](INSTALLATION-OVH.md) et le [contrat API](../API-CONTRACT.md) décrivent les parcours et les responsabilités des composants.

## Passer depuis la version 0.3

Sauvegarder la base, `config.php` et `storage/`, puis remplacer le code et les fichiers compilés de `public/`. Conserver les données et la configuration de l’installation. Les cours existants ne sont pas remplacés. Le nouvel accueil se configure depuis **Accueil visiteur** : avant sa publication, l’ancienne liste automatique est remplacée par le message d’attente.

La sauvegarde ZIP emporte le choix de l’accueil. Une restauration avec les réglages activés remappe ce choix vers la copie importée ; cette copie reste privée jusqu’à sa publication.
