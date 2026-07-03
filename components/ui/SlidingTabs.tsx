"use client";

import React, { useLayoutEffect, useRef, useState } from "react";

type Tab<T extends string> = { id: T; label: React.ReactNode };

/**
 * Segmented control avec une pilule blanche qui GLISSE : au survol d'un onglet,
 * le fond blanc s'anime vers celui-ci (retour à l'onglet actif quand la souris
 * quitte le groupe). Position/largeur mesurées sur les boutons (offsetLeft/Width),
 * recalculées au survol, au changement de valeur et au resize.
 */
export function SlidingTabs<T extends string>({
  tabs,
  value,
  onChange,
  itemClassName = "px-4",
}: {
  tabs: Tab<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Classes de padding horizontal des onglets (défaut px-4 ; px-3 pour compact). */
  itemClassName?: string;
}) {
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [hovered, setHovered] = useState<T | null>(null);
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);

  const target = hovered ?? value;

  useLayoutEffect(() => {
    const sync = () => {
      const el = btnRefs.current[hovered ?? value];
      if (!el) return;
      const left = el.offsetLeft;
      const width = el.offsetWidth;
      // Garde d'égalité → pas de nouvelle référence si inchangé (évite la boucle).
      setInd((prev) => (prev && prev.left === left && prev.width === width ? prev : { left, width }));
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  });

  return (
    <div
      onMouseLeave={() => setHovered(null)}
      className="relative flex bg-foreground/[0.04] rounded-lg p-0.5 gap-0.5 w-fit"
    >
      {ind && (
        <span
          aria-hidden
          className="absolute top-0.5 bottom-0.5 rounded-md bg-card shadow-sm pointer-events-none"
          style={{
            left: ind.left,
            width: ind.width,
            // Position avec un léger dépassement/settle (ressort discret) ; la
            // largeur suit en douceur → effet « glisse et se cale ».
            transition:
              "left 300ms cubic-bezier(0.34, 1.4, 0.5, 1), width 260ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      )}
      {tabs.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            btnRefs.current[t.id] = el;
          }}
          onClick={() => onChange(t.id)}
          onMouseEnter={() => setHovered(t.id)}
          className={`relative z-10 ${itemClassName} py-1.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            target === t.id ? "text-foreground" : "text-foreground/40"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
