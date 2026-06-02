"use client";

import React from "react";
import { Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";
import { useDAStore } from "@/store/daStore";
import type { PreviewImageRef } from "@/types";
import { listScreenshotSources, FRAME_SOURCES, type ImageSourceItem } from "./imageSources";
import { PreviewImage } from "./PreviewImage";

/**
 * Vignette cliquable d'un asset disponible (capture ou visuel social).
 * `div role=button` (et non `<button>`) : les frames rendues en live contiennent
 * leurs propres `<button>` (EditableImage), interdits dans un bouton.
 */
function AssetThumb({ refItem, label, thumb, onAdd }: { refItem: PreviewImageRef; label: string; thumb?: string; onAdd: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onAdd}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAdd(); } }}
      title={`Ajouter — ${label}`}
      className="group flex flex-col gap-1 cursor-pointer"
    >
      <div className="relative w-full aspect-square rounded-md overflow-hidden border border-border bg-foreground/[0.03] group-hover:border-foreground/40 transition-colors">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <PreviewImage refItem={refItem} fit="cover" />
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
          <Plus className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </span>
      </div>
      <span className="text-[9px] text-foreground/50 truncate text-center leading-tight">{label}</span>
    </div>
  );
}

export function PreviewSidebar() {
  const caption = useDAStore((s) => s.previewCaption);
  const setCaption = useDAStore((s) => s.setPreviewCaption);
  const setImages = useDAStore((s) => s.setPreviewImages);
  const generatedContent = useDAStore((s) => s.generatedContent);
  const scrapeResult = useDAStore((s) => s.scrapeResult);

  const importGenerated = () => {
    if (!generatedContent) return;
    const { caption: c, hashtags } = generatedContent.socialPost;
    const tags = (hashtags ?? []).map((h) => `#${h.replace(/^#/, "")}`).join(" ");
    setCaption([c ?? "", tags].filter(Boolean).join("\n\n"));
    toast.success("Post importé");
  };

  // getState() : protège des closures périmées sur clics rapprochés.
  const addImage = (ref: PreviewImageRef) => setImages([...useDAStore.getState().previewImages, ref]);

  const screenshotSources: ImageSourceItem[] = listScreenshotSources(scrapeResult);

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

      {/* Légende */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Légende</span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={7}
          placeholder="Texte du post (hashtags inclus)…"
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-[12px] leading-relaxed resize-y focus:outline-none focus:border-foreground/30 transition-colors"
        />
      </label>

      {/* Assets — captures du site */}
      {screenshotSources.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Captures du site</span>
          <div className="grid grid-cols-3 gap-2">
            {screenshotSources.map((s) => (
              <AssetThumb
                key={s.ref.kind === "screenshot" ? s.ref.key : s.label}
                refItem={s.ref}
                label={s.label}
                thumb={s.thumb}
                onAdd={() => addImage(s.ref)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Assets — visuels sociaux */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Visuels sociaux</span>
        <div className="grid grid-cols-3 gap-2">
          {FRAME_SOURCES.map((s) => (
            <AssetThumb
              key={s.ref.kind === "frame" ? s.ref.frame : s.label}
              refItem={s.ref}
              label={s.label}
              onAdd={() => addImage(s.ref)}
            />
          ))}
        </div>
      </div>

      <p className="text-[10px] text-foreground/30 leading-relaxed">
        Clique sur un asset pour l&apos;ajouter au carrousel. L&apos;ordre se règle dans la barre du bas.
      </p>
    </div>
  );
}
