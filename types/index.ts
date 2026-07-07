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
  // Polices dominantes détectées sur les titres (h1-h3) et le corps (p/li),
  // pour le classement Titre/Texte dans le panneau Typographie. Référencent par
  // nom une entrée de `fonts`. Absentes sur d'anciens projets.
  headingFont?: string;
  bodyFont?: string;
  // Titres majoritairement en MAJUSCULES sur le site (text-transform: uppercase).
  headingUppercase?: boolean;
  screenshots: {
    desktop: string;
    desktopFull: string;
    desktopMid: string;
    desktopLower: string;
    mobile: string;
  };
  extraPages: PageScreenshots[];
  siteUrl: string;
  domain: string;
  title: string;
  // Nom de marque déduit (titre/og:site_name) plutôt que le domaine. Absent sur
  // d'anciens projets → les frames retombent sur le nom dérivé du domaine.
  siteName?: string;
};

export type GeminiApiKey = {
  id: string;
  label: string;
  key: string;
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

export type SocialFrameId =
  | 'frame4' | 'frame5' | 'frame6' | 'frame7' | 'frame8' | 'frame9' | 'frame10'
  | 'identityMobile' | 'colorsMobile' | 'mockupMobile' | 'coverMobile';

export type SocialPlatform = 'instagram' | 'linkedin';

// Format (ratio) de la zone média du post, comme imposé par Instagram.
export type PreviewFormat = 'original' | '1:1' | '4:5' | '16:9';

// Une image du carrousel de preview : upload/coller, screenshot scrapé (résolu
// via une clé), ou frame sociale rendue en live.
export type PreviewImageRef =
  | { kind: 'upload'; dataUrl: string }
  | { kind: 'screenshot'; key: string }
  | { kind: 'frame'; frame: SocialFrameId };

// Identité du compte agence affichée sur les cartes de post (globale).
// L'avatar n'en fait PAS partie : il est repris de `agencyLogo`.
export type SocialIdentity = {
  displayName: string;     // nom affiché (LinkedIn), défaut "Agence TEAPS"
  instagramHandle: string; // défaut "agence.teaps"
  followers: string;       // défaut "528 abonnés"
};

// ─── Assets secteur (illustrations thématiques par page SEO) ───
// Ratio de la card d'asset (long-edge fixe, voir ASSET_DIMS dans sectorThemes).
export type AssetRatio = '3:2' | '4:3' | '16:9' | '1:1';

// La photo de fond d'un asset : photo Pexels OU upload — toutes deux stockées en
// dataURL (comme cardImage/customScreenshots) pour persister et exporter sans CORS.
// 'none' = pas encore de photo (le panel déclenche une recherche auto au montage).
export type SectorAssetPhoto =
  | { kind: 'stock'; dataUrl: string; alt?: string; photographer?: string }
  | { kind: 'upload'; dataUrl: string }
  | { kind: 'none' };

// Type d'un calque flottant qui habille la card.
export type AssetLayerType = 'icon' | 'logo' | 'pill' | 'badge' | 'brand';
// Position = centre, en fraction (0..1) de la card.
export type AssetElement = { x: number; y: number };

// Un calque : type + position + contenu propre (→ on peut en empiler autant
// qu'on veut, y compris plusieurs du même type). `x/y` = centre 0..1.
export type AssetLayer = {
  id: string;
  type: AssetLayerType;
  x: number;
  y: number;
  iconName?: string;   // type 'icon' ou glyphe custom d'une 'pill' (nom Lucide)
  iconEmoji?: string;  // type 'icon' ou glyphe custom d'une 'pill' (emoji)
  imageSrc?: string;   // type 'icon' : image custom importée (dataUrl) — prioritaire sur iconName/iconEmoji
  iconColor?: string;  // type 'icon' : couleur du glyphe Lucide (défaut TEAPS_ACCENT)
  brandSlug?: string;  // type 'brand' (simple-icons)
  hideLabel?: boolean; // type 'brand' : logo seul (sans le nom de la marque)
  text?: string;       // type 'pill' | 'badge'
  iconRight?: boolean; // type 'pill' : glyphe à droite du texte (défaut : gauche)
  radius?: number;     // 0..1 — arrondi des coins (défaut par type) ; icon/pill/badge/brand
  // (pilule : un glyphe = iconName/iconEmoji ; sinon rien)
};

// Un visuel d'illustration thématique (hero ou contenu) d'une page SEO TEAPS :
// une image flottante (plus petite que la card) entourée de calques déplaçables.
export type SectorAsset = {
  id: string;
  role: 'hero' | 'content';
  // Nom d'export éditable (suffixe du fichier PNG). Absent → libellé du rôle.
  name?: string;
  ratio: AssetRatio;
  photo: SectorAssetPhoto;
  query: string;        // requête Pexels (éditable), pré-remplie depuis le thème
  veil: number;         // 0..1 — intensité de l'overlay bleu TEAPS sur l'image
  imageScale: number;   // 0..1 — taille de l'image flottante (fraction de la card)
  layers: AssetLayer[]; // calques flottants (ordre = ordre d'ajout)
};

// ─── Mesh gradient (fond des visuels « Showcase ») ───
// Un point de couleur du dégradé multi-points : centre en fraction (0..1) de la
// frame + rayon (0..1, demi-taille de l'ellipse en fraction de la boîte).
export type MeshPoint = {
  id: string;
  color: string;
  x: number;
  y: number;
  radius: number;
};
// Le fond mesh : couleur de base sous les points + liste de points. `accent`
// mémorise la couleur de marque déduite (couleur par défaut d'un point ajouté).
export type MeshGradient = {
  base: string;
  points: MeshPoint[];
  accent?: string;
};

// Appareil affiché sur la planche « Showcase » (16:9).
export type ShowcaseDevice = 'desktop' | 'mobile';

// Réglages du fond animé du Motion (par projet). `accent` null = dérivé de la
// palette ; `speed`/`intensity` = multiplicateurs du mouvement / de l'opacité des blobs.
export type MotionBgSettings = { accent: string | null; speed: number; intensity: number };

// Une slide du carrousel « Showcase » : un ou plusieurs mockups (device + nombre)
// flottant sur un fond mesh gradient propre à la slide. Nom d'export éditable.
// `regionY` = position verticale de la capture (0 = haut, 1 = bas ; les mockups
// multiples s'étalent autour). `tilt` = inclinaison des mockups en degrés (0 = droit).
// `stagger` = décalage vertical en escalier des mockups (−1..1 ; >0 = descend de
// gauche à droite, <0 = monte ; 0 = alignés). Surtout utile en mobile.
export type ShowcaseSlide = {
  id: string;
  name?: string;
  device: ShowcaseDevice;
  count: number;
  regionY: number;
  tilt: number;
  stagger: number;
  mesh: MeshGradient;
};

export type SitemapStatus = 'idle' | 'loading' | 'loaded' | 'empty' | 'error';

// The slice of state that belongs to a single project (persisted in IndexedDB).
// Includes the visual customisations so each project keeps its own look.
export type ProjectSnapshot = {
  scrapeResult: ScrapeResult | null;
  selectedLogo: string;
  activePageIndex: number;
  selectedColors: string[];
  colorsOrientation: 'horizontal' | 'vertical';
  desktopPadding: boolean;
  fontName: string;
  fontUrl: string | undefined;
  bgColor: string;
  borderRadius: number;
  logoScale: number;
  cardImage: string | null;
  cardLogoScale: number;
  cardImageOpacity: number;
  frame4Blur: number;
  fontUppercase: boolean;
  // Wording du titre des frames showcase client (06 & 07).
  showcaseWording: 'focus' | 'nouvelle';
  // Carrousel « Showcase » 16:9 : liste de slides (mockups + fond mesh gradient),
  // seedée depuis la charte au scrape puis éditable.
  showcaseSlides: ShowcaseSlide[];
  // Couleur de fond du mesh, COMMUNE à toutes les slides (projet-global).
  showcaseMeshBase: string;
  // Fond animé du Motion Studio (par projet).
  motionBg: MotionBgSettings;
  regionY: number;
  localFontFile: string | null;
  importedFonts: Record<string, string>;
  sitemapUrls: string[];
  sitemapSource: string | null;
  sitemapStatus: SitemapStatus;
  sitemapError: string | null;
  generatedContent: GeneratedContent | null;
  contentChips: string[];
  contentBrief: string;
  // Preview réseaux sociaux — état du post (par projet).
  previewCaption: string;
  previewImages: PreviewImageRef[];
  previewFormat: PreviewFormat;
  // Custom screenshots that override the scraped ones per frame slot.
  // Key = stable slot id (e.g. "frame-2-mockup__desktop"), value = data URL.
  customScreenshots: Record<string, string>;
  // User-uploaded logos, persisted with the project.
  customLogos: string[];
  // Noms d'export éditables par frame. Clé = id DOM de la frame (ex.
  // "frame-1-da"), valeur = libellé saisi. Absent → libellé par défaut.
  frameNames: Record<string, string>;
};

// A persisted project with its identity & timestamp.
export type StoredProject = ProjectSnapshot & { id: string; savedAt: number };

// Lightweight descriptor used to render the history list without loading
// the heavy base64 payload of every project.
export type ProjectMeta = {
  id: string;
  domain: string;
  title: string;
  savedAt: number;
  // Horodatage de la dernière ouverture (bumpé par `touchProject`). Absent sur
  // les anciens projets → fallback sur `savedAt`. Sert au tri « récents ».
  lastOpenedAt?: number;
  // Vignette JPEG downscalée de la hero (screenshots.desktop), générée à la
  // demande et mise en cache ici pour garder la liste légère. Absente tant
  // qu'aucune carte du projet n'a été affichée.
  thumbnail?: string;
};

export type DAStore = {
  url: string;
  setUrl: (url: string) => void;

  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  loadProjectData: (project: StoredProject) => void;

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
  setSelectedColors: (colors: string[]) => void;

  // Orientation des bandeaux de l'asset "Couleurs" : horizontal = strips
  // empilés (flex column), vertical = bandes côte à côte (flex row).
  colorsOrientation: 'horizontal' | 'vertical';
  setColorsOrientation: (orientation: 'horizontal' | 'vertical') => void;

  // Marge bgColor autour des visuels desktop (Interface / Couverture).
  // false = le contenu remplit la frame bord à bord (plus propre sur fond blanc).
  desktopPadding: boolean;
  setDesktopPadding: (enabled: boolean) => void;

  bgColor: string;
  setBgColor: (hex: string) => void;

  fontName: string;
  fontUrl: string | undefined;
  setFont: (name: string, url?: string) => void;

  borderRadius: number;
  setBorderRadius: (radius: number) => void;

  localFontFile: string | null;
  setLocalFontFile: (file: string | null) => void;

  // Custom fonts imported by the user, keyed by font name — so an imported
  // file stays tied to its typeface when switching between detected fonts.
  importedFonts: Record<string, string>;
  importFont: (name: string, dataUrl: string) => void;

  theme: 'dark' | 'light';
  toggleTheme: () => void;

  agencyLogo: string;
  setAgencyLogo: (logo: string) => void;

  cardImage: string | null;
  setCardImage: (img: string | null) => void;

  cardLogoScale: number;
  setCardLogoScale: (scale: number) => void;

  cardImageOpacity: number;
  setCardImageOpacity: (opacity: number) => void;

  // Flou (px) du fond de la frame 04 (Browser Full).
  frame4Blur: number;
  setFrame4Blur: (px: number) => void;

  // Typo affichée en MAJUSCULES dans l'aperçu (frame 01). Initialisé depuis la
  // détection du scrape (titres en text-transform: uppercase), puis togglable.
  fontUppercase: boolean;
  setFontUppercase: (v: boolean) => void;

  // Wording du titre des frames showcase client (06 & 07) :
  // 'focus' = « Focus Client », 'nouvelle' = « Nouvelle réalisation ».
  showcaseWording: 'focus' | 'nouvelle';
  setShowcaseWording: (w: 'focus' | 'nouvelle') => void;

  // Carrousel « Showcase » 16:9 (par projet) : liste de slides éditables. Les
  // modifs de mesh passent par updateShowcaseSlide(id, { mesh }) depuis l'éditeur.
  showcaseSlides: ShowcaseSlide[];
  setShowcaseSlides: (slides: ShowcaseSlide[]) => void;
  addShowcaseSlide: () => void;
  removeShowcaseSlide: (id: string) => void;
  updateShowcaseSlide: (id: string, patch: Partial<ShowcaseSlide>) => void;
  // Reset : une slide (agencement par défaut de sa position, id/nom conservés)
  // ou tout le carrousel (4 slides par défaut reseedées depuis la palette).
  resetShowcaseSlide: (id: string) => void;
  resetShowcaseSlides: () => void;
  // Dupliquer une slide (copie insérée juste après) / la déplacer d'un cran.
  duplicateShowcaseSlide: (id: string) => void;
  moveShowcaseSlide: (id: string, dir: -1 | 1) => void;
  // Couleur de fond commune du carrousel (projet-global).
  showcaseMeshBase: string;
  setShowcaseMeshBase: (color: string) => void;

  // Fond animé du Motion Studio (par projet) — patch partiel.
  motionBg: MotionBgSettings;
  setMotionBg: (patch: Partial<MotionBgSettings>) => void;

  // Zone de capture globale : position verticale (0 = haut, 1 = bas) de la
  // région de la page affichée par les visuels desktop/mobile. 0 = comportement
  // par défaut (haut de page). Réglée via le sélecteur de zone.
  regionY: number;
  setRegionY: (v: number) => void;

  // Per-frame screenshot overrides. setCustomScreenshot(key, null) removes
  // the override and falls back to the scraped image.
  customScreenshots: Record<string, string>;
  setCustomScreenshot: (slotKey: string, dataUrl: string | null) => void;
  clearCustomScreenshots: () => void;

  // Noms d'export éditables par frame (cas client). setFrameName(id, '')
  // efface l'override → retour au libellé par défaut.
  frameNames: Record<string, string>;
  setFrameName: (frameId: string, name: string) => void;

  // User-uploaded logos that show up alongside the scraped ones.
  customLogos: string[];
  addCustomLogo: (dataUrl: string) => void;
  removeCustomLogo: (dataUrl: string) => void;

  // Module actif (persisté) : 'client' = cas client (scrape + visuels/contenu/
  // aperçu) ; 'agence' = bibliothèque d'illustrations du site agence.
  appModule: 'client' | 'agence';
  setAppModule: (m: 'client' | 'agence') => void;

  // Bibliothèque GLOBALE d'illustrations « site agence » (DA TEAPS figée),
  // persistée en IndexedDB (hors projet client, jamais en localStorage car
  // les photos sont des dataURL lourds).
  agencyAssets: SectorAsset[];
  setAgencyAssets: (list: SectorAsset[]) => void;
  addAgencyAsset: (role: 'hero' | 'content') => void;
  removeAgencyAsset: (id: string) => void;
  updateAgencyAsset: (id: string, patch: Partial<SectorAsset>) => void;

  screenshotDelay: number;
  setScreenshotDelay: (delay: number) => void;

  // Zoom navigateur appliqué aux captures desktop (1 = 100%). Permet de
  // dézoomer (<1) pour élargir le viewport et éviter les bascules "écran
  // trop petit" sur certains sites responsive.
  scrapeZoom: number;
  setScrapeZoom: (zoom: number) => void;

  // Facteur de résolution à l'export PNG (1 = natif, 2 = double pour des visuels
  // plus nets sur les réseaux). S'applique à l'export unitaire ET au pack ZIP.
  exportScale: number;
  setExportScale: (scale: number) => void;

  // Format des exports client (pack + unitaires + carrousels) : PNG (défaut)
  // ou JPEG (fichiers bien plus légers, sans transparence). Les assets agence
  // (fond transparent voulu) restent toujours en PNG.
  exportFormat: 'png' | 'jpeg';
  setExportFormat: (f: 'png' | 'jpeg') => void;

  // Nombre de mockups affichés sur les planches « showcase » (frames 09/10).
  boardMockups: number;
  setBoardMockups: (n: number) => void;

  // Ombre portée des mockups (navigateur / téléphone) sur toutes les frames.
  dropShadow: boolean;
  setDropShadow: (v: boolean) => void;

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

  scrapeLogs: { time: number; msg: string }[];
  setScrapeLogs: (logs: { time: number; msg: string }[]) => void;
  appendScrapeLog: (entry: { time: number; msg: string }) => void;
  clearScrapeLogs: () => void;

  generatedContent: GeneratedContent | null;
  setGeneratedContent: (c: GeneratedContent | null) => void;
  contentChips: string[];
  setContentChips: (chips: string[]) => void;
  contentBrief: string;
  setContentBrief: (brief: string) => void;

  // Preview réseaux sociaux — état du post, par projet.
  previewCaption: string;
  setPreviewCaption: (v: string) => void;
  previewImages: PreviewImageRef[];
  setPreviewImages: (v: PreviewImageRef[]) => void;
  previewFormat: PreviewFormat;
  setPreviewFormat: (v: PreviewFormat) => void;

  // Identité du compte agence sur les cartes (globale, persistée en localStorage).
  socialIdentity: SocialIdentity;
  setSocialIdentity: (v: Partial<SocialIdentity>) => void;

  geminiApiKeys: GeminiApiKey[];
  activeApiKeyId: string | null;
  setGeminiApiKeys: (keys: GeminiApiKey[]) => void;
  setActiveApiKeyId: (id: string | null) => void;

  // Clé Pexels personnalisée (banque d'images « Assets secteur »), stockée en
  // localStorage. Repli sur PEXELS_API_KEY côté serveur si vide.
  pexelsApiKey: string;
  setPexelsApiKey: (key: string) => void;

  geminiModel: string;
  setGeminiModel: (model: string) => void;
  resetGeminiModel: () => void;

  contentPrompt: string;
  setContentPrompt: (prompt: string) => void;
  resetContentPrompt: () => void;

  sitemapUrls: string[];
  sitemapSource: string | null;
  sitemapStatus: 'idle' | 'loading' | 'loaded' | 'empty' | 'error';
  sitemapError: string | null;
  includeSitemapInContent: boolean;
  setSitemap: (data: { urls: string[]; source: string | null; status: 'idle' | 'loading' | 'loaded' | 'empty' | 'error'; error?: string | null }) => void;
  setIncludeSitemapInContent: (v: boolean) => void;
};
