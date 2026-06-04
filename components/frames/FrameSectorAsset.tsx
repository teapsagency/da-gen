import React from "react";
import { Briefcase } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { ASSET_DIMS, ICON_MAP } from "@/lib/sectorThemes";
import type { SectorAsset } from "@/types";

/**
 * Template d'asset secteur : photo de banque d'images plein cadre + voile bleu
 * TEAPS + slots de coin (icône, logo, pilule, badge). Purement présentationnel
 * (rendu depuis le prop `asset`) → la même donnée sert l'aperçu éditable et
 * l'instance offscreen d'export (prop `id`).
 *
 * Conteneur PLAT (ni bordure ni arrondi) — règle « assets plats » : la
 * bordure/le radius sont rajoutés à la main sur Elementor.
 */
export const FrameSectorAsset = ({ asset, id }: { asset: SectorAsset; id?: string }) => {
  const agencyLogo = useDAStore((s) => s.agencyLogo);
  const selectedColors = useDAStore((s) => s.selectedColors);
  // Accent = 1ère couleur de la DA scrapée, repli bleu TEAPS.
  const accent = selectedColors[0] || "#2D2DFF";

  const { w, h } = ASSET_DIMS[asset.ratio];
  const Icon = ICON_MAP[asset.iconName] ?? Briefcase;
  const photo = asset.photo.kind !== "none" ? asset.photo.dataUrl : null;

  // Tailles proportionnelles à la largeur → rendu constant quel que soit le ratio.
  const pad = Math.round(w * 0.045);
  const iconBox = Math.round(w * 0.085);
  const pillFont = Math.round(w * 0.02);
  const pillPadY = Math.round(w * 0.013);
  const pillPadX = Math.round(w * 0.024);

  return (
    <div
      id={id}
      style={{
        position: "relative",
        width: `${w}px`,
        height: `${h}px`,
        overflow: "hidden",
        borderRadius: 0,
        background: "#0b1220",
        fontFamily: "Satoshi, sans-serif",
      }}
    >
      {/* Photo plein cadre (ou placeholder si pas encore choisie) */}
      {photo ? (
        <img
          src={photo}
          alt={asset.photo.kind === "stock" ? asset.photo.alt ?? "" : ""}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `center ${asset.regionY * 100}%`,
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #1b2a4a, #0b1220)",
            color: "rgba(255,255,255,0.45)",
            fontSize: `${Math.round(w * 0.022)}px`,
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          Aucune image
        </div>
      )}

      {/* Voile bleu TEAPS (unité de marque + lisibilité) */}
      <div style={{ position: "absolute", inset: 0, background: accent, opacity: asset.veil }} />
      {/* Léger dégradé bas pour décoller les éléments de coin de la photo */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.32), rgba(0,0,0,0) 42%)",
        }}
      />

      {/* HG — icône thématique */}
      {asset.slots.icon && (
        <div
          style={{
            position: "absolute",
            top: pad,
            left: pad,
            width: iconBox,
            height: iconBox,
            borderRadius: Math.round(iconBox * 0.28),
            background: "rgba(255,255,255,0.94)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 28px rgba(0,0,0,0.20)",
          }}
        >
          <Icon style={{ width: iconBox * 0.54, height: iconBox * 0.54, color: accent }} strokeWidth={2} />
        </div>
      )}

      {/* HD — logo TEAPS (forcé blanc sur la photo) */}
      {asset.slots.logo && agencyLogo && (
        <img
          src={agencyLogo}
          alt="TEAPS"
          style={{
            position: "absolute",
            top: pad,
            right: pad,
            height: Math.round(w * 0.05),
            maxWidth: "32%",
            objectFit: "contain",
            filter: "brightness(0) invert(1)",
          }}
        />
      )}

      {/* BG — pilule libellé (flèche d'accent) */}
      {asset.slots.pill && asset.pill && (
        <div
          style={{
            position: "absolute",
            left: pad,
            bottom: pad,
            display: "flex",
            alignItems: "center",
            gap: Math.round(w * 0.013),
            background: "rgba(255,255,255,0.96)",
            borderRadius: 9999,
            padding: `${pillPadY}px ${pillPadX}px`,
            boxShadow: "0 10px 28px rgba(0,0,0,0.20)",
            maxWidth: "70%",
          }}
        >
          <span
            style={{
              width: 0,
              height: 0,
              borderTop: `${Math.round(w * 0.008)}px solid transparent`,
              borderBottom: `${Math.round(w * 0.008)}px solid transparent`,
              borderLeft: `${Math.round(w * 0.012)}px solid ${accent}`,
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 700, fontSize: `${pillFont}px`, color: "#111", lineHeight: 1.1 }}>
            {asset.pill}
          </span>
        </div>
      )}

      {/* BD — badge (libellé du secteur) */}
      {asset.slots.badge && asset.badge && (
        <div
          style={{
            position: "absolute",
            right: pad,
            bottom: pad,
            background: accent,
            color: "#fff",
            borderRadius: 9999,
            padding: `${Math.round(w * 0.011)}px ${Math.round(w * 0.022)}px`,
            fontWeight: 700,
            fontSize: `${Math.round(w * 0.019)}px`,
            letterSpacing: "0.01em",
            boxShadow: "0 10px 28px rgba(0,0,0,0.20)",
          }}
        >
          {asset.badge}
        </div>
      )}
    </div>
  );
};
