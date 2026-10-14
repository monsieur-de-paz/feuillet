# Revue de l’installation et des mises à jour — 0.8

Mode **full**. Périmètre : setup PHP/CSS/JS et nouveau panneau React de mise à jour. L’éditeur et les menus préexistants sont conservés. Guides employés : `make-interfaces-feel-better` et `redesign-skill` déjà utilisés dans le projet ; aucune nouvelle bibliothèque graphique.

| Catégorie | Éléments inspectés | Résultat |
|---|---|---|
| Typographie | Titres du setup, labels, états, notes de release et numéros de version | Échelle et poids explicites, polices locales, numéros tabulaires |
| Surfaces et couleurs | Colonne introductive, formulaire, panneau, erreurs et progression | Accent cohérent, panneau utilisant les tokens de thème existants |
| Animations | Entrée de l’illustration et changement d’étape, chargement d’update | Opacité/transform uniquement ; réduction des mouvements respectée |
| Icônes et cibles | Logo montagne/lac, progression, boutons de navigation et de contrôle | Logo partagé, labels, cibles mobiles 44–48 px |
| Performance et interaction | Setup sans framework, formulaires, sauvegarde préalable et récupération | Assets locaux, pas de dépendance ajoutée, contrôles explicites |

| Sévérité | Emplacement | Avant | Après | Pourquoi |
|---|---|---|---|---|
| MEDIUM | public/setup.php | Un long formulaire sans séparation des décisions | Hébergement, carnet puis connexion, Retour et validation de l’étape | Réduire la charge de lecture et expliquer chaque choix |
| MEDIUM | public/setup.css / setup.js | Pas de retour d’état dédié pendant l’installation | État occupé, message vivant, erreur inline, valeurs conservées en JavaScript | Éviter doubles envois et perte du contexte |
| LOW | public/setup.css | Apparence reprise du lecteur public | Grille asymétrique, marges propres et illustration liée à la marque | Cohérence graphique et respiration |
| MEDIUM | frontend/src/Updates.tsx | Aucun état disponible pour mise à jour ou échec | Vérification, choix, progression, résultat et sauvegarde | Rendre le déploiement compréhensible et récupérable |
| MEDIUM | frontend/src/App.tsx | Handler de fermeture du dialogue capturé au premier rendu | Référence au handler actuel ; fermeture désactivée pendant l’installation | Le dialogue doit fonctionner après changement d’état |
| LOW | frontend/src/interface.css | Nouveau panneau accolé à l’action suivante | Espacement de 22 px et marges responsives 24/18 px | Conserver la séparation des réglages |

Candidats écartés : framework d’animation (inutile pour deux transitions CSS), effet de particules permanent (distrait de l’installation), copie de tous les médias à chaque update (coût disproportionné sur le mutualisé). L’illustration utilise le PNG de marque dans une image animée ; aucun dessin SVG animé par modification répétée de tracé n’est requis.

Vérifications : TypeScript/Vite et formatage ; syntaxe PHP/JS ; installation JSON neuve SQLite/MySQL et protections ; mise à jour et restauration après erreur de code, de migration et interruption forcée. Chromium intégré : étapes Hébergement/Carnet, focus et validation, vue 320/390 px sans débordement, boutons de 48 px ; panneau de mise à jour avec tokens et marges mesurés. Les erreurs et la troisième étape SQL sont contrôlées par les tests et le code ; aucune saisie de nouveau mot de passe utilisateur n’a été effectuée par l’automatisation du navigateur. La préférence reduced-motion est vérifiée dans les règles CSS ; sa préférence OS physique n’est pas modifiée.

Verdict : **Approve pour les parcours inspectés**, avec limites explicites : Safari/iOS, téléphone réel, lecteur d’écran, réglage OS reduced-motion et mutualisé OVH réel non vérifiés.
