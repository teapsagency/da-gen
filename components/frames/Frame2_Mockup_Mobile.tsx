import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { EditableImage } from "@/components/ui/EditableImage";

/**
 * Version MOBILE (portrait 1080×1350) de la frame Interface.
 * Une carte navigateur DESKTOP qui descend jusqu'au bas du cadre, qu'un mockup
 * TÉLÉPHONE recouvre en bas à droite (débordant sous le bas, clippé).
 */
export const Frame2_Mockup_Mobile = ({ id }: { id?: string }) => {
  const editable = !id;
  const { scrapeResult, bgColor, dropShadow } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  return (
    <div
      id={id}
      style={{
        position: "relative",
        width: "1080px",
        height: "1350px",
        background: bgColor,
        borderRadius: 0,
        // Bordure grise légère : délimite la frame sur les sites à fond blanc.
        border: "3px solid rgba(0, 0, 0, 0.1)",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Carte navigateur DESKTOP — descend jusqu'au bas du cadre (clippée) */}
      <div
        style={{
          position: "absolute",
          left: "70px",
          top: "90px",
          width: "830px",
          bottom: 0,
          borderRadius: "32px 32px 0 0",
          overflow: "hidden",
          border: "14px solid #FFFFFF",
          borderBottom: "none",
          boxShadow: dropShadow ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)" : "none",
          background: "#FFFFFF",
        }}
      >
        <EditableImage
          slotKey="frame-2-mockup-mobile__desktop"
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

      {/* Mockup TÉLÉPHONE — superposé en bas à droite, débordant sous le bas */}
      <div
        style={{
          position: "absolute",
          right: "70px",
          bottom: "-60px",
          width: "360px",
          height: `${(360 * 844) / 390}px`,
          borderRadius: "46px",
          overflow: "hidden",
          border: "12px solid #FFFFFF",
          boxShadow: dropShadow ? "0 25px 80px -12px rgba(0, 0, 0, 0.35)" : "none",
          background: "#FFFFFF",
          zIndex: 2,
        }}
      >
        <EditableImage
          slotKey="frame-2-mockup-mobile__mobile"
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
