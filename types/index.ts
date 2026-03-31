export type PageScreenshots = {
  label: string;
  url: string;
  desktop: string;
  desktopFull: string;
  mobile: string;
};

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
  extraPages: PageScreenshots[];
  siteUrl: string;
  domain: string;
  title: string;
};

export type GeneratedContent = {
  caseStudy: {
    title: string;
    tagline: string;
    intro: string;
    challenge: string;
    solution: string;
    results: string;
    services: string[];
    platform: string;
  };
  socialPost: {
    caption: string;
    hashtags: string[];
  };
};

export type DAStore = {
  url: string;
  setUrl: (url: string) => void;

  activePageIndex: number;
  setActivePageIndex: (index: number) => void;

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

  localFontFile: string | null;
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

  isAddingPage: boolean;
  setIsAddingPage: (v: boolean) => void;

  isPageInputOpen: boolean;
  setIsPageInputOpen: (v: boolean) => void;
  removeExtraPage: (index: number) => void;
  resetProject: () => void;
};
