import React, { useRef, useState } from "react";
import { icons, Briefcase, X, type LucideIcon } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { ASSET_DIMS, TEAPS_ACCENT } from "@/lib/sectorThemes";
import { BRAND_MAP } from "@/lib/brandLogos";
import type { AssetElementKey, SectorAsset } from "@/types";

const ICON_RECORD = icons as unknown as Record<string, LucideIcon>;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

type Props = {
  asset: SectorAsset;
  id?: string;
  // Handlers d'édition (aperçu uniquement ; absents sur l'instance d'export).
  onMoveElement?: (key: AssetElementKey, x: number, y: number) => void;
  onRemoveElement?: (key: AssetElementKey) => void;
  onImageClick?: () => void;
};

/**
 * Template d'asset secteur : une image flottante (plus petite que la card) sur
 * fond clair, entourée d'éléments (icône, logo TEAPS, pilule, badge, logo techno)
 * positionnés librement et **déplaçables à la souris** en aperçu. Conteneur PLAT.
 */
export const FrameSectorAsset = ({ asset, id, onMoveElement, onRemoveElement, onImageClick }: Props) => {
  const agencyLogo = useDAStore((s) => s.agencyLogo);
  const accent = TEAPS_ACCENT;
  const interactive = !id;

  const { w, h } = ASSET_DIMS[asset.ratio];
  const Icon = ICON_RECORD[asset.iconName] ?? Briefcase;
  const brand = asset.brandSlug ? BRAND_MAP[asset.brandSlug] : null;
  const photo = asset.photo.kind !== "none" ? asset.photo.dataUrl : null;

  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ key: AssetElementKey; offX: number; offY: number; rect: DOMRect } | null>(null);
  const [draggingKey, setDraggingKey] = useState<AssetElementKey | null>(null);

  const onPointerDown = (e: React.PointerEvent, key: AssetElementKey) => {
    if (!onMoveElement || !rootRef.current) return;
    e.stopPropagation();
    const rect = rootRef.current.getBoundingClientRect();
    const pos = asset.elements[key]!;
    const cx = rect.left + pos.x * rect.width;
    const cy = rect.top + pos.y * rect.height;
    dragRef.current = { key, offX: e.clientX - cx, offY: e.clientY - cy, rect };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDraggingKey(key);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const nx = clamp01((e.clientX - d.offX - d.rect.left) / d.rect.width);
    const ny = clamp01((e.clientY - d.offY - d.rect.top) / d.rect.height);
    onMoveElement?.(d.key, nx, ny);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDraggingKey(null);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // ─── Visuels par élément ───
  const iconBox = Math.round(w * 0.085);
  const chipPadY = Math.round(w * 0.012);
  const chipPadX = Math.round(w * 0.022);
  const chipFont = Math.round(w * 0.019);
  const chipShadow = "0 10px 28px rgba(0,0,0,0.14)";
  const chipBorder = "1px solid rgba(0,0,0,0.06)";

  const renderContent = (key: AssetElementKey) => {
    switch (key) {
      case "icon":
        return (
          <div
            style={{
              width: iconBox,
              height: iconBox,
              borderRadius: Math.round(iconBox * 0.28),
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: chipShadow,
              border: chipBorder,
            }}
          >
            {asset.iconEmoji ? (
              <span style={{ fontSize: iconBox * 0.58, lineHeight: 1 }}>{asset.iconEmoji}</span>
            ) : (
              <Icon style={{ width: iconBox * 0.54, height: iconBox * 0.54, color: accent }} strokeWidth={2} />
            )}
          </div>
        );
      case "logo":
        return agencyLogo ? (
          <img
            src={agencyLogo}
            alt="TEAPS"
            style={{ height: Math.round(w * 0.05), maxWidth: w * 0.3, objectFit: "contain", filter: "brightness(0)" }}
          />
        ) : null;
      case "pill":
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: Math.round(w * 0.013),
              background: "#fff",
              borderRadius: 9999,
              padding: `${chipPadY}px ${chipPadX}px`,
              boxShadow: chipShadow,
              border: chipBorder,
              whiteSpace: "nowrap",
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
            <span style={{ fontWeight: 700, fontSize: `${chipFont}px`, color: "#111", lineHeight: 1.1 }}>
              {asset.pill}
            </span>
          </div>
        );
      case "badge":
        return (
          <div
            style={{
              background: accent,
              color: "#fff",
              borderRadius: 9999,
              padding: `${chipPadY}px ${chipPadX}px`,
              fontWeight: 700,
              fontSize: `${chipFont}px`,
              boxShadow: chipShadow,
              whiteSpace: "nowrap",
            }}
          >
            {asset.badge}
          </div>
        );
      case "brand":
        return brand ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: Math.round(w * 0.012),
              background: "#fff",
              borderRadius: 9999,
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
            <span style={{ fontWeight: 700, fontSize: `${chipFont}px`, color: "#111", lineHeight: 1 }}>
              {brand.title}
            </span>
          </div>
        ) : null;
    }
  };

  const imgW = Math.round(w * asset.imageScale);
  const imgH = Math.round(h * asset.imageScale);

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
        background: "linear-gradient(135deg, #FFFFFF 0%, #EEF0FF 100%)",
        fontFamily: "Satoshi, sans-serif",
      }}
    >
      {/* Image flottante centrée */}
      <div
        onClick={interactive ? onImageClick : undefined}
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
      </div>

      {/* Éléments flottants */}
      {(Object.keys(asset.elements) as AssetElementKey[]).map((key) => {
        const pos = asset.elements[key];
        if (!pos) return null;
        return (
          <div
            key={key}
            onPointerDown={interactive ? (e) => onPointerDown(e, key) : undefined}
            onPointerMove={interactive ? onPointerMove : undefined}
            onPointerUp={interactive ? onPointerUp : undefined}
            style={{
              position: "absolute",
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
              transform: "translate(-50%, -50%)",
              cursor: interactive ? (draggingKey === key ? "grabbing" : "grab") : "default",
              touchAction: "none",
              zIndex: draggingKey === key ? 30 : 20,
            }}
          >
            {renderContent(key)}
            {interactive && onRemoveElement && (
              <button
                type="button"
                data-editor-only=""
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveElement(key);
                }}
                title="Retirer"
                style={{
                  position: "absolute",
                  top: `-${Math.round(w * 0.018)}px`,
                  right: `-${Math.round(w * 0.018)}px`,
                  width: Math.round(w * 0.032),
                  height: Math.round(w * 0.032),
                  borderRadius: "50%",
                  background: "rgba(17,17,17,0.85)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
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
