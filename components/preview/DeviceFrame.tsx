"use client";

import React from "react";

export type DeviceKind = "mobile" | "tablet" | "desktop";

const NATIVE: Record<DeviceKind, number> = { mobile: 390, tablet: 834, desktop: 1280 };
const LABEL: Record<DeviceKind, string> = { mobile: "Mobile", tablet: "Tablette", desktop: "Desktop" };

/**
 * Cadre d'appareil. Rend ses enfants à la largeur native de l'appareil puis
 * applique `transform: scale(displayWidth / native)`. La hauteur réelle est
 * mesurée (ResizeObserver) et réservée à l'échelle pour ne pas casser le flux.
 */
export function DeviceFrame({
  device,
  displayWidth,
  children,
}: {
  device: DeviceKind;
  displayWidth: number;
  children: React.ReactNode;
}) {
  const native = NATIVE[device];
  const scale = displayWidth / native;
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [h, setH] = React.useState(0);
  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setH(el.offsetHeight));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const radius = device === "mobile" ? 38 : device === "tablet" ? 22 : 10;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">{LABEL[device]}</span>
      <div style={{ width: displayWidth, height: h * scale }}>
        <div ref={innerRef} style={{ width: native, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: radius,
              overflow: "hidden",
              background: device === "desktop" ? "#fafafa" : "#000",
              padding: device === "mobile" ? 8 : device === "tablet" ? 10 : 0,
            }}
          >
            {device === "desktop" && (
              <div style={{ height: 34, background: "#ececec", display: "flex", alignItems: "center", gap: 6, padding: "0 12px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
              </div>
            )}
            <div
              style={{
                background: device === "desktop" ? "#fafafa" : "#fff",
                borderRadius: device === "mobile" ? 30 : device === "tablet" ? 14 : 0,
                overflow: "hidden",
                display: "flex",
                justifyContent: "center",
                padding: device === "mobile" ? 0 : "24px 16px",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { NATIVE as DEVICE_NATIVE_WIDTH };
