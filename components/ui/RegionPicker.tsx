"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

/** Un aperçu en direct (une orientation : desktop ou mobile). */
export type PreviewSpec = { label: string; source: string; aspect: number };

type Props = {
  /** Page entière servant de référence à la bande de navigation (desktop). */
  navSource: string;
  /** Ratio de la bande de navigation (= ratio du recadrage desktop). */
  navAspect: number;
  /** Aperçus affichés à droite, pilotés par le MÊME curseur (desktop + mobile). */
  previews: PreviewSpec[];
  /** Position verticale courante (0 = haut, 1 = bas) pour pré-positionner la bande. */
  initialY?: number;
  /** Reçoit la position verticale normalisée choisie (0..1). */
  onConfirm: (regionY: number) => void;
  onClose: () => void;
};

/**
 * Sélecteur de zone (global). À gauche la page entière (petite) avec une bande
 * blanche qu'on glisse verticalement ; à droite un ou plusieurs aperçus en
 * direct (desktop ET mobile) de la zone sélectionnée. La position verticale
 * (0..1) est UNIQUE et partagée : elle s'applique partout en object-position.
 * Comme desktop et mobile n'ont pas la même hauteur ni le même layout, la même
 * position tombe sur une section différente — d'où les deux aperçus côte à côte.
 */
export function RegionPicker({ navSource, navAspect, previews, initialY = 0, onConfirm, onClose }: Props) {
  // Panneau de navigation (page entière) ajusté en hauteur.
  const [nav, setNav] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [top, setTop] = useState(0); // haut de la bande, en px d'affichage nav

  const bandH = navAspect > 0 && nav.w ? nav.w / navAspect : nav.h;
  const maxTop = Math.max(0, nav.h - bandH);
  const clampedTop = Math.min(Math.max(0, top), maxTop);
  const regionY = maxTop > 0 ? clampedTop / maxTop : 0;

  // Hauteur partagée des aperçus (chacun cappé en largeur pour le paysage).
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const previewH = Math.min(340, vh * 0.44);
  const previewMaxW = 440;
  const boxFor = (aspect: number) => {
    let w = aspect * previewH;
    let h = previewH;
    if (w > previewMaxW) { w = previewMaxW; h = previewMaxW / aspect; }
    return { w, h };
  };

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    const navH = vh * 0.72;
    const dw = w * (navH / h);
    const dh = navH;
    const bH = navAspect > 0 ? dw / navAspect : dh;
    setNav({ w: dw, h: dh });
    setTop(initialY * Math.max(0, dh - bH));
  };

  // Drag via listeners window → la bande suit le curseur même s'il en sort.
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startTop = clampedTop;
    const max = maxTop;
    const move = (ev: PointerEvent) => setTop(Math.max(0, Math.min(max, startTop + (ev.clientY - startY))));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const overlay = (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl"
        style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", maxWidth: "94vw", maxHeight: "92vh", overflow: "auto" }}
      >
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs font-bold uppercase tracking-widest text-foreground/50">Choisir la zone</span>
          <span className="text-[11px] text-foreground/40">Glisse la bande — appliqué à tous les visuels (desktop &amp; mobile)</span>
        </div>

        <div style={{ display: "flex", gap: "18px", alignItems: "flex-start" }}>
          {/* Navigation : page entière + bande */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Page</span>
            <div
              style={{ position: "relative", width: nav.w || "auto", height: nav.h || "auto", borderRadius: "6px", overflow: "hidden", userSelect: "none", touchAction: "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={navSource} alt="" onLoad={onImgLoad} draggable={false} style={{ display: "block", width: nav.w || "auto", height: nav.h || "auto" }} />
              {nav.w > 0 && (
                <>
                  <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: clampedTop, background: "rgba(0,0,0,0.55)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", left: 0, right: 0, top: clampedTop + bandH, bottom: 0, background: "rgba(0,0,0,0.55)", pointerEvents: "none" }} />
                  <div
                    onPointerDown={onPointerDown}
                    style={{ position: "absolute", left: 0, width: nav.w, top: clampedTop, height: bandH, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.4)", cursor: "grab", boxSizing: "border-box" }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Aperçus en direct (desktop + mobile), même position partagée */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Aperçu</span>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-end" }}>
              {previews.map((p) => {
                const box = boxFor(p.aspect);
                return (
                  <div key={p.label} className="flex flex-col gap-1.5 items-center">
                    <div style={{ width: box.w, height: box.h, borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border, rgba(0,0,0,0.1))", background: "#000" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.source} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${regionY * 100}%`, display: "block" }} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">{p.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer transition-all hover:opacity-70 active:scale-[0.97] text-foreground/60"
          >
            <X className="w-3 h-3" /> Annuler
          </button>
          <button
            onClick={() => onConfirm(regionY)}
            className="text-[11px] font-bold bg-foreground text-background px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer transition-all hover:opacity-80 active:scale-[0.97]"
          >
            <Check className="w-3 h-3" /> Appliquer
          </button>
        </div>
      </div>
    </div>
  );

  // Portail vers <body> : indispensable car la popup est rendue dans une frame
  // scalée (transform), et un position:fixed sous un ancêtre transformé se cale
  // sur cet ancêtre, pas sur le viewport. Le portail la sort de l'asset.
  return typeof document !== "undefined" ? createPortal(overlay, document.body) : null;
}
