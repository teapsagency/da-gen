// Client de la banque d'images (Pexels), via les routes /api/stock-*.

export type StockPhoto = {
  id: number;
  thumb: string;
  src: string;
  alt: string;
  photographer: string;
};

// Erreur typée pour distinguer « pas de clé » (503) du reste → l'UI peut
// proposer l'upload manuel au lieu d'afficher une erreur dure.
export class StockUnavailableError extends Error {}

export async function searchStock(query: string, page = 1): Promise<StockPhoto[]> {
  const res = await fetch("/api/stock-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, page }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = (data as { error?: string }).error || "Recherche impossible";
    if (res.status === 503) throw new StockUnavailableError(msg);
    throw new Error(msg);
  }
  const data = await res.json();
  return (data.photos ?? []) as StockPhoto[];
}

// Télécharge la photo choisie (via proxy) et la renvoie en dataURL, prête à être
// stockée dans l'asset et exportée sans CORS.
export async function stockToDataUrl(src: string): Promise<string> {
  const res = await fetch(`/api/stock-image?url=${encodeURIComponent(src)}`);
  if (!res.ok) throw new Error("Téléchargement de l'image impossible");
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Lecture de l'image impossible"));
    reader.readAsDataURL(blob);
  });
}
