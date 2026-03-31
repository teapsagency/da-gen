import React from "react";
import { useDAStore } from "@/store/daStore";
import { Globe, FileText, Plus, Loader2, X, ArrowRight } from "lucide-react";
import { PageScreenshots as PageScreenshotsType } from "@/types";
import { toast } from "sonner";

export const PageScreenshots = () => {
  const {
    scrapeResult,
    activePageIndex,
    setActivePageIndex,
    isAddingPage,
    setIsAddingPage,
    isPageInputOpen,
    setIsPageInputOpen,
    removeExtraPage,
  } = useDAStore();
  const [addUrl, setAddUrl] = React.useState("");
  const [addLabel, setAddLabel] = React.useState("");
  const [addError, setAddError] = React.useState("");

  if (!scrapeResult) return null;

  const pages = [
    { label: "Accueil", url: scrapeResult.siteUrl },
    ...scrapeResult.extraPages.map((p) => ({ label: p.label, url: p.url })),
  ];

  const handleAddPage = async () => {
    if (!addUrl.trim()) return;
    let url = addUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try { new URL(url); } catch { return; }

    const label = addLabel.trim() || (() => {
      try { return new URL(url).pathname.split("/").filter(Boolean).pop() || "Page"; }
      catch { return "Page"; }
    })();

    setIsAddingPage(true);
    setAddError("");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newPage: PageScreenshotsType = {
        label,
        url,
        desktop: data.screenshots.desktop,
        desktopFull: data.screenshots.desktopFull,
        mobile: data.screenshots.mobile,
      };

      useDAStore.setState((state) => ({
        scrapeResult: state.scrapeResult
          ? { ...state.scrapeResult, extraPages: [...state.scrapeResult.extraPages, newPage] }
          : null,
      }));

      setAddUrl("");
      setAddLabel("");
      setIsPageInputOpen(false);
      toast.success("Page ajoutée !");
    } catch {
      setAddError("Impossible d'analyser cette URL.");
      toast.error("Impossible d'analyser cette URL.");
    } finally {
      setIsAddingPage(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider mb-0.5">
        Pages
      </span>

      {pages.map((page, i) => (
        <div key={i} className="relative group">
          <button
            onClick={() => setActivePageIndex(i)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              activePageIndex === i
                ? "border-foreground/15 bg-foreground/[0.04]"
                : "border-transparent hover:bg-foreground/[0.02] opacity-50 hover:opacity-80"
            }`}
          >
            <div className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all shrink-0 ${
              activePageIndex === i
                ? "bg-foreground text-background"
                : "bg-foreground/5 text-foreground/40"
            }`}>
              {i === 0 ? <Globe className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold leading-tight">{page.label}</p>
              <p className="text-[10px] text-foreground/30 font-medium truncate mt-0.5">{page.url}</p>
            </div>
          </button>
          {i > 0 && (
            <button
              onClick={() => removeExtraPage(i - 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all w-5 h-5 flex items-center justify-center text-foreground/30 hover:text-foreground/70 hover:bg-foreground/10 rounded-md"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      {/* Add page */}
      {isPageInputOpen ? (
        <div className="flex flex-col gap-1.5 mt-1 p-3 bg-foreground/[0.03] rounded-xl border border-border">
          <input
            type="text"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            placeholder="Label (ex: Catalogue)"
            className="w-full h-7 px-2.5 text-[11px] font-medium bg-background border border-border rounded-lg outline-none focus:border-foreground/20 transition-all placeholder:text-foreground/20"
          />
          <div className="flex gap-1.5">
            <input
              type="text"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="https://..."
              onKeyDown={(e) => e.key === "Enter" && handleAddPage()}
              className="flex-1 h-7 px-2.5 text-[11px] font-medium bg-background border border-border rounded-lg outline-none focus:border-foreground/20 transition-all placeholder:text-foreground/20"
            />
            <button
              onClick={handleAddPage}
              disabled={isAddingPage || !addUrl.trim()}
              className="h-7 w-7 flex items-center justify-center bg-foreground text-background rounded-lg transition-all cursor-pointer disabled:opacity-40 shadow-[inset_0_2px_1px_0_rgba(255,255,255,0.4)] active:shadow-[inset_0_-1px_1px_0_rgba(255,255,255,0.2)] active:scale-[0.97]"
            >
              {isAddingPage ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
            </button>
            <button
              onClick={() => { setIsPageInputOpen(false); setAddUrl(""); setAddLabel(""); setAddError(""); }}
              className="h-7 w-7 flex items-center justify-center text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {addError && (
            <p className="text-[10px] text-red-500 font-medium mt-0.5">{addError}</p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setIsPageInputOpen(true)}
          className="mt-1 w-full h-8 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5 rounded-xl border border-dashed border-foreground/10 hover:border-foreground/20 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Ajouter une page
        </button>
      )}
    </div>
  );
};
