import React from "react";
import type { SocialPlatform } from "@/types";

/** Style les URLs (bleu, gras sur LinkedIn) et les hashtags d'une caption. */
export function parseCaption(text: string, platform: SocialPlatform): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hashtagRegex = /(#[a-zA-Zà-ÿ0-9_]+)/g;
  const combined = new RegExp(`(${urlRegex.source}|${hashtagRegex.source})`, "g");

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const value = match[0];
    const color = platform === "linkedin" ? "#0a66c2" : "#00376b";
    const fontWeight = platform === "linkedin" ? 600 : 400;
    if (value.startsWith("http")) {
      parts.push(
        <a
          key={match.index}
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color, fontWeight, textDecoration: "none" }}
        >
          {value}
        </a>
      );
    } else {
      parts.push(
        <span key={match.index} style={{ color, fontWeight }}>
          {value}
        </span>
      );
    }
    lastIndex = match.index + value.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
