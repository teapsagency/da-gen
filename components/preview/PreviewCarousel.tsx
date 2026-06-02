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
