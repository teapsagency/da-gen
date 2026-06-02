# Onglet Preview réseaux sociaux — Design

**Date :** 2026-06-02
**Statut :** validé (brainstorming), prêt pour plan d'implémentation

## Contexte

Le DA Generator génère des visuels et du contenu (étude de cas + post LinkedIn/Instagram via Gemini).
Il existait un *début* de preview dans l'onglet « Contenu » (`components/ContentChat.tsx` →
`components/ui/SocialPreview.tsx`) : après génération, on pouvait basculer Texte / LinkedIn / Instagram
et choisir un asset. L'objectif est d'en faire un **onglet dédié et complet** : prévisualiser le rendu
réaliste d'un post **Instagram** et **LinkedIn** en **mobile / tablette / desktop**.

## Objectif

Un nouvel onglet « Preview » où l'on compose un post (caption + hashtags + une ou plusieurs images en
carrousel) et où l'on voit son **rendu réaliste** (chrome Instagram / LinkedIn) simultanément sur trois
tailles d'appareil empilées en colonne, avec un toggle de plateforme.

## Décisions (issues du brainstorming)

1. **Contenu = saisie 100% libre** dans l'onglet (caption/hashtags + choix d'image), indépendant de Gemini.
   Confort : un bouton « Importer le post généré » remplit caption + hashtags depuis `generatedContent`.
2. **Périmètre = détail du post uniquement.** Pas de vue profil, pas de grille, pas de fil, pas de
   récupération des posts récents (jugé fragile et sans réelle plus-value).
3. **Identité du compte = manuelle + réutilisation de l'existant.** L'avatar réutilise le logo déjà
   configuré dans « Identité agence » (`agencyLogo`). Le nom affiché, le `@` Instagram et le nombre
   d'abonnés sont des réglages globaux éditables, pré-remplis aux valeurs actuelles.
   **Aucun scraping, aucune route API.**
4. **Layout :** vue responsive, **3 appareils empilés en colonne** (mobile → tablette → desktop),
   toggle de plateforme (Instagram / LinkedIn).
5. **Carrousel multi-images** supporté (points + flèches).
6. **Sources d'image :** toutes — upload/coller + screenshots scrapés + frames sociales 04–10.
7. **Pas d'export PNG** des previews (visualisation/validation seulement).

## Hors périmètre (YAGNI)

- Vue profil / grille Instagram / fil LinkedIn / posts récents.
- Scraping ou API officielle (Meta Graph / LinkedIn).
- Identité de compte par projet (l'identité est **globale**, c'est le compte de l'agence).
- Export PNG des mockups d'appareil ; publication automatisée (on conserve l'existant copier + ouvrir).

---

## Architecture

### Vue d'ensemble

- **Onglet top-level** `"preview"` ajouté à l'union `sidebarTab` de `app/page.tsx`, avec une icône dans
  le rail de gauche (après « Contenu »), disponible dès qu'un `scrapeResult` existe (comme « Contenu »).
- **Sidebar gauche (280 px) = éditeur** du post (cohérent avec Visuels/Contenu).
- **Zone principale = scène** : toolbar (toggle plateforme) + colonne de 3 appareils.
- **Réglages globaux d'identité sociale** dans `SettingsPanel`.

### Types (`types/index.ts`)

```ts
export type SocialFrameId =
  | 'frame4' | 'frame5' | 'frame6' | 'frame7' | 'frame8' | 'frame9' | 'frame10';

// Une image du carrousel : upload/coller, screenshot scrapé (résolu via clé),
// ou frame sociale rendue en live.
export type PreviewImageRef =
  | { kind: 'upload'; dataUrl: string }
  | { kind: 'screenshot'; key: string }   // ex: 'main:desktop', 'main:mobile', 'page:2:mobile'
  | { kind: 'frame'; frame: SocialFrameId };

// Identité du compte agence affichée sur les cartes (globale, hors avatar).
// L'avatar provient de `agencyLogo`.
export type SocialIdentity = {
  displayName: string;     // nom affiché (LinkedIn), défaut "Agence TEAPS"
  instagramHandle: string; // défaut "agence.teaps"
  followers: string;       // défaut "528 abonnés"
};

export type SocialPlatform = 'instagram' | 'linkedin';
```

Ajouts à `ProjectSnapshot` (persistés **par projet** en IndexedDB) :

```ts
previewCaption: string;
previewHashtags: string[];
previewImages: PreviewImageRef[];
```

Ajouts à `DAStore` :

```ts
// Par projet
previewCaption: string;
setPreviewCaption: (v: string) => void;
previewHashtags: string[];
setPreviewHashtags: (v: string[]) => void;
previewImages: PreviewImageRef[];
setPreviewImages: (v: PreviewImageRef[]) => void; // setter unique ; add/remove/reorder gérés côté UI

// Global
socialIdentity: SocialIdentity;
setSocialIdentity: (v: Partial<SocialIdentity>) => void;
```

### Store (`store/daStore.ts`)

- **Initialisation :**
  `previewCaption: ''`, `previewHashtags: []`, `previewImages: []`,
  `socialIdentity: { displayName: 'Agence TEAPS', instagramHandle: 'agence.teaps', followers: '528 abonnés' }`.
- **`loadProjectData`** : hydrater les 3 champs preview (`p.previewCaption ?? ''`, `p.previewHashtags ?? []`,
  `p.previewImages ?? []`).
- **`setScrapeResult`** : remettre les 3 champs preview à vide (un nouveau scrape = nouvelle page/nouveau
  client ; les `PreviewImageRef` de type `screenshot`/`frame` référencent la page précédente). Même logique
  que `regionY`/`customScreenshots`.
- **`resetProject`** : remettre les 3 champs preview à vide.
- **`partialize`** : ajouter `socialIdentity` (petites chaînes, OK en localStorage). Les champs preview
  restent **hors** partialize (ils vivent par projet en IndexedDB).
- Pas de migration nécessaire : `socialIdentity` absent du localStorage → la valeur d'initialisation
  s'applique au merge de `persist`.

### Persistance (`lib/useProjectPersistence.ts`)

- `pickSnapshot` : ajouter `previewCaption`, `previewHashtags`, `previewImages`.
- `snapshotsEqual` compare par référence champ par champ → fonctionne tel quel (les setters remplacent les
  références). Aucun changement à `lib/projectStorage.ts` (il sérialise `ProjectSnapshot` en bloc).

---

## Composants (`components/preview/`)

Nouveau module, une responsabilité par fichier.

### `parseCaption.ts`
Utilitaire repris de `SocialPreview.tsx` : transforme une caption en `ReactNode[]` en stylant URLs et
hashtags selon la plateforme. Réutilisé par les deux vues.

### `imageSources.ts`
- `resolveScreenshotKey(key, scrapeResult): string | undefined` — mappe une clé (`'main:desktop'`,
  `'main:mobile'`, `'page:{i}:desktop'`, `'page:{i}:mobile'`) vers la data URL du screenshot.
- `listImageSources(scrapeResult): { uploads, screenshots, frames }` — décrit les sources disponibles
  pour le sélecteur (libellés + refs). `frames` = liste statique des frames 04–10 avec libellé.

### `PreviewImage.tsx`
`{ refItem: PreviewImageRef }` → rend l'image dans son conteneur :
- `upload` / `screenshot` → `<img>` (`object-cover`).
- `frame` → frame sociale rendue **en live et mise à l'échelle** (technique `ResizeObserver` + `transform: scale`
  reprise de l'actuel `AssetPreviewImage` de `ContentChat.tsx`). Les frames lisent leurs données depuis le store.

### `PreviewCarousel.tsx`
`{ images: PreviewImageRef[]; aspect: 'square' | 'auto' }` → un seul visuel si `length <= 1`, sinon
points + flèches (état d'index local). Place-holder « Ajoute une image » si vide.

### `InstagramPostView.tsx`
Carte de feed Instagram (reprend l'actuel `InstagramPreview`), mais :
- identité depuis props (`displayName`/`instagramHandle`/`avatar`) au lieu du « TEAPS » codé en dur ;
- image(s) via `PreviewCarousel` (carré 1/1) ;
- caption via `parseCaption` + hashtags.

### `LinkedInPostView.tsx`
Carte de feed LinkedIn (reprend l'actuel `LinkedInPreview`), avatar = `agencyLogo`, nom + abonnés depuis
`socialIdentity`, image(s) via `PreviewCarousel`.

### `DeviceFrame.tsx`
`{ device: 'mobile' | 'tablet' | 'desktop'; scale: number; children }` → chrome de l'appareil
(mobile : coins arrondis + barre de statut ; tablette ; desktop : barre de navigateur), à une **largeur CSS
native** par appareil (≈ mobile 390 / tablette 834 / desktop 1280). À l'intérieur, un fond de « feed » et la
carte de la plateforme centrée à sa largeur naturelle (sur mobile la carte remplit la largeur).
**Échelle commune** dérivée de la largeur de colonne disponible (le desktop tient dans la colonne ; le même
facteur s'applique aux trois → tailles relatives réalistes). Détail ajustable à l'implémentation.

### `PreviewStage.tsx` (zone principale)
- Toolbar : toggle **plateforme** (Instagram / LinkedIn). Pas de toggle de vue (détail uniquement).
- Colonne verticale : `DeviceFrame` mobile, tablette, desktop, chacun rendant `InstagramPostView` /
  `LinkedInPostView` selon la plateforme, avec libellé d'appareil.
- Lit `previewCaption/previewHashtags/previewImages`, `socialIdentity`, `agencyLogo` depuis le store.
- État éphémère local : `platform`, index de carrousel.
- État vide si aucune image **et** caption vide.

### `PreviewSidebar.tsx` (sidebar 280 px)
- Bouton **« Importer le post généré »** (désactivé si `!generatedContent`) → remplit
  `previewCaption` = `generatedContent.socialPost.caption`, `previewHashtags` = `…hashtags`.
- **Caption** (textarea auto-grow) liée à `previewCaption`.
- **Hashtags** (saisie + chips) liée à `previewHashtags`.
- **Images / carrousel** : liste ordonnée (retrait + réordonner) de `previewImages` + un sélecteur à 3
  sources (Upload·coller / Screenshots scrapés / Frames 04–10) qui pousse des `PreviewImageRef`.
- Note discrète : « Identité du compte → Paramètres ».

---

## Settings (`components/ui/SettingsPanel.tsx`)

Nouvelle section « Identité réseaux sociaux » (même style `SectionHeader` + carte que les sections
existantes) :
- `displayName`, `instagramHandle`, `followers` — inputs liés à `socialIdentity`, **commit immédiat** via
  `setSocialIdentity` (comme les clés API ; n'entre pas dans la barre sticky « Sauvegarder » qui ne couvre
  que modèle + prompt).
- Mention : « L'avatar est repris d'Identité agence. » (lien/repère vers l'accordéon Identité agence).

---

## Nettoyage de l'existant

- **`components/ContentChat.tsx`** : retirer la preview inline (état `previewPlatform`/`previewAsset`, le
  toggle Texte/LinkedIn/Instagram, le sélecteur d'asset, l'usage de `SocialPreview` et le composant local
  `AssetPreviewImage`). Conserver l'affichage texte, le copier et les boutons Publier. Ajouter un bouton
  **« Prévisualiser dans l'onglet Preview »** câblé via une nouvelle prop `onOpenPreview` passée par
  `app/page.tsx` (qui fait `setSidebarTab('preview')`).
- **`components/ui/SocialPreview.tsx`** : logique migrée dans `components/preview/` puis **fichier supprimé**
  (plus aucun import après le nettoyage de `ContentChat`). `parseCaption` déménage dans
  `components/preview/parseCaption.ts`.

## `app/page.tsx`

- Étendre l'union `sidebarTab` avec `"preview"`.
- Ajouter le bouton de nav (icône `MonitorSmartphone` de lucide) après « Contenu », avec le même pattern
  de tooltip/`aria-current`.
- Rendu sidebar : `sidebarTab === "preview"` → `<PreviewSidebar />`.
- Rendu zone principale : `sidebarTab === "preview"` → `<PreviewStage />`.
- Passer `onOpenPreview={() => setSidebarTab('preview')}` à `<ContentChat />`.

## Housekeeping

- Ajouter `.superpowers/` au `.gitignore` (artefacts du compagnon visuel de brainstorming).

---

## Vérification

Pas de suite de tests dans le projet. Validation :
1. `npm run build` — type-check TypeScript strict (doit passer : nouveaux types, store, snapshot).
2. `npm run lint` — ESLint.
3. Test manuel : scraper un site → onglet Preview → saisir caption/hashtags, ajouter images (upload +
   screenshot + frame), carrousel, toggle Instagram/LinkedIn, vérifier les 3 appareils ; « Importer le post
   généré » après une génération ; recharger la page (F5) → caption/images persistées ; « Nouveau projet »
   → champs preview vidés ; Paramètres → modifier identité sociale → reflété dans les cartes.

## Ordre d'implémentation suggéré

1. Types + store + persistance (fondations, sans UI).
2. Settings : section identité sociale.
3. Module `components/preview/` : `parseCaption`, `imageSources`, `PreviewImage`, `PreviewCarousel`,
   `InstagramPostView`, `LinkedInPostView`, `DeviceFrame`.
4. `PreviewStage` + `PreviewSidebar`.
5. Câblage `app/page.tsx` (onglet, nav, rendus).
6. Nettoyage `ContentChat` + suppression/migration `SocialPreview`.
7. `npm run build` + `npm run lint` + test manuel.

---

## Révision 2026-06-02 (feedback après v1, vérifiée en navigateur)

Suite à la première version (3 appareils empilés), retours utilisateur → **redesign** :

- **Présentation** : abandon des 3 appareils empilés (trop petits) et du **chrome d'appareil**
  (`DeviceFrame` **supprimé**). À la place : **une seule preview en grand** + toggle **Mobile / Desktop**
  (tablette abandonnée, pas de layout propre). Rendu à taille réelle (plus de `transform: scale`),
  largeur de scène : mobile 430, desktop 1040 (IG) / 555 (LinkedIn).
- **Layout desktop fidèle** : sur Instagram desktop, `InstagramPostView` rend **image à gauche (~58%) /
  détails à droite** (header, caption scrollable + « 72 sem », réactions, « 312 J'aime », date, ajouter un
  commentaire). Mobile = carte empilée. LinkedIn = colonne unique (mobile/desktop, largeur différente).
- **Formats Instagram** : nouveau type `PreviewFormat = 'original' | '1:1' | '4:5' | '16:9'`, persisté par
  projet (`previewFormat`, défaut `'1:1'`, ajouté à `ProjectSnapshot`/`DAStore`/`pickSnapshot`/reset).
  Sélecteur segmenté dans la toolbar. `PreviewCarousel` applique le ratio (cover) ; `'original'` = ratio
  naturel.
- **`PreviewImage`** : prop `fit: 'cover' | 'natural'` (cover = remplit un conteneur dimensionné ;
  natural = flux au ratio naturel pour « Original »). Frame en live via `FrameCover` (ResizeObserver +
  scale cover). `FRAME_RENDER`/`FORMAT_ASPECT` exportés.
- **Carrousel (sidebar)** : remplace labels + flèches par une grille flex de **vignettes réelles**
  (via `PreviewImage` cover, numérotées) avec **réordonnancement par glisser-déposer** (HTML5 DnD) et
  retrait au survol.
- **Correctif** : `addImage`/`removeImage`/reorder/`addHashtag` lisent l'état frais via
  `useDAStore.getState()` (closures périmées sur clics rapprochés).

Vérifié dans le navigateur (scrape `example.com`) : desktop IG image-gauche/détails-droite, mobile 4:5,
LinkedIn 16:9, carrousel multi-images + vignettes. `npm run build` + `npm run lint` : 0 erreur.

### Révision 2 (feedback)

- **Hashtags dans la légende** : suppression du champ et de l'état `previewHashtags` (types/store/
  persistance/vues) — les hashtags se tapent dans la légende (stylés par `parseCaption`). « Importer le
  post généré » fusionne caption + hashtags dans la légende.
- **Français** : onglet **Preview → Aperçu** (nav + bouton ContentChat), *Caption → Légende*,
  *Screenshots → Captures du site*, *Frames sociales → Visuels sociaux*.
- **Suppression** du bouton « Upload / coller » (les assets viennent du site) et de la note
  « Identité du compte → Paramètres ».
- **Sélecteur d'assets visuel** : grille de **vignettes** (captures via `thumb`, visuels sociaux rendus
  en live) — composant `AssetThumb`.
- **Numérotation** corrigée (collision 02) → séquentielle globale : Charte 01-02, Desktop **03-04**,
  réseaux sociaux **05-11** (titres `page.tsx` + `FRAME_SOURCES`).
- **Fix** : `AssetThumb` en `div role="button"` (les frames live contiennent les `<button>` d'
  `EditableImage` → `<button>` imbriqué interdit) ; frames rendues `pointer-events:none` dans l'aperçu
  (visuel pur, pas d'overlay « Remplacer l'image »). Vérifié : plus d'erreur DOM en console.
