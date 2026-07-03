import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { computeBoardGrid } from "@/lib/boardLayout";
import { EditableImage } from "@/components/ui/EditableImage";
import { MeshBackdrop, MeshHandles } from "@/components/showcase/MeshGradient";
import type { ShowcaseSlide } from "@/types";

const CANVAS_W = 1920;
const CANVAS_H = 1080; // 16:9

/**
 * Une slide « Showcase » 16:9 : 1 à N mockups (fenêtre desktop ou téléphone) qui
 * flottent — coins arrondis, léger tilt, ombre douce — sur un FOND MESH GRADIENT
 * propre à la slide (tiré de la charte du site). Contours épurés (pas de barre
 * navigateur / bezel) pour coller aux références.
 *
 * Réutilise la logique de planche `computeBoardGrid` (comme 09/10). Sans handlers
 * d'édition = instance d'export (id posé) ; avec = aperçu éditable (poignées mesh).
 */
export const FrameShowcase = ({
  slide,
  id,
  selectedPointId = null,
  onSelectPoint,
  onMovePoint,
  onRemovePoint,
  onRegionChange,
}: {
  slide: ShowcaseSlide;
  id?: string;
  selectedPointId?: string | null;
  onSelectPoint?: (id: string | null) => void;
  onMovePoint?: (pointId: string, x: number, y: number) => void;
  onRemovePoint?: (pointId: string) => void;
  onRegionChange?: (regionY: number) => void;
}) => {
  const { scrapeResult, dropShadow, showcaseMeshBase } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  const editable = !id;
  const { mesh, device } = slide;
  const isDesktop = device === "desktop";
  const N = Math.min(isDesktop ? 4 : 5, Math.max(1, slide.count));
  // Inclinaison pilotée par la slide (0 = droit, comme les références desktop).
  const rot = slide.tilt ?? 0;

  // Capture PLEINE PAGE en desktop → le curseur de zone balaie tout le site.
  const extraFull = (scrapeResult.extraPages || []).map((p) => p.desktopFull).filter(Boolean) as string[];
  const extraMobile = (scrapeResult.extraPages || []).map((p) => p.mobile).filter(Boolean) as string[];
  const pool = isDesktop
    ? [activeScreenshots.desktopFull, ...extraFull]
    : [activeScreenshots.mobile, ...extraMobile];

  const cfg = isDesktop
    ? { aspect: 1.5, cols: N === 1 ? 1 : 2, gap: 46, bleedX: 0.0, bleedY: -0.14 }
    : { aspect: 0.49, cols: Math.min(N, 3), gap: 46, bleedX: 0.0, bleedY: -0.04 };

  const rawItems = computeBoardGrid({
    count: N, cols: cfg.cols, aspect: cfg.aspect, rot, canvasW: CANVAS_W, canvasH: CANVAS_H,
    gap: cfg.gap, bleedX: cfg.bleedX, bleedY: cfg.bleedY, staggerFactor: 0,
  });

  // Téléphones plus petits que les fenêtres desktop : on rétrécit les mockups
  // mobiles vers le centre (même composition, juste plus compacte).
  const sizeScale = isDesktop ? 1 : 0.78;
  const items = sizeScale === 1
    ? rawItems
    : rawItems.map((it) => {
        const cx = CANVAS_W / 2, cy = CANVAS_H / 2;
        const nw = it.w * sizeScale, nh = it.h * sizeScale;
        return {
          x: cx + (it.x + it.w / 2 - cx) * sizeScale - nw / 2,
          y: cy + (it.y + it.h / 2 - cy) * sizeScale - nh / 2,
          w: nw,
          h: nh,
        };
      });

  // Décalage vertical monotone (escalier) : chaque mockup un cran plus haut/bas
  // que le précédent. >0 descend de gauche à droite, <0 monte. Mobile surtout.
  // Mis à l'échelle des mockups pour garder le même ratio visuel qu'avant.
  const stagStep = isDesktop ? 0 : (slide.stagger ?? 0) * CANVAS_H * 0.16 * sizeScale;
  const yOffset = (i: number) => stagStep * (i - (N - 1) / 2);

  return (
    <div id={id} style={{ position: "relative", width: `${CANVAS_W}px`, height: `${CANVAS_H}px`, overflow: "hidden" }}>
      {/* Fond mesh (base commune projet-global) */}
      <MeshBackdrop mesh={mesh} base={showcaseMeshBase} />

      {/* Mockups flottants */}
      {items.map((it, i) => {
        const { w } = it;
        // Zone de capture : base réglable (regionY) + étalement autour pour que
        // des mockups multiples montrent des parties différentes du site.
        const basePct = Math.min(100, Math.max(0, (slide.regionY ?? 0) * 100));
        const spread = N > 1 ? (isDesktop ? 55 : 68) : 0;
        const region = Math.min(100, Math.max(0, N > 1 ? basePct + (i / (N - 1) - 0.5) * spread : basePct));
        const radius = Math.round(w * (isDesktop ? 0.022 : 0.062));
        const border = Math.max(1, Math.round(w * 0.0022));
        const shadow = dropShadow
          ? `0 ${Math.round(w * 0.045)}px ${Math.round(w * 0.07)}px -${Math.round(w * 0.03)}px rgba(0,0,0,0.42)`
          : "none";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${it.x}px`,
              top: `${it.y + yOffset(i)}px`,
              width: `${it.w}px`,
              height: `${it.h}px`,
              transform: `rotate(${rot}deg)`,
              borderRadius: `${radius}px`,
              overflow: "hidden",
              background: "#fff",
              border: `${border}px solid rgba(255,255,255,0.55)`,
              boxSizing: "border-box",
              boxShadow: shadow,
            }}
          >
            <EditableImage
              slotKey={`frame-11-showcase__${slide.id}__${device}__${i}`}
              src={pool[i % pool.length]}
              alt=""
              editable={editable}
              // Bouton « Zone » sur l'image (comme les autres visuels) écrivant la
              // zone de CETTE slide ; l'object-position est géré ici (étalement sur
              // N mockups), donc EditableImage ne l'applique pas (applyRegion=false).
              regionSource={pool[i % pool.length]}
              regionValue={slide.regionY ?? 0}
              onRegionChange={onRegionChange}
              regionDevice={device}
              applyRegion={false}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${region}%`, display: "block" }}
            />
          </div>
        );
      })}

      {/* Couche de poignées (aperçu) — au-dessus des mockups */}
      {editable && onSelectPoint && onMovePoint && onRemovePoint && (
        <MeshHandles
          mesh={mesh}
          frameW={CANVAS_W}
          selectedId={selectedPointId}
          onMovePoint={onMovePoint}
          onSelectPoint={onSelectPoint}
          onRemovePoint={onRemovePoint}
        />
      )}
    </div>
  );
};
