"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

type Props = {
  /** Nom affiché (override custom déjà résolu, ou libellé par défaut). */
  value: string;
  /** Commit du nom saisi. Chaîne vide = remise au défaut (à gérer côté appelant). */
  onChange: (next: string) => void;
  /** Style du libellé affiché (repris à l'identique sur l'input pour la cohérence). */
  className?: string;
  placeholder?: string;
};

/**
 * Titre éditable au-dessus d'un asset : libellé + crayon au survol, clic pour
 * renommer. Commit sur Entrée ou blur, annulation sur Échap. Le nom pilote le
 * fichier d'export. Vit dans le chrome d'aperçu (hors nœud capturé) → aucun
 * impact sur le PNG.
 */
export function EditableTitle({ value, onChange, className = "", placeholder = "Nom du fichier" }: Props) {
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
    onChange(draft.trim());
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
        placeholder={placeholder}
        // Largeur auto = suit le contenu (field-sizing sur navigateurs récents ;
        // l'attribut size assure le repli partout). Il y a la place sur la ligne.
        size={Math.max(draft.length, placeholder.length, 6)}
        className={`bg-transparent border-b border-foreground/40 focus:border-foreground/80 outline-none px-0 py-0 field-sizing-content w-auto max-w-full ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Cliquer pour renommer le fichier d'export"
      className={`group inline-flex items-center gap-1.5 cursor-text transition-colors ${className}`}
    >
      <span>{value}</span>
      <Pencil className="w-3 h-3 shrink-0 opacity-40 group-hover:opacity-80 transition-opacity" />
    </button>
  );
}
