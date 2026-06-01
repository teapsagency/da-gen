import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";

export const Frame8_Social_CardSite = ({ id }: { id?: string }) => {
  const { scrapeResult, selectedLogo, cardImage, cardLogoScale, cardImageOpacity } =
    useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  const bgImage = cardImage || activeScreenshots.desktop;

  return (
    <div
      id={id}
      style={{
        position: "relative",
        width: "1080px",
        height: "1350px",
        overflow: "hidden",
        background: "#000",
      }}
    >
      {/* Background image — opacity controlled, blended over the black backdrop */}
      <img
        src={bgImage}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
          opacity: cardImageOpacity,
        }}
      />

      {/* Logo centered, forced white */}
      {selectedLogo && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "108px",
          }}
        >
          <img
            src={selectedLogo}
            alt="Logo"
            style={{
              maxWidth: "60%",
              maxHeight: "40%",
              objectFit: "contain",
              transform: `scale(${cardLogoScale})`,
              filter:
                "brightness(0) saturate(100%) invert(100%) sepia(87%) saturate(0%) hue-rotate(174deg) brightness(104%) contrast(100%)",
            }}
          />
        </div>
      )}
    </div>
  );
};
