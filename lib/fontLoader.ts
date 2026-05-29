import { cleanFontName } from "./fontName";

// Résolution + injection des @font-face des polices détectées. Partagé par le
// chargement eager au niveau page (useFontLoader) et par le FontSelector.

// Affiche un logo de source uniquement si l'URL la confirme.
export const getFontSource = (fontUrl?: string): "google" | "fontshare" | null => {
  if (!fontUrl) return null;
  if (fontUrl.includes("fonts.googleapis.com")) return "google";
  if (fontUrl.includes("fontshare.com") || fontUrl.includes("api.fontshare")) return "fontshare";
  return null;
};

// "Bricolage Grotesque" → "Bricolage+Grotesque"
const toGoogleFontsSlug = (name: string): string => name.replace(/ +/g, "+");

export const buildGoogleFontsUrl = (fontName: string): string =>
  `https://fonts.googleapis.com/css2?family=${toGoogleFontsSlug(fontName)}:wght@400;500;600;700&display=swap`;

// "Satoshi Variable" → "satoshi" (les slugs Fontshare droppent le suffixe "Variable")
const toFontshareSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\b(variable[- ]?font|variable|vf)\b/g, "")
    .trim()
    .replace(/ +/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const buildFontshareUrl = (fontName: string): string =>
  `https://api.fontshare.com/v2/css?f[]=${toFontshareSlug(fontName)}@400,500,600,700&display=swap`;

// Récupère le CSS d'une police via le proxy same-origin (évite les erreurs CORS
// bruyantes des fetch cross-origin pour les polices absentes d'un CDN donné).
export const fetchFontCss = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(`/api/font-css?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const text = await res.text();
      if (text.includes("@font-face")) return text;
    }
  } catch {
    /* erreur réseau — police considérée indisponible */
  }
  return null;
};

// Injecte le CSS d'une police dans <head> (idempotent via data-url). Renvoie
// true si la feuille est valide/déjà présente.
export const injectFontCss = async (url: string): Promise<boolean> => {
  if (!url || typeof document === "undefined") return false;
  if (
    document.querySelector(`style[data-url="${url}"]`) ||
    document.querySelector(`link[href="${url}"]`)
  ) {
    return true;
  }
  const text = await fetchFontCss(url);
  if (!text) return false;
  const style = document.createElement("style");
  style.setAttribute("data-url", url);
  style.textContent = text;
  document.head.appendChild(style);
  return true;
};

// Charge une police détectée : URL scrapée → Google Fonts → Fontshare.
export const loadDetectedFont = async (font: { name: string; url?: string }): Promise<void> => {
  const name = cleanFontName(font.name) || font.name;
  if (font.url && (await injectFontCss(font.url))) return;
  if (await injectFontCss(buildGoogleFontsUrl(name))) return;
  await injectFontCss(buildFontshareUrl(name));
};
