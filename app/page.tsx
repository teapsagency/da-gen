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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Frame1_DA } from "@/components/frames/Frame1_DA";
import { Frame2_Mockup } from "@/components/frames/Frame2_Mockup";
import { Frame3_Cover } from "@/components/frames/Frame3_Cover";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { exportFrame, exportAllFrames } from "@/lib/exportFrames";
import {
  Download,
  Sun,
  Moon,
  Loader2,
  ArrowRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

const Aurora = dynamic(() => import("@/components/Aurora"), { ssr: false });

export default function Home() {
  const {
    isLoading,
    scrapeResult,
    error,
    theme,
    toggleTheme,
    fontUrl,
    localFontFile,
    setUrl,
    setIsLoading,
    setScrapeResult,
    setError,
  } = useDAStore();
  const [isExportingPack, setIsExportingPack] = React.useState(false);
  const [showOffscreenFrames, setShowOffscreenFrames] = React.useState(false);
  const [headerUrl, setHeaderUrl] = React.useState("");
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

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
    setIsLoading(true);
    setError(null);
    setUrl(headerUrl);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: headerUrl }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setScrapeResult(data);
    } catch (err: any) {
      setError(err.message || "Impossible d'analyser ce site.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPack = useCallback(async () => {
    if (!scrapeResult) return;
    setIsExportingPack(true);
    setShowOffscreenFrames(true);
    // Wait for offscreen frames to render
    await new Promise((resolve) => setTimeout(resolve, 500));
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
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-foreground/5 transition-all cursor-pointer shrink-0"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-foreground" />
          ) : (
            <Moon className="w-4 h-4 text-foreground" />
          )}
        </button>
      </nav>

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
                <UrlInput />
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
            className="fixed left-0 top-[45px] bottom-0 bg-card border-r border-border overflow-y-auto overflow-x-hidden z-50 transition-all duration-300 ease-in-out"
            style={{
              width: sidebarOpen ? "320px" : "0px",
              padding: sidebarOpen ? "20px" : "0px",
            }}
          >
            <div
              className="mb-5 pb-4 border-b border-border flex items-start justify-between gap-2"
              style={{ minWidth: "280px" }}
            >
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold truncate leading-tight">
                  {scrapeResult.title || "Projet"}
                </h2>
                <p className="text-[11px] text-foreground/30 font-medium mt-1 truncate">
                  {scrapeResult.domain}
                </p>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground/30 hover:text-foreground/60 transition-all cursor-pointer shrink-0 mt-0.5"
                title="Fermer le panneau"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
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
                  Typographie
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
          </aside>

          {/* Sidebar toggle button when collapsed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed left-4 top-[55px] z-50 p-2 rounded-lg bg-card border border-border shadow-sm hover:bg-foreground/5 text-foreground/40 hover:text-foreground/60 transition-all cursor-pointer"
              title="Ouvrir le panneau"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {/* PREVIEWS */}
          <main
            className="flex-1 p-12 lg:p-20 bg-background transition-all duration-300 ease-in-out"
            style={{ marginLeft: sidebarOpen ? "320px" : "0px" }}
          >
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
}: {
  children: React.ReactNode;
  title: string;
  id: string;
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
        setScale(width / 2373);
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const handleExport = async () => {
    if (scrapeResult) {
      setIsExporting(true);
      setShowExportFrame(true);
      // Wait for the offscreen frame to render
      await new Promise((resolve) => setTimeout(resolve, 500));
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
          height: `${2373 * scale * (1473 / 2373)}px`,
          borderRadius: `${borderRadius * scale}px`,
        }}
      >
        <div
          className="absolute top-0 left-0"
          style={{
            width: "2373px",
            height: "1473px",
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
