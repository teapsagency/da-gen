"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { icons, Search, X, type LucideIcon } from "lucide-react";
import { EMOJIS } from "@/lib/emojiData";

const ICON_NAMES = Object.keys(icons);
const ICON_RECORD = icons as unknown as Record<string, LucideIcon>;
const MAX_RESULTS = 240;

type Tab = "lucide" | "emoji";

type Props = {
  open: boolean;
  value: { iconName: string; iconEmoji?: string };
  onPick: (sel: { iconName?: string; iconEmoji?: string }) => void;
  onClose: () => void;
};

/**
 * Picker d'icône en deux onglets, chacun avec sa barre de recherche :
 *  - « Icônes » : tout le set Lucide (1600+), recherche par nom.
 *  - « Emojis » : jeu curé (lib/emojiData), recherche par mots-clés.
 */
export function IconPickerModal({ open, value, onPick, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(value.iconEmoji ? "emoji" : "lucide");
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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

  if (!open) return null;

  const totalLucide = term ? ICON_NAMES.filter((n) => n.toLowerCase().includes(term)).length : ICON_NAMES.length;

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
          <div className="flex bg-foreground/[0.06] rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => { setTab("lucide"); setQ(""); }}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md cursor-pointer transition-all ${
                tab === "lucide" ? "bg-card text-foreground shadow-sm" : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              Icônes
            </button>
            <button
              onClick={() => { setTab("emoji"); setQ(""); }}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md cursor-pointer transition-all ${
                tab === "emoji" ? "bg-card text-foreground shadow-sm" : "text-foreground/40 hover:text-foreground/60"
              }`}
            >
              Emojis
            </button>
          </div>
          <button onClick={onClose} className="ml-auto text-foreground/40 hover:text-foreground cursor-pointer" aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Recherche */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 border border-border rounded-md px-3 py-2 bg-background">
            <Search className="w-3.5 h-3.5 text-foreground/40 shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tab === "lucide" ? "anchor, scale, rocket…" : "avocat, mer, fusée…"}
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-foreground/30"
            />
          </div>
        </div>

        {/* Grille */}
        <div className="flex-1 overflow-y-auto p-3">
          {tab === "lucide" ? (
            <>
              <div className="grid grid-cols-8 gap-1.5">
                {lucideResults.map((name) => {
                  const C = ICON_RECORD[name];
                  const active = !value.iconEmoji && value.iconName === name;
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
          ) : (
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
        </div>
      </div>
    </div>
  );
}
