"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Trash2, Shapes, Plus, ImageIcon } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { FrameSectorAsset } from "@/components/frames/FrameSectorAsset";
import { StockPickerModal } from "./StockPickerModal";
import { IconPickerModal } from "./IconPickerModal";
import { BrandPickerModal } from "./BrandPickerModal";
import { BRAND_MAP } from "@/lib/brandLogos";
import { EditableValue, percentFormat, percentParse } from "@/components/ui/EditableValue";
import { searchStock, stockToDataUrl, StockUnavailableError, type StockPhoto } from "@/lib/stock";
import { exportSectorAsset } from "@/lib/exportFrames";
import { ASSET_DIMS, ASSET_RATIOS, makeLayer } from "@/lib/sectorThemes";
import type { AssetLayer, AssetLayerType, AssetRatio, SectorAsset } from "@/types";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const LAYER_TYPES: AssetLayerType[] = ["icon", "pill", "badge", "brand", "logo"];
const LAYER_LABEL: Record<AssetLayerType, string> = {
  icon: "Icône",
  pill: "Pilule",
  badge: "Badge",
  brand: "Logo techno",
  logo: "Logo TEAPS",
};

type BrandTarget = { mode: "new" } | { mode: "edit"; id: string };

export function SectorAssetEditor({ asset, clientName = "teaps" }: { asset: SectorAsset; clientName?: string }) {
  const updateAsset = useDAStore((s) => s.updateAgencyAsset);
  const removeAgencyAsset = useDAStore((s) => s.removeAgencyAsset);
  const exportScale = useDAStore((s) => s.exportScale);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [iconEditId, setIconEditId] = useState<string | null>(null);
  const [brandTarget, setBrandTarget] = useState<BrandTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { w, h } = ASSET_DIMS[asset.ratio];
  const hasPhoto = asset.photo.kind !== "none";

  // Aperçu : on scale la frame fixe (w×h) à la largeur du conteneur.
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const update = () => {
      if (previewRef.current) setScale(previewRef.current.offsetWidth / w);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [w]);

  // ─── Calques ───
  const moveLayer = useCallback(
    (lid: string, x: number, y: number) =>
      updateAsset(asset.id, { layers: asset.layers.map((l) => (l.id === lid ? { ...l, x, y } : l)) }),
    [asset.id, asset.layers, updateAsset],
  );
  const removeLayer = useCallback(
    (lid: string) => updateAsset(asset.id, { layers: asset.layers.filter((l) => l.id !== lid) }),
    [asset.id, asset.layers, updateAsset],
  );
  const updateLayer = (lid: string, patch: Partial<AssetLayer>) =>
    updateAsset(asset.id, { layers: asset.layers.map((l) => (l.id === lid ? { ...l, ...patch } : l)) });
  const addLayer = (type: AssetLayerType) => {
    setAddOpen(false);
    if (type === "brand") {
      setBrandTarget({ mode: "new" });
      return;
    }
    updateAsset(asset.id, { layers: [...asset.layers, makeLayer(type)] });
  };
  const onBrandPick = (slug: string | null) => {
    const target = brandTarget;
    setBrandTarget(null);
    if (!target) return;
    if (target.mode === "new") {
      if (slug) updateAsset(asset.id, { layers: [...asset.layers, { ...makeLayer("brand"), brandSlug: slug }] });
    } else {
      if (slug) updateLayer(target.id, { brandSlug: slug });
      else removeLayer(target.id);
    }
  };

  // ─── Image ───
  const applyStockPhoto = useCallback(
    async (photo: StockPhoto) => {
      setBusy(true);
      try {
        const dataUrl = await stockToDataUrl(photo.src);
        updateAsset(asset.id, {
          photo: { kind: "stock", dataUrl, alt: photo.alt, photographer: photo.photographer },
        });
      } catch {
        toast.error("Image impossible à charger.");
      } finally {
        setBusy(false);
      }
    },
    [asset.id, updateAsset],
  );

  // Remplissage auto : 1ʳᵉ photo du thème tant qu'aucune image n'est posée.
  const autoFilled = useRef(false);
  useEffect(() => {
    if (autoFilled.current) return;
    if (asset.photo.kind !== "none" || !asset.query.trim()) return;
    autoFilled.current = true;
    (async () => {
      setBusy(true);
      try {
        const results = await searchStock(asset.query);
        if (results[0]) await applyStockPhoto(results[0]);
      } catch (e) {
        if (e instanceof StockUnavailableError) {
          toast.error("Banque d'images indisponible — importe une image.", { id: "stock-unavailable" });
        }
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ingestUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Fichier non valide — choisissez une image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Image trop lourde (max 8 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateAsset(asset.id, { photo: { kind: "upload", dataUrl: reader.result } });
        toast.success("Image importée");
      }
    };
    reader.onerror = () => toast.error("Lecture du fichier impossible");
    reader.readAsDataURL(file);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSectorAsset(asset, clientName, exportScale);
      toast.success("Asset exporté !");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const iconLayer = iconEditId ? asset.layers.find((l) => l.id === iconEditId) : null;
  const brandEditSlug =
    brandTarget?.mode === "edit" ? asset.layers.find((l) => l.id === brandTarget.id)?.brandSlug : undefined;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* En-tête : rôle · format · export · supprimer */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <span className="text-[11px] font-bold tracking-widest uppercase text-foreground/30">
          {asset.role === "hero" ? "Hero" : "Illustration"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={asset.ratio}
            onChange={(e) => updateAsset(asset.id, { ratio: e.target.value as AssetRatio })}
            className="text-[11px] font-semibold border border-border bg-background rounded-md px-2 py-1 cursor-pointer outline-none"
            title="Format"
          >
            {ASSET_RATIOS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={exporting || !hasPhoto}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer disabled:opacity-30 transition-all hover:opacity-70 active:scale-[0.97]"
          >
            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            <span>{exporting ? "Export..." : "Export PNG"}</span>
          </button>
          <button
            onClick={() => removeAgencyAsset(asset.id)}
            className="text-foreground/30 hover:text-red-500 cursor-pointer transition-colors"
            title="Supprimer cet asset"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Aperçu (fond blanc en éditeur ; export transparent) */}
      <div className="p-4" style={{ background: "#fff" }}>
        <div ref={previewRef} className="relative w-full overflow-hidden" style={{ aspectRatio: `${w} / ${h}` }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${w}px`,
              height: `${h}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <FrameSectorAsset
              asset={asset}
              onMoveLayer={moveLayer}
              onRemoveLayer={removeLayer}
              onImageClick={() => setPickerOpen(true)}
            />
          </div>
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Paramètres (en bas) */}
      <div className="px-4 py-3 border-t border-border flex flex-col gap-4">
        {/* Image + Taille + Voile */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setPickerOpen(true)}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md cursor-pointer hover:opacity-70 transition-all flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5" /> Image de fond
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-[170px] text-[10px] font-bold text-foreground/40">
            <span className="w-9 shrink-0">Taille</span>
            <input
              type="range"
              min={0.4}
              max={0.9}
              step={0.02}
              value={asset.imageScale}
              onChange={(e) => updateAsset(asset.id, { imageScale: Number(e.target.value) })}
              className="flex-1 accent-foreground cursor-pointer"
            />
            <EditableValue value={asset.imageScale} min={0.4} max={0.9} step={0.02} onChange={(v) => updateAsset(asset.id, { imageScale: v })} format={percentFormat} parse={percentParse} inputWidth={38} />
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[170px] text-[10px] font-bold text-foreground/40">
            <span className="w-9 shrink-0">Voile</span>
            <input
              type="range"
              min={0}
              max={0.6}
              step={0.02}
              value={asset.veil}
              onChange={(e) => updateAsset(asset.id, { veil: Number(e.target.value) })}
              className="flex-1 accent-foreground cursor-pointer"
            />
            <EditableValue value={asset.veil} min={0} max={0.6} step={0.02} onChange={(v) => updateAsset(asset.id, { veil: v })} format={percentFormat} parse={percentParse} inputWidth={38} />
          </div>
        </div>

        {/* Calques : liste + ajouter (autant qu'on veut) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Calques</span>
            <div className="relative">
              <button
                onClick={() => setAddOpen((v) => !v)}
                className="text-[11px] font-bold border border-border bg-card px-2.5 py-1 rounded-md cursor-pointer hover:opacity-70 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
              {addOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[150px]">
                  {LAYER_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => addLayer(t)}
                      className="w-full text-left text-[12px] px-3 py-1.5 hover:bg-foreground/[0.06] cursor-pointer"
                    >
                      {LAYER_LABEL[t]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {asset.layers.length === 0 ? (
            <p className="text-[11px] text-foreground/35 py-1">Aucun calque — ajoute-en un.</p>
          ) : (
            asset.layers.map((layer) => {
              const brand = layer.brandSlug ? BRAND_MAP[layer.brandSlug] : null;
              return (
                <div key={layer.id} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-foreground/40 w-[78px] shrink-0">
                    {LAYER_LABEL[layer.type]}
                  </span>
                  {layer.type === "icon" && (
                    <button
                      onClick={() => setIconEditId(layer.id)}
                      className="text-[11px] font-semibold border border-border bg-card px-2.5 py-1 rounded-md cursor-pointer hover:opacity-70 transition-all flex items-center gap-1.5"
                    >
                      {layer.iconEmoji ? (
                        <span className="text-[15px] leading-none">{layer.iconEmoji}</span>
                      ) : (
                        <Shapes className="w-3.5 h-3.5" />
                      )}
                      Choisir
                    </button>
                  )}
                  {layer.type === "brand" && (
                    <button
                      onClick={() => setBrandTarget({ mode: "edit", id: layer.id })}
                      className="text-[11px] font-semibold border border-border bg-card px-2.5 py-1 rounded-md cursor-pointer hover:opacity-70 transition-all flex items-center gap-1.5"
                    >
                      {brand ? (
                        <svg width={14} height={14} viewBox="0 0 24 24" fill={`#${brand.hex}`} className="shrink-0">
                          <path d={brand.path} />
                        </svg>
                      ) : null}
                      {brand ? brand.title : "Choisir"}
                    </button>
                  )}
                  {layer.type === "pill" && (
                    <input
                      value={layer.text ?? ""}
                      onChange={(e) => updateLayer(layer.id, { text: e.target.value })}
                      placeholder="Texte de la pilule"
                      className="flex-1 text-[12px] border border-border bg-background rounded-md px-3 py-1.5 outline-none placeholder:text-foreground/30"
                    />
                  )}
                  {layer.type === "badge" && (
                    <input
                      value={layer.text ?? ""}
                      onChange={(e) => updateLayer(layer.id, { text: e.target.value })}
                      placeholder="Texte du badge"
                      className="flex-1 text-[12px] border border-border bg-background rounded-md px-3 py-1.5 outline-none placeholder:text-foreground/30"
                    />
                  )}
                  {layer.type === "logo" && <span className="flex-1 text-[11px] text-foreground/30">Logo de l&apos;agence</span>}
                  <button
                    onClick={() => removeLayer(layer.id)}
                    className="ml-auto text-foreground/30 hover:text-red-500 cursor-pointer transition-colors shrink-0"
                    title="Retirer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <StockPickerModal
        open={pickerOpen}
        initialQuery={asset.query}
        onClose={() => setPickerOpen(false)}
        onQueryChange={(q) => updateAsset(asset.id, { query: q })}
        onUpload={(file) => {
          setPickerOpen(false);
          ingestUpload(file);
        }}
        onPick={(p) => {
          setPickerOpen(false);
          applyStockPhoto(p);
        }}
      />

      <IconPickerModal
        key={`icon-${iconEditId ?? "closed"}`}
        open={!!iconEditId}
        value={{ iconName: iconLayer?.iconName ?? "Briefcase", iconEmoji: iconLayer?.iconEmoji }}
        onClose={() => setIconEditId(null)}
        onPick={(sel) => {
          if (iconEditId) {
            if (sel.iconName) updateLayer(iconEditId, { iconName: sel.iconName, iconEmoji: undefined });
            else if (sel.iconEmoji) updateLayer(iconEditId, { iconEmoji: sel.iconEmoji });
          }
          setIconEditId(null);
        }}
      />

      <BrandPickerModal
        key={`brand-${brandTarget ? (brandTarget.mode === "edit" ? brandTarget.id : "new") : "closed"}`}
        open={!!brandTarget}
        value={brandEditSlug}
        onClose={() => setBrandTarget(null)}
        onPick={onBrandPick}
      />
    </div>
  );
}
