/**
 * Downscale a base64/data-URL image into a small JPEG thumbnail (client-side,
 * via canvas). Used to cache a light preview of a project's hero screenshot in
 * the history META store — the full screenshot stays in the heavy PROJECTS
 * store. Returns null if the image can't be decoded or the canvas is blocked.
 */
export function makeThumbnail(dataUrl: string, width = 640): Promise<string | null> {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const ratio = img.naturalHeight / img.naturalWidth || 0.625; // ~16:10 fallback
        const w = Math.min(width, img.naturalWidth || width);
        const h = Math.round(w * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
