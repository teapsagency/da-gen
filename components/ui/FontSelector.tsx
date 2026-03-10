"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDAStore } from "@/store/daStore";
import { Upload, Check, TriangleAlert, Loader } from "lucide-react";

// Only show logo when source is confirmed by URL
const getFontSource = (fontUrl?: string): "google" | "fontshare" | null => {
  if (!fontUrl) return null;
  if (fontUrl.includes("fonts.googleapis.com")) return "google";
  if (fontUrl.includes("fontshare.com") || fontUrl.includes("api.fontshare"))
    return "fontshare";
  return null;
};

// Font names are now already normalized by the scraper (e.g. "Bricolage Grotesque")
// so toDisplayName is identity — kept for safety with legacy data
const toDisplayName = (name: string): string => name;

// "Bricolage Grotesque" → "Bricolage+Grotesque"
const toGoogleFontsSlug = (name: string): string =>
  name.replace(/ +/g, "+");

const buildGoogleFontsUrl = (fontName: string): string =>
  `https://fonts.googleapis.com/css2?family=${toGoogleFontsSlug(fontName)}:wght@400;500;600;700&display=swap`;

const buildFontshareUrl = (fontName: string): string =>
  `https://api.fontshare.com/v2/css?f[]=${fontName.toLowerCase().replace(/ /g, "-")}@400,500,600,700&display=swap`;

export const FontSelector = () => {
  const { scrapeResult, fontName, setFont, setLocalFontFile, localFontFile } =
    useDAStore();
  const [customFont, setCustomFont] = useState("");
  const [fontStatus, setFontStatus] = useState<
    Record<string, "loading" | "ok" | "unavailable">
  >({});
  const [fontSources, setFontSources] = useState<
    Record<string, "google" | "fontshare">
  >({});
  const discoveredUrls = useRef<Record<string, string>>({});
  const validating = useRef<Set<string>>(new Set());

  // Core: test stylesheet, inject, check if font is available
  const validateFont = useCallback(
    async (font: { name: string; url?: string }) => {
      const displayName = toDisplayName(font.name);
      if (validating.current.has(displayName)) return;
      validating.current.add(displayName);

      setFontStatus((s) => ({ ...s, [displayName]: "loading" }));

      // Helper to test and inject a CSS URL
      const tryLoadStylesheet = async (testUrl: string): Promise<boolean> => {
        if (!testUrl) return false;
        try {
          const res = await fetch(testUrl, { method: "GET" });
          if (!res.ok) return false;
          
          const text = await res.text();
          if (!text.includes("@font-face")) return false;

          // Inject as <style> for immediate parsing, avoiding link.onload race conditions
          const existing = document.querySelector(`style[data-url="${testUrl}"]`) || document.querySelector(`link[href="${testUrl}"]`);
          if (!existing) {
            const style = document.createElement("style");
            style.setAttribute("data-url", testUrl);
            style.textContent = text;
            document.head.appendChild(style);
          }
          return true;
        } catch {
          return false;
        }
      };

      let finalUrl: string | undefined = undefined;

      if (font.url && await tryLoadStylesheet(font.url)) {
        finalUrl = font.url;
      } else if (discoveredUrls.current[displayName] && await tryLoadStylesheet(discoveredUrls.current[displayName])) {
        finalUrl = discoveredUrls.current[displayName];
      } else {
        const googleUrl = buildGoogleFontsUrl(displayName);
        if (await tryLoadStylesheet(googleUrl)) {
          finalUrl = googleUrl;
        } else {
          const fontshareUrl = buildFontshareUrl(displayName);
          if (await tryLoadStylesheet(fontshareUrl)) {
            finalUrl = fontshareUrl;
          }
        }
      }

      if (finalUrl) {
        discoveredUrls.current[displayName] = finalUrl;
        
        const state = useDAStore.getState();
        // Only update global font URL if this is the currently active font
        if (state.fontName === displayName && state.fontUrl !== finalUrl) {
          state.setFont(displayName, finalUrl);
        }

        // Set logo based on validated URL immediately
        if (finalUrl.includes("fonts.googleapis.com")) {
          setFontSources((s) => ({ ...s, [displayName]: "google" }));
        } else if (finalUrl.includes("fontshare.com") || finalUrl.includes("api.fontshare")) {
          setFontSources((s) => ({ ...s, [displayName]: "fontshare" }));
        }
        
        // Wait a tiny bit for the browser to parse the style tag
        await new Promise((r) => setTimeout(r, 50));
        
        // Try forcing the load to ensure browser downloads the woff2
        try {
          await Promise.race([
            document.fonts.load(`400 16px "${displayName}"`),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
          ]);
        } catch (e) {
          // ignore error, we know the CSS is valid
        }

        // Since we got a valid stylesheet with @font-face, we mark it as OK
        setFontStatus((s) => ({ ...s, [displayName]: "ok" }));
      } else {
        setFontStatus((s) => ({ ...s, [displayName]: "unavailable" }));
      }

      validating.current.delete(displayName);
    },
    [],
  );

  // Auto-validate ALL detected fonts when scrape results arrive
  useEffect(() => {
    if (!scrapeResult?.fonts) return;
    validating.current.clear();
    setFontStatus({});
    setFontSources({});
    discoveredUrls.current = {};
    scrapeResult.fonts.forEach((font) => validateFont(font));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrapeResult?.fonts]);

  // On click: switch active font AND trigger validation if not already done
  const handleFontClick = (font: { name: string; url?: string }) => {
    const displayName = toDisplayName(font.name);
    const url = discoveredUrls.current[displayName] || font.url || buildGoogleFontsUrl(displayName);
    setFont(displayName, url);
    validateFont(font);
  };

  const [customFontLoading, setCustomFontLoading] = useState(false);

  const handleCustomFont = async () => {
    if (!customFont) return;
    const input = customFont.trim();
    setCustomFontLoading(true);

    try {
      // Detect if the input is a URL
      if (input.startsWith("http")) {
        // Fetch the CSS to extract the font-family name
        const res = await fetch(input, { method: "GET" });
        if (!res.ok) throw new Error("fetch failed");
        const css = await res.text();

        // Extract font-family from @font-face rules
        const familyMatch = css.match(/font-family:\s*['"]?([^'";]+)['"]?/);
        const name = familyMatch ? familyMatch[1].trim() : "Custom Font";

        // Inject stylesheet
        const existing = document.querySelector(`style[data-url="${input}"]`);
        if (!existing) {
          const style = document.createElement("style");
          style.setAttribute("data-url", input);
          style.textContent = css;
          document.head.appendChild(style);
        }

        setFont(name, input);
        setFontStatus((s) => ({ ...s, [name]: "ok" }));

        // Determine source for logo
        if (input.includes("fonts.googleapis.com")) {
          setFontSources((s) => ({ ...s, [name]: "google" }));
        } else if (input.includes("fontshare.com") || input.includes("api.fontshare")) {
          setFontSources((s) => ({ ...s, [name]: "fontshare" }));
        }
      } else {
        // Treat as font name — try Google Fonts URL
        const url = buildGoogleFontsUrl(input);
        setFont(input, url);
        validateFont({ name: input, url });
      }
    } catch {
      // Fallback: treat as font name
      const url = buildGoogleFontsUrl(input);
      setFont(input, url);
      validateFont({ name: input, url });
    } finally {
      setCustomFontLoading(false);
      setCustomFont("");
    }
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

  if (!scrapeResult) return null;

  return (
    <div className="flex flex-col gap-5 pt-1">
      {/* Detected fonts */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-foreground/40">
          Polices détectées
        </span>
        <div className="flex flex-wrap gap-1.5">
          {scrapeResult.fonts.map((font) => {
            const displayName = toDisplayName(font.name);
            // Confirmed source: scraped URL first, then discovered URL, then dynamically determined
            const sourceUrl = font.url || discoveredUrls.current[displayName];
            const source = getFontSource(sourceUrl) ?? fontSources[displayName];
            const status = fontStatus[displayName];
            const isActive = fontName === displayName;
            const isUnavailable = status === "unavailable";
            return (
              <button
                key={font.name}
                onClick={() => handleFontClick(font)}
                className={`h-8 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? isUnavailable
                      ? "border-amber-400 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                      : "border-foreground bg-foreground/5 text-foreground"
                    : "border-border text-foreground/50 hover:border-foreground/20 hover:text-foreground/80"
                }`}
              >
                {status === "loading" && (
                  <Loader className="w-3 h-3 animate-spin" />
                )}
                {status === "ok" && isActive && <Check className="w-3 h-3" />}
                {isUnavailable && <TriangleAlert className="w-3 h-3" />}
                {source === "google" && status !== "loading" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/logo-google.svg"
                    alt="G"
                    width={12}
                    height={12}
                    style={{ flexShrink: 0 }}
                  />
                )}
                {source === "fontshare" && status !== "loading" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/logo-fontshare.svg"
                    alt="F"
                    width={12}
                    height={12}
                    className="bg-white rounded-[3px] p-[1px] box-content"
                    style={{ flexShrink: 0, width: 12, height: 12 }}
                  />
                )}
                {displayName}
              </button>
            );
          })}
        </div>

        {/* Unavailable font warning for active font */}
        {fontName && fontStatus[fontName] === "unavailable" && (
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-2.5 mt-1">
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex gap-2 leading-relaxed">
              <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Police « {fontName} » introuvable sur Google Fonts &amp;
              Fontshare. Importez le fichier .ttf/.otf pour préserver le rendu à
              l'export.
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

      {/* Manual font — URL or name */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border">
        <span className="text-xs font-medium text-foreground/40">
          Ajouter une police
        </span>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={customFont}
            onChange={(e) => setCustomFont(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomFont()}
            placeholder="Lien ou nom (Google, Fontshare, Adobe...)"
            className="flex-1 h-9 bg-background border border-border rounded-lg px-3 text-xs outline-none focus:border-foreground/20 font-medium placeholder:text-foreground/20"
          />
          <button
            onClick={handleCustomFont}
            disabled={!customFont || customFontLoading}
            className="h-9 px-4 bg-foreground text-background rounded-lg text-xs font-bold hover:opacity-90 transition-all cursor-pointer disabled:opacity-30 flex items-center justify-center"
          >
            {customFontLoading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
};
