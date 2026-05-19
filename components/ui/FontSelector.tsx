"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDAStore } from "@/store/daStore";
import { loadFontFile, cleanFontName } from "@/lib/fontName";
import { Upload, Check, TriangleAlert, Loader } from "lucide-react";

// Only show logo when source is confirmed by URL
const getFontSource = (fontUrl?: string): "google" | "fontshare" | null => {
  if (!fontUrl) return null;
  if (fontUrl.includes("fonts.googleapis.com")) return "google";
  if (fontUrl.includes("fontshare.com") || fontUrl.includes("api.fontshare"))
    return "fontshare";
  return null;
};

// Clean up font names — the scraper normalizes new scrapes, but this also
// repairs legacy projects with raw names (e.g. "_Satoshi_Variable" → "Satoshi").
const toDisplayName = (name: string): string => cleanFontName(name) || name;

// "Bricolage Grotesque" → "Bricolage+Grotesque"
const toGoogleFontsSlug = (name: string): string =>
  name.replace(/ +/g, "+");

const buildGoogleFontsUrl = (fontName: string): string =>
  `https://fonts.googleapis.com/css2?family=${toGoogleFontsSlug(fontName)}:wght@400;500;600;700&display=swap`;

// "Satoshi Variable" → "satoshi" (Fontshare slugs drop the "Variable" suffix)
const toFontshareSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\b(variable[- ]?font|variable|vf)\b/g, "")
    .trim()
    .replace(/ +/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const buildFontshareUrl = (fontName: string): string =>
  `https://api.fontshare.com/v2/css?f[]=${toFontshareSlug(fontName)}@400,500,600,700&display=swap`;

// Fetch font CSS through the same-origin server proxy. Going through the proxy
// for everything (Google Fonts included) avoids the noisy cross-origin CORS
// errors a direct fetch produces for fonts that don't exist on a given CDN.
const fetchFontCss = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(`/api/font-css?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const text = await res.text();
      if (text.includes("@font-face")) return text;
    }
  } catch {
    /* network error — treat as unavailable */
  }
  return null;
};

export const FontSelector = () => {
  const { scrapeResult, fontName, setFont, importFont, importedFonts, localFontFile } =
    useDAStore();
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
        const text = await fetchFontCss(testUrl);
        if (!text) return false;

        // Inject as <style> for immediate parsing, avoiding link.onload race conditions
        const existing =
          document.querySelector(`style[data-url="${testUrl}"]`) ||
          document.querySelector(`link[href="${testUrl}"]`);
        if (!existing) {
          const style = document.createElement("style");
          style.setAttribute("data-url", testUrl);
          style.textContent = text;
          document.head.appendChild(style);
        }
        return true;
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
        } catch {
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
    // Validate all fonts in parallel for faster loading
    Promise.all(scrapeResult.fonts.map((font) => validateFont(font)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrapeResult?.fonts]);

  // On click: switch active font AND trigger validation if not already done
  const handleFontClick = (font: { name: string; url?: string }) => {
    const displayName = toDisplayName(font.name);
    const url = discoveredUrls.current[displayName] || font.url || buildGoogleFontsUrl(displayName);
    setFont(displayName, url);
    validateFont(font);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { name, dataUrl } = await loadFontFile(file);
    // Tie the imported file to the currently selected typeface so it persists
    // and is restored when switching back to it. Fall back to the file's own
    // family name if no font is active yet.
    importFont(fontName || name, dataUrl);
    e.target.value = "";
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
            // A typeface with an imported file counts as available.
            const hasImported = !!importedFonts[displayName];
            const isUnavailable = status === "unavailable" && !hasImported;
            return (
              <button
                key={font.name}
                onClick={() => handleFontClick(font)}
                className={`h-8 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "border-foreground bg-foreground/5 text-foreground"
                    : "border-border text-foreground/50 hover:border-foreground/20 hover:text-foreground/80"
                }`}
              >
                {status === "loading" && (
                  <Loader className="w-3 h-3 animate-spin" />
                )}
                {hasImported && <Upload className="w-3 h-3 text-emerald-500" />}
                {status === "ok" && isActive && !hasImported && <Check className="w-3 h-3" />}
                {isUnavailable && <TriangleAlert className="w-3 h-3 text-amber-500" />}
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

        {/* Unavailable font warning for active font — with inline import */}
        {fontName && fontStatus[fontName] === "unavailable" && !localFontFile && (
          <div className="border border-border rounded-lg p-2.5 mt-1 flex flex-col gap-2.5">
            <p className="text-[11px] text-foreground/70 font-medium flex gap-2 leading-relaxed">
              <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
              Police « {fontName} » introuvable sur Google Fonts &amp;
              Fontshare. Importez le fichier .ttf/.otf pour préserver le rendu à
              l&apos;export.
            </p>
            <label className="flex items-center justify-center gap-2 h-9 border border-amber-500/30 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 transition-all cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                Importer la police « {fontName} »
              </span>
              <input
                type="file"
                className="hidden"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        )}
      </div>

      {/* Imported font — shown once a custom file is loaded, lets the user
          see its state and swap it. Initial import happens from the
          "police introuvable" warning above. */}
      {localFontFile && (
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <span className="text-xs font-medium text-foreground/40">
            Police importée
          </span>
          <label className="flex items-center justify-center h-10 border border-dashed border-border rounded-xl hover:border-foreground/20 hover:bg-foreground/[0.02] transition-all cursor-pointer group">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-foreground/50 group-hover:text-foreground/80 transition-colors">
                « {fontName} » importée — remplacer
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
      )}
    </div>
  );
};
