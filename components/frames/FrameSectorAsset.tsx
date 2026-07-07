import React, { useEffect, useRef, useState } from "react";
import { icons, Briefcase, X, GripVertical, ImagePlus, type LucideIcon } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { ASSET_DIMS, TEAPS_ACCENT } from "@/lib/sectorThemes";
import { BRAND_MAP } from "@/lib/brandLogos";
import type { AssetLayer, SectorAsset } from "@/types";

const ICON_RECORD = icons as unknown as Record<string, LucideIcon>;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Texte d'un calque (pilule/badge) éditable en place : contentEditable NON
 * contrôlé (le contenu est posé impérativement via ref, resynchronisé seulement
 * hors édition) → pas de reset du curseur quand le parent re-rend pendant la
 * frappe. Commit au blur / Entrée.
 */
function EditableLayerText({
  value,
  onCommit,
  style,
}: {
  value: string;
  onCommit: (t: string) => void;
  style: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing && ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value, editing]);
  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onFocus={() => setEditing(true)}
      onBlur={(e) => {
        setEditing(false);
        onCommit(e.currentTarget.textContent ?? "");
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      style={{ outline: "none", cursor: "text", ...style }}
    />
  );
}

type Props = {
  asset: SectorAsset;
  id?: string;
  // Handlers d'édition (aperçu uniquement ; absents sur l'instance d'export).
  onMoveLayer?: (id: string, x: number, y: number) => void;
  onRemoveLayer?: (id: string) => void;
  onImageClick?: () => void;
  // Clic sur le corps d'un calque icône/logo → ouvre le picker (côté parent).
  onEditLayer?: (id: string) => void;
  // Édition en place du texte d'un calque pilule/badge (commit au blur/Entrée).
  onEditText?: (id: string, text: string) => void;
  // Clic sur le glyphe d'une pilule → ouvre le picker de glyphe (côté parent).
  onEditGlyph?: (id: string) => void;
};

/**
 * Template d'asset secteur : une image flottante (plus petite que la card) +
 * overlay bleu TEAPS, entourée de calques (`asset.layers`) déplaçables via une
 * poignée. Fond de card TRANSPARENT → export PNG transparent.
 */
export const FrameSectorAsset = ({ asset, id, onMoveLayer, onRemoveLayer, onImageClick, onEditLayer, onEditText, onEditGlyph }: Props) => {
  const agencyLogo = useDAStore((s) => s.agencyLogo);
  const accent = TEAPS_ACCENT;
  const interactive = !id;

  const { w, h } = ASSET_DIMS[asset.ratio];
  const photo = asset.photo.kind !== "none" ? asset.photo.dataUrl : null;

  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offX: number; offY: number; rect: DOMRect } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [imgHover, setImgHover] = useState(false);

  const onHandleDown = (e: React.PointerEvent, layer: AssetLayer) => {
    if (!onMoveLayer || !rootRef.current) return;
    e.stopPropagation();
    const rect = rootRef.current.getBoundingClientRect();
    const cx = rect.left + layer.x * rect.width;
    const cy = rect.top + layer.y * rect.height;
    dragRef.current = { id: layer.id, offX: e.clientX - cx, offY: e.clientY - cy, rect };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDraggingId(layer.id);
  };
  const onHandleMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const nx = clamp01((e.clientX - d.offX - d.rect.left) / d.rect.width);
    const ny = clamp01((e.clientY - d.offY - d.rect.top) / d.rect.height);
    onMoveLayer?.(d.id, nx, ny);
  };
  const onHandleUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDraggingId(null);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // ─── Visuels par calque ───
  const iconBox = Math.round(w * 0.085);
  const chipPadY = Math.round(w * 0.012);
  const chipPadX = Math.round(w * 0.022);
  const chipFont = Math.round(w * 0.019);
  const chipShadow = "0 10px 28px rgba(0,0,0,0.14)";
  const chipBorder = "1px solid rgba(0,0,0,0.06)";
  const pillH = chipFont * 1.1 + chipPadY * 2;
  // Arrondi : `radius` 0..1 (défaut 0.56 pour les pastilles carrées, 1 = pilule pleine).
  const boxR = (r?: number) => Math.round((r ?? 0.56) * (iconBox / 2));
  const pillR = (r?: number) => Math.round((r ?? 1) * (pillH / 2));

  const renderLayer = (layer: AssetLayer) => {
    switch (layer.type) {
      case "icon": {
        // Image/logo custom : la pastille garde une HAUTEUR fixe (= iconBox) mais
        // sa LARGEUR s'adapte au ratio de l'image (logo large → boîte large, pas
        // une pastille carrée avec du vide sur les côtés).
        if (layer.imageSrc) {
          const padX = Math.round(iconBox * 0.2);
          const glyphH = Math.round(iconBox * 0.6);
          return (
            <div
              style={{
                height: iconBox,
                borderRadius: boxR(layer.radius),
                background: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: `0 ${padX}px`,
                boxSizing: "border-box",
                boxShadow: chipShadow,
                border: chipBorder,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={layer.imageSrc} alt="" style={{ height: glyphH, width: "auto", objectFit: "contain", display: "block" }} />
            </div>
          );
        }
        const Icon = ICON_RECORD[layer.iconName ?? "Briefcase"] ?? Briefcase;
        return (
          <div
            style={{
              width: iconBox,
              height: iconBox,
              borderRadius: boxR(layer.radius),
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: chipShadow,
              border: chipBorder,
            }}
          >
            {layer.iconEmoji ? (
              <span style={{ fontSize: iconBox * 0.58, lineHeight: 1 }}>{layer.iconEmoji}</span>
            ) : (
              <Icon style={{ width: iconBox * 0.54, height: iconBox * 0.54, color: layer.iconColor ?? accent }} strokeWidth={2} />
            )}
          </div>
        );
      }
      case "logo":
        return agencyLogo ? (
          <img
            src={agencyLogo}
            alt="TEAPS"
            style={{ height: Math.round(w * 0.05), maxWidth: w * 0.3, objectFit: "contain", filter: "brightness(0)" }}
          />
        ) : null;
      case "pill": {
        const PillIcon = layer.iconName ? ICON_RECORD[layer.iconName] ?? Briefcase : null;
        // Glyphe : emoji custom → icône Lucide custom → rien.
        const rawGlyph = layer.iconEmoji ? (
          <span style={{ fontSize: chipFont * 1.1, lineHeight: 1, flexShrink: 0 }}>{layer.iconEmoji}</span>
        ) : PillIcon ? (
          <PillIcon style={{ width: chipFont * 1.15, height: chipFont * 1.15, color: accent, flexShrink: 0 }} strokeWidth={2.4} />
        ) : null;
        // En aperçu, le glyphe est cliquable → ouvre le picker de glyphe.
        const glyph =
          rawGlyph && interactive && onEditGlyph ? (
            <span
              onClick={(e) => { e.stopPropagation(); onEditGlyph(layer.id); }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Changer le glyphe"
              style={{ display: "inline-flex", cursor: "pointer", flexShrink: 0 }}
            >
              {rawGlyph}
            </span>
          ) : (
            rawGlyph
          );
        const textStyle: React.CSSProperties = { fontWeight: 700, fontSize: `${chipFont}px`, color: "#111", lineHeight: 1.1 };
        return (
          <div
            style={{
              display: "flex",
              flexDirection: layer.iconRight ? "row-reverse" : "row",
              alignItems: "center",
              gap: glyph ? Math.round(w * 0.013) : 0,
              background: "#fff",
              borderRadius: pillR(layer.radius),
              padding: `${chipPadY}px ${chipPadX}px`,
              boxShadow: chipShadow,
              border: chipBorder,
              whiteSpace: "nowrap",
            }}
          >
            {glyph}
            {interactive && onEditText ? (
              <EditableLayerText value={layer.text ?? ""} onCommit={(t) => onEditText(layer.id, t)} style={textStyle} />
            ) : (
              <span style={textStyle}>{layer.text}</span>
            )}
          </div>
        );
      }
      case "badge":
        return (
          <div
            style={{
              background: accent,
              color: "#fff",
              borderRadius: pillR(layer.radius),
              padding: `${chipPadY}px ${chipPadX}px`,
              fontWeight: 700,
              fontSize: `${chipFont}px`,
              boxShadow: chipShadow,
              whiteSpace: "nowrap",
            }}
          >
            {interactive && onEditText ? (
              <EditableLayerText value={layer.text ?? ""} onCommit={(t) => onEditText(layer.id, t)} style={{ color: "#fff" }} />
            ) : (
              layer.text
            )}
          </div>
        );
      case "brand": {
        const brand = layer.brandSlug ? BRAND_MAP[layer.brandSlug] : null;
        if (!brand) return null;
        // Logo seul → pastille carrée (comme l'icône).
        if (layer.hideLabel) {
          return (
            <div
              style={{
                width: iconBox,
                height: iconBox,
                borderRadius: boxR(layer.radius),
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: chipShadow,
                border: chipBorder,
              }}
            >
              <svg width={iconBox * 0.56} height={iconBox * 0.56} viewBox="0 0 24 24" fill={`#${brand.hex}`} style={{ display: "block" }}>
                <path d={brand.path} />
              </svg>
            </div>
          );
        }
        // Logo + nom → pilule.
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: Math.round(w * 0.012),
              background: "#fff",
              borderRadius: pillR(layer.radius),
              padding: `${chipPadY}px ${chipPadX}px`,
              boxShadow: chipShadow,
              border: chipBorder,
              whiteSpace: "nowrap",
            }}
          >
            <svg
              width={Math.round(w * 0.026)}
              height={Math.round(w * 0.026)}
              viewBox="0 0 24 24"
              fill={`#${brand.hex}`}
              style={{ display: "block", flexShrink: 0 }}
            >
              <path d={brand.path} />
            </svg>
            <span style={{ fontWeight: 700, fontSize: `${chipFont}px`, color: "#111", lineHeight: 1 }}>{brand.title}</span>
          </div>
        );
      }
    }
  };

  const imgW = Math.round(w * asset.imageScale);
  const imgH = Math.round(h * asset.imageScale);
  const ctrl = Math.round(w * 0.032);

  return (
    <div
      ref={rootRef}
      id={id}
      style={{
        position: "relative",
        width: `${w}px`,
        height: `${h}px`,
        overflow: "hidden",
        borderRadius: 0,
        background: "transparent",
        fontFamily: "Satoshi, sans-serif",
      }}
    >
      {/* Image flottante centrée + overlay bleu TEAPS */}
      <div
        onClick={interactive ? onImageClick : undefined}
        onMouseEnter={interactive ? () => setImgHover(true) : undefined}
        onMouseLeave={interactive ? () => setImgHover(false) : undefined}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: `${imgW}px`,
          height: `${imgH}px`,
          borderRadius: Math.round(w * 0.022),
          overflow: "hidden",
          background: "#0b1220",
          boxShadow: "0 30px 60px -18px rgba(15,20,60,0.35)",
          cursor: interactive ? "pointer" : "default",
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #1b2a4a, #0b1220)",
              color: "rgba(255,255,255,0.5)",
              fontSize: `${Math.round(w * 0.02)}px`,
              fontWeight: 600,
            }}
          >
            Aucune image
          </div>
        )}
        {/* Overlay bleu TEAPS */}
        <div style={{ position: "absolute", inset: 0, background: accent, opacity: asset.veil }} />

        {/* Survol : changer l'image (comme les cas clients) */}
        {interactive && (
          <div
            data-editor-only=""
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: `${Math.round(w * 0.01)}px`,
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              opacity: imgHover ? 1 : 0,
              transition: "opacity 160ms ease",
              pointerEvents: "none",
            }}
          >
            <ImagePlus style={{ width: Math.round(w * 0.05), height: Math.round(w * 0.05) }} strokeWidth={1.5} />
            <span style={{ fontWeight: 600, fontSize: `${Math.round(w * 0.02)}px`, letterSpacing: "0.02em" }}>
              {photo ? "Changer l'image" : "Ajouter une image"}
            </span>
          </div>
        )}
      </div>

      {/* Calques flottants */}
      {asset.layers.map((layer) => {
        const showControls = interactive && (hoveredId === layer.id || draggingId === layer.id);
        // Corps cliquable → ouvre le picker, uniquement pour icône/logo (les
        // autres calques s'éditent depuis la liste). Pas de conflit avec le
        // drag : celui-ci passe par la poignée, jamais par le corps.
        const clickToEdit =
          interactive && !!onEditLayer && (layer.type === "icon" || layer.type === "brand");
        return (
          <div
            key={layer.id}
            onMouseEnter={interactive ? () => setHoveredId(layer.id) : undefined}
            onMouseLeave={interactive ? () => setHoveredId((k) => (k === layer.id ? null : k)) : undefined}
            style={{
              position: "absolute",
              left: `${layer.x * 100}%`,
              top: `${layer.y * 100}%`,
              transform: "translate(-50%, -50%)",
              zIndex: draggingId === layer.id ? 30 : 20,
            }}
          >
            <div
              onClick={clickToEdit ? () => onEditLayer!(layer.id) : undefined}
              style={{
                cursor: clickToEdit ? "pointer" : undefined,
                transition: "transform 160ms ease, filter 160ms ease",
                transform: clickToEdit && hoveredId === layer.id ? "scale(1.05)" : "scale(1)",
                filter:
                  clickToEdit && hoveredId === layer.id
                    ? "drop-shadow(0 8px 18px rgba(15,20,60,0.22))"
                    : "drop-shadow(0 0 0 rgba(15,20,60,0))",
              }}
              title={clickToEdit ? "Changer l'icône / le logo" : undefined}
            >
              {renderLayer(layer)}
            </div>

            {/* Poignée de déplacement */}
            {interactive && onMoveLayer && (
              <button
                type="button"
                data-editor-only=""
                onPointerDown={(e) => onHandleDown(e, layer)}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                title="Glisser pour déplacer"
                style={{
                  position: "absolute",
                  top: `-${Math.round(w * 0.016)}px`,
                  left: `-${Math.round(w * 0.016)}px`,
                  width: ctrl,
                  height: ctrl,
                  borderRadius: "50%",
                  background: accent,
                  color: "#fff",
                  border: "none",
                  cursor: draggingId === layer.id ? "grabbing" : "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  touchAction: "none",
                  opacity: showControls ? 1 : 0,
                  transition: "opacity 120ms ease",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                }}
              >
                <GripVertical style={{ width: Math.round(w * 0.02), height: Math.round(w * 0.02) }} strokeWidth={2.5} />
              </button>
            )}

            {/* Retirer */}
            {interactive && onRemoveLayer && (
              <button
                type="button"
                data-editor-only=""
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveLayer(layer.id);
                }}
                title="Retirer"
                style={{
                  position: "absolute",
                  top: `-${Math.round(w * 0.016)}px`,
                  right: `-${Math.round(w * 0.016)}px`,
                  width: ctrl,
                  height: ctrl,
                  borderRadius: "50%",
                  background: "rgba(17,17,17,0.85)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  opacity: showControls ? 1 : 0,
                  transition: "opacity 120ms ease",
                }}
              >
                <X style={{ width: Math.round(w * 0.018), height: Math.round(w * 0.018) }} strokeWidth={2.5} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
