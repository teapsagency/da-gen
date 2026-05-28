"use client";

import React, { useRef } from "react";
import { useDAStore } from "@/store/daStore";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

// Detect the file format from a data URL or http URL so the hover badge
// reflects what the user actually uploaded (SVG / PNG / WEBP / AVIF / …).
function detectFormat(src: string): string {
  // data: URLs carry the MIME type before the base64 payload.
  if (src.startsWith("data:image/")) {
    const mime = src.slice(11, src.indexOf(";")).toUpperCase();
    if (mime === "JPEG") return "JPG";
    if (mime === "SVG+XML") return "SVG";
    return mime || "IMG";
  }
  // For remote URLs we fall back to the file extension.
  try {
    const url = new URL(src);
    const ext = url.pathname.split(".").pop()?.toUpperCase();
    if (ext && ["SVG", "PNG", "JPG", "JPEG", "WEBP", "AVIF", "GIF", "ICO"].includes(ext)) {
      return ext === "JPEG" ? "JPG" : ext;
    }
  } catch {
    /* not a URL — fall through */
  }
  return "IMG";
}

export const LogoSelector = () => {
  const {
    scrapeResult,
    selectedLogo,
    setSelectedLogo,
    customLogos,
    addCustomLogo,
    removeCustomLogo,
  } = useDAStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Don't render the panel before a scrape — there's nothing to choose from.
  if (!scrapeResult) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    // Cap to keep IndexedDB autosave snappy. Big PNG screenshots can blow up
    // the project payload otherwise.
    const MAX_BYTES = 4 * 1024 * 1024;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} : format non supporté`);
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} : fichier trop lourd (max 4 Mo)`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          addCustomLogo(reader.result);
          // Auto-select the freshly added logo — saves the user a click.
          setSelectedLogo(reader.result);
        }
      };
      reader.onerror = () => toast.error(`Lecture impossible : ${file.name}`);
      reader.readAsDataURL(file);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  // Hide the panel only when there's strictly nothing to show or upload.
  const hasAnyLogo = scrapeResult.logos.length > 0 || customLogos.length > 0;
  // We always want the "+" affordance available, so we render even with 1 logo.
  if (!hasAnyLogo) return null;

  // Render scraped logos first, then customs — customs get a remove (✕) chip
  // on hover so the user can undo a wrong upload without resetting.
  return (
    <div className="flex flex-col gap-4 pt-1">
      <span className="text-xs font-medium text-foreground/40">
        Choisir un logo
      </span>
      <div className="flex flex-wrap gap-2">
        {scrapeResult.logos.map((logo, i) => {
          const format = detectFormat(logo);
          return (
            <button
              key={`scraped-${i}`}
              onClick={() => setSelectedLogo(logo)}
              className={`w-14 h-14 rounded-xl border-2 p-2 transition-all duration-200 flex items-center justify-center bg-white relative group cursor-pointer ${
                selectedLogo === logo
                  ? "border-foreground ring-1 ring-foreground/10"
                  : "border-transparent opacity-40 hover:opacity-100"
              }`}
            >
              <img
                src={logo}
                alt={`Logo ${i + 1}`}
                className="max-w-full max-h-full object-contain"
              />
              <div className="absolute -bottom-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 px-1.5 py-0.5 bg-foreground text-background text-[9px] font-bold rounded-md whitespace-nowrap z-10">
                {format}
              </div>
              {selectedLogo === logo && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-foreground flex items-center justify-center z-10">
                  <Check className="w-2.5 h-2.5 text-background" />
                </div>
              )}
            </button>
          );
        })}

        {customLogos.map((logo, i) => {
          const format = detectFormat(logo);
          return (
            <div key={`custom-${i}`} className="relative group">
              <button
                onClick={() => setSelectedLogo(logo)}
                className={`w-14 h-14 rounded-xl border-2 p-2 transition-all duration-200 flex items-center justify-center bg-white relative cursor-pointer ${
                  selectedLogo === logo
                    ? "border-foreground ring-1 ring-foreground/10"
                    : "border-transparent opacity-40 hover:opacity-100"
                }`}
              >
                <img
                  src={logo}
                  alt={`Logo personnalisé ${i + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
                <div className="absolute -bottom-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 px-1.5 py-0.5 bg-foreground text-background text-[9px] font-bold rounded-md whitespace-nowrap z-10">
                  {format}
                </div>
                {selectedLogo === logo && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-foreground flex items-center justify-center z-10">
                    <Check className="w-2.5 h-2.5 text-background" />
                  </div>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeCustomLogo(logo);
                }}
                title="Supprimer ce logo"
                className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20 hover:bg-red-600"
                aria-label="Supprimer ce logo"
              >
                <X className="w-2.5 h-2.5" strokeWidth={3} />
              </button>
            </div>
          );
        })}

        {/* Upload button — accepts every image format the browser can decode,
            so SVG / PNG / JPG / WEBP / AVIF / GIF / ICO are all welcome. */}
        <button
          onClick={() => inputRef.current?.click()}
          title="Ajouter un logo personnalisé"
          className="w-14 h-14 rounded-xl border-2 border-dashed border-foreground/20 text-foreground/40 hover:border-foreground/40 hover:text-foreground/70 transition-all flex items-center justify-center cursor-pointer"
          aria-label="Ajouter un logo personnalisé"
        >
          <Plus className="w-5 h-5" strokeWidth={2} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.svg,.webp,.avif,.ico"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
};
