"use client";

import React, { useEffect, useCallback } from "react";
import { useDAStore } from "@/store/daStore";
import { UrlInput } from "@/components/ui/UrlInput";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { FontSelector } from "@/components/ui/FontSelector";
import { LogoSelector } from "@/components/ui/LogoSelector";
import { AgencyLogoUpload } from "@/components/ui/AgencyLogoUpload";
import { RadiusSelector } from "@/components/ui/RadiusSelector";
import { EditableValue, percentFormat, percentParse, pxFormat, pxParse } from "@/components/ui/EditableValue";
import { PageScreenshots } from "@/components/ui/PageScreenshots";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Frame1_DA } from "@/components/frames/Frame1_DA";
import { FrameColors } from "@/components/frames/FrameColors";
import { Frame2_Mockup } from "@/components/frames/Frame2_Mockup";
import { Frame3_Cover } from "@/components/frames/Frame3_Cover";
import { Frame4_Social_BrowserFull } from "@/components/frames/Frame4_Social_BrowserFull";
import { Frame5_Social_HeroSimple } from "@/components/frames/Frame5_Social_HeroSimple";
import { Frame6_Social_NouvelleReal } from "@/components/frames/Frame6_Social_NouvelleReal";
import { Frame7_Social_ThreeImg } from "@/components/frames/Frame7_Social_ThreeImg";
import { Frame8_Social_CardSite } from "@/components/frames/Frame8_Social_CardSite";
import { Frame9_Social_BoardDesktop } from "@/components/frames/Frame9_Social_BoardDesktop";
import { Frame10_Social_BoardMobile } from "@/components/frames/Frame10_Social_BoardMobile";
import { PreviewStage } from "@/components/preview/PreviewStage";
import { PreviewSidebar } from "@/components/preview/PreviewSidebar";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { ContentChat } from "@/components/ContentChat";
import { FileUpload } from "@/components/ui/FileUpload";
import { ChipSelector } from "@/components/ui/ChipSelector";
import { SettingsPanel } from "@/components/ui/SettingsPanel";
import { HistoryPanel } from "@/components/ui/HistoryPanel";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { SitemapPanel } from "@/components/ui/SitemapPanel";
import { useProjectPersistence } from "@/lib/useProjectPersistence";
import { useFontLoader } from "@/lib/useFontLoader";
import { listProjects, loadProject, touchProject } from "@/lib/projectStorage";
import type { ProjectMeta } from "@/types";
import { localFontFaceCss } from "@/lib/fontName";
import { GeneratedContent } from "@/types";
import { exportFrame, exportFullPack } from "@/lib/exportFrames";
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
  Settings,
  History,
  Plus,
  StretchHorizontal,
  StretchVertical,
  Copy,
  Check,
  MonitorSmartphone,
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
    exportScale,
    setExportScale,
    setUrl,
    setIsLoading,
    setScrapeResult,
    setError,
    resetProject,
  } = useDAStore();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Persist project (scrapeResult, screenshots, customizations) to IndexedDB
  // so it survives page reloads. Light state stays in localStorage via Zustand persist.
  useProjectPersistence();
  // Charge les @font-face dès la fin de l'analyse (sans attendre l'onglet Typographie).
  useFontLoader();
  const [isExportingPack, setIsExportingPack] = React.useState(false);
  const [showOffscreenFrames, setShowOffscreenFrames] = React.useState(false);
  const [showOffscreenSocialFrames, setShowOffscreenSocialFrames] = React.useState(false);
  const [sidebarTab, setSidebarTab] = React.useState<"visuels" | "contenu" | "preview" | "settings" | "historique">("visuels");

  // Saved projects — drives the recent-projects shortlist on the home screen.
  // Refreshed every time the home screen comes back into view.
  const [recentProjects, setRecentProjects] = React.useState<ProjectMeta[]>([]);
  React.useEffect(() => {
    if (!scrapeResult) {
      listProjects().then(setRecentProjects);
    }
  }, [scrapeResult, sidebarTab]);

  const loadProjectData = useDAStore((s) => s.loadProjectData);
  const handleOpenProject = React.useCallback(
    async (id: string) => {
      const project = await loadProject(id);
      if (project && project.scrapeResult) {
        await touchProject(id);
        loadProjectData(project);
        setSidebarTab("visuels");
      } else {
        toast.error("Projet introuvable.");
      }
    },
    [loadProjectData],
  );
  const [visualSubTab, setVisualSubTab] = React.useState<"charte" | "desktop" | "social">("charte");

  // Content generation state — chips/brief/result persisted in store (and IDB).
  // Files are kept locally (File objects can't be serialised). Streaming/error/loading
  // are ephemeral runtime state, not persisted.
  const contentChips = useDAStore((s) => s.contentChips);
  const setContentChips = useDAStore((s) => s.setContentChips);
  const contentBrief = useDAStore((s) => s.contentBrief);
  const setContentBrief = useDAStore((s) => s.setContentBrief);
  const generatedContent = useDAStore((s) => s.generatedContent);
  const setGeneratedContent = useDAStore((s) => s.setGeneratedContent);
  const [contentFiles, setContentFiles] = React.useState<File[]>([]);
  const [streamingContent, setStreamingContent] = React.useState<string>("");
  const [isGeneratingContent, setIsGeneratingContent] = React.useState(false);
  const [contentError, setContentError] = React.useState<string | null>(null);
  const scrapeLogs = useDAStore((s) => s.scrapeLogs);
  const setScrapeLogs = useDAStore((s) => s.setScrapeLogs);
  const clearScrapeLogs = useDAStore((s) => s.clearScrapeLogs);
  const sitemapCount = useDAStore((s) => s.sitemapUrls.length);
  const [showConsole, setShowConsole] = React.useState(false);

  const tryParsePartial = React.useCallback((raw: string): GeneratedContent | null => {
    const clean = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
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
      const { geminiApiKeys, activeApiKeyId, contentPrompt, geminiModel, sitemapUrls, includeSitemapInContent } = useDAStore.getState();
      const activeKey = geminiApiKeys.find((k) => k.id === activeApiKeyId) || geminiApiKeys[0];
      const geminiApiKey = activeKey?.key || '';
      const formData = new FormData();
      formData.append("chips", JSON.stringify(contentChips));
      formData.append("siteData", JSON.stringify({
        title: scrapeResult.title,
        domain: scrapeResult.domain,
        siteUrl: scrapeResult.siteUrl,
      }));
      formData.append("clientBrief", contentBrief);
      if (geminiApiKey) formData.append("apiKey", geminiApiKey);
      if (contentPrompt) formData.append("prompt", contentPrompt);
      if (geminiModel) formData.append("model", geminiModel);
      const sitemapToSend = includeSitemapInContent ? sitemapUrls : [];
      formData.append("sitemap", JSON.stringify(sitemapToSend));
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

      // Final parse — but never let a malformed tail wipe a valid partial.
      const clean = accumulated.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
      try {
        const final = JSON.parse(clean);
        if (final?.caseStudy) setGeneratedContent(final);
      } catch {
        const partial = tryParsePartial(accumulated);
        if (partial) {
          setGeneratedContent(partial);
        } else {
          throw new Error("La réponse de l'IA est incomplète ou invalide. Relancez la génération.");
        }
      }
    } catch (err) {
      setContentError(err instanceof Error ? err.message : "Erreur lors de la génération.");
    } finally {
      setIsGeneratingContent(false);
      setStreamingContent("");
    }
  }, [scrapeResult, contentChips, contentFiles, contentBrief, tryParsePartial]);

  // "Nouveau projet" — clears the editing canvas and returns to the home
  // screen. No confirmation needed: the current project stays safe in the
  // history and can be reopened anytime.
  const handleResetProject = React.useCallback(() => {
    resetProject();
    setSidebarTab("visuels");
  }, [resetProject]);

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
    setShowOffscreenSocialFrames(true);
    await waitForFrames([
      "frame-1-da", "frame-colors", "frame-2-mockup", "frame-3-cover",
      "frame-4-social-browser", "frame-5-social-hero", "frame-6-social-nouvelle", "frame-7-social-three", "frame-8-social-card",
      "frame-9-board-desktop", "frame-10-board-mobile",
    ]);
    try {
      await exportFullPack(scrapeResult.domain, exportScale);
      toast.success("Pack téléchargé !");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExportingPack(false);
      setShowOffscreenFrames(false);
      setShowOffscreenSocialFrames(false);
    }
  }, [scrapeResult, exportScale]);


  return (
    <main className="min-h-screen transition-colors duration-300 bg-background text-foreground">
      {/* FONT LOADING */}
      {/* No crossOrigin: a plain cross-origin <link> stylesheet loads & applies
          fine; forcing CORS would break CDNs like Fontshare. */}
      {fontUrl && <link rel="stylesheet" href={fontUrl} />}
      {localFontFile && (
        <style dangerouslySetInnerHTML={{ __html: localFontFaceCss(localFontFile) }} />
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
                aria-label="Visuels"
                aria-current={sidebarTab === "visuels"}
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
                aria-label="Contenu"
                aria-current={sidebarTab === "contenu"}
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
                onClick={() => setSidebarTab("preview")}
                aria-label="Preview"
                aria-current={sidebarTab === "preview"}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  sidebarTab === "preview"
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5"
                }`}
              >
                <MonitorSmartphone className="w-[18px] h-[18px]" />
              </button>
              <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-semibold bg-foreground text-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                Preview
              </span>
            </div>
            <div className="relative group">
              <button
                onClick={handleResetProject}
                aria-label="Nouveau projet"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-500/70 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all cursor-pointer"
              >
                <Plus className="w-[18px] h-[18px]" />
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
              onClick={() => setSidebarTab("historique")}
              aria-label="Historique des projets"
              aria-current={sidebarTab === "historique"}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                sidebarTab === "historique"
                  ? "bg-foreground/10 text-foreground"
                  : "text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5"
              }`}
            >
              <History className="w-[18px] h-[18px]" />
            </button>
            <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-semibold bg-foreground text-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Historique
            </span>
          </div>
          <div className="relative group">
            <button
              onClick={() => setSidebarTab("settings")}
              aria-label="Paramètres"
              aria-current={sidebarTab === "settings"}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                sidebarTab === "settings"
                  ? "bg-foreground/10 text-foreground"
                  : "text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5"
              }`}
            >
              <Settings className="w-[18px] h-[18px]" />
            </button>
            <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-semibold bg-foreground text-background rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              Paramètres
            </span>
          </div>
          <div className="relative group">
            <button
              onClick={() => setShowConsole(!showConsole)}
              aria-label="Console"
              aria-expanded={showConsole}
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
              aria-label={mounted ? (theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre") : "Changer de thème"}
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
              <button onClick={clearScrapeLogs} className="text-[10px] text-white/40 hover:text-white/70 font-mono cursor-pointer">clear</button>
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

      {/* SETTINGS (accessible anytime, even without a scrape) */}
      {sidebarTab === "settings" && (
        <section className="min-h-screen pl-20 py-12 px-8 bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-[28px] font-bold tracking-tight leading-none" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Paramètres
                </h1>
                <p className="text-[12.5px] text-foreground/50 mt-2 leading-relaxed">
                  Configuration locale, stockée dans ton navigateur.
                </p>
              </div>
              <button
                onClick={() => setSidebarTab("visuels")}
                className="text-[11px] font-semibold text-foreground/60 hover:text-foreground cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-foreground/5 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                {scrapeResult ? "Retour au projet" : "Fermer"}
              </button>
            </div>
            <div className="bg-card border border-border rounded-xl">
              <SettingsPanel />
            </div>
          </div>
        </section>
      )}

      {/* HISTORY (accessible anytime) */}
      {sidebarTab === "historique" && (
        <section className="min-h-screen pl-20 py-12 px-8 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-[28px] font-bold tracking-tight leading-none" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                  Historique
                </h1>
                <p className="text-[12.5px] text-foreground/50 mt-2 leading-relaxed">
                  Tous tes projets, enregistrés localement dans ce navigateur.
                </p>
              </div>
              <button
                onClick={() => setSidebarTab("visuels")}
                className="text-[11px] font-semibold text-foreground/60 hover:text-foreground cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-foreground/5 transition-all"
              >
                <X className="w-3.5 h-3.5" />
                {scrapeResult ? "Retour au projet" : "Fermer"}
              </button>
            </div>
            <HistoryPanel onProjectOpen={() => setSidebarTab("visuels")} />
          </div>
        </section>
      )}

      {/* HERO SECTION */}
      {!scrapeResult && sidebarTab !== "settings" && sidebarTab !== "historique" && (
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

          <div className="max-w-5xl w-full z-10 flex flex-col items-center gap-10">
            {/* Inner column kept narrow so the headline stays readable, while the
                recent-projects grid below can span the wider container. */}
            <div className="w-full max-w-2xl text-center flex flex-col items-center gap-10">
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

            {/* Recent projects — the 4 most recently opened, shown as cards. */}
            {recentProjects.length > 0 && (
              <div
                className="w-full flex flex-col items-center gap-3"
                style={{ animation: "fadeSlideUp 0.5s ease-out 0.32s both" }}
              >
                {/* Le bloc se dimensionne sur le nombre de cartes (w-fit) puis se
                    centre (items-center du parent). Le label s'aligne ainsi sur
                    la première carte au lieu de flotter au-dessus du vide. */}
                <div className="w-fit max-w-full flex flex-col gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/25 px-1">
                    Projets récents
                  </span>
                  <div className="flex flex-wrap justify-center gap-3.5">
                    {recentProjects.slice(0, 4).map((p) => (
                      <div key={p.id} className="w-[150px] sm:w-[210px]">
                        <ProjectCard meta={p} onOpen={() => handleOpenProject(p.id)} />
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setSidebarTab("historique")}
                  className="text-[11px] font-semibold text-foreground/40 hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5 mt-1"
                >
                  <History className="w-3 h-3" />
                  Voir tous les projets ({recentProjects.length})
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* LOADING OVERLAY */}
      {showLoadingOverlay && <LoadingOverlay isExiting={isOverlayExiting} />}

      {/* APP VIEW */}
      {scrapeResult && !isLoading && sidebarTab !== "settings" && sidebarTab !== "historique" && (
        <div className="flex min-h-screen">
          {/* SIDEBAR PANEL */}
          <aside className="fixed left-16 top-0 bottom-0 w-[280px] bg-card border-r border-border overflow-hidden z-50 flex flex-col">
            {/* Project header */}
            <div className="px-4 pt-5 pb-4 border-b border-border shrink-0">
              {scrapeResult.domain && (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${scrapeResult.domain}&sz=64`}
                  alt=""
                  width={28}
                  height={28}
                  className="w-7 h-7 mb-2 border border-border bg-white object-contain"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <h2 className="text-sm font-bold truncate leading-tight">
                {scrapeResult.title || "Projet"}
              </h2>
              <ProjectUrlLine
                domain={scrapeResult.domain}
                url={scrapeResult.siteUrl || `https://${scrapeResult.domain}`}
              />
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
                        <DesktopPaddingToggle />
                        <DropShadowToggle />
                      </AccordionContent>
                    </AccordionItem>

                  </Accordion>

                  <div className="mt-8 mb-6">
                    {/* Qualité d'export : ×2 = visuels deux fois plus nets pour
                        les réseaux (fichiers plus lourds). S'applique au pack ET
                        aux exports PNG unitaires. */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-medium text-foreground/40">Qualité d&apos;export</span>
                      <div className="flex items-center gap-1 bg-foreground/5 border border-border rounded-lg p-0.5">
                        {[1, 2].map((s) => (
                          <button
                            key={s}
                            onClick={() => setExportScale(s)}
                            className={`px-2.5 h-6 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              exportScale === s ? "bg-background shadow-sm text-foreground" : "text-foreground/50 hover:text-foreground/80"
                            }`}
                          >
                            ×{s}
                          </button>
                        ))}
                      </div>
                    </div>
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
                <div className="p-4">
                  <Accordion type="multiple" defaultValue={["tags", "sitemap"]} className="w-full">
                    <AccordionItem value="tags" className="border-border">
                      <AccordionTrigger className="text-[13px] font-semibold hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                          Tags
                          {contentChips.length > 0 && (
                            <span className="text-[10px] font-normal text-foreground/40">({contentChips.length})</span>
                          )}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pb-1">
                          <ChipSelector selected={contentChips} onChange={setContentChips} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="documents" className="border-border">
                      <AccordionTrigger className="text-[13px] font-semibold hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                          Documents contextuels
                          {contentFiles.length > 0 && (
                            <span className="text-[10px] font-normal text-foreground/40">({contentFiles.length})</span>
                          )}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pb-1">
                          <FileUpload files={contentFiles} onChange={setContentFiles} />
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="sitemap" className="border-border">
                      <AccordionTrigger className="text-[13px] font-semibold hover:no-underline py-3">
                        <span className="flex items-center gap-2">
                          Sitemap
                          {sitemapCount > 0 && (
                            <span className="text-[10px] font-normal text-foreground/40">({sitemapCount})</span>
                          )}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pb-1">
                          <SitemapPanel />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}

              {sidebarTab === "preview" && <PreviewSidebar />}
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
                      onClick={() => setVisualSubTab("charte")}
                      className={`px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                        visualSubTab === "charte"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-foreground/40 hover:text-foreground/60"
                      }`}
                    >
                      Charte Graphique
                    </button>
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

                {visualSubTab === "charte" && (
                  <div className="max-w-5xl mx-auto space-y-32">
                    <PreviewContainer title="01 / IDENTITÉ" id="frame-1-da" actions={<IdentityLogoScaleControl />}>
                      <Frame1_DA />
                    </PreviewContainer>
                    <PreviewContainer title="02 / COULEURS" id="frame-colors" actions={<ColorsOrientationToggle />}>
                      <FrameColors />
                    </PreviewContainer>
                  </div>
                )}

                {visualSubTab === "desktop" && (
                  <div className="max-w-5xl mx-auto space-y-32">
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
                    <PreviewContainer
                      title="04 / BROWSER FULL"
                      id="frame-4-social-browser"
                      nativeWidth={1080}
                      nativeHeight={1350}
                      actions={<BrowserBlurControl />}
                      actionsBelow
                    >
                      <Frame4_Social_BrowserFull />
                    </PreviewContainer>
                    <PreviewContainer title="05 / HERO SIMPLE" id="frame-5-social-hero" nativeWidth={1080} nativeHeight={675}>
                      <Frame5_Social_HeroSimple />
                    </PreviewContainer>
                    <PreviewContainer title="06 / NOUVELLE RÉALISATION" id="frame-6-social-nouvelle" nativeWidth={1080} nativeHeight={1350} actions={<ShowcaseWordingControl />}>
                      <Frame6_Social_NouvelleReal />
                    </PreviewContainer>
                    <PreviewContainer title="07 / TROIS IMAGES" id="frame-7-social-three" nativeWidth={1080} nativeHeight={1350} actions={<ShowcaseWordingControl />}>
                      <Frame7_Social_ThreeImg />
                    </PreviewContainer>
                    <PreviewContainer
                      title="08 / CARD SITE"
                      id="frame-8-social-card"
                      nativeWidth={1080}
                      nativeHeight={1350}
                      actions={<CardImageUploadButton />}
                      actionsBelow
                    >
                      <Frame8_Social_CardSite />
                    </PreviewContainer>
                    <PreviewContainer title="09 / PLANCHE DESKTOP" id="frame-9-board-desktop" nativeWidth={1080} nativeHeight={1350} actions={<BoardCountControl />}>
                      <Frame9_Social_BoardDesktop />
                    </PreviewContainer>
                    <PreviewContainer title="10 / PLANCHE MOBILE" id="frame-10-board-mobile" nativeWidth={1080} nativeHeight={1350} actions={<BoardCountControl />}>
                      <Frame10_Social_BoardMobile />
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
                  onOpenPreview={() => setSidebarTab("preview")}
                />
              </div>
            )}

            {sidebarTab === "preview" && <PreviewStage />}
          </main>
        </div>
      )}

      {/* OFFSCREEN FRAMES FOR EXPORT */}
      {showOffscreenFrames && (
        <div className="frames-offscreen">
          <Frame1_DA id="frame-1-da" />
          <FrameColors id="frame-colors" />
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
          <Frame9_Social_BoardDesktop id="frame-9-board-desktop" />
          <Frame10_Social_BoardMobile id="frame-10-board-mobile" />
        </div>
      )}
    </main>
  );
}

// Contrôle du flou de fond de la frame 04 (Browser Full) — même type de range
// que les sliders de la 08.
function BrowserBlurControl() {
  const { frame4Blur, setFrame4Blur } = useDAStore();
  return (
    <div className="flex items-center gap-2 border border-border bg-card px-3 py-1.5 rounded-md">
      <span className="text-[10px] font-bold text-foreground/40 whitespace-nowrap">Flou fond</span>
      <input
        type="range"
        min={0}
        max={20}
        step={1}
        value={frame4Blur}
        onChange={(e) => setFrame4Blur(parseFloat(e.target.value))}
        className="w-32 h-1 accent-foreground cursor-pointer"
      />
      <EditableValue
        value={frame4Blur}
        min={0}
        max={20}
        step={1}
        onChange={setFrame4Blur}
        format={pxFormat}
        parse={pxParse}
        inputWidth={42}
      />
    </div>
  );
}

// Nombre de mockups sur les planches showcase (frames 09/10), 2–6.
function BoardCountControl() {
  const { boardMockups, setBoardMockups } = useDAStore();
  return (
    <div className="flex items-center gap-2 border border-border bg-card px-3 py-1.5 rounded-md">
      <span className="text-[10px] font-bold text-foreground/40 whitespace-nowrap">Mockups</span>
      <button
        onClick={() => setBoardMockups(boardMockups - 1)}
        disabled={boardMockups <= 2}
        className="w-5 h-5 rounded flex items-center justify-center text-foreground/70 hover:bg-foreground/10 disabled:opacity-30 cursor-pointer text-base font-bold leading-none"
      >
        −
      </button>
      <span className="text-[11px] font-bold text-foreground w-3 text-center tabular-nums">{boardMockups}</span>
      <button
        onClick={() => setBoardMockups(boardMockups + 1)}
        disabled={boardMockups >= 9}
        className="w-5 h-5 rounded flex items-center justify-center text-foreground/70 hover:bg-foreground/10 disabled:opacity-30 cursor-pointer text-base font-bold leading-none"
      >
        +
      </button>
    </div>
  );
}

function CardImageUploadButton() {
  const {
    cardImage,
    setCardImage,
    cardLogoScale,
    setCardLogoScale,
    cardImageOpacity,
    setCardImageOpacity,
  } = useDAStore();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCardImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    // Wrapper pleine largeur : sliders groupés à gauche, boutons à droite.
    // Le justify-between sépare les deux groupes aux extrémités de la ligne ;
    // flex-wrap laisse passer sur deux lignes si le viewport est étroit.
    <div className="flex items-center justify-between gap-2 w-full flex-wrap">
      {/* Groupe sliders */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Logo scale slider */}
        <div className="flex items-center gap-2 border border-border bg-card px-3 py-1.5 rounded-md">
          <span className="text-[10px] font-bold text-foreground/40 whitespace-nowrap">Logo</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={Math.min(1, cardLogoScale)}
            onChange={(e) => setCardLogoScale(parseFloat(e.target.value))}
            className="w-32 h-1 accent-foreground cursor-pointer"
          />
          <EditableValue
            value={cardLogoScale}
            min={0}
            max={1}
            step={0.01}
            onChange={setCardLogoScale}
            format={percentFormat}
            parse={percentParse}
            inputWidth={42}
          />
        </div>
        {/* Background image opacity slider */}
        <div className="flex items-center gap-2 border border-border bg-card px-3 py-1.5 rounded-md">
          <span className="text-[10px] font-bold text-foreground/40 whitespace-nowrap">Opacité</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={cardImageOpacity}
            onChange={(e) => setCardImageOpacity(parseFloat(e.target.value))}
            className="w-32 h-1 accent-foreground cursor-pointer"
          />
          <EditableValue
            value={cardImageOpacity}
            min={0}
            max={1}
            step={0.05}
            onChange={setCardImageOpacity}
            format={percentFormat}
            parse={percentParse}
            inputWidth={42}
          />
        </div>
      </div>

      {/* Groupe boutons */}
      <div className="flex items-center gap-2">
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
          <span>Image de fond</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}

function DesktopPaddingToggle() {
  const { desktopPadding, setDesktopPadding } = useDAStore();
  const options = [
    { value: false, label: "Sans marge" },
    { value: true, label: "Avec marge" },
  ];
  return (
    <div className="flex flex-col gap-3 pt-4 mt-4 border-t border-border">
      <span className="text-xs font-medium text-foreground/40">
        Marge des visuels desktop
      </span>
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => setDesktopPadding(opt.value)}
            className={`flex-1 h-8 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
              desktopPadding === opt.value
                ? "border-foreground bg-foreground/5 text-foreground"
                : "border-border text-foreground/40 hover:border-foreground/20 hover:text-foreground/70"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <span className="text-[10px] text-foreground/25 font-medium">
        Concerne Interface &amp; Couverture (utile sur fond blanc)
      </span>
    </div>
  );
}

function ProjectUrlLine({ domain, url }: { domain: string; url: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("URL copiée");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copie impossible");
    }
  };
  return (
    <div className="flex items-center gap-1 mt-0.5 group/url">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Ouvrir dans un nouvel onglet"
        className="text-[11px] text-foreground/30 hover:text-foreground/70 hover:underline font-medium truncate min-w-0 transition-colors cursor-pointer"
      >
        {domain}
      </a>
      <button
        onClick={handleCopy}
        title="Copier l'URL"
        className="shrink-0 opacity-0 group-hover/url:opacity-100 transition-all w-4 h-4 flex items-center justify-center text-foreground/40 hover:text-foreground/80 hover:bg-foreground/10 rounded cursor-pointer"
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

function ShowcaseWordingControl() {
  const { showcaseWording, setShowcaseWording } = useDAStore();
  const options = [
    { value: "focus" as const, label: "Focus client" },
    { value: "nouvelle" as const, label: "Nouvelle réal." },
  ];
  return (
    <div className="flex items-center gap-1 bg-foreground/5 border border-border rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setShowcaseWording(opt.value)}
          className={`px-2.5 h-6 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
            showcaseWording === opt.value
              ? "bg-background shadow-sm text-foreground"
              : "text-foreground/50 hover:text-foreground/80"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function DropShadowToggle() {
  const { dropShadow, setDropShadow } = useDAStore();
  const options = [
    { value: true, label: "Avec ombre" },
    { value: false, label: "Sans ombre" },
  ];
  return (
    <div className="flex flex-col gap-3 pt-4 mt-4 border-t border-border">
      <span className="text-xs font-medium text-foreground/40">
        Ombre portée des mockups
      </span>
      <div className="flex gap-1.5">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => setDropShadow(opt.value)}
            className={`flex-1 h-8 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
              dropShadow === opt.value
                ? "border-foreground bg-foreground/5 text-foreground"
                : "border-border text-foreground/40 hover:border-foreground/20 hover:text-foreground/70"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <span className="text-[10px] text-foreground/25 font-medium">
        Concerne tous les mockups navigateur &amp; téléphone
      </span>
    </div>
  );
}

function IdentityLogoScaleControl() {
  const { logoScale, setLogoScale } = useDAStore();
  return (
    <div className="flex items-center gap-2 border border-border bg-card px-3 py-1.5 rounded-md">
      <span className="text-[10px] font-bold text-foreground/40 whitespace-nowrap">Logo</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={Math.min(1, logoScale)}
        onChange={(e) => setLogoScale(parseFloat(e.target.value))}
        className="w-24 h-1 accent-foreground cursor-pointer"
      />
      <EditableValue
        value={logoScale}
        min={0}
        max={1}
        step={0.01}
        onChange={setLogoScale}
        format={percentFormat}
        parse={percentParse}
        inputWidth={42}
      />
    </div>
  );
}

function ColorsOrientationToggle() {
  const { colorsOrientation, setColorsOrientation } = useDAStore();

  const options = [
    { value: "horizontal" as const, Icon: StretchHorizontal, label: "Bandes horizontales" },
    { value: "vertical" as const, Icon: StretchVertical, label: "Bandes verticales" },
  ];

  return (
    <div className="flex items-center gap-0.5 border border-border bg-card p-0.5 rounded-md">
      {options.map(({ value, Icon, label }) => (
        <button
          key={value}
          onClick={() => setColorsOrientation(value)}
          title={label}
          aria-label={label}
          aria-pressed={colorsOrientation === value}
          className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer ${
            colorsOrientation === value
              ? "bg-foreground text-background"
              : "text-foreground/40 hover:text-foreground/70"
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}

function PreviewContainer({
  children,
  title,
  id,
  nativeWidth = 2373,
  nativeHeight = 1473,
  actions,
  actionsBelow = false,
}: {
  children: React.ReactNode;
  title: string;
  id: string;
  nativeWidth?: number;
  nativeHeight?: number;
  actions?: React.ReactNode;
  /**
   * When true, the `actions` slot is moved to a dedicated row below the
   * title (export button stays inline). Useful for frames that need a lot
   * of controls (Frame8 with two sliders + reset + upload) and would
   * otherwise cram the title row.
   */
  actionsBelow?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.2);
  const [isExporting, setIsExporting] = React.useState(false);
  const [showExportFrame, setShowExportFrame] = React.useState(false);
  const { scrapeResult, borderRadius, exportScale } = useDAStore();
  // Ces frames desktop dessinent leur PROPRE bordure (incluse dans le PNG).
  // → on supprime alors la bordure de chrome du conteneur d'aperçu, sinon on
  // voit un double contour et l'aperçu ne correspond plus au fichier exporté.
  const selfBordered = ["frame-1-da", "frame-2-mockup", "frame-3-cover"].includes(id);

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
        await exportFrame(id, `${scrapeResult.domain}_${id}`, nativeWidth, nativeHeight, exportScale);
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
      case "frame-colors": return <FrameColors id="frame-colors" />;
      case "frame-2-mockup": return <Frame2_Mockup id="frame-2-mockup" />;
      case "frame-3-cover": return <Frame3_Cover id="frame-3-cover" />;
      case "frame-4-social-browser": return <Frame4_Social_BrowserFull id="frame-4-social-browser" />;
      case "frame-5-social-hero": return <Frame5_Social_HeroSimple id="frame-5-social-hero" />;
      case "frame-6-social-nouvelle": return <Frame6_Social_NouvelleReal id="frame-6-social-nouvelle" />;
      case "frame-7-social-three": return <Frame7_Social_ThreeImg id="frame-7-social-three" />;
      case "frame-8-social-card": return <Frame8_Social_CardSite id="frame-8-social-card" />;
      case "frame-9-board-desktop": return <Frame9_Social_BoardDesktop id="frame-9-board-desktop" />;
      case "frame-10-board-mobile": return <Frame10_Social_BoardMobile id="frame-10-board-mobile" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-bold text-foreground tracking-widest uppercase opacity-20">
            {title}
          </span>
          <div className="flex items-center gap-2">
            {!actionsBelow && actions}
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
        {actionsBelow && actions && (
          // Donne aux contrôles toute la largeur de la ligne pour respirer ;
          // flex-wrap pour qu'un viewport étroit fasse passer en plusieurs lignes
          // sans casser le layout.
          <div className="flex items-center justify-end gap-2 px-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
      <div
        ref={containerRef}
        className={`overflow-hidden relative shadow-2xl shadow-black/[0.03] dark:shadow-white/[0.01] bg-card ${selfBordered ? "" : "border border-border"}`}
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
