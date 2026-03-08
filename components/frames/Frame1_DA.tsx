import React from "react";
import { useDAStore } from "@/store/daStore";
import { getTextColor } from "@/lib/contrastUtils";

export const Frame1_DA = ({ id }: { id?: string }) => {
  const {
    scrapeResult,
    selectedLogo,
    selectedColors,
    bgColor,
    fontName,
    localFontFile,
    borderRadius,
    logoScale,
  } = useDAStore();

  if (!scrapeResult) return null;

  const fontFamily = localFontFile ? "LocalFont" : `"${fontName}", sans-serif`;
  const bgTextColor = getTextColor(bgColor);

  return (
    <div
      id={id}
      style={{
        width: "2373px",
        height: "1473px",
        background: bgColor,
        borderRadius: `${borderRadius}px`,
        padding: "28px",
        boxSizing: "border-box",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: "24px",
      }}
    >
      {/* ═══ CELL 1 — LOGO ═══ */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: "80px",
        }}
      >
        {selectedLogo && (
          <img
            src={selectedLogo}
            alt="Logo"
            style={{
              maxWidth: "80%",
              maxHeight: "80%",
              objectFit: "contain",
              transform: `scale(${logoScale})`,
            }}
          />
        )}
      </div>

      {/* ═══ CELL 2 — COLORS ═══ */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "32px",
          padding: "24px",
          display: "flex",
          flexDirection: "row",
          gap: "24px",
        }}
      >
        {selectedColors.map((hex, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              borderRadius: "16px",
              background: hex,
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                right: "40px",
                bottom: "32px",
                fontFamily: "Satoshi, sans-serif",
                fontWeight: 700,
                fontSize: "42px",
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

      {/* ═══ CELL 3 — TYPOGRAPHY ═══ */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "32px",
          padding: "24px",
        }}
      >
        <div
          style={{
            borderRadius: "16px",
            overflow: "hidden",
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            background: bgColor,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "60px 80px",
          }}
        >
          {/* Aa — flex item, takes available space */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontFamily: fontFamily,
                fontWeight: 500,
                fontSize: "420px",
                color: bgTextColor,
                lineHeight: "0.85",
                letterSpacing: "-0.02em",
              }}
            >
              Aa
            </span>
          </div>
          {/* Font name — pinned at bottom, never overlapped */}
          <div style={{ flexShrink: 0, paddingTop: "20px" }}>
            <span
              style={{
                fontFamily: "Satoshi, sans-serif",
                fontWeight: 700,
                fontSize: "72px",
                color: bgTextColor,
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                lineHeight: "1",
              }}
            >
              {fontName}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ CELL 4 — DESKTOP PREVIEW ═══ */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "32px",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          <img
            src={scrapeResult.screenshots.desktop}
            alt="Desktop preview"
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
