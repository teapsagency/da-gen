import React from "react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { getTextColor } from "@/lib/contrastUtils";
import { EditableImage } from "@/components/ui/EditableImage";

/** #RRGGBB + alpha (00..ff) si le hex est valide, sinon "transparent". */
function withAlpha(hex: string, aa: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${aa}` : "transparent";
}

/** « Vivacité » (chroma = (max-min)/255) d'un hex ; 0 pour un gris / valeur invalide. */
function chroma(hex: string): number {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return 0;
  const n = m[1];
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

/** Couleur d'accent = la couleur la plus vive de la palette, repli sur la 1re / bleu. */
function pickAccent(palette: string[], fallback: string): string {
  let best = "";
  let bestChroma = 0;
  for (const c of palette) {
    const k = chroma(c);
    if (k > bestChroma) {
      bestChroma = k;
      best = c;
    }
  }
  return best || palette[0] || fallback;
}

/**
 * Story 9:16 (1080×1920) pour les réseaux sociaux.
 * Format vertical qui « respire » : logo du site + accent de palette en tête,
 * grand aperçu MOBILE du site dans un bezel de téléphone flottant au centre
 * (halo d'accent derrière), accroche (police scrapée) + signature TEAPS en pied.
 * Mêmes sources de données que les frames sociales existantes (store + screenshots).
 */
export const Frame11_Social_StoryHero = ({ id }: { id?: string }) => {
  const {
    scrapeResult,
    selectedLogo,
    selectedColors,
    bgColor,
    fontName,
    localFontFile,
    logoScale,
    fontUppercase,
    agencyLogo,
    dropShadow,
    showcaseWording,
  } = useDAStore();
  const activeScreenshots = useActiveScreenshots();

  if (!scrapeResult || !activeScreenshots) return null;

  const editable = !id;
  const domain = scrapeResult.domain.replace(/^www\./, "");
  // Nom de marque déduit au scrape (titre / og:site_name), repli sur le domaine.
  const fallbackName = domain.replace(/\.[^.]+$/, "");
  const displayName =
    scrapeResult.siteName?.trim() || fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);

  // Police SÉLECTIONNÉE (site scrapé / panneau typo), chargée globalement.
  const projectFont = localFontFile ? "LocalFont" : `"${fontName}", 'Archivo', sans-serif`;

  // Palette sélectionnée (repli sur la palette scrapée) → couleur d'accent vive.
  const palette =
    selectedColors.length > 0 ? selectedColors : scrapeResult.colors.map((c) => c.hex);
  const accent = pickAccent(palette, "#1e33f6");

  const onBg = getTextColor(bgColor); // texte lisible sur le fond quel qu'il soit
  const onAccent = getTextColor(accent);
  const eyebrow = showcaseWording === "nouvelle" ? "Nouvelle réalisation" : "Focus client";
  const heroSrc = activeScreenshots.mobile || activeScreenshots.desktopFull;

  return (
    <div
      id={id}
      style={{
        position: "relative",
        width: "1080px",
        height: "1920px",
        background: bgColor,
        borderRadius: 0,
        boxSizing: "border-box",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "80px 80px 72px",
        gap: "48px",
      }}
    >
      {/* ── Halos d'accent décoratifs (derrière le téléphone) ── */}
      <div
        style={{
          position: "absolute",
          top: "520px",
          left: "-140px",
          width: "620px",
          height: "620px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${withAlpha(accent, "38")} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "980px",
          right: "-160px",
          width: "560px",
          height: "560px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${withAlpha(accent, "2e")} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* ═══ EN-TÊTE — logo du site · pastille d'accent (domaine) ═══ */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
          height: "96px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", maxWidth: "60%", height: "100%" }}>
          {selectedLogo && (
            <img
              src={selectedLogo}
              alt="Logo"
              style={{
                maxHeight: "88px",
                maxWidth: "100%",
                objectFit: "contain",
                transformOrigin: "left center",
                transform: `scale(${logoScale})`,
              }}
            />
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            background: accent,
            color: onAccent,
            padding: "18px 30px",
            borderRadius: "9999px",
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "30px",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: onAccent, opacity: 0.9 }} />
          {domain}
        </div>
      </div>

      {/* ═══ HÉROS — aperçu mobile dans un bezel de téléphone flottant ═══ */}
      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            height: "100%",
            aspectRatio: "9 / 19.5",
            background: "#0c0c0e",
            borderRadius: "72px",
            padding: "16px",
            boxSizing: "border-box",
            boxShadow: dropShadow
              ? "0 40px 80px -30px rgba(0, 0, 0, 0.55), 0 0 0 2px rgba(255,255,255,0.04)"
              : "0 0 0 2px rgba(255,255,255,0.04)",
          }}
        >
          {/* Encoche */}
          <div
            style={{
              position: "absolute",
              top: "26px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "150px",
              height: "30px",
              borderRadius: "9999px",
              background: "#0c0c0e",
              zIndex: 2,
            }}
          />
          {/* Écran */}
          <div style={{ width: "100%", height: "100%", borderRadius: "58px", overflow: "hidden", background: "#fff" }}>
            <EditableImage
              slotKey="frame-11-story__main"
              src={heroSrc}
              alt="Aperçu mobile"
              editable={editable}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top center",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>

      {/* ═══ PIED — accroche (police scrapée) + signature TEAPS ═══ */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "22px", flexShrink: 0 }}>
        {/* Suréminence : barre d'accent + libellé */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <span style={{ width: "64px", height: "8px", borderRadius: "9999px", background: accent, flexShrink: 0 }} />
          <span
            style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "30px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: onBg,
              opacity: 0.65,
            }}
          >
            {eyebrow}
          </span>
        </div>

        {/* Nom de marque — police du site */}
        <div
          style={{
            fontFamily: projectFont,
            fontWeight: 600,
            fontSize: "108px",
            lineHeight: 0.98,
            letterSpacing: "-0.02em",
            color: onBg,
            textTransform: fontUppercase ? "uppercase" : "none",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            wordBreak: "break-word",
          }}
        >
          {displayName}
        </div>

        {/* Signature TEAPS */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingTop: "8px" }}>
          <span
            style={{
              fontFamily: "Satoshi, sans-serif",
              fontWeight: 500,
              fontSize: "28px",
              color: onBg,
              opacity: 0.55,
              whiteSpace: "nowrap",
            }}
          >
            Réalisé par
          </span>
          {agencyLogo && (
            <img
              src={agencyLogo}
              alt="TEAPS"
              style={{
                height: "40px",
                maxWidth: "220px",
                objectFit: "contain",
                // Logo TEAPS recoloré pour rester lisible sur fond clair ou foncé.
                filter: onBg === "#FFFFFF" ? "brightness(0) invert(1)" : "brightness(0)",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
