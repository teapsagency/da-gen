"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDAStore } from "@/store/daStore";
import { loadFontFile, cleanFontName } from "@/lib/fontName";
import {
  buildGoogleFontsUrl,
  buildFontshareUrl,
  getFontSource,
  injectFontCss,
} from "@/lib/fontLoader";
import { Upload, Check, TriangleAlert, Loader } from "lucide-react";

// Clean up font names — the scraper normalizes new scrapes, but this also
// repairs legacy projects with raw names (e.g. "_Satoshi_Variable" → "Satoshi").
const toDisplayName = (name: string): string => cleanFontName(name) || name;

export const FontSelector = () => {
  const { scrapeResult, fontName, setFont, importFont, importedFonts, localFontFile, fontUppercase, setFontUppercase } =
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

      let finalUrl: string | undefined = undefined;

      if (font.url && await injectFontCss(font.url)) {
        finalUrl = font.url;
      } else if (discoveredUrls.current[displayName] && await injectFontCss(discoveredUrls.current[displayName])) {
        finalUrl = discoveredUrls.current[displayName];
      } else {
        const googleUrl = buildGoogleFontsUrl(displayName);
        if (await injectFontCss(googleUrl)) {
          finalUrl = googleUrl;
        } else {
          const fontshareUrl = buildFontshareUrl(displayName);
          if (await injectFontCss(fontshareUrl)) {
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
    // Pas de fabrication d'URL Google ici : si l'URL réelle est inconnue, on
    // laisse validateFont la découvrir (Google/Fontshare). Fabriquer une URL
    // Google ferait afficher un faux badge « G » et tenterait de charger une
    // police inexistante (cas des polices self-hosted / Adobe comme Acumin Pro).
    // Une police introuvable bascule alors en « indisponible » → import.
    const url = discoveredUrls.current[displayName] || font.url;
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

  // Chip d'une police : état de chargement, source (Google/Fontshare), sélection.
  const renderChip = (font: { name: string; url?: string }) => {
    const displayName = toDisplayName(font.name);
    const sourceUrl = font.url || discoveredUrls.current[displayName];
    const source = getFontSource(sourceUrl) ?? fontSources[displayName];
    const status = fontStatus[displayName];
    const isActive = fontName === displayName;
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
        {status === "loading" && <Loader className="w-3 h-3 animate-spin" />}
        {hasImported && <Upload className="w-3 h-3 text-emerald-500" />}
        {status === "ok" && isActive && !hasImported && <Check className="w-3 h-3" />}
        {isUnavailable && <TriangleAlert className="w-3 h-3 text-amber-500" />}
        {source === "google" && status !== "loading" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo-google.svg" alt="G" width={12} height={12} style={{ flexShrink: 0 }} />
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
  };

  const renderGroup = (label: string, list: typeof scrapeResult.fonts) =>
    list.length > 0 ? (
      <div key={label} className="flex flex-col gap-2">
        <span className="text-xs font-medium text-foreground/40">{label}</span>
        <div className="flex flex-wrap gap-1.5">{list.map(renderChip)}</div>
      </div>
    ) : null;

  // Classement Titre / Texte (détecté côté scraper). On ne sépare QUE si ce sont
  // deux familles vraiment différentes — cleanFontName a déjà replié les graisses
  // (Gotham-Light → Gotham), donc une même typo en deux graisses donne
  // headingFont === bodyFont. Sinon (une seule famille, ou anciens projets sans
  // headingFont/bodyFont), liste plate « Polices détectées ».
  const norm = (s?: string) => (s ? s.toLowerCase() : "");
  const headingName = scrapeResult.headingFont;
  const bodyName = scrapeResult.bodyFont;
  const showSplit = !!headingName && !!bodyName && norm(headingName) !== norm(bodyName);
  const titre = scrapeResult.fonts.filter((f) => norm(toDisplayName(f.name)) === norm(headingName));
  const texte = scrapeResult.fonts.filter((f) => norm(toDisplayName(f.name)) === norm(bodyName));
  const classified = new Set([...titre, ...texte].map((f) => f.name));
  const autres = scrapeResult.fonts.filter((f) => !classified.has(f.name));

  return (
    <div className="flex flex-col gap-5 pt-1">
      {/* Detected fonts — groupées Titre / Texte / Autres */}
      <div className="flex flex-col gap-4">
        {showSplit ? (
          <>
            {renderGroup("Titre", titre)}
            {renderGroup("Texte", texte)}
            {renderGroup("Autres", autres)}
          </>
        ) : (
          renderGroup("Polices détectées", scrapeResult.fonts)
        )}

        {/* Casse de l'aperçu : certaines polices de marque s'emploient en
            capitales (text-transform). Bascule l'échantillon de la frame 01. */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground/40">Casse de l&apos;aperçu</span>
          <div className="flex items-center gap-1 bg-foreground/5 border border-border rounded-lg p-0.5">
            <button
              onClick={() => setFontUppercase(false)}
              className={`px-2.5 h-6 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                !fontUppercase ? "bg-background shadow-sm text-foreground" : "text-foreground/50 hover:text-foreground/80"
              }`}
            >
              Aa
            </button>
            <button
              onClick={() => setFontUppercase(true)}
              className={`px-2.5 h-6 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                fontUppercase ? "bg-background shadow-sm text-foreground" : "text-foreground/50 hover:text-foreground/80"
              }`}
            >
              AA
            </button>
          </div>
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
