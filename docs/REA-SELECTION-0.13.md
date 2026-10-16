# Sélection groupée — référence REA et Notion

Observation du 16 octobre 2026 avec REA 6.4.0, skill reverse-engineer-anything de [morluto/rea](https://github.com/morluto/rea). Capture bornée de [Writing & editing basics](https://www.notion.com/help/writing-and-editing-basics) dans un Chrome isolé, sans connexion, cookies de compte ni corps réseau.

La documentation observée décrit une sélection de blocs entiers en traçant depuis l’une des marges, et distingue ce geste de la sélection de texte commencée dans un bloc. Elle présente aussi la poignée de déplacement. La capture Notion fournie par l’utilisateur montre un rectangle translucide et la surbrillance de plusieurs blocs.

Evidence : `ev_64fb533f686f0b74545a6b0c9cbea50cc60d946f52b49932b0209a9844b5e865`. [Identité et limites](REA-SELECTION-PREUVES.json).

La documentation est observée ; le geste dans un éditeur Notion authentifié ne l’est pas. L’intersection avec les enfants, la priorité d’un en-tête de section, le compteur, Maj pour ajouter et les couleurs de Feuillet sont des choix de reconstruction. Aucun code ou composant propriétaire Notion n’a été importé. Le résultat Feuillet est vérifié par des transactions réelles ProseMirror et des gestes souris dans le navigateur intégré.
