"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Trash2, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useDAStore } from "@/store/daStore";
import type { ProjectMeta } from "@/types";
import {
  listProjects,
  loadProject,
  deleteProject,
  clearAllProjects,
  touchProject,
} from "@/lib/projectStorage";
import { ProjectCard } from "@/components/ui/ProjectCard";

export function HistoryPanel({ onProjectOpen }: { onProjectOpen: () => void }) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const activeProjectId = useDAStore((s) => s.activeProjectId);
  const loadProjectData = useDAStore((s) => s.loadProjectData);
  const resetProject = useDAStore((s) => s.resetProject);

  // Reloads the list — used by the delete handlers.
  const refresh = useCallback(async () => {
    setProjects(await listProjects());
  }, []);

  // Initial load.
  useEffect(() => {
    let active = true;
    listProjects().then((list) => {
      if (!active) return;
      setProjects(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleOpen = async (id: string) => {
    const project = await loadProject(id);
    if (project && project.scrapeResult) {
      await touchProject(id);
      loadProjectData(project);
      onProjectOpen();
    } else {
      toast.error("Ce projet est introuvable ou corrompu.");
      refresh();
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const handleDeleteSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    for (const id of ids) {
      await deleteProject(id);
      // Suppression du projet ouvert → on vide le canvas, sinon le prochain
      // auto-save le ressusciterait.
      if (id === activeProjectId) resetProject();
    }
    clearSelection();
    await refresh();
    toast.success(
      `${ids.length} projet${ids.length > 1 ? "s" : ""} supprimé${ids.length > 1 ? "s" : ""}.`,
    );
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        "Supprimer définitivement TOUT l'historique des projets ? Cette action est irréversible.",
      )
    )
      return;
    await clearAllProjects();
    resetProject();
    clearSelection();
    await refresh();
    toast.success("Historique vidé.");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-foreground/30">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-foreground/[0.04] border border-border flex items-center justify-center">
          <Clock className="w-5 h-5 text-foreground/30" />
        </div>
        <p className="text-sm font-bold text-foreground">Aucun projet pour l&apos;instant</p>
        <p className="text-[12px] text-foreground/40 max-w-xs leading-relaxed">
          Les sites que tu analyses sont enregistrés ici automatiquement. Tu pourras y revenir à
          tout moment.
        </p>
      </div>
    );
  }

  const selCount = selected.size;

  return (
    <div className="flex flex-col gap-4">
      {/* Barre d'actions : compteur + suppressions. Bascule en mode sélection
          dès qu'au moins une carte est cochée. */}
      <div className="flex items-center justify-between gap-3 min-h-[34px]">
        {selCount > 0 ? (
          <>
            <span className="text-[12px] font-semibold text-foreground/60">
              {selCount} sélectionné{selCount > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="text-[11px] font-semibold text-foreground/50 hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-foreground/5 transition-all cursor-pointer"
              >
                Annuler la sélection
              </button>
              <button
                onClick={handleDeleteSelected}
                className="text-[11px] font-semibold text-red-500 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-red-500/10 hover:bg-red-500/15 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer ({selCount})
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-[12px] font-semibold text-foreground/40">
              {projects.length} projet{projects.length > 1 ? "s" : ""} enregistré
              {projects.length > 1 ? "s" : ""}
            </span>
            <button
              onClick={handleClearAll}
              className="text-[11px] font-semibold text-red-500/70 hover:text-red-500 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-red-500/5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer tout l&apos;historique
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            meta={p}
            isActive={p.id === activeProjectId}
            onOpen={() => handleOpen(p.id)}
            selectable
            selected={selected.has(p.id)}
            onToggleSelect={() => toggleSelect(p.id)}
          />
        ))}
      </div>
    </div>
  );
}
