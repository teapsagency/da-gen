import React from "react";

type Props = {
  domain: string;
  agencyLogo?: string;
  dotSize?: number;
  height?: number;
};

export function BrowserNavBar({ domain, agencyLogo, dotSize = 16, height }: Props) {
  const barHeight = height ?? (dotSize === 16 ? 48 : 36);
  const gap = dotSize >= 16 ? "12px" : "8px";
  const fontSize = dotSize >= 16 ? "20px" : "16px";
  const urlPadX = dotSize >= 16 ? "24px" : "18px";
  const urlPadY = dotSize >= 16 ? "8px" : "5px";
  const urlGap = dotSize >= 16 ? "12px" : "8px";
  const lockSize = dotSize >= 16 ? 14 : 10;
  const logoMaxH = dotSize >= 16 ? "32px" : "22px";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: "16px",
        paddingRight: "16px",
        height: `${barHeight}px`,
        width: "100%",
        flexShrink: 0,
      }}
    >
      {/* macOS dots */}
      <div style={{ display: "flex", alignItems: "center", gap, width: "120px" }}>
        <div style={{ width: `${dotSize}px`, height: `${dotSize}px`, borderRadius: "50%", background: "#FF5F57" }} />
        <div style={{ width: `${dotSize}px`, height: `${dotSize}px`, borderRadius: "50%", background: "#FEBC2E" }} />
        <div style={{ width: `${dotSize}px`, height: `${dotSize}px`, borderRadius: "50%", background: "#28C840" }} />
      </div>

      {/* URL bar — pill with background */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: urlGap,
          background: "rgba(0, 0, 0, 0.05)",
          paddingLeft: urlPadX,
          paddingRight: urlPadX,
          paddingTop: urlPadY,
          paddingBottom: urlPadY,
          borderRadius: "9999px",
        }}
      >
        <svg width={lockSize} height={lockSize + 2} viewBox="0 0 14 18" fill="none">
          <path
            d="M12 7V5C12 2.23858 9.76142 0 7 0C4.23858 0 2 2.23858 2 5V7H0V18H14V7H12ZM4 5C4 3.34315 5.34315 2 7 2C8.65685 2 10 3.34315 10 5V7H4V5ZM12 16H2V9H12V16Z"
            fill="#111111"
          />
        </svg>
        <span
          style={{
            fontFamily: "Satoshi, sans-serif",
            fontWeight: 700,
            fontSize,
            color: "#111111",
            whiteSpace: "nowrap",
          }}
        >
          {domain}
        </span>
      </div>

      {/* Agency logo */}
      <div style={{ width: "120px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
        {agencyLogo ? (
          <img src={agencyLogo} alt="Agency" style={{ maxHeight: logoMaxH, objectFit: "contain", filter: "brightness(0)" }} />
        ) : (
          <span style={{ fontFamily: "Satoshi, sans-serif", fontWeight: 900, fontSize: "12px", color: "rgba(0,0,0,0.1)" }}>AGENCE</span>
        )}
      </div>
    </div>
  );
}
