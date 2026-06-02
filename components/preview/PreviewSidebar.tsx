"use client";

import React from "react";
import { Sparkles, ImagePlus, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { useDAStore } from "@/store/daStore";
import { captureFrame } from "@/lib/exportFrames";
import { AssetPickerModal } from "./AssetPickerModal";
import { resolveScreenshotKey } from "./imageSources";
import { CAROUSEL_FRAME_EXPORT } from "./carouselExport";
import type { SocialFrameId } from "@/types";

/** dataURL → Blob (pour zipper les screenshots/uploads sans refetch). */
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/:(.*?);/)?.[1] || "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Attend que les frames (montées offscreen) existent dans le DOM. */
function waitForFrames(ids: string[], timeout = 4000): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (ids.length === 0 || ids.every((id) => document.getElementById(id))) requestAnimationFrame(() => resolve());
      else if (Date.now() - start > timeout) resolve();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

export function PreviewSidebar() {
  const caption = useDAStore((s) => s.previewCaption);
  const setCaption = useDAStore((s) => s.setPreviewCaption);
  const generatedContent = useDAStore((s) => s.generatedContent);
  const imageCount = useDAStore((s) => s.previewImages.length);
  const exportScale = useDAStore((s) => s.exportScale);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  // Frames à monter offscreen le temps de la capture (uniquement celles du carrousel).
  const [mountFrames, setMountFrames] = React.useState<SocialFrameId[]>([]);

  const importGenerated = () => {
    if (!generatedContent) return;
    const { caption: c, hashtags } = generatedContent.socialPost;
    const tags = (hashtags ?? []).map((h) => `#${h.replace(/^#/, "")}`).join(" ");
    setCaption([c ?? "", tags].filter(Boolean).join("\n\n"));
    toast.success("Post importé");
  };

  // Télécharge UNIQUEMENT les visuels présents dans le carrousel (dans l'ordre).
  const handleDownloadPack = async () => {
    const images = useDAStore.getState().previewImages;
    const sr = useDAStore.getState().scrapeResult;
    if (!images.length) {
      toast.error("Aucun visuel dans le carrousel.");
      return;
    }
    setExporting(true);
    const frames = Array.from(new Set(images.filter((i) => i.kind === "frame").map((i) => (i as { frame: SocialFrameId }).frame)));
    setMountFrames(frames);
    try {
      await waitForFrames(frames.map((f) => CAROUSEL_FRAME_EXPORT[f].id));
      const zip = new JSZip();
      let n = 0;
      for (const img of images) {
        n += 1;
        const pad = String(n).padStart(2, "0");
        let blob: Blob | null = null;
        let name = "visuel";
        if (img.kind === "frame") {
          const def = CAROUSEL_FRAME_EXPORT[img.frame];
          if (def) {
            blob = await captureFrame(def.id, def.w, def.h, exportScale);
            name = def.name;
          }
        } else if (img.kind === "screenshot") {
          const dataUrl = resolveScreenshotKey(img.key, sr);
          if (dataUrl) {
            blob = dataUrlToBlob(dataUrl);
            name = img.key.replace(/[:]/g, "_");
          }
        } else if (img.kind === "upload") {
          blob = dataUrlToBlob(img.dataUrl);
          name = "upload";
        }
        if (blob) {
          const ext = blob.type.includes("jpeg") || blob.type.includes("jpg") ? "jpg" : "png";
          zip.file(`${pad}_${name}.${ext}`, blob);
        }
      }
      // Contenu du post (légende + hashtags) en .md, dans le même pack.
      const cap = useDAStore.getState().previewCaption?.trim();
      if (cap) zip.file("contenu.md", cap);
      const out = await zip.generateAsync({ type: "blob" });
      const domain = (sr?.domain || "carrousel").replace(/^www\./, "");
      saveAs(out, `${domain}_carrousel.zip`);
      toast.success("Pack du carrousel téléchargé");
    } catch (e) {
      console.error("[downloadPack] failed:", e);
      toast.error("Erreur lors de l'export du pack.");
    } finally {
      setExporting(false);
      setMountFrames([]);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-5">
      {/* Importer */}
      <button
        onClick={importGenerated}
        disabled={!generatedContent}
        className="w-full h-9 flex items-center justify-center gap-2 text-[11px] font-semibold border border-border rounded-lg text-foreground/60 hover:text-foreground hover:border-foreground/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
      >
        <Sparkles className="w-3.5 h-3.5" /> Importer le post généré
      </button>

      {/* Légende */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Contenu</span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={8}
          placeholder="Texte du post (hashtags inclus)…"
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-[12px] leading-relaxed resize-y focus:outline-none focus:border-foreground/30 transition-colors"
        />
      </label>

      {/* Ajouter des visuels (ouvre le modal de sélection) */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Visuels du carrousel</span>
        <button
          onClick={() => setPickerOpen(true)}
          className="w-full h-11 flex items-center justify-center gap-2 text-[12px] font-semibold border border-dashed border-foreground/25 rounded-xl text-foreground/70 hover:text-foreground hover:border-foreground/50 hover:bg-foreground/[0.03] cursor-pointer transition-all"
        >
          <ImagePlus className="w-4 h-4" /> Ajouter des visuels
        </button>
        <p className="text-[10px] text-foreground/30 leading-relaxed">
          {imageCount > 0
            ? `${imageCount} visuel${imageCount > 1 ? "s" : ""} dans le carrousel. L'ordre se règle dans la barre du bas.`
            : "Coche les visuels à inclure (captures du site, visuels sociaux). L'ordre se règle ensuite dans la barre du bas."}
        </p>
      </div>

      {/* Télécharger le pack du carrousel */}
      <button
        onClick={handleDownloadPack}
        disabled={imageCount === 0 || exporting}
        className="w-full h-11 flex items-center justify-center gap-2 text-[12px] font-semibold rounded-xl bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all hover:opacity-90 active:scale-[0.97] shadow-[inset_0_2px_1px_0_rgba(255,255,255,0.4)]"
      >
        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {exporting ? "Export…" : "Télécharger le pack"}
      </button>

      <AssetPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />

      {/* Frames montées offscreen le temps de la capture (un visuel = un PNG) */}
      {mountFrames.length > 0 && (
        <div className="frames-offscreen">
          {mountFrames.map((f) => (
            <React.Fragment key={f}>{CAROUSEL_FRAME_EXPORT[f].node}</React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
