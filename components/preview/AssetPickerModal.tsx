"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, Plus } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import type { PreviewImageRef } from "@/types";
import { listScreenshotSources, FRAME_SOURCES } from "./imageSources";
import { PreviewImage } from "./PreviewImage";

type PickItem = { id: string; ref: PreviewImageRef; label: string; thumb?: string };

const refKey = (r: PreviewImageRef): string =>
  r.kind === "screenshot" ? `shot:${r.key}` : r.kind === "frame" ? `frame:${r.frame}` : "upload";

/**
 * Carte d'asset cliquable. `div role=button` (et non `<button>`) : les frames
 * rendues en live contiennent leurs propres `<button>` (EditableImage), interdits
 * dans un bouton. Chaque clic ajoute un exemplaire (doublons possibles).
 */
function PickCard({ item, count, onAdd }: { item: PickItem; count: number; onAdd: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onAdd}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onAdd(); } }}
      title={`Ajouter — ${item.label}`}
      className="group relative flex flex-col gap-1.5 text-left cursor-pointer rounded-xl p-1.5 hover:bg-foreground/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 transition-colors"
    >
      <div
        className={`relative w-full aspect-square rounded-lg overflow-hidden border bg-foreground/[0.03] transition-colors ${
          count > 0 ? "border-foreground/40" : "border-border"
        }`}
      >
        {item.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <PreviewImage refItem={item.ref} fit="cover" />
        )}
        {/* Overlay d'ajout */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
          <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 text-black text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </span>
        </span>
        {/* Compteur d'exemplaires dans le carrousel */}
        {count > 0 && (
          <span className="absolute top-2 right-2 min-w-5 h-5 px-1.5 rounded-full bg-foreground text-background text-[11px] font-bold flex items-center justify-center">
            ×{count}
          </span>
        )}
      </div>
      <span className="text-[11px] font-medium text-foreground/60 truncate px-0.5">{item.label}</span>
    </div>
  );
}

export function AssetPickerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const scrapeResult = useDAStore((s) => s.scrapeResult);
  const images = useDAStore((s) => s.previewImages);
  const setImages = useDAStore((s) => s.setPreviewImages);
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const shots: PickItem[] = listScreenshotSources(scrapeResult).map((s) => ({
    id: refKey(s.ref), ref: s.ref, label: s.label, thumb: s.thumb,
  }));
  const frames: PickItem[] = FRAME_SOURCES.map((s) => ({ id: refKey(s.ref), ref: s.ref, label: s.label }));

  // Nombre d'exemplaires de chaque asset déjà dans le carrousel.
  const counts: Record<string, number> = {};
  for (const img of images) counts[refKey(img)] = (counts[refKey(img)] ?? 0) + 1;

  const addOne = (ref: PreviewImageRef) => setImages([...useDAStore.getState().previewImages, ref]);

  const renderGrid = (items: PickItem[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((it) => (
        <PickCard key={it.id} item={it} count={counts[it.id] ?? 0} onAdd={() => addOne(it.ref)} />
      ))}
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-label="Choisir les visuels">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-5xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col outline-none animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Choisir les visuels</h2>
            <p className="text-[11px] text-foreground/40 mt-0.5">Clique pour ajouter — re-clique pour ajouter un autre exemplaire.</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 rounded-lg flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-foreground/5 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {shots.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Captures du site</span>
              {renderGrid(shots)}
            </section>
          )}
          <section className="flex flex-col gap-2.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Visuels sociaux</span>
            {renderGrid(frames)}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border shrink-0">
          <span className="text-[12px] text-foreground/50">
            Carrousel : <span className="font-semibold text-foreground/80">{images.length}</span> visuel{images.length > 1 ? "s" : ""}
          </span>
          <button onClick={onClose} className="h-9 px-5 text-[12px] font-semibold rounded-lg bg-foreground text-background cursor-pointer transition-opacity hover:opacity-90">
            Terminé
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
