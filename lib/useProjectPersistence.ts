"use client";

import { useEffect } from 'react';
import { useDAStore } from '@/store/daStore';
import { loadProject, saveProject, type ProjectSnapshot } from './projectStorage';

const SAVE_DEBOUNCE_MS = 800;

/**
 * Hydrates project data (scrapeResult + heavy/per-project state) from IndexedDB
 * on mount, and auto-saves snapshots back to IDB when the user changes anything
 * project-related. Light state (settings, theme, etc.) lives in localStorage
 * via Zustand's persist middleware.
 */
export function useProjectPersistence() {
  useEffect(() => {
    let cancelled = false;
    let saveTimer: number | undefined;
    let hydrated = false;

    // 1. Hydrate from IDB
    loadProject().then((snap) => {
      if (cancelled) return;
      if (snap && snap.scrapeResult) {
        useDAStore.setState({
          scrapeResult: snap.scrapeResult,
          selectedLogo: snap.selectedLogo,
          activePageIndex: snap.activePageIndex,
          cardImage: snap.cardImage,
          cardLogoScale: snap.cardLogoScale,
          localFontFile: snap.localFontFile,
          sitemapUrls: snap.sitemapUrls,
          sitemapSource: snap.sitemapSource,
          sitemapStatus: snap.sitemapStatus,
          sitemapError: snap.sitemapError,
          generatedContent: snap.generatedContent ?? null,
          contentChips: snap.contentChips ?? [],
          contentBrief: snap.contentBrief ?? '',
        });
      }
      hydrated = true;
    });

    // 2. Subscribe — debounced save when project state mutates
    const unsubscribe = useDAStore.subscribe((state) => {
      if (!hydrated) return;
      if (!state.scrapeResult) return; // nothing to save until first scrape

      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => {
        const snap: ProjectSnapshot = {
          scrapeResult: state.scrapeResult,
          selectedLogo: state.selectedLogo,
          activePageIndex: state.activePageIndex,
          cardImage: state.cardImage,
          cardLogoScale: state.cardLogoScale,
          localFontFile: state.localFontFile,
          sitemapUrls: state.sitemapUrls,
          sitemapSource: state.sitemapSource,
          sitemapStatus: state.sitemapStatus,
          sitemapError: state.sitemapError,
          generatedContent: state.generatedContent,
          contentChips: state.contentChips,
          contentBrief: state.contentBrief,
        };
        saveProject(snap);
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(saveTimer);
      unsubscribe();
    };
  }, []);
}
