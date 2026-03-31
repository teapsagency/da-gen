import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";

export const Frame5_Social_HeroSimple = ({ id }: { id?: string }) => {
  const { scrapeResult } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  // Figma: 1080×723 — landscape format
  return (
    <div
      id={id}
      style={{
        position: "relative",
        width: "1080px",
        height: "723px",
        overflow: "hidden",
      }}
    >
      <img
        src={activeScreenshots.desktop}
        alt="Hero"
        style={{
          width: "1080px",
          height: "723px",
          objectFit: "cover",
          objectPosition: "top center",
          display: "block",
        }}
      />
    </div>
  );
};
