import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DAStore, GeminiApiKey, GeneratedContent, PreviewImageRef, ScrapeResult, SocialIdentity } from '@/types';
import { DEFAULT_CONTENT_PROMPT, DEFAULT_GEMINI_MODEL } from '@/lib/defaultPrompt';

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
        previewHashtags: p.previewHashtags ?? [],
        previewImages: p.previewImages ?? [],
        customScreenshots: p.customScreenshots ?? {},
        customLogos: p.customLogos ?? [],
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
        regionY: 0,
        // Un nouveau scrape = nouvelle page/client → les images de preview
        // (screenshot/frame) référencent la page précédente.
        previewCaption: '',
        previewHashtags: [],
        previewImages: [],
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

      regionY: 0,
      setRegionY: (v: number) => set({ regionY: Math.min(1, Math.max(0, v)) }),

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

      screenshotDelay: 2000,
      setScreenshotDelay: (delay: number) => set({ screenshotDelay: delay }),

      scrapeZoom: 1,
      // Clamp 50%–150% par pas de 5%.
      setScrapeZoom: (zoom: number) =>
        set({ scrapeZoom: Math.min(1.5, Math.max(0.5, Math.round(zoom * 20) / 20)) }),

      // Résolution d'export : ×2 par défaut (visuels nets sur les réseaux).
      exportScale: 2,
      setExportScale: (scale: number) => set({ exportScale: scale === 2 ? 2 : 1 }),

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
          previewHashtags: [],
          previewImages: [],
          customScreenshots: {},
          customLogos: [],
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
      previewHashtags: [],
      setPreviewHashtags: (v: string[]) => set({ previewHashtags: v }),
      previewImages: [],
      setPreviewImages: (v: PreviewImageRef[]) => set({ previewImages: v }),

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
        theme: state.theme,
        agencyLogo: state.agencyLogo === '/logo-teaps.svg' ? state.agencyLogo : undefined,
        screenshotDelay: state.screenshotDelay,
        scrapeZoom: state.scrapeZoom,
        exportScale: state.exportScale,
        boardMockups: state.boardMockups,
        dropShadow: state.dropShadow,
        geminiApiKeys: state.geminiApiKeys,
        activeApiKeyId: state.activeApiKeyId,
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
