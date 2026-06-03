"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import type { PreviewImageRef, PreviewFormat } from "@/types";
import { PreviewImage, FORMAT_ASPECT } from "./PreviewImage";

// Transition de slide — personnalité Premium/Corporate : mouvement on-screen
// lisse aux deux bouts, 360 ms, easing Material standard.
const SLIDE = "transform 360ms cubic-bezier(0.4, 0, 0.2, 1)";
const HEIGHT_TWEEN = "height 360ms cubic-bezier(0.4, 0, 0.2, 1)";

/** Carrousel d'images. Le ratio de la zone média suit `format` (Instagram). */
export function PreviewCarousel({ images, format }: { images: PreviewImageRef[]; format: PreviewFormat }) {
  const [i, setI] = React.useState(0);
  const count = images.length;
  const idx = count ? Math.min(i, count - 1) : 0;
  const fixed = format !== "original";
  const aspect = fixed ? FORMAT_ASPECT[format] : undefined;

  // Format « Original » : les images gardent leur hauteur naturelle (variable). On
  // mesure la slide active pour animer la hauteur du conteneur en même temps que la
  // translation → même slide IG-like que les formats fixes, sans bande vide en bas.
  const slideRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const [activeH, setActiveH] = React.useState<number>();
  React.useEffect(() => {
    if (fixed) {
      setActiveH(undefined);
      return;
    }
    const el = slideRefs.current[idx];
    if (!el) return;
    const measure = () => setActiveH(el.offsetHeight);
    measure();
    // Les images chargent en asynchrone → re-mesurer quand la slide active grandit.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fixed, idx, count, format]);

  if (count === 0) {
    return (
      <div style={{ aspectRatio: aspect ?? "1 / 1", background: "#efefef" }} className="flex items-center justify-center">
        <span className="flex items-center gap-2 text-[13px]" style={{ color: "#8e8e8e" }}>
          <ImageIcon className="w-4 h-4" /> Ajoute une image
        </span>
      </div>
    );
  }

  const prev = () => setI(() => Math.max(0, idx - 1));
  const next = () => setI(() => Math.min(count - 1, idx + 1));

  return (
    <div
      style={{
        position: "relative",
        background: "#efefef",
        overflow: "hidden",
        ...(fixed ? { aspectRatio: aspect } : { height: activeH, transition: HEIGHT_TWEEN }),
      }}
    >
      {/* Piste unique (tous formats) : slides côte à côte, on translate en X (slide
          IG-like). Fixe → cover plein cadre ; Original → hauteur naturelle, alignées
          en haut, le conteneur suit la hauteur de la slide active. */}
      <div
        style={{
          position: fixed ? "absolute" : "relative",
          ...(fixed ? { inset: 0 } : {}),
          display: "flex",
          alignItems: "flex-start",
          transform: `translateX(-${idx * 100}%)`,
          transition: SLIDE,
          willChange: "transform",
        }}
      >
        {images.map((img, k) => (
          <div
            key={k}
            ref={(el) => {
              slideRefs.current[k] = el;
            }}
            style={{ position: "relative", flex: "0 0 100%", ...(fixed ? { height: "100%" } : {}) }}
          >
            <PreviewImage refItem={img} fit={fixed ? "cover" : "natural"} />
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            onClick={prev}
            disabled={idx === 0}
            aria-label="Précédent"
            style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}
            className="w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center cursor-pointer transition-opacity disabled:opacity-0 disabled:cursor-default"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            disabled={idx === count - 1}
            aria-label="Suivant"
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}
            className="w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center cursor-pointer transition-opacity disabled:opacity-0 disabled:cursor-default"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div style={{ position: "absolute", top: 12, right: 12 }} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-black/50 text-white">
            {idx + 1}/{count}
          </div>
          <div style={{ position: "absolute", bottom: 10, left: 0, right: 0 }} className="flex items-center justify-center gap-1">
            {images.map((_, k) => (
              <button
                key={k}
                onClick={() => setI(() => k)}
                aria-label={`Image ${k + 1}`}
                className="rounded-full cursor-pointer transition-all"
                style={{ width: k === idx ? 7 : 6, height: k === idx ? 7 : 6, background: k === idx ? "#0095f6" : "#ffffffaa" }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
