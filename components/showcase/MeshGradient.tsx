"use client";

import React, { useRef, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { meshBackground } from "@/lib/meshGradient";
import type { MeshGradient as MeshGradientT } from "@/types";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Fond mesh (base + radial-gradients empilés). Plein cadre, derrière les mockups.
 * `base` override la couleur de fond (base commune du carrousel, projet-global) ;
 * repli sur celle du mesh si absente.
 */
export function MeshBackdrop({ mesh, base }: { mesh: MeshGradientT; base?: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: base ?? mesh.base, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: meshBackground(mesh) }} />
    </div>
  );
}

type HandlesProps = {
  mesh: MeshGradientT;
  frameW: number; // largeur native de la frame → taille des poignées (visibles après scale)
  selectedId: string | null;
  onMovePoint: (id: string, x: number, y: number) => void;
  onSelectPoint: (id: string | null) => void;
  onRemovePoint: (id: string) => void;
};

/**
 * Couche de poignées déplaçables (aperçu uniquement) posée AU-DESSUS des
 * mockups, pour qu'un point même sous une fenêtre reste attrapable. Conteneur
 * transparent aux clics ; seules les poignées captent le pointeur. Drag calé sur
 * getBoundingClientRect → coordonnées 0..1 robustes malgré le transform: scale.
 */
export function MeshHandles({ mesh, frameW, selectedId, onMovePoint, onSelectPoint, onRemovePoint }: HandlesProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number; rect: DOMRect } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const onDown = (e: React.PointerEvent, p: { id: string; x: number; y: number }) => {
    if (!rootRef.current) return;
    e.stopPropagation();
    onSelectPoint(p.id);
    const rect = rootRef.current.getBoundingClientRect();
    const cx = rect.left + p.x * rect.width;
    const cy = rect.top + p.y * rect.height;
    dragRef.current = { id: p.id, offX: e.clientX - cx, offY: e.clientY - cy, rect };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDraggingId(p.id);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    onMovePoint(d.id, clamp01((e.clientX - d.offX - d.rect.left) / d.rect.width), clamp01((e.clientY - d.offY - d.rect.top) / d.rect.height));
  };
  const onUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDraggingId(null);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const handle = Math.round(frameW * 0.026);
  const grip = Math.round(frameW * 0.015);
  const ring = Math.max(2, Math.round(frameW * 0.0028));

  return (
    <div ref={rootRef} data-editor-only="" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 40 }}>
      {mesh.points.map((p) => {
        const selected = selectedId === p.id;
        const show = selected || hoveredId === p.id || draggingId === p.id;
        return (
          <div
            key={p.id}
            onMouseEnter={() => setHoveredId(p.id)}
            onMouseLeave={() => setHoveredId((k) => (k === p.id ? null : k))}
            style={{ position: "absolute", left: `${p.x * 100}%`, top: `${p.y * 100}%`, transform: "translate(-50%, -50%)", pointerEvents: "auto" }}
          >
            <button
              type="button"
              onPointerDown={(e) => onDown(e, p)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              title="Glisser pour déplacer ce point"
              style={{
                width: handle,
                height: handle,
                borderRadius: "50%",
                background: p.color,
                border: `${ring}px solid #fff`,
                boxShadow: selected
                  ? `0 0 0 ${Math.round(frameW * 0.004)}px rgba(0,0,0,0.5), 0 8px 20px rgba(0,0,0,0.4)`
                  : "0 8px 20px rgba(0,0,0,0.4)",
                cursor: draggingId === p.id ? "grabbing" : "grab",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                touchAction: "none",
                opacity: show ? 1 : 0.9,
                transition: "opacity 120ms ease",
              }}
            >
              <GripVertical style={{ width: grip, height: grip, color: "rgba(255,255,255,0.92)" }} strokeWidth={2.5} />
            </button>
            {show && mesh.points.length > 1 && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePoint(p.id);
                }}
                title="Retirer ce point"
                style={{
                  position: "absolute",
                  top: `-${Math.round(frameW * 0.009)}px`,
                  right: `-${Math.round(frameW * 0.009)}px`,
                  width: Math.round(frameW * 0.017),
                  height: Math.round(frameW * 0.017),
                  borderRadius: "50%",
                  background: "rgba(17,17,17,0.9)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                <X style={{ width: Math.round(frameW * 0.011), height: Math.round(frameW * 0.011) }} strokeWidth={3} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
