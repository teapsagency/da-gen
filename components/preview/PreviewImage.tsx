"use client";

import React from "react";
import type { PreviewImageRef, SocialFrameId } from "@/types";
import { useDAStore } from "@/store/daStore";
import { resolveScreenshotKey } from "./imageSources";
import { Frame4_Social_BrowserFull } from "@/components/frames/Frame4_Social_BrowserFull";
import { Frame5_Social_HeroSimple } from "@/components/frames/Frame5_Social_HeroSimple";
import { Frame6_Social_NouvelleReal } from "@/components/frames/Frame6_Social_NouvelleReal";
import { Frame7_Social_ThreeImg } from "@/components/frames/Frame7_Social_ThreeImg";
import { Frame8_Social_CardSite } from "@/components/frames/Frame8_Social_CardSite";
import { Frame9_Social_BoardDesktop } from "@/components/frames/Frame9_Social_BoardDesktop";
import { Frame10_Social_BoardMobile } from "@/components/frames/Frame10_Social_BoardMobile";
import { Frame1_DA_Mobile } from "@/components/frames/Frame1_DA_Mobile";
import { FrameColors_Mobile } from "@/components/frames/FrameColors_Mobile";
import { Frame2_Mockup_Mobile } from "@/components/frames/Frame2_Mockup_Mobile";
import { Frame3_Cover_Mobile } from "@/components/frames/Frame3_Cover_Mobile";

export const FRAME_RENDER: Record<SocialFrameId, { w: number; h: number; node: React.ReactNode }> = {
  identityMobile: { w: 1080, h: 1350, node: <Frame1_DA_Mobile /> },
  colorsMobile: { w: 1080, h: 1350, node: <FrameColors_Mobile /> },
  mockupMobile: { w: 1080, h: 1350, node: <Frame2_Mockup_Mobile /> },
  coverMobile: { w: 1080, h: 1350, node: <Frame3_Cover_Mobile /> },
  frame4: { w: 1080, h: 1350, node: <Frame4_Social_BrowserFull /> },
  frame5: { w: 1080, h: 675, node: <Frame5_Social_HeroSimple /> },
  frame6: { w: 1080, h: 1350, node: <Frame6_Social_NouvelleReal /> },
  frame7: { w: 1080, h: 1350, node: <Frame7_Social_ThreeImg /> },
  frame8: { w: 1080, h: 1350, node: <Frame8_Social_CardSite /> },
  frame9: { w: 1080, h: 1350, node: <Frame9_Social_BoardDesktop /> },
  frame10: { w: 1080, h: 1350, node: <Frame10_Social_BoardMobile /> },
};

/** Frame sociale rendue en live, scalée « cover » dans son conteneur absolu. */
function FrameCover({ frame }: { frame: SocialFrameId }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBox({ w: r.width, h: r.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const dim = FRAME_RENDER[frame];
  const scale = box.w && box.h ? Math.max(box.w / dim.w, box.h / dim.h) : 0;
  // pointer-events:none → rendu purement visuel : on neutralise les overlays
  // interactifs des frames (boutons EditableImage « Remplacer l'image »).
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {scale > 0 && (
        <div style={{ position: "absolute", top: "50%", left: "50%", width: dim.w, height: dim.h, transform: `translate(-50%, -50%) scale(${scale})` }}>
          {dim.node}
        </div>
      )}
    </div>
  );
}

function useSrc(refItem: PreviewImageRef): string | undefined {
  const scrapeResult = useDAStore((s) => s.scrapeResult);
  if (refItem.kind === "upload") return refItem.dataUrl;
  if (refItem.kind === "screenshot") return resolveScreenshotKey(refItem.key, scrapeResult);
  return undefined;
}

/**
 * Image de preview.
 * - `fit="cover"` : remplit un conteneur déjà dimensionné (ratio fixe). Doit être
 *   placée dans un parent `position: relative`.
 * - `fit="natural"` : rendue dans le flux à son ratio naturel (format « Original »).
 */
export function PreviewImage({ refItem, fit }: { refItem: PreviewImageRef; fit: "cover" | "natural" }) {
  const src = useSrc(refItem);

  if (refItem.kind === "frame") {
    const dim = FRAME_RENDER[refItem.frame];
    if (fit === "natural") {
      return (
        <div style={{ position: "relative", width: "100%", aspectRatio: `${dim.w} / ${dim.h}` }}>
          <FrameCover frame={refItem.frame} />
        </div>
      );
    }
    return <FrameCover frame={refItem.frame} />;
  }

  if (!src) return null;
  if (fit === "natural") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={{ display: "block", width: "100%", height: "auto" }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />;
}

/** Ratio CSS d'une vignette/zone média pour un format donné (cover). */
export const FORMAT_ASPECT: Record<"1:1" | "4:5" | "16:9", string> = {
  "1:1": "1 / 1",
  "4:5": "4 / 5",
  "16:9": "16 / 9",
};
