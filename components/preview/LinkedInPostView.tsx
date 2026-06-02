"use client";

import { MessageCircle, Send, MoreHorizontal, ThumbsUp, Repeat2, Globe } from "lucide-react";
import type { PreviewImageRef, PreviewFormat } from "@/types";
import { parseCaption } from "./parseCaption";
import { PreviewCarousel } from "./PreviewCarousel";

type Props = {
  caption: string;
  images: PreviewImageRef[];
  avatar?: string;
  displayName: string;
  followers: string;
  format: PreviewFormat;
  layout: "mobile" | "desktop";
};

export function LinkedInPostView({ caption, images, avatar, displayName, followers, format, layout }: Props) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        background: "#ffffff",
        border: "1px solid #e0dfdc",
        maxWidth: layout === "desktop" ? 555 : 420,
        width: "100%",
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-2 px-4 pt-3 pb-2">
        <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "#000000" }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-7 h-7 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          ) : (
            <span className="text-[11px] font-black tracking-tight" style={{ color: "#fff" }}>TEAPS</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-tight" style={{ color: "#000000e6" }}>{displayName}</p>
          <p className="text-[12px] leading-tight mt-0.5" style={{ color: "#00000099" }}>{followers}</p>
          <p className="text-[12px] leading-tight mt-0.5 flex items-center gap-1" style={{ color: "#00000099" }}>
            Maintenant · <Globe className="w-3 h-3" />
          </p>
        </div>
        <MoreHorizontal className="w-6 h-6 mt-1" style={{ color: "#00000099" }} />
      </div>

      {/* Texte */}
      <div className="px-4 pb-3">
        <p className="text-[14px] leading-[1.43] whitespace-pre-wrap break-words" style={{ color: "#000000e6" }}>
          {parseCaption(caption, "linkedin")}
        </p>
      </div>

      {/* Média */}
      <PreviewCarousel images={images} format={format} />

      {/* Réactions */}
      <div className="flex items-center gap-1.5 px-4 py-2" style={{ borderBottom: "1px solid #e0dfdc" }}>
        <span className="w-[18px] h-[18px] rounded-full flex items-center justify-center" style={{ background: "#378fe9", color: "#fff", border: "1.5px solid #fff" }}>
          <ThumbsUp className="w-2.5 h-2.5" />
        </span>
        <span className="text-[12px]" style={{ color: "#00000099" }}>21</span>
        <span className="flex-1" />
        <span className="text-[12px]" style={{ color: "#00000099" }}>2 commentaires</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-around px-2 py-0.5">
        {[
          { icon: <ThumbsUp className="w-5 h-5" />, label: "J'aime" },
          { icon: <MessageCircle className="w-5 h-5" />, label: "Commenter" },
          { icon: <Repeat2 className="w-5 h-5" />, label: "Republier" },
          { icon: <Send className="w-5 h-5" />, label: "Envoyer" },
        ].map((a) => (
          <button key={a.label} className="flex items-center gap-1.5 px-3 py-2.5 rounded-md" style={{ color: "#00000099" }}>
            {a.icon}
            <span className="text-[12px] font-semibold">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
