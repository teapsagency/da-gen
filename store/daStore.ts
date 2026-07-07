import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DAStore, GeminiApiKey, GeneratedContent, PreviewFormat, PreviewImageRef, ScrapeResult, SocialIdentity } from '@/types';
import { DEFAULT_CONTENT_PROMPT, DEFAULT_GEMINI_MODEL } from '@/lib/defaultPrompt';
import { makeSectorAsset } from '@/lib/sectorThemes';
import { makeShowcaseSlide, makeDefaultShowcaseSlides, makeDefaultShowcaseSlideAt, cloneShowcaseSlide } from '@/lib/showcase';
import { deriveMeshBase } from '@/lib/meshGradient';

type LegacyPersistedState = Partial<{
  geminiApiKey: string;
  geminiApiKeyLabel: string;
  geminiApiKeys: GeminiApiKey[];
  activeApiKeyId: string | null;
  contentPrompt: string;
}>;

export const useDAStore = create<DAStore>()(
  persist(
    (set) => ({
      // Input
      url: '',
      setUrl: (url: string) => set({ url }),

      // Identity of the project currently being edited (null = new/unsaved).
      activeProjectId: null,
      setActiveProjectId: (id: string | null) => set({ activeProjectId: id }),
      loadProjectData: (p) => set({
        scrapeResult: p.scrapeResult,
        selectedLogo: p.selectedLogo,
        activePageIndex: p.activePageIndex,
        selectedColors: p.selectedColors ?? [],
        colorsOrientation: p.colorsOrientation ?? 'horizontal',
        desktopPadding: p.desktopPadding ?? false,
        fontName: p.fontName ?? '',
        fontUrl: p.fontUrl,
        fontUppercase: p.fontUppercase ?? false,
        showcaseWording: p.showcaseWording ?? 'focus',
        // Anciens projets (avant le carrousel Showcase) : seed depuis la palette.
        // Slides existantes sans regionY/tilt (versions antérieures) : on comble
        // avec une zone étalée par index pour ne pas montrer 2× le même endroit.
        showcaseSlides: p.showcaseSlides?.length
          ? p.showcaseSlides.map((s, i) => ({
              ...s,
              regionY: s.regionY ?? Math.min(0.7, i * 0.2),
              tilt: s.tilt ?? 0,
              // Défaut d'escalier déduit si absent : mobile 2 = descend, 3+ = monte.
              stagger: s.stagger ?? (s.device === 'mobile' && s.count > 1 ? (s.count >= 3 ? -0.7 : 0.7) : 0),
            }))
          : makeDefaultShowcaseSlides(
              (p.selectedColors?.length ? p.selectedColors : p.scrapeResult?.colors.map((c) => c.hex)) ?? [],
            ),
        // Base commune : valeur enregistrée, sinon celle d'une slide existante, sinon dérivée.
        showcaseMeshBase: p.showcaseMeshBase
          ?? p.showcaseSlides?.[0]?.mesh.base
          ?? deriveMeshBase((p.selectedColors?.length ? p.selectedColors : p.scrapeResult?.colors.map((c) => c.hex)) ?? []),
        motionBg: p.motionBg ?? { accent: null, speed: 1, intensity: 1 },
        bgColor: p.bgColor ?? '#f5f5f5',
        borderRadius: p.borderRadius ?? 28,
        logoScale: p.logoScale ?? 1,
        cardImage: p.cardImage,
        cardLogoScale: p.cardLogoScale ?? 1,
        cardImageOpacity: p.cardImageOpacity ?? 0.5,
        frame4Blur: p.frame4Blur ?? 4,
        regionY: p.regionY ?? 0,
        localFontFile: p.localFontFile,
        importedFonts: p.importedFonts ?? {},
        sitemapUrls: p.sitemapUrls ?? [],
        sitemapSource: p.sitemapSource ?? null,
        sitemapStatus: p.sitemapStatus ?? 'idle',
        sitemapError: p.sitemapError ?? null,
        generatedContent: p.generatedContent ?? null,
        contentChips: p.contentChips ?? [],
        contentBrief: p.contentBrief ?? '',
        previewCaption: p.previewCaption ?? '',
        previewImages: p.previewImages ?? [],
        previewFormat: p.previewFormat ?? 'original',
        customScreenshots: p.customScreenshots ?? {},
        customLogos: p.customLogos ?? [],
        frameNames: p.frameNames ?? {},
        activeProjectId: p.id,
      }),

      activePageIndex: 0,
      setActivePageIndex: (index: number) => set({ activePageIndex: index }),

      // Scraped data
      scrapeResult: null,
      setScrapeResult: (result: ScrapeResult) => set({
        scrapeResult: result,
        selectedLogo: result.logo || result.logos[0] || '',
        selectedColors: result.colors.slice(0, 4).map(c => c.hex),
        fontName: result.font.name,
        fontUrl: result.font.url,
        fontUppercase: result.headingUppercase ?? false,
        bgColor: result.siteBgColor || '#FFFFFF',
        // Nouveau site → carrousel Showcase reseedé sur sa charte (4 slides par défaut).
        showcaseSlides: makeDefaultShowcaseSlides(result.colors.slice(0, 4).map((c) => c.hex)),
        showcaseMeshBase: deriveMeshBase(result.colors.slice(0, 4).map((c) => c.hex)),
        motionBg: { accent: null, speed: 1, intensity: 1 },
        activePageIndex: 0,
        sitemapUrls: [],
        sitemapSource: null,
        sitemapStatus: 'idle',
        sitemapError: null,
        // Nouveau scrape → on repart sur les screenshots officiels et la zone
        // de capture par défaut (une zone est spécifique à la page scrapée :
        // la conserver d'un site à l'autre afficherait la mauvaise région).
        customScreenshots: {},
        customLogos: [],
        frameNames: {},
        regionY: 0,
        // Un nouveau scrape = nouvelle page/client → les images de preview
        // (screenshot/frame) référencent la page précédente.
        previewCaption: '',
        previewImages: [],
        previewFormat: 'original',
      }),

      selectedLogo: '',
      setSelectedLogo: (logo: string) => set({ selectedLogo: logo }),

      logoScale: 1,
      setLogoScale: (scale: number) => set({ logoScale: scale }),

      // User choices
      selectedColors: [],
      toggleColor: (hex: string) => set((state) => ({
        selectedColors: state.selectedColors.includes(hex)
          ? state.selectedColors.filter((c) => c !== hex)
          : state.selectedColors.length < 4
            ? [...state.selectedColors, hex]
            : state.selectedColors
      })),
      setSelectedColors: (colors: string[]) => set({ selectedColors: colors }),

      colorsOrientation: 'horizontal',
      setColorsOrientation: (orientation) => set({ colorsOrientation: orientation }),

      desktopPadding: false,
      setDesktopPadding: (enabled) => set({ desktopPadding: enabled }),

      bgColor: '#f5f5f5',
      setBgColor: (hex: string) => set({ bgColor: hex }),

      fontName: '',
      fontUrl: undefined,
      // Switching font: restore a previously imported file for this typeface
      // if there is one, otherwise clear the local font.
      setFont: (name: string, url?: string) => set((state) => {
        const imported = state.importedFonts[name];
        return {
          fontName: name,
          fontUrl: imported ? undefined : url,
          localFontFile: imported ?? null,
        };
      }),

      borderRadius: 28,
      setBorderRadius: (radius: number) => set({ borderRadius: radius }),

      localFontFile: null,
      setLocalFontFile: (file: string | null) => set({ localFontFile: file, fontUrl: undefined }),

      importedFonts: {},
      importFont: (name: string, dataUrl: string) => set((state) => ({
        fontName: name,
        fontUrl: undefined,
        localFontFile: dataUrl,
        importedFonts: { ...state.importedFonts, [name]: dataUrl },
      })),

      theme: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      agencyLogo: '/logo-teaps.svg',
      setAgencyLogo: (logo: string) => set({ agencyLogo: logo }),

      cardImage: null,
      setCardImage: (img: string | null) => set({ cardImage: img }),

      cardLogoScale: 1,
      setCardLogoScale: (scale: number) => set({ cardLogoScale: scale }),

      cardImageOpacity: 0.5,
      setCardImageOpacity: (opacity: number) => set({ cardImageOpacity: opacity }),

      frame4Blur: 4,
      setFrame4Blur: (px: number) => set({ frame4Blur: px }),

      fontUppercase: false,
      setFontUppercase: (v: boolean) => set({ fontUppercase: v }),

      showcaseWording: 'focus',
      setShowcaseWording: (w) => set({ showcaseWording: w }),

      // ─── Carrousel Showcase 16:9 ───
      showcaseSlides: [],
      setShowcaseSlides: (slides) => set({ showcaseSlides: slides }),
      showcaseMeshBase: '#8f9399',
      setShowcaseMeshBase: (color) => set({ showcaseMeshBase: color }),

      // Fond animé du Motion Studio (accent null = dérivé de la palette).
      motionBg: { accent: null, speed: 1, intensity: 1 },
      setMotionBg: (patch) => set((state) => ({ motionBg: { ...state.motionBg, ...patch } })),
      addShowcaseSlide: () => set((state) => {
        const palette = state.selectedColors.length
          ? state.selectedColors
          : state.scrapeResult?.colors.map((c) => c.hex) ?? [];
        return { showcaseSlides: [...state.showcaseSlides, makeShowcaseSlide(palette, state.showcaseSlides.length)] };
      }),
      removeShowcaseSlide: (id) => set((state) => ({
        showcaseSlides: state.showcaseSlides.filter((s) => s.id !== id),
      })),
      updateShowcaseSlide: (id, patch) => set((state) => ({
        showcaseSlides: state.showcaseSlides.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      })),
      // Reset d'une slide : agencement par défaut de sa position (id + nom conservés).
      resetShowcaseSlide: (id) => set((state) => {
        const palette = state.selectedColors.length
          ? state.selectedColors
          : state.scrapeResult?.colors.map((c) => c.hex) ?? [];
        return {
          showcaseSlides: state.showcaseSlides.map((s, i) =>
            s.id === id ? { ...makeDefaultShowcaseSlideAt(palette, i), id: s.id, name: s.name } : s),
        };
      }),
      // Duplication : copie insérée juste après l'originale (nouvel id).
      duplicateShowcaseSlide: (id) => set((state) => {
        const i = state.showcaseSlides.findIndex((s) => s.id === id);
        if (i < 0) return {};
        const next = [...state.showcaseSlides];
        next.splice(i + 1, 0, cloneShowcaseSlide(next[i]));
        return { showcaseSlides: next };
      }),
      // Déplacement d'un cran vers le haut (-1) ou le bas (+1).
      moveShowcaseSlide: (id, dir) => set((state) => {
        const i = state.showcaseSlides.findIndex((s) => s.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= state.showcaseSlides.length) return {};
        const next = [...state.showcaseSlides];
        [next[i], next[j]] = [next[j], next[i]];
        return { showcaseSlides: next };
      }),
      // Reset global : même seed qu'au scrape (4 slides par défaut + base dérivée).
      resetShowcaseSlides: () => set((state) => {
        const palette = state.selectedColors.length
          ? state.selectedColors
          : state.scrapeResult?.colors.map((c) => c.hex) ?? [];
        return {
          showcaseSlides: makeDefaultShowcaseSlides(palette),
          showcaseMeshBase: deriveMeshBase(palette),
        };
      }),

      regionY: 0,
      setRegionY: (v: number) => set({ regionY: Math.min(1, Math.max(0, v)) }),

      frameNames: {},
      setFrameName: (frameId: string, name: string) => set((state) => {
        const next = { ...state.frameNames };
        const trimmed = name.trim();
        if (trimmed) next[frameId] = trimmed;
        else delete next[frameId];
        return { frameNames: next };
      }),

      customScreenshots: {},
      setCustomScreenshot: (slotKey: string, dataUrl: string | null) => set((state) => {
        const next = { ...state.customScreenshots };
        if (dataUrl) {
          next[slotKey] = dataUrl;
        } else {
          delete next[slotKey];
        }
        return { customScreenshots: next };
      }),
      clearCustomScreenshots: () => set({ customScreenshots: {} }),

      customLogos: [],
      addCustomLogo: (dataUrl: string) => set((state) =>
        state.customLogos.includes(dataUrl)
          ? state
          : { customLogos: [...state.customLogos, dataUrl] }
      ),
      removeCustomLogo: (dataUrl: string) => set((state) => ({
        customLogos: state.customLogos.filter((l) => l !== dataUrl),
        // If the removed logo was selected, fall back to the first scraped one.
        selectedLogo: state.selectedLogo === dataUrl
          ? (state.scrapeResult?.logos[0] ?? '')
          : state.selectedLogo,
      })),

      // Module actif (cas client / assets site agence).
      appModule: 'client',
      setAppModule: (m) => set({ appModule: m }),

      // Bibliothèque globale d'illustrations « site agence » (DA TEAPS figée).
      // Hydratée + sauvegardée en IndexedDB via useAgencyAssetsPersistence.
      agencyAssets: [],
      setAgencyAssets: (list) => set({ agencyAssets: list }),
      addAgencyAsset: (role) => set((state) => ({
        agencyAssets: [...state.agencyAssets, makeSectorAsset(role, undefined)],
      })),
      removeAgencyAsset: (id) => set((state) => ({
        agencyAssets: state.agencyAssets.filter((a) => a.id !== id),
      })),
      updateAgencyAsset: (id, patch) => set((state) => ({
        agencyAssets: state.agencyAssets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      })),

      screenshotDelay: 2000,
      setScreenshotDelay: (delay: number) => set({ screenshotDelay: delay }),

      scrapeZoom: 1,
      // Clamp 50%–150% par pas de 5%.
      setScrapeZoom: (zoom: number) =>
        set({ scrapeZoom: Math.min(1.5, Math.max(0.5, Math.round(zoom * 20) / 20)) }),

      // Résolution d'export : ×2 par défaut (visuels nets sur les réseaux).
      exportScale: 2,
      setExportScale: (scale: number) => set({ exportScale: scale === 2 ? 2 : 1 }),

      exportFormat: 'png',
      setExportFormat: (f) => set({ exportFormat: f }),

      // Nombre de mockups sur les planches showcase (09/10). Bornes 2–9.
      boardMockups: 6,
      setBoardMockups: (n: number) => set({ boardMockups: Math.min(9, Math.max(2, Math.round(n))) }),

      // Ombre portée des mockups (navigateur / téléphone) sur toutes les frames.
      dropShadow: true,
      setDropShadow: (v: boolean) => set({ dropShadow: v }),

      // UI state
      isLoading: false,
      setIsLoading: (v: boolean) => set({ isLoading: v }),
      error: null,
      setError: (e: string | null) => set({ error: e }),

      isAddingPage: false,
      setIsAddingPage: (v: boolean) => set({ isAddingPage: v }),

      isPageInputOpen: false,
      setIsPageInputOpen: (v: boolean) => set({ isPageInputOpen: v }),
      removeExtraPage: (index: number) => set((state) => ({
        scrapeResult: state.scrapeResult
          ? { ...state.scrapeResult, extraPages: state.scrapeResult.extraPages.filter((_, i) => i !== index) }
          : null,
        activePageIndex: 0,
      })),
      // "Nouveau projet" — clears the editing canvas but keeps the saved
      // history intact. The current project stays available in the history.
      resetProject: () => {
        set({
          activeProjectId: null,
          scrapeResult: null,
          activePageIndex: 0,
          isPageInputOpen: false,
          isAddingPage: false,
          error: null,
          selectedLogo: '',
          selectedColors: [],
          colorsOrientation: 'horizontal',
          desktopPadding: false,
          fontName: '',
          fontUrl: undefined,
          fontUppercase: false,
          showcaseWording: 'focus',
          showcaseSlides: [],
          showcaseMeshBase: '#8f9399',
          motionBg: { accent: null, speed: 1, intensity: 1 },
          bgColor: '#f5f5f5',
          borderRadius: 28,
          logoScale: 1,
          cardImage: null,
          cardLogoScale: 1,
          cardImageOpacity: 0.5,
          frame4Blur: 4,
          regionY: 0,
          localFontFile: null,
          importedFonts: {},
          sitemapUrls: [],
          sitemapSource: null,
          sitemapStatus: 'idle',
          sitemapError: null,
          generatedContent: null,
          contentChips: [],
          contentBrief: '',
          previewCaption: '',
          previewImages: [],
          previewFormat: 'original',
          customScreenshots: {},
          customLogos: [],
          frameNames: {},
        });
      },

      scrapeLogs: [],
      setScrapeLogs: (logs) => set({ scrapeLogs: logs }),
      appendScrapeLog: (entry) => set((state) => ({ scrapeLogs: [...state.scrapeLogs, entry] })),
      clearScrapeLogs: () => set({ scrapeLogs: [] }),

      generatedContent: null,
      setGeneratedContent: (c: GeneratedContent | null) => set({ generatedContent: c }),
      contentChips: [],
      setContentChips: (chips: string[]) => set({ contentChips: chips }),
      contentBrief: '',
      setContentBrief: (brief: string) => set({ contentBrief: brief }),

      previewCaption: '',
      setPreviewCaption: (v: string) => set({ previewCaption: v }),
      previewImages: [],
      setPreviewImages: (v: PreviewImageRef[]) => set({ previewImages: v }),
      previewFormat: '1:1',
      setPreviewFormat: (v: PreviewFormat) => set({ previewFormat: v }),

      socialIdentity: {
        displayName: 'Agence TEAPS',
        instagramHandle: 'agence.teaps',
        followers: '528 abonnés',
      },
      setSocialIdentity: (v: Partial<SocialIdentity>) =>
        set((state) => ({ socialIdentity: { ...state.socialIdentity, ...v } })),

      geminiApiKeys: [],
      activeApiKeyId: null,
      setGeminiApiKeys: (keys: GeminiApiKey[]) => set({ geminiApiKeys: keys }),
      setActiveApiKeyId: (id: string | null) => set({ activeApiKeyId: id }),

      pexelsApiKey: '',
      setPexelsApiKey: (key: string) => set({ pexelsApiKey: key }),

      geminiModel: DEFAULT_GEMINI_MODEL,
      setGeminiModel: (model: string) => set({ geminiModel: model }),
      resetGeminiModel: () => set({ geminiModel: DEFAULT_GEMINI_MODEL }),

      contentPrompt: DEFAULT_CONTENT_PROMPT,
      setContentPrompt: (prompt: string) => set({ contentPrompt: prompt }),
      resetContentPrompt: () => set({ contentPrompt: DEFAULT_CONTENT_PROMPT }),

      sitemapUrls: [],
      sitemapSource: null,
      sitemapStatus: 'idle',
      sitemapError: null,
      includeSitemapInContent: true,
      setSitemap: ({ urls, source, status, error = null }) => set({
        sitemapUrls: urls,
        sitemapSource: source,
        sitemapStatus: status,
        sitemapError: error,
      }),
      setIncludeSitemapInContent: (v: boolean) => set({ includeSitemapInContent: v }),
    }),
    {
      name: 'da-gen-store',
      partialize: (state) => ({
        url: state.url,
        // selectedColors / bgColor / font / borderRadius / logoScale are now
        // per-project (stored in IndexedDB with each project), not global.
        activeProjectId: state.activeProjectId,
        appModule: state.appModule,
        theme: state.theme,
        agencyLogo: state.agencyLogo === '/logo-teaps.svg' ? state.agencyLogo : undefined,
        screenshotDelay: state.screenshotDelay,
        scrapeZoom: state.scrapeZoom,
        exportScale: state.exportScale,
        exportFormat: state.exportFormat,
        boardMockups: state.boardMockups,
        dropShadow: state.dropShadow,
        geminiApiKeys: state.geminiApiKeys,
        activeApiKeyId: state.activeApiKeyId,
        pexelsApiKey: state.pexelsApiKey,
        geminiModel: state.geminiModel,
        contentPrompt: state.contentPrompt,
        includeSitemapInContent: state.includeSitemapInContent,
        socialIdentity: state.socialIdentity,
      }),
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        let state = (persisted ?? {}) as LegacyPersistedState & { contentPrompt?: string; boardMockups?: number };
        if (version < 2 && state.geminiApiKey && !state.geminiApiKeys?.length) {
          const id = `key_${Date.now()}`;
          state = {
            ...state,
            geminiApiKeys: [{
              id,
              label: state.geminiApiKeyLabel || 'Clé principale',
              key: state.geminiApiKey,
            }],
            activeApiKeyId: id,
          };
        }
        // v3 : reset contentPrompt so users pick up the new sitemap / internal-links instructions.
        // Users who had customized their prompt can re-edit from Settings.
        if (version < 3) {
          state = { ...state, contentPrompt: DEFAULT_CONTENT_PROMPT };
        }
        // v4 : nouveau défaut de mockups sur les planches showcase (4 → 6).
        if (version < 4) {
          state = { ...state, boardMockups: 6 };
        }
        return state;
      },
    }
  )
);
