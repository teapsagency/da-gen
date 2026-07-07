import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { getTextColor } from "@/lib/contrastUtils";
import { EditableImage } from "@/components/ui/EditableImage";

/**
 * Version MOBILE (portrait 1080×1350) de la frame Identité.
 * Deux colonnes : à gauche les 3 blocs identité (logo, palette 2×2, typo)
 * empilés ; à droite l'aperçu du site dans un cadre téléphone.
 */
export const Frame1_DA_Mobile = ({ id }: { id?: string }) => {
  const editable = !id;
  const {
    scrapeResult,
    selectedLogo,
    selectedColors,
    bgColor,
    fontName,
    localFontFile,
    logoScale,
    fontUppercase,
  } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  const fontFamily = localFontFile ? "LocalFont" : `"${fontName}", sans-serif`;
  const card: React.CSSProperties = {
    background: "#FFFFFF",
    borderRadius: "26px",
    overflow: "hidden",
    display: "flex",
  };

  return (
    <div
      id={id}
      style={{
        width: "1080px",
        height: "1350px",
        background: bgColor,
        borderRadius: 0,
        padding: "28px",
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "row",
        gap: "24px",
      }}
    >
      {/* ═══ COLONNE GAUCHE — logo · palette · typo ═══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "24px", minWidth: 0 }}>
        {/* Logo */}
        <div style={{ ...card, flex: 1, alignItems: "center", justifyContent: "center", padding: "40px" }}>
          {selectedLogo && (
            <img
              src={selectedLogo}
              alt="Logo"
              style={{ maxWidth: "75%", maxHeight: "75%", objectFit: "contain", transform: `scale(${logoScale})` }}
            />
          )}
        </div>

        {/* Palette — grille 2×2 */}
        <div
          style={{
            ...card,
            flex: 0.95,
            padding: "18px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "16px",
          }}
        >
          {selectedColors.slice(0, 4).map((hex, i) => (
            <div key={i} style={{ borderRadius: "14px", background: hex, position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: "20px",
                  bottom: "16px",
                  fontFamily: "Satoshi, sans-serif",
                  fontWeight: 700,
                  fontSize: "26px",
                  color: getTextColor(hex),
                  letterSpacing: "-0.02em",
                  lineHeight: "1",
                }}
              >
                {hex.toUpperCase()}
              </span>
            </div>
          ))}
        </div>

        {/* Typographie */}
        <div style={{ ...card, flex: 1.2, padding: "18px" }}>
          <div
            style={{
              borderRadius: "14px",
              width: "100%",
              height: "100%",
              boxSizing: "border-box",
              // Fond blanc comme les autres cellules (logo / palette / aperçu).
              background: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "32px 44px",
              overflow: "hidden",
            }}
          >
            <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
              <span
                style={{
                  fontFamily,
                  fontWeight: 500,
                  fontSize: "180px",
                  color: "#111111",
                  lineHeight: "1",
                  letterSpacing: "-0.02em",
                  textTransform: fontUppercase ? "uppercase" : "none",
                }}
              >
                Aa
              </span>
            </div>
            <div style={{ flexShrink: 0, paddingTop: "12px" }}>
              <span
                style={{
                  fontFamily: "Satoshi, sans-serif",
                  fontWeight: 700,
                  fontSize: "44px",
                  color: "#111111",
                  letterSpacing: "-0.02em",
                  textTransform: fontUppercase ? "uppercase" : "none",
                  lineHeight: "1",
                }}
              >
                {fontName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ COLONNE DROITE — aperçu site, pleine hauteur, style carte (moitié) ═══ */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: "#FFFFFF",
          borderRadius: "26px",
          padding: "18px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: "14px", overflow: "hidden" }}>
          <EditableImage
            slotKey="frame-1-da-mobile__preview"
            src={activeScreenshots.mobile}
            alt="Aperçu mobile"
            editable={editable}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
};
