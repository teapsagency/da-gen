import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { BrowserNavBar } from "./BrowserNavBar";
import { EditableImage } from "@/components/ui/EditableImage";

export const Frame6_Social_NouvelleReal = ({ id }: { id?: string }) => {
  const { scrapeResult, agencyLogo, dropShadow, showcaseWording } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  const editable = !id;
  const domain = scrapeResult.domain.replace(/^www\./, "");
  const [titleLine1, titleLine2] =
    showcaseWording === "nouvelle" ? ["Nouvelle", "Réalisation"] : ["Focus", "Client"];

  return (
    <div
      id={id}
      style={{
        position: "relative",
        width: "1080px",
        height: "1350px",
        background: scrapeResult.siteBgColor || "#ffffff",
        overflow: "hidden",
      }}
    >
      {/* Decorative lines */}
      <div style={{ position: "absolute", left: "68px", top: 0, width: "1px", height: "1350px", background: "#dfdfdf" }} />
      <div style={{ position: "absolute", right: "68px", top: 0, width: "1px", height: "1350px", background: "#dfdfdf" }} />
      <div style={{ position: "absolute", left: 0, top: "68px", width: "1080px", height: "1px", background: "#dfdfdf" }} />

      {/* Decorative dots */}
      <div style={{ position: "absolute", left: "54px", top: "54px", width: "28px", height: "28px", borderRadius: "50%", background: "#cfcfcf" }} />
      <div style={{ position: "absolute", right: "54px", top: "54px", width: "28px", height: "28px", borderRadius: "50%", background: "#cfcfcf" }} />

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
          gap: "8px",
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
          {titleLine1}
        </span>
        <span
          style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "128px",
            color: "#000000",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {titleLine2}
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
          boxShadow: dropShadow ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)" : "none",
          display: "flex",
          flexDirection: "column",
          padding: "18px",
          gap: "12px",
        }}
      >
        <BrowserNavBar domain={domain} agencyLogo={agencyLogo} dotSize={12} />

        {/* Screenshot */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative", borderRadius: "8px" }}>
          <EditableImage
            slotKey="frame-6-social-nouvelle__main"
            src={activeScreenshots.desktop}
            alt=""
            editable={editable}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block", borderRadius: "8px" }}
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
