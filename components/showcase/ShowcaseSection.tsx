"use client";

import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, FolderDown, LayoutTemplate, RotateCcw } from "lucide-react";
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
  const resetSlides = useDAStore((s) => s.resetShowcaseSlides);
  const setSlides = useDAStore((s) => s.setShowcaseSlides);
  const scrapeResult = useDAStore((s) => s.scrapeResult);
  const exportScale = useDAStore((s) => s.exportScale);
  const [exporting, setExporting] = useState(false);

  // Réordonnancement par drag (poignée grip de l'en-tête de chaque slide).
  // Le wrapper est TOUJOURS draggable, mais onDragStart n'accepte le geste que
  // s'il part de la poignée : celle-ci arme `armedRef` de façon SYNCHRONE au
  // mousedown (un state React commité trop tard rendrait le drag aléatoire —
  // seule la 1re carte marchait). Tout drag non armé (texte, image, slider) est
  // annulé, ce qui protège l'édition interne.
  const armedRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleReorderDrop = (target: number) => {
    if (dragIndex === null || dragIndex === target) return;
    const next = [...slides];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    setSlides(next);
  };

  // Reset global avec possibilité d'annuler : on snapshote slides + base mesh
  // avant, et le toast restaure via les setters bruts du store.
  const handleReset = () => {
    const { showcaseSlides: prevSlides, showcaseMeshBase: prevBase, setShowcaseSlides, setShowcaseMeshBase } = useDAStore.getState();
    resetSlides();
    toast.success("Carrousel réinitialisé", {
      action: {
        label: "Annuler",
        onClick: () => {
          setShowcaseSlides(prevSlides);
          setShowcaseMeshBase(prevBase);
        },
      },
    });
  };

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
            onClick={handleReset}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-all active:scale-[0.97]"
            title="Repartir des 4 slides par défaut (charte du site)"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
          </button>
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
        <div className={`flex flex-col ${dragIndex !== null ? "gap-3" : "gap-8"}`}>
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              draggable
              onDragStart={(e) => {
                // N'accepte le drag que s'il part de la poignée (armedRef posé
                // au mousedown) — sinon on annule pour laisser l'édition interne
                // et le drag natif d'images/texte tranquilles.
                if (armedRef.current !== i) { e.preventDefault(); return; }
                e.dataTransfer.effectAllowed = "move";
                // Ghost = seulement la barre d'en-tête : la carte complète
                // (snapshotée avant le repli) serait beaucoup trop chargée.
                const header = e.currentTarget.querySelector<HTMLElement>("[data-slide-header]");
                if (header) {
                  const r = header.getBoundingClientRect();
                  e.dataTransfer.setDragImage(header, e.clientX - r.left, e.clientY - r.top);
                }
                // Repli DIFFÉRÉ d'une frame : replier dans le même tick que le
                // dragstart fait rétrécir les cartes du dessus → la carte draguée
                // saute vers le haut et Chrome annule le drag (seule la 1re, sans
                // rien au-dessus, survivait). Le rAF laisse le drag natif démarrer
                // sur un layout stable ; une fois lancé il survit au reflow.
                requestAnimationFrame(() => setDragIndex(i));
              }}
              onDragEnter={() => setOverIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleReorderDrop(i)}
              onDragEnd={() => { setDragIndex(null); setOverIndex(null); armedRef.current = null; }}
              className={`rounded-xl transition-all ${
                dragIndex === i
                  ? "opacity-40"
                  : dragIndex !== null && overIndex === i
                    ? "ring-2 ring-foreground"
                    : ""
              }`}
            >
              <ShowcaseSlideEditor
                slide={slide}
                defaultName={defaultShowcaseName(i)}
                isFirst={i === 0}
                isLast={i === slides.length - 1}
                collapsed={dragIndex !== null}
                onGripDown={() => { armedRef.current = i; }}
                onGripUp={() => { armedRef.current = null; }}
              />
            </div>
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
