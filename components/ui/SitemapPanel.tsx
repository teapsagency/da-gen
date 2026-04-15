import React from "react";
import { useDAStore } from "@/store/daStore";
import { RefreshCw, Loader2, Link2, AlertCircle } from "lucide-react";

export const SitemapPanel = () => {
  const {
    scrapeResult,
    sitemapUrls,
    sitemapSource,
    sitemapStatus,
    sitemapError,
    includeSitemapInContent,
    setSitemap,
    setIncludeSitemapInContent,
  } = useDAStore();

  const fetchSitemap = React.useCallback(async () => {
    if (!scrapeResult?.siteUrl) return;
    setSitemap({ urls: [], source: null, status: 'loading', error: null });
    try {
      const res = await fetch("/api/sitemap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl: scrapeResult.siteUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSitemap({ urls: [], source: null, status: 'error', error: data?.error || 'Erreur' });
        return;
      }
      if (!data.found || !data.urls?.length) {
        setSitemap({ urls: [], source: null, status: 'empty', error: null });
        return;
      }
      setSitemap({ urls: data.urls, source: data.source, status: 'loaded', error: null });
    } catch (err) {
      setSitemap({
        urls: [],
        source: null,
        status: 'error',
        error: err instanceof Error ? err.message : 'Erreur réseau',
      });
    }
  }, [scrapeResult?.siteUrl, setSitemap]);

  // Auto-fetch once when we have a site and nothing has been attempted
  React.useEffect(() => {
    if (scrapeResult?.siteUrl && sitemapStatus === 'idle') {
      fetchSitemap();
    }
  }, [scrapeResult?.siteUrl, sitemapStatus, fetchSitemap]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-end">
        <button
          onClick={fetchSitemap}
          disabled={sitemapStatus === 'loading' || !scrapeResult}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground/50 hover:text-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Rafraîchir la sitemap"
        >
          {sitemapStatus === 'loading' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-2.5 h-2.5" />
          )}
          Rafraîchir
        </button>
      </div>

      {/* Toggle include */}
      <label className="flex items-center justify-between gap-2 px-3 py-2.5 bg-background border border-border rounded-lg cursor-pointer hover:border-foreground/20 transition-all">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-semibold text-foreground">Inclure dans la génération IA</span>
          <span className="text-[10px] text-foreground/40 leading-tight">
            L&apos;IA intégrera 2-4 liens internes dans l&apos;étude de cas (maillage SEO).
          </span>
        </div>
        <input
          type="checkbox"
          checked={includeSitemapInContent}
          onChange={(e) => setIncludeSitemapInContent(e.target.checked)}
          className="w-4 h-4 shrink-0 accent-foreground cursor-pointer"
        />
      </label>

      {/* Content states */}
      {sitemapStatus === 'loading' && (
        <div className="flex items-center justify-center gap-2 py-6 text-foreground/40 text-[11px]">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Récupération…
        </div>
      )}

      {sitemapStatus === 'error' && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-500/5 border border-red-500/10 rounded-lg text-[11px] text-red-500">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{sitemapError || 'Erreur inconnue'}</span>
        </div>
      )}

      {sitemapStatus === 'empty' && (
        <div className="px-3 py-4 bg-background border border-border rounded-lg text-[11px] text-foreground/40 text-center">
          Aucune sitemap détectée sur ce site.
        </div>
      )}

      {sitemapStatus === 'loaded' && sitemapUrls.length > 0 && (
        <div className="flex flex-col gap-0 bg-background border border-border rounded-lg max-h-[280px] overflow-y-auto">
          {sitemapUrls.map((url, i) => {
            let path = url;
            try {
              const u = new URL(url);
              path = u.pathname + u.search;
              if (path === '/') path = '/ (accueil)';
            } catch { /* keep as is */ }
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-[10.5px] text-foreground/70 hover:text-foreground hover:bg-foreground/5 border-b border-border last:border-b-0 truncate transition-colors"
                title={url}
              >
                <Link2 className="w-3 h-3 shrink-0 text-foreground/30" />
                <span className="truncate font-mono">{path}</span>
              </a>
            );
          })}
        </div>
      )}

      {sitemapSource && sitemapStatus === 'loaded' && (
        <span className="text-[9.5px] text-foreground/30 font-mono truncate" title={sitemapSource}>
          Source : {sitemapSource.replace(/^https?:\/\//, '')}
        </span>
      )}
    </div>
  );
};
