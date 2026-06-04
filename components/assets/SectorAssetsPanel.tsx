"use client";

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, FolderDown, Tag } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { FrameSectorAsset } from "@/components/frames/FrameSectorAsset";
import { SectorAssetEditor } from "./SectorAssetEditor";
import { deriveTheme } from "@/lib/sectorThemes";
import { exportSectorAssetsPack, sectorAssetExportId } from "@/lib/exportFrames";

/**
 * Onglet « Assets secteur » : illustrations thématiques (hero + contenu) d'une
 * page SEO TEAPS. Photo de banque d'images + habillage DA TEAPS, exportées en PNG
 * plat pour Elementor. Le thème est déduit de l'URL scrapée.
 */
export function SectorAssetsPanel() {
  const sectorAssets = useDAStore((s) => s.sectorAssets);
  const addSectorAsset = useDAStore((s) => s.addSectorAsset);
  const scrapeResult = useDAStore((s) => s.scrapeResult);
  const exportScale = useDAStore((s) => s.exportScale);
  const [exporting, setExporting] = useState(false);

  const theme = useMemo(() => deriveTheme(scrapeResult?.siteUrl), [scrapeResult?.siteUrl]);

  const handleExportPack = async () => {
    if (!scrapeResult || sectorAssets.length === 0) return;
    setExporting(true);
    try {
      await exportSectorAssetsPack(scrapeResult.domain, sectorAssets, exportScale);
      toast.success("Pack d'assets téléchargé !");
    } catch {
      toast.error("Erreur lors de l'export du pack");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="px-8 py-10 max-w-3xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <h1
            className="text-[22px] font-bold tracking-tight leading-none"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
          >
            Assets secteur
          </h1>
          <div className="flex items-center gap-1.5 text-[11px] text-foreground/45">
            <Tag className="w-3 h-3" />
            <span>
              Thème déduit : <span className="font-semibold text-foreground/70">{theme.label}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => addSectorAsset("content")}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-all active:scale-[0.97]"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter un asset
          </button>
          <button
            onClick={handleExportPack}
            disabled={exporting || sectorAssets.length === 0}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer disabled:opacity-30 transition-all hover:opacity-70 active:scale-[0.97]"
          >
            {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderDown className="w-3 h-3" />}
            <span>{exporting ? "Export..." : "Exporter le pack"}</span>
          </button>
        </div>
      </div>

      {/* Liste d'éditeurs */}
      {sectorAssets.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-16 flex flex-col items-center gap-3 text-foreground/40">
          <span className="text-[12px]">Aucun asset pour ce projet.</span>
          <button
            onClick={() => addSectorAsset("hero")}
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Créer un premier asset
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {sectorAssets.map((asset) => (
            <SectorAssetEditor key={asset.id} asset={asset} />
          ))}
        </div>
      )}

      {/* Instances offscreen pour l'export (taille native) */}
      <div className="frames-offscreen">
        {sectorAssets.map((asset) => (
          <FrameSectorAsset key={asset.id} asset={asset} id={sectorAssetExportId(asset.id)} />
        ))}
      </div>
    </div>
  );
}
