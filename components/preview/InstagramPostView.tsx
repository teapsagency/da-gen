"use client";

import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Smile } from "lucide-react";
import type { PreviewImageRef, PreviewFormat } from "@/types";
import { parseCaption } from "./parseCaption";
import { PreviewCarousel } from "./PreviewCarousel";

type Props = {
  caption: string;
  images: PreviewImageRef[];
  avatar?: string;
  name: string;
  format: PreviewFormat;
  layout: "mobile" | "desktop";
};

function Avatar({ avatar, size }: { avatar?: string; size: number }) {
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center overflow-hidden" style={{ width: size, height: size, background: "#000" }}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" style={{ width: size * 0.56, height: size * 0.56, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
      ) : (
        <span className="font-black tracking-tight" style={{ color: "#fff", fontSize: size * 0.28 }}>TEAPS</span>
      )}
    </div>
  );
}

function CaptionText({ name, caption }: { name: string; caption: string }) {
  return (
    <p className="text-[14px] leading-[1.5] whitespace-pre-wrap break-words" style={{ color: "#262626" }}>
      <span className="font-semibold">{name} </span>
      {parseCaption(caption, "instagram")}
    </p>
  );
}

function ActionsRow() {
  return (
    <div className="flex items-center px-1 pt-1 pb-1">
      <div className="flex items-center gap-3.5">
        <Heart className="w-6 h-6" style={{ color: "#262626" }} />
        <MessageCircle className="w-6 h-6" style={{ color: "#262626" }} />
        <Send className="w-6 h-6" style={{ color: "#262626" }} />
      </div>
      <span className="flex-1" />
      <Bookmark className="w-6 h-6" style={{ color: "#262626" }} />
    </div>
  );
}

export function InstagramPostView({ caption, images, avatar, name, format, layout }: Props) {
  if (layout === "desktop") {
    return (
      <div
        className="flex overflow-hidden"
        style={{
          fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          background: "#fff",
          border: "1px solid #dbdbdb",
          borderRadius: 8,
          width: "100%",
          maxWidth: 1040,
        }}
      >
        {/* Média à gauche */}
        <div className="shrink-0 flex items-center" style={{ flexBasis: "58%", background: "#000", minWidth: 0 }}>
          <div style={{ width: "100%" }}>
            <PreviewCarousel images={images} format={format} />
          </div>
        </div>

        {/* Détails à droite */}
        <div className="flex flex-col min-w-0" style={{ flex: "1 1 0" }}>
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: "1px solid #efefef" }}>
            <Avatar avatar={avatar} size={32} />
            <span className="text-[14px] font-semibold flex-1 min-w-0 truncate" style={{ color: "#262626" }}>{name}</span>
            <MoreHorizontal className="w-5 h-5 shrink-0" style={{ color: "#262626" }} />
          </div>

          {/* Corps scrollable : caption */}
          <div className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: 0 }}>
            <div className="flex gap-2.5">
              <Avatar avatar={avatar} size={32} />
              <div className="flex flex-col gap-1">
                <CaptionText name={name} caption={caption} />
                <span className="text-[11px] uppercase tracking-wide" style={{ color: "#8e8e8e" }}>72 sem</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 pt-2 pb-3" style={{ borderTop: "1px solid #efefef" }}>
            <ActionsRow />
            <p className="text-[14px] font-semibold mt-1" style={{ color: "#262626" }}>312 J&apos;aime</p>
            <p className="text-[11px] uppercase tracking-wide mt-1" style={{ color: "#8e8e8e" }}>8 janvier 2025</p>
            <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid #efefef" }}>
              <Smile className="w-5 h-5" style={{ color: "#8e8e8e" }} />
              <span className="text-[14px] flex-1" style={{ color: "#8e8e8e" }}>Ajouter un commentaire…</span>
              <span className="text-[14px] font-semibold" style={{ color: "#b3dbfc" }}>Publier</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile : carte empilée
  return (
    <div
      className="overflow-hidden"
      style={{
        fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        background: "#ffffff",
        border: "1px solid #dbdbdb",
        borderRadius: 8,
        maxWidth: 470,
        width: "100%",
      }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Avatar avatar={avatar} size={36} />
        <span className="text-[14px] font-semibold flex-1 min-w-0 truncate" style={{ color: "#262626" }}>{name}</span>
        <MoreHorizontal className="w-6 h-6 shrink-0" style={{ color: "#262626" }} />
      </div>

      <PreviewCarousel images={images} format={format} />

      <div className="px-3">
        <ActionsRow />
      </div>

      <div className="px-3 pt-1 pb-2">
        <p className="text-[14px] font-semibold" style={{ color: "#262626" }}>312 J&apos;aime</p>
        <div className="mt-1">
          <CaptionText name={name} caption={caption} />
        </div>
        <p className="text-[11px] uppercase tracking-wide mt-2" style={{ color: "#8e8e8e" }}>Il y a 2 heures</p>
      </div>
    </div>
  );
}
