"use client";
import { useEffect } from "react";
import { useDAStore } from "@/store/daStore";
import { loadDetectedFont } from "./fontLoader";

/**
 * Charge les @font-face des polices détectées dès qu'un scrapeResult arrive,
 * indépendamment de l'onglet Typographie (qui n'est monté qu'au clic). Les
 * frames affichent ainsi la bonne typo immédiatement après l'analyse.
 * L'injection est idempotente (cf. fontLoader) → pas de doublon avec le
 * FontSelector quand l'utilisateur ouvre l'onglet ensuite.
 */
export function useFontLoader() {
  const fonts = useDAStore((s) => s.scrapeResult?.fonts);
  useEffect(() => {
    if (!fonts?.length) return;
    fonts.forEach((f) => void loadDetectedFont(f));
  }, [fonts]);
}
