"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Download, Loader2 } from "lucide-react";
import { useDAStore } from "@/store/daStore";

/**
 * Bouton d'export avec choix de format PNG/JPEG. Le clic principal exporte dans
 * le format courant (réglage global `exportFormat`) ; le chevron ouvre un menu
 * pour choisir PNG ou JPEG. Le choix met à jour le réglage global (Zustand set
 * synchrone → les fonctions d'export liront ce format juste après) puis exporte,
 * ce qui garde une seule source de vérité, partagée avec le pack et la sidebar.
 */
export function ExportButton({
  onExport,
  busy,
}: {
  /** Lance l'export (le format courant est déjà appliqué au store). */
  onExport: () => Promise<void> | void;
  /** État « export en cours » géré par le parent. */
  busy: boolean;
}) {
  const format = useDAStore((s) => s.exportFormat);
  const setFormat = useDAStore((s) => s.setExportFormat);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const label = format === "jpeg" ? "JPEG" : "PNG";

  const exportAs = async (f: "png" | "jpeg") => {
    setOpen(false);
    setFormat(f); // synchrone : l'export ci-dessous capture déjà dans ce format
    await onExport();
  };

  return (
    <div ref={ref} className="relative flex items-stretch">
      <button
        onClick={() => onExport()}
        disabled={busy}
        className="text-[11px] font-bold border border-border bg-card pl-3 pr-2.5 py-1.5 rounded-l-md flex items-center gap-2 cursor-pointer disabled:opacity-30 transition-all hover:opacity-70 active:scale-[0.97]"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        <span>{busy ? "Export..." : `Export ${label}`}</span>
      </button>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="border border-l-0 border-border bg-card px-1.5 rounded-r-md flex items-center cursor-pointer disabled:opacity-30 transition-all hover:opacity-70"
        title="Choisir le format d'export"
      >
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[8rem] bg-card border border-border rounded-md shadow-lg overflow-hidden py-1">
          {(["png", "jpeg"] as const).map((f) => (
            <button
              key={f}
              onClick={() => exportAs(f)}
              className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-foreground cursor-pointer transition-colors hover:bg-foreground/10 flex items-center gap-2"
            >
              <Check className={`w-3 h-3 ${format === f ? "opacity-100" : "opacity-0"}`} />
              <span>{f === "png" ? "PNG" : "JPEG"}</span>
              <span className="ml-auto text-[9px] font-medium text-foreground/30">
                {f === "png" ? "transparent" : "léger"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
