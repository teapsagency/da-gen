import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { BrowserNavBar } from "./BrowserNavBar";

export const Frame6_Social_NouvelleReal = ({ id }: { id?: string }) => {
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
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      {/* Decorative lines */}
      <div style={{ position: "absolute", left: "68px", top: 0, width: "1px", height: "1350px", background: "#e9eefa" }} />
      <div style={{ position: "absolute", right: "68px", top: 0, width: "1px", height: "1350px", background: "#e9eefa" }} />
      <div style={{ position: "absolute", left: 0, top: "68px", width: "1080px", height: "1px", background: "#e9eefa" }} />

      {/* Decorative dots */}
      <div style={{ position: "absolute", left: "54px", top: "54px", width: "28px", height: "28px", borderRadius: "50%", background: "#c8d0f7" }} />
      <div style={{ position: "absolute", right: "54px", top: "54px", width: "28px", height: "28px", borderRadius: "50%", background: "#c8d0f7" }} />

      {/* Title block */}
      <div
        style={{
          position: "absolute",
          top: "160px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "52px",
        }}
      >
        <span
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "128px",
            color: "#1e33f6",
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
      </div>

      {/* Browser mockup with progressive fade */}
      <div
        style={{
          position: "absolute",
          left: "69px",
          top: "540px",
          width: "942px",
          height: "630px",
          borderRadius: "32px",
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          padding: "18px",
          gap: "12px",
        }}
      >
        <BrowserNavBar domain={domain} agencyLogo={agencyLogo} dotSize={12} />

        {/* Screenshot with progressive fade */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative", borderRadius: "8px" }}>
          <img
            src={activeScreenshots.desktop}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block", borderRadius: "8px" }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "200px",
              background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 100%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* Agency logo — bottom center */}
      <div
        style={{
          position: "absolute",
          bottom: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "89px",
          height: "55px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {agencyLogo && (
          <img src={agencyLogo} alt="Agency" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: "brightness(0)" }} />
        )}
      </div>
    </div>
  );
};
