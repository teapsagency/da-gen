import type { MeshGradient, MeshPoint } from '@/types';

// ─── Couleurs ───
// Parse #rgb / #rrggbb → [r,g,b] (0..255). Repli gris moyen si illisible.
export function parseHex(hex: string): [number, number, number] {
  let h = (hex || '').trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return [154, 160, 166];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// Mélange linéaire A→B (t = 0 → A, 1 → B).
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

// Luminance perçue (0..255).
const luminance = (hex: string) => {
  const [r, g, b] = parseHex(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

// Chroma (0..255) = amplitude RVB → mesure de saturation grossière.
const chroma = (hex: string) => {
  const [r, g, b] = parseHex(hex);
  return Math.max(r, g, b) - Math.min(r, g, b);
};

// ─── Dérivation des rôles depuis la palette ───
// Accent = couleur la plus saturée (en ignorant les quasi gris) ; repli 1ʳᵉ couleur.
function pickAccent(palette: string[]): string {
  const usable = palette.filter((c) => {
    const l = luminance(c);
    return l > 28 && l < 232; // écarte le noir/blanc purs
  });
  const pool = usable.length ? usable : palette;
  if (!pool.length) return '#6b7280';
  return pool.reduce((best, c) => (chroma(c) > chroma(best) ? c : best), pool[0]);
}

// Couleur la plus sombre / claire de la palette (repli neutre si absente/pas assez marquée).
function pickDark(palette: string[]): string {
  if (!palette.length) return '#23262e';
  const d = palette.reduce((best, c) => (luminance(c) < luminance(best) ? c : best), palette[0]);
  return luminance(d) < 96 ? d : '#23262e';
}
function pickLight(palette: string[]): string {
  if (!palette.length) return '#eef0f2';
  const l = palette.reduce((best, c) => (luminance(c) > luminance(best) ? c : best), palette[0]);
  return luminance(l) > 208 ? l : '#eef0f2';
}

type Role = 'accent' | 'dark' | 'light' | 'neutral';
type Slot = { role: Role; x: number; y: number; radius: number };

// Agencements variés (façon LAYOUT_PRESETS) — fond neutre + éclat de marque,
// dans l'esprit des références (gris + accent dans un coin).
export const MESH_PRESETS: Slot[][] = [
  [
    { role: 'light', x: 0.24, y: 0.16, radius: 0.72 },
    { role: 'dark', x: 0.06, y: 0.92, radius: 0.6 },
    { role: 'neutral', x: 0.58, y: 0.5, radius: 0.95 },
    { role: 'accent', x: 0.96, y: 0.86, radius: 0.6 },
  ],
  [
    { role: 'light', x: 0.72, y: 0.1, radius: 0.62 },
    { role: 'dark', x: 0.08, y: 0.42, radius: 0.58 },
    { role: 'neutral', x: 0.88, y: 0.62, radius: 0.78 },
    { role: 'accent', x: 0.52, y: 1.02, radius: 0.66 },
  ],
  [
    { role: 'light', x: 0.5, y: -0.02, radius: 0.55 },
    { role: 'dark', x: 0.04, y: 0.5, radius: 0.45 },
    { role: 'neutral', x: 0.96, y: 0.3, radius: 0.6 },
    { role: 'accent', x: 0.5, y: 0.94, radius: 0.92 },
  ],
  [
    { role: 'dark', x: 0.1, y: 0.2, radius: 0.62 },
    { role: 'light', x: 0.46, y: 0.32, radius: 0.6 },
    { role: 'neutral', x: 0.5, y: 0.92, radius: 0.85 },
    { role: 'accent', x: 0.92, y: 0.14, radius: 0.62 },
  ],
];

// IDs de points stables (Date.now autorisé côté app ; compteur pour l'unicité intra-ms).
let pointSeq = 0;
export function newMeshPointId(): string {
  pointSeq += 1;
  return `mp_${Date.now().toString(36)}_${pointSeq.toString(36)}`;
}

// Couleur de fond du mesh dérivée de la palette (neutre teinté vers l'accent).
// Extraite pour piloter une base commune à toutes les slides (projet-global).
export function deriveMeshBase(palette: string[]): string {
  return mix('#8f9399', pickAccent((palette || []).filter(Boolean)), 0.06);
}

// Construit un mesh depuis une palette (couleurs hex) + un preset d'agencement.
// Neutres teintés très légèrement vers l'accent pour la cohérence de marque.
export function seedMesh(palette: string[], presetIndex = 0): MeshGradient {
  const clean = (palette || []).filter(Boolean);
  const accent = pickAccent(clean);
  const dark = mix(pickDark(clean), accent, 0.06);
  const light = mix(pickLight(clean), accent, 0.05);
  const neutral = mix('#9aa0a6', accent, 0.08);
  const base = mix('#8f9399', accent, 0.06);
  const colorFor: Record<Role, string> = { accent, dark, light, neutral };

  const preset = MESH_PRESETS[((presetIndex % MESH_PRESETS.length) + MESH_PRESETS.length) % MESH_PRESETS.length];
  const points: MeshPoint[] = preset.map((s) => ({
    id: newMeshPointId(),
    color: colorFor[s.role],
    x: s.x,
    y: s.y,
    radius: s.radius,
  }));
  return { base, points, accent };
}

// Chaîne CSS `background` : radial-gradients empilés (le 1er listé = au-dessus).
// Chaque point fond du centre (opaque) vers la même teinte transparente (évite
// le halo gris que produit le mot-clé `transparent`).
export function meshBackground(mesh: MeshGradient): string {
  if (!mesh.points.length) return 'none';
  return mesh.points
    .map((p) => {
      const [r, g, b] = parseHex(p.color);
      const rad = Math.max(3, p.radius * 100);
      return `radial-gradient(ellipse ${rad}% ${rad}% at ${p.x * 100}% ${p.y * 100}%, rgba(${r},${g},${b},1) 0%, rgba(${r},${g},${b},0) 100%)`;
    })
    .join(', ');
}
