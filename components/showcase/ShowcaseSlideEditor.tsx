"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Copy, Grip, RotateCcw, Trash2 } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { FrameShowcase } from "@/components/frames/FrameShowcase";
import { ShowcaseControls } from "./ShowcaseControls";
import { EditableTitle } from "@/components/ui/EditableTitle";
import { ExportButton } from "@/components/ui/ExportButton";
import { exportShowcaseSlide } from "@/lib/exportFrames";
import type { MeshGradient, ShowcaseSlide } from "@/types";

const CANVAS_W = 1920;
const CANVAS_H = 1080;

/**
 * Éditeur d'une slide du carrousel Showcase : aperçu scalé (frame 16:9 éditable
 * avec poignées mesh) + barre de réglages. Toute modif passe par
 * updateShowcaseSlide. Instance d'export montée offscreen par ShowcaseSection.
 */
export function ShowcaseSlideEditor({
  slide,
  defaultName,
  isFirst,
  isLast,
  collapsed,
  onGripDown,
  onGripUp,
}: {
  slide: ShowcaseSlide;
  defaultName: string;
  /** Position dans le carrousel : désactive ▲ sur la première et ▼ sur la dernière. */
  isFirst: boolean;
  isLast: boolean;
  /** Pendant un drag de réordonnancement : la carte se réduit à sa barre d'en-tête. */
  collapsed: boolean;
  /** Poignée de drag : arme/désarme le draggable du wrapper (ShowcaseSection). */
  onGripDown: () => void;
  onGripUp: () => void;
}) {
  const updateSlide = useDAStore((s) => s.updateShowcaseSlide);
  const removeSlide = useDAStore((s) => s.removeShowcaseSlide);
  const resetSlide = useDAStore((s) => s.resetShowcaseSlide);
  const duplicateSlide = useDAStore((s) => s.duplicateShowcaseSlide);
  const moveSlide = useDAStore((s) => s.moveShowcaseSlide);
  const exportScale = useDAStore((s) => s.exportScale);

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Aperçu : on scale la frame fixe (1920×1080) à la largeur du conteneur.
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const update = () => {
      if (previewRef.current) setScale(previewRef.current.offsetWidth / CANVAS_W);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const setMesh = (m: MeshGradient) => updateSlide(slide.id, { mesh: m });

  // Reset de la slide avec possibilité d'annuler : on snapshote le tableau
  // complet avant, et le toast restaure via setShowcaseSlides.
  const handleReset = () => {
    const { showcaseSlides: prevSlides, setShowcaseSlides } = useDAStore.getState();
    resetSlide(slide.id);
    setSelectedPointId(null); // la sélection peut référencer un point disparu
    toast.success("Slide réinitialisée", {
      action: { label: "Annuler", onClick: () => setShowcaseSlides(prevSlides) },
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportShowcaseSlide(slide, defaultName, exportScale);
      toast.success("Slide exportée !");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* En-tête : poignée · nom d'export · export · monter/descendre · dupliquer · reset · supprimer.
          data-slide-header : sert de ghost de drag (setDragImage) côté ShowcaseSection. */}
      <div data-slide-header className={`flex items-center gap-2 px-4 py-2.5 ${collapsed ? "" : "border-b border-border"}`}>
        {/* Poignée de réordonnancement : le drag ne démarre que depuis ici
            (mousedown arme le draggable du wrapper, relâché au dragend). */}
        <button
          onMouseDown={onGripDown}
          onMouseUp={onGripUp}
          className="text-foreground/30 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors -ml-1"
          title="Glisser pour réordonner"
        >
          <Grip className="w-4 h-4" />
        </button>
        <EditableTitle
          value={slide.name ?? defaultName}
          onChange={(next) => updateSlide(slide.id, { name: next || undefined })}
          className="text-[12px] font-semibold tracking-tight text-foreground/55"
        />
        <div className="ml-auto flex items-center gap-2">
          <ExportButton onExport={handleExport} busy={exporting} />
          <button
            onClick={() => moveSlide(slide.id, -1)}
            disabled={isFirst}
            className="text-foreground/30 hover:text-foreground cursor-pointer transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Monter cette slide"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => moveSlide(slide.id, 1)}
            disabled={isLast}
            className="text-foreground/30 hover:text-foreground cursor-pointer transition-colors disabled:opacity-30 disabled:pointer-events-none"
            title="Descendre cette slide"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => duplicateSlide(slide.id)}
            className="text-foreground/30 hover:text-foreground cursor-pointer transition-colors"
            title="Dupliquer cette slide"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="text-foreground/30 hover:text-foreground cursor-pointer transition-colors"
            title="Réinitialiser cette slide (agencement par défaut)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => removeSlide(slide.id)}
            className="text-foreground/30 hover:text-red-500 cursor-pointer transition-colors"
            title="Supprimer cette slide"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Aperçu + réglages, masqués pendant un drag de réordonnancement
          (les cartes se réduisent à leur barre pour un drop lisible). */}
      {!collapsed && (
      <>
      {/* Aperçu */}
      <div className="p-4">
        <div ref={previewRef} className="relative w-full overflow-hidden rounded-md" style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: `${CANVAS_W}px`, height: `${CANVAS_H}px`, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <FrameShowcase
              slide={slide}
              selectedPointId={selectedPointId}
              onSelectPoint={setSelectedPointId}
              onMovePoint={(pid, x, y) => setMesh({ ...slide.mesh, points: slide.mesh.points.map((p) => (p.id === pid ? { ...p, x, y } : p)) })}
              onRemovePoint={(pid) => {
                setMesh({ ...slide.mesh, points: slide.mesh.points.filter((p) => p.id !== pid) });
                if (selectedPointId === pid) setSelectedPointId(null);
              }}
              onRegionChange={(ry) => updateSlide(slide.id, { regionY: ry })}
            />
          </div>
        </div>
      </div>

      {/* Réglages */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-wrap">
        <ShowcaseControls
          slide={slide}
          onChange={(patch) => updateSlide(slide.id, patch)}
          selectedPointId={selectedPointId}
          onSelect={setSelectedPointId}
        />
      </div>
      </>
      )}
    </div>
  );
}
