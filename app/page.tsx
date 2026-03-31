"use client";

import React, { useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
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
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ContentChat } from "@/components/ContentChat";
import { FileUpload } from "@/components/ui/FileUpload";
import { ChipSelector } from "@/components/ui/ChipSelector";
import { GeneratedContent } from "@/types";
import { exportFrame, exportAllFrames } from "@/lib/exportFrames";
import {
  Download,
  Sun,
  Moon,
  Loader2,
  ArrowRight,
  TriangleAlert,
  Terminal,
  X,
} from "lucide-react";

const Aurora = dynamic(() => import("@/components/Aurora"), { ssr: false });

/** Wait until all frame IDs exist in the DOM, with a safety timeout */
function waitForFrames(ids: string[], timeout = 3000): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (ids.every((id) => document.getElementById(id))) {
        // One extra rAF to let paint finish
        requestAnimationFrame(() => resolve());
      } else if (Date.now() - start > timeout) {
        resolve(); // fallback — don't block export forever
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
  } = useDAStore();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const [isExportingPack, setIsExportingPack] = React.useState(false);
  const [showOffscreenFrames, setShowOffscreenFrames] = React.useState(false);
  const [headerUrl, setHeaderUrl] = React.useState("");
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

  // Try to parse partial JSON from stream into GeneratedContent
  const tryParsePartial = React.useCallback((raw: string): GeneratedContent | null => {
    // Strip markdown code blocks
    let clean = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    // Try to complete partial JSON by closing open braces/brackets
    const attempts = [clean];
    let closers = '';
    for (let i = clean.length - 1; i >= 0; i--) {
      if (clean[i] === '{') closers += '}';
      else if (clean[i] === '[') closers += ']';
      else if (clean[i] === '}' && closers.endsWith('}')) closers = closers.slice(0, -1);
      else if (clean[i] === ']' && closers.endsWith(']')) closers = closers.slice(0, -1);
    }
    // Try adding quote + closers if we're mid-string
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

        // Try to parse partial content for live preview
        const partial = tryParsePartial(accumulated);
        if (partial) setGeneratedContent(partial);
      }

      // Final parse
      const clean = accumulated.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
      const finalContent = JSON.parse(clean);
      setGeneratedContent(finalContent);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "Erreur lors de la génération.");
    } finally {
      setIsGeneratingContent(false);
      setStreamingContent("");
    }
  }, [scrapeResult, contentChips, contentFiles, contentBrief, tryParsePartial]);

  // States for handling the slide-out unmount of the LoadingOverlay
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
      }, 700); // 700ms matches the exit animation duration in LoadingOverlay.tsx
      return () => clearTimeout(timer);
    }
  }, [isLoading, showLoadingOverlay]);

  const handleHeaderAnalyze = async () => {
    if (!headerUrl) return;

    let urlToAnalyze = headerUrl.trim();
    if (!/^https?:\/\//i.test(urlToAnalyze)) {
      urlToAnalyze = `https://${urlToAnalyze}`;
      setHeaderUrl(urlToAnalyze);
    }

    try { new URL(urlToAnalyze); } catch {
      setError("URL invalide.");
      return;
    }

    const { screenshotDelay } = useDAStore.getState();

    setIsLoading(true);
    setError(null);
    setUrl(urlToAnalyze);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToAnalyze, delay: screenshotDelay }),
      });
      const data = await response.json();
      if (data._logs) setScrapeLogs(data._logs);
      if (data.error) throw new Error(data.error);
      setScrapeResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible d'analyser ce site.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPack = useCallback(async () => {
    if (!scrapeResult) return;
    setIsExportingPack(true);
    setShowOffscreenFrames(true);
    // Wait for offscreen frames to actually render in the DOM
    await waitForFrames(["frame-1-da", "frame-2-mockup", "frame-3-cover"]);
    try {
      await exportAllFrames(scrapeResult.domain);
    } finally {
      setIsExportingPack(false);
      setShowOffscreenFrames(false);
    }
  }, [scrapeResult]);

  return (
    <main
      className={`min-h-screen transition-colors duration-300 bg-background text-foreground`}
    >
      {/* CENTRALIZED FONT LOADING — single <link> instead of per-frame @import */}
      {fontUrl && (
        <link rel="stylesheet" href={fontUrl} crossOrigin="anonymous" />
      )}
      {localFontFile && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @font-face {
            font-family: 'LocalFont';
            src: url('${localFontFile}');
          }
        `,
          }}
        />
      )}

      {/* HEADER */}
      <nav className="fixed top-0 w-full flex items-center px-5 py-2.5 z-[100] bg-card/80 backdrop-blur-md border-b border-border gap-4">
        <div className="text-[13px] font-bold tracking-tight text-foreground shrink-0">
          DA.gen
        </div>

        {/* Compact URL input — visible when results are loaded */}
        {scrapeResult && !isLoading && (
          <div className="flex-1 flex justify-center max-w-lg mx-auto">
            <div className="flex w-full bg-background border border-border rounded-lg overflow-hidden h-8">
              <input
                type="text"
                value={headerUrl}
                onChange={(e) => setHeaderUrl(e.target.value)}
                placeholder="Nouvelle URL..."
                onKeyDown={(e) => e.key === "Enter" && handleHeaderAnalyze()}
                className="flex-1 px-3 text-xs outline-none bg-transparent font-medium placeholder:text-foreground/20"
              />
              <button
                onClick={handleHeaderAnalyze}
                disabled={!headerUrl || isLoading}
                className="h-full px-3 bg-foreground text-background text-[10px] font-bold flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer disabled:opacity-30"
              >
                Générer
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowConsole(!showConsole)}
          className="p-2 rounded-full hover:bg-foreground/5 transition-all cursor-pointer shrink-0 relative"
          title="Console"
        >
          <Terminal className="w-4 h-4 text-foreground" />
          {scrapeLogs.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full" />
          )}
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-foreground/5 transition-all cursor-pointer shrink-0"
        >
          {mounted ? (
            theme === "dark" ? (
              <Sun className="w-4 h-4 text-foreground" />
            ) : (
              <Moon className="w-4 h-4 text-foreground" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </button>
      </nav>

      {/* Console panel */}
      {showConsole && (
        <div className="fixed top-11 right-4 z-[101] w-[500px] max-h-[400px] bg-black/95 backdrop-blur-md rounded-lg border border-white/10 shadow-2xl flex flex-col">
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

      {/* 1. HERO SECTION — stays mounted during loading so the overlay slides on top */}
      {!scrapeResult && (
        <section className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
          {/* Aurora animated background */}
          <div className="absolute inset-0 z-0 opacity-50">
            <Aurora
              colorStops={
                theme === "dark"
                  ? ["#5B2C8E", "#E8637A", "#FFB86C"]
                  : ["#7B8FF8", "#9B59E8", "#F5A0FF"]
              }
              amplitude={1.2}
              blend={0.7}
              speed={0.3}
            />
          </div>

          {/* Subtle dot grid overlay */}
          <div
            className="absolute inset-0 z-[1]"
            style={{
              backgroundImage:
                "radial-gradient(circle, var(--foreground) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              opacity: 0.02,
            }}
          />

          <div className="max-w-3xl w-full text-center z-10 flex flex-col items-center gap-8">
            {/* Animated badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/50 backdrop-blur-sm shadow-sm"
              style={{ animation: "fadeSlideUp 0.6s ease-out both" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-semibold text-foreground/50 tracking-wide">
                Générateur d'identité visuelle
              </span>
            </div>

            {/* Headline — Cabinet Grotesk */}
            <div style={{ animation: "fadeSlideUp 0.6s ease-out 0.1s both" }}>
              <h1
                className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08]"
                style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
              >
                Votre DA client, <br />
                <span className="bg-gradient-to-r from-foreground/90 via-foreground/50 to-foreground/80 bg-clip-text text-transparent">
                  en quelques secondes.
                </span>
              </h1>
            </div>

            {/* Description */}
            <p
              className="text-foreground/35 text-lg max-w-lg mx-auto font-medium leading-relaxed"
              style={{ animation: "fadeSlideUp 0.6s ease-out 0.2s both" }}
            >
              Analysez n'importe quel site web et générez instantanément des
              visuels de présentation professionnels.
            </p>

            {/* Input card */}
            <div
              className="w-full max-w-xl"
              style={{ animation: "fadeSlideUp 0.6s ease-out 0.3s both" }}
            >
              <div className="bg-card/70 backdrop-blur-xl p-2.5 rounded-2xl border border-border/50 shadow-2xl shadow-black/[0.06]">
                <UrlInput onLogs={setScrapeLogs} />
              </div>
            </div>

            {error && (
              <div
                className="p-4 bg-red-500/5 text-red-500 rounded-xl text-xs font-bold border border-red-500/10 w-full max-w-xl"
                style={{ animation: "fadeSlideUp 0.3s ease-out both" }}
              >
                {error}
              </div>
            )}

            {/* Bottom accent features */}
            <div
              className="flex items-center gap-6 mt-4"
              style={{ animation: "fadeSlideUp 0.6s ease-out 0.4s both" }}
            >
              {[
                "Couleurs & typographie",
                "Screenshots HD",
                "Export en 1 clic",
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-foreground/15" />
                  <span className="text-[11px] text-foreground/25 font-medium">
                    {feat}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* NEW FULLSCREEN LOADING OVERLAY */}
      {showLoadingOverlay && <LoadingOverlay isExiting={isOverlayExiting} />}

      {/* Generated Result Section */}
      {scrapeResult && !isLoading && (
        <div className="pt-12 flex min-h-screen">
          {/* SIDEBAR SHADCN ACCORDION */}
          <aside
            className="fixed left-0 top-[45px] bottom-0 w-[320px] bg-card border-r border-border overflow-hidden z-50 flex flex-col"
          >
            {/* Project header */}
            <div className="px-5 pt-5 pb-4 border-b border-border shrink-0">
              <h2 className="text-sm font-bold truncate leading-tight">
                {scrapeResult.title || "Projet"}
              </h2>
              <p className="text-[11px] text-foreground/30 font-medium mt-1 truncate">
                {scrapeResult.domain}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="px-5 py-3 border-b border-border shrink-0">
              <div className="flex bg-foreground/[0.05] rounded-lg p-0.5 gap-0.5">
                {(["visuels", "contenu"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSidebarTab(tab)}
                    className={`
                      flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer capitalize
                      ${sidebarTab === tab
                        ? "bg-card text-foreground shadow-sm"
                        : "text-foreground/40 hover:text-foreground/60"
                      }
                    `}
                  >
                    {tab === "visuels" ? "Visuels" : "Contenu"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {sidebarTab === "visuels" && (
                <div className="p-5 flex flex-col gap-0">
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
                        <LogoSelector />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="colors" className="border-border">
                      <AccordionTrigger className="text-[13px] font-semibold hover:no-underline py-3">
                        Couleurs
                      </AccordionTrigger>
                      <AccordionContent>
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
                      className="w-full h-11 bg-foreground text-background rounded-xl font-semibold text-xs tracking-wide hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isExportingPack ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {isExportingPack ? "Exportation..." : "Télécharger le pack"}
                    </button>
                  </div>
                </div>
              )}

              {sidebarTab === "contenu" && (
                <div className="p-5 flex flex-col gap-5">
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">
                      Tags
                    </span>
                    <ChipSelector selected={contentChips} onChange={setContentChips} />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">
                      Documents contextuels
                    </span>
                    <FileUpload files={contentFiles} onChange={setContentFiles} />
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* MAIN AREA */}
          <main className="flex-1 ml-[320px] bg-background" style={{ minHeight: "calc(100vh - 45px)" }}>
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
                  <div className="max-w-3xl mx-auto space-y-32">
                    <PreviewContainer title="04 / BROWSER FULL" id="frame-4-social-browser" nativeWidth={1080} nativeHeight={1350}>
                      <Frame4_Social_BrowserFull />
                    </PreviewContainer>

                    <PreviewContainer title="05 / HERO SIMPLE" id="frame-5-social-hero" nativeWidth={1080} nativeHeight={723}>
                      <Frame5_Social_HeroSimple />
                    </PreviewContainer>

                    <PreviewContainer title="06 / NOUVELLE RÉALISATION" id="frame-6-social-nouvelle" nativeWidth={1080} nativeHeight={1350}>
                      <Frame6_Social_NouvelleReal />
                    </PreviewContainer>

                    <PreviewContainer title="07 / TROIS IMAGES" id="frame-7-social-three" nativeWidth={1080} nativeHeight={1350}>
                      <Frame7_Social_ThreeImg />
                    </PreviewContainer>
                  </div>
                )}
              </div>
            )}

            {sidebarTab === "contenu" && (
              <div style={{ height: "calc(100vh - 45px)" }}>
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

      {/* HIDDEN FOR EXPORT — only mounted during export to avoid perf overhead */}
      {showOffscreenFrames && (
        <div className="frames-offscreen">
          <Frame1_DA id="frame-1-da" />
          <Frame2_Mockup id="frame-2-mockup" />
          <Frame3_Cover id="frame-3-cover" />
        </div>
      )}
    </main>
  );
}

function PreviewContainer({
  children,
  title,
  id,
  nativeWidth = 2373,
  nativeHeight = 1473,
}: {
  children: React.ReactNode;
  title: string;
  id: string;
  nativeWidth?: number;
  nativeHeight?: number;
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
      // Wait for the offscreen frame to actually render in the DOM
      await waitForFrames([id]);
      try {
        await exportFrame(id, `${scrapeResult.domain}_${id}`);
      } finally {
        setIsExporting(false);
        setShowExportFrame(false);
      }
    }
  };

  // Determine which Frame component to render for export
  const renderExportFrame = () => {
    switch (id) {
      case "frame-1-da":
        return <Frame1_DA id="frame-1-da" />;
      case "frame-2-mockup":
        return <Frame2_Mockup id="frame-2-mockup" />;
      case "frame-3-cover":
        return <Frame3_Cover id="frame-3-cover" />;
      case "frame-4-social-browser":
        return <Frame4_Social_BrowserFull id="frame-4-social-browser" />;
      case "frame-5-social-hero":
        return <Frame5_Social_HeroSimple id="frame-5-social-hero" />;
      case "frame-6-social-nouvelle":
        return <Frame6_Social_NouvelleReal id="frame-6-social-nouvelle" />;
      case "frame-7-social-three":
        return <Frame7_Social_ThreeImg id="frame-7-social-three" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex items-center justify-between px-2">
        <span className="text-[11px] font-bold text-foreground tracking-widest uppercase opacity-20">
          {title}
        </span>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="text-[11px] font-bold hover:opacity-50 transition-opacity border border-border bg-card px-3 py-1.5 rounded-md shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-30"
        >
          {isExporting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          <span>{isExporting ? "Export..." : "Export PNG"}</span>
        </button>
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

      {/* Offscreen frame for individual export */}
      {showExportFrame && (
        <div className="frames-offscreen">{renderExportFrame()}</div>
      )}
    </div>
  );
}
