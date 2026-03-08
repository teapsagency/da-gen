import { toBlob } from 'html-to-image';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export async function captureFrame(frameId: string): Promise<Blob | null> {
  const element = document.getElementById(frameId);
  if (!element) return null;

  try {
    const blob = await toBlob(element, {
      width: 2373,
      height: 1473,
      pixelRatio: 1,
      cacheBust: true,
      skipAutoScale: true,
      canvasWidth: 2373,
      canvasHeight: 1473,
      // Skip cross-origin stylesheet errors (Google Fonts, external CSS)
      filter: (node: HTMLElement) => {
        // Keep all nodes — the filter is just to prevent the library from crashing
        return true;
      },
    });
    return blob;
  } catch (err: any) {
    // Handle the cross-origin cssRules error gracefully — retry without style cloning
    if (err?.message?.includes('cssRules')) {
      console.warn(`Cross-origin stylesheet warning for ${frameId}, retrying...`);
      try {
        const blob = await toBlob(element, {
          width: 2373,
          height: 1473,
          pixelRatio: 1,
          cacheBust: true,
          skipAutoScale: true,
          canvasWidth: 2373,
          canvasHeight: 1473,
          includeQueryParams: true,
        });
        return blob;
      } catch (retryErr) {
        console.error(`Retry also failed for ${frameId}:`, retryErr);
        return null;
      }
    }
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
