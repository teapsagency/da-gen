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

const FRAME_RENDER: Record<SocialFrameId, { w: number; h: number; node: React.ReactNode }> = {
  frame4: { w: 1080, h: 1350, node: <Frame4_Social_BrowserFull /> },
  frame5: { w: 1080, h: 675, node: <Frame5_Social_HeroSimple /> },
  frame6: { w: 1080, h: 1350, node: <Frame6_Social_NouvelleReal /> },
  frame7: { w: 1080, h: 1350, node: <Frame7_Social_ThreeImg /> },
  frame8: { w: 1080, h: 1350, node: <Frame8_Social_CardSite /> },
  frame9: { w: 1080, h: 1350, node: <Frame9_Social_BoardDesktop /> },
  frame10: { w: 1080, h: 1350, node: <Frame10_Social_BoardMobile /> },
};

/** Rend une frame sociale en live, mise à l'échelle « cover » dans son conteneur. */
function FrameImage({ frame }: { frame: SocialFrameId }) {
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
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {scale > 0 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: dim.w,
            height: dim.h,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          {dim.node}
        </div>
      )}
    </div>
  );
}

/** Une image de preview, occupant tout son conteneur (parent en position: relative). */
export function PreviewImage({ refItem }: { refItem: PreviewImageRef }) {
  const scrapeResult = useDAStore((s) => s.scrapeResult);
  if (refItem.kind === "frame") return <FrameImage frame={refItem.frame} />;
  const src = refItem.kind === "upload" ? refItem.dataUrl : resolveScreenshotKey(refItem.key, scrapeResult);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
}
