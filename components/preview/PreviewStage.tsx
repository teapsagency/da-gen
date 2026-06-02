"use client";

import React from "react";
import { Instagram, Linkedin, Smartphone, Monitor } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import type { SocialPlatform, PreviewFormat } from "@/types";
import { InstagramPostView } from "./InstagramPostView";
import { LinkedInPostView } from "./LinkedInPostView";
import { PreviewCarouselBar } from "./PreviewCarouselBar";

type Viewport = "mobile" | "desktop";

const FORMATS: { value: PreviewFormat; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "16:9", label: "16:9" },
];

function Segmented<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
}) {
  return (
    <div className="flex bg-foreground/[0.04] rounded-lg p-0.5 gap-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
            value === o.value ? "bg-card text-foreground shadow-sm" : "text-foreground/40 hover:text-foreground/60"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PreviewStage() {
  const [platform, setPlatform] = React.useState<SocialPlatform>("instagram");
  const [viewport, setViewport] = React.useState<Viewport>("desktop");
  const caption = useDAStore((s) => s.previewCaption);
  const images = useDAStore((s) => s.previewImages);
  const identity = useDAStore((s) => s.socialIdentity);
  const avatar = useDAStore((s) => s.agencyLogo);
  const format = useDAStore((s) => s.previewFormat);
  const setFormat = useDAStore((s) => s.setPreviewFormat);

  const card =
    platform === "instagram" ? (
      <InstagramPostView caption={caption} images={images} avatar={avatar} handle={identity.instagramHandle} format={format} layout={viewport} />
    ) : (
      <LinkedInPostView caption={caption} images={images} avatar={avatar} displayName={identity.displayName} followers={identity.followers} format={format} layout={viewport} />
    );

  // Largeur d'affichage selon le viewport (sans scaling : rendu à taille réelle).
  const stageWidth = viewport === "mobile" ? 430 : platform === "instagram" ? 1040 : 555;

  return (
    <div className="p-8 lg:p-12 min-h-screen pb-28">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
        <Segmented<SocialPlatform>
          value={platform}
          onChange={setPlatform}
          options={[
            { value: "instagram", label: (<><Instagram className="w-3.5 h-3.5" /> Instagram</>) },
            { value: "linkedin", label: (<><Linkedin className="w-3.5 h-3.5" /> LinkedIn</>) },
          ]}
        />
        <Segmented<Viewport>
          value={viewport}
          onChange={setViewport}
          options={[
            { value: "mobile", label: (<><Smartphone className="w-3.5 h-3.5" /> Mobile</>) },
            { value: "desktop", label: (<><Monitor className="w-3.5 h-3.5" /> Desktop</>) },
          ]}
        />
        <Segmented<PreviewFormat>
          value={format}
          onChange={setFormat}
          options={FORMATS.map((f) => ({ value: f.value, label: f.label }))}
        />
      </div>

      {/* Scène */}
      <div className="w-full flex justify-center">
        <div style={{ width: "100%", maxWidth: stageWidth }} className="transition-[max-width] duration-300">
          {card}
        </div>
      </div>

      {/* Barre du bas : ordre du carrousel */}
      <PreviewCarouselBar />
    </div>
  );
}
