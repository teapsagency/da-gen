import { toBlob } from 'html-to-image';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export async function captureFrame(
  frameId: string,
  width = 2373,
  height = 1473
): Promise<Blob | null> {
  const element = document.getElementById(frameId);
  if (!element) return null;

  try {
    const blob = await toBlob(element, {
      width,
      height,
      pixelRatio: 1,
      cacheBust: true,
      skipAutoScale: true,
      canvasWidth: width,
      canvasHeight: height,
      // Skip font embedding — fonts are already loaded in the page via <link>/<style>
      // This avoids SecurityError when html-to-image tries to read cross-origin cssRules
      skipFonts: true,
    });
    return blob;
  } catch (err) {
    console.error(`Failed to capture frame ${frameId}:`, err);
    return null;
  }
}

export async function exportFrame(frameId: string, filename: string) {
  const blob = await captureFrame(frameId);
  if (blob) {
    saveAs(blob, `${filename}.png`);
  }
}

export async function exportAllFrames(clientName: string) {
  const sanitizedClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const zip = new JSZip();

  const frames = [
    { id: 'frame-1-da', name: '01_identite' },
    { id: 'frame-2-mockup', name: '02_interface' },
    { id: 'frame-3-cover', name: '03_couverture' }
  ];

  for (const frame of frames) {
    const blob = await captureFrame(frame.id);
    if (blob) {
      zip.file(`${sanitizedClientName}_${frame.name}.png`, blob);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${sanitizedClientName}_assets_da.zip`);
}

export async function exportAllSocialFrames(clientName: string) {
  const sanitizedClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const zip = new JSZip();

  const frames = [
    { id: 'frame-4-social-browser', name: '04_browser_full', width: 1080, height: 1350 },
    { id: 'frame-5-social-hero',    name: '05_hero_simple',  width: 1080, height: 723 },
    { id: 'frame-6-social-nouvelle', name: '06_nouvelle_real', width: 1080, height: 1350 },
    { id: 'frame-7-social-three',   name: '07_three_images', width: 1080, height: 1350 },
  ];

  for (const frame of frames) {
    const blob = await captureFrame(frame.id, frame.width, frame.height);
    if (blob) {
      zip.file(`${sanitizedClientName}_${frame.name}.png`, blob);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${sanitizedClientName}_assets_social.zip`);
}
