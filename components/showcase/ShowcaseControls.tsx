"use client";

import React from "react";
import { Monitor, Smartphone, Plus, Trash2, LayoutGrid } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { seedMesh, newMeshPointId } from "@/lib/meshGradient";
import type { MeshGradient, ShowcaseSlide } from "@/types";

const seg = (active: boolean) =>
  `px-2.5 py-1 cursor-pointer transition-colors flex items-center gap-1.5 text-[11px] font-bold ${
    active ? "bg-foreground text-background" : "text-foreground/50 hover:bg-foreground/10"
  }`;

const groupCls = "flex items-center gap-2 border border-border bg-card px-3 py-1.5 rounded-md";
const labelCls = "text-[10px] font-bold text-foreground/40 whitespace-nowrap uppercase tracking-wider";

/**
 * Réglages d'une slide Showcase : appareil, nombre de mockups, agencement du
 * dégradé, couleur de base, et édition du point mesh sélectionné (couleur / rayon
 * / suppression). Toute modif remonte via `onChange(patch)` ; la sélection de
 * point est partagée avec la couche de poignées via `selectedPointId`/`onSelect`.
 */
export function ShowcaseControls({
  slide,
  onChange,
  selectedPointId,
  onSelect,
}: {
  slide: ShowcaseSlide;
  onChange: (patch: Partial<ShowcaseSlide>) => void;
  selectedPointId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const selectedColors = useDAStore((s) => s.selectedColors);
  const scrapeResult = useDAStore((s) => s.scrapeResult);
  const showcaseMeshBase = useDAStore((s) => s.showcaseMeshBase);
  const setShowcaseMeshBase = useDAStore((s) => s.setShowcaseMeshBase);
  const palette = selectedColors.length ? selectedColors : scrapeResult?.colors.map((c) => c.hex) ?? [];

  const mesh = slide.mesh;
  const setMesh = (m: MeshGradient) => onChange({ mesh: m });
  const sel = mesh.points.find((p) => p.id === selectedPointId) ?? null;
  const maxCount = slide.device === "desktop" ? 4 : 5;

  const updatePoint = (id: string, patch: Partial<(typeof mesh.points)[number]>) =>
    setMesh({ ...mesh, points: mesh.points.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  return (
    <>
      {/* Appareil */}
      <div className="flex items-center border border-border rounded-md overflow-hidden">
        <button className={seg(slide.device === "desktop")} onClick={() => onChange({ device: "desktop" })} title="Fenêtres desktop">
          <Monitor className="w-3.5 h-3.5" /> Desktop
        </button>
        <button className={seg(slide.device === "mobile")} onClick={() => onChange({ device: "mobile" })} title="Téléphones">
          <Smartphone className="w-3.5 h-3.5" /> Mobile
        </button>
      </div>

      {/* Nombre de mockups */}
      <div className={groupCls}>
        <span className={labelCls}>Mockups</span>
        <button
          onClick={() => onChange({ count: Math.max(1, slide.count - 1) })}
          disabled={slide.count <= 1}
          className="w-5 h-5 rounded flex items-center justify-center text-foreground/70 hover:bg-foreground/10 disabled:opacity-30 cursor-pointer text-base font-bold leading-none"
        >
          −
        </button>
        <span className="text-[11px] font-bold text-foreground w-3 text-center tabular-nums">{Math.min(slide.count, maxCount)}</span>
        <button
          onClick={() => onChange({ count: Math.min(maxCount, slide.count + 1) })}
          disabled={slide.count >= maxCount}
          className="w-5 h-5 rounded flex items-center justify-center text-foreground/70 hover:bg-foreground/10 disabled:opacity-30 cursor-pointer text-base font-bold leading-none"
        >
          +
        </button>
      </div>

      {/* Inclinaison des mockups */}
      <div className={groupCls}>
        <span className={labelCls}>Inclinaison</span>
        <input
          type="range"
          min={-15}
          max={15}
          step={1}
          value={slide.tilt ?? 0}
          onChange={(e) => onChange({ tilt: Number(e.target.value) })}
          className="w-20 h-1 accent-foreground cursor-pointer"
          title="Inclinaison des mockups (0 = droit)"
        />
        <span className="text-[10px] font-bold text-foreground/40 w-6 text-center tabular-nums">{slide.tilt ?? 0}°</span>
      </div>

      {/* Décalage en escalier (surtout mobile) */}
      {slide.device === "mobile" && slide.count > 1 && (
        <div className={groupCls}>
          <span className={labelCls}>Escalier</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.1}
            value={slide.stagger ?? 0}
            onChange={(e) => onChange({ stagger: Number(e.target.value) })}
            className="w-20 h-1 accent-foreground cursor-pointer"
            title="Décalage vertical des mockups (monte ↔ descend)"
          />
        </div>
      )}

      {/* Agencement du dégradé (re-seed depuis la palette) */}
      <div className={groupCls}>
        <span className={labelCls}>Dégradé</span>
        <LayoutGrid className="w-3.5 h-3.5 text-foreground/40" />
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            onClick={() => { setMesh(seedMesh(palette, i)); onSelect(null); }}
            title={`Agencement ${i + 1}`}
            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-foreground/70 hover:bg-foreground/10 cursor-pointer tabular-nums"
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Couleur de base — COMMUNE à toutes les slides (projet-global) */}
      <label className={`${groupCls} cursor-pointer`} title="Couleur de fond du dégradé — commune à toutes les slides">
        <span className={labelCls}>Base</span>
        <span className="relative w-6 h-6 rounded-md border border-border overflow-hidden">
          <span className="block w-full h-full" style={{ background: showcaseMeshBase }} />
          <input
            type="color"
            value={showcaseMeshBase}
            onChange={(e) => setShowcaseMeshBase(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </span>
      </label>

      {/* + Point */}
      <button
        onClick={() => {
          const id = newMeshPointId();
          const color = mesh.accent ?? mesh.points[0]?.color ?? "#6b7280";
          setMesh({ ...mesh, points: [...mesh.points, { id, color, x: 0.5, y: 0.5, radius: 0.6 }] });
          onSelect(id);
        }}
        className="text-[11px] font-bold border border-border bg-card px-2.5 py-1.5 rounded-md cursor-pointer hover:opacity-70 transition-all flex items-center gap-1.5"
        title="Ajouter un point de couleur (au centre)"
      >
        <Plus className="w-3.5 h-3.5" /> Point
      </button>

      {/* Éditeur du point sélectionné */}
      {sel ? (
        <div className={groupCls}>
          <span className={labelCls}>Point</span>
          {/* Couleur */}
          <label className="relative w-6 h-6 rounded-md border border-border overflow-hidden cursor-pointer" title="Couleur du point">
            <span className="block w-full h-full" style={{ background: sel.color }} />
            <input
              type="color"
              value={sel.color}
              onChange={(e) => updatePoint(sel.id, { color: e.target.value })}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
          {/* Swatches palette (recolore le point) */}
          {palette.slice(0, 4).map((c) => (
            <button
              key={c}
              onClick={() => updatePoint(sel.id, { color: c })}
              className="w-4 h-4 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform"
              style={{ background: c }}
              title={c}
            />
          ))}
          {/* Rayon */}
          <span className="text-[10px] font-bold text-foreground/40 ml-1">Rayon</span>
          <input
            type="range"
            min={0.15}
            max={1.3}
            step={0.02}
            value={sel.radius}
            onChange={(e) => updatePoint(sel.id, { radius: Number(e.target.value) })}
            className="w-24 h-1 accent-foreground cursor-pointer"
          />
          {/* Supprimer */}
          <button
            onClick={() => { setMesh({ ...mesh, points: mesh.points.filter((p) => p.id !== sel.id) }); onSelect(null); }}
            disabled={mesh.points.length <= 1}
            className="text-foreground/30 hover:text-red-500 cursor-pointer transition-colors disabled:opacity-30"
            title="Retirer ce point"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <span className="text-[10px] font-medium text-foreground/35 self-center">
          Clique un point du dégradé pour l&apos;éditer
        </span>
      )}
    </>
  );
}
