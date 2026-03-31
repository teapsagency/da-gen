"use client";

import React, { useCallback } from "react";
import { Paperclip, X } from "lucide-react";

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
};

const ACCEPTED = [".md", ".txt", ".pdf", ".html", ".json"];
const MAX_FILES = 3;

export function FileUpload({ files, onChange }: Props) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const valid = Array.from(incoming).filter((f) =>
        ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext))
      );
      const merged = [...files, ...valid].slice(0, MAX_FILES);
      onChange(merged);
    },
    [files, onChange]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleRemove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const getExt = (name: string) => `.${name.split(".").pop()?.toLowerCase() ?? "file"}`;

  const extColors: Record<string, { bg: string; text: string }> = {
    ".pdf": { bg: "rgba(255, 82, 82, 0.12)", text: "rgb(153, 27, 27)" },
    ".md": { bg: "rgba(66, 133, 244, 0.12)", text: "rgb(12, 47, 96)" },
    ".txt": { bg: "rgba(120, 120, 120, 0.12)", text: "rgb(80, 80, 80)" },
    ".html": { bg: "rgba(255, 152, 0, 0.12)", text: "rgb(153, 80, 0)" },
    ".json": { bg: "rgba(76, 175, 80, 0.12)", text: "rgb(27, 94, 32)" },
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center gap-1.5 py-4 px-3
          border border-dashed rounded-xl cursor-pointer transition-all
          ${isDragging
            ? "border-foreground/40 bg-foreground/5"
            : "border-border hover:border-foreground/20 hover:bg-foreground/[0.02]"
          }
          ${files.length >= MAX_FILES ? "opacity-40 pointer-events-none" : ""}
        `}
      >
        <Paperclip className="w-3.5 h-3.5 text-foreground/30" />
        <p className="text-[11px] font-medium text-foreground/30 text-center">
          {files.length >= MAX_FILES
            ? "Limite atteinte (3 fichiers)"
            : "Déposer ou cliquer — .md .txt .pdf .html .json"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {files.map((file, i) => {
            const ext = getExt(file.name);
            const colors = extColors[ext] ?? extColors[".txt"];
            const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");

            return (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2.5 bg-foreground/[0.03] rounded-xl group"
              >
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-foreground/70 truncate">
                    {nameWithoutExt}
                  </span>
                  <span className="text-[10px] text-foreground/30 font-medium">
                    {formatSize(file.size)}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full w-fit"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {ext}
                  </span>
                </div>
                <button
                  onClick={() => handleRemove(i)}
                  className="text-foreground/20 hover:text-foreground/60 transition-colors cursor-pointer mt-0.5 opacity-0 group-hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
