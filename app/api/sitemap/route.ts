import { NextRequest, NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (compatible; DA-Gen/1.0)';
const MAX_URLS = 200;

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/xml, application/xml, text/plain, */*' },
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseXmlUrls(xml: string): string[] {
  const urls: string[] = [];
  const locRe = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = locRe.exec(xml)) !== null) {
    urls.push(m[1].trim());
  }
  return urls;
}

function parseTxtUrls(txt: string): string[] {
  return txt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\//i.test(l));
}

async function resolveSitemap(base: URL): Promise<{ source: string; urls: string[] } | null> {
  const candidates = [
    `${base.origin}/sitemap.xml`,
    `${base.origin}/sitemap_index.xml`,
    `${base.origin}/sitemap.txt`,
  ];

  for (const url of candidates) {
    const body = await fetchText(url);
    if (!body) continue;
    const trimmed = body.trim();

    // XML (sitemap or sitemap index)
    if (trimmed.startsWith('<')) {
      // Sitemap index → follow first few nested sitemaps
      if (/<sitemapindex/i.test(trimmed)) {
        const nested = parseXmlUrls(trimmed).slice(0, 5);
        const all: string[] = [];
        for (const n of nested) {
          const nb = await fetchText(n);
          if (nb) all.push(...parseXmlUrls(nb));
          if (all.length >= MAX_URLS) break;
        }
        if (all.length) return { source: url, urls: all.slice(0, MAX_URLS) };
        continue;
      }
      const urls = parseXmlUrls(trimmed);
      if (urls.length) return { source: url, urls: urls.slice(0, MAX_URLS) };
      continue;
    }

    // Plain text
    const urls = parseTxtUrls(trimmed);
    if (urls.length) return { source: url, urls: urls.slice(0, MAX_URLS) };
  }

  // robots.txt fallback
  const robots = await fetchText(`${base.origin}/robots.txt`);
  if (robots) {
    const match = robots.match(/^\s*Sitemap:\s*(\S+)/im);
    if (match) {
      const body = await fetchText(match[1]);
      if (body) {
        const trimmed = body.trim();
        const urls = trimmed.startsWith('<') ? parseXmlUrls(trimmed) : parseTxtUrls(trimmed);
        if (urls.length) return { source: match[1], urls: urls.slice(0, MAX_URLS) };
      }
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { siteUrl } = (await request.json()) as { siteUrl?: string };
    if (!siteUrl) {
      return NextResponse.json({ error: 'siteUrl manquant.' }, { status: 400 });
    }
    let base: URL;
    try {
      base = new URL(siteUrl);
    } catch {
      return NextResponse.json({ error: 'URL invalide.' }, { status: 400 });
    }

    const result = await resolveSitemap(base);
    if (!result) {
      return NextResponse.json({ urls: [], source: null, found: false });
    }

    // Deduplicate + filter to same host
    const seen = new Set<string>();
    const urls = result.urls.filter((u) => {
      try {
        const parsed = new URL(u);
        if (parsed.host !== base.host) return false;
      } catch {
        return false;
      }
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    });

    return NextResponse.json({ urls, source: result.source, found: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur sitemap.' },
      { status: 500 }
    );
  }
}
