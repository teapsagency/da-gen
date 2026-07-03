"use client";

import React, { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ImagePlus, X, Crop } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { useActiveScreenshots } from "@/lib/useActiveScreenshots";
import { toast } from "sonner";
import { RegionPicker } from "./RegionPicker";

type Props = {
  /** Stable identifier for the override slot (e.g. "frame-2-mockup__desktop"). */
  slotKey: string;
  /** Fallback source if no custom image is set. */
  src: string;
  alt?: string;
  /** Style applied to the underlying <img>. */
  style?: CSSProperties;
  /** Style applied to the outer wrapper (defaults to width/height: 100%). */
  wrapperStyle?: CSSProperties;
  /**
   * When false, behaves like a plain <img> — no hover, no upload UI.
   * Set this to false on the offscreen frames used for export so the
   * editing affordances never leak into the captured PNG.
   */
  editable?: boolean;
  /**
   * Image pleine page dans laquelle « Choisir la zone » recadre (en général
   * activeScreenshots.desktopFull). Quand fournie, un bouton de sélection de
   * zone apparaît au survol.
   */
  regionSource?: string;
  /**
   * Zone PAR-INSTANCE (ex. une slide Showcase) plutôt que le regionY global.
   * Quand fournis : le sélecteur écrit dans `onRegionChange` au lieu du store
   * global, et l'aperçu du picker ne montre qu'un seul appareil (`regionDevice`).
   */
  regionValue?: number;
  onRegionChange?: (regionY: number) => void;
  regionDevice?: "desktop" | "mobile";
  /**
   * Quand false, EditableImage n'applique PAS lui-même l'object-position de la
   * zone (l'appelant s'en charge, ex. Showcase qui étale la zone sur N mockups).
   * Le bouton « Zone » reste affiché. Défaut true.
   */
  applyRegion?: boolean;
};

/**
 * Image with an in-place upload affordance. On hover, an overlay reveals
 * a "+" picker that lets the user swap the scraped screenshot for a
 * custom one (the upload is stored as a base64 data URL in the project's
 * customScreenshots map, keyed by slotKey). A small ✕ in the corner
 * resets the override.
 *
 * All editing chrome carries data-editor-only so the html-to-image
 * exporter can filter it out as a belt-and-suspenders guarantee.
 */
export function EditableImage({
  slotKey,
  src,
  alt = "",
  style,
  wrapperStyle,
  editable = true,
  regionSource,
  regionValue,
  onRegionChange,
  regionDevice,
  applyRegion = true,
}: Props) {
  const customSrc = useDAStore((s) => s.customScreenshots[slotKey]);
  const setCustomScreenshot = useDAStore((s) => s.setCustomScreenshot);
  const globalRegionY = useDAStore((s) => s.regionY);
  const globalSetRegionY = useDAStore((s) => s.setRegionY);
  const activeScreenshots = useActiveScreenshots();
  // Zone par-instance (Showcase) si fournie, sinon le regionY global partagé.
  const regionY = regionValue ?? globalRegionY;
  const applyRegionValue = (ry: number) => (onRegionChange ?? globalSetRegionY)(ry);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  // Sélecteur de zone : on capture le ratio du slot à l'ouverture (invariant au
  // scale du preview). Selon que le slot cliqué est paysage ou portrait, on
  // l'utilise comme ratio de l'aperçu desktop OU mobile ; l'autre prend un ratio
  // par défaut. La popup montre TOUJOURS les deux aperçus (regionY est global).
  const [picker, setPicker] = useState<{ open: boolean; desktopAspect: number; mobileAspect: number; slotAspect: number }>({
    open: false,
    desktopAspect: 1.3,
    mobileAspect: 0.46,
    slotAspect: 1.3,
  });

  const openPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = wrapperRef.current?.getBoundingClientRect();
    const a = r && r.height > 0 ? r.width / r.height : 1;
    const portrait = a < 1;
    setPicker({
      open: true,
      // Ratio brut du slot (mockup) — utilisé pour l'aperçu mono-appareil (Showcase).
      slotAspect: a,
      // Le slot ouvrant la popup affiche toujours une capture DESKTOP : son ratio
      // pilote donc l'aperçu desktop (paysage → le ratio réel ; portrait → 1.3
      // par défaut). L'aperçu MOBILE représente toujours un téléphone → ratio
      // fixe ~0.46 (390/844), jamais celui du slot (sinon une fenêtre navigateur
      // portrait, ex. frame 04, zoomait l'aperçu mobile).
      desktopAspect: portrait ? 1.3 : a,
      mobileAspect: 0.46,
    });
  };

  const hasCustom = Boolean(customSrc);
  // Sources pleine page pour les DEUX aperçus de la popup (regionY étant global,
  // on montre toujours desktop + mobile, quel que soit le slot qui ouvre).
  const desktopRegionSrc = activeScreenshots?.desktopFull;
  const mobileRegionSrc = activeScreenshots?.mobile;
  // Zone de capture globale : quand regionY > 0 et qu'une source pleine page est
  // fournie, on affiche cette source pan­née verticalement (object-position). Un
  // upload custom prime et n'est jamais déplacé.
  const regionActive = applyRegion && !hasCustom && !!regionSource && regionY > 0;
  const effectiveSrc = customSrc || (regionActive ? (regionSource as string) : src);
  const effectiveStyle: CSSProperties = regionActive
    ? { ...style, objectFit: "cover", objectPosition: `center ${regionY * 100}%` }
    : (style as CSSProperties);

  const handlePick = () => inputRef.current?.click();

  const ingestBlob = useCallback(
    (blob: Blob, source: "upload" | "paste") => {
      if (!blob.type.startsWith("image/")) {
        toast.error("Fichier non valide — choisissez une image.");
        return;
      }
      // ~8 MB cap: dataURL bloats ~33% and the project lives in IndexedDB.
      // Above that we'd choke the autosave and slow the export.
      const MAX_BYTES = 8 * 1024 * 1024;
      if (blob.size > MAX_BYTES) {
        toast.error("Image trop lourde (max 8 Mo).");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setCustomScreenshot(slotKey, reader.result);
          toast.success(source === "paste" ? "Image collée" : "Visuel personnalisé appliqué");
        }
      };
      reader.onerror = () => toast.error("Lecture du fichier impossible");
      reader.readAsDataURL(blob);
    },
    [setCustomScreenshot, slotKey],
  );

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    ingestBlob(file, "upload");
    // Reset the input so re-uploading the same file fires onChange again.
    e.target.value = "";
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomScreenshot(slotKey, null);
    toast.success("Visuel d'origine restauré");
  };

  // While hovered, swallow Cmd/Ctrl+V and pull an image out of the clipboard.
  // This makes the natural macOS workflow (⌘+⇧+4 → screenshot to clipboard
  // → hover mockup → ⌘V) just work. We register globally rather than on the
  // overlay button because the user shouldn't have to click to focus first.
  useEffect(() => {
    if (!editable || !isHovered) return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (!blob) continue;
          e.preventDefault();
          ingestBlob(blob, "paste");
          return;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [editable, isHovered, ingestBlob]);

  // Detect macOS so the paste hint matches what the user actually presses
  // (⌘ vs Ctrl). Defaults to ⌘ during SSR — harmless: the hint just sits in
  // the overlay, the listener accepts both modifiers.
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const pasteHint = isMac ? "⌘ V" : "Ctrl + V";

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        // Container query unit (cqi) used below makes icon/text/button sizes
        // scale with the wrapper, so the overlay looks the same in the small
        // social frames (1080px wide) and the big desktop ones (2373px wide).
        containerType: "inline-size",
        ...wrapperStyle,
      }}
      onMouseEnter={() => editable && setIsHovered(true)}
      onMouseLeave={() => editable && setIsHovered(false)}
    >
      <img src={effectiveSrc} alt={alt} style={effectiveStyle} />

      {editable && (
        <>
          {/* Click-to-upload overlay — hidden until hover, never visible on export */}
          <button
            type="button"
            onClick={handlePick}
            data-editor-only=""
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "1.6cqi",
              background: "rgba(0, 0, 0, 0.55)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              opacity: isHovered ? 1 : 0,
              transition: "opacity 160ms ease",
              padding: 0,
              // Preserve the parent's clipping so the overlay matches mockup
              // shapes (rounded corners on the img container, etc.).
              borderRadius: "inherit",
              // Inline-styles on the img live in a sibling. The overlay needs
              // to layer above any z-indexed content of the host frame.
              zIndex: 10,
            }}
            aria-label="Remplacer l'image"
          >
            <ImagePlus
              strokeWidth={1.5}
              style={{
                width: "clamp(32px, 7cqi, 140px)",
                height: "clamp(32px, 7cqi, 140px)",
              }}
            />
            <span
              style={{
                fontFamily: "Satoshi, sans-serif",
                fontWeight: 600,
                fontSize: "clamp(14px, 2.4cqi, 44px)",
                letterSpacing: "0.02em",
                lineHeight: 1.1,
              }}
            >
              {hasCustom ? "Remplacer l'image" : "Ajouter une image"}
            </span>
            <span
              style={{
                fontFamily: "Satoshi, sans-serif",
                fontWeight: 500,
                fontSize: "clamp(11px, 1.7cqi, 28px)",
                letterSpacing: "0.04em",
                opacity: 0.75,
                marginTop: "0.4cqi",
              }}
            >
              ou collez avec {pasteHint}
            </span>
          </button>

          {/* Reset chip — only when an override is active */}
          {hasCustom && (
            <button
              type="button"
              onClick={handleReset}
              data-editor-only=""
              title="Restaurer le screenshot d'origine"
              style={{
                position: "absolute",
                top: "clamp(8px, 1.4cqi, 28px)",
                right: "clamp(8px, 1.4cqi, 28px)",
                width: "clamp(36px, 5.5cqi, 64px)",
                height: "clamp(36px, 5.5cqi, 64px)",
                borderRadius: "50%",
                background: "rgba(0, 0, 0, 0.7)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isHovered ? 1 : 0,
                transition: "opacity 160ms ease",
                zIndex: 11,
              }}
              aria-label="Restaurer le screenshot d'origine"
            >
              <X
                strokeWidth={2}
                style={{
                  width: "clamp(20px, 3cqi, 36px)",
                  height: "clamp(20px, 3cqi, 36px)",
                }}
              />
            </button>
          )}

          {/* Choisir la zone — recadre depuis le screenshot pleine page */}
          {regionSource && (
            <button
              type="button"
              onClick={openPicker}
              data-editor-only=""
              title="Choisir la zone de la page à afficher"
              style={{
                position: "absolute",
                top: "clamp(8px, 1.4cqi, 28px)",
                left: "clamp(8px, 1.4cqi, 28px)",
                height: "clamp(36px, 5.5cqi, 64px)",
                paddingLeft: "clamp(14px, 1.8cqi, 22px)",
                paddingRight: "clamp(14px, 1.8cqi, 22px)",
                borderRadius: "9999px",
                background: "rgba(0, 0, 0, 0.7)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "clamp(6px, 1cqi, 12px)",
                opacity: isHovered ? 1 : 0,
                transition: "opacity 160ms ease",
                zIndex: 11,
                fontFamily: "Satoshi, sans-serif",
                fontWeight: 600,
                fontSize: "clamp(13px, 2cqi, 24px)",
                whiteSpace: "nowrap",
              }}
              aria-label="Choisir la zone"
            >
              <Crop style={{ width: "clamp(18px, 3cqi, 36px)", height: "clamp(18px, 3cqi, 36px)" }} strokeWidth={2} />
              Zone
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            data-editor-only=""
            style={{ display: "none" }}
          />

          {picker.open && regionSource && (() => {
            // Mode par-slide (Showcase) : un seul aperçu, celui de l'appareil du
            // mockup, au ratio réel du slot. Sinon : aperçus desktop + mobile
            // (zone globale partagée).
            if (regionDevice) {
              const src = regionDevice === "mobile" ? mobileRegionSrc : desktopRegionSrc;
              if (!src) return null;
              return (
                <RegionPicker
                  navSource={src}
                  navAspect={picker.slotAspect}
                  previews={[{ label: regionDevice === "mobile" ? "Mobile" : "Desktop", source: src, aspect: picker.slotAspect, visibleRatio: 1 }]}
                  initialY={regionY}
                  scopeNote="Glisse la bande — appliqué à cette slide"
                  onConfirm={(ry) => {
                    applyRegionValue(ry);
                    setPicker((p) => ({ ...p, open: false }));
                    toast.success("Zone appliquée à la slide");
                  }}
                  onClose={() => setPicker((p) => ({ ...p, open: false }))}
                />
              );
            }
            if (!desktopRegionSrc) return null;
            return (
              <RegionPicker
                navSource={desktopRegionSrc}
                navAspect={picker.desktopAspect}
                previews={[
                  // Desktop : mockup non rogné (montre toute l'image) → visibleRatio 1.
                  { label: "Desktop", source: desktopRegionSrc, aspect: picker.desktopAspect, visibleRatio: 1 },
                  // Mobile : le mockup « téléphone » dépasse le cadre et n'en montre
                  // que ~85 % par le haut → on rogne pareil pour coller à l'asset
                  // (et masquer la fine bande blanche tout en bas de la capture).
                  ...(mobileRegionSrc ? [{ label: "Mobile", source: mobileRegionSrc, aspect: picker.mobileAspect, visibleRatio: 0.85 }] : []),
                ]}
                initialY={regionY}
                onConfirm={(ry) => {
                  applyRegionValue(ry);
                  setPicker((p) => ({ ...p, open: false }));
                  toast.success("Zone appliquée à tous les visuels");
                }}
                onClose={() => setPicker((p) => ({ ...p, open: false }))}
              />
            );
          })()}
        </>
      )}
    </div>
  );
}
