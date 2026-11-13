# Feuillet 0.31.1 — La feuille blanche

Les pages claires de l’éditeur et du lecteur retrouvent un fond **`#FFFFFF`**. Le grain est retiré du fond, des cartes, des boutons, des menus et des fenêtres. Les surfaces retrouvent leurs couleurs unies et les trois fichiers de texture sont supprimés, ainsi que leur préchargement hors connexion.

Les couleurs d’accent, les proportions, les espacements et les animations Rivage sont conservés. Les thèmes sombre et OLED restent adaptés à leur mode. Les poignées dégagées des cases à cocher et les icônes PWA sur fond blanc de la 0.31 sont également conservées.

## Aperçu

![Éditeur blanc sans grain](assets/0.31.1-editor-light.png)

## Mise à jour

Installer **0.31.1** depuis les réglages de Feuillet, ou utiliser **Feuillet-0.31.1.zip** dans la release GitHub. Pour un transfert manuel, conserver `config.php` et tout `storage/`, remplacer le code et les ressources ensemble, puis recharger les onglets. Aucune migration SQL.

Le blanc, l’absence de texture en édition et en lecture, et le maintien de la surface sombre ont été vérifiés dans le navigateur intégré. La compilation et les contrôles PWA et de mouvement ont été relancés. Le paquet est contrôlé contre son manifeste avant publication.
