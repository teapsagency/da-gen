import React from "react";
import { useDAStore } from "@/store/daStore";

/**
 * Version MOBILE (portrait 1080×1350) de la frame Couleurs : mêmes bandes que la
 * version desktop, en format portrait. Respecte l'orientation choisie
 * (horizontal = bandeaux empilés, vertical = bandes côte à côte).
 */
export const FrameColors_Mobile = ({ id }: { id?: string }) => {
  const { scrapeResult, selectedColors, colorsOrientation } = useDAStore();

  if (!scrapeResult) return null;

  const flexDirection = colorsOrientation === "vertical" ? "row" : "column";

  return (
    <div
      id={id}
      style={{
        width: "1080px",
        height: "1350px",
        borderRadius: 0,
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection,
      }}
    >
      {selectedColors.map((hex, i) => (
        <div key={i} style={{ flex: 1, background: hex }} />
      ))}
    </div>
  );
};
