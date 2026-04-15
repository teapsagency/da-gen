import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DAStore, GeminiApiKey, GeneratedContent, ScrapeResult } from '@/types';
import { DEFAULT_CONTENT_PROMPT, DEFAULT_GEMINI_MODEL } from '@/lib/defaultPrompt';
import { clearProject } from '@/lib/projectStorage';

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

      bgColor: '#f5f5f5',
      setBgColor: (hex: string) => set({ bgColor: hex }),

      fontName: '',
      fontUrl: undefined,
      setFont: (name: string, url?: string) => set({ fontName: name, fontUrl: url, localFontFile: null }),

      borderRadius: 28,
      setBorderRadius: (radius: number) => set({ borderRadius: radius }),

      localFontFile: null,
      setLocalFontFile: (file: string | null) => set({ localFontFile: file, fontUrl: undefined }),

      theme: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      agencyLogo: '/logo-teaps.svg',
      setAgencyLogo: (logo: string) => set({ agencyLogo: logo }),

      cardImage: null,
      setCardImage: (img: string | null) => set({ cardImage: img }),

      cardLogoScale: 1,
      setCardLogoScale: (scale: number) => set({ cardLogoScale: scale }),

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
      resetProject: () => {
        clearProject();
        set({
          scrapeResult: null,
          activePageIndex: 0,
          isPageInputOpen: false,
          isAddingPage: false,
          error: null,
          selectedLogo: '',
          cardImage: null,
          cardLogoScale: 1,
          localFontFile: null,
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
        selectedColors: state.selectedColors,
        bgColor: state.bgColor,
        fontName: state.fontName,
        fontUrl: state.fontUrl,
        borderRadius: state.borderRadius,
        theme: state.theme,
        agencyLogo: state.agencyLogo === '/logo-teaps.svg' ? state.agencyLogo : undefined,
        logoScale: state.logoScale,
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
