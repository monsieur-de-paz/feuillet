# Feuillet 0.21 — Lecture rapide et application installable

## Navigation et texte prioritaires

Les liens de sous-pages publiques chargent le contenu et le fil d’Ariane sans recharger les feuilles de style et les scripts de l’interface. L’historique du navigateur continue de fonctionner. Une page déjà visitée peut réapparaître immédiatement depuis la mémoire, puis sa publication est vérifiée en ligne. La mémoire est limitée à 20 réponses pendant dix minutes et ne survit pas à la fermeture de la page.

Le serveur réutilise les informations déjà lues au sein d’une même requête de lecture, sans ajouter un cache partagé de pages privées. Le verrou de session est libéré avant les opérations coûteuses du lecteur et des médias. Les images publiques sont chargées et décodées avec une priorité basse ; les médias audio ne préchargent plus leur contenu. Les emoji du système sont préférés avant la police de secours. Le texte reste présent dans la réponse HTML/JSON et ne dépend pas du chargement des médias.

## Installer Feuillet

Le bouton **Application**, dans la barre supérieure, explique comment installer le site :

- Chrome/Edge : utiliser **Installer Feuillet** lorsqu’il est proposé, ou le menu d’installation du navigateur.
- iPhone/iPad : **Partager → Sur l’écran d’accueil**.

L’installation nécessite HTTPS en production. Le navigateur intégré de certains logiciels ne propose pas l’installation ; ouvrir alors Feuillet dans un navigateur compatible. Le logiciel reste un site web auto-hébergé, sans VPS ni magasin d’applications.

## Activer la lecture hors connexion

Dans **Application**, choisir **Activer sur cet appareil**, puis consulter les pages publiques que l’on souhaite conserver. Seules les pages consultées sont enregistrées : ce n’est pas une copie automatique de tous les carnets ou descendants.

Les copies contiennent le texte et la mise en forme de **40 pages publiques maximum**, pendant **24 heures**. Les styles et scripts publics nécessaires sont conservés séparément. Les médias (PDF, audio, vidéo, fichiers et images des pages) et l’édition administrateur nécessitent une connexion. Il n’y a ni édition hors ligne ni synchronisation de modifications privées dans cette version.

Depuis 0.23.1, une navigation attend la réponse du serveur avant d’afficher une copie déjà en mémoire. Quand la requête réseau échoue, une copie hors connexion peut s’afficher si elle est encore disponible. Une réponse signalant une dépublication efface aussi les copies enregistrées de cette page sous ses autres adresses. Les copies antérieures à 0.23.1 sont supprimées lors de la mise à jour du service worker.

**Important :** un appareil sans réseau ne peut pas savoir qu’une page vient d’être rendue privée. Activer la conservation uniquement sur un appareil de confiance. **Effacer et désactiver** supprime les pages conservées ; les ressources publiques de l’interface peuvent rester en cache. Les caches sont propres au navigateur et au chemin d’installation, pas à l’adresse IP.

## Validation

La démonstration a été testée avec le serveur local réellement arrêté : rechargement complet d’une sous-page depuis le stockage local, puis redémarrage, publication d’un nouveau texte, récupération de cette version et nouvelle lecture hors connexion. L’effacement a aussi été vérifié. L’installation sur l’écran d’accueil dépend du navigateur et n’a pas été effectuée sur le système de l’utilisateur pendant ces tests.
