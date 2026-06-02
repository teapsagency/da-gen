"use client";

import React from "react";
import { Sparkles, Plus, X, ImageUp } from "lucide-react";
import { toast } from "sonner";
import { useDAStore } from "@/store/daStore";
import type { PreviewImageRef } from "@/types";
import { listScreenshotSources, FRAME_SOURCES } from "./imageSources";
import { PreviewImage } from "./PreviewImage";

export function PreviewSidebar() {
  const caption = useDAStore((s) => s.previewCaption);
  const setCaption = useDAStore((s) => s.setPreviewCaption);
  const hashtags = useDAStore((s) => s.previewHashtags);
  const setHashtags = useDAStore((s) => s.setPreviewHashtags);
  const images = useDAStore((s) => s.previewImages);
  const setImages = useDAStore((s) => s.setPreviewImages);
  const generatedContent = useDAStore((s) => s.generatedContent);
  const scrapeResult = useDAStore((s) => s.scrapeResult);

  const fileRef = React.useRef<HTMLInputElement>(null);
  const [hashtagInput, setHashtagInput] = React.useState("");
  const dragIndex = React.useRef<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);

  const importGenerated = () => {
    if (!generatedContent) return;
    setCaption(generatedContent.socialPost.caption ?? "");
    setHashtags((generatedContent.socialPost.hashtags ?? []).map((h) => h.replace(/^#/, "")));
    toast.success("Post importé");
  };

  // getState() : protège des closures périmées sur ajouts/clics rapprochés.
  const addImage = (ref: PreviewImageRef) => setImages([...useDAStore.getState().previewImages, ref]);
  const removeImage = (i: number) => setImages(useDAStore.getState().previewImages.filter((_, k) => k !== i));
  const reorder = (target: number) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    setOverIndex(null);
    if (from === null || from === target) return;
    const next = [...useDAStore.getState().previewImages];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    setImages(next);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onloadend = () => addImage({ kind: "upload", dataUrl: reader.result as string });
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const addHashtag = () => {
    const v = hashtagInput.trim().replace(/^#/, "");
    if (v) setHashtags([...useDAStore.getState().previewHashtags, v]);
    setHashtagInput("");
  };

  const screenshotSources = listScreenshotSources(scrapeResult);

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

      {/* Caption */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Caption</span>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={6}
          placeholder="Texte du post…"
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-[12px] leading-relaxed resize-y focus:outline-none focus:border-foreground/30 transition-colors"
        />
      </label>

      {/* Hashtags */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Hashtags</span>
        <div className="flex flex-wrap gap-1.5">
          {hashtags.map((h, i) => (
            <span key={`${h}-${i}`} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-foreground/[0.06] rounded-full text-foreground/60">
              #{h}
              <button onClick={() => setHashtags(useDAStore.getState().previewHashtags.filter((_, k) => k !== i))} className="cursor-pointer hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addHashtag();
              }
            }}
            placeholder="ajouter…"
            className="flex-1 h-8 px-2.5 bg-card border border-border rounded-md text-[11px] focus:outline-none focus:border-foreground/30"
          />
          <button onClick={addHashtag} className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-foreground/50 hover:text-foreground cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Carrousel : vignettes + glisser-déposer */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Carrousel ({images.length})</span>
        {images.length === 0 ? (
          <p className="text-[11px] text-foreground/30">Aucune image. Ajoute-en depuis les sources ci-dessous.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {images.map((img, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => (dragIndex.current = i)}
                onDragOver={(e) => { e.preventDefault(); if (overIndex !== i) setOverIndex(i); }}
                onDrop={() => reorder(i)}
                onDragEnd={() => { dragIndex.current = null; setOverIndex(null); }}
                title="Glisser pour réordonner"
                className={`relative w-[60px] h-[60px] rounded-md overflow-hidden border bg-foreground/[0.03] cursor-grab active:cursor-grabbing group ${
                  overIndex === i ? "border-foreground/60 ring-2 ring-foreground/20" : "border-border"
                }`}
              >
                <PreviewImage refItem={img} fit="cover" />
                <span className="absolute bottom-0.5 left-0.5 px-1 rounded text-[8px] font-bold text-white bg-black/50">{i + 1}</span>
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/55 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Retirer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sources */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full h-9 flex items-center justify-center gap-2 text-[11px] font-semibold border border-border rounded-lg text-foreground/60 hover:text-foreground hover:border-foreground/20 cursor-pointer transition-all"
        >
          <ImageUp className="w-3.5 h-3.5" /> Upload / coller
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFile} />

        {screenshotSources.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 mt-1">Screenshots</span>
            {screenshotSources.map((s) => (
              <button
                key={s.ref.kind === "screenshot" ? s.ref.key : s.label}
                onClick={() => addImage(s.ref)}
                className="text-left text-[11px] px-2 py-1.5 rounded-md text-foreground/60 hover:bg-foreground/[0.05] cursor-pointer"
              >
                + {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 mt-1">Frames sociales</span>
          {FRAME_SOURCES.map((s) => (
            <button
              key={s.ref.kind === "frame" ? s.ref.frame : s.label}
              onClick={() => addImage(s.ref)}
              className="text-left text-[11px] px-2 py-1.5 rounded-md text-foreground/60 hover:bg-foreground/[0.05] cursor-pointer"
            >
              + {s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-foreground/30 leading-relaxed">
        Identité du compte (nom, @, abonnés, avatar) → Paramètres.
      </p>
    </div>
  );
}
