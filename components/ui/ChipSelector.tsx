"use client";

import React from "react";
import { Plus, Check } from "lucide-react";
import { CHIP_GROUPS, ROOT_GROUP_ID, getDownstreamChips, type ChipGroup } from "@/lib/projectChips";

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
