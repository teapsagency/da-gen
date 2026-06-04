import * as simpleIcons from 'simple-icons';

export type BrandLogo = { slug: string; title: string; hex: string; path: string };

// Tout le set Simple Icons (~3000 marques), trié par titre. Recherche dans le
// picker (capée à l'affichage). Imports nommés non tree-shakés ici (volontaire :
// on veut l'ensemble), bundle accepté pour un outil interne.
const ALL = Object.values(simpleIcons) as Array<Partial<BrandLogo>>;

export const BRAND_LOGOS: BrandLogo[] = ALL
  .filter((i): i is BrandLogo => !!(i && i.slug && i.title && i.hex && i.path))
  .sort((a, b) => a.title.localeCompare(b.title));

export const BRAND_MAP: Record<string, BrandLogo> = Object.fromEntries(
  BRAND_LOGOS.map((b) => [b.slug, b]),
);
