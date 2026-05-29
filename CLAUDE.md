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

### Streaming (deux protocoles différents)
- `POST /api/scrape` → flux **SSE** (`event: log | result-chunk | done | error`). Le `ScrapeResult` étant volumineux, il est découpé en morceaux de 64 Ko (`result-chunk`) réassemblés côté client. Helper de lecture partagé : `streamScrape` dans `PageScreenshots.tsx` (parsing inline équivalent dans `UrlInput.tsx`). Toute modif de l'endpoint doit conserver ce protocole.
- `POST /api/generate-content` → flux **texte brut** (deltas JSON de Gemini concaténés au fil de l'eau), lu par `components/ContentGenerator.tsx` — pas de framing SSE.

### Sécurité du scrape (SSRF)
`/api/scrape` et `/api/sitemap` valident l'URL via `lib/security.ts` (`validateExternalUrl` / `isBlockedHost`) : http(s) uniquement, hôtes internes/privés bloqués ; les pages additionnelles doivent rester sur le même host. À préserver lors de toute modif de ces routes.

### Persistance (deux niveaux distincts)
- **localStorage** — Zustand `persist` + `partialize` (`store/daStore.ts`) : uniquement les réglages globaux (clés Gemini, modèle, prompt, délai + zoom de capture, thème, logo agence, inclusion sitemap). **Jamais** les screenshots base64 (trop lourd).
- **IndexedDB** — `lib/projectStorage.ts`, câblé par `lib/useProjectPersistence.ts` : l'historique complet des projets (le `ScrapeResult` + les customisations par projet : couleurs, logo, fonts, border-radius, images custom…). `loadProjectData` recharge un projet dans le store.

### Frames
- **3 desktop** (2373×1473 px fixes) : `Frame1_DA` (Identity), `Frame2_Mockup`, `Frame3_Cover`.
- **5 réseaux sociaux** : `Frame4_Social_BrowserFull`, `Frame5_…HeroSimple`, `Frame6_…NouvelleReal`, `Frame7_…ThreeImg`, `Frame8_…CardSite`. Helpers partagés : `BrowserNavBar`, `FrameColors`.
- Taille CSS fixe, scalées via `transform` dans le preview. Export ZIP = desktop uniquement.

## Points d'attention

- `lib/scraper.ts` fait bien plus que des screenshots — lire les commentaires avant d'y toucher : auto-dismiss cookies/GDPR **et** portails d'âge (alcool), injection de police emoji (police privée `DAGenEmoji` + wrap des seuls glyphes, pour éviter le bug d'espacement des titres sous Chromium/Linux), déroulé complet de la page avant capture (déclenche lazy-load + animations « reveal on scroll », desktop ET mobile), zoom navigateur réglable.
- Zoom des captures desktop : le viewport 1440×900 est élargi de `1/zoom` et le `deviceScaleFactor` réduit de `×zoom` → la sortie reste à 2160 px de large quel que soit le zoom. Mobile : 390×844 natif (jamais zoomé).
- Export PNG côté client → `skipFonts: true` (sinon erreurs CORS sur les polices).
- Fonts de l'UI (Satoshi, Cabinet Grotesk) chargées depuis Fontshare via `<link>` au niveau page.
- Frames sociales montées dans le DOM uniquement quand l'onglet « Réseaux sociaux » est actif.

## Environnement & déploiement

- Variable requise : `GEMINI_API_KEY`.
- **Self-hosted (Coolify)**, pas de contrainte serverless — d'où `maxDuration: 300` au scrape et le Chromium bundlé. (Le scraper n'est pas conçu pour un hébergement serverless type Vercel.)
- Le push sur `main` déclenche `.github/workflows/sync-teaps.yml` qui fast-forward le fork `teapsagency/da-gen` (cible du déploiement).
