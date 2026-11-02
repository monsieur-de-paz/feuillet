# Feuillet 0.19.1 — Aperçus PDF sur OVH

Cette version corrige l’erreur systématique du lecteur PDF observée sur l’hébergement OVH : le module JavaScript était compressé par Apache alors que PHP annonçait encore la longueur du fichier non compressé. Le navigateur interrompait le chargement avec une erreur HTTP/2, puis l’aperçu affichait son message d’échec.

Le moteur et son worker laissent maintenant le serveur calculer la longueur réellement transmise. Le numéro de version des URL change pour éviter les anciennes réponses mises en cache. Les PDF, les pages et leurs droits ne sont pas modifiés. Aucun réimport des fichiers ni migration de base de données.

Installer la mise à jour depuis les réglages de Feuillet, puis recharger la page avant de rouvrir **Aperçu**. La correction doit être installée sur l’hébergement pour s’y appliquer ; elle ne modifie pas le site distant depuis l’environnement de développement.
