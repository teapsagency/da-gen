# Historique en cartes (vignette hero) — Design

Date : 2026-05-29

## Objectif

Remplacer l'affichage de l'historique des projets (aujourd'hui : favicon + nom +
date sur une ligne) par des **cartes** reprenant le croquis fourni :

- un cadre avec padding,
- la **hero section du site** (déjà capturée) affichée comme un petit écran,
- en dessous : favicon + nom du site + date de dernière ouverture, et une flèche.

Affichage : **4-5 cartes par ligne**.

Portée : **home** (projets récents, max 5 + lien « voir tout ») **et** page
**Historique** (toutes les cartes). La page Historique gagne en plus une
**suppression multiple par cases à cocher** (au survol) + le bouton « tout
supprimer » existant.

## Décision d'architecture : la vignette hero (option C)

La hero = `scrapeResult.screenshots.desktop` (above-the-fold desktop, base64
lourd) vit dans le store IndexedDB `PROJECTS`. La liste de l'historique ne charge
que le `META` léger (`id, domain, title, savedAt`) — pas de screenshot.

**Option retenue (C)** : vignette downscalée, générée à la demande, mise en cache
dans META.

- Au premier affichage d'une carte visible (IntersectionObserver), on charge une
  fois le projet, on génère un JPEG ~640px via canvas, on l'affiche **et** on
  l'écrit dans `meta.thumbnail`.
- Affichages suivants : instantané depuis META (`listProjects()` reste léger).
- Auto-réparant : gère les anciens projets sans toucher au chemin de sauvegarde.

## Changements

### `types/index.ts`
- `ProjectMeta` : ajouter `thumbnail?: string` et `lastOpenedAt: number`.

### `lib/thumbnail.ts` (nouveau)
- `makeThumbnail(dataUrl: string, width = 640): Promise<string | null>` —
  Image → canvas (aspect préservé) → JPEG (~0.72). `null` en cas d'échec.

### `lib/projectStorage.ts`
- `metaOf(id, savedAt, snap, lastOpenedAt = savedAt, thumbnail?)`.
- `saveProject` : lit le META existant dans la même transaction pour **préserver**
  `thumbnail` et `lastOpenedAt` (un edit ne doit pas les écraser). `savedAt = now`.
- `saveThumbnail(id, dataUrl)` : patch META seul (préserve le reste).
- `touchProject(id)` : `lastOpenedAt = now` sur le META.
- `listProjects()` : tri par `lastOpenedAt ?? savedAt` décroissant.
- Pas de bump `DB_VERSION` (champs optionnels, pas de nouveau store/index).

### `components/ui/ProjectCard.tsx` (nouveau, partagé)
- Props : `meta`, `isActive?`, `onOpen`, `selectable?`, `selected?`,
  `onToggleSelect?`.
- Cadre `rounded-2xl border bg-card` + padding ; vignette `aspect-[16/10]`
  `rounded-xl` `object-cover object-top` ; placeholder (icône image, fond muted)
  tant que la vignette n'est pas prête / si pas de capture.
- Pied : pastille favicon + nom (gras, tronqué) + « Ouvert {il y a X} » à gauche ;
  flèche → à droite (animée au survol). Badge « Ouvert » si projet actif.
- Génération lazy de la vignette (IntersectionObserver + cache module-level
  in-flight + `saveThumbnail`).
- `selectable` : checkbox absolue en haut-gauche, visible au survol ou si cochée,
  `stopPropagation` (n'ouvre pas). Clic ailleurs = `onOpen`.

### `components/ui/HistoryPanel.tsx`
- Grille de `ProjectCard` (responsive, 4-5/ligne en large ; conteneur élargi).
- État de sélection (`Set<string>`) ; barre d'actions quand ≥1 sélectionné :
  « Supprimer (N) » + « Annuler la sélection ». Bouton « Supprimer tout » conservé.
- Suppression d'un projet ouvert → `resetProject()` (comme aujourd'hui).
- `handleOpen` appelle `touchProject(id)`.
- `ProjectFavicon` généralisé pour accepter une `className` (taille variable).

### `app/page.tsx`
- Bloc « Projets récents » → grille de `ProjectCard` (max 5, non sélectionnables),
  dans un conteneur élargi sous l'input ; lien « Voir tous les projets (N) »
  conservé.
- `handleOpenProject` appelle `touchProject(id)`.

## Vérification
- `npm run build` (type-check strict) + `npm run lint`.
- Test manuel : home (cartes + vignettes), historique (sélection + suppressions),
  anciens projets (backfill vignette), thème clair/sombre.
