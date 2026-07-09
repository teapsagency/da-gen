import type { PreviewImageRef, ScrapeResult } from "@/types";

export type ImageSourceItem = { ref: PreviewImageRef; label: string; thumb: string };

/** Résout une clé de screenshot vers sa data URL depuis le scrapeResult. */
export function resolveScreenshotKey(key: string, sr: ScrapeResult | null): string | undefined {
  if (!sr) return undefined;
  if (key === "main:desktop") return sr.screenshots.desktop;
  if (key === "main:mobile") return sr.screenshots.mobile;
  const m = key.match(/^page:(\d+):(desktop|mobile)$/);
  if (m) {
    const page = sr.extraPages[Number(m[1])];
    if (!page) return undefined;
    return m[2] === "desktop" ? page.desktop : page.mobile;
  }
  return undefined;
}

/** Screenshots scrapés disponibles comme sources d'image. */
export function listScreenshotSources(sr: ScrapeResult | null): ImageSourceItem[] {
  if (!sr) return [];
  const items: ImageSourceItem[] = [];
  if (sr.screenshots.desktop)
    items.push({ ref: { kind: "screenshot", key: "main:desktop" }, label: "Accueil — desktop", thumb: sr.screenshots.desktop });
  if (sr.screenshots.mobile)
    items.push({ ref: { kind: "screenshot", key: "main:mobile" }, label: "Accueil — mobile", thumb: sr.screenshots.mobile });
  sr.extraPages.forEach((p, i) => {
    const name = p.label || `Page ${i + 1}`;
    if (p.desktop)
      items.push({ ref: { kind: "screenshot", key: `page:${i}:desktop` }, label: `${name} — desktop`, thumb: p.desktop });
    if (p.mobile)
      items.push({ ref: { kind: "screenshot", key: `page:${i}:mobile` }, label: `${name} — mobile`, thumb: p.mobile });
  });
  return items;
}

// Visuels sociaux disponibles. Le rendu live est dans PreviewImage.
// Numérotation alignée sur les titres de l'app (Charte 01-02, Desktop 03-04,
// puis réseaux sociaux 05-11) — séquentielle et sans collision.
export const FRAME_SOURCES: { ref: PreviewImageRef; label: string }[] = [
  { ref: { kind: "frame", frame: "identityMobile" }, label: "01 / Identité — Mobile" },
  { ref: { kind: "frame", frame: "colorsMobile" }, label: "02 / Couleurs — Mobile" },
  { ref: { kind: "frame", frame: "mockupMobile" }, label: "03 / Interface — Mobile" },
  { ref: { kind: "frame", frame: "coverMobile" }, label: "04 / Couverture — Mobile" },
  { ref: { kind: "frame", frame: "frame4" }, label: "05 / Browser Full" },
  { ref: { kind: "frame", frame: "frame6" }, label: "06 / Nouvelle réal." },
  { ref: { kind: "frame", frame: "frame7" }, label: "07 / Trois images" },
  { ref: { kind: "frame", frame: "frame8" }, label: "08 / Card site" },
  { ref: { kind: "frame", frame: "frame9" }, label: "09 / Planche desktop" },
  { ref: { kind: "frame", frame: "frame10" }, label: "10 / Planche mobile" },
  { ref: { kind: "frame", frame: "frame11" }, label: "11 / Story 9:16" },
];
