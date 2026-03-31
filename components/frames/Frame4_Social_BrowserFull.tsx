import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { BrowserNavBar } from "./BrowserNavBar";

export const Frame4_Social_BrowserFull = ({ id }: { id?: string }) => {
  const { scrapeResult, agencyLogo } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  const domain = scrapeResult.domain.replace(/^www\./, "");

  return (
    <div
      id={id}
      style={{
        position: "relative",
        width: "1080px",
        height: "1350px",
        overflow: "hidden",
      }}
    >
      {/* Blurred background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "-60px",
          width: "1200px",
          height: "1454px",
          filter: "blur(2px)",
        }}
      >
        <img
          src={activeScreenshots.desktopFull}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
        />
      </div>

      {/* Browser window — extends to bottom (no bottom padding, no bottom radius) */}
      <div
        style={{
          position: "absolute",
          left: "69px",
          top: "69px",
          width: "942px",
          bottom: 0,
          background: "#ffffff",
          borderRadius: "32px 32px 0 0",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          padding: "24px",
          paddingBottom: 0,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        <BrowserNavBar domain={domain} agencyLogo={agencyLogo} dotSize={14} />

        {/* Screenshot */}
        <div style={{ flex: 1, minHeight: 0, width: "100%", overflow: "hidden", borderRadius: "8px 8px 0 0" }}>
          <img
            src={activeScreenshots.desktopFull}
            alt="Screenshot"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
};
