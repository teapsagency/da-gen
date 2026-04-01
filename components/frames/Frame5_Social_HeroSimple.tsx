import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";

export const Frame5_Social_HeroSimple = ({ id }: { id?: string }) => {
  const { scrapeResult } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  // 1080×675 — matches desktop viewport ratio (1440×900 = 16:10) so full width is visible
  return (
    <div
      id={id}
      style={{
        position: "relative",
        width: "1080px",
        height: "675px",
        overflow: "hidden",
      }}
    >
      <img
        src={activeScreenshots.desktop}
        alt="Hero"
        style={{
          width: "1080px",
          height: "675px",
          objectFit: "cover",
          objectPosition: "top center",
          display: "block",
        }}
      />
    </div>
  );
};
