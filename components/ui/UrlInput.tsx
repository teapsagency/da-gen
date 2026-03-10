import React, { useState } from "react";
import { useDAStore } from "@/store/daStore";
import { Loader2, Settings2 } from "lucide-react";

export const UrlInput = () => {
  const {
    setUrl,
    setIsLoading,
    setScrapeResult,
    setError,
    isLoading,
    screenshotDelay,
    setScreenshotDelay,
  } = useDAStore();
  const [localUrl, setLocalUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAnalyze = async () => {
    if (!localUrl) return;

    // Prepend https:// if no protocol specified
    let urlToAnalyze = localUrl.trim();
    if (!/^https?:\/\//i.test(urlToAnalyze)) {
      urlToAnalyze = `https://${urlToAnalyze}`;
      setLocalUrl(urlToAnalyze);
    }

    // Validate URL format
    try {
      new URL(urlToAnalyze);
    } catch {
      setError("URL invalide. Vérifiez le format (ex: https://example.com)");
      return;
    }

    setIsLoading(true);
    setError(null);
    setUrl(urlToAnalyze);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToAnalyze, delay: screenshotDelay }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setScrapeResult(data);
    } catch (err: any) {
      setError(err.message || "Impossible d'analyser ce site.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-col md:flex-row gap-3 w-full relative">
        <div className="flex-1 relative">
          <input
            type="text"
            value={localUrl}
            onChange={(e) => setLocalUrl(e.target.value)}
            placeholder="https://www.exemple.com"
            className="w-full h-12 bg-background border border-border rounded-xl px-5 text-sm outline-none focus:border-foreground/20 transition-all font-medium placeholder:text-foreground/25"
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`h-12 w-12 flex items-center justify-center border rounded-xl transition-all cursor-pointer ${showAdvanced ? "bg-foreground/5 border-foreground/10 text-foreground" : "bg-background border-border text-foreground/50 hover:text-foreground hover:bg-foreground/5"}`}
          title="Paramètres avancés"
        >
          <Settings2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !localUrl}
          className="h-12 px-8 bg-foreground text-background rounded-xl font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer hover:opacity-90"
        >
          {isLoading ? "Analyse en cours..." : "Générer le projet"}
        </button>
      </div>

      {showAdvanced && (
        <div className="absolute bottom-full right-[200px] mb-3 w-64 bg-background border border-border shadow-2xl rounded-xl p-3 flex flex-col gap-3 animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
          <div className="flex items-center justify-between">
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
        </div>
      )}
    </div>
  );
};
