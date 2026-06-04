import { toBlob } from 'html-to-image';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { SectorAsset } from '@/types';
import { ASSET_DIMS } from './sectorThemes';

const sanitizeName = (name: string) => name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

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
async function addFramesToZip(target: JSZip, frames: FrameDef[], prefix: string, scale = 1) {
  for (const frame of frames) {
    const blob = await captureFrame(frame.id, frame.width, frame.height, scale);
    if (blob) {
      target.file(`${prefix}_${frame.name}.png`, blob);
    }
  }
}

// ─── Assets secteur ───
// Id DOM de l'instance offscreen d'un asset (capturée à l'export).
export function sectorAssetExportId(id: string) {
  return `sector-asset-${id}`;
}

// Export PNG unitaire d'un asset secteur.
export async function exportSectorAsset(asset: SectorAsset, clientName: string, scale = 1) {
  const { w, h } = ASSET_DIMS[asset.ratio];
  await exportFrame(
    sectorAssetExportId(asset.id),
    `${sanitizeName(clientName)}_asset_${asset.role}`,
    w,
    h,
    scale,
  );
}

// Pack ZIP de tous les assets secteur (dossier assets_secteur/).
export async function exportSectorAssetsPack(clientName: string, assets: SectorAsset[], scale = 1) {
  const name = sanitizeName(clientName);
  const zip = new JSZip();
  const folder = zip.folder('assets_secteur');
  if (folder) {
    let i = 1;
    for (const a of assets) {
      const { w, h } = ASSET_DIMS[a.ratio];
      const blob = await captureFrame(sectorAssetExportId(a.id), w, h, scale);
      if (blob) folder.file(`${name}_${String(i).padStart(2, '0')}_${a.role}.png`, blob);
      i++;
    }
  }
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${name}_assets_secteur.zip`);
}

// Pack complet : charte graphique + visuels desktop + réseaux sociaux,
// rangés dans trois sous-dossiers.
export async function exportFullPack(clientName: string, scale = 1) {
  const sanitizedClientName = sanitizeName(clientName);
  const zip = new JSZip();

  const charteFolder = zip.folder('charte_graphique');
  const desktopFolder = zip.folder('desktop');
  const socialFolder = zip.folder('reseaux_sociaux');
  if (charteFolder) await addFramesToZip(charteFolder, CHARTE_FRAMES, sanitizedClientName, scale);
  if (desktopFolder) await addFramesToZip(desktopFolder, DESKTOP_FRAMES, sanitizedClientName, scale);
  if (socialFolder) await addFramesToZip(socialFolder, SOCIAL_FRAMES, sanitizedClientName, scale);

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${sanitizedClientName}_assets.zip`);
}
