# Identité visuelle de Feuillet

Le symbole créé pour Feuillet 0.7 associe deux sommets et trois lignes de lac. Le vide au centre du sommet évoque une crête enneigée et un pli de papier ; les lignes de l’eau rappellent celles d’un carnet. Sa silhouette est abstraite, sans illustration détaillée, ombre ni dégradé.

Le dessin original est inclus sous la licence MIT du projet. `public/feuillet-logo.svg` est la source vectorielle ; `public/feuillet-logo.png` est son rendu transparent de 1024 × 1024 pixels, avec bords anticrénelés. Le favicon reprend le même symbole. Le SVG et le PNG exportés utilisent le vert profond `#263A35` ; l’interface utilise la couleur d’accent calculée pour le thème. Conserver un contraste lisible et ne pas étirer le symbole.

L’icône intégrée porte la valeur `feuillet`. L’ancienne valeur `f.` est un alias pour les installations existantes. Les logos personnalisés déjà enregistrés sont conservés lors d’une mise à jour ; changer le logo depuis les réglages. Le bouton du logo ouvre désormais l’accueil administrateur, tandis que sa personnalisation est regroupée dans les réglages.

L’interface conserve ses principes : espace pour les documents, une couleur d’accent, formes sobres et mêmes composants en édition/lecture. [Charte graphique](CHARTE-GRAPHIQUE.md).

Pour faire évoluer le dessin, synchroniser les chemins du SVG et de `FeuilletLogo.tsx`, reprendre le SVG comme favicon, puis exporter de nouveau le PNG en 1024 pixels avec fond transparent depuis un outil vectoriel. Ces fichiers statiques sont fournis dans la distribution ; aucun moteur de rasterisation n’est nécessaire sur l’hébergement.
