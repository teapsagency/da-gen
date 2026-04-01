"use client";

import React, { useEffect, useCallback } from "react";
import { useDAStore } from "@/store/daStore";
import { UrlInput } from "@/components/ui/UrlInput";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { FontSelector } from "@/components/ui/FontSelector";
import { LogoSelector } from "@/components/ui/LogoSelector";
import { AgencyLogoUpload } from "@/components/ui/AgencyLogoUpload";
import { RadiusSelector } from "@/components/ui/RadiusSelector";
import { PageScreenshots } from "@/components/ui/PageScreenshots";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Frame1_DA } from "@/components/frames/Frame1_DA";
import { Frame2_Mockup } from "@/components/frames/Frame2_Mockup";
import { Frame3_Cover } from "@/components/frames/Frame3_Cover";
import { Frame4_Social_BrowserFull } from "@/components/frames/Frame4_Social_BrowserFull";
import { Frame5_Social_HeroSimple } from "@/components/frames/Frame5_Social_HeroSimple";
import { Frame6_Social_NouvelleReal } from "@/components/frames/Frame6_Social_NouvelleReal";
import { Frame7_Social_ThreeImg } from "@/components/frames/Frame7_Social_ThreeImg";
import { Frame8_Social_CardSite } from "@/components/frames/Frame8_Social_CardSite";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ContentChat } from "@/components/ContentChat";
import { FileUpload } from "@/components/ui/FileUpload";
import { ChipSelector } from "@/components/ui/ChipSelector";
import { GeneratedContent } from "@/types";
import { exportFrame, exportAllFrames, exportAllSocialFrames } from "@/lib/exportFrames";
import { toast } from "sonner";
import {
  Download,
  Sun,
  Moon,
  Loader2,
  TriangleAlert,
  Terminal,
  X,
  Layers,
  FileText,
  RotateCcw,
  ImageUp,
} from "lucide-react";

/** Wait until all frame IDs exist in the DOM, with a safety timeout */
function waitForFrames(ids: string[], timeout = 3000): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (ids.every((id) => document.getElementById(id))) {
        requestAnimationFrame(() => resolve());
      } else if (Date.now() - start > timeout) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  });
}

export default function Home() {
  const {
    isLoading,
    scrapeResult,
    error,
    theme,
    toggleTheme,
    fontName,
    fontUrl,
    localFontFile,
    setUrl,
    setIsLoading,
    setScrapeResult,
    setError,
    resetProject,
  } = useDAStore();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const [isExportingPack, setIsExportingPack] = React.useState(false);
  const [showOffscreenFrames, setShowOffscreenFrames] = React.useState(false);
  const [isExportingSocialPack, setIsExportingSocialPack] = React.useState(false);
  const [showOffscreenSocialFrames, setShowOffscreenSocialFrames] = React.useState(false);
  const [sidebarTab, setSidebarTab] = React.useState<"visuels" | "contenu">("visuels");
  const [visualSubTab, setVisualSubTab] = React.useState<"desktop" | "social">("desktop");

  // Content generation state
  const [contentChips, setContentChips] = React.useState<string[]>([]);
  const [contentFiles, setContentFiles] = React.useState<File[]>([]);
  const [contentBrief, setContentBrief] = React.useState("");
  const [generatedContent, setGeneratedContent] = React.useState<GeneratedContent | null>(null);
  const [streamingContent, setStreamingContent] = React.useState<string>("");
  const [isGeneratingContent, setIsGeneratingContent] = React.useState(false);
  const [contentError, setContentError] = React.useState<string | null>(null);
  const [scrapeLogs, setScrapeLogs] = React.useState<{ time: number; msg: string }[]>([]);
  const [showConsole, setShowConsole] = React.useState(false);

  const tryParsePartial = React.useCallback((raw: string): GeneratedContent | null => {
    let clean = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    const attempts = [clean];
    let closers = '';
    for (let i = clean.length - 1; i >= 0; i--) {
      if (clean[i] === '{') closers += '}';
      else if (clean[i] === '[') closers += ']';
      else if (clean[i] === '}' && closers.endsWith('}')) closers = closers.slice(0, -1);
      else if (clean[i] === ']' && closers.endsWith(']')) closers = closers.slice(0, -1);
    }
    const lastQuoteIdx = clean.lastIndexOf('"');
    const afterLastQuote = clean.slice(lastQuoteIdx + 1);
    if (lastQuoteIdx > 0 && !afterLastQuote.match(/^\s*[,}\]:]/) && afterLastQuote.length < 500) {
      attempts.push(clean + '"' + closers);
    }
    attempts.push(clean + closers);
    for (const attempt of attempts) {
      try {
        const parsed = JSON.parse(attempt);
        if (parsed?.caseStudy) return parsed as GeneratedContent;
      } catch { /* continue */ }
    }
    return null;
  }, []);

  const handleGenerateContent = React.useCallback(async () => {
    if (!scrapeResult) return;
    setIsGeneratingContent(true);
    setContentError(null);
    setStreamingContent("");
    try {
      const formData = new FormData();
      formData.append("chips", JSON.stringify(contentChips));
      formData.append("siteData", JSON.stringify({
        title: scrapeResult.title,
        domain: scrapeResult.domain,
        siteUrl: scrapeResult.siteUrl,
      }));
      formData.append("clientBrief", contentBrief);
      contentFiles.forEach((f) => formData.append("files", f));

      const res = await fetch("/api/generate-content", { method: "POST", body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Erreur lors de la génération.");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Streaming non supporté");
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamingContent(accumulated);
        const partial = tryParsePartial(accumulated);
        if (partial) setGeneratedContent(partial);
      }

      const clean = accumulated.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
      setGeneratedContent(JSON.parse(clean));
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "Erreur lors de la génération.");
    } finally {
      setIsGeneratingContent(false);
      setStreamingContent("");
    }
  }, [scrapeResult, contentChips, contentFiles, contentBrief, tryParsePartial]);

  const [showLoadingOverlay, setShowLoadingOverlay] = React.useState(false);
  const [isOverlayExiting, setIsOverlayExiting] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) {
      setShowLoadingOverlay(true);
      setIsOverlayExiting(false);
    } else if (!isLoading && showLoadingOverlay) {
      setIsOverlayExiting(true);
      const timer = setTimeout(() => {
        setShowLoadingOverlay(false);
        setIsOverlayExiting(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isLoading, showLoadingOverlay]);

  const handleExportPack = useCallback(async () => {
    if (!scrapeResult) return;
    setIsExportingPack(true);
    setShowOffscreenFrames(true);
    await waitForFrames(["frame-1-da", "frame-2-mockup", "frame-3-cover"]);
    try {
      await exportAllFrames(scrapeResult.domain);
      toast.success("Pack téléchargé !");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExportingPack(false);
      setShowOffscreenFrames(false);
    }
  }, [scrapeResult]);

  const handleExportSocialPack = useCallback(async () => {
    if (!scrapeResult) return;
    setIsExportingSocialPack(true);
    setShowOffscreenSocialFrames(true);
    await waitForFrames(["frame-4-social-browser", "frame-5-social-hero", "frame-6-social-nouvelle", "frame-7-social-three", "frame-8-social-card"]);
    try {
      await exportAllSocialFrames(scrapeResult.domain);
      toast.success("Pack social téléchargé !");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExportingSocialPack(false);
      setShowOffscreenSocialFrames(false);
    }
  }, [scrapeResult]);

  return (
    <main className="min-h-screen transition-colors duration-300 bg-background text-foreground">
      {/* FONT LOADING */}
      {fontUrl && <link rel="stylesheet" href={fontUrl} crossOrigin="anonymous" />}
      {localFontFile && (
        <style dangerouslySetInnerHTML={{
          __html: `@font-face { font-family: 'LocalFont'; src: url('${localFontFile}'); }`,
        }} />
      )}

      {/* ICON RAIL */}
      <div className="fixed left-0 top-0 bottom-0 w-16 bg-card border-r border-border z-[100] flex flex-col items-center py-4">
        {/* Logo */}
        <div className="w-9 h-9 flex items-center justify-center mb-4 shrink-0">
          <span className="text-[11px] font-black tracking-tighter text-foreground">DA</span>
        </div>

        {/* Nav icons */}
        {scrapeResult && (
          <div className="flex flex-col items-center gap-1">
            <div className="relative group">
              <button
                onClick={() => setSidebarTab("visuels")}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  sidebarTab === "visuels"
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5"
                }`}
              >
                <Layers className="w-[18px] h-[18px]" />
              </button>
              <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-semibold bg-foreground text-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Visuels
              </span>
            </div>
            <div className="relative group">
              <button
                onClick={() => setSidebarTab("contenu")}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  sidebarTab === "contenu"
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5"
                }`}
              >
                <FileText className="w-[18px] h-[18px]" />
              </button>
              <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-semibold bg-foreground text-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Contenu
              </span>
            </div>
            <div className="relative group">
              <button
                onClick={resetProject}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground/20 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-[16px] h-[16px]" />
              </button>
              <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-semibold bg-foreground text-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Nouveau projet
              </span>
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="mt-auto flex flex-col items-center gap-1">
          <div className="relative group">
            <button
              onClick={() => setShowConsole(!showConsole)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5 transition-all cursor-pointer relative"
            >
              <Terminal className="w-[18px] h-[18px]" />
              {scrapeLogs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
              )}
            </button>
            <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-semibold bg-foreground text-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Console
            </span>
          </div>
          <div className="relative group">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5 transition-all cursor-pointer"
            >
              {mounted ? (
                theme === "dark" ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />
              ) : <div className="w-[18px] h-[18px]" />}
            </button>
            <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-semibold bg-foreground text-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              {mounted ? (theme === "dark" ? "Mode clair" : "Mode sombre") : "Thème"}
            </span>
          </div>
        </div>
      </div>

      {/* CONSOLE PANEL */}
      {showConsole && (
        <div className="fixed bottom-4 left-20 z-[101] w-[480px] max-h-[360px] bg-black/95 backdrop-blur-md rounded-lg border border-white/10 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-[11px] font-mono font-bold text-white/70">Console — Scraper logs</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setScrapeLogs([])} className="text-[10px] text-white/40 hover:text-white/70 font-mono cursor-pointer">clear</button>
              <button onClick={() => setShowConsole(false)} className="text-white/40 hover:text-white/70 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
            {scrapeLogs.length === 0 ? (
              <span className="text-white/30">Aucun log. Lancez une analyse pour voir les logs du scraper.</span>
            ) : (
              scrapeLogs.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-green-400/70 shrink-0">{(l.time / 1000).toFixed(1)}s</span>
                  <span className={l.msg.includes('FAILED') || l.msg.includes('ERROR') ? 'text-red-400' : l.msg.includes('CSS') ? 'text-yellow-300' : 'text-white/80'}>{l.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      {!scrapeResult && (
        <section className="min-h-screen flex flex-col items-center justify-center px-6 pl-20 relative overflow-hidden bg-background">
          {/* Line grid background */}
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage:
                "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
              backgroundSize: "72px 72px",
              opacity: 0.5,
            }}
          />
          {/* Corner markers */}
          {["top-[72px] left-[72px]", "top-[72px] right-[72px]", "bottom-[72px] left-[72px]", "bottom-[72px] right-[72px]"].map((pos, i) => (
            <span key={i} className={`absolute ${pos} text-foreground/15 text-xs font-mono select-none`}>+</span>
          ))}

          <div className="max-w-2xl w-full text-center z-10 flex flex-col items-center gap-10">
            {/* Bracket badge */}
            <div className="inline-flex items-center gap-3" style={{ animation: "fadeSlideUp 0.5s ease-out both" }}>
              <span className="inline-block w-2.5 h-2.5 border-t-[1.5px] border-l-[1.5px] border-foreground/30" />
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/40">
                Générateur d&apos;identité visuelle
              </span>
              <span className="inline-block w-2.5 h-2.5 border-b-[1.5px] border-r-[1.5px] border-foreground/30" />
            </div>

            {/* Headline */}
            <div style={{ animation: "fadeSlideUp 0.5s ease-out 0.08s both" }}>
              <h1
                className="text-[56px] md:text-[68px] font-extrabold tracking-tight leading-[1.05] text-foreground"
                style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                Votre DA client,<br />en quelques secondes.
              </h1>
            </div>

            {/* Description */}
            <p
              className="text-foreground/40 text-base max-w-md mx-auto leading-relaxed"
              style={{ animation: "fadeSlideUp 0.5s ease-out 0.16s both" }}
            >
              Analysez n&apos;importe quel site web et générez instantanément
              des visuels de présentation professionnels.
            </p>

            {/* Input */}
            <div className="w-full max-w-lg" style={{ animation: "fadeSlideUp 0.5s ease-out 0.24s both" }}>
              <UrlInput onLogs={setScrapeLogs} />
            </div>

            {error && (
              <div className="p-4 bg-red-500/5 text-red-500 rounded-xl text-xs font-bold border border-red-500/10 w-full max-w-lg" style={{ animation: "fadeSlideUp 0.3s ease-out both" }}>
                {error}
              </div>
            )}
          </div>
        </section>
      )}

      {/* LOADING OVERLAY */}
      {showLoadingOverlay && <LoadingOverlay isExiting={isOverlayExiting} />}

      {/* APP VIEW */}
      {scrapeResult && !isLoading && (
        <div className="flex min-h-screen">
          {/* SIDEBAR PANEL */}
          <aside className="fixed left-16 top-0 bottom-0 w-[280px] bg-card border-r border-border overflow-hidden z-50 flex flex-col">
            {/* Project header */}
            <div className="px-4 pt-5 pb-4 border-b border-border shrink-0">
              <h2 className="text-sm font-bold truncate leading-tight">
                {scrapeResult.title || "Projet"}
              </h2>
              <p className="text-[11px] text-foreground/30 font-medium mt-0.5 truncate">
                {scrapeResult.domain}
              </p>
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {sidebarTab === "visuels" && (
                <div className="p-4 flex flex-col gap-0">
                  <div className="mb-4 pb-4 border-b border-border">
                    <PageScreenshots />
                  </div>

                  <Accordion type="multiple" defaultValue={[]} className="w-full">
                    <AccordionItem value="identity" className="border-border">
                      <AccordionTrigger className="text-[13px] font-semibold hover:no-underline py-3">
                        Identité agence
                      </AccordionTrigger>
                      <AccordionContent>
                        <AgencyLogoUpload />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="scraped-logos" className="border-border">
                      <AccordionTrigger className="text-[13px] font-semibold hover:no-underline py-3">
                        Logos extraits
                      </AccordionTrigger>
                      <AccordionContent>
                        {scrapeResult.logos.length === 0 && (
                          <p className="text-[11px] text-foreground/30 pb-2">Aucun logo détecté sur ce site.</p>
                        )}
                        <LogoSelector />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="colors" className="border-border">
                      <AccordionTrigger className="text-[13px] font-semibold hover:no-underline py-3">
                        Couleurs
                      </AccordionTrigger>
                      <AccordionContent>
                        {scrapeResult.colors.length === 0 && (
                          <p className="text-[11px] text-foreground/30 pb-2">Aucune couleur extraite.</p>
                        )}
                        <ColorPicker />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="typography" className="border-border">
                      <AccordionTrigger className="text-[13px] font-semibold hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                          Typographie
                          {fontName && !fontUrl && !localFontFile && (
                            <TriangleAlert className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        {!scrapeResult.font.name && (
                          <p className="text-[11px] text-foreground/30 pb-2">Aucune typographie détectée.</p>
                        )}
                        <FontSelector />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="structure" className="border-border">
                      <AccordionTrigger className="text-[13px] font-semibold hover:no-underline py-3">
                        Structure
                      </AccordionTrigger>
                      <AccordionContent>
                        <RadiusSelector />
                      </AccordionContent>
                    </AccordionItem>

                  </Accordion>

                  <div className="mt-8 mb-6">
                    <button
                      onClick={handleExportPack}
                      disabled={isExportingPack}
                      className="w-full h-11 bg-foreground text-background rounded-xl font-semibold text-xs tracking-wide transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-[inset_0_2px_1px_0_rgba(255,255,255,0.4)] active:shadow-[inset_0_-1px_1px_0_rgba(255,255,255,0.2)] active:scale-[0.97]"
                    >
                      {isExportingPack ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {isExportingPack ? "Exportation..." : "Télécharger le pack"}
                    </button>
                  </div>
                </div>
              )}

              {sidebarTab === "contenu" && (
                <div className="p-4 flex flex-col gap-5">
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Tags</span>
                    <ChipSelector selected={contentChips} onChange={setContentChips} />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">Documents contextuels</span>
                    <FileUpload files={contentFiles} onChange={setContentFiles} />
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* MAIN AREA */}
          <main className="flex-1 ml-[344px] bg-background min-h-screen">
            {sidebarTab === "visuels" && (
              <div className="p-12 lg:p-20">
                {/* Sub-tab switcher */}
                <div className="max-w-5xl mx-auto mb-12">
                  <div className="flex bg-foreground/[0.04] rounded-lg p-0.5 gap-0.5 w-fit">
                    <button
                      onClick={() => setVisualSubTab("desktop")}
                      className={`px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        visualSubTab === "desktop"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-foreground/40 hover:text-foreground/60"
                      }`}
                    >
                      Desktop
                    </button>
                    <button
                      onClick={() => setVisualSubTab("social")}
                      className={`px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        visualSubTab === "social"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-foreground/40 hover:text-foreground/60"
                      }`}
                    >
                      Réseaux sociaux
                    </button>
                  </div>
                </div>

                {visualSubTab === "desktop" && (
                  <div className="max-w-5xl mx-auto space-y-32">
                    <PreviewContainer title="01 / IDENTITÉ" id="frame-1-da">
                      <Frame1_DA />
                    </PreviewContainer>
                    <PreviewContainer title="02 / INTERFACE" id="frame-2-mockup">
                      <Frame2_Mockup />
                    </PreviewContainer>
                    <PreviewContainer title="03 / COUVERTURE" id="frame-3-cover">
                      <Frame3_Cover />
                    </PreviewContainer>
                  </div>
                )}

                {visualSubTab === "social" && (
                  <div className="max-w-3xl mx-auto mb-12 flex items-center justify-between">
                    <div className="flex bg-foreground/[0.04] rounded-lg p-0.5 gap-0.5 w-fit">
                    </div>
                    <button
                      onClick={handleExportSocialPack}
                      disabled={isExportingSocialPack}
                      className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer disabled:opacity-30 transition-all hover:opacity-70 active:scale-[0.97]"
                    >
                      {isExportingSocialPack ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      {isExportingSocialPack ? "Export..." : "Télécharger le pack social"}
                    </button>
                  </div>
                )}

                {visualSubTab === "social" && (
                  <div className="max-w-3xl mx-auto space-y-32">
                    <PreviewContainer title="04 / BROWSER FULL" id="frame-4-social-browser" nativeWidth={1080} nativeHeight={1350}>
                      <Frame4_Social_BrowserFull />
                    </PreviewContainer>
                    <PreviewContainer title="05 / HERO SIMPLE" id="frame-5-social-hero" nativeWidth={1080} nativeHeight={675}>
                      <Frame5_Social_HeroSimple />
                    </PreviewContainer>
                    <PreviewContainer title="06 / NOUVELLE RÉALISATION" id="frame-6-social-nouvelle" nativeWidth={1080} nativeHeight={1350}>
                      <Frame6_Social_NouvelleReal />
                    </PreviewContainer>
                    <PreviewContainer title="07 / TROIS IMAGES" id="frame-7-social-three" nativeWidth={1080} nativeHeight={1350}>
                      <Frame7_Social_ThreeImg />
                    </PreviewContainer>
                    <PreviewContainer
                      title="08 / CARD SITE"
                      id="frame-8-social-card"
                      nativeWidth={800}
                      nativeHeight={1000}
                      actions={<CardImageUploadButton />}
                    >
                      <Frame8_Social_CardSite />
                    </PreviewContainer>
                  </div>
                )}
              </div>
            )}

            {sidebarTab === "contenu" && (
              <div style={{ height: "100vh" }}>
                <ContentChat
                  chips={contentChips}
                  onChipsChange={setContentChips}
                  files={contentFiles}
                  onAddFiles={setContentFiles}
                  onRemoveFile={(i) => setContentFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  brief={contentBrief}
                  onBriefChange={setContentBrief}
                  onGenerate={handleGenerateContent}
                  isGenerating={isGeneratingContent}
                  content={generatedContent}
                  error={contentError}
                />
              </div>
            )}
          </main>
        </div>
      )}

      {/* OFFSCREEN FRAMES FOR EXPORT */}
      {showOffscreenFrames && (
        <div className="frames-offscreen">
          <Frame1_DA id="frame-1-da" />
          <Frame2_Mockup id="frame-2-mockup" />
          <Frame3_Cover id="frame-3-cover" />
        </div>
      )}

      {/* OFFSCREEN SOCIAL FRAMES FOR EXPORT */}
      {showOffscreenSocialFrames && (
        <div className="frames-offscreen">
          <Frame4_Social_BrowserFull id="frame-4-social-browser" />
          <Frame5_Social_HeroSimple id="frame-5-social-hero" />
          <Frame6_Social_NouvelleReal id="frame-6-social-nouvelle" />
          <Frame7_Social_ThreeImg id="frame-7-social-three" />
          <Frame8_Social_CardSite id="frame-8-social-card" />
        </div>
      )}
    </main>
  );
}

function CardImageUploadButton() {
  const { cardImage, setCardImage, cardLogoScale, setCardLogoScale } = useDAStore();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCardImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <>
      {/* Logo scale slider */}
      <div className="flex items-center gap-2 border border-border bg-card px-3 py-1.5 rounded-md">
        <span className="text-[10px] font-bold text-foreground/40 whitespace-nowrap">Logo</span>
        <input
          type="range"
          min={0.3}
          max={2}
          step={0.05}
          value={cardLogoScale}
          onChange={(e) => setCardLogoScale(parseFloat(e.target.value))}
          className="w-16 h-1 accent-foreground cursor-pointer"
        />
      </div>
      {cardImage && (
        <button
          onClick={() => setCardImage(null)}
          className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer transition-all hover:opacity-70 active:scale-[0.97] text-red-500/60 hover:text-red-500"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer transition-all hover:opacity-70 active:scale-[0.97]"
      >
        <ImageUp className="w-3 h-3" />
        <span>Image</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFile}
      />
    </>
  );
}

function PreviewContainer({
  children,
  title,
  id,
  nativeWidth = 2373,
  nativeHeight = 1473,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  id: string;
  nativeWidth?: number;
  nativeHeight?: number;
  actions?: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.2);
  const [isExporting, setIsExporting] = React.useState(false);
  const [showExportFrame, setShowExportFrame] = React.useState(false);
  const { scrapeResult, borderRadius } = useDAStore();

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setScale(width / nativeWidth);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [nativeWidth]);

  const handleExport = async () => {
    if (scrapeResult) {
      setIsExporting(true);
      setShowExportFrame(true);
      await waitForFrames([id]);
      try {
        await exportFrame(id, `${scrapeResult.domain}_${id}`);
        toast.success("Frame exportée !");
      } catch {
        toast.error("Erreur lors de l'export");
      } finally {
        setIsExporting(false);
        setShowExportFrame(false);
      }
    }
  };

  const renderExportFrame = () => {
    switch (id) {
      case "frame-1-da": return <Frame1_DA id="frame-1-da" />;
      case "frame-2-mockup": return <Frame2_Mockup id="frame-2-mockup" />;
      case "frame-3-cover": return <Frame3_Cover id="frame-3-cover" />;
      case "frame-4-social-browser": return <Frame4_Social_BrowserFull id="frame-4-social-browser" />;
      case "frame-5-social-hero": return <Frame5_Social_HeroSimple id="frame-5-social-hero" />;
      case "frame-6-social-nouvelle": return <Frame6_Social_NouvelleReal id="frame-6-social-nouvelle" />;
      case "frame-7-social-three": return <Frame7_Social_ThreeImg id="frame-7-social-three" />;
      case "frame-8-social-card": return <Frame8_Social_CardSite id="frame-8-social-card" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between px-2">
        <span className="text-[11px] font-bold text-foreground tracking-widest uppercase opacity-20">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {actions}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer disabled:opacity-30 transition-all hover:opacity-70 active:scale-[0.97]"
          >
            {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            <span>{isExporting ? "Export..." : "Export PNG"}</span>
          </button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="overflow-hidden relative shadow-2xl shadow-black/[0.03] dark:shadow-white/[0.01] bg-card border border-border"
        style={{
          height: `${nativeHeight * scale}px`,
          borderRadius: `${borderRadius * scale}px`,
        }}
      >
        <div
          className="absolute top-0 left-0"
          style={{
            width: `${nativeWidth}px`,
            height: `${nativeHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>

      {showExportFrame && (
        <div className="frames-offscreen">{renderExportFrame()}</div>
      )}
    </div>
  );
}
