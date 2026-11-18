# Notes pour le Claude du template général

Modifications faites dans un projet dérivé (podcast-B3webmarket2026), à reporter dans le socle.
Les fichiers concernés sont des fichiers du template, pas du contenu.

> Mis à jour le 2026-11-11, après la fusion de Socle 1.1.0 + admin (upstream/main `a99c67d`).
> Déjà intégrés au socle, donc retirés de ces notes : l'aperçu en direct des leçons
> (`slides:preview`) et la conversion des liens de partage Spotify dans `PodcastEmbed`.
> La contradiction entre `_columns.scss` et `docs/GUIDE.md` sur la place de l'image est aussi réglée.

## 1. Colonnes : décalage vertical des images d'une colonne à l'autre (toujours d'actualité)

**Fichier :** `src/styles/marp/layouts/_columns.scss`

**Symptôme :** dans une `columns-2` où chaque colonne est ouverte par une image (`![](…)` puis `###`),
la colonne 1 commence environ 35 px plus bas que la colonne 2 dans le navigateur de l'aperçu (`marp -s`).
Le Chrome headless de Marp CLI, lui, rend les deux colonnes alignées.

**Cause :** la respiration au-dessus de l'image est une `margin-top` (`margin: lg 0 md`).
Une marge placée en haut d'une colonne CSS peut être « tronquée » au saut de colonne, et chaque moteur le fait à sa façon.
Le commentaire du socle (« TOUTES les colonnes la reprennent ») vise ce problème, mais une marge ne suffit pas :
le navigateur de l'aperçu la garde sous le `h2` (`column-span: all`) et la jette après le saut forcé
(`break-before: column`) de la colonne 2.

**Correctif proposé :** remplacer la marge par un padding, qui n'est jamais tronqué :

```scss
p:has(> img) {
  --tile-pad: #{spacing.get("lg")};
  margin: 0 0 spacing.get("md");
  padding-top: var(--tile-pad);
}
> h3 + p:has(> img) { --tile-pad: 0px; }
> h2 + p:not(:has(> img)) ~ p:has(> img) { --tile-pad: 0px; }
```

## 2. Image et texte dans le même paragraphe (non corrigé)

Si l'auteur écrit `### Titre` / `![](x.png)` / `texte` sans ligne vide entre l'image et le texte,
markdown les met dans un seul `<p>`. Ce `<p>` est alors traité comme une tuile image et casse la répartition :
le `###` suivant reste dans la colonne 1.
Pistes : le documenter (« une ligne vide après l'image »), ou cibler `p:has(> img:only-child)`.

## 3. Migration du champ `sources` (1.0 → 1.1)

Le CHANGELOG 1.1.0 annonce « Rien à réécrire dans un cours existant ». C'est faux pour un cours qui utilisait déjà `sources`
avec `label` (le schéma d'avant) : la clé est devenue `title` (+ `author` facultatif) et le build échoue.
À signaler dans le CHANGELOG, ou à accepter dans le schéma (`label` lu comme alias de `title`).

## 4. Choix propres à ce cours (pas forcément à reporter)

Appliqués ici après la fusion 1.1, pour info :
- **Colonnes : retour à la tuile carrée** (`object-fit: contain`, filigrane une tuile sur deux, réglages `tile` / `mark`)
  à la place de l'image recadrée en `--ratio` (16/7 en `columns-2`). Avec un chapô, la tuile passe à 70 %
  et le `h3` à 1.2em (au lieu de 1.3em) : sinon la colonne 1 débordait et repoussait le 2e `###` hors du cadre.
  À noter pour le socle : le `h3::before` (numéro) pouvait se séparer de son titre au saut de colonne → `break-inside: avoid` sur le `h3`.
- **Aucun texte en capitales forcées** : plus un seul `text-transform: uppercase`, ni dans les slides
  (surtitre `section > header`, surtitre du layout `lead`), ni sur le site (intitulés de module du sommaire,
  titre du résumé de leçon, label « À suivre » de l'accueil, surtitre de la 404), ni dans l'admin
  (sommaire, badge, page de connexion). L'interlettrage large qui accompagnait les capitales passe à 0.01em.
  Avis de l'auteur : les intitulés tout en capitales « font trop générés ». À considérer pour le socle.

## 5. Admin : un clic sur un titre de slide place le curseur une ligne trop bas (corrigé ici, à reporter)

**Fichiers :** `admin/ui/slides-editor.js`, `admin/ui/text-editor.js`, `admin/ui/admin.css`

**Symptôme :** dans l'éditeur riche des slides, cliquer sur un `## Titre` met le curseur sur la ligne du dessous.
Ce qu'on tape atterrit sous le titre ; tapé juste au-dessus d'un `---`, ça en fait un titre souligné (setext)
et la slide suivante disparaît. Impression : « on ne peut pas modifier les titres ».

**Cause :** les blocs posés dans CodeMirror (bandeau « Slide N », vignette d'image, carte de composant) avaient
des marges verticales (`.slide-band` 18/8 px, `.slide-image` 4 px, `.card-widget` 6 px). CodeMirror mesure
la hauteur d'un bloc sans ses marges : chaque bandeau décalait de ~26 px la correspondance clic → position.

**Correctif :** chaque bloc est enveloppé dans `blockSpacer()` (`.block-spacer`, `contenteditable=false`)
qui porte l'espacement en padding ; les blocs eux-mêmes n'ont plus de marge verticale.
Vérifié dans Chrome : un clic sur `## Introduction`, `## Alexandre Allain`, `### Salut les designers` place bien le curseur sur la ligne cliquée.

## 6. Admin : curseur « Filtre » sur les images `![bg …]` (ajout, à reporter si utile)

**Fichiers :** `admin/ui/slides-editor.js` (`filterControl`, `setFilter`), `admin/ui/admin.css`

Sur la vignette d'une image `![bg …]` (plein cadre, image en moitié), un curseur 0-100 % règle le voile sombre :
c'est `brightness:` vu à l'envers (filtre 65 % = `brightness:0.35`, le défaut du plein cadre). Les autres options
(`right:40%`…) restent en place ; à 0 %, l'option est retirée. Le fichier n'est réécrit qu'au lâcher du curseur.
Au passage : `.slide-image` et `.slide-band` passent en `flex-wrap: wrap`, sinon leur largeur minimale
élargissait tout le contenu de CodeMirror au-delà de sa zone visible.

## 7. Colonnes : variante « icône » (ajout, à reporter si utile)

**Fichiers :** `src/styles/marp/layouts/_columns.scss`, `src/assets/icons/icon-*.svg`

Une image dont le nom de fichier commence par `icon-` ne prend pas la grande tuile carrée : elle devient une
pastille de 60 px, teintée à 10 % de la couleur principale, calée à gauche au-dessus du numéro, sans filigrane.
Ciblage par `img[src*="icon-"]`, car le nom de fichier survit à la copie dans `slides/assets/` (`<hash>-icon-x.svg`).
Les icônes sont dessinées dans le style de `Icon.astro` (grille 24, trait de 2, style Lucide).
Limite : la couleur est écrite en dur dans chaque SVG (`color="#2563C9"`). Une `<img>` n'hérite pas de `currentColor`,
donc un changement de charte ne les recolore pas. Pour le socle, `npm run brand` pourrait les régénérer.

**Mise à jour : la variante icône passe en grille, à cause de Firefox.** L'auteur regarde l'aperçu de l'admin
dans Zen, un navigateur dérivé de Firefox. Or Firefox **ignore `break-before: column`** : il répartit les colonnes
CSS par hauteur de contenu. Une icône de plus suffisait à faire glisser les blocs (icône 2 en bas de la colonne 1,
3e colonne vide). Une slide qui contient une icône passe donc en `display: grid`, avec des lignes fixes :
titre, chapô, icône, `###`, texte. Chaque élément va sur sa ligne avec `grid-row`, et le placement automatique
ouvre une colonne par icône. Convention : une icône, un `###` et UN paragraphe par colonne.
Les marges ne fusionnent pas en grille : `margin-top: 0` sur le texte.

**À reporter dans le socle, au-delà des icônes :** le point 1 (décalage vertical d'une colonne à l'autre
dans « le navigateur de l'aperçu ») vient très probablement de la même cause. Toute la mise en page `columns-*`
repose sur `break-before: column`, que Firefox ne gère pas. Une grille générale (une colonne par `###`)
demanderait d'envelopper chaque bloc, ce que le markdown seul ne permet pas. À étudier : un plugin markdown-it
qui enveloppe chaque `###` et sa suite dans une `<div>`, et les colonnes deviendraient une simple grille.
