"use client";

import React from "react";
import { Plus, Check } from "lucide-react";

type Chip = {
  id: string;
  label: string;
  unlocks?: string;
};

type ChipGroup = {
  id: string;
  label: string;
  multi: boolean;
  maxSelect?: number;
  chips: Chip[];
};

const CHIP_GROUPS: ChipGroup[] = [
  {
    id: "project-type",
    label: "Type de projet",
    multi: false,
    chips: [
      { id: "Refonte", label: "Refonte", unlocks: "site-type" },
      { id: "Création de 0", label: "Création de 0", unlocks: "site-type" },
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

const ROOT_GROUP_ID = "project-type";

type Props = {
  selected: string[];
  onChange: (chips: string[]) => void;
};

export function ChipSelector({ selected, onChange }: Props) {
  const visibleGroups = React.useMemo(() => {
    const visible: ChipGroup[] = [];
    const visibleIds = new Set<string>([ROOT_GROUP_ID]);

    for (const group of CHIP_GROUPS) {
      if (!visibleIds.has(group.id)) continue;
      visible.push(group);
      for (const chip of group.chips) {
        if (chip.unlocks && selected.includes(chip.id)) {
          visibleIds.add(chip.unlocks);
        }
      }
    }
    return visible;
  }, [selected]);

  const handleSelect = (group: ChipGroup, chipId: string) => {
    if (group.multi) {
      if (selected.includes(chipId)) {
        onChange(selected.filter((c) => c !== chipId));
      } else {
        if (group.maxSelect) {
          const currentGroupSelected = group.chips.filter((c) => selected.includes(c.id));
          if (currentGroupSelected.length >= group.maxSelect) return;
        }
        onChange([...selected, chipId]);
      }
    } else {
      const groupChipIds = group.chips.map((c) => c.id);
      const previouslySelected = groupChipIds.find((id) => selected.includes(id));

      if (previouslySelected === chipId) {
        const downstream = getDownstreamChips(group, chipId);
        onChange(selected.filter((c) => c !== chipId && !downstream.has(c)));
      } else {
        const oldDownstream = previouslySelected ? getDownstreamChips(group, previouslySelected) : new Set<string>();
        const withoutOld = selected.filter((c) => !groupChipIds.includes(c) && !oldDownstream.has(c));
        onChange([...withoutOld, chipId]);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {visibleGroups.map((group) => {
        const groupSelectedCount = group.chips.filter((c) => selected.includes(c.id)).length;
        const isMulti = group.multi;
        const maxSelect = group.maxSelect;

        return (
          <div key={group.id} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/25">
                {group.label}
              </span>
              {isMulti && maxSelect && (
                <span className="text-[10px] text-foreground/20 font-medium tabular-nums">
                  {groupSelectedCount}/{maxSelect}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.chips.map((chip) => {
                const isSelected = selected.includes(chip.id);
                const isDisabled = isMulti && maxSelect ? !isSelected && groupSelectedCount >= maxSelect : false;

                return (
                  <button
                    key={chip.id}
                    onClick={() => !isDisabled && handleSelect(group, chip.id)}
                    disabled={isDisabled}
                    className={`
                      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
                      border transition-all duration-150 cursor-pointer select-none
                      ${isSelected
                        ? "bg-foreground text-background border-foreground"
                        : "bg-transparent text-foreground/55 border-border hover:border-foreground/25 hover:text-foreground/80"
                      }
                      ${isDisabled ? "opacity-25 cursor-not-allowed" : ""}
                    `}
                  >
                    {isSelected
                      ? <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      : <Plus className="w-2.5 h-2.5" strokeWidth={3} />
                    }
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getDownstreamChips(fromGroup: ChipGroup, chipId: string): Set<string> {
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
