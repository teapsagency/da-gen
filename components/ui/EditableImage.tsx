"use client";

import React, { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ImagePlus, X } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { toast } from "sonner";

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
}: Props) {
  const customSrc = useDAStore((s) => s.customScreenshots[slotKey]);
  const setCustomScreenshot = useDAStore((s) => s.setCustomScreenshot);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const effectiveSrc = customSrc || src;
  const hasCustom = Boolean(customSrc);

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
      <img src={effectiveSrc} alt={alt} style={style} />

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
                width: "clamp(28px, 4cqi, 64px)",
                height: "clamp(28px, 4cqi, 64px)",
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
                  width: "clamp(16px, 2.2cqi, 36px)",
                  height: "clamp(16px, 2.2cqi, 36px)",
                }}
              />
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
        </>
      )}
    </div>
  );
}
