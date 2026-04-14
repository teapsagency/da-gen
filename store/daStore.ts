import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DAStore, GeminiApiKey, ScrapeResult } from '@/types';
import { DEFAULT_CONTENT_PROMPT, DEFAULT_GEMINI_MODEL } from '@/lib/defaultPrompt';

type LegacyPersistedState = Partial<{
  geminiApiKey: string;
  geminiApiKeyLabel: string;
  geminiApiKeys: GeminiApiKey[];
  activeApiKeyId: string | null;
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
      resetProject: () => set({
        scrapeResult: null,
        activePageIndex: 0,
        isPageInputOpen: false,
        isAddingPage: false,
        error: null,
      }),

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
      }),
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as LegacyPersistedState;
        if (version < 2 && state.geminiApiKey && !state.geminiApiKeys?.length) {
          const id = `key_${Date.now()}`;
          return {
            ...state,
            geminiApiKeys: [{
              id,
              label: state.geminiApiKeyLabel || 'Clé principale',
              key: state.geminiApiKey,
            }],
            activeApiKeyId: id,
          };
        }
        return state;
      },
    }
  )
);
