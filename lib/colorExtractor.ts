// @ts-ignore
import { Vibrant } from 'node-vibrant/node';

export async function extractColors(screenshotBuffer: Buffer) {
  // @ts-ignore
  const palette = await Vibrant.from(screenshotBuffer).getPalette();
  return [
    palette.Vibrant,
    palette.DarkVibrant, 
    palette.LightVibrant,
    palette.Muted,
    palette.DarkMuted,
    palette.LightMuted
  ]
    .filter(Boolean)
    .map(swatch => ({
      hex: swatch!.hex,
      rgb: swatch!.rgb as [number, number, number],
      isLight: swatch!.hsl[2] > 0.5
    }));
}
