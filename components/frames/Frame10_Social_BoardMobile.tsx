import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { computeBoardGrid } from "@/lib/boardLayout";
import { EditableImage } from "@/components/ui/EditableImage";

/**
 * Planche « showcase » MOBILE : cadres téléphone qui débordent des bords,
 * inclinés et décalés (organique, sans chevauchement). Nombre réglable. Chaque
 * téléphone montre une zone différente du site (object-position + pages add.).
 */
const ROT = -15;
const ASPECT = 0.5;
const CANVAS_W = 1080;
const CANVAS_H = 1350;

export const Frame10_Social_BoardMobile = ({ id }: { id?: string }) => {
  const { scrapeResult, bgColor, boardMockups, dropShadow } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  const editable = !id;
  const pool = [
    activeScreenshots.mobile,
    ...(scrapeResult.extraPages || []).map((p) => p.mobile),
  ].filter(Boolean) as string[];

  const N = Math.min(9, Math.max(2, boardMockups));
  const cols = N <= 4 ? 2 : 3;
  const items = computeBoardGrid({
    count: N, cols, aspect: ASPECT, rot: ROT, canvasW: CANVAS_W, canvasH: CANVAS_H,
    gap: 30, bleedX: 0.20, bleedY: 0.52, staggerFactor: 0,
  });

  return (
    <div id={id} style={{ position: "relative", width: `${CANVAS_W}px`, height: `${CANVAS_H}px`, background: bgColor, overflow: "hidden" }}>
      {items.map((it, i) => {
        const region = N > 1 ? Math.round((i / (N - 1)) * 86) : 0;
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
              borderRadius: "26px",
              border: "8px solid #ffffff",
              overflow: "hidden",
              boxShadow: dropShadow ? "0 30px 55px -26px rgba(0, 0, 0, 0.30)" : "none",
              background: "#ffffff",
            }}
          >
            <EditableImage
              slotKey={`frame-10-board-mobile__${i}`}
              src={pool[i % pool.length]}
              alt=""
              editable={editable}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${region}%`, display: "block" }}
            />
          </div>
        );
      })}
    </div>
  );
};
