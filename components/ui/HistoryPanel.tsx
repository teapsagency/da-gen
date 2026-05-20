"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Trash2, Loader2, Globe, Clock, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { useDAStore } from "@/store/daStore";
import type { ProjectMeta } from "@/types";
import {
  listProjects,
  loadProject,
  deleteProject,
  clearAllProjects,
} from "@/lib/projectStorage";
import { formatWhen } from "@/lib/format";

export function HistoryPanel({ onProjectOpen }: { onProjectOpen: () => void }) {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
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
    return () => { active = false; };
  }, []);

  const handleOpen = async (id: string) => {
    const project = await loadProject(id);
    if (project && project.scrapeResult) {
      loadProjectData(project);
      onProjectOpen();
    } else {
      toast.error("Ce projet est introuvable ou corrompu.");
      refresh();
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteProject(id);
    // The deleted project is the one currently open → clear the canvas,
    // otherwise the next auto-save would resurrect it.
    if (id === activeProjectId) resetProject();
    await refresh();
    toast.success("Projet supprimé de l'historique.");
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
          Les sites que tu analyses sont enregistrés ici automatiquement.
          Tu pourras y revenir à tout moment.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {projects.map((p) => {
          const isActive = p.id === activeProjectId;
          return (
            <button
              key={p.id}
              onClick={() => handleOpen(p.id)}
              className={`group text-left flex flex-col gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
                isActive
                  ? "border-foreground/40 bg-foreground/[0.04]"
                  : "border-border hover:border-foreground/20 hover:bg-foreground/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="w-3.5 h-3.5 shrink-0 text-foreground/30" />
                  <span className="text-[13px] font-bold text-foreground truncate">
                    {p.domain || "Projet"}
                  </span>
                  {isActive && (
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-foreground/10 text-foreground/50">
                      Ouvert
                    </span>
                  )}
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Supprimer le projet ${p.domain}`}
                  onClick={(e) => handleDelete(e, p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleDelete(e as unknown as React.MouseEvent, p.id);
                    }
                  }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-foreground/30 hover:text-red-500 hover:bg-red-500/5 rounded-md p-1 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-[11px] text-foreground/45 leading-snug line-clamp-2 min-h-[28px]">
                {p.title}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-foreground/30">
                <Clock className="w-3 h-3" />
                {formatWhen(p.savedAt)}
                <span className="ml-auto flex items-center gap-1 text-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <FolderOpen className="w-3 h-3" />
                  Ouvrir
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
