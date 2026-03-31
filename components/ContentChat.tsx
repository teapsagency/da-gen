"use client";

import React, { useRef } from "react";
import {
  Loader2, ArrowUp, Copy, Check,
  ChevronDown, ChevronUp, Paperclip, X,
  Linkedin, Instagram,
  FileText, Braces, Code, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { GeneratedContent } from "@/types";
import { useDAStore } from "@/store/daStore";
import { SocialPreview } from "@/components/ui/SocialPreview";
import { Frame4_Social_BrowserFull } from "@/components/frames/Frame4_Social_BrowserFull";
import { Frame5_Social_HeroSimple } from "@/components/frames/Frame5_Social_HeroSimple";
import { Frame6_Social_NouvelleReal } from "@/components/frames/Frame6_Social_NouvelleReal";
import { Frame7_Social_ThreeImg } from "@/components/frames/Frame7_Social_ThreeImg";

type Props = {
  chips: string[];
  onChipsChange: (chips: string[]) => void;
  files: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  brief: string;
  onBriefChange: (v: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  content: GeneratedContent | null;
  error: string | null;
};

const ACCEPTED_EXTS = [".md", ".txt", ".pdf", ".html", ".json"];
const MAX_FILES = 3;

export function ContentChat({
  chips, onChipsChange,
  files, onAddFiles, onRemoveFile,
  brief, onBriefChange,
  onGenerate, isGenerating,
  content, error,
}: Props) {
  const { scrapeResult, agencyLogo } = useDAStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(["case-study", "social"])
  );
  const [previewPlatform, setPreviewPlatform] = React.useState<"linkedin" | "instagram" | null>(null);
  const [previewAsset, setPreviewAsset] = React.useState("screenshot");

  // Auto-grow textarea
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [brief]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!isGenerating) onGenerate();
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []).filter((f) =>
      ACCEPTED_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    const merged = [...files, ...incoming].slice(0, MAX_FILES);
    onAddFiles(merged);
    e.target.value = "";
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasContent = content !== null;
  const hasFiles = files.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Results area */}
      <div className={`flex-1 overflow-y-auto px-8 lg:px-16 ${hasContent ? "py-10" : "flex items-end pb-4"}`}>
        {hasContent ? (
          <div className="max-w-7xl mx-auto flex gap-6 items-start">
            {/* Left: Cas client */}
            <div className="flex-1 min-w-0">
              <ResultSection
                id="case-study" title="Cas client" badge="Site web"
                expanded={expandedSections.has("case-study")} onToggle={toggleSection}
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1">
                    {content.caseStudy.title && (
                    <h2 className="text-xl font-bold text-foreground leading-tight">
                      {content.caseStudy.title}
                    </h2>
                    )}
                    {content.caseStudy.tagline && (
                    <p className="text-sm text-foreground/50 font-medium italic">
                      {content.caseStudy.tagline}
                    </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {content.caseStudy.intro && <ContentField label="Introduction" value={content.caseStudy.intro} />}
                    {content.caseStudy.challenge && <ContentField label="Défi client" value={content.caseStudy.challenge} />}
                    {content.caseStudy.solution && <ContentField label="Solution apportée" value={content.caseStudy.solution} />}
                    {content.caseStudy.results && <ContentField label="Résultats" value={content.caseStudy.results} />}
                  </div>
                  {(content.caseStudy.services?.length > 0 || content.caseStudy.platform) && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">
                      Services · Plateforme
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(content.caseStudy.services ?? []).map((s) => (
                        <span key={s} className="text-[11px] font-semibold px-2.5 py-1 bg-foreground/[0.06] rounded-full text-foreground/60">{s}</span>
                      ))}
                      {content.caseStudy.platform && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 bg-foreground/[0.06] rounded-full text-foreground/60">
                        {content.caseStudy.platform}
                      </span>
                      )}
                    </div>
                  </div>
                  )}
                  <CopyAllCaseStudy content={content} />
                </div>
              </ResultSection>
            </div>

            {/* Right: Réseaux sociaux */}
            <div className="flex-1 min-w-0">
              <ResultSection
                id="social" title="Post Instagram · LinkedIn" badge="Réseaux sociaux"
                expanded={expandedSections.has("social")} onToggle={toggleSection}
              >
              <div className="flex flex-col gap-4">
                {/* Preview toggle */}
                <div className="flex items-center gap-1 p-0.5 bg-foreground/[0.05] rounded-lg w-fit">
                  <button
                    onClick={() => setPreviewPlatform(null)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                      previewPlatform === null
                        ? "bg-card text-foreground shadow-sm"
                        : "text-foreground/40 hover:text-foreground/60"
                    }`}
                  >
                    Texte
                  </button>
                  <button
                    onClick={() => setPreviewPlatform("linkedin")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      previewPlatform === "linkedin"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-foreground/40 hover:text-foreground/60"
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    LinkedIn
                  </button>
                  <button
                    onClick={() => setPreviewPlatform("instagram")}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      previewPlatform === "instagram"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-foreground/40 hover:text-foreground/60"
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    Instagram
                  </button>
                </div>

                {/* Content or Preview */}
                {content.socialPost && previewPlatform === null ? (
                  <div className="bg-foreground/[0.03] rounded-xl p-4 border border-border">
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-medium">
                      {content.socialPost.caption ?? ""}
                    </p>
                    {(content.socialPost.hashtags?.length ?? 0) > 0 && (
                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
                      {(content.socialPost.hashtags ?? []).map((h) => (
                        <span key={h} className="text-[11px] font-semibold text-foreground/40">
                          #{h.replace(/^#/, "")}
                        </span>
                      ))}
                    </div>
                    )}
                  </div>
                ) : content.socialPost && previewPlatform !== null ? (
                  <div className="flex flex-col gap-3">
                    {/* Asset selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/25">Image du post</span>
                      <select
                        value={previewAsset}
                        onChange={(e) => setPreviewAsset(e.target.value)}
                        className="text-[11px] font-medium text-foreground/60 bg-foreground/[0.04] border border-border rounded-lg px-2 py-1 outline-none cursor-pointer"
                      >
                        <option value="screenshot">Screenshot du site</option>
                        <option value="frame4">04 / Browser Full</option>
                        <option value="frame5">05 / Hero Simple</option>
                        <option value="frame6">06 / Nouvelle Réalisation</option>
                        <option value="frame7">07 / Trois Images</option>
                      </select>
                    </div>
                    <div className="flex justify-center">
                      <SocialPreview
                        platform={previewPlatform}
                        caption={content.socialPost.caption ?? ""}
                        hashtags={content.socialPost.hashtags ?? []}
                        imageUrl={previewAsset === "screenshot" ? scrapeResult?.screenshots?.desktop : undefined}
                        imageContent={previewAsset !== "screenshot" ? (
                          <AssetPreviewImage assetKey={previewAsset} />
                        ) : undefined}
                        agencyLogo={agencyLogo}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Publish buttons */}
                {content.socialPost?.caption && <PublishButtons content={content} />}

                {content.socialPost?.caption && (
                <CopyButton
                  value={
                    (content.socialPost.caption ?? "") + "\n\n" +
                    (content.socialPost.hashtags ?? []).map((h) => `#${h.replace(/^#/, "")}`).join(" ")
                  }
                  label="Copier le post"
                />
                )}
              </div>
            </ResultSection>
            </div>
          </div>
        ) : (
          <div className="w-full" />
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-8 lg:px-16 pb-2">
          <div className="max-w-3xl mx-auto">
            <p className="text-[12px] text-red-500 font-medium bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-2.5">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Prompt area */}
      <div className="px-8 lg:px-16 pb-8 shrink-0">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">

          {/* Input card */}
          <div className="bg-card border border-border rounded-2xl shadow-lg shadow-black/[0.04] overflow-hidden">

            {/* Files — above textarea */}
            {hasFiles && (
              <div className="flex flex-wrap gap-2 px-4 pt-4">
                {files.map((file, i) => {
                  const ext = `.${file.name.split(".").pop()?.toLowerCase() ?? "file"}`;
                  const extColors: Record<string, { bg: string; text: string }> = {
                    ".pdf": { bg: "rgba(255, 82, 82, 0.10)", text: "rgb(153, 27, 27)" },
                    ".md": { bg: "rgba(66, 133, 244, 0.10)", text: "rgb(12, 47, 96)" },
                    ".txt": { bg: "rgba(120, 120, 120, 0.10)", text: "rgb(80, 80, 80)" },
                    ".html": { bg: "rgba(255, 152, 0, 0.10)", text: "rgb(153, 80, 0)" },
                    ".json": { bg: "rgba(76, 175, 80, 0.10)", text: "rgb(27, 94, 32)" },
                  };
                  const colors = extColors[ext] ?? extColors[".txt"];
                  const extIcons: Record<string, React.ReactNode> = {
                    ".pdf": <FileText className="w-4 h-4" />,
                    ".md": <FileText className="w-4 h-4" />,
                    ".txt": <FileText className="w-4 h-4" />,
                    ".html": <Code className="w-4 h-4" />,
                    ".json": <Braces className="w-4 h-4" />,
                  };
                  const icon = extIcons[ext] ?? extIcons[".txt"];
                  const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
                  const formatSize = (bytes: number) => {
                    if (bytes < 1024) return `${bytes} o`;
                    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
                    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
                  };

                  return (
                    <div
                      key={i}
                      className="group flex flex-col gap-1.5 px-3 py-2.5 border border-border rounded-xl min-w-[120px] max-w-[180px]"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span style={{ color: colors.text }}>{icon}</span>
                        <button
                          onClick={() => onRemoveFile(i)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.05] rounded-full p-1 transition-all cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-[11px] font-semibold text-foreground/70 truncate">
                        {nameWithoutExt}
                      </span>
                      <span className="text-[10px] text-foreground/30 font-medium">
                        {formatSize(file.size)}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full w-fit"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {ext}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={brief}
              onChange={(e) => onBriefChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                hasContent
                  ? "Précisez ou modifiez le contenu..."
                  : "Décrivez le projet client, ses objectifs, sa cible..."
              }
              rows={3}
              className="w-full px-4 pt-4 pb-2 text-sm font-medium bg-transparent outline-none resize-none placeholder:text-foreground/20 text-foreground/80 leading-relaxed"
            />

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-3 pb-3">
              <button
                onClick={() => files.length < MAX_FILES && fileInputRef.current?.click()}
                disabled={files.length >= MAX_FILES}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.05] rounded-full p-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Joindre un fichier (.md, .txt, .pdf, .html, .json)"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Joindre</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTS.join(",")}
                multiple
                className="hidden"
                onChange={handleFileInput}
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-foreground/20 font-medium hidden sm:block">⌘↵</span>
                <button
                  onClick={onGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 h-8 px-3 bg-foreground text-background rounded-xl text-[11px] font-bold transition-all disabled:opacity-40 cursor-pointer shadow-[inset_0_2px_1px_0_rgba(255,255,255,0.4)] active:shadow-[inset_0_-1px_1px_0_rgba(255,255,255,0.2)] active:scale-[0.97]"
                >
                  {isGenerating
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <ArrowUp className="w-3.5 h-3.5" />
                  }
                  {isGenerating ? "Génération..." : hasContent ? "Regénérer" : "Générer"}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Publish buttons ─────────────────────────────────────────────────────────

function PublishButtons({ content }: { content: GeneratedContent }) {
  const fullText =
    content.socialPost.caption + "\n\n" +
    content.socialPost.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ");

  const publishTo = (platform: "linkedin" | "instagram") => {
    navigator.clipboard.writeText(fullText).then(() => {
      const urls = {
        linkedin: "https://www.linkedin.com/feed/",
        instagram: "https://www.instagram.com/",
      };
      window.open(urls[platform], "_blank", "noopener,noreferrer");
      toast.success(
        `Texte copié ! Collez-le dans votre publication ${platform === "linkedin" ? "LinkedIn" : "Instagram"}.`,
        { duration: 4000 }
      );
    });
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => publishTo("linkedin")}
        className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl border border-border text-[11px] font-bold text-foreground/50 hover:text-[#0A66C2] hover:border-[#0A66C2]/30 hover:bg-[#0A66C2]/[0.04] transition-all cursor-pointer"
      >
        <Linkedin className="w-3.5 h-3.5" />
        Publier sur LinkedIn
      </button>
      <button
        onClick={() => publishTo("instagram")}
        className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl border border-border text-[11px] font-bold text-foreground/50 hover:text-[#E1306C] hover:border-[#E1306C]/30 hover:bg-[#E1306C]/[0.04] transition-all cursor-pointer"
      >
        <Instagram className="w-3.5 h-3.5" />
        Publier sur Instagram
      </button>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AssetPreviewImage({ assetKey }: { assetKey: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const assets: Record<string, { component: React.ReactNode; width: number; height: number }> = {
    frame4: { component: <Frame4_Social_BrowserFull />, width: 1080, height: 1350 },
    frame5: { component: <Frame5_Social_HeroSimple />, width: 1080, height: 723 },
    frame6: { component: <Frame6_Social_NouvelleReal />, width: 1080, height: 1350 },
    frame7: { component: <Frame7_Social_ThreeImg />, width: 1080, height: 1350 },
  };

  const asset = assets[assetKey];
  if (!asset) return null;

  const scale = containerWidth > 0 ? containerWidth / asset.width : 0;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: scale > 0 ? `${asset.height * scale}px` : "auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {scale > 0 && (
        <div
          style={{
            width: `${asset.width}px`,
            height: `${asset.height}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {asset.component}
        </div>
      )}
    </div>
  );
}

function ResultSection({ id, title, badge, expanded, onToggle, children }: {
  id: string; title: string; badge: string;
  expanded: boolean; onToggle: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-foreground/[0.02] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-foreground/[0.06] text-foreground/40 rounded-full">
            {badge}
          </span>
          <span className="text-sm font-bold text-foreground">{title}</span>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-foreground/30" />
          : <ChevronDown className="w-4 h-4 text-foreground/30" />
        }
      </button>
      {expanded && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function ContentField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/25">{label}</span>
        <CopyButton value={value} label="Copier" />
      </div>
      <p className="text-sm text-foreground/70 leading-relaxed font-medium">{value}</p>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] font-semibold text-foreground/30 hover:text-foreground/60 transition-colors cursor-pointer"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copié !" : label}
    </button>
  );
}

function CopyAllCaseStudy({ content }: { content: GeneratedContent }) {
  const [copied, setCopied] = React.useState(false);
  const text = [
    content.caseStudy.title ?? "", content.caseStudy.tagline ?? "", "",
    content.caseStudy.intro ?? "", "", content.caseStudy.challenge ?? "", "",
    content.caseStudy.solution ?? "", "", content.caseStudy.results ?? "", "",
    `Services : ${(content.caseStudy.services ?? []).join(", ")}${content.caseStudy.platform ? ` · ${content.caseStudy.platform}` : ""}`,
  ].join("\n");
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="w-full h-9 flex items-center justify-center gap-2 text-[11px] font-semibold text-foreground/40 hover:text-foreground/70 border border-border rounded-xl hover:border-foreground/20 transition-all cursor-pointer"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copié !" : "Copier le cas client"}
    </button>
  );
}
