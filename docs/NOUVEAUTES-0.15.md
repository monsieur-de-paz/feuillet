# Feuillet 0.15 — Édition, couvertures et lecture publique

## Galeries et pièces jointes

Le fond coloré autour des galeries disparaît, y compris en sélection. Les cartes gardent leur propre surface. Une sélection groupée dispose d’un repère latéral discret.

La lecture publique utilise une carte de fichier compacte : icône, nom sur plusieurs lignes si nécessaire, format et taille, puis les deux actions **Aperçu** et **Télécharger**. Les surfaces suivent le thème clair, sombre ou OLED. Sur mobile, les actions occupent une ligne dédiée et leurs cibles atteignent 44 px de hauteur.

## Lecteur PDF sur le mutualisé

Certains serveurs Apache ne fournissent pas le type JavaScript des fichiers `.mjs`. Le navigateur refuse alors PDF.js et peut laisser « Ouverture du document… » affiché.

Le moteur et le worker passent désormais par une URL PHP locale qui fournit explicitement le bon type. La distribution inclut aussi les types MIME JavaScript/WebAssembly dans `public/.htaccess`. Un échec de chargement ou un document endommagé affiche une alternative de téléchargement. Les aperçus publics fonctionnent sans connexion ; les fichiers privés restent protégés.

## Couvertures accessibles et zoom

**Changer**, **Repositionner** et **Retirer** sont affichés au-dessus du contenu pour rester cliquables si une zone de la page chevauche l’image.

Dans **Repositionner**, utiliser le glissement de l’image, les axes horizontal/vertical et le nouveau **Zoom**, de 100 à 300 %. **Centrer** rétablit le cadrage standard. **Annuler** retrouve le cadrage présent à l’ouverture du réglage ; **Terminer** conserve les changements. Le zoom et la position sont conservés avec la page, sa publication, ses sauvegardes et son export PDF. Ces commandes existent aussi sur les couvertures des carnets.

La publication automatique suit le réglage global habituel. Une page configurée pour conserver un brouillon doit être publiée pour montrer ses changements aux visiteurs.

## Copier-coller des blocs entre pages

1. Sélectionner des blocs avec le rectangle de sélection, ou sélectionner tout le contenu dans l’éditeur.
2. Utiliser **Ctrl+C** sous Windows/Linux ou **Cmd+C** sur Mac.
3. Ouvrir la destination et cliquer dans son contenu à l’endroit souhaité.
4. Utiliser **Ctrl+V** ou **Cmd+V**.

Les blocs conservent leur ordre, leurs mises en forme, les contenus dépliables, les références aux fichiers et les réglages des galeries. Les fichiers restent dans la bibliothèque existante ; les pages affichées dans une galerie restent les mêmes références. La source est conservée. Une seule annulation retire le collage complet.

Le format structuré fonctionne dans la même installation Feuillet. HTML et texte sont aussi placés dans le presse-papiers pour les autres applications. Entre deux installations différentes, Feuillet utilise le texte de secours.

## Mise à jour

Ouvrir **Réglages & sauvegardes → Vérifier**, puis installer la version 0.15 proposée. Les fichiers compilés, le moteur PDF et la configuration Apache sont inclus. Aucune migration SQL supplémentaire ni commande serveur. Conserver `config.php` et le dossier `storage/` existants.
