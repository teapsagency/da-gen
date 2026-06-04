import {
  siShopify, siWordpress, siElementor, siWoocommerce, siPrestashop, siWebflow,
  siWix, siSquarespace, siDrupal, siJoomla, siFramer, siBigcommerce, siGhost,
  siWpengine, siStrapi, siContentful, siSanity, siNextdotjs, siReact, siVuedotjs,
  siLaravel, siSymfony, siPhp, siNodedotjs, siTailwindcss, siBootstrap, siNetlify,
  siVercel, siCloudflare, siGoogleads, siGoogleanalytics, siGoogletagmanager,
  siHubspot, siMailchimp, siStripe, siPaypal, siGoogle, siMeta, siInstagram,
  siFacebook, siYoutube, siTiktok, siX, siPinterest, siWhatsapp, siFigma,
} from 'simple-icons';

export type BrandLogo = { slug: string; title: string; hex: string; path: string };

// Set curé de logos de marque pertinents pour les pages techno/secteur TEAPS
// (CMS, e-commerce, frameworks, hébergeurs, marketing, social). Extensible :
// ajouter l'import `si…` + l'entrée ci-dessous. Source : simple-icons (libre).
const RAW = [
  siShopify, siWordpress, siElementor, siWoocommerce, siPrestashop, siWebflow,
  siWix, siSquarespace, siDrupal, siJoomla, siFramer, siBigcommerce, siGhost,
  siWpengine, siStrapi, siContentful, siSanity, siNextdotjs, siReact, siVuedotjs,
  siLaravel, siSymfony, siPhp, siNodedotjs, siTailwindcss, siBootstrap, siNetlify,
  siVercel, siCloudflare, siGoogleads, siGoogleanalytics, siGoogletagmanager,
  siHubspot, siMailchimp, siStripe, siPaypal, siGoogle, siMeta, siInstagram,
  siFacebook, siYoutube, siTiktok, siX, siPinterest, siWhatsapp, siFigma,
];

export const BRAND_LOGOS: BrandLogo[] = RAW.map((i) => ({
  slug: i.slug,
  title: i.title,
  hex: i.hex,
  path: i.path,
}));

export const BRAND_MAP: Record<string, BrandLogo> = Object.fromEntries(
  BRAND_LOGOS.map((b) => [b.slug, b]),
);
