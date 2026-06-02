import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { computeBoardGrid } from "@/lib/boardLayout";
import { BrowserNavBar } from "./BrowserNavBar";
import { EditableImage } from "@/components/ui/EditableImage";

/**
 * Planche « showcase » DESKTOP : fenêtres navigateur en grille décalée (même
 * logique organique que la planche mobile, sans chevauchement). Pour pouvoir
 * afficher plus de 3 fenêtres distinctes sans doublon, on puise dans la capture
 * PLEINE PAGE (desktopFull) qu'on montre à différentes profondeurs de scroll
 * (object-position) + les pages additionnelles. Nombre réglable.
 */
const ROT = -14;
const ASPECT = 1.34; // fenêtres plus hautes (était 1.5)
const CANVAS_W = 1080;
const CANVAS_H = 1350;

export const Frame9_Social_BoardDesktop = ({ id }: { id?: string }) => {
  const { scrapeResult, bgColor, agencyLogo, boardMockups, dropShadow } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  const editable = !id;
  const domain = scrapeResult.domain.replace(/^www\./, "");
  const pool = [
    activeScreenshots.desktopFull,
    ...(scrapeResult.extraPages || []).map((p) => p.desktopFull),
  ].filter(Boolean) as string[];

  const N = Math.min(9, Math.max(2, boardMockups));
  const cols = 2; // fenêtres larges → 2 colonnes
  const items = computeBoardGrid({
    count: N, cols, aspect: ASPECT, rot: ROT, canvasW: CANVAS_W, canvasH: CANVAS_H,
    gap: 34, bleedX: 0.22, bleedY: 0.48, staggerFactor: 0,
  });

  return (
    <div id={id} style={{ position: "relative", width: `${CANVAS_W}px`, height: `${CANVAS_H}px`, background: bgColor, overflow: "hidden" }}>
      {items.map((it, i) => {
        const region = N > 1 ? Math.round((i / (N - 1)) * 82) : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${it.x}px`,
              top: `${it.y}px`,
              width: `${it.w}px`,
              height: `${it.h}px`,
              transform: `rotate(${ROT}deg)`,
              borderRadius: "16px",
              overflow: "hidden",
              background: "#ffffff",
              boxShadow: dropShadow ? "0 35px 60px -28px rgba(0, 0, 0, 0.30)" : "none",
              display: "flex",
              flexDirection: "column",
              padding: "11px",
              gap: "8px",
            }}
          >
            <BrowserNavBar domain={domain} agencyLogo={agencyLogo} dotSize={8} urlFontSize="10px" />
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden", borderRadius: "6px" }}>
              <EditableImage
                slotKey={`frame-9-board-desktop__${i}`}
                src={pool[i % pool.length]}
                alt=""
                editable={editable}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${region}%`, display: "block" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
