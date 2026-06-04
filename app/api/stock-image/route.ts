import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Proxy serveur d'UNE image Pexels, pour la convertir en dataURL côté client
 * sans souci de CORS (la photo choisie est ensuite stockée dans le projet, donc
 * l'export html-to-image ne touche jamais une image cross-origin).
 *
 * Hôte verrouillé sur pexels.com (l'URL vient déjà de /api/stock-search).
 */
export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("url") ?? "";
  let host = "";
  try {
    host = new URL(src).hostname.toLowerCase();
  } catch {
    return new Response("url invalide", { status: 400 });
  }
  if (host !== "pexels.com" && !host.endsWith(".pexels.com")) {
    return new Response("hôte non autorisé", { status: 403 });
  }

  try {
    const upstream = await fetch(src);
    if (!upstream.ok) {
      return new Response(`upstream ${upstream.status}`, { status: 502 });
    }
    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("téléchargement échoué", { status: 502 });
  }
}
