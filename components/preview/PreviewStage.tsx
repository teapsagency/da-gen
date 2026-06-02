"use client";

import React from "react";
import { Instagram, Linkedin } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import type { SocialPlatform } from "@/types";
import { DeviceFrame, DEVICE_NATIVE_WIDTH, type DeviceKind } from "./DeviceFrame";
import { InstagramPostView } from "./InstagramPostView";
import { LinkedInPostView } from "./LinkedInPostView";

const DEVICES: DeviceKind[] = ["mobile", "tablet", "desktop"];

export function PreviewStage() {
  const [platform, setPlatform] = React.useState<SocialPlatform>("instagram");
  const caption = useDAStore((s) => s.previewCaption);
  const hashtags = useDAStore((s) => s.previewHashtags);
  const images = useDAStore((s) => s.previewImages);
  const identity = useDAStore((s) => s.socialIdentity);
  const avatar = useDAStore((s) => s.agencyLogo);

  // Échelle commune : le desktop (1280) tient dans la colonne, plafonnée à 0.62
  // pour éviter des cartes géantes sur grand écran. Les 3 appareils partagent
  // ce facteur → tailles relatives réalistes.
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scaleBase, setScaleBase] = React.useState(0.5);
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScaleBase(Math.min(0.62, el.offsetWidth / DEVICE_NATIVE_WIDTH.desktop));
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const renderCard = () =>
    platform === "instagram" ? (
      <InstagramPostView caption={caption} hashtags={hashtags} images={images} avatar={avatar} handle={identity.instagramHandle} />
    ) : (
      <LinkedInPostView caption={caption} hashtags={hashtags} images={images} avatar={avatar} displayName={identity.displayName} followers={identity.followers} />
    );

  const toggle = (p: SocialPlatform, Icon: typeof Instagram, label: string) => (
    <button
      onClick={() => setPlatform(p)}
      className={`px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
        platform === p ? "bg-card text-foreground shadow-sm" : "text-foreground/40 hover:text-foreground/60"
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  return (
    <div className="p-12 lg:p-20">
      <div className="max-w-3xl mx-auto mb-12">
        <div className="flex bg-foreground/[0.04] rounded-lg p-0.5 gap-0.5 w-fit">
          {toggle("instagram", Instagram, "Instagram")}
          {toggle("linkedin", Linkedin, "LinkedIn")}
        </div>
      </div>
      <div ref={containerRef} className="max-w-3xl mx-auto flex flex-col items-center gap-16">
        {DEVICES.map((d) => (
          <DeviceFrame key={d} device={d} displayWidth={DEVICE_NATIVE_WIDTH[d] * scaleBase}>
            {renderCard()}
          </DeviceFrame>
        ))}
      </div>
    </div>
  );
}
