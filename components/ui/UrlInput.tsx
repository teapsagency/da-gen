import React, { useState } from "react";
import { useDAStore } from "@/store/daStore";
import { Loader2, Settings2, Plus, X } from "lucide-react";

type UrlField = { label: string; value: string; removable: boolean };

const DEFAULT_FIELDS: UrlField[] = [
  { label: "Page d'accueil", value: "", removable: false },
  { label: "Page catalogue", value: "", removable: false },
  { label: "Page produit", value: "", removable: false },
];

export const UrlInput = ({ onLogs }: { onLogs?: (logs: { time: number; msg: string }[]) => void }) => {
  const {
    setUrl,
    setIsLoading,
    setScrapeResult,
    setError,
    isLoading,
    screenshotDelay,
    setScreenshotDelay,
  } = useDAStore();
  const [fields, setFields] = useState<UrlField[]>(DEFAULT_FIELDS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateField = (index: number, value: string) => {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, value } : f)));
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { label: `Page custom ${prev.length - 2}`, value: "", removable: true },
    ]);
  };

  const prepareUrl = (raw: string): string | undefined => {
    let u = raw.trim();
    if (!u) return undefined;
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    try {
      new URL(u);
      return u;
    } catch {
      return undefined;
    }
  };

  const handleAnalyze = async () => {
    const mainUrl = prepareUrl(fields[0].value);
    if (!mainUrl) {
      setError("URL invalide. Vérifiez le format (ex: https://example.com)");
      return;
    }

    // Update display value if we prepended https://
    if (mainUrl !== fields[0].value) {
      updateField(0, mainUrl);
    }

    // Collect extra URLs (skip empty ones)
    const extraPages = fields
      .slice(1)
      .map((f) => ({ label: f.label, url: prepareUrl(f.value) }))
      .filter((p): p is { label: string; url: string } => !!p.url);

    setIsLoading(true);
    setError(null);
    setUrl(mainUrl);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: mainUrl,
          delay: screenshotDelay,
          extraPages,
        }),
      });
      const data = await response.json();
      if (data._logs) onLogs?.(data._logs);
      if (data.error) throw new Error(data.error);
      setScrapeResult(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Impossible d'analyser ce site."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* URL fields */}
      <div className="flex flex-col gap-2">
        {fields.map((field, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={field.value}
              onChange={(e) => updateField(i, e.target.value)}
              placeholder={`${field.label} — https://www.exemple.com${i === 1 ? "/collections/all" : i === 2 ? "/products/exemple" : ""}`}
              className="flex-1 h-12 bg-background border border-border rounded-xl px-5 text-sm outline-none focus:border-foreground/20 transition-all font-medium placeholder:text-foreground/25"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            {field.removable && (
              <button
                onClick={() => removeField(i)}
                className="h-12 w-12 flex items-center justify-center border border-border rounded-xl text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add page button */}
      <button
        onClick={addField}
        className="w-full h-10 flex items-center justify-center gap-2 bg-foreground/5 hover:bg-foreground/10 rounded-xl text-foreground/50 hover:text-foreground/70 transition-all cursor-pointer text-xs font-semibold"
      >
        <Plus className="w-3.5 h-3.5" />
        Ajouter une page
      </button>

      {/* Generate + settings row */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`h-12 w-12 flex items-center justify-center border rounded-xl transition-all cursor-pointer ${showAdvanced ? "bg-foreground/5 border-foreground/10 text-foreground" : "bg-background border-border text-foreground/50 hover:text-foreground hover:bg-foreground/5"}`}
          title="Paramètres avancés"
        >
          <Settings2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !fields[0].value.trim()}
          className="flex-1 h-12 bg-foreground text-background rounded-xl font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer hover:opacity-90"
        >
          {isLoading ? "Analyse en cours..." : "Générer le projet"}
        </button>
      </div>

      {/* Advanced settings inline */}
      {showAdvanced && (
        <div className="flex items-center justify-between bg-background border border-border rounded-xl p-3 animate-in slide-in-from-top-2 fade-in duration-200">
          <span className="text-xs font-medium text-foreground/80">
            Délai capture (sec)
          </span>
          <div className="flex items-center gap-2 bg-foreground/5 border border-border rounded-lg p-0.5">
            <button
              onClick={() =>
                setScreenshotDelay(Math.max(1000, screenshotDelay - 1000))
              }
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-background hover:shadow-sm text-foreground/60 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
              disabled={screenshotDelay <= 1000}
            >
              <div className="w-2.5 h-[1.5px] bg-current rounded-full" />
            </button>
            <span className="w-4 text-center text-xs font-bold text-foreground">
              {Math.round(screenshotDelay / 1000)}
            </span>
            <button
              onClick={() =>
                setScreenshotDelay(Math.min(20000, screenshotDelay + 1000))
              }
              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-background hover:shadow-sm text-foreground/60 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
              disabled={screenshotDelay >= 20000}
            >
              <div className="relative w-2.5 h-2.5 flex items-center justify-center">
                <div className="absolute w-full h-[1.5px] bg-current rounded-full" />
                <div className="absolute h-full w-[1.5px] bg-current rounded-full" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
