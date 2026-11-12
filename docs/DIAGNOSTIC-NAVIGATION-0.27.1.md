# Diagnostic de navigation publique — 12 novembre 2026

## Symptôme et observations

Signalement : ouverture initiale rapide, puis clics vers les sous-pages laissant « Ouverture de la page… » pendant environ deux minutes. Copier l’URL suivante et rouvrir Chrome permettait de charger la page. Le problème a été constaté dans deux collèges.

Le site distant servait 0.27.0. Le parcours Ressources → 4eme → Analyse fonctionnelle → Travail évalué → formulaire a été consulté sans envoi de données. Le délai de deux minutes n’a pas été retrouvé sur la connexion de diagnostic. Les requêtes publiques ponctuelles mesurées hors classe donnaient environ 0,20 s pour la racine, 0,16 s pour le HTML du TP et 0,15 s pour son fragment. Ces mesures ne permettent d’exclure ni une saturation au moment de la classe ni un problème propre au réseau ou aux profils navigateur des établissements.

## Défauts établis dans 0.27.0

1. **Cache placé avant le réseau.** Le service worker appelait `await enabled()`, puis ouvrait/lisait Cache Storage avant de lancer la requête de contenu. Or `enabled()` consultait lui-même Cache Storage. Une opération de stockage immobilisée empêchait donc de contacter le serveur, même avec la conservation des pages désactivée. Le worker est enregistré automatiquement par `pwa.js` ; installer la PWA n’était pas nécessaire pour emprunter ce code.
2. **Écritures placées avant la réponse.** Lorsque la conservation était active, une réponse réseau attendait notamment `cache.put()` avant d’être remise au lecteur. Une écriture bloquée pouvait retenir un contenu déjà reçu.
3. **Attente illimitée côté lecteur.** `navigate()` attendait `fetch()`, puis `response.json()`, sans délai ni repli HTML. Les requêtes anciennes n’étaient pas annulées et une vérification périodique pouvait rester occupée indéfiniment.

Ces défauts sont reproductibles. Sans capture du poste pendant l’incident, on ne peut pas affirmer que Cache Storage était effectivement verrouillé dans les collèges, ni attribuer le problème à un proxy, à Chrome, au disque ou à OVH. La réparation couvre ces chemins d’attente sans changer les droits de lecture.

## Reproduction et contrôles

### Attente de deux minutes simulées

```sh
git show v0.27.0:public/reading.js > /tmp/feuillet-reading-0.27.0.js
node tests/reader-navigation.mjs /tmp/feuillet-reading-0.27.0.js --baseline
node tests/reader-navigation.mjs
```

Le premier essai avance une horloge de test de 120 secondes, avec une réponse qui ne se termine pas : la version 0.27.0 reste en attente sans récupération. Il ne s’agit pas d’une mesure de deux minutes sur le réseau réel. Le second vérifie le délai de quatre secondes, le corps JSON bloqué, l’annulation, les réponses dépassées, la reprise du polling, la révocation et l’absence de boucle hors connexion.

### Cache bloqué

```sh
git show v0.27.0:public/sw.js > /tmp/feuillet-sw-0.27.0.js
node tests/pwa.mjs /tmp/feuillet-sw-0.27.0.js
node tests/pwa.mjs
```

Le premier essai doit échouer sur « A blocked cache.put must not block an online page ». Le second réussit avec lectures et écritures de cache bloquées, délais réseau/corps, réponse tronquée, révocation sous suppression bloquée, effacement pendant une écriture et lecture hors ligne bornée.

Une sonde isolant la simple consultation de l’activation, conservation désactivée, donne : ancien worker = aucune requête réseau démarrée tant que le cache est bloqué ; nouveau worker = une requête et une réponse reçue sans attendre ce cache.

### Navigateur intégré

Deux copies locales isolées ont reçu les mêmes pages synthétiques. Un relais HTTP transmettait les premiers octets du JSON de navigation puis retenait le reste, tandis que le HTML direct restait disponible. Aucun contenu élève ni formulaire de production n’était envoyé.

L’ancienne navigation restait sur la page précédente avec son message d’attente. La nouvelle déclenchait une ouverture HTML en **4,012 s**, d’après les horodatages des requêtes du relais, puis suivait la sous-page suivante par navigation normale. Les essais unitaires et HTTP couvrent aussi le contournement des anciens workers et le maintien de `read=1`, donc des permissions publiques.

### Accès depuis une même IP

`python3 tests/reader.py` inclut 32 clients avec sessions distinctes, exécutés avec huit requêtes concurrentes à la fois sur un serveur de test local. Ils ouvrent la racine puis un fragment de sous-page depuis la même adresse IP. Tous reçoivent 200 et le contenu publié. Ce test vérifie l’absence de plafond de trois lecteurs sur ces routes ; il ne constitue pas un test de capacité du mutualisé OVH. Les accès privés restent refusés.

## Correction

- Réseau de contenu lancé indépendamment de Cache Storage ; écritures via `event.waitUntil`, hors du trajet de remise de la réponse.
- Navigation bornée à 4 s, polling à 5 s et flux du worker à 6 s, en-têtes et corps compris. Annulation des requêtes dépassées.
- Repli HTML et lien manuel dès l’attente. Mode direct par onglet et chemin d’installation, avec expiration après quinze minutes sans nouvel usage.
- Le repli utilise `reader-direct=1`, `read=1` et `edit=0`. Cette dernière valeur fait aussi contourner le worker 0.27.0 ; elle n’active pas l’édition, car `read=1` impose la vue publique et PHP considère `edit=0` vide. Les paramètres de récupération sont retirés de l’adresse affichée.
- Lecture du cache d’interface bornée à 200 ms et du cache hors ligne à 400 ms. Si le cache d’interface reste muet, les ressources viennent du réseau.
- Une validation interrompue ou expirée ne sert pas d’ancienne copie. Dépublication mise en quarantaine immédiatement, suppression en arrière-plan et génération d’effacement pour les écritures en attente.

Les tests de navigation et de PWA sont exécutés automatiquement dans le workflow GitHub de contrôle de publication. Après déploiement, recharger les pages ouvertes avant la mise à jour puis rejouer le parcours dans les établissements.
