# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# DA Generator

Outil interne pour agence web (Teaps). Prend une URL → scrape le site → génère des visuels de présentation (dossier client, réseaux sociaux) et du contenu IA (étude de cas, post LinkedIn/Instagram).

## Commandes

```bash
npm run dev      # serveur de dev (Next.js + Turbopack, http://localhost:3000)
npm run build    # build prod — inclut le type-check TypeScript strict (échoue sur toute erreur de type)
npm run start    # sert le build de prod
npm run lint     # ESLint (eslint-config-next)
```

Pas de suite de tests : la vérification se fait via `npm run build` (type-check strict) + `npm run lint` + test manuel dans l'app. Puppeteer télécharge Chromium automatiquement au `npm install`.

## Stack

- **Next.js 16** (App Router, TypeScript strict, Turbopack)
- **Tailwind CSS 4** + CSS variables (thème light/dark via next-themes)
- **Puppeteer** (scraping) — `node-vibrant` et `puppeteer` sont déclarés en `serverExternalPackages` dans `next.config.ts` (sortis du bundle pour tourner en natif côté serveur)
- **node-vibrant** (palette), **html-to-image** + **JSZip** + **file-saver** (export PNG/ZIP côté client)
- **Gemini API** (`@google/generative-ai`) — génération de contenu en streaming
- **Zustand** (store global + persistance partielle) ; **Radix UI**, **Lucide React**, **Sonner**

## Architecture

### Flux principal
URL saisie (`components/ui/UrlInput.tsx`) → `POST /api/scrape` → `ScrapeResult` poussé dans le store Zustand (`store/daStore.ts`) → frames (`components/frames/`) rendues et customisées en direct → export PNG/ZIP (`lib/exportFrames.ts`, **côté client**).

### Routes API (runtime Node — jamais edge, puppeteer/Gemini en dépendent)
- `POST /api/scrape` (`maxDuration: 300`) — Puppeteer : screenshots desktop/fullpage/mobile + extraction logo/palette/typos/couleur de fond. Logique dans `lib/scraper.ts`.
- `POST /api/generate-content` (`maxDuration: 120`) — Gemini Flash en streaming : étude de cas + post social. Prompt par défaut dans `lib/defaultPrompt.ts`.
- `POST /api/sitemap` (`maxDuration: 60`) — récupère le sitemap pour nourrir la génération de contenu.
- `GET /api/font-css` — proxy des CSS de polices (contourne le CORS à l'export).
- `POST /api/stock-search` — proxy Pexels (banque d'images de l'onglet « Assets secteur ») ; clé `PEXELS_API_KEY` côté serveur, jamais exposée. Pas de clé → 503 (l'UI bascule sur l'import manuel).
- `GET /api/stock-image` — proxy d'**une** image Pexels (hôte verrouillé sur pexels.com) → convertie en dataURL côté client, pour que l'export html-to-image ne touche jamais une image cross-origin.

### Streaming (deux protocoles différents)
- `POST /api/scrape` → flux **SSE** (`event: log | result-chunk | done | error`). Le `ScrapeResult` étant volumineux, il est découpé en morceaux de 64 Ko (`result-chunk`) réassemblés côté client. Helper de lecture partagé : `streamScrape` dans `PageScreenshots.tsx` (parsing inline équivalent dans `UrlInput.tsx`). Toute modif de l'endpoint doit conserver ce protocole.
- `POST /api/generate-content` → flux **texte brut** (deltas JSON de Gemini concaténés au fil de l'eau), lu par `components/ContentGenerator.tsx` — pas de framing SSE.

### Sécurité du scrape (SSRF)
`/api/scrape` et `/api/sitemap` valident l'URL via `lib/security.ts` (`validateExternalUrl` / `isBlockedHost`) : http(s) uniquement, hôtes internes/privés bloqués ; les pages additionnelles doivent rester sur le même host. À préserver lors de toute modif de ces routes.

### Persistance (deux niveaux distincts)
- **localStorage** — Zustand `persist` + `partialize` (`store/daStore.ts`) : uniquement les réglages globaux (clés Gemini, modèle, prompt, délai + zoom de capture, thème, logo agence, inclusion sitemap). **Jamais** les screenshots base64 (trop lourd).
- **IndexedDB** (`lib/projectStorage.ts`, câblé par `lib/useProjectPersistence.ts`) — deux object stores :
  - `projects` : la donnée complète par projet (`ScrapeResult` + customisations : couleurs, logo, fonts, images custom, flou de fond, zone de capture, casse, marge…). `loadProjectData` recharge un projet dans le store.
  - `meta` : descripteurs légers pour la liste d'historique (domaine, titre, dates) + une **vignette JPEG downscalée** de la hero (`lib/thumbnail.ts`, générée à la demande) → l'historique (`HistoryPanel` / `ProjectCard`) s'affiche sans charger les lourds base64.

### Frames (`components/frames/`)
Convention : une frame reçoit un prop `id` **uniquement** montée offscreen pour l'export (`<Frame id="…" />`) ; sans `id` = instance d'aperçu éditable (`const editable = !id`). L'export PNG capture le nœud DOM de cet `id` (`captureFrame`).
- **Desktop** (2373×1473) : `Frame1_DA` (01 Identité), `FrameColors` (02 Couleurs), `Frame2_Mockup` (03 Interface), `Frame3_Cover` (04 Couverture).
- **Mobile** (1080×1350, versions portrait des desktop) : `Frame1_DA_Mobile`, `FrameColors_Mobile`, `Frame2_Mockup_Mobile`, `Frame3_Cover_Mobile`.
- **Réseaux sociaux** (1080×1350 ; Frame5 en 1080×675) : `Frame4_…BrowserFull`, `Frame5_…HeroSimple`, `Frame6_…NouvelleReal`, `Frame7_…ThreeImg`, `Frame8_…CardSite`, `Frame9_…BoardDesktop`, `Frame10_…BoardMobile`. Helper partagé : `BrowserNavBar`.
- **Assets plats** : le conteneur racine de **chaque** frame n'a ni bordure ni arrondi, en aperçu **comme** à l'export (neutre exprès ; bordure + radius rajoutés à la main sur Elementor — **ne pas les remettre**). Les arrondis/bordures **internes** (fenêtres navigateur, bezels device, cartes) restent : c'est le design des mockups. Les frames 01/03/04 desktop affichent un rappel des valeurs « de base » dans leur en-tête (`baseStyleHint` de `PreviewContainer`).
- Taille CSS fixe, scalées via `transform`. Export : `lib/exportFrames.ts` (`exportFullPack` → dossiers `charte_graphique` / `desktop` / `reseaux_sociaux`) + export unitaire via `PreviewContainer` (`app/page.tsx`).

### Aperçu réseaux sociaux & carrousel (`components/preview/`)
Onglet « Réseaux sociaux » : maquette de post Instagram/LinkedIn (`PreviewStage` → `InstagramPostView` / `LinkedInPostView`) autour d'un carrousel (`PreviewCarousel`, slide `translateX` unifié sur tous les formats ; en « Original » la hauteur du conteneur suit la slide active via ResizeObserver).
- Une image de carrousel (`PreviewImageRef`) = upload collé, screenshot scrapé (clé résolue par `resolveScreenshotKey`), ou **frame sociale rendue en live** (`PreviewImage` → `FrameCover`, scalée « cover »).
- **Ajouter une frame au carrousel = 4 points** (les `Record<SocialFrameId,…>` sont exhaustifs → le type-check casse si on en oublie un) : le type `SocialFrameId` (`types/index.ts`), `FRAME_RENDER` (rendu live, `PreviewImage.tsx`), `CAROUSEL_FRAME_EXPORT` (mont offscreen + export, `carouselExport.tsx`), `FRAME_SOURCES` (picker, `imageSources.ts`).
- `AssetPickerModal` (palette d'ajout), `PreviewSidebar` (ordre + export ZIP du carrousel), `PreviewCarouselBar` (réordonnancement).

### Assets secteur (`components/assets/`)
Onglet « Assets secteur » (rail de nav, **après « Aperçu »**, précédé d'un séparateur ; `sidebarTab === "assets"`) : génère des illustrations thématiques (hero + contenu) pour les **pages SEO TEAPS** (par secteur/techno). Photo de banque d'images en fond + habillage DA TEAPS (icône de coin, logo, pilule, badge), exportées en PNG **plat** pour Elementor.
- **Thème déterministe, zéro IA** : `lib/sectorThemes.ts` → `deriveTheme(url)` parse le slug de l'URL scrapée (`agence-web-avocat` → `avocat`) et matche `SECTOR_THEMES` (extensible : une ligne par secteur). Slug inconnu → repli sur le slug comme requête. Fournit la requête Pexels, le nom d'icône Lucide et les libellés — tous éditables ensuite.
- **Picker d'icône** (`IconPickerModal`) à deux onglets avec recherche : tout le set **Lucide** (record `icons`, 1600+, rendu par nom) **ou** un **emoji** (`lib/emojiData.ts`, recherche par mots-clés). Choix stocké dans `SectorAsset` : `iconName` (Lucide) ou `iconEmoji` (prioritaire si défini).
- **Banque d'images Pexels** (pas de génération IA) : `lib/stock.ts` (`searchStock`, `stockToDataUrl`) via les routes `stock-search`/`stock-image`. La photo choisie est convertie en **dataURL** et stockée dans l'asset (comme un upload) → persiste et s'exporte sans CORS. Import/remplacement manuel possible (cap 8 Mo).
- **DA TEAPS fixe** : le template lit `agencyLogo` (logo TEAPS, forcé blanc) + `selectedColors[0]` (accent, repli bleu) ; seules la photo + les libellés changent par page.
- **État par projet** : `sectorAssets: SectorAsset[]` dans le store (seedé au scrape depuis le thème, persisté en IndexedDB via `pickSnapshot`). Actions `add/remove/updateSectorAsset`.
- **Template** `components/frames/FrameSectorAsset.tsx` : convention `id` (offscreen export) / sans `id` (aperçu). Dimensions par ratio = `ASSET_DIMS` (`lib/sectorThemes.ts`). Export : `exportSectorAsset` / `exportSectorAssetsPack` (dossier `assets_secteur/`) dans `lib/exportFrames.ts` ; les instances offscreen sont montées en permanence par `SectorAssetsPanel`.

### Customisation & édition des frames
- Réglages visuels **par projet** (persistés en IndexedDB) : couleurs, logo + échelle, police (+ casse majuscule détectée), marge desktop (`desktopPadding`, défaut sans marge), flou de fond (04), opacité/échelle de la card (08), et **zone de capture globale** (`regionY`).
- `components/ui/EditableImage.tsx` enveloppe le screenshot de chaque slot (`slotKey`) : au survol on peut **remplacer/coller** une image (stockée dans `customScreenshots[slotKey]`) ou ouvrir le **sélecteur de zone** (`RegionPicker`, rendu en **portal** pour échapper au `transform: scale` du preview) qui règle `regionY` (0..1) — appliqué en `object-position` sur les visuels desktop/mobile. `regionY` est remis à 0 à chaque nouveau scrape (spécifique à une page).

## Points d'attention

- `lib/scraper.ts` fait bien plus que des screenshots — lire les commentaires avant d'y toucher : auto-dismiss cookies/GDPR **et** portails d'âge (alcool), injection de police emoji (police privée `DAGenEmoji` + wrap des seuls glyphes, pour éviter le bug d'espacement des titres sous Chromium/Linux), déroulé de la page pour charger le lazy-load + déclencher les animations « reveal on scroll », zoom navigateur réglable.
- Ordre des captures : le **hero (capture viewport)** est shooté **AVANT** le déroulé (au sommet, avec le contenu du chargement initial) ; le déroulé sert aux captures **fullpage / mid / lower** et au mobile.
- **Limitation connue (à traiter plus tard)** : sur certains sites **Shopify avec animations d'entrée** sans `fill-mode: forwards`, le déroulé re-déclenche des animations qui repassent en `opacity:0` → la capture **fullpage** (frames 02/04) peut sortir **blanche** (hero et autres sites OK). Ne PAS « corriger » en forçant `animation-duration: 0` globalement → ça blanchit d'autres pages (déjà testé).
- Zoom des captures desktop : le viewport 1440×900 est élargi de `1/zoom` et le `deviceScaleFactor` réduit de `×zoom` → la sortie reste à 2160 px de large quel que soit le zoom. Mobile : 390×844 natif (jamais zoomé).
- Export PNG côté client → `skipFonts: true` (sinon erreurs CORS sur les polices).
- Fonts de l'UI (Satoshi, Cabinet Grotesk) chargées depuis Fontshare via `<link>` au niveau page.
- Frames sociales montées dans le DOM uniquement quand l'onglet « Réseaux sociaux » est actif.
- **Assets plats à l'export** : le contour des frames (bordure grise 3px + arrondi) a été retiré — l'export est volontairement neutre, bordure + radius rajoutés à la main sur Elementor. Le chrome `PreviewContainer` (`app/page.tsx`) est aussi plat ; le fond de l'onglet Visuels est légèrement assombri (`bg-foreground/[0.04]`) pour faire ressortir les sites à fond blanc. Conséquence : le champ store `borderRadius` / `setBorderRadius` est **mort** (plus aucun consommateur ; le réglage `RadiusSelector` a été supprimé) — à nettoyer un jour.
- **Piège `tw-animate-css`** : le paquet est dans `package.json` mais **jamais importé** dans `app/globals.css` → sous Tailwind 4 les classes `animate-in` / `fade-in` / `slide-in-*` / `zoom-in-*` ne génèrent rien (no-op silencieux ; des usages restent inertes dans `AssetPickerModal`, `UrlInput`). Pour animer : convention maison = `@keyframes` dans `globals.css` + `style={{ animation: "… both" }}` inline (cf. `SettingsPanel`, `app/page.tsx`).

## Environnement & déploiement

- Variables : `GEMINI_API_KEY` (requise) ; `PEXELS_API_KEY` (optionnelle — banque d'images de l'onglet « Assets secteur » ; sans elle l'onglet bascule sur l'import manuel).
- **Self-hosted (Coolify)**, pas de contrainte serverless — d'où `maxDuration: 300` au scrape et le Chromium bundlé. (Le scraper n'est pas conçu pour un hébergement serverless type Vercel.)
- Le push sur `main` déclenche `.github/workflows/sync-teaps.yml` qui fast-forward le fork `teapsagency/da-gen` (cible du déploiement).
