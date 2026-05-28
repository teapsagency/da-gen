"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  /** Optional clamp — when omitted, typed values are accepted as-is. */
  min?: number;
  max?: number;
  /**
   * Snap to step. Skipped when the user types a value outside [min,max] so
   * "freehand" overrides (e.g. typing 250% into a 0-100% slider) round-trip
   * exactly.
   */
  step?: number;
  onChange: (next: number) => void;
  /** Render value → display string (e.g. v => `${Math.round(v*100)}%`). */
  format: (value: number) => string;
  /** Display string → value. Return null if input is unparseable. */
  parse: (raw: string) => number | null;
  className?: string;
  /** Extra width given to the inline input — tune per call site. */
  inputWidth?: number;
};

/**
 * Small label that switches to an editable input on click. Used as the
 * value readout next to a slider so users can type a precise value
 * instead of dragging.
 *
 * Commits on Enter or blur, cancels on Escape. Out-of-range values are
 * clamped to [min, max] rather than rejected — feels less brittle when
 * someone types "150" into a 0-100 slider.
 */
export function EditableValue({
  value,
  min,
  max,
  step,
  onChange,
  format,
  parse,
  className = "",
  inputWidth = 56,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const parsed = parse(draft);
    if (parsed !== null && Number.isFinite(parsed)) {
      let next = parsed;
      // Snap to step ONLY if the value stays within the slider's range —
      // a freehand value like 250% on a 0-100% slider should land exactly,
      // not be rounded to the closest multiple of step.
      const inRange = (min === undefined || next >= min) && (max === undefined || next <= max);
      if (step && inRange) {
        next = Math.round(next / step) * step;
        // Round-trip through string to avoid 0.05 + 0.05 = 0.1000000001 drift.
        next = Number(next.toFixed(6));
      }
      onChange(next);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setEditing(false);
        }}
        onBlur={commit}
        className={`text-xs font-medium text-foreground tabular-nums bg-transparent border-b border-foreground/30 focus:border-foreground/70 outline-none px-0 py-0 text-right ${className}`}
        style={{ width: `${inputWidth}px` }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(format(value));
        setEditing(true);
      }}
      title="Cliquer pour modifier"
      className={`text-xs font-medium text-foreground/60 hover:text-foreground tabular-nums cursor-text px-1 py-0.5 rounded hover:bg-foreground/5 transition-colors ${className}`}
    >
      {format(value)}
    </button>
  );
}

// Common formatters/parsers — keeps call sites tidy.
export const percentFormat = (v: number) => `${Math.round(v * 100)}%`;
export const percentParse = (raw: string): number | null => {
  const n = parseFloat(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n / 100 : null;
};
export const pxFormat = (v: number) => `${Math.round(v)}px`;
export const pxParse = (raw: string): number | null => {
  const n = parseFloat(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
