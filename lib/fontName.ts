/**
 * Font file helpers — extracts a clean family name from an uploaded font file
 * and builds a usable @font-face data URL.
 *
 * Why parse the file at all: users upload files named "Satoshi-Variable.woff2"
 * or "CabinetGrotesque-Bold.otf" — we want the real family name ("Satoshi",
 * "Cabinet Grotesque"), not the filename.
 */

/* ─── Filename / raw-name cleaning ─────────────────────────────────────── */

// Weight / style words that appear as a suffix in font file names.
// "display" and "text" are intentionally NOT here — they're real family words
// (e.g. "Playfair Display", "Noto Sans Display").
const STYLE_WORDS = new Set([
  "thin", "extralight", "ultralight", "light", "regular", "normal", "book",
  "medium", "semibold", "demibold", "demi", "bold", "extrabold", "ultrabold",
  "black", "heavy", "hairline", "italic", "oblique", "roman", "upright",
  "variable", "vf", "variablefont", "trial", "trialvf", "webfont", "web",
  "desktop", "ttf", "otf", "woff", "woff2",
]);

/**
 * Turns a raw name (filename, font-internal name, or a CSS font-family) into a
 * clean family name: strips build-tool artifacts, the file extension, splits
 * camelCase, normalises separators and removes trailing weight/style words.
 */
export const cleanFontName = (raw: string): string => {
  let base = raw.trim().replace(/\.[a-z0-9]+$/i, ""); // strip extension

  // Build-tool artifacts: Next.js `next/font` emits CSS family names like
  // "__Satoshi_Variable_e8ce4c", "_Satoshi_Variable" or "__Foo_Fallback_abc".
  if (base.startsWith("_") || base.includes("__")) {
    base = base.replace(/^_+/, "");                     // leading underscores
    base = base.replace(/_[a-z0-9]*\d[a-z0-9]*$/i, ""); // trailing build hash
    base = base.replace(/_+fallback$/i, "");            // next/font fallback suffix
  }

  base = base.replace(/[-_.]+/g, " "); // separators → spaces
  // split PascalCase / camelCase: "CabinetGrotesque" → "Cabinet Grotesque"
  base = base
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  // drop standalone version tokens ("v1", "1.002", "2023")
  base = base.replace(/\bv?\d+(\.\d+)+\b/gi, " ").replace(/\bv\d+\b/gi, " ");

  let words = base.split(/\s+/).filter(Boolean);
  // strip trailing style words ("Satoshi Variable" → "Satoshi")
  while (words.length > 1 && STYLE_WORDS.has(words[words.length - 1].toLowerCase())) {
    words = words.slice(0, -1);
  }
  return words.join(" ").trim() || raw.replace(/\.[a-z0-9]+$/i, "");
};

/* ─── Font-internal name table parsing (sfnt: TTF / OTF, + uncompressed WOFF) ─ */

const readTag = (view: DataView, offset: number): string =>
  String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );

const decodeNameBytes = (bytes: Uint8Array, platformID: number): string => {
  // Mac (platform 1) → single-byte; Windows (3) / Unicode (0) → UTF-16BE
  if (platformID === 1) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }
  let s = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    s += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
  }
  return s;
};

// Parses a `name` table starting at `tableStart` within the buffer.
const parseNameTable = (view: DataView, tableStart: number): string | null => {
  if (tableStart + 6 > view.byteLength) return null;
  const count = view.getUint16(tableStart + 2);
  const stringBase = tableStart + view.getUint16(tableStart + 4);

  // nameID 16 = typographic family (best), 1 = legacy family (fallback)
  const picks: Record<number, { platformID: number; offset: number; length: number }> = {};
  for (let i = 0; i < count; i++) {
    const rec = tableStart + 6 + i * 12;
    if (rec + 12 > view.byteLength) break;
    const platformID = view.getUint16(rec);
    const nameID = view.getUint16(rec + 6);
    if (nameID !== 16 && nameID !== 1) continue;
    const length = view.getUint16(rec + 8);
    const offset = view.getUint16(rec + 10);
    // Prefer Windows platform (3) — clean UTF-16, then keep first seen
    if (!picks[nameID] || platformID === 3) {
      picks[nameID] = { platformID, offset, length };
    }
  }

  const pick = picks[16] || picks[1];
  if (!pick) return null;
  const start = stringBase + pick.offset;
  if (start + pick.length > view.byteLength) return null;
  const bytes = new Uint8Array(view.buffer, start, pick.length);
  const name = decodeNameBytes(bytes, pick.platformID).replace(/\0/g, "").trim();
  return name || null;
};

// Locates the `name` table in an sfnt (TTF/OTF) table directory.
const sfntNameTableOffset = (view: DataView): number | null => {
  const numTables = view.getUint16(4);
  for (let i = 0; i < numTables; i++) {
    const entry = 12 + i * 16;
    if (entry + 16 > view.byteLength) break;
    if (readTag(view, entry) === "name") return view.getUint32(entry + 8);
  }
  return null;
};

// Locates the `name` table in a WOFF table directory.
const woffNameTable = (view: DataView): { offset: number; comp: number; orig: number } | null => {
  const numTables = view.getUint16(12);
  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20;
    if (entry + 20 > view.byteLength) break;
    if (readTag(view, entry) === "name") {
      return {
        offset: view.getUint32(entry + 4),
        comp: view.getUint32(entry + 8),
        orig: view.getUint32(entry + 12),
      };
    }
  }
  return null;
};

/**
 * Extracts the family name embedded in a font file.
 * Supports TTF/OTF and WOFF (when its name table is stored uncompressed).
 * Returns null for WOFF2 (brotli) or anything unparseable — caller falls back
 * to the filename.
 */
export const extractFontFamilyName = (buffer: ArrayBuffer): string | null => {
  try {
    if (buffer.byteLength < 12) return null;
    const view = new DataView(buffer);
    const sig = readTag(view, 0);

    if (sig === "wOFF") {
      const nt = woffNameTable(view);
      if (!nt || nt.comp !== nt.orig) return null; // compressed → skip
      return parseNameTable(view, nt.offset);
    }
    if (sig === "wOF2") return null; // brotli-compressed — not parseable here

    // sfnt: 0x00010000 (TrueType), 'OTTO' (CFF), 'true' / 'typ1' (legacy Mac)
    const version = view.getUint32(0);
    if (version === 0x00010000 || sig === "OTTO" || sig === "true" || sig === "typ1") {
      const off = sfntNameTableOffset(view);
      return off != null ? parseNameTable(view, off) : null;
    }
    return null;
  } catch {
    return null;
  }
};

/* ─── Data URL helpers ─────────────────────────────────────────────────── */

const FONT_MIME: Record<string, string> = {
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
};

const MIME_TO_FORMAT: Record<string, string> = {
  "font/ttf": "truetype",
  "font/otf": "opentype",
  "font/woff": "woff",
  "font/woff2": "woff2",
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x2000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

export type LoadedFont = { name: string; dataUrl: string };

/**
 * Reads an uploaded font file: derives a clean family name (from the font's
 * internal name table, falling back to the filename) and builds a base64
 * data URL with the correct MIME type so @font-face can declare a format hint.
 */
export const loadFontFile = async (file: File): Promise<LoadedFont> => {
  const buffer = await file.arrayBuffer();
  const internal = extractFontFamilyName(buffer);
  const name = internal ? cleanFontName(internal) : cleanFontName(file.name);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = FONT_MIME[ext] ?? "font/ttf";
  const dataUrl = `data:${mime};base64,${arrayBufferToBase64(buffer)}`;

  return { name, dataUrl };
};

/**
 * Builds the @font-face CSS for a locally uploaded font, including a `format()`
 * hint derived from the data URL's MIME type so browsers reliably load it.
 */
export const localFontFaceCss = (dataUrl: string, family = "LocalFont"): string => {
  const mime = dataUrl.match(/^data:([^;]+);/)?.[1] ?? "";
  const format = MIME_TO_FORMAT[mime];
  const src = format
    ? `url('${dataUrl}') format('${format}')`
    : `url('${dataUrl}')`;
  return `@font-face { font-family: '${family}'; src: ${src}; font-display: swap; }`;
};
