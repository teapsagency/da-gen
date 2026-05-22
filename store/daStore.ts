import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DAStore, GeminiApiKey, GeneratedContent, ScrapeResult } from '@/types';
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
        desktopPadding: p.desktopPadding ?? true,
        fontName: p.fontName ?? '',
        fontUrl: p.fontUrl,
        bgColor: p.bgColor ?? '#f5f5f5',
        borderRadius: p.borderRadius ?? 28,
        logoScale: p.logoScale ?? 1,
        cardImage: p.cardImage,
        cardLogoScale: p.cardLogoScale ?? 1,
        cardImageOpacity: p.cardImageOpacity ?? 0.5,
        localFontFile: p.localFontFile,
        importedFonts: p.importedFonts ?? {},
        sitemapUrls: p.sitemapUrls ?? [],
        sitemapSource: p.sitemapSource ?? null,
        sitemapStatus: p.sitemapStatus ?? 'idle',
        sitemapError: p.sitemapError ?? null,
        generatedContent: p.generatedContent ?? null,
        contentChips: p.contentChips ?? [],
        contentBrief: p.contentBrief ?? '',
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
        bgColor: result.siteBgColor || '#FFFFFF',
        activePageIndex: 0,
        sitemapUrls: [],
        sitemapSource: null,
        sitemapStatus: 'idle',
        sitemapError: null,
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

      desktopPadding: true,
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

      screenshotDelay: 2000,
      setScreenshotDelay: (delay: number) => set({ screenshotDelay: delay }),

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
          desktopPadding: true,
          fontName: '',
          fontUrl: undefined,
          bgColor: '#f5f5f5',
          borderRadius: 28,
          logoScale: 1,
          cardImage: null,
          cardLogoScale: 1,
          cardImageOpacity: 0.5,
          localFontFile: null,
          importedFonts: {},
          sitemapUrls: [],
          sitemapSource: null,
          sitemapStatus: 'idle',
          sitemapError: null,
          generatedContent: null,
          contentChips: [],
          contentBrief: '',
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
        geminiApiKeys: state.geminiApiKeys,
        activeApiKeyId: state.activeApiKeyId,
        geminiModel: state.geminiModel,
        contentPrompt: state.contentPrompt,
        includeSitemapInContent: state.includeSitemapInContent,
      }),
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        let state = (persisted ?? {}) as LegacyPersistedState & { contentPrompt?: string };
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
        return state;
      },
    }
  )
);
