import React, { useState, useCallback, useEffect } from "react";
import { useDAStore } from "@/store/daStore";
import { Check } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export const LogoSelector = () => {
  const {
    scrapeResult,
    selectedLogo,
    setSelectedLogo,
    logoScale,
    setLogoScale,
  } = useDAStore();
  const [localScale, setLocalScale] = useState(logoScale);

  useEffect(() => {
    setLocalScale(logoScale);
  }, [logoScale]);

  const handleSliderChange = useCallback((value: number[]) => {
    setLocalScale(value[0]);
  }, []);

  const handleSliderCommit = useCallback(
    (value: number[]) => {
      setLogoScale(value[0]);
    },
    [setLogoScale],
  );

  if (!scrapeResult || scrapeResult.logos.length <= 1) return null;

  return (
    <div className="flex flex-col gap-4 pt-1">
      <span className="text-xs font-medium text-foreground/40">
        Choisir un logo
      </span>
      <div className="flex flex-wrap gap-2">
        {scrapeResult.logos.map((logo, i) => {
          let format = "IMG";
          if (logo.startsWith("data:image/svg+xml")) format = "SVG";
          else if (logo.startsWith("data:image/png")) format = "PNG";
          else if (logo.startsWith("data:image/jpeg")) format = "JPG";
          else if (logo.startsWith("data:image/webp")) format = "WEBP";
          else {
            try {
              const url = new URL(logo);
              const extension = url.pathname.split(".").pop()?.toUpperCase();
              if (
                extension &&
                ["SVG", "PNG", "JPG", "JPEG", "WEBP", "GIF"].includes(extension)
              ) {
                format = extension === "JPEG" ? "JPG" : extension;
              }
            } catch (e) {
              // Ignore invalid URLs
            }
          }

          return (
            <button
              key={i}
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

              {/* Format Badge */}
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
      </div>

      {/* Logo scale slider */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground/40">
            Taille du logo
          </span>
          <span className="text-xs font-medium text-foreground/60 tabular-nums">
            {Math.round(localScale * 100)}%
          </span>
        </div>
        <Slider
          value={[localScale]}
          onValueChange={handleSliderChange}
          onValueCommit={handleSliderCommit}
          min={0.3}
          max={2.5}
          step={0.05}
          className="w-full"
        />
      </div>
    </div>
  );
};
