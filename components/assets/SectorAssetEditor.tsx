"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, ImagePlus, Loader2, Search, Trash2, Shapes } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { FrameSectorAsset } from "@/components/frames/FrameSectorAsset";
import { StockPickerModal } from "./StockPickerModal";
import { IconPickerModal } from "./IconPickerModal";
import { EditableValue, percentFormat, percentParse } from "@/components/ui/EditableValue";
import { searchStock, stockToDataUrl, StockUnavailableError, type StockPhoto } from "@/lib/stock";
import { exportSectorAsset } from "@/lib/exportFrames";
import { ASSET_DIMS, ASSET_RATIOS } from "@/lib/sectorThemes";
import type { AssetRatio, SectorAsset } from "@/types";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

type SlotKey = "icon" | "logo" | "pill" | "badge";
const SLOT_LABELS: { key: SlotKey; label: string }[] = [
  { key: "icon", label: "Icône" },
  { key: "logo", label: "Logo" },
  { key: "pill", label: "Pilule" },
  { key: "badge", label: "Badge" },
];

export function SectorAssetEditor({ asset, clientName = "teaps" }: { asset: SectorAsset; clientName?: string }) {
  const updateSectorAsset = useDAStore((s) => s.updateAgencyAsset);
  const removeSectorAsset = useDAStore((s) => s.removeAgencyAsset);
  const exportScale = useDAStore((s) => s.exportScale);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { w, h } = ASSET_DIMS[asset.ratio];

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

  const applyStockPhoto = useCallback(
    async (photo: StockPhoto) => {
      setBusy(true);
      try {
        const dataUrl = await stockToDataUrl(photo.src);
        updateSectorAsset(asset.id, {
          photo: { kind: "stock", dataUrl, alt: photo.alt, photographer: photo.photographer },
        });
      } catch {
        toast.error("Image impossible à charger.");
      } finally {
        setBusy(false);
      }
    },
    [asset.id, updateSectorAsset],
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

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
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
        updateSectorAsset(asset.id, { photo: { kind: "upload", dataUrl: reader.result } });
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

  const hasPhoto = asset.photo.kind !== "none";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* En-tête */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-[11px] font-bold tracking-widest uppercase text-foreground/30">
          {asset.role === "hero" ? "Hero" : "Illustration"} · {asset.ratio}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || !hasPhoto}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer disabled:opacity-30 transition-all hover:opacity-70 active:scale-[0.97]"
          >
            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            <span>{exporting ? "Export..." : "Export PNG"}</span>
          </button>
          <button
            onClick={() => removeSectorAsset(asset.id)}
            className="text-foreground/30 hover:text-red-500 cursor-pointer transition-colors"
            title="Supprimer cet asset"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Aperçu */}
      <div className="p-4 bg-foreground/[0.04]">
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
            <FrameSectorAsset asset={asset} />
          </div>
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Contrôles */}
      <div className="px-4 py-3 flex flex-col gap-3 border-t border-border">
        {/* Recherche / source */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 border border-border rounded-md px-3 py-1.5 bg-background">
            <Search className="w-3.5 h-3.5 text-foreground/40 shrink-0" />
            <input
              value={asset.query}
              onChange={(e) => updateSectorAsset(asset.id, { query: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && setPickerOpen(true)}
              placeholder="thème de la photo"
              className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-foreground/30"
            />
          </div>
          <button
            onClick={() => setPickerOpen(true)}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md cursor-pointer hover:opacity-70 transition-all whitespace-nowrap"
          >
            Banque d&apos;images
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md cursor-pointer hover:opacity-70 transition-all flex items-center gap-1.5 whitespace-nowrap"
            title="Importer une image"
          >
            <ImagePlus className="w-3.5 h-3.5" /> Importer
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </div>

        {/* Voile */}
        <div className="flex items-center gap-2 text-[10px] font-bold text-foreground/40">
          <span className="whitespace-nowrap">Voile</span>
          <input
            type="range"
            min={0}
            max={0.6}
            step={0.02}
            value={asset.veil}
            onChange={(e) => updateSectorAsset(asset.id, { veil: Number(e.target.value) })}
            className="flex-1 accent-foreground cursor-pointer"
          />
          <EditableValue
            value={asset.veil}
            min={0}
            max={0.6}
            step={0.02}
            onChange={(v) => updateSectorAsset(asset.id, { veil: v })}
            format={percentFormat}
            parse={percentParse}
            inputWidth={42}
          />
        </div>

        {/* Format + icône */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-foreground/40">Format</span>
            <select
              value={asset.ratio}
              onChange={(e) => updateSectorAsset(asset.id, { ratio: e.target.value as AssetRatio })}
              className="text-[11px] font-semibold border border-border bg-background rounded-md px-2 py-1 cursor-pointer outline-none"
            >
              {ASSET_RATIOS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setIconOpen(true)}
            className="text-[11px] font-semibold border border-border bg-card px-2.5 py-1 rounded-md cursor-pointer hover:opacity-70 transition-all flex items-center gap-1.5"
          >
            {asset.iconEmoji ? (
              <span className="text-[15px] leading-none">{asset.iconEmoji}</span>
            ) : (
              <Shapes className="w-3.5 h-3.5" />
            )}
            Icône
          </button>
        </div>

        {/* Libellés */}
        <div className="grid grid-cols-2 gap-2">
          <input
            value={asset.pill}
            onChange={(e) => updateSectorAsset(asset.id, { pill: e.target.value })}
            placeholder="Texte de la pilule"
            className="text-[12px] border border-border bg-background rounded-md px-3 py-1.5 outline-none placeholder:text-foreground/30"
          />
          <input
            value={asset.badge}
            onChange={(e) => updateSectorAsset(asset.id, { badge: e.target.value })}
            placeholder="Texte du badge"
            className="text-[12px] border border-border bg-background rounded-md px-3 py-1.5 outline-none placeholder:text-foreground/30"
          />
        </div>

        {/* Slots de coin */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-foreground/40 mr-1">Éléments</span>
          {SLOT_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() =>
                updateSectorAsset(asset.id, { slots: { ...asset.slots, [key]: !asset.slots[key] } })
              }
              className={`text-[10px] font-bold px-2.5 py-1 rounded-md border cursor-pointer transition-all ${
                asset.slots[key]
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-foreground/40 hover:text-foreground/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <StockPickerModal
        open={pickerOpen}
        initialQuery={asset.query}
        onClose={() => setPickerOpen(false)}
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
          // Lucide → on efface l'emoji ; emoji → on garde l'iconName en repli.
          if (sel.iconName) updateSectorAsset(asset.id, { iconName: sel.iconName, iconEmoji: undefined });
          else if (sel.iconEmoji) updateSectorAsset(asset.id, { iconEmoji: sel.iconEmoji });
          setIconOpen(false);
        }}
      />
    </div>
  );
}
