# Feuillet 0.29.1 — Une navigation qui garde une issue de secours

## Ce qui a été retrouvé

Le parcours public vers les consignes a été signalé lent dans les établissements, sans bouton d’ouverture directe. Le site sert bien la 0.29 et ses scripts correspondent au dépôt. Les réponses HTML ponctuelles du parcours 4eme → Analyse fonctionnelle → TP étaient rapides lors du diagnostic hors classe ; cela ne mesure pas les conditions de l’incident.

Deux défauts de la 0.29 ont été reproduits sur le code précédent :

- Après un premier repli, le mode direct de quinze minutes utilisait une navigation native sans afficher le bandeau de secours. Un deuxième blocage pouvait donc laisser l’ancienne page sans bouton.
- Si le worker choisissait l’écran hors connexion pendant une connexion lente, le lecteur traitait cet écran comme un motif d’interdire le repli, même lorsque le navigateur était connecté. Après expiration, les contrôles étaient retirés.

L’installation d’un nouveau worker attendait aussi l’ouverture du cache et le préchargement de toutes ses ressources ; l’activation attendait le nettoyage des anciens caches. Un stockage bloqué pouvait empêcher l’activation du correctif. Le caractère effectivement bloqué du stockage dans les collèges n’est pas établi par ces tests ; ces défauts expliquent des chemins possibles et reproductibles, sans attribuer tout délai au cache.

## Nouveau parcours de chargement

1. Un clic interne affiche immédiatement **Ouvrir directement** et demande la page par le flux habituel. Cette demande est limitée à **quatre secondes**, corps de réponse compris.
2. Si elle échoue, Feuillet demande le HTML public en contournant le worker et le cache HTTP, sans quitter le document courant. Cette récupération est limitée à **cinq secondes**, corps compris. Seuls le contenu, l’en-tête et les métadonnées de lecture sont repris ; les scripts de la page ne sont pas relancés.
3. Si la récupération fonctionne, la destination s’affiche. Pendant quinze minutes, les clics suivants utilisent cette même récupération contrôlée, avec leurs boutons de secours et leur limite de cinq secondes.
4. Si les deux voies échouent, la page précédente reste consultable et son adresse est restaurée. **Réessayer** relance la demande ; **Ouvrir directement** reste un vrai lien vers la destination publique, pour une navigation native manuelle. Le navigateur n’est jamais envoyé dans une succession automatique de rechargements.

Les chemins courts de partage et les liens qui ciblent explicitement le même onglet bénéficient aussi du chargement contrôlé. Les liens externes, formulaires, téléchargements et ouvertures dans un nouvel onglet gardent leur comportement habituel.

L’écran hors connexion utilise le même repli lorsque le navigateur est connecté. Hors connexion réelle, seules les copies publiques explicitement conservées et encore admissibles sont utilisables.

## Cache et sécurité

Le préchargement de l’interface est limité à huit secondes pendant l’installation du worker. Son échec n’empêche plus la nouvelle version de prendre la main. Les ressources sont conservées indépendamment ; un échec ne supprime pas tout le préchargement. Activer la conservation hors connexion relance ce préchargement en arrière-plan, sans retarder la confirmation. À l’activation, les onglets sont pris en charge avant le nettoyage ; ce nettoyage attend au maximum une seconde.

Le repli utilise `read=1`, `edit=0` et `reader-direct=1` : la lecture reste publique, y compris avec une session administrateur, et les workers anciens contournent cette requête. `edit=0` n’active pas l’édition. Les redirections HTTP du repli et les réponses HTML sans structure de lecteur valide sont refusées. Les 404 affichent l’indisponibilité et ne réutilisent pas le contenu précédent. Aucun cache administrateur ou média n’est ajouté.

## Installation

Installer la **0.29.1** depuis les mises à jour de Feuillet, puis recharger les onglets déjà ouverts. L’installation ne modifie ni schéma SQL, ni pages, ni fichiers, ni liens de partage. Il n’est pas nécessaire de supprimer les données du navigateur ou les copies publiques conservées.

Le bandeau conserve une action manuelle : si la connexion ou le serveur ne répond à aucune demande, le logiciel ne peut pas garantir l’arrivée de la page. Il garantit ici que ses propres récupérations sont bornées et qu’elles laissent les actions de secours disponibles.

## Vérifications reproductibles

```sh
git show v0.29.0:public/reading.js > /tmp/feuillet-reading-029.js
node tests/reader-navigation.mjs /tmp/feuillet-reading-029.js --rescue-baseline
node tests/reader-navigation.mjs
node tests/pwa.mjs
python3 tests/reader.py
python3 tests/pwa.py
```

Ces tests couvrent notamment les en-têtes et corps bloqués, deux blocages successifs, le repli depuis l’écran PWA connecté, les réponses HTML invalides/404, l’annulation et les anciennes réponses, les chemins courts, les contrôles manuels, ainsi que les écritures, lectures et activations de cache bloquées. Les résultats de navigateur et de distribution sont consignés dans le diagnostic et la maintenance avec leurs conditions d’essai.

### Parcours vérifié dans le navigateur intégré

Une installation locale jetable et deux relais HTTP ont servi les mêmes pages synthétiques, avec le script 0.29 d’un côté et le correctif de l’autre. Le corps JSON de la première étape était retenu vingt secondes. Le repli HTML du correctif a été demandé après environ quatre secondes, sans attendre sa fin. Le HTML du clic suivant était retenu neuf secondes : le correctif a abandonné cette demande à cinq secondes, restauré l’adresse de la page précédente et conservé Ouvrir directement et Réessayer. Un clic sur Réessayer a ensuite affiché les consignes ; Retour a fonctionné.

Le second essai a servi l’écran PWA à une URL de page, avec le navigateur connecté et son flux JSON bloqué. Le script 0.29 terminait sur « Cette page n’est pas enregistrée sur cet appareil » sans lien de secours ; le correctif a affiché la destination par récupération HTML. Ces blocages sont artificiels et ne mesurent pas le réseau des collèges. Aucun formulaire ni document de production n’a été soumis.

Les suites HTTP de lecture (dont 32 clients depuis la même IP), PWA, partage, formulaires et sécurité ont réussi sur SQLite. La lecture publique a également été vérifiée sur MySQL. Les tests JavaScript de navigation/PWA et les contrôles frontend ont réussi. Le préchargement et l’activation sont testés avec des opérations de stockage volontairement bloquées.
