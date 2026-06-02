# Onglet Preview réseaux sociaux — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un onglet « Preview » qui affiche le rendu réaliste d'un post Instagram/LinkedIn (détail) en mobile/tablette/desktop, à partir d'une saisie libre (caption + hashtags + carrousel d'images).

**Architecture:** Nouvel onglet top-level dans `app/page.tsx` (sidebar éditeur + scène à 3 appareils empilés). État du post persisté **par projet** (IndexedDB via `ProjectSnapshot`), identité du compte persistée **globalement** (localStorage via Zustand `persist`). Module `components/preview/` dédié, migrant la logique de `components/ui/SocialPreview.tsx`. Aucun scraping/API.

**Tech Stack:** Next.js 16, React, TypeScript strict, Zustand, Tailwind CSS 4, lucide-react.

**Vérification (pas de tests unitaires dans ce projet) :** chaque tâche se valide par `npm run build` (type-check strict) et `npm run lint`. Test manuel global en fin de plan.

---

### Task 1: Types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Ajouter les nouveaux types**

Ajouter, après le type `GeneratedContent` (vers la ligne 70) :

```ts
export type SocialFrameId =
  | 'frame4' | 'frame5' | 'frame6' | 'frame7' | 'frame8' | 'frame9' | 'frame10';

export type SocialPlatform = 'instagram' | 'linkedin';

// Une image du carrousel de preview : upload/coller, screenshot scrapé (résolu
// via une clé), ou frame sociale rendue en live.
export type PreviewImageRef =
  | { kind: 'upload'; dataUrl: string }
  | { kind: 'screenshot'; key: string }
  | { kind: 'frame'; frame: SocialFrameId };

// Identité du compte agence affichée sur les cartes de post (globale).
// L'avatar n'en fait PAS partie : il est repris de `agencyLogo`.
export type SocialIdentity = {
  displayName: string;     // nom affiché (LinkedIn), défaut "Agence TEAPS"
  instagramHandle: string; // défaut "agence.teaps"
  followers: string;       // défaut "528 abonnés"
};
```

- [ ] **Step 2: Étendre `ProjectSnapshot`**

Dans `ProjectSnapshot` (après `contentBrief: string;`), ajouter :

```ts
  previewCaption: string;
  previewHashtags: string[];
  previewImages: PreviewImageRef[];
```

- [ ] **Step 3: Étendre `DAStore`**

Dans `DAStore`, après le bloc `contentBrief` / `setContentBrief` (vers la ligne 276), ajouter :

```ts
  // Preview réseaux sociaux — état du post, par projet.
  previewCaption: string;
  setPreviewCaption: (v: string) => void;
  previewHashtags: string[];
  setPreviewHashtags: (v: string[]) => void;
  previewImages: PreviewImageRef[];
  setPreviewImages: (v: PreviewImageRef[]) => void;

  // Identité du compte agence sur les cartes (globale, persistée en localStorage).
  socialIdentity: SocialIdentity;
  setSocialIdentity: (v: Partial<SocialIdentity>) => void;
```

Ajouter les imports de type en tête si nécessaire (ils sont dans le même fichier, donc rien à importer).

- [ ] **Step 4: Vérifier**

Run: `npm run build`
Expected: échoue dans `store/daStore.ts` (propriétés manquantes sur l'objet du store) — c'est attendu, corrigé à la Task 2. (Si tu préfères un point de contrôle vert, fais Task 1 + Task 2 avant de builder.)

- [ ] **Step 5: Commit** (différé : commiter à la fin de la Task 2, voir ci-dessous)

---

### Task 2: Store

**Files:**
- Modify: `store/daStore.ts`

- [ ] **Step 1: Importer les nouveaux types**

Ligne 3, étendre l'import :

```ts
import { DAStore, GeminiApiKey, GeneratedContent, PreviewImageRef, ScrapeResult, SocialIdentity } from '@/types';
```

- [ ] **Step 2: Valeurs d'initialisation**

Après le bloc `contentBrief: ''` / `setContentBrief` (vers la ligne 276), ajouter :

```ts
      previewCaption: '',
      setPreviewCaption: (v: string) => set({ previewCaption: v }),
      previewHashtags: [],
      setPreviewHashtags: (v: string[]) => set({ previewHashtags: v }),
      previewImages: [],
      setPreviewImages: (v: PreviewImageRef[]) => set({ previewImages: v }),

      socialIdentity: {
        displayName: 'Agence TEAPS',
        instagramHandle: 'agence.teaps',
        followers: '528 abonnés',
      },
      setSocialIdentity: (v: Partial<SocialIdentity>) =>
        set((state) => ({ socialIdentity: { ...state.socialIdentity, ...v } })),
```

- [ ] **Step 3: `loadProjectData` — hydrater les champs preview**

Dans `loadProjectData` (set object), après `contentBrief: p.contentBrief ?? '',` (ligne 51), ajouter :

```ts
        previewCaption: p.previewCaption ?? '',
        previewHashtags: p.previewHashtags ?? [],
        previewImages: p.previewImages ?? [],
```

- [ ] **Step 4: `setScrapeResult` — reset des champs preview**

Dans `setScrapeResult` (set object), après `regionY: 0,` (ligne 80), ajouter :

```ts
        // Un nouveau scrape = nouvelle page/client → les images de preview
        // (screenshot/frame) référencent la page précédente.
        previewCaption: '',
        previewHashtags: [],
        previewImages: [],
```

- [ ] **Step 5: `resetProject` — reset des champs preview**

Dans `resetProject` (set object), après `contentBrief: '',` (ligne 260), ajouter :

```ts
          previewCaption: '',
          previewHashtags: [],
          previewImages: [],
```

(Ne PAS reset `socialIdentity` : c'est global, conservé entre projets.)

- [ ] **Step 6: `partialize` — persister `socialIdentity`**

Dans `partialize` (vers la ligne 306), ajouter après `includeSitemapInContent: state.includeSitemapInContent,` :

```ts
        socialIdentity: state.socialIdentity,
```

Pas de migration : si `socialIdentity` est absent du localStorage, la valeur d'init s'applique au merge de `persist`.

- [ ] **Step 7: Vérifier**

Run: `npm run build`
Expected: PASS (type-check OK). Puis `npm run lint` → PASS.

- [ ] **Step 8: Commit**

```bash
git add types/index.ts store/daStore.ts
git commit -m "feat(preview): types + store (post libre + identité sociale)"
```

---

### Task 3: Persistance par projet

**Files:**
- Modify: `lib/useProjectPersistence.ts`

- [ ] **Step 1: Étendre `pickSnapshot`**

Dans `pickSnapshot` (objet retourné), après `contentBrief: s.contentBrief,` (ligne 43), ajouter :

```ts
  previewCaption: s.previewCaption,
  previewHashtags: s.previewHashtags,
  previewImages: s.previewImages,
```

(`snapshotsEqual` compare par référence champ par champ → fonctionne tel quel. `lib/projectStorage.ts` sérialise `ProjectSnapshot` en bloc → aucun changement.)

- [ ] **Step 2: Vérifier**

Run: `npm run build`
Expected: PASS (les 3 champs de `ProjectSnapshot` sont désormais tous fournis par `pickSnapshot`).

- [ ] **Step 3: Commit**

```bash
git add lib/useProjectPersistence.ts
git commit -m "feat(preview): persistance par projet (caption/hashtags/images)"
```

---

### Task 4: Settings — section identité sociale

**Files:**
- Modify: `components/ui/SettingsPanel.tsx`

- [ ] **Step 1: Importer une icône**

Ligne ~6-20, ajouter `AtSign` à l'import lucide-react :

```ts
  AtSign,
```

- [ ] **Step 2: Composant de section**

Ajouter, avant `export function SettingsPanel()` (vers la ligne 527) :

```tsx
/* ---------- Identité réseaux sociaux ---------- */

function SocialIdentitySection() {
  const identity = useDAStore((s) => s.socialIdentity);
  const setSocialIdentity = useDAStore((s) => s.setSocialIdentity);
  const fields: { key: keyof typeof identity; label: string; placeholder: string }[] = [
    { key: "displayName", label: "Nom affiché", placeholder: "Agence TEAPS" },
    { key: "instagramHandle", label: "@ Instagram", placeholder: "agence.teaps" },
    { key: "followers", label: "Abonnés", placeholder: "528 abonnés" },
  ];
  return (
    <div className="rounded-xl border border-border bg-background/40 p-5">
      <SectionHeader
        icon={AtSign}
        title="Identité réseaux sociaux"
        description="Nom, @ et abonnés affichés sur les previews. L'avatar est repris d'« Identité agence »."
      />
      <div className="flex flex-col gap-2.5">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">
              {f.label}
            </span>
            <input
              type="text"
              value={identity[f.key]}
              onChange={(e) => setSocialIdentity({ [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full h-9 px-3 bg-card border border-border rounded-md text-[12px] focus:outline-none focus:border-foreground/30 transition-colors"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Monter la section**

Dans le rendu de `SettingsPanel`, après la carte « API Keys » (le `</div>` fermant le bloc `{/* API Keys */}`, vers la ligne 583), insérer :

```tsx
        {/* Identité réseaux sociaux */}
        <SocialIdentitySection />
```

- [ ] **Step 4: Vérifier**

Run: `npm run build` puis `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/SettingsPanel.tsx
git commit -m "feat(preview): réglages identité réseaux sociaux"
```

---

### Task 5: Module preview — utilitaires

**Files:**
- Create: `components/preview/parseCaption.tsx`
- Create: `components/preview/imageSources.ts`

- [ ] **Step 1: `parseCaption.tsx`** (migré de `SocialPreview.tsx`)

```tsx
import React from "react";
import type { SocialPlatform } from "@/types";

/** Style les URLs (bleu, gras sur LinkedIn) et les hashtags d'une caption. */
export function parseCaption(text: string, platform: SocialPlatform): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hashtagRegex = /(#[a-zA-Zà-ÿ0-9_]+)/g;
  const combined = new RegExp(`(${urlRegex.source}|${hashtagRegex.source})`, "g");

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const value = match[0];
    const color = platform === "linkedin" ? "#0a66c2" : "#00376b";
    const fontWeight = platform === "linkedin" ? 600 : 400;
    if (value.startsWith("http")) {
      parts.push(
        <a key={match.index} href={value} target="_blank" rel="noopener noreferrer"
           style={{ color, fontWeight, textDecoration: "none" }}>{value}</a>
      );
    } else {
      parts.push(<span key={match.index} style={{ color, fontWeight }}>{value}</span>);
    }
    lastIndex = match.index + value.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
```

- [ ] **Step 2: `imageSources.ts`** (résolution + listing des sources, données pures, sans JSX)

```ts
import type { PreviewImageRef, ScrapeResult } from "@/types";

export type ImageSourceItem = { ref: PreviewImageRef; label: string; thumb: string };

/** Résout une clé de screenshot vers sa data URL depuis le scrapeResult. */
export function resolveScreenshotKey(key: string, sr: ScrapeResult | null): string | undefined {
  if (!sr) return undefined;
  if (key === "main:desktop") return sr.screenshots.desktop;
  if (key === "main:mobile") return sr.screenshots.mobile;
  const m = key.match(/^page:(\d+):(desktop|mobile)$/);
  if (m) {
    const page = sr.extraPages[Number(m[1])];
    if (!page) return undefined;
    return m[2] === "desktop" ? page.desktop : page.mobile;
  }
  return undefined;
}

/** Screenshots scrapés disponibles comme sources d'image. */
export function listScreenshotSources(sr: ScrapeResult | null): ImageSourceItem[] {
  if (!sr) return [];
  const items: ImageSourceItem[] = [];
  if (sr.screenshots.desktop)
    items.push({ ref: { kind: "screenshot", key: "main:desktop" }, label: "Accueil — desktop", thumb: sr.screenshots.desktop });
  if (sr.screenshots.mobile)
    items.push({ ref: { kind: "screenshot", key: "main:mobile" }, label: "Accueil — mobile", thumb: sr.screenshots.mobile });
  sr.extraPages.forEach((p, i) => {
    const name = p.label || `Page ${i + 1}`;
    if (p.desktop)
      items.push({ ref: { kind: "screenshot", key: `page:${i}:desktop` }, label: `${name} — desktop`, thumb: p.desktop });
    if (p.mobile)
      items.push({ ref: { kind: "screenshot", key: `page:${i}:mobile` }, label: `${name} — mobile`, thumb: p.mobile });
  });
  return items;
}

/** Frames sociales disponibles (labels). Le rendu live est dans PreviewImage. */
export const FRAME_SOURCES: { ref: PreviewImageRef; label: string }[] = [
  { ref: { kind: "frame", frame: "frame4" }, label: "04 / Browser Full" },
  { ref: { kind: "frame", frame: "frame5" }, label: "05 / Hero Simple" },
  { ref: { kind: "frame", frame: "frame6" }, label: "06 / Nouvelle réal." },
  { ref: { kind: "frame", frame: "frame7" }, label: "07 / Trois images" },
  { ref: { kind: "frame", frame: "frame8" }, label: "08 / Card site" },
  { ref: { kind: "frame", frame: "frame9" }, label: "09 / Planche desktop" },
  { ref: { kind: "frame", frame: "frame10" }, label: "10 / Planche mobile" },
];
```

- [ ] **Step 3: Vérifier** — `npm run build` (PASS, fichiers non encore importés).

- [ ] **Step 4: Commit**

```bash
git add components/preview/parseCaption.tsx components/preview/imageSources.ts
git commit -m "feat(preview): utilitaires caption + sources d'image"
```

---

### Task 6: PreviewImage + PreviewCarousel

**Files:**
- Create: `components/preview/PreviewImage.tsx`
- Create: `components/preview/PreviewCarousel.tsx`

- [ ] **Step 1: `PreviewImage.tsx`** (résout upload/screenshot → `<img>`, frame → rendu live « cover »)

```tsx
"use client";

import React from "react";
import type { PreviewImageRef, SocialFrameId } from "@/types";
import { useDAStore } from "@/store/daStore";
import { resolveScreenshotKey } from "./imageSources";
import { Frame4_Social_BrowserFull } from "@/components/frames/Frame4_Social_BrowserFull";
import { Frame5_Social_HeroSimple } from "@/components/frames/Frame5_Social_HeroSimple";
import { Frame6_Social_NouvelleReal } from "@/components/frames/Frame6_Social_NouvelleReal";
import { Frame7_Social_ThreeImg } from "@/components/frames/Frame7_Social_ThreeImg";
import { Frame8_Social_CardSite } from "@/components/frames/Frame8_Social_CardSite";
import { Frame9_Social_BoardDesktop } from "@/components/frames/Frame9_Social_BoardDesktop";
import { Frame10_Social_BoardMobile } from "@/components/frames/Frame10_Social_BoardMobile";

const FRAME_RENDER: Record<SocialFrameId, { w: number; h: number; node: React.ReactNode }> = {
  frame4: { w: 1080, h: 1350, node: <Frame4_Social_BrowserFull /> },
  frame5: { w: 1080, h: 675, node: <Frame5_Social_HeroSimple /> },
  frame6: { w: 1080, h: 1350, node: <Frame6_Social_NouvelleReal /> },
  frame7: { w: 1080, h: 1350, node: <Frame7_Social_ThreeImg /> },
  frame8: { w: 1080, h: 1350, node: <Frame8_Social_CardSite /> },
  frame9: { w: 1080, h: 1350, node: <Frame9_Social_BoardDesktop /> },
  frame10: { w: 1080, h: 1350, node: <Frame10_Social_BoardMobile /> },
};

/** Rend une frame sociale en live, mise à l'échelle « cover » dans son conteneur. */
function FrameImage({ frame }: { frame: SocialFrameId }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: r.width, h: r.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const dim = FRAME_RENDER[frame];
  const scale = box.w && box.h ? Math.max(box.w / dim.w, box.h / dim.h) : 0;
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {scale > 0 && (
        <div style={{ position: "absolute", top: "50%", left: "50%", width: dim.w, height: dim.h, transform: `translate(-50%, -50%) scale(${scale})` }}>
          {dim.node}
        </div>
      )}
    </div>
  );
}

/** Une image de preview, occupant tout son conteneur (position: relative requise sur le parent). */
export function PreviewImage({ refItem }: { refItem: PreviewImageRef }) {
  const scrapeResult = useDAStore((s) => s.scrapeResult);
  if (refItem.kind === "frame") return <FrameImage frame={refItem.frame} />;
  const src = refItem.kind === "upload" ? refItem.dataUrl : resolveScreenshotKey(refItem.key, scrapeResult);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
}
```

- [ ] **Step 2: `PreviewCarousel.tsx`** (slot carré, points + flèches si plusieurs)

```tsx
"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import type { PreviewImageRef } from "@/types";
import { PreviewImage } from "./PreviewImage";

/** Carrousel d'images (slot carré 1/1). Place-holder si vide. */
export function PreviewCarousel({ images }: { images: PreviewImageRef[] }) {
  const [i, setI] = React.useState(0);
  const count = images.length;
  const idx = count ? Math.min(i, count - 1) : 0;

  if (count === 0) {
    return (
      <div style={{ aspectRatio: "1 / 1", background: "#efefef" }} className="flex items-center justify-center">
        <span className="flex items-center gap-2 text-[13px]" style={{ color: "#8e8e8e" }}>
          <ImageIcon className="w-4 h-4" /> Ajoute une image
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", aspectRatio: "1 / 1", background: "#efefef", overflow: "hidden" }}>
      <PreviewImage refItem={images[idx]} />
      {count > 1 && (
        <>
          <button
            onClick={() => setI((p) => (p - 1 + count) % count)}
            aria-label="Précédent"
            style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}
            className="w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setI((p) => (p + 1) % count)}
            aria-label="Suivant"
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}
            className="w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0 }} className="flex items-center justify-center gap-1">
            {images.map((_, k) => (
              <span key={k} className="rounded-full" style={{ width: 6, height: 6, background: k === idx ? "#0095f6" : "#ffffffaa" }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Vérifier** — `npm run build` puis `npm run lint` → PASS.

- [ ] **Step 4: Commit**

```bash
git add components/preview/PreviewImage.tsx components/preview/PreviewCarousel.tsx
git commit -m "feat(preview): image (frame live cover) + carrousel"
```

---

### Task 7: Vues plateforme (Instagram / LinkedIn)

Migration de la logique de `components/ui/SocialPreview.tsx` (lue intégralement avant de coder), en remplaçant l'image par `<PreviewCarousel>` et l'identité codée en dur par des props.

**Files:**
- Create: `components/preview/InstagramPostView.tsx`
- Create: `components/preview/LinkedInPostView.tsx`

- [ ] **Step 1: `InstagramPostView.tsx`**

Reprendre exactement le markup de `InstagramPreview` (header, actions, caption, date) de `SocialPreview.tsx`, avec ces changements :
- props `{ caption: string; hashtags: string[]; images: PreviewImageRef[]; avatar?: string; handle: string }` ;
- l'avatar utilise `avatar` (filtre `brightness(0) invert(1)` conservé) ;
- le `<span>` du handle affiche `{handle}` au lieu de `agence.teaps` (2 occurrences : header + caption) ;
- le bloc image (`<div … aspect-ratio:1/1 …>` + dots manuels) est remplacé par `<PreviewCarousel images={images} />` ;
- caption via `parseCaption(caption, "instagram")` ; hashtags inchangés.

```tsx
"use client";

import React from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import type { PreviewImageRef } from "@/types";
import { parseCaption } from "./parseCaption";
import { PreviewCarousel } from "./PreviewCarousel";

type Props = { caption: string; hashtags: string[]; images: PreviewImageRef[]; avatar?: string; handle: string };

export function InstagramPostView({ caption, hashtags, images, avatar, handle }: Props) {
  return (
    <div className="overflow-hidden" style={{ fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', background: "#ffffff", border: "1px solid #dbdbdb", borderRadius: 8, maxWidth: 470, width: "100%" }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "#000000" }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-5 h-5 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          ) : (
            <span className="text-[8px] font-black tracking-tight" style={{ color: "#fff" }}>TEAPS</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold" style={{ color: "#262626" }}>{handle}</p>
        </div>
        <MoreHorizontal className="w-6 h-6 shrink-0" style={{ color: "#262626" }} />
      </div>

      {/* Image(s) */}
      <PreviewCarousel images={images} />

      {/* Actions */}
      <div className="flex items-center px-3 pt-2 pb-1">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-1.5"><Heart className="w-6 h-6" style={{ color: "#262626" }} /><span className="text-[14px] font-semibold" style={{ color: "#262626" }}>29</span></div>
          <MessageCircle className="w-6 h-6" style={{ color: "#262626" }} />
          <Send className="w-6 h-6" style={{ color: "#262626" }} />
        </div>
        <span className="flex-1" />
        <Bookmark className="w-6 h-6" style={{ color: "#262626" }} />
      </div>

      {/* Caption */}
      <div className="px-3 pt-2 pb-2">
        <p className="text-[14px] leading-[1.5] whitespace-pre-wrap break-words" style={{ color: "#262626" }}>
          <span className="font-semibold">{handle} </span>
          {parseCaption(caption, "instagram")}
        </p>
        {hashtags.length > 0 && (
          <p className="text-[14px] mt-1.5 leading-[1.5]">
            {hashtags.map((h, i) => (
              <React.Fragment key={h}>{i > 0 && " "}<span style={{ color: "#00376b" }}>#{h.replace(/^#/, "")}</span></React.Fragment>
            ))}
          </p>
        )}
      </div>

      {/* Date */}
      <div className="px-3 pb-3">
        <p className="text-[11px] uppercase tracking-wide" style={{ color: "#8e8e8e" }}>Il y a 2 heures</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `LinkedInPostView.tsx`**

Reprendre le markup de `LinkedInPreview` de `SocialPreview.tsx`, avec : props `{ caption; hashtags; images; avatar?; displayName; followers }`, identité depuis props, image remplacée par `<PreviewCarousel>`.

```tsx
"use client";

import React from "react";
import { MessageCircle, Send, MoreHorizontal, ThumbsUp, Repeat2, Globe } from "lucide-react";
import type { PreviewImageRef } from "@/types";
import { parseCaption } from "./parseCaption";
import { PreviewCarousel } from "./PreviewCarousel";

type Props = { caption: string; hashtags: string[]; images: PreviewImageRef[]; avatar?: string; displayName: string; followers: string };

export function LinkedInPostView({ caption, hashtags, images, avatar, displayName, followers }: Props) {
  const hashtagsStr = hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ");
  const fullText = hashtagsStr ? caption + "\n\n" + hashtagsStr : caption;
  return (
    <div className="rounded-lg overflow-hidden" style={{ fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', background: "#ffffff", border: "1px solid #e0dfdc", maxWidth: 555, width: "100%" }}>
      {/* Header */}
      <div className="flex items-start gap-2 px-4 pt-3 pb-2">
        <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "#000000" }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-7 h-7 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          ) : (
            <span className="text-[11px] font-black tracking-tight" style={{ color: "#fff" }}>TEAPS</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-tight" style={{ color: "#000000e6" }}>{displayName}</p>
          <p className="text-[12px] leading-tight mt-0.5" style={{ color: "#00000099" }}>{followers}</p>
          <p className="text-[12px] leading-tight mt-0.5 flex items-center gap-1" style={{ color: "#00000099" }}>Maintenant · <Globe className="w-3 h-3" /></p>
        </div>
        <MoreHorizontal className="w-6 h-6 mt-1" style={{ color: "#00000099" }} />
      </div>

      {/* Text */}
      <div className="px-4 pb-3">
        <p className="text-[14px] leading-[1.43] whitespace-pre-wrap break-words" style={{ color: "#000000e6" }}>
          {parseCaption(fullText, "linkedin")}
        </p>
      </div>

      {/* Image(s) */}
      <PreviewCarousel images={images} />

      {/* Reactions */}
      <div className="flex items-center gap-1.5 px-4 py-2" style={{ borderBottom: "1px solid #e0dfdc" }}>
        <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center" style={{ background: "#378fe9", color: "#fff", border: "1.5px solid #fff" }}><ThumbsUp className="w-2.5 h-2.5" /></span>
        <span className="text-[12px]" style={{ color: "#00000099" }}>21</span>
        <span className="flex-1" />
        <span className="text-[12px]" style={{ color: "#00000099" }}>2 commentaires</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-around px-2 py-0.5">
        {[{ icon: <ThumbsUp className="w-5 h-5" />, label: "J'aime" }, { icon: <MessageCircle className="w-5 h-5" />, label: "Commenter" }, { icon: <Repeat2 className="w-5 h-5" />, label: "Republier" }, { icon: <Send className="w-5 h-5" />, label: "Envoyer" }].map((a) => (
          <button key={a.label} className="flex items-center gap-1.5 px-3 py-2.5 rounded-md" style={{ color: "#00000099" }}>{a.icon}<span className="text-[12px] font-semibold">{a.label}</span></button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Vérifier** — `npm run build` puis `npm run lint` → PASS.

- [ ] **Step 4: Commit**

```bash
git add components/preview/InstagramPostView.tsx components/preview/LinkedInPostView.tsx
git commit -m "feat(preview): vues post Instagram + LinkedIn"
```

---

### Task 8: DeviceFrame

**Files:**
- Create: `components/preview/DeviceFrame.tsx`

- [ ] **Step 1: `DeviceFrame.tsx`** (chrome appareil + scale à hauteur dynamique via ResizeObserver)

```tsx
"use client";

import React from "react";

export type DeviceKind = "mobile" | "tablet" | "desktop";

const NATIVE: Record<DeviceKind, number> = { mobile: 390, tablet: 834, desktop: 1280 };
const LABEL: Record<DeviceKind, string> = { mobile: "Mobile", tablet: "Tablette", desktop: "Desktop" };

/**
 * Cadre d'appareil. Rend ses enfants à la largeur native de l'appareil puis
 * applique `transform: scale(displayWidth / native)`. La hauteur réelle est
 * mesurée (ResizeObserver) et réservée à l'échelle pour ne pas casser le flux.
 */
export function DeviceFrame({ device, displayWidth, children }: { device: DeviceKind; displayWidth: number; children: React.ReactNode }) {
  const native = NATIVE[device];
  const scale = displayWidth / native;
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [h, setH] = React.useState(0);
  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setH(el.offsetHeight));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const radius = device === "mobile" ? 38 : device === "tablet" ? 22 : 10;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">{LABEL[device]}</span>
      <div style={{ width: displayWidth, height: h * scale }}>
        <div ref={innerRef} style={{ width: native, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <div style={{ border: "1px solid var(--border)", borderRadius: radius, overflow: "hidden", background: device === "desktop" ? "#fafafa" : "#000", padding: device === "mobile" ? 8 : device === "tablet" ? 10 : 0 }}>
            {device === "desktop" && (
              <div style={{ height: 34, background: "#ececec", display: "flex", alignItems: "center", gap: 6, padding: "0 12px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
              </div>
            )}
            <div style={{ background: device === "desktop" ? "#fafafa" : "#fff", borderRadius: device === "mobile" ? 30 : device === "tablet" ? 14 : 0, overflow: "hidden", display: "flex", justifyContent: "center", padding: device === "mobile" ? 0 : "24px 16px" }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { NATIVE as DEVICE_NATIVE_WIDTH };
```

- [ ] **Step 2: Vérifier** — `npm run build` puis `npm run lint` → PASS.

- [ ] **Step 3: Commit**

```bash
git add components/preview/DeviceFrame.tsx
git commit -m "feat(preview): cadre d'appareil (mobile/tablette/desktop)"
```

---

### Task 9: PreviewStage (zone principale)

**Files:**
- Create: `components/preview/PreviewStage.tsx`

- [ ] **Step 1: `PreviewStage.tsx`**

```tsx
"use client";

import React from "react";
import { Instagram, Linkedin } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import type { SocialPlatform } from "@/types";
import { DeviceFrame, DEVICE_NATIVE_WIDTH, type DeviceKind } from "./DeviceFrame";
import { InstagramPostView } from "./InstagramPostView";
import { LinkedInPostView } from "./LinkedInPostView";

const DEVICES: DeviceKind[] = ["mobile", "tablet", "desktop"];

export function PreviewStage() {
  const [platform, setPlatform] = React.useState<SocialPlatform>("instagram");
  const caption = useDAStore((s) => s.previewCaption);
  const hashtags = useDAStore((s) => s.previewHashtags);
  const images = useDAStore((s) => s.previewImages);
  const identity = useDAStore((s) => s.socialIdentity);
  const avatar = useDAStore((s) => s.agencyLogo);

  // Échelle commune : le desktop (1280) tient dans la colonne, plafonnée à 0.62
  // pour éviter des cartes géantes sur grand écran. Les 3 appareils partagent
  // ce facteur → tailles relatives réalistes.
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scaleBase, setScaleBase] = React.useState(0.5);
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScaleBase(Math.min(0.62, el.offsetWidth / DEVICE_NATIVE_WIDTH.desktop));
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const card = (
    platform === "instagram" ? (
      <InstagramPostView caption={caption} hashtags={hashtags} images={images} avatar={avatar} handle={identity.instagramHandle} />
    ) : (
      <LinkedInPostView caption={caption} hashtags={hashtags} images={images} avatar={avatar} displayName={identity.displayName} followers={identity.followers} />
    )
  );

  const toggle = (p: SocialPlatform, Icon: typeof Instagram, label: string) => (
    <button
      onClick={() => setPlatform(p)}
      className={`px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${platform === p ? "bg-card text-foreground shadow-sm" : "text-foreground/40 hover:text-foreground/60"}`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  return (
    <div className="p-12 lg:p-20">
      <div className="max-w-3xl mx-auto mb-12">
        <div className="flex bg-foreground/[0.04] rounded-lg p-0.5 gap-0.5 w-fit">
          {toggle("instagram", Instagram, "Instagram")}
          {toggle("linkedin", Linkedin, "LinkedIn")}
        </div>
      </div>
      <div ref={containerRef} className="max-w-3xl mx-auto flex flex-col items-center gap-16">
        {DEVICES.map((d) => (
          <DeviceFrame key={d} device={d} displayWidth={DEVICE_NATIVE_WIDTH[d] * scaleBase}>
            {card}
          </DeviceFrame>
        ))}
      </div>
    </div>
  );
}
```

Note : `card` est un élément React réutilisé dans 3 `DeviceFrame`. React le re-monte par position (clé du `DeviceFrame`), donc chaque appareil a sa propre instance — OK. Si un warning de réutilisation d'élément apparaît, remplacer `children={card}` par une fonction `() => card` appelée dans chaque frame.

- [ ] **Step 2: Vérifier** — `npm run build` puis `npm run lint` → PASS.

- [ ] **Step 3: Commit**

```bash
git add components/preview/PreviewStage.tsx
git commit -m "feat(preview): scène 3 appareils + toggle plateforme"
```

---

### Task 10: PreviewSidebar (éditeur)

**Files:**
- Create: `components/preview/PreviewSidebar.tsx`

- [ ] **Step 1: `PreviewSidebar.tsx`**

```tsx
"use client";

import React from "react";
import { Sparkles, Plus, X, ImageUp, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useDAStore } from "@/store/daStore";
import type { PreviewImageRef } from "@/types";
import { listScreenshotSources, FRAME_SOURCES } from "./imageSources";

export function PreviewSidebar() {
  const caption = useDAStore((s) => s.previewCaption);
  const setCaption = useDAStore((s) => s.setPreviewCaption);
  const hashtags = useDAStore((s) => s.previewHashtags);
  const setHashtags = useDAStore((s) => s.setPreviewHashtags);
  const images = useDAStore((s) => s.previewImages);
  const setImages = useDAStore((s) => s.setPreviewImages);
  const generatedContent = useDAStore((s) => s.generatedContent);
  const scrapeResult = useDAStore((s) => s.scrapeResult);

  const fileRef = React.useRef<HTMLInputElement>(null);
  const [hashtagInput, setHashtagInput] = React.useState("");

  const importGenerated = () => {
    if (!generatedContent) return;
    setCaption(generatedContent.socialPost.caption ?? "");
    setHashtags((generatedContent.socialPost.hashtags ?? []).map((h) => h.replace(/^#/, "")));
    toast.success("Post importé");
  };

  const addImage = (ref: PreviewImageRef) => setImages([...images, ref]);
  const removeImage = (i: number) => setImages(images.filter((_, k) => k !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    setImages(next);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onloadend = () => addImage({ kind: "upload", dataUrl: reader.result as string });
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const addHashtag = () => {
    const v = hashtagInput.trim().replace(/^#/, "");
    if (v) setHashtags([...hashtags, v]);
    setHashtagInput("");
  };

  const screenshotSources = listScreenshotSources(scrapeResult);

  return (
    <div className="p-4 flex flex-col gap-5">
      {/* Importer */}
      <button
        onClick={importGenerated}
        disabled={!generatedContent}
        className="w-full h-9 flex items-center justify-center gap-2 text-[11px] font-semibold border border-border rounded-lg text-foreground/60 hover:text-foreground hover:border-foreground/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
      >
        <Sparkles className="w-3.5 h-3.5" /> Importer le post généré
      </button>

      {/* Caption */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Caption</span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={6}
          placeholder="Texte du post…"
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-[12px] leading-relaxed resize-y focus:outline-none focus:border-foreground/30 transition-colors"
        />
      </label>

      {/* Hashtags */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Hashtags</span>
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((h, i) => (
            <span key={`${h}-${i}`} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-foreground/[0.06] rounded-full text-foreground/60">
              #{h}
              <button onClick={() => setHashtags(hashtags.filter((_, k) => k !== i))} className="cursor-pointer hover:text-foreground"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHashtag(); } }}
            placeholder="ajouter…"
            className="flex-1 h-8 px-2.5 bg-card border border-border rounded-md text-[11px] focus:outline-none focus:border-foreground/30"
          />
          <button onClick={addHashtag} className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-foreground/50 hover:text-foreground cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Images sélectionnées */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Carrousel ({images.length})</span>
        {images.map((img, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-foreground/[0.03] border border-border rounded-md">
            <GripVertical className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
            <span className="flex-1 text-[11px] text-foreground/60 truncate">
              {img.kind === "upload" ? "Image importée" : img.kind === "frame" ? `Frame ${img.frame.replace("frame", "")}` : img.key}
            </span>
            <button onClick={() => move(i, -1)} disabled={i === 0} className="text-foreground/40 hover:text-foreground disabled:opacity-20 cursor-pointer text-xs">↑</button>
            <button onClick={() => move(i, 1)} disabled={i === images.length - 1} className="text-foreground/40 hover:text-foreground disabled:opacity-20 cursor-pointer text-xs">↓</button>
            <button onClick={() => removeImage(i)} className="text-red-500/60 hover:text-red-500 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>

      {/* Sources */}
      <div className="flex flex-col gap-2">
        <button onClick={() => fileRef.current?.click()} className="w-full h-9 flex items-center justify-center gap-2 text-[11px] font-semibold border border-border rounded-lg text-foreground/60 hover:text-foreground hover:border-foreground/20 cursor-pointer transition-all">
          <ImageUp className="w-3.5 h-3.5" /> Upload / coller
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFile} />

        {screenshotSources.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 mt-1">Screenshots</span>
            {screenshotSources.map((s) => (
              <button key={s.ref.kind === "screenshot" ? s.ref.key : s.label} onClick={() => addImage(s.ref)} className="text-left text-[11px] px-2 py-1.5 rounded-md text-foreground/60 hover:bg-foreground/[0.05] cursor-pointer">+ {s.label}</button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 mt-1">Frames sociales</span>
          {FRAME_SOURCES.map((s) => (
            <button key={s.ref.kind === "frame" ? s.ref.frame : s.label} onClick={() => addImage(s.ref)} className="text-left text-[11px] px-2 py-1.5 rounded-md text-foreground/60 hover:bg-foreground/[0.05] cursor-pointer">+ {s.label}</button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-foreground/30 leading-relaxed">Identité du compte (nom, @, abonnés, avatar) → Paramètres.</p>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier** — `npm run build` puis `npm run lint` → PASS.

- [ ] **Step 3: Commit**

```bash
git add components/preview/PreviewSidebar.tsx
git commit -m "feat(preview): sidebar éditeur (caption, hashtags, carrousel, sources)"
```

---

### Task 11: Câblage dans `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Imports**

Ajouter aux imports de composants :

```tsx
import { PreviewStage } from "@/components/preview/PreviewStage";
import { PreviewSidebar } from "@/components/preview/PreviewSidebar";
```

Ajouter `MonitorSmartphone` à l'import lucide-react.

- [ ] **Step 2: Étendre l'union `sidebarTab`**

Ligne ~114 :

```tsx
  const [sidebarTab, setSidebarTab] = React.useState<"visuels" | "contenu" | "preview" | "settings" | "historique">("visuels");
```

- [ ] **Step 3: Bouton de nav**

Après le bloc `<div className="relative group">` du bouton « Contenu » (qui se termine avant le bouton « Nouveau projet », vers la ligne 351), insérer un bloc identique pour Preview :

```tsx
            <div className="relative group">
              <button
                onClick={() => setSidebarTab("preview")}
                aria-label="Preview"
                aria-current={sidebarTab === "preview"}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  sidebarTab === "preview"
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5"
                }`}
              >
                <MonitorSmartphone className="w-[18px] h-[18px]" />
              </button>
              <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-semibold bg-foreground text-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Preview
              </span>
            </div>
```

- [ ] **Step 4: Sidebar — panneau Preview**

Dans la `<aside>`, après le bloc `{sidebarTab === "contenu" && ( … )}` (ferme vers la ligne 796), ajouter :

```tsx
              {sidebarTab === "preview" && <PreviewSidebar />}
```

- [ ] **Step 5: Zone principale — scène Preview**

Dans `<main className="flex-1 …">`, après le bloc `{sidebarTab === "contenu" && ( … )}` (ferme vers la ligne 920), ajouter :

```tsx
            {sidebarTab === "preview" && <PreviewStage />}
```

- [ ] **Step 6: Passer `onOpenPreview` à ContentChat**

Dans le `<ContentChat … />`, ajouter la prop :

```tsx
                  onOpenPreview={() => setSidebarTab("preview")}
```

(La prop est consommée à la Task 12.)

- [ ] **Step 7: Vérifier**

Run: `npm run build`
Expected: échoue dans `ContentChat` (prop `onOpenPreview` inconnue) → corrigé Task 12. Sinon, faire Task 11 + 12 puis builder.

---

### Task 12: Nettoyage ContentChat + suppression SocialPreview

**Files:**
- Modify: `components/ContentChat.tsx`
- Delete: `components/ui/SocialPreview.tsx`

- [ ] **Step 1: Retirer la preview inline de `ContentChat`**

- Ajouter `onOpenPreview: () => void;` au type `Props` et le déstructurer dans la signature.
- Supprimer les imports `SocialPreview`, `Frame4_…`, `Frame5_…`, `Frame6_…`, `Frame7_…`, et `Eye` (lucide) s'il n'est plus utilisé. Ajouter `MonitorSmartphone` à l'import lucide.
- Supprimer les états `previewPlatform` et `previewAsset` (lignes ~49-50).
- Supprimer le composant local `AssetPreviewImage` (lignes ~430-483).
- Dans le bloc « Right: Réseaux sociaux », **remplacer** tout le contenu entre le `<div className="flex flex-col gap-4">` (le toggle Texte/LinkedIn/Instagram + le rendu conditionnel Texte/Preview, lignes ~146-229) par l'affichage texte simple + un bouton vers l'onglet Preview :

```tsx
              <div className="flex flex-col gap-4">
                {content.socialPost && (
                  <div className="bg-foreground/[0.03] rounded-xl p-4 border border-border">
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-medium">
                      {content.socialPost.caption ?? ""}
                    </p>
                    {(content.socialPost.hashtags?.length ?? 0) > 0 && (
                      <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
                        {(content.socialPost.hashtags ?? []).map((h) => (
                          <span key={h} className="text-[11px] font-semibold text-foreground/40">#{h.replace(/^#/, "")}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {content.socialPost?.caption && (
                  <button
                    onClick={onOpenPreview}
                    className="w-full h-9 flex items-center justify-center gap-2 text-[11px] font-semibold border border-border rounded-xl text-foreground/60 hover:text-foreground hover:border-foreground/20 transition-all cursor-pointer"
                  >
                    <MonitorSmartphone className="w-3.5 h-3.5" /> Prévisualiser dans l'onglet Preview
                  </button>
                )}
```

Conserver tel quel, juste après, les `<PublishButtons>` et le `<CopyButton>` existants, puis fermer le `</div>` et `</ResultSection>` comme avant.

- [ ] **Step 2: Supprimer `SocialPreview.tsx`**

```bash
git rm components/ui/SocialPreview.tsx
```

- [ ] **Step 3: Vérifier**

Run: `npm run build`
Expected: PASS (plus aucun import de `SocialPreview`/`AssetPreviewImage`/frames non utilisés ; `onOpenPreview` fourni par `page.tsx`).
Run: `npm run lint`
Expected: PASS (vérifier qu'aucun import n'est devenu inutilisé — sinon les retirer).

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx components/ContentChat.tsx
git commit -m "feat(preview): onglet branché + nettoyage preview inline de Contenu"
```

---

### Task 13: Vérification finale

- [ ] **Step 1: Build + lint complets**

Run: `npm run build && npm run lint`
Expected: PASS sur les deux.

- [ ] **Step 2: Test manuel** (`npm run dev`)

1. Scraper un site → l'onglet **Preview** (icône `MonitorSmartphone`) apparaît dans le rail.
2. Sidebar : saisir une caption + hashtags ; ajouter des images (upload, un screenshot, une frame 04–10) → carrousel.
3. Scène : les 3 appareils (mobile/tablette/desktop) rendent le post ; toggle Instagram ↔ LinkedIn ; flèches/points du carrousel.
4. Générer du contenu (onglet Contenu) → bouton « Importer le post généré » remplit caption + hashtags.
5. Onglet Contenu : le bouton « Prévisualiser dans l'onglet Preview » bascule sur Preview.
6. F5 → caption/hashtags/images persistés (IndexedDB).
7. « Nouveau projet » → champs preview vidés.
8. Paramètres → « Identité réseaux sociaux » : modifier nom/@/abonnés → reflété sur les cartes ; avatar = logo d'Identité agence.

- [ ] **Step 3: (optionnel) merge**

Selon préférence : PR `feat/preview-reseaux-sociaux` → `main`, ou laisser la branche pour relecture.

---

## Self-Review (couverture du spec)

- Types (`PreviewImageRef`, `SocialIdentity`, `SocialFrameId`, `SocialPlatform`) → Task 1. ✓
- Store (init, loadProjectData, setScrapeResult, resetProject, partialize) → Task 2. ✓
- Persistance par projet (`pickSnapshot`) → Task 3. ✓
- Settings identité sociale → Task 4. ✓
- `parseCaption` + `imageSources` → Task 5. ✓
- `PreviewImage` (frame live cover) + `PreviewCarousel` → Task 6. ✓
- Vues IG/LinkedIn (identité par props, carrousel) → Task 7. ✓
- `DeviceFrame` (3 appareils, scale dynamique) → Task 8. ✓
- `PreviewStage` (toggle plateforme, colonne) → Task 9. ✓
- `PreviewSidebar` (import généré, caption, hashtags, carrousel, sources) → Task 10. ✓
- Onglet + nav + rendus + `onOpenPreview` → Task 11. ✓
- Nettoyage `ContentChat` + suppression `SocialPreview` → Task 12. ✓
- Build/lint/manuel → Task 13. ✓
- Cohérence des signatures : `PreviewImage({ refItem })`, `PreviewCarousel({ images })`, `DeviceFrame({ device, displayWidth, children })`, `DEVICE_NATIVE_WIDTH`, `setSocialIdentity(Partial<…>)`, `setPreviewImages(PreviewImageRef[])` — utilisés de façon identique entre tâches. ✓
- Avatar = `agencyLogo` (pas de champ avatar dans `SocialIdentity`) — cohérent Task 7/9/4. ✓
