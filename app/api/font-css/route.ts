import { NextRequest } from "next/server";
import { validateExternalUrl } from "@/lib/security";

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

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return new Response("missing url param", { status: 400 });
  }

  const validated = validateExternalUrl(target);
  if ("error" in validated) {
    return new Response(validated.error, { status: 400 });
  }
  const parsed = validated.url;

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
