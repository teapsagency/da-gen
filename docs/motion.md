# Motion Studio

Vidéo de présentation **générée automatiquement** depuis les assets d'un projet client (logo, palette, typo, captures desktop/mobile) : une timeline de scènes dessinées sur un canvas **1920×1080**, aperçu en direct dans l'onglet **Visuels → Motion**, export **MP4 H.264 60 fps** (WebCodecs, Chrome + HTTPS requis).

## Fichiers

| Fichier | Rôle |
|---|---|
| `components/motion/MotionStudio.tsx` | UI du studio : réglages, aperçu canvas, transport (play/scrub), export |
| `lib/motion/motion.ts` | Le cœur : scènes, timeline, fond animé, mockups, easings, `drawFrame` |
| `lib/motion/exportVideo.ts` | Export MP4 frame par frame (WebCodecs + mp4-muxer), piste audio AAC optionnelle |
| `lib/projectChips.ts` | Table des tags projet + `resolveMotionHeadline` (titre) et `resolveMotionTags` (pastilles) |

Le rendu est **déterministe** : `drawFrame(ctx, t, assets)` dessine l'état exact au temps `t` — l'aperçu (rAF) et l'export (boucle frame par frame) produisent la même image.

## Réglages du studio

- **Nom** — nom du projet affiché dans l'intro (le title scrapé est souvent du SEO type « Carrelage Toulon - … »). Vide = nom déduit du scrape. *Persisté par projet* (`projectName`).
- **Base** — couleur de fond du dégradé (partagée avec le Showcase). Base **blanche pure** = fond réellement blanc (texture, vignette et nappe sombre s'effacent près du blanc).
- **Accent** — couleur de marque du fond animé. Dérivée de la palette par défaut (et elle « voyage » alors de scène en scène à travers la palette) ; **choisie à la main** → verrouillée telle quelle sur toute la vidéo.
- **Vitesse / Intensité** — respiration et opacité des blobs du fond. *Persisté par projet* (`motionBg`).
- **Motion blur** — échantillonnage du shutter façon After Effects (2 passes en aperçu, 4 à l'export).
- **Charte** — toggle : insère la scène charte graphique après la prestation (+~3,7 s). *Persisté par projet* (`motionCharte`).
- **Ajouter un son** — bande-son du MP4 (tronquée + fade-out), aperçu synchronisé. *Session uniquement.*
- **Ce qu'on a réalisé** (panneau repliable) — sélecteur de tags (type de projet → type de site → techno → services, `motionChips`, *persisté par projet*). Alimente :
  - le **titre de la scène prestation** (`resolveMotionHeadline`) — ex. « Création de site e-commerce » ;
  - les **pastilles** flottantes (`resolveMotionTags`) — type de site + techno + services, 6 max.

## Timeline

Durée : **~31,8 s** (sans charte) / **~35,5 s** (avec). Les scènes se chevauchent de ~0,2–0,3 s (fondus croisés). Deux timelines précalculées : `SCENES` et `SCENES_CHARTE` (charte insérée à 6,7 s, toute la suite décalée de `CHARTE_SHIFT = +3,7 s` — les timings ci-dessous sont ceux **sans** charte).

| # | Scène (`key`) | Début → Fin | Contenu |
|---|---|---|---|
| 1 | `intro` | 0 → 3,2 | Nom du site en tracking-in (l'espacement des lettres se resserre en fondu), carte logo qui se pose au-dessus avec ressort. |
| 2 | `headline` | 3,0 → 6,9 | **Prestation** : grand titre depuis les tags (« CRÉATION DE SITE VITRINE »…, fallback « NOUVELLE RÉALISATION »), mots en cascade, domaine en kicker. Le même titre défile en **marquee vertical géant en contour** le long des deux bords (gauche monte, droite descend). 1 ou 2 lignes auto. |
| 2b | `charte` *(toggle)* | 6,7 → 10,6 | Bandes de couleurs pleine hauteur qui montent **ensemble**, se compressent en bandeau bas (hex solidaires des bandes) ; logo + « Aa » + nom de la police. Déclenche la **cassure au blanc** du fond (tenue jusqu'au posé du desktop). |
| 3 | `iso` | 6,7 → 9,4 | Mockup navigateur en **projection isométrique qui pivote** (rotation continue), scroll léger. Sort par le haut en accélérant. |
| 3b | `desktop` | 9,2 → 12,9 | Desktop à plat : se pose, **scrolle** (vitesse constante), flotte… puis **chute signature** : montée douce → apex → gravité pure + rotation. Les **pastilles** vivent pendant cette scène (voir plus bas). |
| 3c | `pagesIso` | 12,9 → 18,3 | **Home en vraie perspective** (rotation Y avec point de fuite + bascule avant, rendue par tranches depuis un canvas hors-écran) + **mobile géant** au premier plan (ombre = superposition), les deux scrollent posément. Sortie : chute signature, mobile lâché un souffle après en sens inverse. |
| 3d | `pagesCols` | 18,0 → 22,6 | **Page produit** (extraPage sinon home) éclatée en **3 colonnes parallaxe** = tranches haut/milieu/bas, entrée en escalier, dérive douce. Sortie = entrée rejouée à l'envers, vers le haut. |
| 4 | `mobile` | 22,3 → 26,5 | **Traversée verticale en vague** : 3 téléphones montent du bas en file décalée, se posent en escalier (pose penchée : gauche ↖, centre droit, droite ↗). Chacun montre un **endroit différent de la page** (centre = hero, gauche = milieu, droite = footer **qui remonte**). Sortie = entrée inversée + spin par voie. |
| 5 | `ensemble` | 26,2 → 29,6 | Le trio **PC + tablette + mobile** (×1,16), tous sur le **hero** — le même site décliné par support. Tablette/mobile posés par-dessus avec ombre. Fin en repli doux (match-dissolve avec l'outro). |
| 6 | `outro` | 29,3 → 31,8 | Carte logo, domaine, signature « Direction artistique · TEAPS ». |

### Pastilles « ce qu'on a réalisé »

Overlay **hors caméra** (coordonnées écran), dessiné au-dessus de tout, pendant la scène desktop : entrée en cascade dès **9,7 s** (glisse + ressort, ancres réparties autour du mockup), puis **chute groupée à ~11,9 s synchronisée sur le lâcher du desktop** — rollback puis gravité, rotations aléatoires stables (hash déterministe) et micro-décalage du lâcher. Décalées de +3,7 s quand la charte est active. Cap : 6 pastilles (`MOTION_TAG_LIMIT` = nb d'ancres).

## Systèmes transverses

- **Fond animé** (`drawBackground`) — base + texture hero floutée qui dérive + 4 blobs radiaux (accent, sombre, clair, accent) en orbites amples. L'**accent voyage** à travers la palette aux milieux de scènes (`accentAt`), sauf accent verrouillé. Près du **blanc pur**, texture/nappe sombre/vignette s'effacent (courbe cubique sur la luminance) → « full blanc » réel.
- **Caméra globale** — zoom + micro-rotation lents sur tout le rendu : rien n'est jamais figé. Les pastilles sont dessinées **après** (fixes à l'écran).
- **Cassure au blanc** (`whiteAmount`) — uniquement si la scène `charte` est dans la timeline active : le fond passe au blanc pur derrière les bandes, tient pendant l'iso, revient au posé du desktop.
- **Scroll à vitesse constante** (`coverMaxPan`) — l'amplitude s'adapte à la **hauteur de la page** : le défilement est toujours au même rythme lisible (0,6 viewport/s ; 0,32 pour les scènes « pages », plus posées).
- **Frange blanche de capture** (`usableHeightFrac` + `coverPanMax`) — certaines captures fullpage finissent par une zone blanche sous le footer ; détectée au préchargement (scan des lignes du bas, max 25 %) et exclue du scroll.
- **Motion blur** (`drawFrame`, `blurSamples > 1`) — N échantillons répartis sur un shutter 180° et moyennés : les éléments rapides filent, les statiques restent nets.
- **Mockups plats harmonisés** — navigateur (dots macOS + barre d'URL), téléphone, tablette : fond blanc, **liseré identique** `rgba(0,0,0,0.08)`, bezel d'épaisseur constante (rayon intérieur = extérieur − bezel), **aucune ombre portée** sauf superposition volontaire (tablette/mobile de l'ensemble, mobile géant).
- **Easings maison** — `easeEmph` (entrée décélérée MD3), `easeAccel` (sortie accélérée), `easeSpring` (ressort). Conventions : sortie de scène **en mouvement** (`exitP`), jamais un simple fondu ; une sortie « physique » (chute, fuite) doit être **terminée avant le fondu de scène**, sinon elle se lit comme un fade ; sortie idéale = **entrée rejouée à l'envers** (courbe inversée dans le temps, miroir vertical → rotations négées).

## Données (`MotionAssets`)

Construites dans `MotionStudio.tsx` en deux couches : les **images** (lourdes, préchargées une fois par projet : logo, desktop fullpage + pages additionnelles, mobiles ×3 max, hero floutée) et le **style** (léger, recalculé à chaque réglage : couleurs, base/accent, vitesse/intensité, nom, titre, tags, toggle charte). Bouger un curseur redessine immédiatement sans recharger les captures.

## Modifier / ajouter une scène

1. Ajouter l'entrée dans `SCENES` (`key`, `start`, `dur`, `fadeOut?`, `draw(ctx, p, t, A)`) — `p` = progression 0..1 dans la scène, `t` = temps absolu (pour les flottements `Math.sin(t…)`).
2. Chevaucher la scène précédente de ~0,2–0,3 s (fondu croisé), et penser au **décalage charte** si la scène est après 6,5 s (elle est décalée automatiquement dans `SCENES_CHARTE`, mais tout timing codé en dur hors timeline — genre pastilles — doit suivre `CHARTE_SHIFT`).
3. Respecter la charte d'anim : assets plats sans ombre, entrées `easeEmph`, sorties en mouvement terminées avant le fondu, scroll via `coverMaxPan`.
4. `MOTION_DURATION` / `motionDuration()` se recalculent tout seuls.

La scène charte (`CHARTE_SCENE`) vit hors de `SCENES` et n'est injectée que par le toggle — modèle à suivre pour toute future scène optionnelle.
