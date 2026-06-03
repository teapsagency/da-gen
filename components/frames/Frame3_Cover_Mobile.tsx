import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { EditableImage } from "@/components/ui/EditableImage";
import { BrowserNavBar } from "@/components/frames/BrowserNavBar";

/**
 * Version MOBILE (portrait 1080×1350) de la frame Couverture.
 * Une seule fenêtre navigateur qui remplit le portrait : barre nav + hero
 * desktop qui descend jusqu'en bas.
 */
export const Frame3_Cover_Mobile = ({ id }: { id?: string }) => {
  const editable = !id;
  const { scrapeResult, bgColor, agencyLogo, desktopPadding, dropShadow } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  const domain = scrapeResult.domain.replace(/^www\./, "");

  // Marge bgColor en haut/gauche/droite ; 0 = fenêtre bord à bord.
  const pad = desktopPadding ? 58 : 0;
  // Cadre sans arrondi : avec marge, fenêtre = carte arrondie en haut ; sans
  // marge, top carré pour épouser le bord du cadre (pas de croissant de fond).
  const winTopRadius = pad > 0 ? 40 : 0;

  return (
    <div
      id={id}
      style={{
        width: "1080px",
        height: "1350px",
        background: bgColor,
        borderRadius: 0,
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        paddingTop: `${pad}px`,
        paddingLeft: `${pad}px`,
        paddingRight: `${pad}px`,
        paddingBottom: "0",
      }}
    >
      {/* Fenêtre navigateur */}
      <div
        style={{
          background: "#FFFFFF",
          borderTopLeftRadius: `${winTopRadius}px`,
          borderTopRightRadius: `${winTopRadius}px`,
          borderBottomLeftRadius: "0",
          borderBottomRightRadius: "0",
          boxShadow: dropShadow ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)" : "none",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          overflow: "hidden",
          flex: 1,
          padding: "18px",
        }}
      >
        <BrowserNavBar domain={domain} agencyLogo={agencyLogo} dotSize={12} />

        <div
          style={{
            flex: 1,
            width: "100%",
            overflow: "hidden",
            borderRadius: "12px",
          }}
        >
          <EditableImage
            slotKey="frame-3-cover-mobile__main"
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
      </div>
    </div>
  );
};
