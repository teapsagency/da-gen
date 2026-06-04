import type { AssetRatio, AssetElement, AssetElementKey, SectorAsset } from '@/types';

// Accent de marque TEAPS (bleu royal) — DA figée des assets « site agence ».
export const TEAPS_ACCENT = '#2D2DFF';

// Position par défaut (centre, 0..1) de chaque type d'élément autour de l'image.
export const DEFAULT_ELEMENT_POS: Record<AssetElementKey, AssetElement> = {
  icon: { x: 0.12, y: 0.14 },
  brand: { x: 0.5, y: 0.1 },
  logo: { x: 0.15, y: 0.88 },
  pill: { x: 0.8, y: 0.4 },
  badge: { x: 0.85, y: 0.87 },
};

// Un thème = une graine pour un asset : requête Pexels, icône, libellés. La table
// n'est qu'un point de départ — chaque champ reste éditable par asset dans l'UI.
export type ThemePreset = {
  label: string;     // libellé humain ("Avocats")
  query: string;     // requête de recherche Pexels
  iconName: string;  // nom d'icône Lucide
  pill: string;      // libellé de la pilule (coin bas-gauche)
  badge: string;     // libellé du badge (coin bas-droite)
};

// Secteurs & technos des pages SEO TEAPS. Ajouter une page = ajouter une ligne.
// La clé est le slug normalisé (sans préfixe "agence-web-").
export const SECTOR_THEMES: Record<string, ThemePreset> = {
  avocat:      { label: 'Avocats',      query: 'cabinet avocat justice',        iconName: 'Scale',           pill: 'Faites briller votre cabinet',  badge: 'Avocats' },
  juridique:   { label: 'Juridique',    query: 'droit justice tribunal',        iconName: 'Gavel',           pill: 'Faites briller votre cabinet',  badge: 'Juridique' },
  nautisme:    { label: 'Nautisme',     query: 'voilier port mer bateau',       iconName: 'Anchor',          pill: 'Mettez le cap sur le digital',  badge: 'Nautisme' },
  viticole:    { label: 'Viticole',     query: 'vignoble vin raisin',           iconName: 'Wine',            pill: 'Sublimez votre domaine',        badge: 'Viticole' },
  startup:     { label: 'Startup',      query: 'startup bureau equipe moderne', iconName: 'Rocket',          pill: 'Accélérez votre croissance',    badge: 'Startup' },
  shopify:     { label: 'Shopify',      query: 'e-commerce boutique en ligne',  iconName: 'ShoppingBag',     pill: 'Boostez vos ventes en ligne',   badge: 'Shopify' },
  wordpress:   { label: 'WordPress',    query: 'site web ordinateur bureau',    iconName: 'Globe',           pill: 'Un site qui vous ressemble',    badge: 'WordPress' },
  ecommerce:   { label: 'E-commerce',   query: 'e-commerce colis livraison',    iconName: 'ShoppingCart',    pill: 'Boostez vos ventes en ligne',   badge: 'E-commerce' },
  restaurant:  { label: 'Restaurant',   query: 'restaurant cuisine gastronomie',iconName: 'UtensilsCrossed', pill: 'Attirez plus de clients',       badge: 'Restaurant' },
  immobilier:  { label: 'Immobilier',   query: 'immobilier maison architecture',iconName: 'Building2',        pill: 'Valorisez vos biens',           badge: 'Immobilier' },
  sante:       { label: 'Santé',        query: 'cabinet medical sante',         iconName: 'Stethoscope',     pill: 'Rassurez vos patients',         badge: 'Santé' },
  btp:         { label: 'BTP',          query: 'chantier construction batiment',iconName: 'HardHat',         pill: 'Construisez votre présence',    badge: 'BTP' },
  beaute:      { label: 'Beauté',       query: 'salon beaute coiffure',         iconName: 'Scissors',        pill: 'Révélez votre image',           badge: 'Beauté' },
  tourisme:    { label: 'Tourisme',     query: 'voyage tourisme paysage',       iconName: 'Plane',           pill: 'Faites voyager vos clients',    badge: 'Tourisme' },
  sport:       { label: 'Sport',        query: 'sport salle fitness',           iconName: 'Dumbbell',        pill: 'Donnez le rythme',              badge: 'Sport' },
  formation:   { label: 'Formation',    query: 'formation education etudiants',  iconName: 'GraduationCap',  pill: 'Formez votre audience',         badge: 'Formation' },
};

// Thème de repli quand le slug est inconnu de la table.
export const DEFAULT_THEME: ThemePreset = {
  label: 'Sur-mesure',
  query: 'bureau entreprise moderne',
  iconName: 'Briefcase',
  pill: 'Faites briller votre activité',
  badge: '',
};

// Dimensions de sortie par ratio (long-edge fixe ~1600px ; ×2 à l'export).
export const ASSET_DIMS: Record<AssetRatio, { w: number; h: number }> = {
  '3:2':  { w: 1600, h: 1067 },
  '4:3':  { w: 1600, h: 1200 },
  '16:9': { w: 1600, h: 900 },
  '1:1':  { w: 1400, h: 1400 },
};

export const ASSET_RATIOS: AssetRatio[] = ['3:2', '4:3', '16:9', '1:1'];

// Déduit le thème depuis l'URL : on isole le dernier segment du pathname, on
// retire les préfixes "agence-web-"/"agence-", puis on matche la table.
export function deriveTheme(url: string | undefined): ThemePreset & { slug: string } {
  let path = '';
  try {
    path = new URL(url ?? '').pathname.toLowerCase();
  } catch {
    path = (url ?? '').toLowerCase();
  }
  const slug = (path.replace(/\/+$/, '').split('/').pop() ?? '')
    .replace(/^agence-web-/, '')
    .replace(/^agence-/, '')
    .replace(/^web-/, '');

  const key = Object.keys(SECTOR_THEMES).find((k) => slug === k || slug.includes(k));
  if (key) return { slug, ...SECTOR_THEMES[key] };

  // Slug inconnu → on s'en sert comme requête de recherche, sinon repli pur.
  if (slug) {
    const human = slug.replace(/-/g, ' ');
    return { slug, ...DEFAULT_THEME, query: human, badge: human };
  }
  return { slug: '', ...DEFAULT_THEME };
}

// IDs d'asset stables (Date.now() autorisé côté app ; compteur pour l'unicité
// intra-ms). Pas crypto.randomUUID pour rester compatible navigateurs anciens.
let assetSeq = 0;
function newAssetId(): string {
  assetSeq += 1;
  return `sa_${Date.now().toString(36)}_${assetSeq.toString(36)}`;
}

// Fabrique un asset seedé depuis le thème de l'URL.
export function makeSectorAsset(
  role: 'hero' | 'content',
  url: string | undefined,
  ratio: AssetRatio = role === 'hero' ? '16:9' : '4:3',
): SectorAsset {
  const t = deriveTheme(url);
  return {
    id: newAssetId(),
    role,
    ratio,
    photo: { kind: 'none' },
    query: t.query,
    iconName: t.iconName,
    pill: t.pill,
    badge: t.badge || t.label,
    imageScale: 0.7,
    // Par défaut : icône + logo TEAPS + pilule autour de l'image.
    elements: {
      icon: DEFAULT_ELEMENT_POS.icon,
      logo: DEFAULT_ELEMENT_POS.logo,
      pill: DEFAULT_ELEMENT_POS.pill,
    },
  };
}

// Migration des assets persistés à l'ancien format (slots/veil) vers elements.
export function migrateAssetShape(raw: unknown): SectorAsset {
  const a = raw as SectorAsset & {
    slots?: { icon?: boolean; logo?: boolean; pill?: boolean; badge?: boolean };
    veil?: number;
  };
  if (a.elements) return a; // déjà au nouveau format
  const slots = a.slots ?? { icon: true, logo: true, pill: true, badge: false };
  const elements: Partial<Record<AssetElementKey, AssetElement>> = {};
  if (slots.icon) elements.icon = DEFAULT_ELEMENT_POS.icon;
  if (slots.logo) elements.logo = DEFAULT_ELEMENT_POS.logo;
  if (slots.pill) elements.pill = DEFAULT_ELEMENT_POS.pill;
  if (slots.badge) elements.badge = DEFAULT_ELEMENT_POS.badge;
  if (a.brandSlug) elements.brand = DEFAULT_ELEMENT_POS.brand;
  return { ...a, imageScale: a.imageScale ?? 0.7, elements };
}
