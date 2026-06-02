"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, Check, ImagePlus } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import type { PreviewImageRef } from "@/types";
import { listScreenshotSources, FRAME_SOURCES } from "./imageSources";
import { PreviewImage } from "./PreviewImage";

type PickItem = { id: string; ref: PreviewImageRef; label: string; thumb?: string };

function PickGrid({ items, selected, onToggle }: { items: PickItem[]; selected: Set<string>; onToggle: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((it) => {
        const sel = selected.has(it.id);
        return (
          <button
            key={it.id}
            onClick={() => onToggle(it.id)}
            aria-pressed={sel}
            className={`group relative flex flex-col gap-1.5 text-left cursor-pointer rounded-xl p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
              sel ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.03]"
            }`}
          >
            <div
              className={`relative w-full aspect-square rounded-lg overflow-hidden border bg-foreground/[0.03] transition-colors ${
                sel ? "border-foreground ring-2 ring-foreground/30" : "border-border"
              }`}
            >
              {it.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.thumb} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <PreviewImage refItem={it.ref} fit="cover" />
              )}
              <span
                className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  sel ? "bg-foreground border-foreground text-background" : "bg-white/85 border-black/10 text-transparent group-hover:border-black/25"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </span>
            </div>
            <span className="text-[11px] font-medium text-foreground/60 truncate px-0.5">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AssetPickerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const scrapeResult = useDAStore((s) => s.scrapeResult);
  const setImages = useDAStore((s) => s.setPreviewImages);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => { if (open) setSelected(new Set()); }, [open]);

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
    id: s.ref.kind === "screenshot" ? `shot:${s.ref.key}` : s.label,
    ref: s.ref,
    label: s.label,
    thumb: s.thumb,
  }));
  const frames: PickItem[] = FRAME_SOURCES.map((s) => ({
    id: s.ref.kind === "frame" ? `frame:${s.ref.frame}` : s.label,
    ref: s.ref,
    label: s.label,
  }));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const confirm = () => {
    const all = [...shots, ...frames];
    const refs = all.filter((it) => selected.has(it.id)).map((it) => it.ref);
    if (refs.length) setImages([...useDAStore.getState().previewImages, ...refs]);
    onClose();
  };

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
            <p className="text-[11px] text-foreground/40 mt-0.5">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</p>
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
              <PickGrid items={shots} selected={selected} onToggle={toggle} />
            </section>
          )}
          <section className="flex flex-col gap-2.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Visuels sociaux</span>
            <PickGrid items={frames} selected={selected} onToggle={toggle} />
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">
          <button onClick={onClose} className="h-9 px-4 text-[12px] font-semibold rounded-lg border border-border text-foreground/70 hover:bg-foreground/5 cursor-pointer transition-colors">
            Annuler
          </button>
          <button
            onClick={confirm}
            disabled={selected.size === 0}
            className="h-9 px-4 text-[12px] font-semibold rounded-lg bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 transition-opacity"
          >
            <ImagePlus className="w-4 h-4" />
            Ajouter{selected.size ? ` (${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
