import React, { useState, useCallback, useEffect } from "react";
import { useDAStore } from "@/store/daStore";
import { Slider } from "@/components/ui/slider";

const PRESETS = [
  { label: "Aucun", value: 0 },
  { label: "Petit", value: 8 },
  { label: "Moyen", value: 28 },
  { label: "Grand", value: 64 },
];

export const RadiusSelector = () => {
  const { borderRadius, setBorderRadius } = useDAStore();
  // Local state for smooth dragging — commits to store only on release
  const [localRadius, setLocalRadius] = useState(borderRadius);

  // Sync local state when store changes from preset buttons
  useEffect(() => {
    setLocalRadius(borderRadius);
  }, [borderRadius]);

  const handleSliderChange = useCallback((value: number[]) => {
    setLocalRadius(value[0]);
  }, []);

  const handleSliderCommit = useCallback(
    (value: number[]) => {
      setBorderRadius(value[0]);
    },
    [setBorderRadius],
  );

  return (
    <div className="flex flex-col gap-4 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground/40">
          Arrondi des coins
        </span>
        <span className="text-xs font-medium text-foreground/60 tabular-nums">
          {localRadius}px
        </span>
      </div>

      {/* Slider — commits only on release to avoid lag */}
      <Slider
        value={[localRadius]}
        onValueChange={handleSliderChange}
        onValueCommit={handleSliderCommit}
        min={0}
        max={80}
        step={1}
        className="w-full"
      />

      {/* Preset buttons */}
      <div className="flex gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => setBorderRadius(p.value)}
            className={`flex-1 h-8 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
              borderRadius === p.value
                ? "border-foreground bg-foreground/5 text-foreground"
                : "border-border text-foreground/40 hover:border-foreground/20 hover:text-foreground/70"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
};
