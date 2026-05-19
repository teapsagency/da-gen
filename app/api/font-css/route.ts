import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Server-side proxy for font CSS stylesheets.
 *
 * Why this exists: some font CDNs (notably Fontshare) serve their CSS with a
 * restrictive `Access-Control-Allow-Origin`, so the browser cannot `fetch()`
 * the stylesheet to inspect/inject it. Fetching server-side sidesteps CORS.
 *
 * The returned font files themselves (gstatic.com, cdn.fontshare.com, …) are
 * served with `ACAO: *`, so the browser loads them fine once the CSS is in.
 */

// Blocks obvious internal / private targets (basic SSRF guard).
const isBlockedHost = (host: string): boolean => {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1") return true;
  if (/^(127|10|0)\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
};

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return new Response("missing url param", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("invalid url", { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new Response("unsupported protocol", { status: 400 });
  }
  if (isBlockedHost(parsed.hostname)) {
    return new Response("blocked host", { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        // A modern UA makes Google Fonts return woff2 (vs legacy formats).
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/css,*/*;q=0.1",
      },
    });

    if (!upstream.ok) {
      return new Response(`upstream ${upstream.status}`, { status: upstream.status });
    }

    const css = await upstream.text();
    return new Response(css, {
      status: 200,
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("upstream fetch failed", { status: 502 });
  }
}
