import { create } from 'zustand';
import { DAStore, ScrapeResult } from '@/types';

export const useDAStore = create<DAStore>((set) => ({
  // Input
  url: '',
  setUrl: (url: string) => set({ url }),
  
  // Scraped data
  scrapeResult: null,
  setScrapeResult: (result: ScrapeResult) => set({ 
    scrapeResult: result,
    selectedLogo: result.logo || result.logos[0] || '',
    selectedColors: result.colors.slice(0, 4).map(c => c.hex),
    fontName: result.font.name,
    fontUrl: result.font.url || `https://fonts.googleapis.com/css2?family=${result.font.name.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`,
    bgColor: result.siteBgColor || '#F2EEE9'
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
  
  bgColor: '#F2EEE9',
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
  
  agencyLogo: '',
  setAgencyLogo: (logo: string) => set({ agencyLogo: logo }),
  
  screenshotDelay: 2000,
  setScreenshotDelay: (delay: number) => set({ screenshotDelay: delay }),
  
  // UI state
  isLoading: false,
  setIsLoading: (v: boolean) => set({ isLoading: v }),
  error: null,
  setError: (e: string | null) => set({ error: e }),
}));
