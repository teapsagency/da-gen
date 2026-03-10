export type ScrapeResult = {
  logos: string[];
  logo: string;
  colors: {
    hex: string;
    rgb: [number, number, number];
    isLight: boolean;
  }[];
  siteBgColor?: string;
  fonts: {
    name: string;
    url?: string;
    isGoogleFont: boolean;
    isSelfHosted?: boolean;
  }[];
  font: {
    name: string;
    url?: string;
    isGoogleFont: boolean;
  };
  screenshots: {
    desktop: string;
    desktopFull: string;
    mobile: string;
  };
  siteUrl: string;
  domain: string;
  title: string;
};

export type DAStore = {
  url: string;
  setUrl: (url: string) => void;
  
  scrapeResult: ScrapeResult | null;
  setScrapeResult: (result: ScrapeResult) => void;
  
  selectedLogo: string;
  setSelectedLogo: (logo: string) => void;

  logoScale: number;
  setLogoScale: (scale: number) => void;
  
  selectedColors: string[];
  toggleColor: (hex: string) => void;
  
  bgColor: string;
  setBgColor: (hex: string) => void;
  
  fontName: string;
  fontUrl: string | undefined;
  setFont: (name: string, url?: string) => void;

  borderRadius: number;
  setBorderRadius: (radius: number) => void;

  localFontFile: string | null; // Base64 or Blob URL
  setLocalFontFile: (file: string | null) => void;

  theme: 'dark' | 'light';
  toggleTheme: () => void;
  
  agencyLogo: string;
  setAgencyLogo: (logo: string) => void;
  
  screenshotDelay: number;
  setScreenshotDelay: (delay: number) => void;
  
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
};
