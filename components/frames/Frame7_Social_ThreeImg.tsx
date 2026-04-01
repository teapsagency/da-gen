import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { BrowserNavBar } from "./BrowserNavBar";

export const Frame7_Social_ThreeImg = ({ id }: { id?: string }) => {
  const { scrapeResult, bgColor, agencyLogo } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  const domain = scrapeResult.domain.replace(/^www\./, "");
  // Just the site name without extension
  const siteName = domain.replace(/\.[^.]+$/, "");
  // Capitalize first letter
  const displayName = siteName.charAt(0).toUpperCase() + siteName.slice(1);

  const extraPages = scrapeResult.extraPages || [];
  const hasMultipleUrls = extraPages.length >= 2;

  let leftImage: string;
  let centerImage: string;
  let rightImage: string;

  if (hasMultipleUrls) {
    // 3 pages: catalogue (left), accueil (center), produit (right) — all desktop
    leftImage = extraPages[0]?.desktop || activeScreenshots.desktop;
    centerImage = activeScreenshots.desktop;
    rightImage = extraPages[1]?.desktop || activeScreenshots.desktop;
  } else {
    // 1 page: different scroll positions, center = hero (top)
    leftImage = activeScreenshots.desktopMid;
    centerImage = activeScreenshots.desktop;
    rightImage = activeScreenshots.desktopLower;
  }

  return (
    <div
      id={id}
      style={{
        position: "relative",
        width: "1080px",
        height: "1350px",
        background: bgColor,
        overflow: "hidden",
      }}
    >
      {/* Decorative lines */}
      <div style={{ position: "absolute", left: "53px", top: 0, width: "1px", height: "1350px", background: "#dfdfdf" }} />
      <div style={{ position: "absolute", right: "68px", top: 0, width: "1px", height: "1350px", background: "#dfdfdf" }} />
      <div style={{ position: "absolute", left: 0, top: "68px", width: "1080px", height: "1px", background: "#dfdfdf" }} />

      {/* Center content */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "80px",
        }}
      >
        {/* Text block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "40px",
            width: "699px",
          }}
        >
          {/* Agency logo */}
          <div style={{ width: "110px", height: "68px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {agencyLogo && (
              <img src={agencyLogo} alt="Agency" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: "brightness(0)" }} />
            )}
          </div>

          <span
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "128px",
              color: "#111111",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            Nouvelle
          </span>
          <span
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "128px",
              color: "#000000",
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
          >
            Réalisation
          </span>
          <span
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontWeight: 500,
              fontSize: "58px",
              color: "#000000",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              maxWidth: "900px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayName}
          </span>
        </div>

        {/* Images row */}
        <div style={{ position: "relative", width: "1642px", height: "493px" }}>
          {/* Left image — rotated -3deg */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "52px",
              width: "662px",
              height: "442px",
              transform: "rotate(-3deg)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <img src={leftImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
          </div>

          {/* Right image — rotated +3deg */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "52px",
              width: "662px",
              height: "442px",
              transform: "rotate(3deg)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <img src={rightImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }} />
          </div>

          {/* Center browser window */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              transform: "translateX(-50%)",
              width: "788px",
              height: "493px",
              background: "#ffffff",
              borderRadius: "32px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              padding: "18px",
              gap: "12px",
              zIndex: 2,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            <BrowserNavBar domain={domain} agencyLogo={agencyLogo} dotSize={12} />

            <div style={{ flex: 1, minHeight: 0, overflow: "hidden", borderRadius: "8px" }}>
              <img
                src={centerImage}
                alt="Screenshot"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
