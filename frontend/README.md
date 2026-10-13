# Interface de Feuillet

React, TypeScript et cœur libre de Tiptap. Aucun composant Pro ni template payant de Tiptap n'est utilisé. Les interactions sont notre propre implémentation : menu `/`, choix de bloc au clavier, barre de sélection, actions de bloc, encadrés et colonnes.

## Construire l'archive

Node.js 20.19+ ou 22.12+ est nécessaire **uniquement pour le développement**. Le serveur de production utilise PHP et les fichiers déjà compilés.

```sh
npm ci
npm run build
```

La commande vérifie TypeScript, prépare le lecteur PDF.js et ses licences, puis écrit `../public/assets/app.js` et `app.css`. Le verrou `package-lock.json` fixe les versions de toutes les dépendances. Pour vérifier le format des sources : `npm run format:check`.

## Développer localement

Configure d'abord l'application PHP suivant le README principal. Démarre le serveur PHP avec `public/` pour racine, par exemple sur le port 8080. Lance ensuite `npm run dev` et ouvre l'adresse Vite affichée dans le terminal. Les requêtes API et médias sont transmises au serveur PHP local. Pour utiliser un autre port, indique `FEUILLET_PHP_URL=http://127.0.0.1:PORT` dans `.env.local`.

## Organisation

- `src/App.tsx` : navigation, session, autosauvegarde, publication et bibliothèque.
- `src/Editor.tsx` : extensions libres, menu de blocs et outils de rédaction.
- `src/nodes.tsx` : encadrés, colonnes, médias, galeries et quiz.
- `src/types.ts` : contrat API et fonctions d'accès au serveur.
- `src/style.css` : styles, consultation mobile et impression.

Les pages sont stockées par l'API PHP. Seuls les favoris du navigateur utilisent localStorage. Aucun jeu de données de démonstration ni mot de passe n'est embarqué. Les références de fichiers passent par `media.php`, et les PDF par `pdf-viewer.php`.
