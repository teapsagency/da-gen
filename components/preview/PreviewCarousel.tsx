"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import type { PreviewImageRef, PreviewFormat } from "@/types";
import { PreviewImage, FORMAT_ASPECT } from "./PreviewImage";

/** Carrousel d'images. Le ratio de la zone média suit `format` (Instagram). */
export function PreviewCarousel({ images, format }: { images: PreviewImageRef[]; format: PreviewFormat }) {
  const [i, setI] = React.useState(0);
  const count = images.length;
  const idx = count ? Math.min(i, count - 1) : 0;
  const fixed = format !== "original";
  const aspect = fixed ? FORMAT_ASPECT[format] : undefined;

  if (count === 0) {
    return (
      <div style={{ aspectRatio: aspect ?? "1 / 1", background: "#efefef" }} className="flex items-center justify-center">
        <span className="flex items-center gap-2 text-[13px]" style={{ color: "#8e8e8e" }}>
          <ImageIcon className="w-4 h-4" /> Ajoute une image
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        background: "#efefef",
        overflow: "hidden",
        ...(fixed ? { aspectRatio: aspect } : {}),
      }}
    >
      <PreviewImage refItem={images[idx]} fit={fixed ? "cover" : "natural"} />
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
          <div style={{ position: "absolute", top: 12, right: 12 }} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-black/50 text-white">
            {idx + 1}/{count}
          </div>
          <div style={{ position: "absolute", bottom: 10, left: 0, right: 0 }} className="flex items-center justify-center gap-1">
            {images.map((_, k) => (
              <span key={k} className="rounded-full" style={{ width: 6, height: 6, background: k === idx ? "#0095f6" : "#ffffffaa" }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
