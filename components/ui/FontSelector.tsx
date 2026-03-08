import React, { useState } from "react";
import { useDAStore } from "@/store/daStore";
import { Info, Upload, Check } from "lucide-react";
import Image from "next/image";

const getFontSource = (fontUrl?: string): "google" | "fontshare" | "custom" => {
  if (!fontUrl) return "custom";
  if (fontUrl.includes("fonts.googleapis.com")) return "google";
  if (fontUrl.includes("fontshare.com") || fontUrl.includes("api.fontshare"))
    return "fontshare";
  return "custom";
};

export const FontSelector = () => {
  const { scrapeResult, fontName, setFont, setLocalFontFile, localFontFile } =
    useDAStore();
  const [customFont, setCustomFont] = useState("");

  if (!scrapeResult) return null;

  const currentFontData = scrapeResult.fonts.find((f) => f.name === fontName);
  const hasGoogleFontUrl =
    currentFontData?.url?.includes("fonts.googleapis.com") || false;
  const isFromScraper = !!currentFontData;
  const showWarning =
    fontName && !isFromScraper && !localFontFile && !hasGoogleFontUrl;

  const handleCustomFont = () => {
    if (!customFont) return;
    const url = `https://fonts.googleapis.com/css2?family=${customFont.replace(/ /g, "+")}:wght@400;500;600;700&display=swap`;
    setFont(customFont, url);
    setCustomFont("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const name = file.name.split(".")[0];
        setLocalFontFile(base64);
        setFont(name, undefined);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-1">
      {/* Detected fonts */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-foreground/40">
          Polices détectées
        </span>
        <div className="flex flex-wrap gap-1.5">
          {scrapeResult.fonts.map((font) => {
            const source = getFontSource(font.url);
            return (
              <button
                key={font.name}
                onClick={() => {
                  const url =
                    font.url ||
                    `https://fonts.googleapis.com/css2?family=${font.name.replace(/ /g, "+")}:wght@400;500;600;700&display=swap`;
                  setFont(font.name, url);
                }}
                className={`h-8 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  fontName === font.name
                    ? "border-foreground bg-foreground/5 text-foreground"
                    : "border-border text-foreground/50 hover:border-foreground/20 hover:text-foreground/80"
                }`}
              >
                {fontName === font.name && <Check className="w-3 h-3" />}
                {source === "google" && (
                  <Image
                    src="/logo-google.svg"
                    alt="Google Fonts"
                    width={12}
                    height={12}
                    className="opacity-60"
                  />
                )}
                {source === "fontshare" && (
                  <Image
                    src="/logo-fontshare.svg"
                    alt="Fontshare"
                    width={12}
                    height={12}
                    className="opacity-60"
                  />
                )}
                {font.name}
              </button>
            );
          })}
        </div>
        {showWarning && (
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 mt-1">
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex gap-2 leading-relaxed">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Police "{fontName}" non trouvée dans les polices détectées.
              Uploadez-la pour garantir l'export.
            </p>
          </div>
        )}
      </div>

      {/* Upload font */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <span className="text-xs font-medium text-foreground/40">
          Police personnalisée
        </span>
        <label className="flex items-center justify-center h-10 border border-dashed border-border rounded-xl hover:border-foreground/20 hover:bg-foreground/[0.02] transition-all cursor-pointer group">
          <div className="flex items-center gap-2">
            <Upload className="w-3.5 h-3.5 text-foreground/15 group-hover:text-foreground/30 transition-colors" />
            <span className="text-xs font-medium text-foreground/30 group-hover:text-foreground/50 transition-colors">
              {localFontFile
                ? "✓ Police chargée"
                : "Importer .ttf, .otf, .woff"}
            </span>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".ttf,.otf,.woff,.woff2"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {/* Custom Google Font */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <span className="text-xs font-medium text-foreground/40">
          Google Font manuelle
        </span>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={customFont}
            onChange={(e) => setCustomFont(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomFont()}
            placeholder="Ex: Inter, Montserrat..."
            className="flex-1 h-9 bg-background border border-border rounded-lg px-3 text-xs outline-none focus:border-foreground/20 font-medium placeholder:text-foreground/20"
          />
          <button
            onClick={handleCustomFont}
            disabled={!customFont}
            className="h-9 px-4 bg-foreground text-background rounded-lg text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-30"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
