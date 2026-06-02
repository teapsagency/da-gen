/**
 * Calcule les positions d'une « planche » de mockups inclinés.
 *
 * Grille inclinée RÉGULIÈRE : chaque cellule = boîte englobante du mockup tourné
 * + un gap FIXE identique → l'espace entre voisins est constant dans les deux
 * axes, quel que soit le nombre, et aucun chevauchement n'est possible (la
 * séparation entre boîtes englobantes vaut toujours `gap`). Le tilt + le débord
 * sur les bords donnent le dynamisme.
 *
 * Boîte englobante d'un rectangle tourné : pour une largeur w (h = w/aspect),
 * BW = kBW·w et BH = kBH·w avec kBW = cos + sin/aspect, kBH = sin + cos/aspect.
 */
export type BoardItem = { x: number; y: number; w: number; h: number };

export function computeBoardGrid(opts: {
  count: number;
  cols: number;
  aspect: number; // largeur/hauteur du mockup
  rot: number; // rotation appliquée au mockup (deg) — pour la boîte englobante
  canvasW: number;
  canvasH: number;
  gap: number; // espace uniforme (px) entre boîtes englobantes voisines
  bleedX: number; // débord horizontal max : la grille peut atteindre canvasW·(1+bleedX)
  bleedY: number; // débord vertical max
  staggerFactor: number; // décalage vertical alterné des colonnes, en fraction de cellH (0 = aligné)
}): BoardItem[] {
  const { count: N, cols, aspect, rot, canvasW, canvasH, gap, bleedX, bleedY, staggerFactor } = opts;
  const rows = Math.ceil(N / cols);
  const rad = (Math.abs(rot) * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const kBW = c + s / aspect; // BW = kBW · w
  const kBH = s + c / aspect; // BH = kBH · w
  // Plus grande largeur w telle que la grille (boîtes + gaps uniformes) tienne
  // dans le budget de débord, sur l'axe le plus contraint.
  const wByWidth = (canvasW * (1 + bleedX) - cols * gap) / (cols * kBW);
  const wByHeight = (canvasH * (1 + bleedY) - rows * gap) / (rows * kBH);
  const w = Math.max(1, Math.min(wByWidth, wByHeight));
  const h = w / aspect;
  const cellW = kBW * w + gap;
  const cellH = kBH * w + gap;
  const gridW = cols * cellW;
  const gridH = rows * cellH;
  const startX = (canvasW - gridW) / 2;
  const startY = (canvasH - gridH) / 2;
  const stagger = staggerFactor * cellH;

  return Array.from({ length: N }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const itemsInRow = row < rows - 1 ? cols : N - cols * (rows - 1);
    const rowShift = ((cols - itemsInRow) * cellW) / 2; // centre une dernière rangée incomplète
    const colOffset = (col % 2 === 0 ? -1 : 1) * stagger;
    return {
      x: startX + col * cellW + rowShift + (cellW - w) / 2,
      y: startY + row * cellH + colOffset + (cellH - h) / 2,
      w,
      h,
    };
  });
}
