# PROMPT COMPLET — Générateur de DA pour agence web
# À coller tel quel dans Gemini CLI

---

## 🎯 CONTEXTE DU PROJET

Tu vas construire une application web complète appelée **"DA Generator"** pour une agence web.  
L'objectif : l'utilisateur entre une URL de site client → l'app scrape le site → extrait logo, couleurs dominantes, typographie → génère automatiquement **3 frames d'export PNG** (2373×1473px chacune) qui constituent le cas client de l'agence.

---

## 🧠 AVANT DE COMMENCER — RÈGLES DE DESIGN ET D'ARCHITECTURE

Avant d'écrire la moindre ligne de code, applique ces principes :

**Design (UI du générateur lui-même) :**
- Choisis une direction esthétique **intentionnelle et mémorable** : luxury/refined, editorial/magazine
- Utilise des fonts **distinctives et caractérielles** — pas Inter, pas Roboto, pas Arial. Pense à des choices comme `Cormorant Garant`, `Playfair Display`, `DM Serif Display`, `Neue Montreal`, `Syne`, `PP Neue Montreal`
- CSS variables pour toutes les couleurs et espacements
- Animations subtiles mais présentes : staggered reveals au chargement, hover states soignés
- Layout asymétrique, généreux en espace négatif
- Fond sombre ou neutre avec accents forts, pas un SaaS blanc générique

**Architecture :**
- Chaque décision technique doit être justifiée
- Le code doit être production-grade, pas un prototype
- Tous les composants doivent être paramétrables via props claires

---

## 🏗️ STACK TECHNIQUE

```
Framework    : Next.js 16 (App Router, TypeScript)
Styling      : Tailwind CSS + CSS Variables pour le theming des frames
Scraping     : Puppeteer (Chromium bundlé) — déploiement self-hosted Coolify
Couleurs     : node-vibrant (extraction palette depuis screenshot)
Export PNG   : html2canvas (capture côté client des frames React)
Download     : file-saver
Fonts Google : @next/font/google + chargement dynamique via CSS @font-face
State        : Zustand (store global pour les données scrapées + choix utilisateur)
```

**Dépendances à installer :**
```bash
npm install puppeteer node-vibrant html-to-image file-saver zustand
npm install -D @types/file-saver
```

---

## 📁 STRUCTURE DU PROJET

```
/app
  layout.tsx
  page.tsx                        → UI principale (input URL, sélection, preview, export)
  /api
    /scrape/route.ts              → API Route : lance Puppeteer, retourne JSON

/components
  /ui
    UrlInput.tsx                  → Input URL + bouton "Analyser"
    ColorPicker.tsx               → Sélection des couleurs dominantes proposées
    FontSelector.tsx              → Sélection / upload de la typo
    BgColorSelector.tsx           → Choix couleur de fond des frames
    ExportButton.tsx              → Bouton export PNG
  /frames
    Frame1_DA.tsx                 → Frame DA : logo + couleurs + typo + browser preview
    Frame2_Mockup.tsx             → Frame desktop + mobile
    Frame3_Cover.tsx              → Frame macOS browser cover

/lib
  scraper.ts                      → Logique Puppeteer complète
  colorExtractor.ts               → node-vibrant → palette
  fontDetector.ts                 → Détection font depuis CSS/Google Fonts
  contrastUtils.ts                → Calcul contraste W3C (texte noir ou blanc sur couleur)
  exportFrames.ts                 → html2canvas → PNG → download

/store
  daStore.ts                      → Zustand store

/types
  index.ts                        → Types TypeScript partagés
```

---

## 🔄 FLOW UTILISATEUR COMPLET

```
1. Utilisateur entre l'URL (ex: macollectioncapsule.fr)
2. Clic "Analyser" → appel POST /api/scrape
3. Puppeteer :
   - Screenshot desktop (viewport 1920px) → hero section visible
   - Screenshot fullpage desktop (scroll complet)
   - Screenshot mobile (viewport 390px)
   - Extraction du logo (balise <link rel="icon"> ou <img> dans <header>)
   - Extraction des fonts chargées (document.fonts + intercept requêtes Google Fonts)
4. node-vibrant analyse le screenshot hero → retourne 5-6 couleurs dominantes
5. Retour JSON au client :
   {
     logo: string (base64 ou URL),
     colors: { hex: string, rgb: [r,g,b] }[],
     font: { name: string, url?: string, isGoogleFont: boolean },
     screenshots: {
       desktop: string (base64),
       desktopFull: string (base64),
       mobile: string (base64)
     },
     siteUrl: string,
     title: string
   }
6. UI affiche les propositions → utilisateur sélectionne couleurs (min 1, max 6), valide la typo, choisit bg-color
7. Les 3 frames React se mettent à jour en live (preview réduit au 1/4)
8. Clic "Exporter" → html2canvas capture chaque frame en 2373×1473px → télécharge 3 PNG
```

---

## 📐 SPECS PIXEL-PERFECT DES 3 FRAMES (extraites du Figma source)

### ⚠️ RÈGLE ABSOLUE pour les frames
```
Chaque frame = 2373 × 1473px EXACTEMENT
border-radius: 28px
background: var(--bg-color)  /* choisi par l'utilisateur, défaut #F2EEE9 */
Les frames sont des composants React avec des dimensions fixes en px (pas en %).
Elles sont rendues hors-écran dans un div caché pour l'export html2canvas.
```

---

### 🎨 FRAME 1 — `Frame1_DA` — Charte graphique

**Container :**
```css
width: 2373px;
height: 1473px;
background: var(--bg-color);
border-radius: 28px;
padding: 28px;
box-sizing: border-box;
```

**Grid intérieure (4 cellules) :**
```css
display: grid;
grid-template-columns: repeat(2, 1fr);
grid-template-rows: repeat(2, 1fr);
gap: 24px;
width: 100%;
height: 100%;
```

---

**CELLULE 1 — Haut gauche : Logo**
```css
background: #FFFFFF;
border-radius: 32px;
display: flex;
align-items: center;
justify-content: center;
overflow: hidden;
```
→ Affiche le logo extrait du site, centré, `max-width: 60%`, `max-height: 60%`

---

**CELLULE 2 — Haut droite : Palette couleurs**
```css
background: #FFFFFF;
border-radius: 32px;
padding: 24px;
display: flex;
flex-direction: row;
gap: 24px;
align-items: stretch;  /* les cartes prennent toute la hauteur */
```

**Chaque carte couleur** (autant de cartes que de couleurs sélectionnées par l'utilisateur) :
```css
flex: 1;
height: 100%;
border-radius: 8px;
padding: 32px;
display: flex;
align-items: flex-end;
justify-content: flex-end;
background: [hex de la couleur];
```

**Label hex** en bas à droite de chaque carte :
```css
font-family: 'Satoshi', sans-serif;
font-weight: 500;
font-size: 38px;
/* couleur calculée via contraste W3C : noir si luminance > 0.179, blanc sinon */
color: [#000000 ou #FFFFFF];
white-space: nowrap;
```

Exemples du Figma :
- `#F2EEE9` → label **noir** (couleur claire)
- `#111111` → label **blanc** (couleur sombre)
- `#DFDFDF` → label **noir** (couleur claire)

---

**CELLULE 3 — Bas gauche : Typographie**
```css
background: #FFFFFF;
border-radius: 32px;
padding: 24px;
```

**Inner frame :**
```css
background: var(--bg-color);   /* même couleur que le fond global des frames */
border-radius: 8px;
padding: 58px;
display: flex;
flex-direction: row;
align-items: flex-end;   /* tout aligné en bas */
gap: 24px;
overflow: hidden;
width: 100%;
height: 100%;
box-sizing: border-box;
```

**Lettre "Aa" :**
```css
font-family: var(--client-font);   /* la font extraite du site client */
font-weight: 600;
font-size: 512px;
color: #111111;
line-height: 1;
flex-shrink: 0;
```

**Nom de la typo :**
```css
font-family: var(--client-font);
font-weight: 500;
font-size: 68px;
color: #111111;
white-space: nowrap;
align-self: flex-end;
flex-shrink: 0;
```
→ Valeur = nom de la font détectée (ex: "Oswald", "Playfair Display", "Cormorant")

---

**CELLULE 4 — Bas droite : Browser preview**
```css
background: #FFFFFF;
border-radius: 32px;
padding: 24px;
```

**Image intérieure :**
```css
width: 100%;
height: 100%;
border-radius: 8px;
object-fit: cover;
object-position: top;
```
→ Screenshot desktop (viewport 1920px, top de la page) injecté en base64

---

### 📱 FRAME 2 — `Frame2_Mockup` — Desktop + Mobile

**Container :**
```css
width: 2373px;
height: 1473px;
background: var(--bg-color);
border-radius: 28px;
padding: 58px;
position: relative;
box-sizing: border-box;
overflow: hidden;
```

**Screenshot desktop** (scroll complet) :
```css
position: relative;  /* dans le flow normal */
width: 1709px;
height: auto;          /* laisse la hauteur naturelle selon l'image */
max-height: 1357px;    /* 37.81% de 3587px = hauteur affichée */
border-radius: 32px;
overflow: hidden;
flex-shrink: 0;
```
→ Affiche le haut de la page (hero + début de contenu)
→ L'image est tronquée pour ne montrer que la partie visible

**Screenshot mobile** :
```css
position: absolute;
left: 1617px;          /* depuis le bord gauche du container padding inclus */
top: 208px;
width: 718.62px;
height: 1562px;
border-radius: 32px;
border: 14px solid #FFFFFF;
object-fit: cover;
object-position: top;
```
→ Screenshot mobile (viewport 390px, scroll complet)

---

### 🖥️ FRAME 3 — `Frame3_Cover` — macOS Browser

**Container :**
```css
width: 2373px;
height: 1473px;
background: var(--bg-color);
border-radius: 28px;
padding-top: 58px;
padding-left: 58px;
padding-right: 58px;
padding-bottom: 0;     /* la fenêtre touche le bas, pas de padding */
display: flex;
flex-direction: column;
box-sizing: border-box;
```

**Fenêtre blanche :**
```css
background: #FFFFFF;
border-radius: 32px 32px 0 0;   /* coins arrondis SEULEMENT en haut */
padding-top: 24px;
padding-left: 24px;
padding-right: 24px;
padding-bottom: 0;
flex: 1;
display: flex;
flex-direction: column;
gap: 24px;
overflow: hidden;
```

**Barre de navigation macOS :**
```css
display: flex;
align-items: center;
justify-content: space-between;
padding-left: 12px;
padding-right: 12px;
height: 39px;
width: 100%;
flex-shrink: 0;
position: relative;
```

**Dots macOS** (positionnés à gauche) :
```css
display: flex;
align-items: center;
gap: 10px;
```
3 cercles :
```css
width: 18px;
height: 18px;
border-radius: 50%;
/* couleurs exactes macOS : */
dot-1: #FF5F57   /* rouge */
dot-2: #FEBC2E   /* orange/jaune */
dot-3: #28C840   /* vert */
```

**URL bar** (centré en absolu) :
```css
position: absolute;
left: 50%;
transform: translateX(-50%);
display: flex;
align-items: center;
gap: 8px;
```
- Icône cadenas SVG : `14×18px`, couleur `#1E1E1E`
- Texte URL :
```css
font-family: 'Satoshi', sans-serif;
font-weight: 500;
font-size: 24px;
color: #1E1E1E;
white-space: nowrap;
```
→ Valeur = domaine extrait de l'URL (ex: `macollectioncapsule.fr`)

**Logo agence** (positionné à droite) :
```css
width: 63px;
height: 39px;
object-fit: contain;
```
→ Ton logo agence, hardcodé dans `/public/agency-logo.png` ou SVG inline

**Zone hero :**
```css
flex: 1;
width: 100%;
overflow: hidden;
```

**Image hero :**
```css
width: 100%;
height: 1472px;
object-fit: cover;
object-position: top;
border-radius: 0;
display: block;
```
→ Screenshot desktop hero injecté en base64

---

## 🔌 API ROUTE — `/api/scrape/route.ts`

```typescript
// Retourne ce type :
type ScrapeResult = {
  logo: string;              // base64 PNG ou SVG URL
  colors: {
    hex: string;
    rgb: [number, number, number];
    isLight: boolean;        // true si luminance > 0.179 (texte noir dessus)
  }[];
  font: {
    name: string;            // "Oswald", "Playfair Display", etc.
    url?: string;            // URL Google Fonts si disponible
    isGoogleFont: boolean;
    cssImport?: string;      // ex: "@import url('https://fonts.googleapis.com/...')"
  };
  screenshots: {
    desktop: string;         // base64 — viewport 1920px, top visible, ~1080px de haut
    desktopFull: string;     // base64 — fullpage scrollée
    mobile: string;          // base64 — viewport 390px, fullpage
  };
  siteUrl: string;
  domain: string;            // ex: "macollectioncapsule.fr"
  title: string;             // <title> de la page
}
```

**Logique Puppeteer dans `scraper.ts` :**
1. Launch Puppeteer (Chromium bundlé) — déploiement self-hosted Coolify
2. `page.setViewport({ width: 1920, height: 1080 })` → screenshot desktop
3. `page.screenshot({ fullPage: true })` → screenshot fullpage
4. `page.setViewport({ width: 390, height: 844 })` → screenshot mobile fullpage
5. Extraction logo :
   - Cherche d'abord `document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')`
   - Sinon `header img, nav img, .logo img` → prend le premier
   - Convertit en base64 si nécessaire
6. Extraction fonts :
   - Intercepte les requêtes réseau : `page.on('request', ...)` → filtre `fonts.googleapis.com`
   - Extrait le `family=` de l'URL Google Fonts → nom de la font
   - Sinon inspecte `getComputedStyle(document.body).fontFamily`
7. Retourne le JSON `ScrapeResult`

**Extraction couleurs dans `colorExtractor.ts` :**
```typescript
import Vibrant from 'node-vibrant'

async function extractColors(screenshotBuffer: Buffer) {
  const palette = await Vibrant.from(screenshotBuffer).getPalette()
  return [
    palette.Vibrant,
    palette.DarkVibrant, 
    palette.LightVibrant,
    palette.Muted,
    palette.DarkMuted,
    palette.LightMuted
  ]
    .filter(Boolean)
    .map(swatch => ({
      hex: swatch!.hex,
      rgb: swatch!.rgb as [number, number, number],
      isLight: swatch!.hsl[2] > 0.5
    }))
}
```

**Calcul contraste dans `contrastUtils.ts` :**
```typescript
// Calcul W3C WCAG 2.0 relative luminance
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

export function getTextColor(hex: string): '#000000' | '#FFFFFF' {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return getRelativeLuminance(r, g, b) > 0.179 ? '#000000' : '#FFFFFF'
}
```

---

## 🗃️ ZUSTAND STORE — `/store/daStore.ts`

```typescript
type DAStore = {
  // Input
  url: string
  setUrl: (url: string) => void
  
  // Scraped data
  scrapeResult: ScrapeResult | null
  setScrapeResult: (result: ScrapeResult) => void
  
  // User choices
  selectedColors: string[]          // hexs sélectionnés par l'utilisateur
  toggleColor: (hex: string) => void
  
  bgColor: string                   // couleur de fond des frames
  setBgColor: (hex: string) => void
  
  fontName: string
  fontUrl: string | undefined
  setFont: (name: string, url?: string) => void
  
  // UI state
  isLoading: boolean
  setIsLoading: (v: boolean) => void
  error: string | null
  setError: (e: string | null) => void
}
```

---

## 📤 EXPORT — `/lib/exportFrames.ts`

```typescript
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'

export async function exportFrame(frameId: string, filename: string) {
  const element = document.getElementById(frameId)
  if (!element) return
  
  const canvas = await html2canvas(element, {
    width: 2373,
    height: 1473,
    scale: 1,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    logging: false
  })
  
  canvas.toBlob(blob => {
    if (blob) saveAs(blob, `${filename}.png`)
  }, 'image/png', 1.0)
}

export async function exportAllFrames(clientName: string) {
  await exportFrame('frame-1-da', `${clientName}_01_charte`)
  await exportFrame('frame-2-mockup', `${clientName}_02_mockup`)
  await exportFrame('frame-3-cover', `${clientName}_03_cover`)
}
```

**Important pour html2canvas :**
- Les frames doivent être dans le DOM mais peuvent être `position: fixed; left: -9999px; opacity: 0`
- Toutes les images doivent être en base64 (pas d'URL externe) pour éviter les problèmes CORS
- Les fonts doivent être chargées avant de lancer html2canvas

---

## 🎨 UI DU GÉNÉRATEUR (page principale)

**Direction esthétique à respecter :**
- Thème sombre, luxueux, editorial
- Font display : `Cormorant Garant` ou `DM Serif Display` pour les titres
- Font UI : `Satoshi` ou `Geist` pour les labels et inputs
- Background : `#0A0A0A` ou `#111111`
- Accents : blanc pur `#FFFFFF` + une couleur chaude subtile
- Layouts aérés avec beaucoup d'espace négatif
- Animations : fade-in staggeré au chargement, skeleton loader pendant le scraping
- **Absolument aucun design SaaS générique bleu/violet**

**Sections de la page :**

1. **Hero** : titre de l'app ("DA Generator" ou un nom plus poétique), sous-titre, input URL large + bouton
2. **Loading state** : animation élégante pendant le scraping (barre de progression avec étapes : "Analyse du site... Extraction des couleurs... Capture des écrans...")
3. **Panneau de configuration** (apparaît après le scraping) :
   - Grille de couleurs proposées (cliquables, multi-sélection, min 1 max 6)
   - Sélecteur de couleur de fond des frames (bg-color)
   - Affichage de la font détectée + option upload font custom
4. **Preview** des 3 frames en miniature (scale ~0.15 pour entrer dans l'écran)
5. **Bouton export** "Télécharger les 3 frames PNG"

---

## 🚀 POUR COMMENCER

Lance ces commandes dans l'ordre :

```bash
npx create-next-app@latest da-generator --typescript --tailwind --app --src-dir false --import-alias "@/*"
cd da-generator
npm install puppeteer node-vibrant html-to-image file-saver zustand
npm install -D @types/file-saver
```

Puis crée les fichiers dans cet ordre :
1. `types/index.ts` — les types TypeScript
2. `lib/contrastUtils.ts` — calcul contraste W3C
3. `lib/colorExtractor.ts` — node-vibrant
4. `lib/scraper.ts` — Puppeteer
5. `app/api/scrape/route.ts` — API Route
6. `store/daStore.ts` — Zustand
7. `components/frames/Frame1_DA.tsx`
8. `components/frames/Frame2_Mockup.tsx`
9. `components/frames/Frame3_Cover.tsx`
10. `lib/exportFrames.ts` — html2canvas export
11. `app/page.tsx` — UI principale
12. `app/layout.tsx` — layout avec fonts

---

## ✅ CHECKLIST FINALE

Avant de terminer, vérifie que :
- [ ] Chaque frame fait exactement 2373×1473px en CSS
- [ ] `getTextColor()` est appelé pour chaque carte couleur (noir ou blanc selon luminance)
- [ ] Les screenshots sont en base64 (pas d'URL externe) avant injection dans les frames
- [ ] La font client est chargée via `@font-face` dynamique AVANT de lancer html2canvas
- [ ] Le logo agence est dans `/public/agency-logo.png` (à remplacer par le tien)
- [ ] Les 3 dots macOS ont les bonnes couleurs : `#FF5F57`, `#FEBC2E`, `#28C840`
- [ ] L'URL dans la Frame 3 affiche seulement le domaine (sans `https://`)
- [ ] La Frame 3 a `border-radius: 32px 32px 0 0` (pas de coins arrondis en bas)
- [ ] La Frame 2 a le screenshot mobile en `position: absolute` avec `border: 14px solid #FFFFFF`
- [ ] html2canvas utilise `useCORS: true` et toutes les images sont en base64
