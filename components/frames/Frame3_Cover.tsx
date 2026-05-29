import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { EditableImage } from "@/components/ui/EditableImage";

export const Frame3_Cover = ({ id }: { id?: string }) => {
  const editable = !id;
  const { scrapeResult, bgColor, agencyLogo, borderRadius, desktopPadding } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  // Marge bgColor autour de la fenêtre ; 0 = fenêtre bord à bord.
  const pad = desktopPadding ? 58 : 0;
  // Sans marge, la fenêtre touche le bord du frame : son rayon doit alors
  // ÉGALER celui du frame, sinon un croissant de bgColor apparaît au coin
  // (rayons concentriques différents). Avec marge, c'est une carte flottante.
  const winTopRadius = pad > 0 ? 40 : borderRadius;

  return (
    <div
      id={id}
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
        width: "2373px",
        height: "1473px",
        background: bgColor,
        borderRadius: `${borderRadius}px`,
        paddingTop: `${pad}px`,
        paddingLeft: `${pad}px`,
        paddingRight: `${pad}px`,
        paddingBottom: "0",
      }}
    >
      {/* White browser window */}
      <div
        style={{
          background: "#FFFFFF",
          borderTopLeftRadius: `${winTopRadius}px`,
          borderTopRightRadius: `${winTopRadius}px`,
          borderBottomLeftRadius: "0",
          borderBottomRightRadius: "0",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
          overflow: "hidden",
          flex: 1,
          paddingTop: "32px",
          paddingLeft: "32px",
          paddingRight: "32px",
          paddingBottom: "0",
        }}
      >
        {/* ═══ NAV BAR ═══ */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: "16px",
            paddingRight: "16px",
            height: "48px",
            width: "100%",
            flexShrink: 0,
          }}
        >
          {/* macOS dots */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "120px",
            }}
          >
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#FF5F57",
              }}
            />
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#FEBC2E",
              }}
            />
            <div
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#28C840",
              }}
            />
          </div>

          {/* URL bar — centered via flex */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(0, 0, 0, 0.05)",
              paddingLeft: "24px",
              paddingRight: "24px",
              paddingTop: "8px",
              paddingBottom: "8px",
              borderRadius: "9999px",
            }}
          >
            <svg
              width="14"
              height="16"
              viewBox="0 0 14 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 7V5C12 2.23858 9.76142 0 7 0C4.23858 0 2 2.23858 2 5V7H0V18H14V7H12ZM4 5C4 3.34315 5.34315 2 7 2C8.65685 2 10 3.34315 10 5V7H4V5ZM12 16H2V9H12V16Z"
                fill="#111111"
              />
            </svg>
            <span
              style={{
                fontFamily: "Satoshi, sans-serif",
                fontWeight: 700,
                fontSize: "20px",
                color: "#111111",
                whiteSpace: "nowrap",
              }}
            >
              {scrapeResult.domain.replace(/^www\./, "")}
            </span>
          </div>

          {/* Agency logo */}
          <div
            style={{
              width: "120px",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            {agencyLogo ? (
              <img
                src={agencyLogo}
                alt="Agency"
                style={{ maxHeight: "100%", objectFit: "contain", filter: "brightness(0)" }}
              />
            ) : (
              <span
                style={{
                  fontFamily: "Satoshi, sans-serif",
                  fontWeight: 900,
                  fontSize: "12px",
                  color: "rgba(0,0,0,0.1)",
                }}
              >
                AGENCE
              </span>
            )}
          </div>
        </div>

        {/* ═══ HERO ═══ */}
        <div
          style={{
            flex: 1,
            width: "100%",
            overflow: "hidden",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
          }}
        >
          <EditableImage
            slotKey="frame-3-cover__hero"
            src={activeScreenshots.desktop}
            alt="Desktop hero"
            editable={editable}
            regionSource={activeScreenshots.desktopFull}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
              display: "block",
            }}
          />
        </div>
      </div>
    </div>
  );
};
