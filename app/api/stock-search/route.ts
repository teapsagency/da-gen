import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Proxy serveur de l'API Pexels pour la banque d'images des « assets secteur ».
 *
 * La clé `PEXELS_API_KEY` reste côté serveur (jamais exposée au client). Pas de
 * clé configurée → 503 explicite : l'UI bascule alors sur l'upload manuel.
 */
export async function POST(req: NextRequest) {
  let body: { query?: unknown; page?: unknown; apiKey?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "corps JSON invalide" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return Response.json({ error: "query requis" }, { status: 400 });
  }
  const page = Math.max(1, Math.min(50, Number(body.page) || 1));

  // Clé custom (paramètres) prioritaire ; repli sur la variable d'env serveur.
  const customKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const key = customKey || process.env.PEXELS_API_KEY;
  if (!key) {
    return Response.json(
      { error: "PEXELS_API_KEY non configurée sur le serveur." },
      { status: 503 },
    );
  }

  const url =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query.slice(0, 120))}` +
    `&per_page=24&page=${page}&orientation=landscape`;

  try {
    const upstream = await fetch(url, { headers: { Authorization: key } });
    if (!upstream.ok) {
      return Response.json({ error: `Pexels ${upstream.status}` }, { status: 502 });
    }
    const data = await upstream.json();
    const photos = (Array.isArray(data.photos) ? data.photos : []).map(
      (p: {
        id: number;
        alt?: string;
        photographer?: string;
        src?: { medium?: string; large?: string; large2x?: string };
      }) => ({
        id: p.id,
        thumb: p.src?.medium ?? "",
        src: p.src?.large2x ?? p.src?.large ?? "",
        alt: p.alt ?? "",
        photographer: p.photographer ?? "",
      }),
    );
    return Response.json({ photos });
  } catch {
    return Response.json({ error: "Pexels injoignable" }, { status: 502 });
  }
}
