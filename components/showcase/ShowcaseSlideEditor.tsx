"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Trash2 } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { FrameShowcase } from "@/components/frames/FrameShowcase";
import { ShowcaseControls } from "./ShowcaseControls";
import { EditableTitle } from "@/components/ui/EditableTitle";
import { exportShowcaseSlide } from "@/lib/exportFrames";
import type { MeshGradient, ShowcaseSlide } from "@/types";

const CANVAS_W = 1920;
const CANVAS_H = 1080;

/**
 * Éditeur d'une slide du carrousel Showcase : aperçu scalé (frame 16:9 éditable
 * avec poignées mesh) + barre de réglages. Toute modif passe par
 * updateShowcaseSlide. Instance d'export montée offscreen par ShowcaseSection.
 */
export function ShowcaseSlideEditor({ slide, defaultName }: { slide: ShowcaseSlide; defaultName: string }) {
  const updateSlide = useDAStore((s) => s.updateShowcaseSlide);
  const removeSlide = useDAStore((s) => s.removeShowcaseSlide);
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
      {/* En-tête : nom d'export · export · supprimer */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <EditableTitle
          value={slide.name ?? defaultName}
          onChange={(next) => updateSlide(slide.id, { name: next || undefined })}
          className="text-[12px] font-semibold tracking-tight text-foreground/55"
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer disabled:opacity-30 transition-all hover:opacity-70 active:scale-[0.97]"
          >
            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            <span>{exporting ? "Export..." : "Export PNG"}</span>
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
    </div>
  );
}
