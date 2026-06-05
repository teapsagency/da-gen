"use client";
import { useEffect } from "react";
import { useDAStore } from "@/store/daStore";
import { cleanFontName } from "./fontName";
import { loadDetectedFont } from "./fontLoader";

/**
 * Charge les @font-face des polices détectées dès qu'un scrapeResult arrive,
 * indépendamment de l'onglet Typographie (qui n'est monté qu'au clic). Les
 * frames affichent ainsi la bonne typo immédiatement après l'analyse.
 *
 * En plus de l'injection (idempotente), on renseigne `fontUrl` pour la police
 * ACTIVE dès qu'elle est résolue (Google/Fontshare) : sans ça, l'avertissement
 * « police sans source » s'affichait tant qu'on n'avait pas ouvert le panneau
 * Typographie (c'est lui qui appelait setFont). On ne touche pas aux polices
 * importées localement.
 */
export function useFontLoader() {
  const fonts = useDAStore((s) => s.scrapeResult?.fonts);
  const fontName = useDAStore((s) => s.fontName);
  useEffect(() => {
    if (!fonts?.length) return;
    fonts.forEach((f) => {
      void loadDetectedFont(f).then((url) => {
        if (!url) return;
        const display = cleanFontName(f.name) || f.name;
        const s = useDAStore.getState();
        if (s.fontName === display && !s.fontUrl && !s.localFontFile && !s.importedFonts[display]) {
          s.setFont(display, url);
        }
      });
    });
  }, [fonts, fontName]);
}
