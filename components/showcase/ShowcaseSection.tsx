"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, FolderDown, LayoutTemplate } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { FrameShowcase } from "@/components/frames/FrameShowcase";
import { ShowcaseSlideEditor } from "./ShowcaseSlideEditor";
import { exportShowcaseSlidesPack, showcaseSlideExportId, defaultShowcaseName } from "@/lib/exportFrames";

/**
 * Carrousel « Showcase » (onglet Visuels) : liste de slides 16:9 (mockups sur
 * fond mesh gradient tiré de la charte), pour un carrousel de cas clients.
 * Chaque slide s'exporte en PNG plat ; « Exporter le carrousel » zippe tout.
 */
export function ShowcaseSection() {
  const slides = useDAStore((s) => s.showcaseSlides);
  const addSlide = useDAStore((s) => s.addShowcaseSlide);
  const scrapeResult = useDAStore((s) => s.scrapeResult);
  const exportScale = useDAStore((s) => s.exportScale);
  const [exporting, setExporting] = useState(false);

  const handleExportPack = async () => {
    if (!slides.length || !scrapeResult) return;
    setExporting(true);
    try {
      await exportShowcaseSlidesPack(scrapeResult.domain, slides, exportScale);
      toast.success("Carrousel téléchargé !");
    } catch {
      toast.error("Erreur lors de l'export du carrousel");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      {/* Barre d'actions */}
      <div className="flex items-center justify-between gap-3 mb-8 flex-wrap">
        <p className="text-[12.5px] text-foreground/50 leading-relaxed max-w-lg">
          Visuels 16:9 pour un carrousel de cas clients — mockups sur fond dégradé
          multi-points tiré de la charte du site. Points déplaçables, export PNG plat.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={addSlide}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-all active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter une slide
          </button>
          <button
            onClick={handleExportPack}
            disabled={exporting || slides.length === 0}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer disabled:opacity-30 transition-all hover:opacity-70 active:scale-[0.97]"
          >
            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderDown className="w-3 h-3" />}
            <span>{exporting ? "Export..." : "Exporter le carrousel"}</span>
          </button>
        </div>
      </div>

      {/* Liste / état vide */}
      {slides.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-20 flex flex-col items-center gap-3 text-foreground/40">
          <LayoutTemplate className="w-7 h-7" />
          <span className="text-[12.5px]">Aucune slide.</span>
          <button
            onClick={addSlide}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Créer une première slide
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {slides.map((slide, i) => (
            <ShowcaseSlideEditor key={slide.id} slide={slide} defaultName={defaultShowcaseName(i)} />
          ))}
        </div>
      )}

      {/* Instances offscreen pour l'export (taille native) */}
      <div className="frames-offscreen">
        {slides.map((slide) => (
          <FrameShowcase key={slide.id} slide={slide} id={showcaseSlideExportId(slide.id)} />
        ))}
      </div>
    </div>
  );
}
