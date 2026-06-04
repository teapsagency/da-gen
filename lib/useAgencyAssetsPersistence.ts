"use client";

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useDAStore } from '@/store/daStore';
import type { SectorAsset } from '@/types';
import { loadAgencyAssets, saveAgencyAssets } from './projectStorage';

const SAVE_DEBOUNCE_MS = 800;

/**
 * Hydrate la bibliothèque d'illustrations « site agence » depuis IndexedDB au
 * montage, puis la re-sauvegarde (debouncée) à chaque changement. Indépendante
 * des projets clients : c'est un record global unique.
 */
export function useAgencyAssetsPersistence() {
  useEffect(() => {
    let cancelled = false;
    let hydrated = false;
    let saveTimer: number | undefined;
    let lastSaved: SectorAsset[] | null = null;
    let quotaWarned = false;

    (async () => {
      const stored = await loadAgencyAssets();
      if (cancelled) return;
      if (stored.length) useDAStore.getState().setAgencyAssets(stored);
      lastSaved = useDAStore.getState().agencyAssets;
      hydrated = true;
    })();

    const unsubscribe = useDAStore.subscribe((state) => {
      if (!hydrated) return;
      if (state.agencyAssets === lastSaved) return; // référence inchangée = pas de modif

      const snapshot = state.agencyAssets;
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(async () => {
        const ok = await saveAgencyAssets(snapshot);
        if (ok) {
          lastSaved = snapshot;
          quotaWarned = false;
        } else if (!quotaWarned) {
          quotaWarned = true;
          toast.error("Sauvegarde des assets agence impossible : stockage saturé.");
        }
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(saveTimer);
      unsubscribe();
    };
  }, []);
}
