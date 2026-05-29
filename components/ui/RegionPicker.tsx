"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

type Props = {
  /** Image pleine page (dataURL ou URL). */
  source: string;
  /** Ratio de la zone (largeur / hauteur) = ratio du slot. */
  aspect: number;
  /** Position verticale courante (0 = haut, 1 = bas) pour pré-positionner la bande. */
  initialY?: number;
  /** Reçoit la position verticale normalisée choisie (0..1). */
  onConfirm: (regionY: number) => void;
  onClose: () => void;
};

/**
 * Sélecteur de zone (global). Deux panneaux : à gauche la page entière (petite)
 * avec une bande blanche qu'on glisse verticalement ; à droite un GRAND aperçu
 * en direct de la zone sélectionnée (ce que les visuels afficheront). Renvoie la
 * position verticale normalisée (0..1), appliquée en object-position partout.
 */
export function RegionPicker({ source, aspect, initialY = 0, onConfirm, onClose }: Props) {
  // Panneau de navigation (page entière) ajusté en hauteur.
  const [nav, setNav] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [top, setTop] = useState(0); // haut de la bande, en px d'affichage nav

  const bandH = aspect > 0 && nav.w ? nav.w / aspect : nav.h;
  const maxTop = Math.max(0, nav.h - bandH);
  const clampedTop = Math.min(Math.max(0, top), maxTop);
  const regionY = maxTop > 0 ? clampedTop / maxTop : 0;

  // Aperçu : grand, au ratio de la zone.
  const previewW = Math.min(460, typeof window !== "undefined" ? window.innerWidth * 0.4 : 460);
  const previewH = aspect > 0 ? previewW / aspect : previewW;

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;
    const navH = (typeof window !== "undefined" ? window.innerHeight : 800) * 0.78;
    const dw = w * (navH / h);
    const dh = navH;
    const bH = aspect > 0 ? dw / aspect : dh;
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
        style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", maxWidth: "94vw" }}
      >
        <div className="flex items-center justify-between gap-6">
          <span className="text-xs font-bold uppercase tracking-widest text-foreground/50">Choisir la zone</span>
          <span className="text-[11px] text-foreground/40">Glisse la bande — appliqué à tous les visuels</span>
        </div>

        <div style={{ display: "flex", gap: "18px", alignItems: "flex-start" }}>
          {/* Navigation : page entière + bande */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Page</span>
            <div
              style={{ position: "relative", width: nav.w || "auto", height: nav.h || "auto", borderRadius: "6px", overflow: "hidden", userSelect: "none", touchAction: "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={source} alt="" onLoad={onImgLoad} draggable={false} style={{ display: "block", width: nav.w || "auto", height: nav.h || "auto" }} />
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

          {/* Aperçu en direct (grand) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Aperçu</span>
            <div style={{ width: previewW, height: previewH, borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border, rgba(0,0,0,0.1))", background: "#000" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={source} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${regionY * 100}%`, display: "block" }} />
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
