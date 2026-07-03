import type { ShowcaseSlide } from '@/types';
import { seedMesh } from './meshGradient';

// IDs de slide stables (Date.now autorisé côté app ; compteur pour l'unicité intra-ms).
let slideSeq = 0;
function newSlideId(): string {
  slideSeq += 1;
  return `sc_${Date.now().toString(36)}_${slideSeq.toString(36)}`;
}

// Agencements par défaut du carrousel (mirroir des références : hero desktop,
// duo & trio de téléphones, second desktop) — chacun avec son propre agencement
// de dégradé (preset 0..3) ET une zone de capture différente (regionY) pour ne
// pas montrer le même endroit du site à chaque slide. Mockups droits (tilt 0).
const DEFAULT_SLIDES: { device: ShowcaseSlide['device']; count: number; regionY: number; stagger: number }[] = [
  { device: 'desktop', count: 1, regionY: 0.0, stagger: 0 },
  // 2 phones : gauche haute, droite basse (descendant).
  { device: 'mobile', count: 2, regionY: 0.2, stagger: 0.7 },
  // 3 phones : montent en hauteur de gauche à droite (ascendant).
  { device: 'mobile', count: 3, regionY: 0.45, stagger: -0.7 },
  { device: 'desktop', count: 1, regionY: 0.55, stagger: 0 },
];

export function makeShowcaseSlide(
  palette: string[],
  presetIndex = 0,
  device: ShowcaseSlide['device'] = 'desktop',
  count = 1,
  regionY = 0,
  stagger = 0,
): ShowcaseSlide {
  return { id: newSlideId(), device, count, regionY, tilt: 0, stagger, mesh: seedMesh(palette, presetIndex) };
}

export function makeDefaultShowcaseSlides(palette: string[]): ShowcaseSlide[] {
  return DEFAULT_SLIDES.map((d, i) => makeShowcaseSlide(palette, i, d.device, d.count, d.regionY, d.stagger));
}
