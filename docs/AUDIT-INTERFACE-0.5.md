# Audit de l’interface — Feuillet 0.5.0

14 octobre 2026. Mode **full**, limité au périmètre demandé : navigation et menus de pages, éditeur et sélection, listes des réglages/galeries/bases/formulaires, thème et lecture publique. React 19, cœur Tiptap 3, CSS natif existant, lecteur PHP/JavaScript autonome. Pas de migration de framework ni de nouveau paquet d’interface.

## Couverture réelle

| Catégorie | Éléments inspectés | Résultat |
|---|---|---|
| Typographie | `style.css`, `Customization.tsx`, `interface.css`, rendu des pages et menus | Fonte système, titres équilibrés, légendes plus lisibles, chiffres tabulaires |
| Surfaces | Navigation, dialogue de réglages, sélecteur, menu contextuel, formulaire mobile | Jetons communs, rayons imbriqués, menus au-dessus des conteneurs, cibles agrandies |
| Animations | Déclarations CSS, changement de thème, retour de pression, défilement avec sélection | Propriétés explicites, retour court, recalcul de la barre de sélection ; transition de thème et interruption contrôlées à 10 % dans la copie d’aperçu |
| Icônes | Lucide déjà utilisé, commandes, options d’état, choix du thème | Bibliothèque conservée, couleur héritée, coche de sélection, statut coloré |
| Performance | Imports, compilation Vite, observateurs des menus, `requestAnimationFrame` de sélection | Pas de nouvelle dépendance ; observateurs/nettoyage bornés ; avertissement de poids JS conservé |

La navigation assistée a été faite dans le navigateur intégré Chromium. Les mêmes parcours n’ont pas été rejoués sur Safari/iOS, Firefox, avec lecteur d’écran ou sur un appareil OLED physique. Le clavier virtuel est couvert par des cas de géométrie et le viewport visuel, pas par un test tactile iOS réel.

## Constats et corrections

| Gravité | Emplacement | Avant | Après | Pourquoi |
|---|---|---|---|---|
| MEDIUM | `frontend/src/Select.tsx:178`, `App.tsx`, `Customization.tsx`, `Database.tsx`, `nodes.tsx`, `Homepage.tsx` | Menus natifs de sélection, différences selon l’OS, longues listes sans recherche | Un sélecteur commun, coche, recherche sans accents, clavier et valeur native ; le clic d’une option ne réactive pas le select caché de son label | Cohérence des états et choix plus facile |
| HIGH | `frontend/src/Select.tsx:201`, `Database.tsx` | Risque de perdre la validation et le focus lors du remplacement des selects | Validation native conservée ; erreur visible ; Échap ferme seulement la liste ; Tab rejoint le champ suivant | Le nouveau contrôle doit rester réellement utilisable dans un formulaire |
| MEDIUM | `frontend/src/App.tsx:1439`, `Editor.tsx:939`, `Database.tsx` | Actions réparties entre menus différents ; clic droit du navigateur | Menu commun contextualisé, groupes, boutons équivalents et navigation clavier | Action au plus près de sa cible |
| HIGH | `frontend/src/Editor.tsx:1538` | Le clic droit pouvait viser la barre de sélection superposée et ouvrir les actions de page | La barre propose les actions de la sélection ; contexte préservé | Évite d’agir sur le mauvais objet |
| HIGH | `frontend/src/Editor.tsx`, `interface.css` | Coordonnées flottantes périmées après focus/défilement ; outil recouvert | Recalcul au prochain frame, placement hors des outils fixes ; mise en forme puis Annuler contrôlés | Une superposition ne doit pas détourner le clic |
| MEDIUM | `frontend/src/FloatingSurface.tsx:35`, `interface-geometry.ts` | Menus susceptibles d’être coupés par un panneau ou un petit écran | Popover dans le top layer, bornage, défilement interne, adaptation au viewport visuel | Les actions restent accessibles |
| MEDIUM | `frontend/src/interface.css`, `App.tsx` | Agrandir tous les boutons réduisait trop l’espace des pages | Utilitaires secondaires dans Plus d’outils ; espaces/filtres bornés et défilables | Cibles utilisables sans sacrifier l’arborescence |
| MEDIUM | `frontend/src/Customization.tsx`, `app/features.php`, `public/theme.js`, `interface.css` | Nuances verdâtres et certaines légendes trop pâles ; danger peu visible en sombre | Neutres cohérents, légendes `#6F716D`, danger adapté au sombre | Hiérarchie lisible dans les trois modes |
| HIGH | `frontend/src/ContextMenu.tsx`, `Database.tsx` | ProseMirror reprenait le focus après l’ouverture du menu de propriété | Menu hors du DOM éditable et focus rétabli après les callbacks de frame ; flèches vérifiées sans focus forcé | Le menu doit prendre le clavier lors de son ouverture |
| LOW | `frontend/src/ThemeToggle.tsx`, `ContextMenu.tsx`, `public/theme.js` | Choix personnel et thème hérité difficiles à distinguer | Choix radio vérifiable en admin et état du choix hérité correct dans le lecteur | État statique explicite, pas seulement une animation |
| LOW | `frontend/src/interface.css`, `Customization.tsx`, `style.css`, `public/reader.css` | Fonte Inter déclarée sans besoin propre au carnet ; rayons et rythmes disparates | Fonte système et jetons documentés ; polices de l’auteur conservées | Finition dans le système CSS existant |
| LOW | `frontend/src/interface.css` | Retour de pression, focus et séparation d’images variables | Retour court, focus visible, contours neutres des images | Typographie et surfaces mieux intégrées |

## Pistes considérées et rejetées

| Emplacement | Proposition | Raison |
|---|---|---|
| Navigation | Remplacer le masquage complet par un rail d’icônes | Le masquage complet est un choix demandé pour Feuillet ; tiroir mobile conservé |
| Pages | Imposer une grille asymétrique, textures et apparitions au scroll | Un cours doit rester un document ; l’auteur choisit ses galeries et images |
| Typographie/icônes | Ajouter une nouvelle fonte et changer toute la bibliothèque | Fonte système et Lucide déjà intégré suffisent ; conserver les choix de l’auteur |
| OLED/emoji | Supprimer le noir pur et les emoji conformément à une prescription générique | Ces deux fonctions font explicitement partie du brief utilisateur |

## Vérifications et verdict

Voir [TESTS.md](TESTS.md) pour les commandes reproductibles, suites serveur et cas frontend. Parcours réels contrôlés : liste longue filtrée B puis Entrée ; Échap restituant le focus ; Tab allant à la taille maximale des fichiers ; erreur sur choix obligatoire vide puis réponse fictive envoyée ; duplication de bloc puis annulation ; sélection au clic droit, Gras puis Annuler ; choix personnel Clair/Sombre/OLED puis restauration ; menu de sous-page ouvrant la bonne page et focalisant son titre. Mobile : 390 et 320 px, pas de débordement horizontal sur les parcours contrôlés.

**Verdict : Approve dans le périmètre testé.** Aucun constat actionable HIGH, MEDIUM ou LOW laissé ouvert dans les parcours contrôlés. La transition du symbole de thème a été ralentie temporairement de 150 à 1 500 ms dans le CSS de l’aperçu, ses états intermédiaires et son interruption ont été inspectés, puis le CSS normal restauré. Le panneau Animations du navigateur intégré n’a pas été utilisé. Vérifications non réalisées : Safari/iOS et Firefox, lecteur d’écran, clavier virtuel réel, préférence de réduction du mouvement activée dans le système et audit WCAG complet. Cela constitue une validation locale, pas une certification d’accessibilité ni une garantie sur chaque navigateur.
