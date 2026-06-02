"use client";

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useDAStore } from '@/store/daStore';
import type { DAStore, ProjectSnapshot } from '@/types';
import { loadProject, listProjects, saveProject, newProjectId } from './projectStorage';

const SAVE_DEBOUNCE_MS = 800;

// Marqueur de session (par onglet) : présent au reload, absent dans un
// nouvel onglet → permet de revenir à l'accueil à l'ouverture du site.
const SESSION_FLAG = 'da-gen-session-active';

// Extracts the project-persisted slice from the store.
const pickSnapshot = (s: DAStore): ProjectSnapshot => ({
  scrapeResult: s.scrapeResult,
  selectedLogo: s.selectedLogo,
  activePageIndex: s.activePageIndex,
  selectedColors: s.selectedColors,
  colorsOrientation: s.colorsOrientation,
  desktopPadding: s.desktopPadding,
  fontName: s.fontName,
  fontUrl: s.fontUrl,
  fontUppercase: s.fontUppercase,
  showcaseWording: s.showcaseWording,
  bgColor: s.bgColor,
  borderRadius: s.borderRadius,
  logoScale: s.logoScale,
  cardImage: s.cardImage,
  cardLogoScale: s.cardLogoScale,
  cardImageOpacity: s.cardImageOpacity,
  frame4Blur: s.frame4Blur,
  regionY: s.regionY,
  localFontFile: s.localFontFile,
  importedFonts: s.importedFonts,
  sitemapUrls: s.sitemapUrls,
  sitemapSource: s.sitemapSource,
  sitemapStatus: s.sitemapStatus,
  sitemapError: s.sitemapError,
  generatedContent: s.generatedContent,
  contentChips: s.contentChips,
  contentBrief: s.contentBrief,
  previewCaption: s.previewCaption,
  previewHashtags: s.previewHashtags,
  previewImages: s.previewImages,
  previewFormat: s.previewFormat,
  customScreenshots: s.customScreenshots,
  customLogos: s.customLogos,
});

// Shallow per-field comparison — Zustand replaces references on mutation, so
// this reliably detects a real change without stringifying heavy base64 blobs.
const snapshotsEqual = (a: ProjectSnapshot, b: ProjectSnapshot): boolean => {
  const keys = Object.keys(a) as (keyof ProjectSnapshot)[];
  return keys.every((k) => a[k] === b[k]);
};

/**
 * Hydrates the active project from IndexedDB on mount and auto-saves it back
 * (debounced) whenever its data changes. Projects are keyed by id, so the
 * history accumulates every scraped site. Light app settings (theme, API keys,
 * …) live in localStorage via Zustand's persist middleware.
 */
export function useProjectPersistence() {
  useEffect(() => {
    let cancelled = false;
    let saveTimer: number | undefined;
    let hydrated = false;
    let lastSaved: ProjectSnapshot | null = null;
    let quotaWarned = false;

    // 1. Decide whether to restore the previous project.
    //    sessionStorage survives a same-tab reload but is empty in a brand-new
    //    tab/window. So: a reload restores the in-progress project (no lost
    //    work on F5), while opening the site fresh lands on the home page for
    //    a new analysis. Existing projects stay available in the history.
    (async () => {
      const isReload = sessionStorage.getItem(SESSION_FLAG) === '1';
      sessionStorage.setItem(SESSION_FLAG, '1');

      if (isReload) {
        const activeId = useDAStore.getState().activeProjectId;
        let project = activeId ? await loadProject(activeId) : null;
        if (!project) {
          const metas = await listProjects();
          if (metas.length) project = await loadProject(metas[0].id);
        }
        if (cancelled) return;
        if (project && project.scrapeResult) {
          useDAStore.getState().loadProjectData(project);
        }
      } else if (!cancelled) {
        // Fresh tab → clear the active id so the next scrape creates a NEW
        // project instead of overwriting the last one.
        useDAStore.getState().setActiveProjectId(null);
      }
      lastSaved = pickSnapshot(useDAStore.getState());
      hydrated = true;
    })();

    // 2. Auto-save the active project when its persisted slice changes.
    const unsubscribe = useDAStore.subscribe((state) => {
      if (!hydrated) return;
      if (!state.scrapeResult) return; // nothing to save until a scrape exists

      // A fresh scrape has no project id yet → mint one (re-triggers this).
      if (!state.activeProjectId) {
        useDAStore.getState().setActiveProjectId(newProjectId());
        return;
      }

      const snap = pickSnapshot(state);
      if (lastSaved && snapshotsEqual(snap, lastSaved)) return;

      const projectId = state.activeProjectId;
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(async () => {
        const ok = await saveProject(projectId, snap);
        if (ok) {
          lastSaved = snap;
          quotaWarned = false;
        } else if (!quotaWarned) {
          quotaWarned = true;
          toast.error(
            "Sauvegarde impossible : stockage du navigateur saturé. Le projet ne sera pas conservé après fermeture.",
          );
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
