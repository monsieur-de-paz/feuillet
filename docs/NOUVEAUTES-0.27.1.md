# Feuillet 0.27.1 — débloquer la navigation publique

Ce correctif traite les attentes indéfinies « Ouverture de la page… » lors d’un clic vers une sous-page, alors que son URL directe fonctionne.

## Ce qui change

- Une réponse reçue du serveur n’attend plus les lectures ou écritures du cache de pages pour être transmise au lecteur, même lorsque les copies hors connexion sont désactivées.
- Si le flux de navigation interne reste bloqué pendant **quatre secondes**, Feuillet ouvre automatiquement la même page normalement dans le navigateur. Le bouton **Ouvrir directement** permet d’emprunter ce chemin sans attendre.
- Ce mode direct reste actif dans l’onglet pendant quinze minutes après son dernier usage, pour les pages suivantes. Il utilise aussi un chemin compatible avec les anciens service workers. Les paramètres techniques de récupération sont retirés de l’adresse affichée.
- Un nouveau clic annule la navigation précédente et la vérification périodique en cours. Une ancienne réponse ne peut plus remplacer la nouvelle page.
- Les délais couvrent le début de la réponse **et son corps**, pour traiter également un flux JSON interrompu. Les scripts, styles et polices peuvent venir du réseau si leur cache ne répond pas.

Le mode direct suspend temporairement les actualisations périodiques en arrière-plan. Chaque ouverture de page reçoit néanmoins son contenu du serveur. Les pages conservent leur arborescence et les formulaires suivent leur fonctionnement habituel.

## Droits et copies hors connexion

Un délai dépassé ou une réponse interrompue ne donne pas le droit d’afficher une ancienne copie. Les pages privées restent privées, y compris lorsqu’un administrateur consulte la version lecteur. Le cache de pages reste réservé aux publications anonymes et nécessite l’activation explicite de la conservation hors connexion.

La dépublication met les copies concernées en quarantaine pendant leur suppression. Un effacement demandé par l’utilisateur ne peut pas être annulé par une écriture restée en attente. L’enveloppe hors connexion ne reprend pas une ouverture directe de récupération, pour éviter une boucle de rechargement.

## Installer le correctif

Dans **Réglages & sauvegardes → Mises à jour**, vérifier puis installer **0.27.1**. Après installation, **recharger une fois les onglets déjà ouverts des élèves** pour charger le nouveau script ; une ancienne page conserve sinon son code JavaScript en mémoire. Vérifier la version en bas de page.

Il n’est pas nécessaire de supprimer systématiquement les données du navigateur. Pour un transfert FTP, utiliser **Feuillet-0.27.1.zip**, conserver **config.php et tout storage/** et transférer également les fichiers cachés. Aucune migration SQL ni nouvelle dépendance n’est nécessaire.

## Vérifications et portée

Le parcours public signalé a été consulté jusqu’au formulaire, sans soumettre de réponse. Hors réseau des collèges, les mesures HTTP directes réalisées lors du diagnostic étaient de l’ordre de 0,15 à 0,20 seconde : elles ne mesurent pas la charge du site pendant une classe.

Le blocage a été reproduit de manière contrôlée avec le code 0.27.0, en immobilisant le cache ou le flux JSON tout en laissant l’URL directe répondre. Dans le navigateur, le correctif a récupéré le parcours après **4,012 secondes**, puis la sous-page suivante s’est ouverte normalement. Un test HTTP de **32 sessions distinctes partageant la même IP** suit les pages publiques sans refus de lecture.

Ces tests établissent les défauts corrigés. Ils n’identifient pas à distance ce qui immobilisait effectivement le flux ou le cache sur les postes des deux collèges. Ce correctif ne modifie pas les quotas d’envoi des formulaires et ne prétend pas supprimer les limites de l’hébergement.

[Diagnostic technique et reproduction](DIAGNOSTIC-NAVIGATION-0.27.1.md) · [Installation OVH](INSTALLATION-OVH.md) · [Mises à jour et restauration](MISES-A-JOUR.md)
