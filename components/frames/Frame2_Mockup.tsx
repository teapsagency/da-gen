import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { EditableImage } from "@/components/ui/EditableImage";

export const Frame2_Mockup = ({ id }: { id?: string }) => {
  // L'instance "offscreen" (passée avec un id) sert au capture export :
  // on désactive le hover/upload pour qu'aucune affordance d'édition ne
  // puisse être capturée dans le PNG.
  const editable = !id;
  const { scrapeResult, bgColor, borderRadius, desktopPadding } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  // Marge bgColor autour des mockups ; 0 = contenu bord à bord.
  const pad = desktopPadding ? 58 : 0;

  // Figma specs:
  // - Frame: 2373×1473, padding 58px, overflow clipped
  // - Desktop: 1709px wide, extends to bottom (no bottom padding), clipped
  // - Mobile: 718.62×1562px, overlaps desktop, also extends past bottom (clipped)
  // - Equal left (58px from frame) and right spacing (mobile right edge ~58px from frame)
  // - Mobile positioned with right: 58px so right margin = left padding = 58px

  return (
    <div
      id={id}
      style={{
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        width: "2373px",
        height: "1473px",
        background: bgColor,
        borderRadius: `${borderRadius}px`,
      }}
    >
      {/* Desktop screenshot — extends from top padding to beyond bottom, clipped */}
      <div
        style={{
          position: "absolute",
          left: `${pad}px`,
          top: `${pad}px`,
          width: "1709px",
          bottom: "0",
          borderRadius: "32px 32px 0 0",
          overflow: "hidden",
          border: "14px solid #FFFFFF",
          borderBottom: "none",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          background: "#FFFFFF",
        }}
      >
        <EditableImage
          slotKey="frame-2-mockup__desktop"
          src={activeScreenshots.desktopFull}
          alt="Desktop full"
          editable={editable}
          regionSource={activeScreenshots.desktopFull}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            display: "block",
          }}
        />
      </div>

      {/* Mobile screenshot — overlaps desktop, extends past bottom (clipped) */}
      <div
        style={{
          position: "absolute",
          right: `${pad}px`,
          top: `${pad + 150}px`,
          width: "718px",
          height: "1562px",
          borderRadius: "32px",
          border: "14px solid #FFFFFF",
          overflow: "hidden",
          boxShadow: "0 25px 80px -12px rgba(0, 0, 0, 0.35)",
          background: "#FFFFFF",
          zIndex: 2,
        }}
      >
        <EditableImage
          slotKey="frame-2-mockup__mobile"
          src={activeScreenshots.mobile}
          alt="Mobile preview"
          editable={editable}
          regionSource={activeScreenshots.mobile}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "top center",
            display: "block",
          }}
        />
      </div>
    </div>
  );
};
