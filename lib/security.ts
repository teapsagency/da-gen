/**
 * SSRF guard — blocks outbound requests to internal / private network targets.
 * Shared by the scraper, sitemap and font-css proxy routes.
 *
 * Note: this is a hostname-level check. It does not resolve DNS, so a public
 * domain pointing at a private IP would slip through — acceptable for an
 * internal agency tool, where the realistic risk is a user pasting
 * `localhost` / a metadata endpoint by mistake.
 */

// Blocks obvious internal / private hostnames and IP literals.
export const isBlockedHost = (host: string): boolean => {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "").trim();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true;
  if (/^(127|10|0)\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === "metadata.google.internal") return true;
  return false;
};

export type UrlValidation = { url: URL } | { error: string };

/**
 * Validates a URL string for outbound fetching: must be http(s) and must not
 * target an internal host.
 */
export const validateExternalUrl = (raw: string): UrlValidation => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: "URL invalide. Vérifiez le format (ex: https://example.com)" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Seuls les protocoles HTTP et HTTPS sont supportés." };
  }
  if (isBlockedHost(url.hostname)) {
    return { error: "Cette adresse cible un hôte interne non autorisé." };
  }
  return { url };
};
