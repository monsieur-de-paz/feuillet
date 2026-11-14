# Feuillet 0.32 — Le mouvement au service des idées

Cette version approfondit l’interface Rivage avec des **animations plus visibles**
et des commandes plus confortables. Les pages claires restent **blanches, sans
grain** ; les modes sombre et OLED conservent leurs couleurs adaptées.

## Des interactions plus présentes

Les fenêtres apparaissent avec une translation et un léger agrandissement ;
les menus s’ouvrent depuis leur commande. Les cartes se soulèvent au survol,
et le changement de page accompagne l’arrivée du texte. Les sélections des
onglets se déplacent sans modifier la taille des commandes.

La rédaction reste immobile : Entrée, Retour arrière et les listes n’animent
pas les lignes. Commencer à écrire coupe immédiatement une animation d’arrivée.
Le rafraîchissement périodique d’une page publique ne rejoue pas son entrée.
La préférence système de réduction des mouvements est respectée.

## Des commandes plus confortables

- Cartes d’accueil avec liens natifs, focus clavier et menu contextuel conservé.
- Menus de sélection et réglages aux espacements harmonisés.
- Principales cibles tactiles agrandies ; actions de fichiers adaptées aux
  colonnes étroites, même sur un grand écran.
- Placement des menus indépendant de leur animation d’ouverture pour éviter
  les sauts de position.

Les amplitudes et choix techniques sont détaillés dans la
[charte des interactions](INTERFACE-MODERN-WEB.md). Les essais visuels ont porté
sur ordinateur, sur le lecteur et l’administration, ainsi qu’à 390 et 320 px.
Ils ne garantissent pas une cadence identique sur tous les appareils.

## Installer la mise à jour

Depuis **Réglages & sauvegardes → Mises à jour**, vérifier puis installer
**0.32.0**. La procédure conserve la configuration, les carnets et les médias,
avec sauvegarde et restauration selon le [guide des mises à jour](MISES-A-JOUR.md).
Recharger les onglets à la fin de l’installation pour charger les nouveaux assets.

Pour un transfert manuel, utiliser **Feuillet-0.32.0.zip**, conserver
**config.php et tout storage/** et remplacer le code, les ressources et le
manifeste ensemble. Aucune migration SQL spécifique ni nouvelle dépendance
serveur. La publication d’une release ne met pas automatiquement à jour votre
hébergement : l’installation se déclenche depuis vos réglages.
