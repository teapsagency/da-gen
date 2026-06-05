import { toBlob, toCanvas } from 'html-to-image';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { SectorAsset } from '@/types';
import { ASSET_DIMS } from './sectorThemes';

export const sanitizeName = (name: string) =>
  name
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // accents → ascii (é → e)
    .replace(/[^a-z0-9-]/gi, '_') // garde le tiret (ex. "illustration-1")
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

export async function captureFrame(
  frameId: string,
  width = 2373,
  height = 1473,
  scale = 1,
): Promise<Blob | null> {
  const element = document.getElementById(frameId);
  if (!element) return null;

  try {
    const blob = await toBlob(element, {
      width,
      height,
      // Résolution de sortie : pixelRatio multiplie le canvas (canvas = width ×
      // pixelRatio). scale=2 → visuels deux fois plus nets pour les réseaux.
      pixelRatio: scale,
      cacheBust: true,
      skipAutoScale: true,
      canvasWidth: width,
      canvasHeight: height,
      // Skip font embedding — fonts are already loaded in the page via <link>/<style>
      // This avoids SecurityError when html-to-image tries to read cross-origin cssRules
      skipFonts: true,
      // Drop any element flagged data-editor-only — overlay boutons, ✕ reset
      // et inputs cachés du composant EditableImage. Ceinture-et-bretelles :
      // ils ont déjà opacity:0 hors hover, ce filtre garantit qu'ils ne
      // peuvent pas se retrouver dans le PNG même si un état hover trainait.
      filter: (node) => !(node instanceof HTMLElement) || !node.hasAttribute('data-editor-only'),
    });
    return blob;
  } catch (err) {
    console.error(`Failed to capture frame ${frameId}:`, err);
    return null;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

// Marge uniforme laissée autour du contenu après ajustement (fraction de la
// largeur du canvas) → même breathing room sur tous les assets, et les ombres
// douces ne sont pas coupées à ras.
const FIT_MARGIN_FRAC = 0.02;

// Recadre un canvas à la bounding box de ses pixels non transparents + une marge
// uniforme. Repli sur le canvas entier si tout est transparent ou si la lecture
// des pixels échoue (canvas teinté).
function cropTransparentCanvas(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  if (!ctx || !width || !height) return canvasToBlob(canvas);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, width, height).data;
  } catch {
    return canvasToBlob(canvas);
  }
  const ALPHA = 8; // seuil pour ignorer le bruit/anti-aliasing quasi invisible
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > ALPHA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return canvasToBlob(canvas); // tout transparent
  // Marge uniforme (même px sur les 4 côtés) clampée aux bords du canvas.
  const pad = Math.round(width * FIT_MARGIN_FRAC);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const octx = out.getContext('2d');
  if (!octx) return canvasToBlob(canvas);
  octx.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return canvasToBlob(out);
}

// Capture une frame puis l'ajuste au contenu + marge uniforme (PNG transparent).
// Utilisé pour les assets secteur (beaucoup de vide autour de la composition).
async function captureFrameCropped(frameId: string, width: number, height: number, scale = 1): Promise<Blob | null> {
  const element = document.getElementById(frameId);
  if (!element) return null;
  try {
    const canvas = await toCanvas(element, {
      width,
      height,
      pixelRatio: scale,
      cacheBust: true,
      skipAutoScale: true,
      canvasWidth: width,
      canvasHeight: height,
      skipFonts: true,
      filter: (node) => !(node instanceof HTMLElement) || !node.hasAttribute('data-editor-only'),
    });
    return await cropTransparentCanvas(canvas);
  } catch (err) {
    console.error(`Failed to capture/crop frame ${frameId}:`, err);
    return null;
  }
}

export async function exportFrame(frameId: string, filename: string, width?: number, height?: number, scale = 1) {
  const blob = await captureFrame(frameId, width, height, scale);
  if (blob) {
    saveAs(blob, `${filename}.png`);
  }
}

type FrameDef = { id: string; name: string; width?: number; height?: number };

const CHARTE_FRAMES: FrameDef[] = [
  { id: 'frame-1-da', name: '01_identite' },
  { id: 'frame-colors', name: '02_couleurs' },
];

const DESKTOP_FRAMES: FrameDef[] = [
  { id: 'frame-2-mockup', name: '02_interface' },
  { id: 'frame-3-cover', name: '03_couverture' },
];

const SOCIAL_FRAMES: FrameDef[] = [
  { id: 'frame-4-social-browser', name: '04_browser_full', width: 1080, height: 1350 },
  { id: 'frame-6-social-nouvelle', name: '06_nouvelle_real', width: 1080, height: 1350 },
  { id: 'frame-7-social-three',   name: '07_three_images', width: 1080, height: 1350 },
  { id: 'frame-8-social-card',    name: '08_card_site',    width: 1080, height: 1350 },
  { id: 'frame-9-board-desktop',  name: '09_board_desktop', width: 1080, height: 1350 },
  { id: 'frame-10-board-mobile',  name: '10_board_mobile',  width: 1080, height: 1350 },
];

// Capture each frame and add it to the given JSZip target (zip root or a subfolder).
// `names` overrides a frame's file label (by frame id) with the user-edited name.
async function addFramesToZip(
  target: JSZip,
  frames: FrameDef[],
  prefix: string,
  scale = 1,
  names: Record<string, string> = {},
) {
  for (const frame of frames) {
    const blob = await captureFrame(frame.id, frame.width, frame.height, scale);
    if (blob) {
      // Le nom édité est le nom COMPLET du fichier (préfixe inclus) ; sinon on
      // construit le défaut `prefix_label`.
      const label = names[frame.id]?.trim()
        ? sanitizeName(names[frame.id])
        : `${prefix}_${frame.name}`;
      target.file(`${label}.png`, blob);
    }
  }
}

// ─── Assets secteur ───
// Id DOM de l'instance offscreen d'un asset (capturée à l'export).
export function sectorAssetExportId(id: string) {
  return `sector-asset-${id}`;
}

// Nom de fichier par défaut d'un asset secteur : titre générique numéroté par
// rôle (ex. "illustration-1", "hero-2"). `index` = numéro 1-based parmi son rôle.
export const defaultAssetName = (role: SectorAsset['role'], index: number) =>
  `${role === 'hero' ? 'hero' : 'illustration'}-${index}`;

// Nom de fichier d'un asset secteur : nom édité si présent, sinon défaut numéroté.
const assetExportName = (asset: SectorAsset, fallback: string) =>
  sanitizeName(asset.name?.trim() ? asset.name : fallback);

// Export PNG unitaire d'un asset secteur. `defaultName` = nom par défaut résolu
// (numéroté par rôle) fourni par l'appelant, pour coller à ce qui est affiché.
export async function exportSectorAsset(asset: SectorAsset, defaultName: string, scale = 1) {
  const { w, h } = ASSET_DIMS[asset.ratio];
  const blob = await captureFrameCropped(sectorAssetExportId(asset.id), w, h, scale);
  if (blob) saveAs(blob, `${assetExportName(asset, defaultName)}.png`);
}

// Pack ZIP de tous les assets secteur (dossier assets_secteur/). Recadrage auto
// à l'export ; noms numérotés par rôle (édités si l'asset a un nom).
export async function exportSectorAssetsPack(clientName: string, assets: SectorAsset[], scale = 1) {
  const name = sanitizeName(clientName);
  const zip = new JSZip();
  const folder = zip.folder('assets_secteur');
  if (folder) {
    const roleCounts: Record<string, number> = {};
    for (const a of assets) {
      const { w, h } = ASSET_DIMS[a.ratio];
      const blob = await captureFrameCropped(sectorAssetExportId(a.id), w, h, scale);
      roleCounts[a.role] = (roleCounts[a.role] ?? 0) + 1;
      const label = assetExportName(a, defaultAssetName(a.role, roleCounts[a.role]));
      if (blob) folder.file(`${label}.png`, blob);
    }
  }
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${name}_assets_secteur.zip`);
}

// Pack complet : charte graphique + visuels desktop + réseaux sociaux,
// rangés dans trois sous-dossiers.
export async function exportFullPack(
  clientName: string,
  scale = 1,
  frameNames: Record<string, string> = {},
) {
  const sanitizedClientName = sanitizeName(clientName);
  const zip = new JSZip();

  const charteFolder = zip.folder('charte_graphique');
  const desktopFolder = zip.folder('desktop');
  const socialFolder = zip.folder('reseaux_sociaux');
  if (charteFolder) await addFramesToZip(charteFolder, CHARTE_FRAMES, sanitizedClientName, scale, frameNames);
  if (desktopFolder) await addFramesToZip(desktopFolder, DESKTOP_FRAMES, sanitizedClientName, scale, frameNames);
  if (socialFolder) await addFramesToZip(socialFolder, SOCIAL_FRAMES, sanitizedClientName, scale, frameNames);

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${sanitizedClientName}_assets.zip`);
}
