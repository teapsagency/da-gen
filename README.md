# DA Generator

Outil interne d'agence web : à partir d'une simple URL, il scrape un site client et génère tout le kit de présentation — **visuels de direction artistique** (dossier client, réseaux sociaux), **contenu IA** (étude de cas, posts LinkedIn/Instagram) et **vidéo motion design** de présentation.

```
URL → scrape (screenshots, logo, palette, typos) → frames personnalisables → export PNG/ZIP/MP4
```

## Fonctionnalités

### Module « Cas client »
- **Scrape complet** (Puppeteer) : captures desktop (hero, fullpage, zones), mobile, pages additionnelles, extraction du logo, de la palette, des polices et de la couleur de fond — avec auto-dismiss des bandeaux cookies/RGPD et portails d'âge, déroulé de page pour le lazy-load et les animations au scroll.
- **Visuels** : frames desktop 2373×1473 (identité, couleurs, interface, couverture), versions mobiles 1080×1350, frames réseaux sociaux (mockups navigateur, boards, showcase…) — toutes éditables en direct (couleurs, logo, police, zone de capture, images collées) et exportées en PNG **plat** (bordure/radius ajoutés dans Elementor).
- **Showcase 16:9** : carrousel de slides mockups sur fond mesh gradient animable, export PNG/JPEG.
- **[Motion Studio](docs/motion.md)** : vidéo de présentation 1920×1080 générée depuis les assets du projet (intro typographique, annonce de la prestation, scènes site desktop/mobile, pastilles « ce qu'on a réalisé »…), aperçu temps réel sur canvas et export **MP4 60 fps** (WebCodecs). Voir [`docs/motion.md`](docs/motion.md) pour le détail des scènes.
- **Contenu IA** (Gemini, streaming) : étude de cas + post social, guidés par des tags projet (type de site, techno, secteur, services) et le sitemap.
- **Aperçu réseaux sociaux** : maquette de post Instagram/LinkedIn autour d'un carrousel mêlant frames rendues en live, screenshots et uploads.
- **Historique** : chaque projet scrapé est conservé en IndexedDB (rechargeable, avec vignette), les réglages fins sont persistés par projet.

### Module « Assets site agence »
Bibliothèque autonome d'illustrations pour le site de l'agence (pas de scrape) : image Pexels ou upload + calques flottants (icônes Lucide/emoji, logos de marques simple-icons, pilules, badges), DA de l'agence figée, export PNG transparent pour Elementor.

## Stack

- **Next.js 16** (App Router, TypeScript strict, Turbopack) · **Tailwind CSS 4** · **Zustand**
- **Puppeteer** (scraping, Chromium bundlé) · **node-vibrant** (palette)
- **Gemini API** (contenu, streaming) · **Pexels** (banque d'images, optionnel)
- **html-to-image + JSZip** (exports PNG côté client) · **WebCodecs + mp4-muxer** (export vidéo)

## Démarrer

```bash
npm install        # télécharge aussi Chromium (Puppeteer)
echo "GEMINI_API_KEY=..." > .env.local
npm run dev        # http://localhost:3000
```

Variables d'environnement :

| Variable | Requis | Rôle |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Génération de contenu (peut aussi être saisie dans les réglages de l'app) |
| `PEXELS_API_KEY` | — | Banque d'images du module agence (sans elle : import manuel) |

Vérification (pas de suite de tests) :

```bash
npm run build   # type-check TypeScript strict — échoue sur toute erreur
npm run lint    # ESLint
```

## Déploiement

Self-hosted (**Coolify**) — le scraper n'est pas conçu pour du serverless (durées longues, Chromium bundlé). Un push sur `main` fast-forward automatiquement le fork de déploiement via GitHub Actions. L'export MP4 exige **HTTPS** (WebCodecs).

## Documentation

- [`docs/motion.md`](docs/motion.md) — le Motion Studio : timeline, scènes, systèmes d'animation
- [`CLAUDE.md`](CLAUDE.md) — architecture détaillée du code (routes API, streaming, persistance, conventions des frames)
