# Assets secteur (illustrations thématiques par page SEO) — Design

Date : 2026-06-04

## Objectif

Les pages SEO de TEAPS (par techno : Shopify, WordPress… ; par secteur : avocats,
nautisme…) réutilisent les **mêmes illustrations génériques** d'une page à l'autre
(le motif « fenêtres navigateur flottantes + pilules », ex. `teaps-votre-projet.png`).

But : un **nouvel onglet** qui génère des **visuels d'illustration personnalisés par
page** — une **photo de banque d'images thématique en fond** + un **habillage DA
TEAPS** (icône de coin, logo, pilules, badge) — à exporter en PNG pour Elementor.
Le visuel **hero** et les **visuels qui illustrent le contenu** sont concernés.

Contraintes posées :
- **Pas d'IA** (ni génération d'image, ni Gemini) — déterministe, fiable.
- Photos issues d'une **banque d'images (Pexels)**, avec remplacement/upload manuel.
- DA TEAPS **fixe** (logo/couleurs/polices constants) ; seul le **thème de la photo**
  + les libellés changent selon la page.
- Thème **déduit automatiquement de l'URL** (slug → table de règles).

## Décisions d'architecture

### A. Input = le projet déjà scrapé (aucun scrape dédié)
On scrape l'URL de la landing TEAPS (`teaps.fr/agence-web-avocat`) via le flux
existant. Le `ScrapeResult` fournit déjà **logo, palette, polices, couleur de fond**
= la DA TEAPS, sans rien ajouter au scraper. L'onglet travaille sur ce projet
courant. Les pages non-TEAPS fonctionnent quand même (fallback thème).

### B. Thème déterministe (slug → table), zéro appel réseau IA
`lib/sectorThemes.ts` :
- `deriveTheme(url)` parse le **pathname** : retire `agence-web-`/`agence-`/slashes →
  `avocat`, `nautisme`, `shopify`…
- Table `SECTOR_THEMES: Record<string, ThemePreset>` où
  `ThemePreset = { label, keywords: string[], icon: LucideIconName, pills: string[] }`.
- **Slug absent de la table** → fallback : slug brut comme mot-clé, icône par défaut
  (`Briefcase`), pilules génériques. Ajouter un secteur = **une ligne** dans la table.
- Tout reste **surchargé à la main** par asset dans l'UI (la table n'est qu'une graine).

### C. Banque d'images = Pexels proxifié côté serveur
- `POST /api/stock-search` (runtime **Node**, jamais edge) : proxy de l'API Pexels
  avec `PEXELS_API_KEY` (clé **jamais exposée** au client). Entrée : `{ query, page }` ;
  sortie : liste `{ id, src (taille large), thumb, alt, photographer }`.
- Validation d'entrée : `query` non vide, longueur bornée. (Host fixe Pexels → pas
  d'enjeu SSRF, contrairement à `/api/scrape`.)
- Pas de clé Pexels configurée → la route renvoie une erreur explicite ; l'UI bascule
  sur « upload/coller une image » uniquement (dégradation propre).

### D. Export : photo cross-origin inline en dataURL
`html-to-image` taint le canvas sur une image cross-origin. Avant capture, on
**inline la photo Pexels en dataURL** (fetch via une petite route proxy ou directement
côté client si CORS Pexels le permet → fallback proxy). Même esprit que le proxy
`font-css` existant. Les uploads/collages locaux sont déjà des dataURL.

### E. Le template d'asset suit la convention *frame*
`components/frames/FrameSectorAsset.tsx` : prop `id` ⇒ instance offscreen d'export ;
sans `id` ⇒ aperçu éditable (`const editable = !id`). **Conteneur plat** (ni bordure
ni radius) conforme à la règle « assets plats » ; bordure/radius rajoutés à la main
sur Elementor.

Composition :
- **Photo plein cadre** (`object-cover`, cadrage vertical via `regionY` + `RegionPicker`,
  remplacement via `EditableImage`).
- **Voile bleu TEAPS** en overlay, **intensité réglable** (0 → fort, défaut léger),
  couleur = accent extrait de la DA.
- **4 slots de coin** activables/remplaçables : HG icône Lucide du thème · HD logo
  TEAPS · BG pilule (libellé + flèche bleue) · BD badge / petite illustration.
- **Format réglable** (presets `3:2` / `4:3` / `16:9` / `1:1`), base ~1200×900 (×2 à
  l'export), scalée par `transform` comme les autres frames.

## Changements

### `lib/sectorThemes.ts` (nouveau)
- `ThemePreset`, `SECTOR_THEMES` (avocat, nautisme, viticole, startup, shopify,
  wordpress… extensible), `deriveTheme(url): ThemePreset` (parse slug + fallback).
- `ICON_CHOICES`: sous-ensemble de noms Lucide proposés au picker d'icône.

### `app/api/stock-search/route.ts` (nouveau)
- `runtime = "nodejs"`, `POST` ; appelle Pexels `search`, mappe la réponse, gère
  l'absence de clé. Pas de cache lourd (résultats légers).

### `lib/stock.ts` (nouveau)
- `searchStock(query, page)` côté client (fetch de la route).
- `toDataUrl(src)` : inline une URL d'image en dataURL pour l'export (proxy si CORS KO).

### `types/index.ts`
- `SectorAsset` : `{ id, role: "hero" | "content", ratio, photo: { kind: "stock" | "upload", src, alt? }, keywords, iconName, pills: string[], badgeText?, veil: number, regionY: number, slots: { icon: boolean; logo: boolean; pill: boolean; badge: boolean } }`.
- Ajouter `sectorAssets: SectorAsset[]` à `ProjectData` **et** à l'interface du store.

### `store/daStore.ts`
- État `sectorAssets: SectorAsset[]` + actions : `addSectorAsset(role)`,
  `removeSectorAsset(id)`, `updateSectorAsset(id, patch)` (couvre photo, keywords,
  icône, pilules, voile, ratio, regionY, toggles).
- Câblage `loadProjectData` (`p.sectorAssets ?? seedFromTheme(url)`) et `resetProject`
  (re-seed depuis `deriveTheme` au nouveau scrape : hero + 1 content par défaut).

### `lib/projectStorage.ts`
- `sectorAssets` voyage dans `ProjectData` (store `PROJECTS` déjà complet) → pas de
  nouveau store. Vérifier la sérialisation (dataURL d'upload = lourd, comme
  `customScreenshots` déjà persisté).

### `components/frames/FrameSectorAsset.tsx` (nouveau)
- Le template décrit en **Décision E**. Lit l'asset + la DA depuis le store.

### `components/assets/` (nouveau dossier)
- `SectorAssetsPanel.tsx` : liste des assets (aperçu `FrameSectorAsset` éditable),
  boutons add/remove, export unitaire + ZIP.
- `SectorAssetControls.tsx` : recherche Pexels (champ mots-clés pré-rempli depuis le
  thème), slider voile, select format, picker icône (`ICON_CHOICES`), édition des
  pilules/badge, toggles de slots.
- `StockPickerModal.tsx` : grille de résultats Pexels (réutilise le pattern
  `AssetPickerModal`), sélection → `photo.src`.

### `app/page.tsx`
- Étendre l'union `sidebarTab` avec `"assets"`.
- **Bouton de nav après « Aperçu »** (l. ~382) précédé d'un **petit séparateur**
  (fin trait `bg-foreground/10`), avant le bouton « Nouveau projet ».
- Rendu `{sidebarTab === "assets" && <SectorAssetsPanel />}` dans la zone principale.
  **Pas de sidebar gauche dédiée** : les réglages sont **inline** dans le panel
  (sous chaque aperçu d'asset), pour rester simple.
- Montage **offscreen** des `FrameSectorAsset id="…"` pour l'export (comme les autres
  frames montées à l'export).

### `lib/exportFrames.ts`
- Ajouter les assets secteur à l'export : dossier `assets_secteur/` dans le ZIP
  (`exportFullPack`) + export unitaire depuis l'onglet. Inline dataURL (Décision D)
  avant `captureFrame`. Sortie **plate**.

### `CLAUDE.md`
- Documenter le sous-système « Assets secteur » (onglet, table `SECTOR_THEMES`,
  route `stock-search`, `FrameSectorAsset`) et la variable `PEXELS_API_KEY`.

## Hors périmètre (v1)

- ❌ IA (Gemini / génération d'image).
- ❌ Drag libre des éléments → **slots de coin fixes** (toggle + remplaçables).
- ❌ Multi-onglet Pexels/banques alternatives → Pexels seul (upload manuel en secours).
- Auto-thème = best-effort depuis le slug ; surcharge manuelle toujours dispo.

## À prévoir / environnement

- Variable d'env **`PEXELS_API_KEY`** (route Node ; self-hosted Coolify, pas de
  contrainte serverless).

## Vérification

- `npm run build` (type-check strict) + `npm run lint`.
- Test manuel : scrape `teaps.fr/agence-web-avocat` → onglet Assets → thème déduit
  (avocat), photo Pexels auto, voile/format/icône/pilules réglables, remplacement +
  upload + cadrage, export PNG plat + ZIP. Tester un slug inconnu (fallback) et
  l'absence de `PEXELS_API_KEY` (dégradation upload-only). Thème clair/sombre.
