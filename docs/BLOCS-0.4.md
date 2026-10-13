# Changer la présentation d’un bloc existant — Feuillet 0.4

Les liens et les fichiers insérés peuvent maintenant changer de présentation depuis leur propre contrôle, sur ordinateur comme sur écran tactile. Le fichier ou l’adresse déjà utilisés sont conservés.

## Fichiers et lecteurs

Un bloc fichier possède un bouton **Présentation**. Un PDF propose « PDF affiché dans la page » ou « Fichier téléchargeable ». Un fichier audio ou vidéo propose son lecteur compatible ou le téléchargement. Les autres formats proposent le téléchargement. L’interface utilise le MIME enregistré et n’affiche pas un lecteur d’un autre type. Le téléchargement et le renommage restent accessibles.

Seul `fileBlock.attrs.mode` change : `fileId`, nom, taille et MIME restent identiques. Aucun nouvel import n’est effectué. Le lecteur PDF conserve la route locale `pdf-viewer.php?id=…`. Les formats audio/vidéo restent soumis aux codecs pris en charge par le navigateur.

## Lien texte, bouton ou carte

Un bouton ou une carte affiche **Présentation**. Le formulaire permet de modifier le texte, l’adresse et choisir :

- Lien dans le texte.
- Bouton.
- Carte avec aperçu.

Pour une carte, le titre et la description sont rédigés directement dans ce formulaire ; l’URL reste affichée. Il n’y a pas de récupération automatique de métadonnées Open Graph ni d’appel à un service tiers. Le lien public s’ouvre normalement. L’enseignant dispose d’un bouton de réglage distinct de ce lien.

Pour transformer un lien déjà présent dans un paragraphe, placer le curseur dans le lien ou le sélectionner, puis ouvrir **Transformer** dans la barre de mise en forme : « Lien → bouton » ou « Lien → carte avec aperçu ». Le lien devient un bloc et le texte qui l’entourait est conservé dans les paragraphes voisins. Le menu du bloc courant permet également d’ouvrir sa présentation. Annuler/rétablir utilise l’historique normal de l’éditeur.

Le passage d’une carte à un bouton ou à un lien garde l’URL et son titre, mais retire la description propre à la carte. Cette description peut être retrouvée avec Annuler, puis réécrite lors d’un futur changement vers une carte.

## Référence et preuves

La [documentation officielle Notion sur les images, fichiers et médias](https://www.notion.com/help/images-files-and-media) décrit les blocs de fichiers, PDF, audio, vidéo et favoris web, ainsi que des options accessibles depuis le bloc. Feuillet reprend le principe d’un média configurable et l’étend ici à un choix explicite de présentation. Cette transformation précise constitue notre implémentation : elle n’a pas été observée dans une session privée Notion.

Les observations REA publiques existantes des liens et cartes du cours cible figurent dans [ANALYSE-NOTION.md](ANALYSE-NOTION.md). La nouvelle capture de documentation des vues liées est référencée dans [BASES-UX-0.4.md](BASES-UX-0.4.md), distinctement des gestes d’édition privés.

## Vérification

`tsc --noEmit` passe. Six contrôles des helpers passent (attributs des trois présentations, remplacement de sélection et rejet d’un lien `javascript:`). Sept contrôles utilisant les vraies commandes Tiptap/ProseMirror passent : transformation d’un lien situé au milieu d’un paragraphe en bouton, conservation du texte avant/après, conversion en carte puis retour en lien avec URL conservée, et changement de mode d’un fichier sans modifier son identifiant ou son MIME. L’interface se branche sur l’enregistrement normal de la page et n’ajoute aucune dépendance payante.

Ces contrôles se reproduisent avec `node tests/frontend.mjs` après `npm ci` dans `frontend/`. Les parcours navigateur et les résultats par moteur figurent dans [TESTS.md](TESTS.md).
