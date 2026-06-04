"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, X, ImageOff, ImagePlus } from "lucide-react";
import { searchStock, StockUnavailableError, type StockPhoto } from "@/lib/stock";

type Props = {
  open: boolean;
  initialQuery: string;
  onPick: (photo: StockPhoto) => void;
  onClose: () => void;
  /** Remonte la requête tapée pour la garder sur l'asset. */
  onQueryChange?: (q: string) => void;
  /** Import manuel d'un fichier image. */
  onUpload?: (file: File) => void;
};

/**
 * Banque d'images : recherche Pexels (grille) + import manuel. Choisir une photo
 * renvoie le StockPhoto au parent (qui la convertit en dataURL et l'applique).
 */
export function StockPickerModal({ open, initialQuery, onPick, onClose, onQueryChange, onUpload }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async (q: string) => {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchStock(term);
      setPhotos(results);
      if (results.length === 0) setError("Aucune photo pour cette recherche.");
    } catch (e) {
      setPhotos([]);
      setError(
        e instanceof StockUnavailableError
          ? "Banque d'images indisponible (clé Pexels manquante). Utilise l'import manuel."
          : e instanceof Error
            ? e.message
            : "Recherche impossible",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // À l'ouverture : focus + recherche initiale.
  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    run(initialQuery);
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open, initialQuery, run]);

  // Échap ferme.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[82vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <span className="text-[12px] font-bold tracking-wide">Banque d&apos;images</span>
          <span className="text-[11px] text-foreground/40">— Pexels</span>
          <button
            onClick={onClose}
            className="ml-auto text-foreground/40 hover:text-foreground cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0"
          onSubmit={(e) => {
            e.preventDefault();
            run(query);
          }}
        >
          <div className="flex items-center gap-2 flex-1 border border-border rounded-md px-3 py-2 bg-background">
            <Search className="w-3.5 h-3.5 text-foreground/40 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                onQueryChange?.(e.target.value);
              }}
              placeholder="avocat, voilier, e-commerce…"
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-foreground/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="text-[11px] font-bold border border-border bg-card px-3 py-2 rounded-md cursor-pointer hover:opacity-70 disabled:opacity-30 transition-all flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            Rechercher
          </button>
          {onUpload && (
            <>
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                className="text-[11px] font-bold border border-border bg-card px-3 py-2 rounded-md cursor-pointer hover:opacity-70 transition-all flex items-center gap-1.5 whitespace-nowrap"
                title="Importer une image"
              >
                <ImagePlus className="w-3.5 h-3.5" /> Importer
              </button>
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) onUpload(f);
                }}
              />
            </>
          )}
        </form>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-foreground/40">
              <ImageOff className="w-6 h-6" />
              <span className="text-[12px] text-center max-w-xs">{error}</span>
            </div>
          ) : loading && photos.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-foreground/40">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPick(p)}
                  className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-foreground/30 transition-all"
                  title={p.alt || `Photo de ${p.photographer}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumb}
                    alt={p.alt}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-border text-[10px] text-foreground/35 shrink-0">
          Photos fournies par Pexels.
        </div>
      </div>
    </div>
  );
}
