# Bases structurées, formules et formulaires — Feuillet

Les bases stockent de vrais enregistrements dans MySQL/MariaDB ou SQLite. Une base, ses propriétés, ses lignes et ses formulaires persistent séparément des pages. Les vues du navigateur utilisent ces mêmes données ; changer de vue ne crée pas une deuxième copie.

## Créer et organiser les données

Chaque base possède un nom et un état privé/public. Les propriétés disponibles sont :

| Type | Valeur enregistrée et validation |
|---|---|
| Titre, texte | Chaîne Unicode, 10 000 caractères maximum |
| Nombre | Nombre JSON réel, fini, compris entre −10¹⁵ et 10¹⁵ |
| Sélection | Un des choix configurés |
| Sélection multiple | Liste de choix configurés, sans doublon |
| Date | Date réelle au format `AAAA-MM-JJ` |
| Case à cocher | Booléen ; une case obligatoire doit être cochée |
| E-mail | Adresse validée côté serveur |
| Téléphone | 7 à 15 chiffres, avec les séparateurs habituels et éventuellement `+` |
| URL | Adresse HTTP ou HTTPS ; aucune URL n'est téléchargée par la validation |
| Fichiers | IDs de pièces jointes existantes |
| Relation | IDs de lignes existantes dans la base cible configurée |
| Formule | Valeur calculée, non modifiable directement |
| Agrégation | Calcul sur un champ de lignes reliées |

Les listes comportent au maximum 200 éléments. Une base peut comporter 100 propriétés et 5 000 lignes. Ces limites bornent le travail sur un mutualisé. Une conversion de propriété qui rendrait les valeurs actuelles invalides est refusée : il faut corriger les données avant de modifier le type ou les choix.

Les modifications des bases, propriétés, lignes et formulaires utilisent un numéro de version. Une modification envoyée depuis un écran ancien est refusée avec HTTP 409 ; elle n'écrase pas la version actuelle.

Une relation est attachée à une base cible précise. Un ID de ligne provenant d'une autre base est refusé. Une agrégation choisit la propriété Relation, le champ cible et l'opération : somme, nombre, moyenne, minimum ou maximum.

## Formules prises en charge

L'interpréteur analyse une grammaire limitée. Il n'utilise ni `eval`, ni PHP fourni par l'utilisateur, ni JavaScript fourni par l'utilisateur. Il ne lit pas de fichiers et ne fait pas de requêtes réseau.

```text
prop("Montant") * 1.2
round(prop("Montant") * 1.2, 2)
if(prop("Terminé"), "Fait", "À reprendre")
concat(prop("Nom"), " — ", prop("État"))
count(prop("Séances liées"))
if(empty(prop("Courriel")), "À compléter", "Renseigné")
```

| Élément | Périmètre |
|---|---|
| Références | `prop("Nom exact de la propriété")` |
| Calculs | `+`, `-`, `*`, `/`, `%`, `^` et parenthèses |
| Comparaisons | `==`, `!=`, `>`, `>=`, `<`, `<=` |
| Logique | `&&`, `||`, `!`, ou `and`, `or`, `not` |
| Condition | `if(condition, valeur vraie, valeur fausse)` ; seule la branche choisie est calculée |
| Texte | `concat(...)`, `contains(texte, extrait)` |
| Nombres | `round(nombre, décimales?)`, `abs`, `floor`, `ceil` |
| Agrégats | `sum`, `avg`, `min`, `max` sur nombres ou listes de nombres |
| Présence et taille | `empty(valeur)`, `count(liste)` ou `count(texte)` |
| Constantes | Nombres, textes entre guillemets, `true`, `false`, `null` |

`+` concatène lorsque l'un des arguments est un texte ; les autres calculs demandent des nombres. `sum()` vaut 0 ; les autres agrégats sans nombre valent `null`. `count(texte)` compte les caractères. Une relation contient des IDs : pour additionner des valeurs des lignes liées, utiliser une Agrégation.

Les références aux formules sont calculées avec leurs dépendances. Une référence circulaire, une division par zéro, un nom de propriété inconnu ou un calcul trop complexe apparaît comme une erreur de propriété, sans faire échouer le chargement de la base. Une formule est limitée à 4 096 caractères, 600 jetons et une profondeur bornée. Une formule qui dépend d'une propriété renommée doit être corrigée avec le nouveau nom.

Ce périmètre ne couvre pas toute la langue de formules Notion : fonctions de date avancées, fonctions arbitraires sur listes, variables et programmes ne sont pas disponibles.

## Publication des bases

Une base commence privée. Sa consultation anonyme nécessite **deux conditions** : la base est explicitement publique et une page publiée active contient un bloc référençant cette base. Une base publique sans référence publiée reste inaccessible par son API publique.

Les lignes ajoutées manuellement peuvent être privées ou publiques. La base privée protège l'ensemble des lignes, même celles marquées publiques. Dans une base accessible publiquement, seules les lignes publiques sont renvoyées.

Les relations et agrégations publiques suivent les mêmes droits sur leurs cibles. Elles ne révèlent ni les IDs ni les valeurs de lignes privées ou de bases privées. Les pièces jointes de lignes publiques deviennent consultables seulement lorsque la base elle-même est accessible publiquement. Les fichiers des autres lignes restent protégés.

## Formulaires

Un formulaire choisit ses champs parmi les propriétés de sa base. Les champs Relation, Formule et Agrégation sont exclus : un formulaire anonyme ne liste pas les enregistrements internes ni les calculs du carnet.

Un formulaire commence fermé. Après publication explicite, son lien avec un token aléatoire est consultable. Un bloc Formulaire inséré dans une page publiée permet également la consultation à partir de son ID. Fermer le formulaire retire ces deux accès et refuse les nouveaux envois. Supprimer son dernier champ, ou convertir les derniers champs vers des types interdits au formulaire, le ferme également.

La consultation publique ne transmet que la configuration du formulaire et ses champs. Elle ne transmet aucune ligne enregistrée. Les champs obligatoires sélectionnés sont validés par le serveur. Les autres colonnes de la base peuvent rester vides sur une réponse de formulaire.

Chaque réponse crée une ligne **privée**, identifiée comme provenant d'un formulaire. Ces réponses ne peuvent pas être rendues publiques par `row_save` ; leur origine reste conservée dans les sauvegardes. Le professeur peut les consulter et les modifier dans son espace administrateur.

Les envois utilisent un jeton CSRF, un champ invisible anti-robot et une limite de fréquence. Les pièces jointes passent par les mêmes contrôles que l'envoi ordinaire. Elles sont liées au formulaire et à la session du visiteur : un autre visiteur ne peut pas réutiliser un ID obtenu ailleurs, et un fichier déjà envoyé ne peut pas être soumis une seconde fois. Les URL directes restent privées. Les fichiers en attente sont limités à 10 par session/formulaire et 200 Mo pour un formulaire ; les limites PHP de l'hébergement s'appliquent aussi.

## API

Toutes les mutations sont des `POST` avec `X-CSRF-Token`. Les routes d'administration exigent la connexion. Les réponses d'erreur suivent le format habituel de l'application.

| Action | Requête | Réponse |
|---|---|---|
| `db_list` | GET administrateur | `{databases}` |
| `db_get` | GET `id` administrateur | `{database,properties,rows,forms,files}` |
| `db_save` | `{id?,name,visibility?,version?}` | `{database}` |
| `db_delete` | `{id,version}` | `{ok}` |
| `property_save` | `{id?,db_id,name,type,config,required?,sort_order?,version?}` | `{property,properties}` |
| `property_delete` | `{id,version}` | `{ok}` |
| `row_save` | `{id?,db_id,values:{propertyId:value},visibility?,version?}` | `{row}` |
| `row_delete` | `{id,version}` | `{ok}` |
| `formula_preview` | `{db_id,expression,row_id?}` | `{value,error?}` |
| `form_save` | `{id?,db_id,name,fields:[propertyIds],public,version?}` | `{form}` |
| `form_get` | GET `id` ou `token` | `{form,properties}` selon les droits |
| `form_upload` | FormData `file,token,website` | `{file}` |
| `form_submit` | `{token,values,website:""}` | `{ok,message}` sans réponse enregistrée |
| `public_db_get` | GET `id` | Bundle public filtré |
| `db_export` | GET `id` administrateur | CSV UTF-8 |

`database={id,name,visibility,version,created_at,updated_at}`.

`property={id,db_id,name,type,config,required,sort_order,version}`. Options : `options:[chaînes]`, `target_db_id` pour Relation, `expression` pour Formule, ou `{relation_property_id,target_property_id,operation}` pour Agrégation.

`row={id,db_id,values,derived,errors,visibility,version,source_form_id,from_form,created_at,updated_at}`. Les champs calculés sont dans `derived`, leurs erreurs dans `errors`, avec des clés correspondant aux IDs de propriétés.

`form={id,db_id,name,fields,public,token,version,created_at}`. En lecture publique, les champs internes `db_id` et `version` sont retirés. Les options de formules et de relations des bases publiques ne sont pas transmises au lecteur.

## Sauvegardes et tests

`database_backup()` fournit les bases, propriétés, lignes et formulaires, y compris les réponses privées. `database_import(data,fileMap,pageMap)` remappe tous les IDs et renvoie les tables de correspondance `databases`, `properties`, `rows`, `forms`. Les bases et lignes importées commencent privées, les formulaires commencent fermés et reçoivent de nouveaux tokens. Les relations, agrégations, fichiers et origines des réponses sont remappés.

Les exports ZIP utilisent maintenant **`manifest.version:3`** et ajoutent `database_data`, les catégories (actives et archivées), les positions de couverture et les réglages du carnet. Les imports acceptent les versions 1, 2 et 3. Les catégories sont réaffectées aux nouveaux espaces, les blocs de pages reçoivent les nouveaux IDs de bases/formulaires, les anciens tokens de blocs sont retirés. Les positions et les réglages visuels sont conservés. Les titres/sous-titres/limites du carnet courant sont remplacés seulement avec `apply_settings=1`.

La restauration ZIP est transactionnelle : les bases, pages, catégories et fichiers créés sont retirés si une validation échoue. Le propriétaire d’une réponse reste son formulaire importé, privé et fermé ; les sessions anonymes d’envois en cours ne sont pas restaurées. Les jetons et paramètres du compte administrateur ne sont pas exportés.

Le CSV administrateur contient les valeurs et résultats calculés. Les textes qui pourraient être interprétés comme des formules de tableur sont préfixés pour éviter l'exécution lors de l'ouverture. Un CSV de réponses doit rester privé.

Les migrations sont idempotentes et ajoutent les tables sans remplacer les contenus existants. Un marqueur de schéma évite de rejouer les opérations DDL à chaque requête ; les accès par base et propriétaire de fichier sont indexés.

```sh
python3 tests/databases.py
python3 tests/databases.py --mysql
```

Les tests créent une copie jetable et ne modifient aucun carnet réel. Ils vérifient types et conflits, calculs et cycles, relations/agrégations, publication et filtrage, formulaires et provenance privée, fichiers et propriété de session, export CSV et remappage des sauvegardes. La variante MySQL utilise une instance locale dédiée avec un binaire déjà installé.

Validation locale du 13 octobre 2026 : **11/11 scénarios réussis avec SQLite et MySQL**. Le scénario ZIP utilise les véritables routes export/import, puis vérifie catégories/espaces, positions, nœuds de bases/formulaires, relations, fichiers privés, réglages conditionnels et compatibilité d’import version 2.


## Formulaires et projection — version 0.28

Le formulaire public affiche un squelette dès le premier HTML, avant le chargement du JavaScript. Les questions et les pièces jointes utilisent une carte aérée, des numéros de repère et une confirmation d’envoi. Le mode clair, sombre ou OLED suit le choix du lecteur. Les URL existantes et les limites d’envoi sont conservées.

Pour afficher les réceptions sur un vidéoprojecteur :

1. Dans **Bases de données**, ouvrir la base puis **Projeter les réponses**. Le même bouton existe sur le bloc formulaire dans l’éditeur ; il présélectionne ce formulaire.
2. Dans la fenêtre de projection, choisir un formulaire ou toutes les lignes de la base.
3. Ouvrir **Colonnes** pour choisir ce qui sera visible. Par défaut, seul le premier champ Titre, ou à défaut Texte, apparaît, avec l’état de réception et la date.
4. Cliquer sur **Plein écran**. Les nouveaux envois apparaissent au prochain contrôle, toutes les dix secondes lorsque la fenêtre est visible. Le compteur comprend toutes les lignes du filtre ; la liste montre les 200 dernières.
5. Utiliser **Mettre en pause**, **Reprendre** ou **Actualiser maintenant** si nécessaire. La reprise interroge immédiatement le serveur.

La projection exige une session administrateur et ne crée aucun lien public vers les réponses. Les colonnes non choisies ne sont pas renvoyées par cette API. Les pièces jointes affichent seulement leur nombre. Relations, formules et agrégations ne sont pas proposées dans cette vue de réception. En cas de perte de connexion, les dernières données restent visibles avec un message ; une réponse 401/403 retire les données de l’écran et demande de se reconnecter. Choisir les colonnes adaptées avant de projeter des données personnelles.

Dans l’éditeur, le bloc formulaire propose **Apparence du bouton**. Les autres boutons ajoutés avec `/bouton` proposent ces réglages dans **Présentation** : quatre styles et trois tailles. Ces changements utilisent l’enregistrement habituel de la page ; selon les réglages de publication, publier le brouillon peut être nécessaire pour les visiteurs. Ils ne changent ni le texte, ni l’URL, ni les icônes du bouton.

## Studio des formulaires et regroupements — version 0.29

**Configurer** ouvre le studio. Le volet **Apparence** propose cinq modèles, une couverture, une police, l’accent, la densité, l’alignement et les animations. **Avant l’envoi**, **Questions** et **Après l’envoi** règlent les textes et contraintes du formulaire. L’aperçu en direct permet de contrôler les deux états avant d’enregistrer. Voir [le guide complet 0.29](NOUVEAUTES-0.29.md).

Le réglage Obligatoire peut maintenant être spécifique au formulaire, comme le libellé et la consigne d’une question. Il ne modifie pas la propriété de base. Les anciens formulaires héritent des contraintes de leurs propriétés tant qu’aucun réglage spécifique n’est choisi.

Pour organiser une vue de base, utiliser **Grouper**, choisir une propriété puis replier les groupes si nécessaire. Dans une page, le réglage de la vue est enregistré avec le bloc. La vue de gestion seule reste une préférence de cette session, comme ses filtres et son tri. Dans la projection, le sélecteur **Regrouper les réponses par** agit sur les lignes affichées et conserve le rafraîchissement automatique.

Les fichiers et relations ne sont pas proposés comme clés de groupe ; les valeurs calculées sont disponibles dans les vues de bases, tandis que la projection reste limitée à ses propriétés simples. Un choix multiple est regroupé par combinaison exacte sans répétition de la même fiche dans plusieurs groupes.
