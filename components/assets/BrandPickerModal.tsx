"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, X, Ban } from "lucide-react";
import { BRAND_LOGOS } from "@/lib/brandLogos";

type Props = {
  open: boolean;
  value?: string;
  onPick: (slug: string | null) => void;
  onClose: () => void;
};

/**
 * Picker de logo de marque (set curé `simple-icons`) avec recherche. Sélectionne
 * un logo (slug) ou « Aucun » pour le retirer. Reset à l'ouverture = remontage
 * via `key` côté parent.
 */
export function BrandPickerModal({ open, value, onPick, onClose }: Props) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const term = q.trim().toLowerCase();
  const results = term
    ? BRAND_LOGOS.filter((b) => b.title.toLowerCase().includes(term) || b.slug.includes(term))
    : BRAND_LOGOS;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <span className="text-[12px] font-bold tracking-wide">Logo techno</span>
          <button onClick={onClose} className="ml-auto text-foreground/40 hover:text-foreground cursor-pointer" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border shrink-0 flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 border border-border rounded-md px-3 py-2 bg-background">
            <Search className="w-3.5 h-3.5 text-foreground/40 shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="shopify, wordpress, elementor…"
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-foreground/30"
            />
          </div>
          <button
            onClick={() => onPick(null)}
            className="text-[11px] font-bold border border-border bg-card px-3 py-2 rounded-md cursor-pointer hover:opacity-70 transition-all flex items-center gap-1.5 whitespace-nowrap"
            title="Retirer le logo"
          >
            <Ban className="w-3.5 h-3.5" /> Aucun
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-3 gap-2">
            {results.map((b) => {
              const active = value === b.slug;
              return (
                <button
                  key={b.slug}
                  onClick={() => onPick(b.slug)}
                  title={b.title}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-all text-left ${
                    active ? "border-foreground bg-foreground/[0.06]" : "border-border hover:bg-foreground/[0.04]"
                  }`}
                >
                  <svg width={18} height={18} viewBox="0 0 24 24" fill={`#${b.hex}`} className="shrink-0">
                    <path d={b.path} />
                  </svg>
                  <span className="text-[12px] font-semibold truncate">{b.title}</span>
                </button>
              );
            })}
            {results.length === 0 && (
              <p className="col-span-3 text-[11px] text-foreground/35 text-center py-10">Aucune marque.</p>
            )}
          </div>
        </div>

        <div className="px-4 py-2 border-t border-border text-[10px] text-foreground/35 shrink-0">
          Logos fournis par Simple Icons.
        </div>
      </div>
    </div>
  );
}
