"use client";

import React from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import type { PreviewImageRef } from "@/types";
import { parseCaption } from "./parseCaption";
import { PreviewCarousel } from "./PreviewCarousel";

type Props = {
  caption: string;
  hashtags: string[];
  images: PreviewImageRef[];
  avatar?: string;
  handle: string;
};

export function InstagramPostView({ caption, hashtags, images, avatar, handle }: Props) {
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
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center overflow-hidden"
          style={{ background: "#000000" }}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="w-5 h-5 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
          ) : (
            <span className="text-[8px] font-black tracking-tight" style={{ color: "#fff" }}>
              TEAPS
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold" style={{ color: "#262626" }}>
            {handle}
          </p>
        </div>
        <MoreHorizontal className="w-6 h-6 shrink-0" style={{ color: "#262626" }} />
      </div>

      {/* Image(s) */}
      <PreviewCarousel images={images} />

      {/* Actions */}
      <div className="flex items-center px-3 pt-2 pb-1">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-1.5">
            <Heart className="w-6 h-6" style={{ color: "#262626" }} />
            <span className="text-[14px] font-semibold" style={{ color: "#262626" }}>29</span>
          </div>
          <MessageCircle className="w-6 h-6" style={{ color: "#262626" }} />
          <Send className="w-6 h-6" style={{ color: "#262626" }} />
        </div>
        <span className="flex-1" />
        <Bookmark className="w-6 h-6" style={{ color: "#262626" }} />
      </div>

      {/* Caption */}
      <div className="px-3 pt-2 pb-2">
        <p className="text-[14px] leading-[1.5] whitespace-pre-wrap break-words" style={{ color: "#262626" }}>
          <span className="font-semibold">{handle} </span>
          {parseCaption(caption, "instagram")}
        </p>
        {hashtags.length > 0 && (
          <p className="text-[14px] mt-1.5 leading-[1.5]">
            {hashtags.map((h, i) => (
              <React.Fragment key={`${h}-${i}`}>
                {i > 0 && " "}
                <span style={{ color: "#00376b" }}>#{h.replace(/^#/, "")}</span>
              </React.Fragment>
            ))}
          </p>
        )}
      </div>

      {/* Date */}
      <div className="px-3 pb-3">
        <p className="text-[11px] uppercase tracking-wide" style={{ color: "#8e8e8e" }}>
          Il y a 2 heures
        </p>
      </div>
    </div>
  );
}
