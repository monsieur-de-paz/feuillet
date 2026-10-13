# Feuillet — contrat de l'interface et du serveur

Application PHP autonome. Le logiciel s’appelle Feuillet. Frontend React/Tiptap compilé dans `public/assets`, API `public/api.php?action=...`. Aucun serveur Node en production. URL publique `index.php?page=<slug-ou-id>`. L'administrateur voit le brouillon, les visiteurs la dernière version publiée. Interface française.

Toutes les réponses API sont JSON : succès `{...}` ; erreur `{error: "message", code: "..."}` et statut HTTP approprié. `fetch` same-origin avec credentials. `GET action=session` renvoie `{authenticated, csrf, name, installed:true}`. Toute mutation (sauf login qui utilise aussi le csrf initial) requiert `X-CSRF-Token`. `POST login {password}`, `POST logout {}`. Aucun mot de passe de démonstration embarqué.

`GET action=pages` : `{pages:[{id,slug,parent_id,title,icon,cover_id,visibility,kind,description,tags,source_url,source_name,sort_order,version,has_unpublished_changes,published_at}],trash:[...]}`. Pour visiteurs seules les métadonnées PUBLIÉES sont renvoyées et trash absent. `GET action=page&id=<id-ou-slug>` : `{page:{...métadonnées,content:<Tiptap JSON>}}`. `GET action=files` admin : `{files:[{id,name,mime,size,url}]}`. `GET action=health` admin : `{php,driver,upload_limit,storage_writable}`.

`POST action=save` body `{id? (absent pour créer),title,parent_id,icon,cover_id,kind,description,tags,source_url,source_name,content,version}`. Renvoie `{page:...}`. `version` requis pour existant : conflit HTTP 409, aucun écrasement. Toutes nouvelles pages sont privées. Autosave ne publie jamais. `kind`: `page`, `article`, `class`. `tags`: tableau de chaînes. `icon`: emoji. `cover_id`: ID fichier ou null. `content`: document Tiptap.

`POST action=publish {id,version}` sauvegarde un snapshot de la page et rend publique ; renvoie `{page:...}`. `POST action=visibility {id,visibility:"private",version}` dépublie. `POST action=duplicate {id}` renvoie `{page:...}` (copie privée). `POST action=trash {id}` ; `POST action=restore {id}`. Trash enlève aussi les descendants de l'accès public, restore conserve privé. `POST action=move {id,parent_id,sort_order,version}`. `GET action=history&id=...` -> `{history:[{id,created_at,title,version}]}` ; `POST action=restore_revision {id,revision_id,version}` restaure un brouillon, renvoie page.

Upload : `POST action=upload`, FormData champ `file`, CSRF header. Renvoie `{file:{id,name,mime,size,url:"media.php?id=..."}}`. Types usuels autorisés, exécutables/HTML/SVG actifs refusés. Téléchargement `media.php?id=...&download=1`. Le fichier est accessible à un visiteur seulement s'il est référencé dans un snapshot public actif (cover ou fileId). Pas de chemin de stockage direct. Ne supprimer aucun fichier au changement de page.

Custom nodes :
- `callout`, attrs `{tone:"blue"|"green"|"amber"|"red"|"gray",icon}`, block+.
- `columns`, enfants `column` block+ ; une colonne mobile.
- `details`, attrs `{summary:"Voir le corrigé"}`, block+.
- `pageLink`, atom attrs `{pageId,label,icon}`.
- `buttonLink`, atom attrs `{href,label}`.
- `bookmark`, atom attrs `{href,title,description,source}`.
- `fileBlock`, atom attrs `{fileId,name,mime,size,mode:"pdf"|"audio"|"video"|"download"}`.
- `image` standard attrs `{src,alt,title,fileId}`.
- `gallery`, atom attrs `{parentId,kind,title}` ; cible soit parentId soit kind ou les deux. Montre seulement les pages accessibles.
- `quiz`, atom attrs `{quizId,title,questions:[{id,type:"single"|"multiple"|"boolean"|"short",prompt,options:[...],correct:[indices],answers:[strings],explanation}]}`. Administration modifie ce formulaire ; visiteur reçoit les questions SANS correct/answers/explanation. `POST action=quiz {page_id,quiz_id,answers:{questionId:[indices]|string}}` sans login, CSRF initial requis ; réponse `{score,total,results:[{id,correct,explanation,expected}]}`. Réponses non conservées.

Blocs standard à prendre en charge : paragraph, text marks bold italic underline strike code highlight link, heading, bulletList orderedList listItem taskList taskItem, blockquote, horizontalRule, codeBlock, table tableRow tableCell tableHeader. Les éventuelles extensions additionnelles doivent être signalées au root pour le rendu PHP.

Lecture : le frontend utilise le JSON nettoyé en lecture seule ou `GET action=render&id=...` -> `{html}` rendu PHP sécurisé. L'URL publique permet une lecture HTML serveur sans JavaScript via `index.php?page=...&read=1`. L'éditeur n'est jamais une condition pour lire un document. Bouton admin 'Aperçu public' ouvre une URL sans session? utiliser read=1 (admin devra être informé brouillon/public). Téléchargement sauvegarde admin `api.php?action=export` (GET) archive ZIP portable avec pages JSON + HTML + pièces jointes ; `POST action=import` champ file ZIP pour restauration après contrôle.

## Version 0.2.0

Migrations idempotentes SQLite/MySQL au premier accès, sans supprimer les pages/fichiers existants. Tables `spaces`, `app_settings` ; colonnes `pages.space_id`, `pages.icon_id`, `pages.appearance`, `files.attribution`. La configuration et le stockage existants sont conservés.

### Espaces, icônes et styles

`GET action=pages` inclut maintenant `{spaces:[{id,name,icon,sort_order}]}`. Les visiteurs ne reçoivent que les espaces contenant une page publiée active : un espace vide ou entièrement privé ne dévoile pas son nom. `GET action=spaces` renvoie la même liste selon l'authentification.

`POST action=save_space {id?,name,icon,sort_order?}` crée/modifie ; réponse `{spaces,id}`. `POST action=delete_space {id}` supprime l'espace en réaffectant ses pages à l'espace général, sans supprimer les pages. Alias `POST action=spaces` avec les mêmes champs et éventuellement `delete:true`.

Une page ajoute `space_id:string|null`, `icon_id:string|null`, `appearance:<Partial Appearance>`, `cover_attribution`, `icon_attribution`. `save` accepte ces champs. `icon_id` et `cover_id` doivent référencer un fichier image. Omettre ces champs lors d'une sauvegarde les conserve ; envoyer explicitement `null` les retire. Une nouvelle sous-page hérite de l'espace de son parent si `space_id` n'est pas fourni. `move` accepte `space_id` et déplace également les descendants ; réponse `{page,pages}` pour rafraîchir les versions.

`Appearance={font:'sans'|'serif'|'mono',background:'#RRGGBB',text:'#RRGGBB',accent:'#RRGGBB',width:'normal'|'wide',focus:boolean}`. Couleurs hexadécimales strictes, valeurs de police/largeur fermées. `GET action=settings` public renvoie `{appearance:<Appearance>}` ; `POST action=settings {appearance}` administrateur modifie les styles globaux. Les champs d'apparence de la page remplacent les styles globaux ; sa version publiée utilise son propre snapshot.

`index.php?page=<id>&read=1&print=1` affiche une page adaptée à l'impression : brouillon pour l'administrateur authentifié, snapshot publié pour un visiteur. Cette route fournit le rendu HTML pour l'impression PDF du navigateur. La création d'un véritable PDF téléchargeable peut aussi être effectuée par le module frontend ; aucun moteur PDF système n'est requis sur OVH.

### Fichiers et attributions

`POST action=rename_file {id,name}` renomme un fichier existant. L'extension originale est conservée (ajoutée si omise, une autre extension est refusée). Le chemin physique et l'ID restent fixes. Les libellés `fileBlock.name` et les légendes d'image reprenant le nom original sont mis à jour dans les brouillons, snapshots publiés et révisions. Les pages modifiées reçoivent une nouvelle version ; réponse `{file,pages}`. Rafraîchir la page active et sa version avant une nouvelle sauvegarde pour éviter un conflit. Les légendes personnalisées différentes du nom de fichier restent intactes.

`GET action=file_info&id=<id>` renvoie `{file:{id,name,mime,size,url,attribution}}`. Les visiteurs ne peuvent obtenir cette information que si le fichier est référencé dans une page publiée active, sinon 404. Aucune URL de stockage physique n'est transmise.

`attribution={source_url,author,license,license_url}|null`. Les pages incluent `cover_attribution` et `icon_attribution` afin d'afficher les crédits avec les couvertures et icônes. Les images de blocs, couvertures et cartes du lecteur PHP affichent les crédits. L'interface et les exports PDF doivent aussi reprendre ces crédits.

### Images Wikimedia Commons

`GET action=image_search&q=<texte>` administrateur renvoie `{images:[{title:'File:…',url,thumb,source_url,source,author,license,license_url}],results:<même tableau>}`. Recherche gratuite sur Wikimedia Commons, sans clé API. PHP cURL est requis pour cette fonction ; l'envoi de fichiers locaux reste disponible sans cURL.

`POST action=image_import {title:'File:…'}` administrateur revalide le fichier auprès de l'API Commons et renvoie `{file}` avec son attribution. Ne pas transmettre une URL arbitraire : le titre du résultat est l'identifiant accepté. Le serveur ne contacte que `commons.wikimedia.org` et `upload.wikimedia.org` en HTTPS, sans redirection, avec limites de temps et taille ; le fichier reçu passe par les contrôles de MIME et d'image de l'envoi standard. Maximum 10 Mo, également limité par le plafond d'envoi configuré. Une indisponibilité distante renvoie 502 et permet de revenir à l'envoi local.

### Blocs supplémentaires

`image` accepte `width` entier 10–100 (pourcentage), `align:'left'|'center'|'right'`. Marque `textStyle` avec `attrs.color:'#RRGGBB'` ; marque `highlight` avec `attrs.color` pour le fond. Une valeur CSS libre n'est jamais utilisée.

`gallery` accepte `{manual:true,pageIds:[IDs sélectionnés],layout:'grid'|'list',columns:1..6,rows:0..12,aspect:'16/9'|'4/3'|'1/1'|'3/4'|'auto',title}`. `rows:0` ne limite pas le nombre affiché. Une galerie manuelle vide reste vide. Les sélections suivent l'ordre `pageIds`. Le JSON public retire les IDs de pages privées, supprimées ou inaccessibles. Les anciennes galeries sans `manual:true` conservent leurs filtres `parentId`/`kind`.

### Markdown et sauvegardes

`GET action=export_markdown&id=<id>` administrateur télécharge un `.md` UTF-8. `POST action=import_markdown` FormData `{file:<.md>,space_id?,parent_id?}` crée une page privée, réponse `{page}`. Maximum 2 Mo. Import de titres, paragraphes, liens, gras/italique/code, listes simples/imbriquées/numérotées/cases, citations, tableaux simples, code clôturé et images HTTP(S), sans télécharger les URL externes.

L'export traduit les encadrés/détails/colonnes en Markdown lisible, les galeries en liens et les quiz en questions. Un commentaire `feuillet-document` encode le document structuré complet afin de préserver les blocs, styles et quiz lors d'un aller-retour dans Feuillet. Ce commentaire contient le contenu du brouillon, y compris les solutions de quiz : garder les exports privés. Les pièces jointes ne sont pas incluses dans un `.md` isolé ; un import sur un autre serveur peut nécessiter l'envoi des médias. Le ZIP constitue la sauvegarde portable complète des contenus et fichiers.

Les ZIP exportés utilisent maintenant `manifest.version:2`, avec `spaces`, `settings.appearance`, les nouveaux champs de pages et les attributions. L'import accepte les versions 1 et 2, crée des copies privées et remappe espaces, icônes, médias, liens internes et `gallery.pageIds`. L'apparence d'origine est conservée par des overrides sur les pages importées. Les réglages globaux du carnet actuel ne sont remplacés que si le champ FormData `apply_settings` est activé. Les fichiers sont lus avec une borne de décompression par entrée et un budget global ; aucune extraction libre de chemins ZIP.


## Version 0.3.0

Migrations idempotentes vers le schéma 3 : catégories par espace, position x/y de couverture et tables des bases/formulaires. Les données existantes sont conservées.

- `GET categories` ; `POST save_category`, `delete_category`, `restore_category` : catégories ordonnées, propres à un espace ; retrait réversible.
- `GET settings` renvoie aussi `notebook` (`title`, `subtitle`, `max_upload`) et `server_upload_limit`. `POST settings` accepte séparément `appearance` et `notebook`.
- `Appearance` accepte les polices `quicksand`, `fraunces` et le champ `mode: light | dark | oled`.
- Les pages incluent `category_id` et `cover_position: {x,y}` ; ces valeurs sont conservées dans les snapshots publiés.
- `POST publish` publie les descendants structurels actifs et renvoie `published_count`. `POST visibility` en mode privé retire toute cette arborescence de la consultation publique.
- `db_list`, `db_get`, `db_save`, `db_delete`, `property_save`, `property_delete`, `row_save`, `row_delete`, `formula_preview`, `db_export` : administration authentifiée avec versions et CSRF pour les écritures.
- `public_db_get` : visibilité publique explicite et référence active dans une page publiée ; exclut les réponses aux formulaires et les lignes privées.
- `form_get`, `form_submit`, `form_upload` : questions partagées, validation des types, CSRF et contrôle d’appartenance des fichiers envoyés. Les réponses restent privées.
- Nœuds documentaires `databaseView {dbId}` et `formView {formId}`.
- Sauvegarde ZIP format 3 : pages, fichiers, espaces, catégories, réglages et `database_data`. Import des formats 1/2/3, remappage des IDs, copies privées et formulaires fermés avec de nouveaux tokens.
- Le lecteur PHP expose un fil d’Ariane composé exclusivement des snapshots publiés des ancêtres actifs. L’index `?read=1` ne reprend jamais les brouillons de la session administrateur.

Pour les champs, limites et exemples de formules : [BASES-ET-FORMULAIRES.md](docs/BASES-ET-FORMULAIRES.md).
