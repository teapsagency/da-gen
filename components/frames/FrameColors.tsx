import React from "react";
import { useDAStore } from "@/store/daStore";

export const FrameColors = ({ id }: { id?: string }) => {
  const { scrapeResult, selectedColors, colorsOrientation } = useDAStore();

  if (!scrapeResult) return null;

  // horizontal = bandeaux pleine largeur empilés (colonne)
  // vertical   = bandes pleine hauteur côte à côte (ligne)
  const flexDirection = colorsOrientation === "vertical" ? "row" : "column";

  return (
    <div
      id={id}
      style={{
        width: "2373px",
        height: "1473px",
        borderRadius: 0,
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection,
      }}
    >
      {selectedColors.map((hex, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            background: hex,
          }}
        />
      ))}
    </div>
  );
};
