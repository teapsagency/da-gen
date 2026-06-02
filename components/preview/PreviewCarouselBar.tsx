"use client";

import React from "react";
import { X, GripHorizontal } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { PreviewImage } from "./PreviewImage";

/**
 * Barre du bas (zone d'aperçu) : les images du carrousel, réordonnables par
 * glisser-déposer. L'ajout se fait depuis le panneau de gauche.
 */
export function PreviewCarouselBar() {
  const images = useDAStore((s) => s.previewImages);
  const setImages = useDAStore((s) => s.setPreviewImages);
  const dragIndex = React.useRef<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);

  // getState() : état frais (closures périmées sur actions rapprochées).
  const removeImage = (i: number) => setImages(useDAStore.getState().previewImages.filter((_, k) => k !== i));
  const reorder = (target: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    setOverIndex(null);
    if (from === null || from === target) return;
    const next = [...useDAStore.getState().previewImages];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    setImages(next);
  };

  return (
    <div className="fixed bottom-0 left-[344px] right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <GripHorizontal className="w-3.5 h-3.5 text-foreground/30" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 whitespace-nowrap">
            Carrousel ({images.length})
          </span>
        </div>

        {images.length === 0 ? (
          <p className="text-[11px] text-foreground/30">
            Choisis des assets dans le panneau de gauche pour composer le carrousel, puis glisse-les ici pour l&apos;ordre.
          </p>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {images.map((img, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => { e.preventDefault(); if (overIndex !== i) setOverIndex(i); }}
                onDrop={() => reorder(i)}
                onDragEnd={() => { dragIndex.current = null; setOverIndex(null); }}
                title="Glisser pour réordonner"
                className={`relative w-[56px] h-[56px] shrink-0 rounded-md overflow-hidden border bg-foreground/[0.03] cursor-grab active:cursor-grabbing group ${
                  overIndex === i ? "border-foreground/60 ring-2 ring-foreground/20" : "border-border"
                }`}
              >
                <PreviewImage refItem={img} fit="cover" />
                <span className="absolute bottom-0.5 left-0.5 px-1 rounded text-[8px] font-bold text-white bg-black/50">{i + 1}</span>
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Retirer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
