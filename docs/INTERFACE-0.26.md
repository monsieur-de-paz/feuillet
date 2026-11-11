# Interface Atelier — Feuillet 0.26

**Version : 0.26.0.** Cette charte décrit la refonte Atelier, développée et revue en local avant sa distribution. Utiliser l’archive compilée `Feuillet-0.26.0.zip` de la release ; elle contient le manifeste de mise à jour et les ressources requises.

## Intention

Feuillet est un carnet personnel, pas un tableau de contrôle. La nouvelle interface prend la forme d’une feuille posée dans un espace de travail : navigation en retrait, contenu net, relief discret et repères lisibles. L’accueil devient un index éditorial, avec une page récente dominante et une liste d’activité plus légère. La Fraunces déjà disponible donne une identité à l’accueil, sans changer les polices choisies pour les documents.

Le lecteur partage les matériaux de l’éditeur : surfaces, rayons, cartes de fichiers et de liens, galeries, boutons et en-têtes. Les titres restent neutres. Les accents, les thèmes personnalisés et le noir OLED restent pilotés par les préférences existantes.

## Charte de cette itération

- Espacements : 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64 px. Les panneaux et contenus ont des marges régulières ; les listes restent denses sans devenir microscopiques.
- Rayons : 7–9 px pour les commandes, 11–14 pour les cartes et menus, 20 pour les grandes fenêtres et le panneau principal sur ordinateur.
- Relief : une bordure structurelle légère, ombres à plusieurs niveaux pour les surfaces flottantes. Les cartes ordinaires ne portent pas toutes la même ombre.
- Typographie : police système pour l’interface ; Fraunces pour le titre de l’accueil ; polices des documents inchangées. Titres en encre du thème, données numériques tabulaires.
- Palette : variables existantes `--surface`, `--surface-muted`, `--ink`, `--muted`, `--accent`, `--line`. Aucun accent fixe ajouté. Les surfaces s’adaptent au clair, sombre et OLED.
- Icônes : bibliothèque existante, traits cohérents, couleurs héritées. Pas de changement d’identité du logo dans cette itération.

## Mouvements

| Interaction | Règle |
| --- | --- |
| Survol, focus, pression | 140 ms environ, transition interrompable ; état statique également visible |
| Changement de page | Entrée de 220 ms, déplacement de 6 px, sans baisse d’opacité ; aucune attente réseau supplémentaire |
| Bloc ajouté ou transformé | Apparition courte ; aucun mouvement à chaque frappe |
| Bloc déplacé | Déplacement entre ses anciennes et nouvelles coordonnées ; grande distance remplacée par une entrée courte |
| Bloc supprimé | Réorganisation des blocs restants, sans trace fantôme ni flash de couleur |
| Fenêtre | Entrée de 240 ms, fermeture demandée par l’utilisateur de 140 ms |
| Menus contextuels | Entrée courte de 160 ms, sans rebond |

Toutes les animations respectent `prefers-reduced-motion`. Les mouvements de blocs sont limités aux éléments visibles, avec un plafond de 100 éléments mesurés. Les menus, l’édition, les sauvegardes et les droits de publication gardent leurs mécanismes existants. Aucun mouvement ne modifie le JSON ou l’historique d’édition.

## Changements structurels

Les réglages deviennent un espace avec cinq sections : Votre espace, Apparence, Accueil public, Vos données, Mises à jour. Les panneaux inactifs utilisent `hidden` et conservent leurs composants montés, donc les saisies restent disponibles pendant un changement de section. La fenêtre garde les mêmes dimensions entre les sections et chaque panneau défile indépendamment. Les flèches, Début et Fin naviguent entre onglets, et le focus reste visible.

La navigation mobile reste un tiroir. Les onglets de rédaction restent au-dessus du fil d’Ariane. La largeur de la navigation, les galeries sans fond, les couvertures, les thèmes et les liens de partage restent personnalisables.

## Organisation du code

- `public/atelier.css` : couche visuelle partagée, importée par l’admin et chargée par le lecteur. Les anciennes feuilles restent en place pour faciliter la comparaison et le retour arrière.
- `public/atelier.js` : transitions de pages par observation des identifiants de surface ; une actualisation de la même page ne rejoue pas l’animation. Pas de requête ni de cache de données.
- `frontend/src/block-motion.ts` : extension de présentation ProseMirror, sans transaction de contenu. Animations et observateurs nettoyés à la fermeture de l’éditeur.
- `frontend/src/SettingsWorkspace.tsx` : navigation et conservation des panneaux de réglages.
- `frontend/src/LibraryNavigator.tsx` et `app/library.php` : dossiers virtuels et inventaire privé des liens.
- `Customization.tsx` : commandes de cadrage et sauvegarde des préférences ; `Updates.tsx` attend les écritures avant de démarrer une installation.
- `AdminHome.tsx`, `App.tsx` et `app/reader.php` : identifiants de page, accueil et fenêtre de réglages.
- `public/offline.html` et `public/sw.js` : références aux ressources visuelles pour conserver la cohérence du lecteur hors connexion.

## Diagnostic et arbitrages

| Sujet | Problème observé | Réponse |
| --- | --- | --- |
| Typographie | Hiérarchie uniforme, écran d’accueil semblable aux pages ordinaires | Accueil éditorial et hiérarchie de tailles / graisses, documents préservés |
| Surfaces | Bordures et contrôles hétérogènes | Rayons, marges, états et relief regroupés dans une même couche |
| Animations | Pages et blocs remplacés brusquement | Transitions ciblées, durée courte, absence d’animation de la frappe |
| Icônes | Contrôles de tailles et espacements variables | Réutilisation des icônes et harmonisation des commandes |
| Performance | Risque de multiplier effets et mesures | Pas de bibliothèque ajoutée, pas de défilement artificiel, limitation des mesures et des animations |

Écartés : animations permanentes, rebonds, défilement à inertie artificielle, grandes transitions traversant l’écran, effets de fond derrière le texte, remplacement général des polices ou accents imposés. Les exigences OLED et de personnalisation passent avant les recommandations stylistiques génériques.

## Validation

Les contrôles de la refonte sont consignés ci-dessous. À rejouer lors des évolutions : création / édition / annulation, suppression et déplacement de blocs, menus et sélection de texte, réglages au clavier, navigation publique, thèmes, petits écrans, médias et sauvegarde. La publication 0.26 a été demandée après les essais de l’interface locale.

### Bilan de la première passe locale — 11 novembre 2026

- Compilation TypeScript/Vite réussie ; analyse de syntaxe PHP et JavaScript réussie ; `git diff --check` sans erreur.
- Suite frontend passée, 8 tests HTTP d’édition / rendu passés et suite de partage passée sur SQLite.
- Navigateur intégré : accueil admin, création et rédaction, menus contextuels de blocs, déplacement par le menu, suppression et annulation ; aucune erreur de console observée pendant ces parcours.
- Réglages : ouverture / fermeture, navigation aux flèches, conservation d’un sous-titre saisi en changeant de section, retour du focus à la fermeture. Vérification à 390 px, panneau contenu dans le viewport.
- Lecteur : navigation vers une sous-page et fil d’Ariane, galerie, encadrés et aperçu d’une pièce jointe image. Mode clair, sombre et OLED vérifiés. À 320 et 390 px, largeur de document égale à celle du viewport sur les écrans testés.
- Corrigé pendant la revue : sélecteur de couleur d’encadré étiré dans le flux mobile ; bordures devant résoudre leurs couleurs dans le thème courant ; ressource Atelier du lecteur gardée en cache lors d’essais successifs. La ressource possède désormais un identifiant lié à sa date de modification.
- Non vérifiés dans cette passe : ralenti à 10 % des animations (non exposé par le navigateur intégré), changement de préférence système de réduction des animations, Safari/iPhone physique, toutes les variantes d’import / formulaire / PDF et performances sur ancien téléphone. Les gardes de réduction des animations sont présentes dans CSS, JS et l’extension d’éditeur ; cela ne remplace pas une revue sur appareil réel.

État à l’issue de cette première passe : prêt pour la revue visuelle locale. Ces essais précèdent la préparation de la release 0.26.

### Deuxième passe locale — vidéos, cadrage, réglages et bibliothèque

- Les lecteurs natifs des fournisseurs vidéo autorisés sont intégrés dès l’ouverture de la page, sans lecture automatique ajoutée. YouTube affiche sa miniature et son titre dans son propre lecteur. Lors d’une nouvelle insertion, son titre est également recherché via oEmbed et conservé dans le bloc ; l’échec des métadonnées n’empêche pas l’intégration. Les fichiers vidéo locaux et les intégrations HTML libres conservent leur activation au clic.
- Le cadrage de couverture se fait directement sur l’image, avec repères de tiers, zoom, recentrage, annulation et validation. Les flèches règlent la position, Maj accélère le déplacement, Entrée termine et Échap annule. Les miniatures des galeries et de l’accueil utilisent la position et le zoom de la page dans un cadre qui découpe le débordement.
- Le bouton d’enregistrement des préférences générales est supprimé. La sortie du formulaire, la fermeture et les changements de fenêtre déclenchent ou attendent la sauvegarde. Le démarrage d’une mise à jour attend les préférences du carnet, l’apparence, le choix d’accueil public et la page en cours ; une erreur empêche le démarrage et reste affichée. Les champs invalides restent corrigeables dans les réglages.
- La bibliothèque propose Documents, Images, Audio, Vidéos, Autres fichiers et Liens. Il s’agit de regroupements virtuels : aucun média n’est déplacé sur disque. Le choix dossiers/liste est conservé sur l’appareil. Les liens proviennent uniquement des pages déjà enregistrées, avec indication de la page source et de sa visibilité. Aucun robot de collecte externe n’est lancé.
- Les marges du bandeau public sont symétriques : 12 px sur ordinateur, 6 px sur mobile. Le sélecteur de thème flottant se masque derrière les fenêtres pour ne pas couvrir les réglages mobiles.
- Les mouvements de pages et de blocs n’abaissent plus l’opacité du contenu ; les traces fantômes de suppression sont retirées. Le voile anime uniquement sa couleur de fond : les fenêtres et leurs contenus restent opaques pendant l’ouverture et la fermeture. Les titres dépliables utilisent un déplacement court sans fondu. Les animations respectent la réduction des animations.

Validation : compilation frontend réussie ; 9 tests HTTP d’édition, 2 tests d’intégration vidéo et suite frontend passés. Dans le navigateur intégré : lecteur YouTube natif avec titre, miniature et commande de lecture ; dossiers Images/Liens et retour en liste ; réglages de dimensions constantes entre sections, sauvegarde d’un sous-titre après fermeture/rechargement puis restauration ; zoom et annulation de couverture ; refus de fermeture sur titre vide puis correction ; contrôle du contraste du bouton Terminer après suppression d’une ancienne règle prioritaire. À 390 px, fenêtre de réglages de 358 × 780 px sans débordement horizontal et lecteur de largeur 390 px. Les marges du bandeau ont été mesurées au-dessus et au-dessous à 12/12 px et 6/6 px. Une installation effective de release n’a pas été lancée, car elle remplacerait la branche locale en cours de revue. Ces essais précèdent la préparation de la release 0.26.

## Distribution 0.26

Les changements sont intégrés à la distribution 0.26.0 avec une nouvelle version de cache PWA. Les sources, ressources compilées et manifeste doivent provenir de la même archive. Voir [les nouveautés](NOUVEAUTES-0.26.md) et [la procédure de mise à jour](MISES-A-JOUR.md). Les essais locaux et la publication GitHub ne constituent pas un déploiement sur un hébergement utilisateur.

La validation finale de distribution inclut aussi l’installation neuve et la mise à jour réelle d’une copie 0.25.1 avec préservation des contenus, les essais MySQL et Apache, le contrôle des empreintes et l’audit de publication. [Bilan de distribution](NOUVEAUTES-0.26.md#validation-de-la-distribution).
