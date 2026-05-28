import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { EditableImage } from "@/components/ui/EditableImage";

export const Frame5_Social_HeroSimple = ({ id }: { id?: string }) => {
  const { scrapeResult } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  const editable = !id;

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
      <EditableImage
        slotKey="frame-5-social-hero__main"
        src={activeScreenshots.desktop}
        alt="Hero"
        editable={editable}
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
