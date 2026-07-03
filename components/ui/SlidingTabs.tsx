"use client";

import React, { useLayoutEffect, useRef, useState } from "react";

type Tab<T extends string> = { id: T; label: React.ReactNode };

/**
 * Segmented control avec une pilule blanche qui GLISSE : au survol d'un onglet,
 * le fond blanc s'anime vers celui-ci (retour à l'onglet actif quand la souris
 * quitte le groupe). Position/largeur mesurées sur les boutons (offsetLeft/Width),
 * recalculées au survol, au changement de valeur et au resize.
 * Au clic : effet de pression — pilule + label se compressent (scale 0.94) le
 * temps de l'appui, puis se relâchent avec un léger ressort (ease-out-back).
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
  const [pressed, setPressed] = useState<T | null>(null);
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
            // Pression : la pilule se compresse sous le doigt (rapide), puis se
            // relâche avec un léger ressort — même personnalité que la glisse.
            transform: pressed !== null && pressed === target ? "scale(0.94)" : "scale(1)",
            // Position avec un léger dépassement/settle (ressort discret) ; la
            // largeur suit en douceur → effet « glisse et se cale ».
            transition:
              "left 300ms cubic-bezier(0.34, 1.4, 0.5, 1), width 260ms cubic-bezier(0.22, 1, 0.36, 1), transform " +
              (pressed !== null
                ? "100ms cubic-bezier(0.2, 0, 0, 1)"
                : "280ms cubic-bezier(0.34, 1.56, 0.64, 1)"),
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
          onPointerDown={() => setPressed(t.id)}
          onPointerUp={() => setPressed(null)}
          onPointerLeave={() => setPressed((p) => (p === t.id ? null : p))}
          className={`relative z-10 ${itemClassName} py-1.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap select-none ${
            target === t.id ? "text-foreground" : "text-foreground/40"
          }`}
        >
          {/* Le label suit la compression de la pilule (même timing) pour que
              pilule + texte réagissent comme un seul objet. */}
          <span
            className="flex items-center gap-1.5"
            style={{
              transform: pressed === t.id ? "scale(0.94)" : "scale(1)",
              transition:
                pressed === t.id
                  ? "transform 100ms cubic-bezier(0.2, 0, 0, 1)"
                  : "transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}
