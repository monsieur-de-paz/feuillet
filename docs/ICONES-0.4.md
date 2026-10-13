# Icônes et émojis — Feuillet 0.4

Le sélecteur permet de choisir un émoji, un dessin Lucide ou une image pour une page et pour le carnet. Il fonctionne avec les ressources hébergées sur le même serveur. Les seules recherches Internet sont celles que l’utilisateur déclenche dans l’onglet Image ; l’affichage courant des icônes ne consulte aucun CDN.

## Catalogue d’émojis

Le catalogue embarque les **3 972 séquences pleinement qualifiées et composants** du fichier officiel [Unicode emoji-test, version 18.0](https://unicode.org/Public/emoji/latest/emoji-test.txt), téléchargé le 13 octobre 2026. Les formes non qualifiées et partiellement qualifiées sont exclues pour éviter des doublons d’affichage. Dix catégories officielles sont traduites en français. La recherche utilise les noms officiels anglais et les noms/mots clés français et anglais des [annotations CLDR](https://github.com/unicode-org/cldr-json). Lorsqu’une annotation française manque pour une nouveauté, le nom anglais reste disponible.

La vue habituelle regroupe les séquences apparentées et propose un choix de teint de peau. La case **Toutes les variantes** expose l’intégralité des 3 972 entrées, y compris les combinaisons de teints différentes dans les séquences à plusieurs personnes. Une recherche sur une variante peut la faire apparaître même dans la vue regroupée. L’icône enregistrée est la séquence Unicode exacte, sans transformation lors de la sauvegarde. Le catalogue et son index de recherche sont chargés à l’ouverture de l’onglet Émojis, puis les résultats sont affichés par lots pour préserver la fluidité sur mobile.

L’apparence iPhone est obtenue sur les appareils disposant de **Apple Color Emoji** : cette police installée est utilisée en premier. Feuillet ne copie et ne redistribue aucune police Apple propriétaire. Sur les autres appareils, une police libre locale [Noto Color Emoji](https://github.com/googlefonts/noto-emoji) sert de repli ; le dessin reste celui de Noto. Un rendu strictement identique à celui d’un iPhone sur tout appareil ne peut donc pas être garanti.

La police incluse vient de `googlefonts/noto-emoji/main/2D/fonts/NotoColorEmoji.ttf`. Son nom interne est Noto Color Emoji, sa version interne `2.057;GOOG;noto-emoji:20260911:fc4ca365e7c20e78278ae702aa20434bfe704c8f`. Elle contient notamment les caractères de base des nouveautés Emoji 16, 17 et 18. Cela ne garantit pas à lui seul le rendu de chaque séquence composée sur chaque navigateur. La prise en charge des fontes couleur CBDT/CBLC dépend du navigateur : Apple reste prioritaire sur macOS/iOS, où certaines nouveautés peuvent attendre une mise à jour du système. Le nom CSS du repli est `Feuillet Noto Emoji`.

La police TTF pèse **10 730 124 octets**, téléchargés seulement si le navigateur a besoin de ce repli, puis mis en cache normalement. Il n’y a ni sous-ensemble incomplet ni conversion WOFF2 dans cette livraison. Les catalogues contiennent les données, pas des images distantes. Un export PDF utilise le mécanisme de police propre à cet export : le dessin natif coloré des émojis dans un PDF n’est pas garanti.

## Icônes Lucide

Le catalogue comprend **1 544 dessins uniques** de la version installée `lucide-react@0.468.0`, plutôt que d’annoncer le nombre d’une version plus récente. Les alias du paquet complètent la recherche. Les noms anglais et certains synonymes français usuels sont recherchables ; la recherche française n’est pas une traduction exhaustive des identifiants Lucide. Les catégories sont des regroupements Feuillet, sans incidence sur l’accès au catalogue complet.

Le choix de couleur est enregistré avec le dessin. Le curseur de taille ajuste l’aperçu du sélecteur ; la taille d’affichage s’adapte ensuite à l’emplacement, par exemple une petite ligne de navigation ou une grande icône de page.

Les dessins sont extraits du paquet installé et rassemblés dans un sprite SVG statique. Les seuls éléments présents dans les symboles sont les primitives SVG Lucide autorisées ; aucun SVG fourni par un visiteur n’est injecté. Le champ d’icône accepte un identifiant existant dans le manifeste et une couleur hexadécimale. Il n’accepte pas de balisage libre. Les licences upstream sont conservées dans `public/icons-LICENSE.txt` : Lucide utilise la **licence ISC**, distincte de la licence MIT de Feuillet.

## Images

L’onglet Image expose l’import d’un fichier, la bibliothèque du carnet, la recherche Wikimedia Commons et le collage depuis le presse-papiers. Le composant transmet les images au même parcours d’import que le reste de Feuillet ; les limites de taille, validation de format, autorisations et crédits restent ceux du serveur. Le collage via bouton nécessite un contexte sécurisé et une API de presse-papiers prise en charge. Si le navigateur le refuse, le collage normal avec ⌘V/Ctrl+V reste proposé dans cet onglet.

Une icône image est référencée par `icon_id` et servie par `media.php`. Le lecteur ne reçoit pas une URL directe du dossier privé de stockage. Le changement d’une icône se sauvegarde avec les métadonnées de la page ou du carnet ; il utilise les règles de publication de l’application.

## Contrat des composants

`frontend/src/IconPicker.tsx` exporte `FeuilletIcon`, `IconPicker`, `parseWebIcon` et `webIconValue`.

```tsx
<FeuilletIcon icon={page.icon} iconId={page.icon_id} size={24} />

<IconPicker
  value={{ emoji: '📘', webIcon: null, iconId: null }}
  onEmoji={emoji => saveIcon(emoji)}
  onWebIcon={icon => saveIcon(icon)}
  onImage={(action, file) => chooseOrUploadImage(action, file)}
  onRemove={() => clearIcon()}
  busy={saving}
/>
```

`FeuilletIcon` prend `icon`, `iconId`, `size`, `className`, `label`, ou la même structure `value` que le sélecteur. Le fichier image est prioritaire, puis l’icône Lucide, puis l’émoji. Le code `f.` produit la marque typographique Feuillet. `label` rend l’icône accessible comme image nommée ; sans label, elle est décorative pour ne pas répéter le titre voisin.

`onWebIcon` reçoit une chaîne complète comme `lucide:book-open:#38795D`. La couleur est facultative pour les anciennes valeurs `lucide:book-open`. Le format courant est inférieur à 64 caractères pour tout le catalogue ; le helper omettrait la couleur si une future version dépassait cette limite. `onImage` reçoit `upload`, `paste`, `library` ou `internet`, avec un `File` pour l’import/collage. Les gestionnaires sont fournis par l’application ; le sélecteur ne modifie pas directement la base de données.

`public/icons.svg` est utilisé pour le rendu PHP ; Vite émet aussi l’URL de l’asset nécessaire au rendu React. `public/icons.json` fournit les noms autorisés au PHP par lecture locale et n’a pas besoin d’être exposé en HTTP. `public/emoji-font.css` fournit la déclaration de police commune au frontend et au lecteur PHP. `IconPicker.css` applique les familles de police aux composants, sans embarquer une deuxième copie du fichier TTF.

## Origines et vérifications

Les fichiers de licence à conserver dans une redistribution sont :

- `public/icons-LICENSE.txt` : Lucide, ISC.
- `public/fonts/NotoEmoji-OFL.txt` : police Noto Color Emoji, SIL Open Font License 1.1.
- `public/fonts/Unicode-LICENSE.txt` : données Unicode et CLDR, Unicode License v3.

Empreintes SHA-256 des sources téléchargées :

| Source | SHA-256 |
| --- | --- |
| `emoji-test.txt` | `8f3735cda1f92a779d78af67cf86066bb1f07143dc22f2ac29394d9bc57ab21a` |
| CLDR annotations FR | `33da052f74782791989e6226d60871c846799e077a5a7fb4e87ecfa7ca385733` |
| CLDR annotations FR dérivées | `012bb08af81a2ea0686e8fe069388f02dbd025d62b02d7423067c452b37e8855` |
| CLDR annotations EN | `f22083cb86dffb63a643d5bacb5d9899f82d2fa5d388ad4f3aed72184acef505` |
| Police Noto incluse | `15671215ab769fdc7162a045d56fd7d7e477c51b04e6b3c761d914d8fdd6cc44` |

Le contrôle des données compare toutes les séquences au fichier Unicode original : **3 972 entrées uniques, 1 940 familles regroupées, 2 045 entrées avec teint**, aucune entrée pleinement qualifiée oubliée. Le contrôle XML vérifie **1 544 identifiants uniques**, l’égalité entre sprite/manifeste/catalogue, l’absence de scripts, événements, styles libres et références externes. La plus longue valeur sérialisée avec couleur mesure 49 caractères. `npx tsc --noEmit` a réussi après ajout des composants. Ces contrôles de données ne remplacent pas la vérification de rendu sur les navigateurs cibles.

Pour mettre à jour, télécharger une nouvelle version officielle d’`emoji-test.txt` et les annotations CLDR, conserver uniquement `fully-qualified` et `component`, recouper les séquences exactes, recalculer les familles sans sélecteur FE0F ni modificateur de teint, puis actualiser les JSON et les empreintes. Les icônes doivent être régénérées depuis la version Lucide effectivement verrouillée dans le projet, avec le même filtre de primitives SVG et la même cohérence sprite/manifeste. Actualiser les licences lors de chaque mise à jour de ces ressources.
