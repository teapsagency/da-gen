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
import { ASSET_DIMS, ASSET_RATIOS, DEFAULT_ELEMENT_POS } from "@/lib/sectorThemes";
import type { AssetElementKey, AssetRatio, SectorAsset } from "@/types";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const ELEMENT_ORDER: AssetElementKey[] = ["icon", "brand", "pill", "badge", "logo"];
const ELEMENT_LABEL: Record<AssetElementKey, string> = {
  icon: "Icône",
  brand: "Logo techno",
  pill: "Pilule",
  badge: "Badge",
  logo: "Logo TEAPS",
};

export function SectorAssetEditor({ asset, clientName = "teaps" }: { asset: SectorAsset; clientName?: string }) {
  const updateAsset = useDAStore((s) => s.updateAgencyAsset);
  const removeAgencyAsset = useDAStore((s) => s.removeAgencyAsset);
  const exportScale = useDAStore((s) => s.exportScale);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { w, h } = ASSET_DIMS[asset.ratio];
  const brand = asset.brandSlug ? BRAND_MAP[asset.brandSlug] : null;
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

  // ─── Éléments ───
  const present = ELEMENT_ORDER.filter((k) => asset.elements[k]);
  const addable = ELEMENT_ORDER.filter((k) => !asset.elements[k]);

  const moveElement = useCallback(
    (key: AssetElementKey, x: number, y: number) =>
      updateAsset(asset.id, { elements: { ...asset.elements, [key]: { x, y } } }),
    [asset.id, asset.elements, updateAsset],
  );
  const removeElement = useCallback(
    (key: AssetElementKey) => {
      const next = { ...asset.elements };
      delete next[key];
      const patch: Partial<SectorAsset> = { elements: next };
      if (key === "brand") patch.brandSlug = undefined;
      updateAsset(asset.id, patch);
    },
    [asset.id, asset.elements, updateAsset],
  );
  const addElement = (key: AssetElementKey) => {
    setAddOpen(false);
    if (key === "brand") {
      setBrandOpen(true);
      return;
    }
    updateAsset(asset.id, { elements: { ...asset.elements, [key]: DEFAULT_ELEMENT_POS[key] } });
  };
  const pickBrand = (slug: string | null) => {
    setBrandOpen(false);
    if (slug) {
      updateAsset(asset.id, {
        brandSlug: slug,
        elements: { ...asset.elements, brand: asset.elements.brand ?? DEFAULT_ELEMENT_POS.brand },
      });
    } else {
      removeElement("brand");
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

      {/* Aperçu (image cliquable + éléments déplaçables) */}
      <div className="p-4 bg-foreground/[0.03]">
        <div
          ref={previewRef}
          className="relative w-full overflow-hidden shadow-xl shadow-black/[0.06]"
          style={{ aspectRatio: `${w} / ${h}` }}
        >
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
              onMoveElement={moveElement}
              onRemoveElement={removeElement}
              onImageClick={() => setPickerOpen(true)}
            />
          </div>
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>
        <p className="text-[10px] text-foreground/35 mt-2 text-center">
          Clique l&apos;image pour la changer · glisse les éléments pour les placer
        </p>
      </div>

      {/* Contrôles */}
      <div className="px-4 py-3 flex flex-col gap-3 border-t border-border">
        {/* Image : changer + taille */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPickerOpen(true)}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md cursor-pointer hover:opacity-70 transition-all flex items-center gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5" /> Image de fond
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-[180px] text-[10px] font-bold text-foreground/40">
            <span className="whitespace-nowrap">Taille</span>
            <input
              type="range"
              min={0.4}
              max={0.9}
              step={0.02}
              value={asset.imageScale}
              onChange={(e) => updateAsset(asset.id, { imageScale: Number(e.target.value) })}
              className="flex-1 accent-foreground cursor-pointer"
            />
            <EditableValue
              value={asset.imageScale}
              min={0.4}
              max={0.9}
              step={0.02}
              onChange={(v) => updateAsset(asset.id, { imageScale: v })}
              format={percentFormat}
              parse={percentParse}
              inputWidth={42}
            />
          </div>
        </div>

        {/* Éléments : liste + ajouter */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/40">Éléments</span>
            <div className="relative">
              <button
                onClick={() => setAddOpen((v) => !v)}
                disabled={addable.length === 0}
                className="text-[11px] font-bold border border-border bg-card px-2.5 py-1 rounded-md cursor-pointer hover:opacity-70 disabled:opacity-30 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
              {addOpen && addable.length > 0 && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[150px]">
                  {addable.map((k) => (
                    <button
                      key={k}
                      onClick={() => addElement(k)}
                      className="w-full text-left text-[12px] px-3 py-1.5 hover:bg-foreground/[0.06] cursor-pointer"
                    >
                      {ELEMENT_LABEL[k]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {present.length === 0 ? (
            <p className="text-[11px] text-foreground/35 py-1">Aucun élément — ajoute-en un.</p>
          ) : (
            present.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-foreground/40 w-[78px] shrink-0">
                  {ELEMENT_LABEL[key]}
                </span>
                {key === "icon" && (
                  <button
                    onClick={() => setIconOpen(true)}
                    className="text-[11px] font-semibold border border-border bg-card px-2.5 py-1 rounded-md cursor-pointer hover:opacity-70 transition-all flex items-center gap-1.5"
                  >
                    {asset.iconEmoji ? (
                      <span className="text-[15px] leading-none">{asset.iconEmoji}</span>
                    ) : (
                      <Shapes className="w-3.5 h-3.5" />
                    )}
                    Choisir
                  </button>
                )}
                {key === "brand" && (
                  <button
                    onClick={() => setBrandOpen(true)}
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
                {key === "pill" && (
                  <input
                    value={asset.pill}
                    onChange={(e) => updateAsset(asset.id, { pill: e.target.value })}
                    placeholder="Texte de la pilule"
                    className="flex-1 text-[12px] border border-border bg-background rounded-md px-3 py-1.5 outline-none placeholder:text-foreground/30"
                  />
                )}
                {key === "badge" && (
                  <input
                    value={asset.badge}
                    onChange={(e) => updateAsset(asset.id, { badge: e.target.value })}
                    placeholder="Texte du badge"
                    className="flex-1 text-[12px] border border-border bg-background rounded-md px-3 py-1.5 outline-none placeholder:text-foreground/30"
                  />
                )}
                {key === "logo" && <span className="flex-1 text-[11px] text-foreground/30">Logo de l&apos;agence</span>}
                <button
                  onClick={() => removeElement(key)}
                  className="ml-auto text-foreground/30 hover:text-red-500 cursor-pointer transition-colors shrink-0"
                  title="Retirer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
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
        key={iconOpen ? "icon-open" : "icon-closed"}
        open={iconOpen}
        value={{ iconName: asset.iconName, iconEmoji: asset.iconEmoji }}
        onClose={() => setIconOpen(false)}
        onPick={(sel) => {
          if (sel.iconName) updateAsset(asset.id, { iconName: sel.iconName, iconEmoji: undefined });
          else if (sel.iconEmoji) updateAsset(asset.id, { iconEmoji: sel.iconEmoji });
          setIconOpen(false);
        }}
      />

      <BrandPickerModal
        key={brandOpen ? "brand-open" : "brand-closed"}
        open={brandOpen}
        value={asset.brandSlug}
        onClose={() => setBrandOpen(false)}
        onPick={pickBrand}
      />
    </div>
  );
}
