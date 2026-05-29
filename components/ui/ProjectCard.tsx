"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Globe, Image as ImageIcon, Check } from "lucide-react";
import type { ProjectMeta } from "@/types";
import { loadProject, saveThumbnail } from "@/lib/projectStorage";
import { makeThumbnail } from "@/lib/thumbnail";
import { formatWhen } from "@/lib/format";

/**
 * Favicon du site, via le service Google s2/favicons (cache CDN, pas d'auth, pas
 * de quota). Fallback sur l'icône Globe si le chargement échoue (site offline,
 * domaine bizarre, bloqué par adblock…). `className` pilote la taille.
 */
export function ProjectFavicon({
  domain,
  className = "w-3.5 h-3.5",
}: {
  domain: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!domain || failed) {
    return <Globe className={`${className} shrink-0 text-foreground/30`} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      className={`${className} shrink-0 object-contain`}
      onError={() => setFailed(true)}
    />
  );
}

// Dédoublonne la génération de vignette : si deux cartes du même projet
// demandent la vignette en même temps, on ne charge/encode qu'une fois.
const inflight = new Map<string, Promise<string | null>>();

function generateThumbnail(id: string): Promise<string | null> {
  const existing = inflight.get(id);
  if (existing) return existing;
  const p = (async () => {
    const project = await loadProject(id);
    const src = project?.scrapeResult?.screenshots?.desktop;
    if (!src) return null;
    const thumb = await makeThumbnail(src, 640);
    if (thumb) await saveThumbnail(id, thumb);
    return thumb;
  })().catch(() => null);
  inflight.set(id, p);
  return p;
}

type ProjectCardProps = {
  meta: ProjectMeta;
  isActive?: boolean;
  onOpen: () => void;
  /** Active la case à cocher de sélection (page Historique). */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
};

export function ProjectCard({
  meta,
  isActive,
  onOpen,
  selectable,
  selected,
  onToggleSelect,
}: ProjectCardProps) {
  // `generated` ne contient que la vignette produite à la volée ; la vignette
  // déjà en cache (`meta.thumbnail`) prime et reste dérivée des props — pas de
  // setState synchrone pour la recopier.
  const [generated, setGenerated] = useState<string | null>(null);
  const thumb = meta.thumbnail ?? generated;
  const rootRef = useRef<HTMLDivElement>(null);
  const triedRef = useRef(false);

  // Vignette absente du cache → on la génère à la demande quand la carte
  // approche du viewport (IntersectionObserver), puis on la met en cache dans
  // le META (cf. generateThumbnail).
  useEffect(() => {
    if (meta.thumbnail || triedRef.current) return;
    const el = rootRef.current;
    const run = () => {
      if (triedRef.current) return;
      triedRef.current = true;
      generateThumbnail(meta.id).then((t) => {
        if (t) setGenerated(t);
      });
    };
    if (!el || typeof IntersectionObserver === "undefined") {
      run();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [meta.id, meta.thumbnail]);

  const when = formatWhen(meta.lastOpenedAt ?? meta.savedAt);

  return (
    <div ref={rootRef} className="relative group">
      <button
        onClick={onOpen}
        className={`w-full text-left rounded-2xl border p-2.5 transition-all cursor-pointer ${
          isActive
            ? "border-foreground/40 bg-foreground/[0.04]"
            : selected
              ? "border-foreground/30 bg-foreground/[0.03]"
              : "border-border bg-card hover:border-foreground/20 hover:bg-foreground/[0.02]"
        }`}
      >
        {/* Hero — petit écran du site */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-foreground/[0.04] border border-border">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="w-full h-full object-cover object-top" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-foreground/15">
              <ImageIcon className="w-8 h-8" strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Pied : favicon + nom + dernière ouverture, flèche à droite */}
        <div className="flex items-center justify-between gap-2 px-1.5 pt-2.5 pb-0.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <ProjectFavicon domain={meta.domain} className="w-5 h-5" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold text-foreground truncate">
                  {meta.title || meta.domain || "Projet"}
                </span>
                {isActive && (
                  <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-foreground/10 text-foreground/50">
                    Ouvert
                  </span>
                )}
              </div>
              <span className="block text-[10px] font-medium text-foreground/35 truncate">
                Ouvert {when}
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </button>

      {/* Case de sélection (Historique) — superpose la carte, n'ouvre jamais. */}
      {selectable && (
        <button
          type="button"
          aria-label={selected ? "Désélectionner le projet" : "Sélectionner le projet"}
          aria-pressed={selected}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          className={`absolute top-3.5 left-3.5 z-10 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
            selected
              ? "bg-foreground border-foreground text-background opacity-100"
              : "bg-card/80 backdrop-blur-sm border-border text-transparent opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          }`}
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
