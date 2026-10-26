# Notes pour le Claude du template général

Modifications faites dans un projet dérivé (podcast-B3webmarket2026), à reporter dans le socle.
Les fichiers concernés sont des fichiers du template, pas du contenu.

## 1. Colonnes : décalage vertical des images d'une colonne à l'autre

**Fichier :** `src/styles/marp/layouts/_columns.scss`

**Symptôme :** dans une `columns-2` où chaque colonne est ouverte par une image (`![](…)` puis `###`),
la colonne 1 commençait environ 35 px plus bas que la colonne 2 dans le navigateur de l'aperçu (`marp -s`).
Le Chrome headless de Marp CLI, lui, rendait les deux colonnes alignées.

**Cause :** la respiration au-dessus de la tuile image était une `margin-top` (`margin: lg auto lg`).
Une marge placée en haut d'une colonne CSS peut être « tronquée » au saut de colonne, et chaque moteur le fait à sa façon.
Le navigateur de l'aperçu gardait la marge sous le `h2` (`column-span: all`) et la jetait après le saut forcé
(`break-before: column`) de la colonne 2.

**Correctif :** remplacer la marge par un padding, qui n'est jamais tronqué, piloté par une variable :

```scss
p:has(> img) {
  --tile-pad: #{spacing.get("lg")};
  position: relative;
  isolation: isolate;
  width: var(--tile);
  margin: 0 auto spacing.get("lg");
  padding-top: var(--tile-pad);
}
> h3 + p:has(> img) { --tile-pad: 0px; }                       // était margin-top: 0
> h2 + p:not(:has(> img)) ~ p:has(> img) { --tile-pad: 0px; }  // était margin-top: 0
// filigrane : suit l'image, pas le haut du bloc
inset: calc(var(--tile-pad) - 4%) -25% auto auto;              // était -4% -25% auto auto
```

**Vérifié :** aucune régression dans le rendu Marp CLI (Chrome), sur trois cas : image avant `###`,
avec chapô, et image sous `###`. Je n'ai pas pu tester dans le navigateur où le bug s'est produit.

## 2. Aperçu en direct des leçons (`npm run slides:preview`)

**Fichiers :** `scripts/build-slides.mjs`, `scripts/preview-slides.mjs`, `docs/GUIDE.md`

**Problème :** `slides:preview` ne servait que le thème et `slides.demo.md`.
Les `.slides.md` des leçons n'étaient copiés dans `slides/` que par `npm run slides`,
donc modifier une leçon ou une image ne changeait rien dans l'aperçu.

**Correctif :**
- `build-slides.mjs` accepte une nouvelle option, `--md-only`. Elle assemble les `.md` (diapo de titre, images mises en scène)
  sans appeler Marp : `render()` sort tout de suite, et aucune copie n'est faite dans `public/slides/modules/`.
- `preview-slides.mjs` lance `build-slides.mjs --md-only` au démarrage, puis à chaque changement dans
  `src/content/lecons/` ou `src/assets/` (`fs.watch` récursif, temporisé à 150 ms). `marp -s` recharge ensuite le navigateur.
- `docs/GUIDE.md` : une puce a été ajoutée dans la section `slides:preview`.

## 3. PodcastEmbed : lien de partage Spotify converti en URL d'intégration

**Fichier :** `src/components/PodcastEmbed.astro`

**Symptôme :** l'auteur colle le lien de partage (`https://open.spotify.com/episode/ID?si=…`).
Spotify interdit l'affichage de cette page en iframe, et le navigateur affiche « … ne peut pas ouvrir cette page ».

**Correctif :** un `src` de la forme `open.spotify.com/(episode|show)/ID` est réécrit en
`open.spotify.com/embed/(episode|show)/ID`, sans le `?si=`. Les autres URL passent telles quelles.
Le commentaire d'en-tête du composant le mentionne. On pourrait aussi l'indiquer dans `docs/GUIDE.md` (ligne PodcastEmbed).

## 4. Points relevés, non corrigés

- **Documentation contradictoire sur la place de l'image dans les colonnes.** L'en-tête de `_columns.scss` dit :
  « L'image doit venir APRÈS le `###` ». `docs/GUIDE.md` (« Une image par colonne, au-dessus du titre ») montre l'image AVANT.
  Les deux écritures sont gérées par le CSS, mais il faudrait harmoniser la doc.
- **Image et texte dans le même paragraphe.** Si l'auteur écrit `### Titre` / `![](x.png)` / `texte` sans ligne vide
  entre l'image et le texte, markdown les met dans un seul `<p>`. Ce `<p>` prend alors la largeur de la tuile
  (texte décalé) et casse la répartition : le `###` suivant reste dans la colonne 1.
  Pistes : le documenter (« une ligne vide après l'image »), ou cibler `p:has(> img:only-child)`.
- Le bilan affiché par `build-slides --md-only` indique encore « … en pdf ». C'est cosmétique.
