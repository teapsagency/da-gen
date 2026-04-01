import React, { useState, useCallback } from "react";
import { useDAStore } from "@/store/daStore";
import { toast } from "sonner";
import { Pipette, Check, Copy } from "lucide-react";

const PRESET_BG_COLORS = [
  { name: "Sombre", hex: "#111111" },
  { name: "Blanc", hex: "#FFFFFF" },
  { name: "Gris", hex: "#F2F2F2" },
];

export const ColorPicker = () => {
  const { scrapeResult, selectedColors, toggleColor, bgColor, setBgColor } =
    useDAStore();

  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  const handleCopy = useCallback((hex: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hex.toUpperCase());
    setCopiedHex(hex);
    toast.success("Copié", { description: hex.toUpperCase() });
    setTimeout(() => setCopiedHex(null), 1500);
  }, []);

  if (!scrapeResult) return null;

  const handleToggle = (hex: string) => {
    if (!selectedColors.includes(hex) && selectedColors.length >= 4) {
      toast.error("Limite atteinte", {
        description: "Maximum 4 couleurs pour un design équilibré.",
      });
      return;
    }
    toggleColor(hex);
  };

  return (
    <div className="flex flex-col gap-5 pt-1">
      {/* Palette colors */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-foreground/40">
          Palette extraite
        </span>
        <div className="grid grid-cols-4 gap-2 w-full">
          {scrapeResult.colors.map((color, i) => (
            <button
              key={i}
              onClick={() => handleToggle(color.hex)}
              className={`aspect-square rounded-xl border-2 transition-all relative group overflow-visible cursor-pointer ${
                selectedColors.includes(color.hex)
                  ? "border-foreground"
                  : "border-transparent opacity-70 hover:opacity-100 hover:border-border"
              }`}
              style={{ backgroundColor: color.hex }}
            >
              {/* HEX tooltip on hover — click to copy */}
              <span
                className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-foreground text-background text-[10px] font-bold tracking-wider whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 translate-y-1 group-hover:translate-y-0 z-[999] shadow-lg flex items-center gap-1 cursor-pointer"
                onClick={(e) => handleCopy(color.hex, e)}
              >
                {color.hex.toUpperCase()}
                {copiedHex === color.hex ? (
                  <Check className="w-2.5 h-2.5 opacity-70" />
                ) : (
                  <Copy className="w-2.5 h-2.5 opacity-50" />
                )}
              </span>
              {selectedColors.includes(color.hex) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-xl">
                  <Check
                    className={`w-4 h-4 ${color.isLight ? "text-black/50" : "text-white/70"}`}
                    strokeWidth={3}
                  />
                </div>
              )}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-foreground/25 font-medium">
          {selectedColors.length}/4 sélectionnées
        </span>
      </div>

      {/* Background color */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <span className="text-xs font-medium text-foreground/40">
          Fond des frames
        </span>
        <div className="flex flex-wrap gap-1.5 items-center">
          {scrapeResult?.siteBgColor && (
            <button
              onClick={() => setBgColor(scrapeResult.siteBgColor!)}
              className={`h-8 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                bgColor === scrapeResult.siteBgColor
                  ? "border-foreground bg-foreground/5 text-foreground"
                  : "border-border text-foreground/50 hover:border-foreground/20 hover:text-foreground/80"
              }`}
            >
              Site
            </button>
          )}
          {PRESET_BG_COLORS.map((color) => (
            <button
              key={color.hex}
              onClick={() => setBgColor(color.hex)}
              className={`h-8 w-8 rounded-lg border-2 transition-all cursor-pointer flex items-center justify-center ${
                bgColor === color.hex
                  ? "border-foreground"
                  : "border-border/50 opacity-70 hover:opacity-100 hover:border-foreground/30"
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            >
              {bgColor === color.hex && (
                <Check
                  className={`w-3 h-3 ${
                    color.hex === "#FFFFFF" ||
                    color.hex === "#F2F2F2"
                      ? "text-black/40"
                      : "text-white/70"
                  }`}
                  strokeWidth={3}
                />
              )}
            </button>
          ))}
          <div className="flex items-center gap-1.5 h-8 bg-background px-2 rounded-lg border border-border ml-1">
            <Pipette className="w-3 h-3 text-foreground/30" />
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-4 h-4 rounded overflow-hidden bg-transparent border-none cursor-pointer p-0"
            />
            <input
              type="text"
              value={bgColor.toUpperCase()}
              onChange={(e) => setBgColor(e.target.value)}
              className="bg-transparent border-none text-xs w-[60px] outline-none font-medium text-foreground/60"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
