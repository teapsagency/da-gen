import React from "react";
import type { SocialFrameId } from "@/types";
import { Frame4_Social_BrowserFull } from "@/components/frames/Frame4_Social_BrowserFull";
import { Frame5_Social_HeroSimple } from "@/components/frames/Frame5_Social_HeroSimple";
import { Frame6_Social_NouvelleReal } from "@/components/frames/Frame6_Social_NouvelleReal";
import { Frame7_Social_ThreeImg } from "@/components/frames/Frame7_Social_ThreeImg";
import { Frame8_Social_CardSite } from "@/components/frames/Frame8_Social_CardSite";
import { Frame9_Social_BoardDesktop } from "@/components/frames/Frame9_Social_BoardDesktop";
import { Frame10_Social_BoardMobile } from "@/components/frames/Frame10_Social_BoardMobile";
import { Frame1_DA_Mobile } from "@/components/frames/Frame1_DA_Mobile";
import { FrameColors_Mobile } from "@/components/frames/FrameColors_Mobile";

/**
 * Pour exporter en PNG un visuel « frame » du carrousel : son id DOM dédié
 * (mount offscreen + capture via captureFrame), ses dimensions natives, un nom
 * de fichier, et le nœud rendu AVEC cet id (chrome d'édition masqué à l'export).
 * Ids préfixés « carousel- » pour ne pas entrer en collision avec les frames
 * offscreen de l'app (frame-4-social-browser, …) qui peuvent coexister.
 */
export const CAROUSEL_FRAME_EXPORT: Record<
  SocialFrameId,
  { id: string; w: number; h: number; name: string; node: React.ReactNode }
> = {
  frame4: { id: "carousel-frame4", w: 1080, h: 1350, name: "browser_full", node: <Frame4_Social_BrowserFull id="carousel-frame4" /> },
  frame5: { id: "carousel-frame5", w: 1080, h: 675, name: "hero_simple", node: <Frame5_Social_HeroSimple id="carousel-frame5" /> },
  frame6: { id: "carousel-frame6", w: 1080, h: 1350, name: "nouvelle_realisation", node: <Frame6_Social_NouvelleReal id="carousel-frame6" /> },
  frame7: { id: "carousel-frame7", w: 1080, h: 1350, name: "trois_images", node: <Frame7_Social_ThreeImg id="carousel-frame7" /> },
  frame8: { id: "carousel-frame8", w: 1080, h: 1350, name: "card_site", node: <Frame8_Social_CardSite id="carousel-frame8" /> },
  frame9: { id: "carousel-frame9", w: 1080, h: 1350, name: "planche_desktop", node: <Frame9_Social_BoardDesktop id="carousel-frame9" /> },
  frame10: { id: "carousel-frame10", w: 1080, h: 1350, name: "planche_mobile", node: <Frame10_Social_BoardMobile id="carousel-frame10" /> },
  identityMobile: { id: "carousel-identityMobile", w: 1080, h: 1350, name: "identite_mobile", node: <Frame1_DA_Mobile id="carousel-identityMobile" /> },
  colorsMobile: { id: "carousel-colorsMobile", w: 1080, h: 1350, name: "couleurs_mobile", node: <FrameColors_Mobile id="carousel-colorsMobile" /> },
};
