# Feuillet 0.8 — prêt pour l’installation

L’installateur présente trois étapes : hébergement et clé privée, identité et mot de passe, connexion SQL. Une illustration montagne/lac apparaît progressivement ; les transitions sont courtes, les champs ont des labels, les erreurs gardent les valeurs du formulaire et les animations respectent la réduction des mouvements du système. Le formulaire reste utilisable sans JavaScript. Sur mobile, le parcours devient une colonne avec des boutons de 48 px.

Les protections de première installation restent présentes : clé FTP privée, CSRF, mot de passe de 12 caractères et 72 octets maximum, configuration 0600, puis fermeture du setup. Une base contenant déjà les tables Feuillet est refusée, sauf reprise identifiée de la même installation interrompue. Aucun cours de démonstration ni mot de passe prédéfini n’est livré.

Le panneau **Mises à jour** dans **Réglages & sauvegardes** contrôle les releases GitHub. Une nouvelle version peut être installée, reportée, ignorée, ou attendue jusqu’à la suivante. Les notifications peuvent être désactivées. Une copie du code et de la base précède l’activation ; la configuration et les médias sont conservés. Les interruptions et échecs de démarrage déclenchent un retour à la version précédente. [Fonctionnement, accès privé et restauration](MISES-A-JOUR.md).

La version ne modifie ni la publication des cours ni les données existantes. Installation et mises à jour intégrées utilisent la distribution **Feuillet-0.8.0.zip**. Le compte OVH réel n’a pas été utilisé pour les essais ; le diagnostic de l’installation indiquera les possibilités exactes de l’offre.
