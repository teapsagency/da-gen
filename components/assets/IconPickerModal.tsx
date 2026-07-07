"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { icons, Search, Upload, X, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { EMOJIS } from "@/lib/emojiData";
import { BRAND_LOGOS } from "@/lib/brandLogos";
import { SlidingTabs } from "@/components/ui/SlidingTabs";

const ICON_NAMES = Object.keys(icons);
const ICON_RECORD = icons as unknown as Record<string, LucideIcon>;
const MAX_RESULTS = 240;
const MAX_BRANDS = 180;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

type Tab = "lucide" | "emoji" | "brand";

type Props = {
  open: boolean;
  value: { iconName: string; iconEmoji?: string; brandSlug?: string };
  onPick: (sel: { iconName?: string; iconEmoji?: string; brandSlug?: string; customSrc?: string }) => void;
  onClose: () => void;
  /** Affiche l'onglet « Logos » (marques simple-icons) + l'import d'un asset
   *  custom. Défaut true ; false pour le glyphe d'une pilule (icône/emoji seuls). */
  allowBrand?: boolean;
};

/**
 * Picker unifié en trois onglets, chacun avec sa barre de recherche :
 *  - « Icônes » : tout le set Lucide (1600+), recherche par nom.
 *  - « Emojis » : jeu curé (lib/emojiData), recherche par mots-clés.
 *  - « Logos »  : marques simple-icons (BRAND_LOGOS), recherche par nom/slug.
 * Le choix remonte un `iconName`, un `iconEmoji` OU un `brandSlug` — au parent
 * de créer/convertir le calque (icône vs logo techno).
 */
export function IconPickerModal({ open, value, onPick, onClose, allowBrand = true }: Props) {
  const initialTab: Tab = value.brandSlug && allowBrand ? "brand" : value.iconEmoji ? "emoji" : "lucide";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Import d'un asset custom (image) → dataUrl remonté via onPick({ customSrc }).
  const ingestUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Fichier non valide — choisissez une image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Image trop lourde (max 4 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onPick({ customSrc: reader.result });
    };
    reader.onerror = () => toast.error("Lecture du fichier impossible");
    reader.readAsDataURL(file);
  };

  // Reset à l'ouverture = remontage via `key` côté parent (les initialisateurs
  // useState repartent à zéro). Ici, uniquement focus + fermeture clavier.
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

  const term = q.trim().toLowerCase();

  const lucideResults = useMemo(() => {
    if (tab !== "lucide") return [];
    const list = term ? ICON_NAMES.filter((n) => n.toLowerCase().includes(term)) : ICON_NAMES;
    return list.slice(0, MAX_RESULTS);
  }, [tab, term]);

  const emojiResults = useMemo(() => {
    if (tab !== "emoji") return [];
    if (!term) return EMOJIS;
    return EMOJIS.filter((e) => e.char === q.trim() || e.keywords.includes(term));
  }, [tab, term, q]);

  const brandMatches = useMemo(() => {
    if (tab !== "brand") return [];
    return term
      ? BRAND_LOGOS.filter((b) => b.title.toLowerCase().includes(term) || b.slug.includes(term))
      : BRAND_LOGOS;
  }, [tab, term]);
  const brandResults = brandMatches.slice(0, MAX_BRANDS);

  if (!open) return null;

  const totalLucide = term ? ICON_NAMES.filter((n) => n.toLowerCase().includes(term)).length : ICON_NAMES.length;

  const tabs: { id: Tab; label: string }[] = allowBrand
    ? [
        { id: "lucide", label: "Icônes" },
        { id: "emoji", label: "Emojis" },
        { id: "brand", label: "Logos" },
      ]
    : [
        { id: "lucide", label: "Icônes" },
        { id: "emoji", label: "Emojis" },
      ];

  const placeholder =
    tab === "lucide" ? "anchor, scale, rocket…" : tab === "emoji" ? "avocat, mer, fusée…" : "shopify, wordpress…";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + onglets */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <SlidingTabs
            value={tab}
            onChange={(id) => { setTab(id); setQ(""); }}
            itemClassName="px-3 py-1"
            tabs={tabs}
          />
          {allowBrand && (
            <button
              onClick={() => fileRef.current?.click()}
              className="ml-auto text-[11px] font-bold border border-border bg-card px-2.5 py-1 rounded-md cursor-pointer hover:opacity-70 transition-all flex items-center gap-1.5"
              title="Importer une image (SVG/PNG transparent conseillé)"
            >
              <Upload className="w-3.5 h-3.5" /> Importer
            </button>
          )}
          <button
            onClick={onClose}
            className={`${allowBrand ? "" : "ml-auto"} text-foreground/40 hover:text-foreground cursor-pointer`}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) ingestUpload(file);
            }}
          />
        </div>

        {/* Recherche */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2 bg-background">
            <Search className="w-3.5 h-3.5 text-foreground/40 shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-foreground/30"
            />
          </div>
        </div>

        {/* Grille */}
        <div className="flex-1 overflow-y-auto p-3">
          {tab === "lucide" && (
            <>
              <div className="grid grid-cols-8 gap-1.5">
                {lucideResults.map((name) => {
                  const C = ICON_RECORD[name];
                  const active = !value.iconEmoji && !value.brandSlug && value.iconName === name;
                  return (
                    <button
                      key={name}
                      onClick={() => onPick({ iconName: name })}
                      title={name}
                      className={`aspect-square rounded-md flex items-center justify-center cursor-pointer transition-all ${
                        active ? "bg-foreground text-background" : "text-foreground/60 hover:bg-foreground/10"
                      }`}
                    >
                      <C className="w-[18px] h-[18px]" />
                    </button>
                  );
                })}
              </div>
              {totalLucide > lucideResults.length && (
                <p className="text-[10px] text-foreground/35 text-center mt-3">
                  {lucideResults.length} sur {totalLucide} — affine la recherche.
                </p>
              )}
            </>
          )}

          {tab === "emoji" && (
            <div className="grid grid-cols-8 gap-1.5">
              {emojiResults.map((e) => {
                const active = value.iconEmoji === e.char;
                return (
                  <button
                    key={e.char}
                    onClick={() => onPick({ iconEmoji: e.char })}
                    title={e.keywords}
                    className={`aspect-square rounded-md flex items-center justify-center text-[22px] leading-none cursor-pointer transition-all ${
                      active ? "bg-foreground/15 ring-2 ring-foreground/40" : "hover:bg-foreground/10"
                    }`}
                  >
                    {e.char}
                  </button>
                );
              })}
              {emojiResults.length === 0 && (
                <p className="col-span-8 text-[11px] text-foreground/35 text-center py-10">Aucun emoji.</p>
              )}
            </div>
          )}

          {tab === "brand" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {brandResults.map((b) => {
                  const active = value.brandSlug === b.slug;
                  return (
                    <button
                      key={b.slug}
                      onClick={() => onPick({ brandSlug: b.slug })}
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
                {brandResults.length === 0 && (
                  <p className="col-span-3 text-[11px] text-foreground/35 text-center py-10">Aucune marque.</p>
                )}
              </div>
              {brandMatches.length > brandResults.length && (
                <p className="text-[10px] text-foreground/35 text-center mt-3">
                  {brandResults.length} sur {brandMatches.length} — affine la recherche.
                </p>
              )}
              <p className="text-[10px] text-foreground/30 text-center mt-3">Logos fournis par Simple Icons.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
