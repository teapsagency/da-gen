# DA Generator — CLAUDE.md

## Projet

Outil interne pour agence web. Prend une URL → scrape le site → génère automatiquement des visuels de présentation (dossier client, réseaux sociaux) et du contenu IA (étude de cas, post LinkedIn/Instagram).

## Stack

- **Next.js 16** (App Router, TypeScript strict)
- **Tailwind CSS 4** + CSS Variables (thème light/dark)
- **Puppeteer** (scraping, Chromium bundlé auto au `npm install`)
- **node-vibrant** (extraction palette couleurs)
- **html-to-image** + **JSZip** (export PNG / ZIP côté client)
- **Gemini API** (`@google/generative-ai`) pour la génération de contenu en streaming
- **Zustand** (store global + persistance partielle localStorage)
- **Radix UI** + **Lucide React** + **Sonner**

## Fonctionnalités principales

### Scraping (`/api/scrape`)
- Screenshots : desktop (1440×900 @1.5x), fullpage (max 6000px), mobile (390×844 @2x)
- Extraction : logo, palette (6 couleurs via node-vibrant), typographies, couleur de fond
- Auto-dismiss des bandeaux cookies/GDPR
- User-agent configuré pour éviter les blocages
- Déploiement self-hosted (Coolify) — pas de contrainte serverless

### Frames visuelles
- **3 frames desktop** (2373×1473px fixes) : Identity, Mockup, Cover
- **4 frames réseaux sociaux** : BrowserFull, HeroSimple, NouvelleRéalisation, ThreeImages
- Toutes customisables en temps réel (couleurs, fonts, logo, border-radius, fond)
- Export individuel PNG ou pack ZIP (desktop uniquement)

### Génération de contenu (`/api/generate-content`)
- Streaming Gemini Flash
- Génère : étude de cas structurée + post social (LinkedIn/Instagram)
- Supporte upload fichiers (TXT, MD, HTML, JSON, PDF) comme contexte
- Prompts en français

## Architecture clé

```
/app
  page.tsx                    # UI principale
  /api/scrape/route.ts        # Scraping Puppeteer
  /api/generate-content/route.ts  # IA Gemini streaming
/components
  /frames/                    # Frame1_DA, Frame2_Mockup, Frame3_Cover, Frame4-7_Social
  /ui/                        # ColorPicker, FontSelector, LogoSelector, etc.
  ContentGenerator.tsx        # Streaming handler
/lib
  scraper.ts                  # Logique Puppeteer
  colorExtractor.ts           # node-vibrant
  contrastUtils.ts            # WCAG luminance
  exportFrames.ts             # html-to-image + ZIP
/store/daStore.ts             # Zustand store
/types/index.ts               # ScrapeResult, DAStore, etc.
```

## Points d'attention

- Les frames sont en taille fixe CSS (2373×1473px), scalées via `transform` dans le preview
- L'export PNG se fait côté client (pas serveur) → `skipFonts: true` pour éviter les erreurs CORS
- Les fonts (Satoshi, Cabinet Grotesk) viennent de Fontshare, chargées via `<link>` au niveau page
- Le store Zustand ne persiste pas les screenshots en base64 (trop lourd pour localStorage)
- Frames sociales montées dans le DOM seulement quand l'onglet "Réseaux sociaux" est actif

## Variable d'environnement requise

```
GEMINI_API_KEY=...
```

## Déploiement

- Vercel (branche `dev` = préprod, `main` = prod)
- Build : `npm run build` (Next.js + TypeScript strict)
