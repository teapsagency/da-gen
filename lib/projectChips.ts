// Table des « chips » décrivant un projet (type de site → techno → secteur →
// services). Partagée entre le sélecteur du module Contenu (`ChipSelector`) et
// le Motion Studio (pastilles « ce qu'on a réalisé »). Donnée pure, sans React.

export type Chip = {
  id: string;
  label: string;
  unlocks?: string;
};

export type ChipGroup = {
  id: string;
  label: string;
  multi: boolean;
  maxSelect?: number;
  chips: Chip[];
};

export const CHIP_GROUPS: ChipGroup[] = [
  {
    id: "project-type",
    label: "Type de projet",
    multi: false,
    chips: [
      { id: "Refonte", label: "Refonte", unlocks: "site-type" },
      { id: "Création de zéro", label: "Création de zéro", unlocks: "site-type" },
      { id: "Ajout de fonctionnalités", label: "Ajout de fonctionnalités", unlocks: "feature-type" },
    ],
  },
  {
    id: "site-type",
    label: "Type de site",
    multi: false,
    chips: [
      { id: "Vitrine", label: "Vitrine", unlocks: "tech-cms" },
      { id: "E-commerce", label: "E-commerce", unlocks: "tech-ecom" },
      { id: "Application web", label: "Application web", unlocks: "tech-app" },
      { id: "Blog / Magazine", label: "Blog", unlocks: "sector" },
      { id: "Portfolio", label: "Portfolio", unlocks: "tech-cms" },
      { id: "Landing page", label: "Landing page", unlocks: "sector" },
    ],
  },
  {
    id: "feature-type",
    label: "Fonctionnalité principale",
    multi: false,
    chips: [
      { id: "Authentification", label: "Authentification", unlocks: "sector" },
      { id: "Paiement en ligne", label: "Paiement", unlocks: "sector" },
      { id: "Dashboard / Back-office", label: "Dashboard", unlocks: "sector" },
      { id: "Intégration API", label: "Intégration API", unlocks: "sector" },
    ],
  },
  {
    id: "tech-cms",
    label: "Technologie",
    multi: false,
    chips: [
      { id: "WordPress", label: "WordPress", unlocks: "sector" },
      { id: "Webflow", label: "Webflow", unlocks: "sector" },
      { id: "Framer", label: "Framer", unlocks: "sector" },
      { id: "Développement sur-mesure", label: "Sur-mesure", unlocks: "sector" },
    ],
  },
  {
    id: "tech-ecom",
    label: "Plateforme e-commerce",
    multi: false,
    chips: [
      { id: "Shopify", label: "Shopify", unlocks: "sector" },
      { id: "WooCommerce", label: "WooCommerce", unlocks: "sector" },
      { id: "PrestaShop", label: "PrestaShop", unlocks: "sector" },
      { id: "Développement custom", label: "Custom", unlocks: "sector" },
    ],
  },
  {
    id: "tech-app",
    label: "Stack technique",
    multi: false,
    chips: [
      { id: "Next.js", label: "Next.js", unlocks: "sector" },
      { id: "React", label: "React", unlocks: "sector" },
      { id: "Vue.js", label: "Vue.js", unlocks: "sector" },
      { id: "Autre stack", label: "Autre", unlocks: "sector" },
    ],
  },
  {
    id: "sector",
    label: "Secteur d'activité",
    multi: false,
    chips: [
      { id: "Restauration", label: "Restauration", unlocks: "services" },
      { id: "Immobilier", label: "Immobilier", unlocks: "services" },
      { id: "Santé / Bien-être", label: "Santé / Bien-être", unlocks: "services" },
      { id: "Mode / Beauté", label: "Mode / Beauté", unlocks: "services" },
      { id: "Sport / Fitness", label: "Sport / Fitness", unlocks: "services" },
      { id: "Éducation / Formation", label: "Éducation / Formation", unlocks: "services" },
      { id: "Tourisme / Hôtellerie", label: "Tourisme / Hôtellerie", unlocks: "services" },
      { id: "Industrie / BTP", label: "Industrie / BTP", unlocks: "services" },
      { id: "Tech / SaaS", label: "Tech / SaaS", unlocks: "services" },
      { id: "Commerce de proximité", label: "Commerce de proximité", unlocks: "services" },
      { id: "Association / ONG", label: "Association / ONG", unlocks: "services" },
      { id: "Autre secteur", label: "Autre", unlocks: "services" },
    ],
  },
  {
    id: "services",
    label: "Services complémentaires",
    multi: true,
    chips: [
      { id: "SEO", label: "SEO" },
      { id: "Branding", label: "Branding" },
      { id: "Motion design", label: "Motion design" },
      { id: "Refonte UX/UI", label: "Refonte UX/UI" },
      { id: "Copywriting", label: "Copywriting" },
      { id: "Maintenance", label: "Maintenance" },
      { id: "Tunnel de conversion", label: "Tunnel de conversion" },
      { id: "Formation client", label: "Formation" },
      { id: "Stratégie digitale", label: "Stratégie digitale" },
      { id: "Analytics & tracking", label: "Analytics & tracking" },
      { id: "Publicité en ligne", label: "Publicité en ligne" },
      { id: "Emailing", label: "Emailing" },
      { id: "Réseaux sociaux", label: "Réseaux sociaux" },
      { id: "Accessibilité", label: "Accessibilité" },
      { id: "Hébergement", label: "Hébergement" },
      { id: "Photographie", label: "Photographie" },
    ],
  },
];

export const ROOT_GROUP_ID = "project-type";

export function getDownstreamChips(fromGroup: ChipGroup, chipId: string): Set<string> {
  const result = new Set<string>();
  const chip = fromGroup.chips.find((c) => c.id === chipId);
  if (!chip?.unlocks) return result;

  const toVisit = [chip.unlocks];
  const visited = new Set<string>();

  while (toVisit.length > 0) {
    const groupId = toVisit.pop()!;
    if (visited.has(groupId)) continue;
    visited.add(groupId);

    const group = CHIP_GROUPS.find((g) => g.id === groupId);
    if (!group) continue;

    for (const c of group.chips) {
      result.add(c.id);
      if (c.unlocks) toVisit.push(c.unlocks);
    }
  }

  return result;
}

// ─── Tags affichés dans la vidéo Motion (pastilles « ce qu'on a réalisé ») ───
// On ne garde que le concret : type de site, fonctionnalité, techno et services.
// « Type de projet » et « Secteur » sont volontairement exclus (peu parlants à
// l'écran). Cap d'affichage = pastilles lisibles à l'écran.
const MOTION_TAG_GROUPS = ["site-type", "feature-type", "tech-cms", "tech-ecom", "tech-app", "services"];
export const MOTION_TAG_LIMIT = 6;

// ─── Titre de la scène « prestation » du Motion ───
// « Création de site vitrine », « Refonte d'application web »… construit
// depuis le type de projet + le type de site sélectionnés.
const SITE_HEADLINE: Record<string, string> = {
  "Vitrine": "site vitrine",
  "E-commerce": "site e-commerce",
  "Application web": "application web",
  "Blog / Magazine": "blog",
  "Portfolio": "portfolio",
  "Landing page": "landing page",
};

export function resolveMotionHeadline(selected: string[]): string {
  const chosen = new Set(selected);
  if (chosen.has("Ajout de fonctionnalités")) return "Ajout de fonctionnalités";
  const site = Object.keys(SITE_HEADLINE).find((id) => chosen.has(id));
  const siteLabel = site ? SITE_HEADLINE[site] : null;
  // Élision : « de » devant consonne, « d' » devant voyelle (application…).
  const de = (s: string) => (/^[aeiouyéèê]/i.test(s) ? `d'${s}` : `de ${s}`);
  if (siteLabel) {
    if (chosen.has("Refonte")) return `Refonte ${de(siteLabel)}`;
    if (chosen.has("Création de zéro")) return `Création ${de(siteLabel)}`;
    return siteLabel.charAt(0).toUpperCase() + siteLabel.slice(1);
  }
  if (chosen.has("Refonte")) return "Refonte de site";
  if (chosen.has("Création de zéro")) return "Création de site";
  return "Nouvelle réalisation";
}

/**
 * Résout la sélection de chips en labels courts à afficher dans la vidéo,
 * dans l'ordre des groupes (type de site → techno → services), capé.
 */
export function resolveMotionTags(selected: string[], limit = MOTION_TAG_LIMIT): string[] {
  const chosen = new Set(selected);
  const tags: string[] = [];
  for (const groupId of MOTION_TAG_GROUPS) {
    const group = CHIP_GROUPS.find((g) => g.id === groupId);
    if (!group) continue;
    for (const chip of group.chips) {
      if (chosen.has(chip.id)) tags.push(chip.label);
    }
  }
  return tags.slice(0, limit);
}
