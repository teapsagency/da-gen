"use client";

import React from "react";
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  ThumbsUp, Repeat2, Globe,
} from "lucide-react";

type Props = {
  caption: string;
  hashtags: string[];
  imageUrl?: string;
  imageContent?: React.ReactNode;
  agencyLogo?: string;
  platform: "linkedin" | "instagram";
};

/* ─── Shared: parse caption to style URLs blue(+bold on LI) and hashtags ──── */

function parseCaption(
  text: string,
  platform: "linkedin" | "instagram"
): React.ReactNode[] {
  // Split on URLs and hashtags
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hashtagRegex = /(#[a-zA-Zà-ÿ0-9_]+)/g;
  const combined = new RegExp(`(${urlRegex.source}|${hashtagRegex.source})`, "g");

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const value = match[0];
    if (value.startsWith("http")) {
      // URL
      parts.push(
        <a
          key={match.index}
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: platform === "linkedin" ? "#0a66c2" : "#00376b",
            fontWeight: platform === "linkedin" ? 600 : 400,
            textDecoration: "none",
          }}
        >
          {value}
        </a>
      );
    } else {
      // Hashtag
      parts.push(
        <span
          key={match.index}
          style={{
            color: platform === "linkedin" ? "#0a66c2" : "#00376b",
            fontWeight: platform === "linkedin" ? 600 : 400,
          }}
        >
          {value}
        </span>
      );
    }
    lastIndex = match.index + value.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/* ─── LinkedIn Preview ──────────────────────────────────────────────────────── */

function LinkedInPreview({ caption, hashtags, imageUrl, imageContent, agencyLogo }: Omit<Props, "platform">) {
  const hashtagsStr = hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ");
  const fullText = caption + "\n\n" + hashtagsStr;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        fontFamily: '-apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        background: "#ffffff",
        border: "1px solid #e0dfdc",
        maxWidth: 555,
        width: "100%",
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-2 px-4 pt-3 pb-2">
        <div
          className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center overflow-hidden"
          style={{ background: "#000000" }}
        >
          {agencyLogo ? (
            <img
              src={agencyLogo}
              alt="TEAPS"
              className="w-7 h-7 object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          ) : (
            <span className="text-[11px] font-black tracking-tight" style={{ color: "#fff" }}>
              TEAPS
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold leading-tight" style={{ color: "#000000e6" }}>
            Agence TEAPS
          </p>
          <p className="text-[12px] leading-tight mt-0.5" style={{ color: "#00000099" }}>
            528 abonnés
          </p>
          <p className="text-[12px] leading-tight mt-0.5 flex items-center gap-1" style={{ color: "#00000099" }}>
            Maintenant · <Globe className="w-3 h-3" />
          </p>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <MoreHorizontal className="w-6 h-6" style={{ color: "#00000099" }} />
        </div>
      </div>

      {/* Text content */}
      <div className="px-4 pb-3">
        <p
          className="text-[14px] leading-[1.43] whitespace-pre-wrap break-words"
          style={{ color: "#000000e6" }}
        >
          {parseCaption(fullText, "linkedin")}
        </p>
      </div>

      {/* Image */}
      {(imageContent || imageUrl) && (
        <div style={{ background: "#f3f2ef", overflow: "hidden" }}>
          {imageContent ? imageContent : (
            <img src={imageUrl} alt="Post" className="w-full object-cover" style={{ maxHeight: 400 }} />
          )}
        </div>
      )}

      {/* Reactions bar */}
      <div className="flex items-center gap-1.5 px-4 py-2" style={{ borderBottom: "1px solid #e0dfdc" }}>
        <div className="flex -space-x-0.5">
          <span
            className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
            style={{ background: "#378fe9", color: "#fff", border: "1.5px solid #fff", zIndex: 2 }}
          >
            <ThumbsUp className="w-2.5 h-2.5" />
          </span>
          <span
            className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px]"
            style={{ background: "#4fae4e", color: "#fff", border: "1.5px solid #fff", zIndex: 1 }}
          >
            👏
          </span>
        </div>
        <span className="text-[12px]" style={{ color: "#00000099" }}>21</span>
        <span className="flex-1" />
        <span className="text-[12px]" style={{ color: "#00000099" }}>2 commentaires</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-around px-2 py-0.5">
        {[
          { icon: <ThumbsUp className="w-5 h-5" />, label: "J'aime" },
          { icon: <MessageCircle className="w-5 h-5" />, label: "Commenter" },
          { icon: <Repeat2 className="w-5 h-5" />, label: "Republier" },
          { icon: <Send className="w-5 h-5" />, label: "Envoyer" },
        ].map((action) => (
          <button
            key={action.label}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-md"
            style={{ color: "#00000099" }}
          >
            {action.icon}
            <span className="text-[12px] font-semibold">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Instagram Preview ─────────────────────────────────────────────────────── */

function InstagramPreview({ caption, hashtags, imageUrl, imageContent, agencyLogo }: Omit<Props, "platform">) {
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
          {agencyLogo ? (
            <img
              src={agencyLogo}
              alt="TEAPS"
              className="w-5 h-5 object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          ) : (
            <span className="text-[8px] font-black tracking-tight" style={{ color: "#fff" }}>
              TEAPS
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold" style={{ color: "#262626" }}>
            agence.teaps
          </p>
        </div>
        <MoreHorizontal className="w-6 h-6 shrink-0" style={{ color: "#262626" }} />
      </div>

      {/* Image */}
      <div
        style={{ background: "#efefef", aspectRatio: "1/1", overflow: "hidden" }}
        className="relative"
      >
        {imageContent ? (
          imageContent
        ) : imageUrl ? (
          <img src={imageUrl} alt="Post" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[13px] font-medium" style={{ color: "#8e8e8e" }}>
              Aperçu de l'image
            </span>
          </div>
        )}
      </div>

      {/* Carousel dots */}
      <div className="flex items-center justify-center gap-1 py-2">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#0095f6" }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#c7c7c7" }} />
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#c7c7c7" }} />
      </div>

      {/* Action buttons */}
      <div className="flex items-center px-3 pb-1">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-1.5">
            <Heart className="w-6 h-6" style={{ color: "#262626" }} />
            <span className="text-[14px] font-semibold" style={{ color: "#262626" }}>29</span>
          </div>
          <MessageCircle className="w-6 h-6" style={{ color: "#262626" }} />
          <div className="flex items-center gap-1.5">
            <Send className="w-6 h-6" style={{ color: "#262626" }} />
            <span className="text-[14px] font-semibold" style={{ color: "#262626" }}>1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bookmark className="w-6 h-6" style={{ color: "#262626" }} />
            <span className="text-[14px] font-semibold" style={{ color: "#262626" }}>1</span>
          </div>
        </div>
        <span className="flex-1" />
        <Bookmark className="w-6 h-6 hidden" style={{ color: "#262626" }} />
      </div>

      {/* Caption */}
      <div className="px-3 pt-2 pb-2">
        <p className="text-[14px] leading-[1.5] whitespace-pre-wrap break-words" style={{ color: "#262626" }}>
          <span className="font-semibold">agence.teaps </span>
          {parseCaption(caption, "instagram")}
        </p>
        {hashtags.length > 0 && (
          <p className="text-[14px] mt-1.5 leading-[1.5]">
            {hashtags.map((h, i) => (
              <React.Fragment key={h}>
                {i > 0 && " "}
                <span style={{ color: "#00376b" }}>
                  #{h.replace(/^#/, "")}
                </span>
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

/* ─── Export ─────────────────────────────────────────────────────────────────── */

export function SocialPreview({ platform, ...rest }: Props) {
  if (platform === "linkedin") return <LinkedInPreview {...rest} />;
  return <InstagramPreview {...rest} />;
}
