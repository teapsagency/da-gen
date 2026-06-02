"use client";

import React from "react";
import { Sparkles, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { useDAStore } from "@/store/daStore";
import { AssetPickerModal } from "./AssetPickerModal";

export function PreviewSidebar() {
  const caption = useDAStore((s) => s.previewCaption);
  const setCaption = useDAStore((s) => s.setPreviewCaption);
  const generatedContent = useDAStore((s) => s.generatedContent);
  const imageCount = useDAStore((s) => s.previewImages.length);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const importGenerated = () => {
    if (!generatedContent) return;
    const { caption: c, hashtags } = generatedContent.socialPost;
    const tags = (hashtags ?? []).map((h) => `#${h.replace(/^#/, "")}`).join(" ");
    setCaption([c ?? "", tags].filter(Boolean).join("\n\n"));
    toast.success("Post importé");
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
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Légende</span>
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

      <AssetPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  );
}
