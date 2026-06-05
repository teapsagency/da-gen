"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2, FolderDown, Images } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { FrameSectorAsset } from "@/components/frames/FrameSectorAsset";
import { SectorAssetEditor } from "./SectorAssetEditor";
import { exportSectorAssetsPack, sectorAssetExportId, defaultAssetName } from "@/lib/exportFrames";

const CLIENT_NAME = "teaps";

/**
 * Module « Assets site agence » : bibliothèque autonome d'illustrations
 * thématiques pour les pages du site TEAPS (DA TEAPS figée, pas de scrape).
 * Persistée globalement en IndexedDB (voir useAgencyAssetsPersistence).
 */
export function AgencyAssetsPage() {
  const agencyAssets = useDAStore((s) => s.agencyAssets);
  const addAgencyAsset = useDAStore((s) => s.addAgencyAsset);
  const exportScale = useDAStore((s) => s.exportScale);
  const [exporting, setExporting] = useState(false);

  // Noms par défaut numérotés par rôle (illustration-1, hero-1, …) — alignés sur
  // la numérotation de l'export pack.
  const roleCounts: Record<string, number> = {};
  const defaultNames = agencyAssets.map((a) => {
    roleCounts[a.role] = (roleCounts[a.role] ?? 0) + 1;
    return defaultAssetName(a.role, roleCounts[a.role]);
  });

  const handleExportPack = async () => {
    if (agencyAssets.length === 0) return;
    setExporting(true);
    try {
      await exportSectorAssetsPack(CLIENT_NAME, agencyAssets, exportScale);
      toast.success("Pack d'illustrations téléchargé !");
    } catch {
      toast.error("Erreur lors de l'export du pack");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="min-h-screen pl-20 py-12 px-8 bg-background">
      <div className="max-w-3xl mx-auto">
        {/* En-tête */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1
              className="text-[28px] font-bold tracking-tight leading-none"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}
            >
              Assets site agence
            </h1>
            <p className="text-[12.5px] text-foreground/50 mt-2 leading-relaxed max-w-md">
              Illustrations thématiques pour les pages du site TEAPS — photo de banque
              d&apos;images + DA TEAPS. Bibliothèque sauvegardée dans ce navigateur.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => addAgencyAsset("content")}
              className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-all active:scale-[0.97]"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter une illustration
            </button>
            <button
              onClick={handleExportPack}
              disabled={exporting || agencyAssets.length === 0}
              className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer disabled:opacity-30 transition-all hover:opacity-70 active:scale-[0.97]"
            >
              {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderDown className="w-3 h-3" />}
              <span>{exporting ? "Export..." : "Exporter le pack"}</span>
            </button>
          </div>
        </div>

        {/* Liste / état vide */}
        {agencyAssets.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-20 flex flex-col items-center gap-3 text-foreground/40">
            <Images className="w-7 h-7" />
            <span className="text-[12.5px]">Aucune illustration pour l&apos;instant.</span>
            <button
              onClick={() => addAgencyAsset("hero")}
              className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Créer une première illustration
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {agencyAssets.map((asset, i) => (
              <SectorAssetEditor key={asset.id} asset={asset} defaultName={defaultNames[i]} />
            ))}
          </div>
        )}

        {/* Instances offscreen pour l'export (taille native) */}
        <div className="frames-offscreen">
          {agencyAssets.map((asset) => (
            <FrameSectorAsset key={asset.id} asset={asset} id={sectorAssetExportId(asset.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}
