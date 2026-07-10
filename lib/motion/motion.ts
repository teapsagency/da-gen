import { mix, parseHex } from "@/lib/meshGradient";

// ─── Format & timeline ───
export const MOTION_W = 1920;
export const MOTION_H = 1080;
export const MOTION_FPS = 60;

// Images décodées (lourdes — préchargées une fois, indépendantes des réglages).
// `heroBlur` : version floutée de la hero du site, texture ambiante du fond.
export type MotionImages = {
  logo: HTMLImageElement | null;
  desktopFull: HTMLImageElement | null;
  mobiles: HTMLImageElement[];
  heroBlur: HTMLCanvasElement | null;
  // Captures desktop fullpage à dérouler dans la scène « pages » : home +
  // pages additionnelles scrapées (page produit…). [0] = home.
  pages: HTMLImageElement[];
};

// Images + style (couleurs, fond, textes). Reconstruit à chaque réglage sans
// recharger les images → les curseurs du fond réagissent en direct.
export type MotionAssets = MotionImages & {
  colors: string[]; // hex, 1..4
  base: string; // fond du dégradé
  accent: string; // couleur de marque
  bgSpeed: number; // multiplicateur de vitesse du fond
  bgIntensity: number; // multiplicateur d'opacité des blobs
  domain: string;
  siteName: string;
  fontLabel: string;
  // Labels courts « ce qu'on a réalisé » (résolus depuis motionChips) affichés
  // en pastilles pendant les scènes du site. Vide → aucune pastille.
  tags: string[];
  // Libellé d'URL affiché dans la barre du navigateur pour chaque page de la
  // scène « pages » (aligné sur `pages`). [0] = domaine, puis pages additionnelles.
  pageLabels: string[];
};

// ─── Easing (personnalité « premium » : entrées décélérées, sorties accélérées) ───
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// ─── Courbes de Bézier ───
// Solveur cubic-bezier(x1,y1,x2,y2) (équivalent CSS) — Newton-Raphson sur x.
function cubicBezierEase(x1: number, y1: number, x2: number, y2: number) {
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const xt = ((ax * t + bx) * t + cx) * t - x;
      const dx = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(dx) < 1e-6) break;
      t = clamp(t - xt / dx);
    }
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return ((ay * t + by) * t + cy) * t;
  };
}
// Signatures : entrée « emphasized » (MD3), sortie accélérée, pose avec ressort.
const easeEmph = cubicBezierEase(0.05, 0.7, 0.1, 1);
const easeAccel = cubicBezierEase(0.3, 0, 0.8, 0.15);
const easeSpring = cubicBezierEase(0.34, 1.45, 0.64, 1);


const readable = (bg: string) => {
  const [r, g, b] = parseHex(bg);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#111111" : "#ffffff";
};

// ─── Primitives (AUCUNE ombre portée — assets plats, comme le reste de l'app) ───
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, panY = 0) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale, sh = h / scale;
  const sx = (iw - sw) / 2;
  const sy = clamp(panY) * (ih - sh);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Amplitude de scroll adaptée à la HAUTEUR de la page : la vitesse (hauteurs de
// mockup parcourues par seconde) reste CONSTANTE quelle que soit la page. Page
// haute → on descend moins (mais au même rythme lisible) ; page courte → on va
// jusqu'en bas. Renvoie le panY max (0..1) visé sur `seconds` de scroll.
const SCROLL_VP_PER_SEC = 0.6; // vitesse de scroll des mockups (desktop / mobile)
const PAGES_SCROLL_VP_PER_SEC = 0.32; // scène « pages » : bien plus posé (lecture)
function coverMaxPan(img: HTMLImageElement | null, boxW: number, boxH: number, seconds: number, vpPerSec = SCROLL_VP_PER_SEC): number {
  if (!img || !img.naturalWidth || !img.naturalHeight) return 0;
  const scale = Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight);
  const visibleH = boxH / scale; // hauteur d'image réellement visible dans le mockup
  const scrollableVp = img.naturalHeight / visibleH - 1; // « viewports » à parcourir
  if (scrollableVp <= 0.001) return 0;
  return clamp((vpPerSec * seconds) / scrollableVp, 0, 1);
}

function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, cy: number, bw: number, bh: number) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if (!iw || !ih) return;
  const s = Math.min(bw / iw, bh / ih);
  ctx.drawImage(img, cx - (iw * s) / 2, cy - (ih * s) / 2, iw * s, ih * s);
}

function text(ctx: CanvasRenderingContext2D, str: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "center") {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

// translate/rotate/scale autour d'un centre ; fn dessine centré sur (0,0).
function xform(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, rot: number, fn: () => void) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  fn();
  ctx.restore();
}

// ─── Mockups (fidèles aux assets de l'app — dots macOS fins, plat) ───
function drawBrowser(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  A: MotionAssets,
  panY: number,
  img: HTMLImageElement | null = A.desktopFull,
  urlLabel: string = A.domain,
) {
  const x = -w / 2, y = -h / 2;
  const r = w * 0.016;
  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
  // Liseré discret : garde la fenêtre lisible sur le fond blanc (scène iso).
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = Math.max(1.5, w * 0.0015);
  ctx.stroke();
  const barH = h * 0.07;
  const dotR = w * 0.0052;
  const cy = y + barH / 2;
  ["#FF5F57", "#FEBC2E", "#28C840"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + w * 0.02 + i * dotR * 3.4, cy, dotR, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  roundRectPath(ctx, x + w * 0.35, cy - barH * 0.26, w * 0.3, barH * 0.52, barH * 0.26);
  ctx.fill();
  text(ctx, urlLabel, 0, cy, `600 ${Math.round(barH * 0.36)}px Satoshi, sans-serif`, "#111");
  ctx.save();
  roundRectPath(ctx, x + w * 0.008, y + barH, w - w * 0.016, h - barH - w * 0.008, r * 0.5);
  ctx.clip();
  if (img) drawCover(ctx, img, x + w * 0.008, y + barH, w - w * 0.016, h - barH - w * 0.008, panY);
  ctx.restore();
}

function drawPhone(ctx: CanvasRenderingContext2D, w: number, img: HTMLImageElement | null, panY: number) {
  const h = w / 0.49;
  const r = w * 0.12;
  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, -w / 2, -h / 2, w, h, r);
  ctx.fill();
  const b = w * 0.028;
  ctx.save();
  roundRectPath(ctx, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b, r * 0.82);
  ctx.clip();
  if (img) drawCover(ctx, img, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b, panY);
  ctx.restore();
}

// Tablette portrait (bezel blanc, coins plus doux qu'un phone) — affiche la
// capture desktop en cover (rendu très naturel en format tablette).
function drawTablet(ctx: CanvasRenderingContext2D, w: number, img: HTMLImageElement | null, panY: number) {
  const h = w / 0.72;
  const r = w * 0.07;
  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, -w / 2, -h / 2, w, h, r);
  ctx.fill();
  const b = w * 0.032;
  ctx.save();
  roundRectPath(ctx, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b, r * 0.7);
  ctx.clip();
  if (img) drawCover(ctx, img, -w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b, panY);
  ctx.restore();
}

function drawLogoCard(ctx: CanvasRenderingContext2D, cardW: number, cardH: number, A: MotionAssets) {
  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, -cardW / 2, -cardH / 2, cardW, cardH, cardH * 0.16);
  ctx.fill();
  // Liseré discret : garde la carte lisible pendant le passage au fond blanc.
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = Math.max(1.5, cardW * 0.004);
  ctx.stroke();
  if (A.logo) drawContain(ctx, A.logo, 0, 0, cardW * 0.66, cardH * 0.58);
}

// ─── Couleur d'accent du fond qui VOYAGE au fil des scènes ───
// Keyframes aux milieux de scènes : chaque scène tire le fond vers une couleur
// de la palette (mixée à l'accent pour rester dans la marque), interpolation douce.
function accentAt(t: number, A: MotionAssets): string {
  const pal = A.colors.length ? A.colors : [A.accent];
  const colorFor = (i: number) => mix(A.accent, pal[i % pal.length], 0.55);
  const keys = SCENES.map((s, i) => ({ time: s.start + s.dur / 2, color: i === 0 || i === SCENES.length - 1 ? A.accent : colorFor(i) }));
  if (t <= keys[0].time) return keys[0].color;
  for (let i = 0; i < keys.length - 1; i++) {
    if (t <= keys[i + 1].time) {
      const u = easeInOutCubic(clamp((t - keys[i].time) / (keys[i + 1].time - keys[i].time)));
      return mix(keys[i].color, keys[i + 1].color, u);
    }
  }
  return keys[keys.length - 1].color;
}

// ─── Fond de marque vivant (orbites amples + texture du site floutée) ───
// Dessiné en overscan (±12 %) pour rester couvrant sous la caméra globale.
function drawBackground(ctx: CanvasRenderingContext2D, rawT: number, A: MotionAssets, accent: string) {
  const W = MOTION_W, H = MOTION_H;
  const t = rawT * A.bgSpeed * 1.3;
  const M = 0.12;
  ctx.fillStyle = A.base;
  ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), H * (1 + 2 * M));
  // Texture ambiante : la hero du site floutée, qui dérive lentement.
  if (A.heroBlur) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    const drift = Math.sin(rawT * 0.25) * W * 0.03;
    const zoom = 1.25 + 0.06 * Math.sin(rawT * 0.18);
    const bw = W * zoom, bh = (W * zoom * A.heroBlur.height) / A.heroBlur.width;
    ctx.drawImage(A.heroBlur, (W - bw) / 2 + drift, (H - bh) / 2, bw, bh);
    ctx.restore();
  }
  // Nappe « dark » = ombrage du fond pour la profondeur du dégradé. On atténue
  // l'assombrissement à mesure que la base est claire : une base blanche doit
  // rester blanche (« full blanc ») et non virer au gris via cette nappe. Courbe
  // cubique → la profondeur reste quasi intacte sur les bases colorées/sombres
  // (dont le gris par défaut) et ne s'efface que près du blanc pur.
  const [br, bgc, bb] = parseHex(A.base);
  const baseLum = (0.299 * br + 0.587 * bgc + 0.114 * bb) / 255; // 0..1
  const dark = mix(A.base, "#000000", 0.6 * (1 - baseLum ** 3));
  const light = mix(A.base, "#ffffff", 0.55);
  const blob = (cx: number, cy: number, rad: number, color: string, alpha: number) => {
    const [r, g, b] = parseHex(color);
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    grd.addColorStop(0, `rgba(${r},${g},${b},${clamp(alpha * A.bgIntensity)})`);
    grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grd;
    ctx.fillRect(-W * M, -H * M, W * (1 + 2 * M), H * (1 + 2 * M));
  };
  // Amplitudes larges + rayons qui respirent → fond franchement vivant.
  blob(W * 0.5 + Math.cos(t * 0.9) * W * 0.38, H * 0.45 + Math.sin(t * 0.75) * H * 0.42, W * (0.5 + 0.05 * Math.sin(t * 1.3)), accent, 0.66);
  blob(W * 0.5 + Math.cos(t * 0.55 + 2.1) * W * 0.44, H * 0.55 + Math.sin(t * 0.65 + 1.3) * H * 0.44, W * 0.46, dark, 0.58);
  blob(W * 0.5 + Math.cos(t * 1.1 + 4) * W * 0.4, H * 0.5 + Math.sin(t * 0.95 + 3) * H * 0.42, W * (0.4 + 0.04 * Math.cos(t * 1.1)), light, 0.36);
  blob(W * 0.5 + Math.cos(t * 0.7 + 5.2) * W * 0.48, H * 0.5 + Math.sin(t * 1.25 + 0.6) * H * 0.38, W * 0.36, accent, 0.32);
}

// ─── Scènes ───
type Scene = {
  key: string;
  start: number;
  dur: number;
  /** Durée du fondu de sortie (défaut FADE) — allongée quand la sortie doit respirer. */
  fadeOut?: number;
  draw: (ctx: CanvasRenderingContext2D, p: number, t: number, A: MotionAssets) => void;
};

const FADE = 0.28;
// Sortie de scène en MOUVEMENT (bézier accélérée) — le fondu seul fait « diapo ».
const exitP = (p: number) => easeAccel(clamp((p - 0.86) / 0.14));

// ─── Cassure au BLANC (pur) ───
// Le fond ne passe au blanc QUE lorsque les bandes de couleur couvrent toute la
// hauteur (le switch se fait caché derrière elles) ; le dégradé revient pendant
// le dézoom du desktop. Fraction 0.40 = fin de la montée des bandes (voir charte).
function whiteAmount(t: number): number {
  const charte = SCENES.find((s) => s.key === "charte");
  const desktop = SCENES.find((s) => s.key === "desktop");
  if (!charte || !desktop) return 0;
  const covered = charte.start + charte.dur * 0.4;
  const rise = easeInOutCubic(clamp((t - covered) / 0.15));
  // Le blanc TIENT pendant toute la scène iso (le mockup 3D vit sur blanc pur),
  // puis le dégradé revient quand le desktop à plat se pose.
  const fall = easeInOutCubic(clamp((t - (desktop.start + 0.05)) / 0.7));
  return rise * (1 - fall);
}

const SCENES: Scene[] = [
  // 1 · INTRO — tracking-in élégant : le nom se resserre en fondu, le logo se
  // pose au-dessus. Sobre, premium, sans gimmick.
  {
    key: "intro", start: 0, dur: 3.2,
    draw: (ctx, p, t, A) => {
      const ink = readable(A.base);
      ctx.translate(0, -exitP(p) * MOTION_H * 0.4);
      const title = (A.siteName || A.domain).toUpperCase();
      const e = easeEmph(clamp((p - 0.12) / 0.55));
      // Taille ajustée à la largeur (au tracking final).
      let fs = 124;
      const fit = () => {
        ctx.font = `900 ${fs}px 'Cabinet Grotesk', Satoshi, sans-serif`;
        let tw = 0;
        for (const c of title) tw += ctx.measureText(c).width;
        return tw + (title.length - 1) * fs * 0.04;
      };
      let tw = fit();
      if (tw > MOTION_W * 0.8) {
        fs = Math.max(52, (fs * MOTION_W * 0.8) / tw);
        tw = fit();
      }
      // Tracking animé : l'espacement se resserre de large → normal pendant le fondu.
      const track = lerp(fs * 0.34, fs * 0.04, e);
      ctx.font = `900 ${fs}px 'Cabinet Grotesk', Satoshi, sans-serif`;
      let total = 0;
      for (const c of title) total += ctx.measureText(c).width;
      total += (title.length - 1) * track;
      ctx.save();
      ctx.globalAlpha *= easeOutCubic(clamp((p - 0.12) / 0.4));
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillStyle = ink;
      let cx = MOTION_W / 2 - total / 2;
      const baseY = MOTION_H * 0.58;
      for (const c of title) {
        ctx.fillText(c, cx, baseY);
        cx += ctx.measureText(c).width + track;
      }
      ctx.restore();
      // Logo : se pose en douceur au-dessus (scale + fade avec ressort, léger flottement).
      const le = easeSpring(clamp(p / 0.5));
      const cardW = MOTION_W * 0.18;
      ctx.save();
      ctx.globalAlpha *= easeOutCubic(clamp(p / 0.35));
      xform(ctx, MOTION_W / 2, MOTION_H * 0.34 + (1 - le) * 46, lerp(1.14, 1, le), Math.sin(t * 0.8) * 0.005, () =>
        drawLogoCard(ctx, cardW, cardW * 0.52, A),
      );
      ctx.restore();
    },
  },
  // 2 · CHARTE — bandes pleine hauteur qui essuient, puis se compressent en
  // bandeau bas pendant que logo + « Aa » + police entrent (éléments séparés)
  {
    key: "charte", start: 3.0, dur: 3.9,
    draw: (ctx, p, t, A) => {
      // Fond passé au blanc pendant cette scène → encre sombre.
      const ink = whiteAmount(t) > 0.5 ? "#111111" : readable(A.base);
      const n = Math.max(1, A.colors.length);
      const bandW = MOTION_W / n;
      const stripH = MOTION_H * 0.2;
      const stripY = MOTION_H - stripH;
      const ex = exitP(p);
      A.colors.forEach((hex, i) => {
        // Toutes les bandes montent du bas ENSEMBLE (plus de décalage entre
        // elles) ; couverture complète à p≈0.40 → là le fond passe au blanc.
        const a = easeInOutCubic(clamp((p - 0.02) / 0.22)); // montée (synchrone)
        const b = easeInOutCubic(clamp((p - 0.46) / 0.2)); // compression (synchrone)
        const oy = (1 - a) * MOTION_H;
        const rectY = lerp(0, stripY, b) + oy + ex * MOTION_H * 0.35; // sortie : glisse en bas
        const rectH = lerp(MOTION_H, stripH, b);
        ctx.fillStyle = hex;
        ctx.fillRect(i * bandW, rectY, bandW + 1, rectH);
        // Le hex est SOLIDAIRE de sa bande (il monte/compresse avec elle) → pas
        // de transition d'opacité propre, il suit simplement le fondu de la scène.
        const labelY = rectY + rectH - lerp(MOTION_H * 0.12, stripH * 0.5, b);
        text(ctx, hex.toUpperCase(), i * bandW + bandW / 2, labelY, `700 30px Satoshi, sans-serif`, readable(hex));
      });
      // Bloc typo/logo (au-dessus du bandeau) — rise + scale, sortie vers le haut.
      const ce = easeEmph(clamp((p - 0.55) / 0.35));
      ctx.save();
      ctx.globalAlpha *= ce;
      ctx.translate(0, (1 - ce) * 70 - ex * MOTION_H * 0.4);
      const cardW = MOTION_W * 0.16;
      xform(ctx, MOTION_W / 2, MOTION_H * 0.2, lerp(1.2, 1, ce), 0, () => drawLogoCard(ctx, cardW, cardW * 0.52, A));
      text(ctx, "Aa", MOTION_W / 2, MOTION_H * 0.47, `900 150px 'Cabinet Grotesk', Satoshi, sans-serif`, ink);
      if (A.fontLabel) text(ctx, A.fontLabel, MOTION_W / 2, MOTION_H * 0.6, `600 36px Satoshi, sans-serif`, ink);
      ctx.restore();
    },
  },
  // 3 · SITE DESKTOP — zoom énorme (recouvre tout) → se cale en iso, scroll
  // naturel, sortie douce (fondu allongé + zoom-through modéré)
  {
    key: "iso", start: 6.7, dur: 2.7, fadeOut: 0.4,
    draw: (ctx, p, t, A) => {
      // Scène À PART : le mockup 3D isométrique qui TOURNE (réf), sur le fond
      // blanc. Il sort par le haut en accélérant — la scène suivante (desktop à
      // plat) est une AUTRE instance, avec sa propre entrée : plus de morph moche.
      const w = MOTION_W * 0.6;
      const h = w * 0.6;
      const ein = easeEmph(clamp(p / 0.38));
      const sweep = easeInOutCubic(clamp(p / 0.92)); // rotation continue toute la scène
      const beta = lerp(-0.66, -0.38, sweep); // rotateY (3D)
      const alpha = lerp(0.36, 0.2, sweep); // rotateX (3D)
      const rz = lerp(-0.1, 0.09, sweep);
      const zoom = lerp(1.14, 1.3, sweep) * lerp(0.94, 1, ein);
      const pan = 0.04 + easeInOutCubic(p) * 0.12;
      const ex = exitP(p);
      const x = MOTION_W / 2 - ex * MOTION_W * 0.18;
      const y = MOTION_H / 2 + (1 - ein) * MOTION_H * 0.1 - ex * MOTION_H * 0.9;
      xform(ctx, x, y, zoom, rz, () => {
        // Projection parallèle d'un plan tourné rotateY(β) puis rotateX(α).
        ctx.transform(Math.cos(beta), Math.sin(beta) * Math.sin(alpha), 0, Math.cos(alpha), 0, 0);
        drawBrowser(ctx, w, h, A, pan);
      });
    },
  },
  // 3b · DESKTOP FULL — nouvelle instance À PLAT : entre en se posant, scrolle,
  // flotte… puis chute NATURELLE (montée douce → arrêt → gravité pure)
  {
    key: "desktop", start: 9.2, dur: 3.7, fadeOut: 0.12,
    draw: (ctx, p, t, A) => {
      const w = MOTION_W * 0.62;
      const h = w * 0.6;
      const ein = easeEmph(clamp(p / 0.32));
      const zoom = lerp(1.12, 1, ein);
      const rise = (1 - ein) * MOTION_H * 0.16; // entre en se posant depuis le bas
      const rz = -0.02 + Math.sin(t * 0.5) * 0.005;
      // Scroll à vitesse constante, adaptée à la hauteur de la page (voir coverMaxPan).
      const pan = easeInOutCubic(clamp((p - 0.1) / 0.6)) * coverMaxPan(A.desktopFull, w, h, 2.2);
      const drift = Math.sin(t * 0.7) * MOTION_H * 0.008; // il flotte…
      // Chute naturelle en 2 temps : montée DOUCE qui décélère jusqu'à l'arrêt
      // (apex), puis gravité pure depuis vitesse nulle (accélération constante).
      const q = clamp((p - 0.7) / 0.3);
      const lift = -MOTION_H * 0.045 * easeInOutCubic(Math.min(1, q / 0.3));
      const fq = Math.max(0, (q - 0.3) / 0.7);
      const fall = MOTION_H * 1.7 * fq * fq;
      const rotFall = 0.12 * fq * fq; // la rotation n'apparaît qu'en tombant
      xform(ctx, MOTION_W / 2 + fq * MOTION_W * 0.02, MOTION_H / 2 + drift + rise + lift + fall, zoom, rz + rotFall, () =>
        drawBrowser(ctx, w, h, A, pan),
      );
    },
  },
  // 3c · PAGES — DOUBLE VUE : desktop (gauche) + mobile (droite) de la MÊME page,
  // en même temps, avec un scroll LENT à vitesse constante (lecture posée). Home
  // puis pages produit scrapées, l'une après l'autre.
  {
    key: "pages", start: 12.9, dur: 6.0, fadeOut: 0.4,
    draw: (ctx, p, t, A) => {
      const pages = A.pages.length ? A.pages : A.desktopFull ? [A.desktopFull] : [];
      if (!pages.length) return;
      const n = Math.min(pages.length, 2); // home + 1 page (la double vue est large)
      const seg = 1 / n;
      const idx = Math.min(n - 1, Math.floor(p / seg));
      const lp = clamp((p - idx * seg) / seg); // progression DANS la page courante
      const deskImg = pages[idx];
      const mobImg = A.mobiles[idx] ?? null;
      const label = A.pageLabels[idx] ?? A.domain;
      // Transition entre pages : glisse en entrant / en sortant (sauf la dernière).
      const ein = easeEmph(clamp(lp / 0.14));
      const eout = idx < n - 1 ? easeAccel(clamp((lp - 0.86) / 0.14)) : 0;
      const dx = (1 - ein) * MOTION_W * 0.12 - eout * MOTION_W * 0.12;
      const enter = lerp(1.03, 1, ein) * (1 + 0.006 * Math.sin(t * 0.8)); // zoom d'entrée + respiration
      // Scroll lent à vitesse CONSTANTE, calé sur la durée du créneau de la page.
      const scrollP = easeInOutCubic(clamp((lp - 0.06) / 0.86));
      const secs = 0.86 * (6.0 / n);
      const wD = MOTION_W * 0.5, hD = wD * 0.6, wM = MOTION_W * 0.15;
      const panD = scrollP * coverMaxPan(deskImg, wD, hD, secs, PAGES_SCROLL_VP_PER_SEC);
      const panM = scrollP * coverMaxPan(mobImg, wM, wM / 0.49, secs, PAGES_SCROLL_VP_PER_SEC);
      ctx.save();
      ctx.globalAlpha *= ein * (1 - eout);
      // Desktop (grand, à gauche)
      xform(ctx, MOTION_W * 0.36 + dx, MOTION_H / 2, enter, 0, () =>
        drawBrowser(ctx, wD, hD, A, panD, deskImg, label),
      );
      // Mobile (à droite, léger flottement propre)
      if (mobImg) {
        xform(ctx, MOTION_W * 0.8 + dx, MOTION_H / 2 + Math.sin(t * 0.9) * MOTION_H * 0.006, enter, 0, () =>
          drawPhone(ctx, wM, mobImg, panM),
        );
      }
      ctx.restore();
    },
  },
  // 4 · MOBILES — traversée COMPLÈTE de l'écran (ils sortent par le haut/bas),
  // gauche monte, droite descend, ralenti au croisement, rotation vivante
  {
    key: "mobile", start: 18.6, dur: 4.2,
    draw: (ctx, p, t, A) => {
      const imgs = A.mobiles.length ? A.mobiles : [null];
      const w = MOTION_W * 0.16;
      const W = MOTION_W, H = MOTION_H;
      // Chorégraphie en DEMI-CERCLE : ils arrivent COUCHÉS (horizontaux) des
      // coins bas gauche/droit, montent en arc en se redressant, se retrouvent
      // DEBOUT côte à côte au centre (petite pause, ils scrollent), puis
      // repartent tous les deux vers le HAUT.
      const sIn = easeInOutCubic(clamp(p / 0.46)); // montée en arc
      const sUp = easeSpring(clamp(p / 0.46)); // redressement (léger ressort)
      // Scroll à vitesse constante adaptée à la hauteur de la page (coverMaxPan),
      // étalé sur toute la pause debout — au-delà de l'accueil vers le contenu.
      const pan = easeInOutCubic(clamp((p - 0.36) / 0.34)) * coverMaxPan(imgs[0], w, w / 0.49, 1.43);
      const bob = Math.sin(t * 1.6) * 0.008; // micro-flottement debout
      const QUART = Math.PI / 4; // 45°
      const phones: { fromX: number; restX: number; bulge: number; rotIn: number; outDelay: number; scale: number; alpha: number; imgIdx: number }[] = [
        ...(imgs.length >= 3
          ? [{ fromX: W * 0.5, restX: W * 0.5, bulge: 0, rotIn: 0.2, outDelay: 0.03, scale: 0.78, alpha: 0.92, imgIdx: 2 }]
          : []),
        // Gauche : à 45°, arrive du bas-gauche, l'arc bombe vers l'extérieur.
        { fromX: -W * 0.06, restX: W * 0.41, bulge: -W * 0.09, rotIn: -QUART, outDelay: 0, scale: 1, alpha: 1, imgIdx: 0 },
        // Droite : à 45°, arrive du bas-droit (miroir), part un souffle après.
        { fromX: W * 1.06, restX: W * 0.59, bulge: W * 0.09, rotIn: QUART, outDelay: 0.05, scale: 1, alpha: 1, imgIdx: 1 },
      ];
      for (const c of phones) {
        const sOut = easeAccel(clamp((p - 0.7 - c.outDelay) / 0.3));
        // Entrée : arc depuis le coin bas (couché → debout au centre).
        const inX = lerp(c.fromX, c.restX, sIn) + Math.sin(sIn * Math.PI) * c.bulge;
        const inY = lerp(H * 1.2, H * 0.5, sIn);
        const inRot = lerp(c.rotIn, 0, sUp);
        // Sortie = EXACTEMENT l'entrée en MIROIR, mais vers le HAUT : même arc,
        // même reprise d'inclinaison à 45°, ils repartent par les coins hauts.
        const outX = lerp(c.restX, c.fromX, sOut) + Math.sin(sOut * Math.PI) * c.bulge;
        const outY = lerp(H * 0.5, -H * 0.25, sOut);
        const outRot = lerp(0, c.rotIn, sOut);
        const x = sOut > 0 ? outX : inX;
        const y = sOut > 0 ? outY : inY;
        const rot = (sOut > 0 ? outRot : inRot) + bob * (1 - sOut);
        ctx.save();
        ctx.globalAlpha *= c.alpha;
        xform(ctx, x, y, c.scale, rot, () => drawPhone(ctx, w, imgs[c.imgIdx % imgs.length], pan));
        ctx.restore();
      }
    },
  },
  // 5 · ENSEMBLE — PC centré et DROIT ; tablette et mobile viennent se poser
  // PAR-DESSUS (léger drop shadow = ils sont au-dessus). Fin en repli doux.
  {
    key: "ensemble", start: 22.5, dur: 3.4, fadeOut: 0.55,
    draw: (ctx, p, t, A) => {
      const breathe = 1 + 0.012 * Math.sin(t * 0.9);
      // Fin douce : léger recul d'échelle (match-dissolve avec l'outro), pas de zoom-through.
      const soft = 1 - easeInOutCubic(clamp((p - 0.84) / 0.16)) * 0.06;
      xform(ctx, MOTION_W / 2, MOTION_H / 2, breathe * soft, 0, () => {
        const eB = easeEmph(clamp(p / 0.38)); // PC (centre) d'abord
        const eT = easeEmph(clamp((p - 0.12) / 0.4)); // tablette (gauche)
        const eP = easeEmph(clamp((p - 0.2) / 0.4)); // mobile (droite)
        // PC — centré, AUCUNE rotation, se pose en zoom.
        ctx.save();
        ctx.globalAlpha *= easeOutCubic(clamp(p / 0.24));
        xform(ctx, 0, lerp(MOTION_H * 0.05, 0, eB), lerp(1.18, 1, eB), 0, () =>
          drawBrowser(ctx, MOTION_W * 0.5, MOTION_W * 0.3, A, 0.1),
        );
        ctx.restore();
        // Tablette + mobile — un peu AU-DESSUS du desktop, posés PAR-DESSUS :
        // petit drop shadow volontaire pour marquer la superposition.
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.28)";
        ctx.shadowBlur = MOTION_W * 0.025;
        ctx.shadowOffsetY = MOTION_H * 0.018;
        ctx.save();
        ctx.globalAlpha *= easeOutCubic(clamp((p - 0.12) / 0.25));
        xform(ctx, lerp(-MOTION_W * 0.62, -MOTION_W * 0.285, eT), -MOTION_H * 0.05, 1, 0, () =>
          drawTablet(ctx, MOTION_W * 0.15, A.desktopFull, 0.35),
        );
        ctx.restore();
        ctx.save();
        ctx.globalAlpha *= easeOutCubic(clamp((p - 0.2) / 0.25));
        xform(ctx, lerp(MOTION_W * 0.62, MOTION_W * 0.285, eP), -MOTION_H * 0.03, 1, 0, () =>
          drawPhone(ctx, MOTION_W * 0.105, A.mobiles[0] ?? null, 0.3),
        );
        ctx.restore();
        ctx.restore();
      });
    },
  },
  // 6 · OUTRO — logo qui se pose, signature ; tient jusqu'à la fin
  {
    key: "outro", start: 25.6, dur: 2.5,
    draw: (ctx, p, t, A) => {
      const ink = readable(A.base);
      // Entrée douce en continuité du repli de la scène précédente (match-dissolve).
      const e = easeEmph(clamp(p / 0.45));
      const cardW = MOTION_W * 0.23;
      xform(ctx, MOTION_W / 2, MOTION_H * 0.42, lerp(0.94, 1, e), Math.sin(t * 0.7) * 0.004, () =>
        drawLogoCard(ctx, cardW, cardW * 0.5, A),
      );
      const tA = easeOutCubic(clamp((p - 0.22) / 0.4));
      ctx.save();
      ctx.globalAlpha *= tA;
      text(ctx, A.domain, MOTION_W / 2, MOTION_H * 0.64, `700 46px 'Cabinet Grotesk', Satoshi, sans-serif`, ink);
      text(ctx, "Direction artistique · TEAPS", MOTION_W / 2, MOTION_H * 0.72, `500 28px Satoshi, sans-serif`, ink === "#ffffff" ? "rgba(255,255,255,0.75)" : "rgba(17,17,17,0.6)");
      ctx.restore();
    },
  },
];

export const MOTION_DURATION = SCENES.reduce((m, s) => Math.max(m, s.start + s.dur), 0);

function sceneAlpha(t: number, s: Scene): number {
  if (t < s.start - 0.001 || t > s.start + s.dur + 0.001) return 0;
  const inA = clamp((t - s.start) / FADE);
  const outA = clamp((s.start + s.dur - t) / (s.fadeOut ?? FADE));
  return easeInOutCubic(Math.min(inA, outA));
}

// ─── Pastilles « ce qu'on a réalisé » (overlay écran, HORS caméra) ───
// Elles entrent une par une (glisse + ressort), s'accumulent autour du mockup,
// puis TOMBENT TOUTES ENSEMBLE — synchronisées sur la chute du mockup desktop :
// petit rollback (remontée/anticipation) puis gravité pure, avec une rotation
// ALÉATOIRE par pastille et un micro-décalage de quelques dizaines de ms.
// Style plat cohérent app : corps blanc, fine bordure, texte seul — AUCUNE ombre.
const TAGS_START = 9.7; // 1ère pastille (le desktop est posé)
const TAG_STAGGER = 0.28; // entrées décalées
const TAG_ENTER = 0.55; // durée d'entrée
const DROP_TIME = 11.9; // LÂCHER commun, calé sur la chute du mockup desktop (p≈0.7)
const DROP_DUR = 1.2; // durée de chute

// Ancres : bord d'ancrage (fraction W) + côté d'expansion + hauteur de repos
// (fraction H). Alternent droite/gauche et évitent le centre occupé par le mockup.
const TAG_ANCHORS: { ax: number; ay: number; side: "l" | "r"; phase: number }[] = [
  { ax: 0.87, ay: 0.22, side: "r", phase: 0 },
  { ax: 0.13, ay: 0.34, side: "l", phase: 1.7 },
  { ax: 0.88, ay: 0.48, side: "r", phase: 3.1 },
  { ax: 0.12, ay: 0.6, side: "l", phase: 4.2 },
  { ax: 0.84, ay: 0.72, side: "r", phase: 5.0 },
  { ax: 0.16, ay: 0.2, side: "l", phase: 2.4 },
];

// Pseudo-aléatoire déterministe par pastille (stable frame à frame → pas de
// tremblement sous le motion blur, mais varié d'une pastille à l'autre).
function hash01(n: number): number {
  const s = Math.sin(n * 12.9898 + 4.13) * 43758.5453;
  return s - Math.floor(s);
}

function drawTags(ctx: CanvasRenderingContext2D, t: number, A: MotionAssets) {
  if (!A.tags.length) return;
  const W = MOTION_W, H = MOTION_H;
  const FS = 30, PADX = 32, PILL_H = 64;
  ctx.font = `600 ${FS}px Satoshi, sans-serif`;

  A.tags.forEach((label, i) => {
    if (i >= TAG_ANCHORS.length) return; // cap = nb d'ancres (aligné sur MOTION_TAG_LIMIT)
    const a = TAG_ANCHORS[i];
    const local = t - (TAGS_START + i * TAG_STAGGER);
    if (local < 0) return; // pas encore née
    const dir = a.side === "r" ? 1 : -1;

    // Tirages aléatoires STABLES : sens + amplitude de rotation, micro-décalage
    // du lâcher (quelques dizaines de ms → la chute n'est pas parfaitement pile).
    const spinDir = hash01(i + 1) < 0.5 ? -1 : 1;
    const spinAmt = 0.7 + hash01(i * 3 + 2) * 1.0; // 0.7..1.7
    const dropAt = DROP_TIME + hash01(i * 7 + 5) * 0.12;

    // Entrée : glisse depuis l'extérieur avec un léger overshoot (ressort),
    // arrive un chouïa inclinée puis se redresse, fondu doux.
    const pe = clamp(local / TAG_ENTER);
    const enter = easeOutCubic(pe);
    const spring = easeSpring(pe); // peut dépasser 1 → overshoot
    const scale = lerp(0.82, 1, spring);

    // Chute COMMUNE (synchro desktop) : rollback (remonte un peu → apex) puis
    // gravité pure, exactement comme la frame desktop qu'on lâche.
    const drop = (t - dropAt) / DROP_DUR;
    if (drop > 1.0) return; // tombée hors cadre
    let dy = 0, spin = 0;
    if (drop > 0) {
      const lift = -H * 0.055 * easeOutCubic(clamp(drop / 0.22)); // rollback vers le haut
      const fq = Math.max(0, (drop - 0.22) / 0.78); // gravité après l'apex
      dy = lift + H * 1.9 * fq * fq;
      spin = spinDir * spinAmt * (0.35 * fq + 0.9 * fq * fq); // tumble qui s'emballe
    }
    const falling = clamp(drop);

    const textW = ctx.measureText(label).width;
    const pillW = PADX * 2 + textW;
    const edge = a.ax * W;
    const restX = a.side === "r" ? edge - pillW / 2 : edge + pillW / 2;

    const bob = Math.sin(t * 1.25 + a.phase) * 5 * (1 - falling); // flottement, éteint en tombant
    const cx = restX + dir * (1 - spring) * W * 0.05 + spinDir * falling * falling * W * 0.02;
    const cy = a.ay * H + bob + dy;
    const rot = (1 - spring) * dir * 0.08 + spin; // redressement à l'entrée, tumble à la chute

    ctx.save();
    ctx.globalAlpha *= enter;
    xform(ctx, cx, cy, scale, rot, () => {
      roundRectPath(ctx, -pillW / 2, -PILL_H / 2, pillW, PILL_H, PILL_H / 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, label, 0, 1, `600 ${FS}px Satoshi, sans-serif`, "#111", "center");
    });
    ctx.restore();
  });
}

// Rend UN échantillon temporel complet au temps t (une passe opaque).
function renderSample(ctx: CanvasRenderingContext2D, t: number, A: MotionAssets) {
  const W = MOTION_W, H = MOTION_H;
  ctx.clearRect(0, 0, W, H);
  // Caméra globale : dérive lente (zoom + micro-rotation) → rien n'est jamais figé.
  const cam = 1.025 + 0.014 * Math.sin(t * 0.32);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(cam, cam);
  ctx.rotate(Math.sin(t * 0.21) * 0.004);
  ctx.translate(-W / 2, -H / 2);
  drawBackground(ctx, t, A, accentAt(t, A));
  // Cassure au blanc (charte) → retour au dégradé (dézoom desktop).
  const wf = whiteAmount(t);
  if (wf > 0.001) {
    ctx.save();
    ctx.globalAlpha = wf;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-W * 0.12, -H * 0.12, W * 1.24, H * 1.24);
    ctx.restore();
  }
  for (const s of SCENES) {
    const a = sceneAlpha(t, s);
    if (a <= 0.001) continue;
    const p = clamp((t - s.start) / s.dur);
    ctx.save();
    ctx.globalAlpha = a;
    s.draw(ctx, p, t, A);
    ctx.restore();
  }
  ctx.restore();
  // Vignette cinéma discrète (profondeur sans drop shadow) — quasi coupée
  // pendant la cassure au blanc pour garder un blanc PUR.
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, `rgba(0,0,0,${0.2 * (1 - wf * 0.9)})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  // Pastilles « ce qu'on a réalisé » — overlay UI net, au-dessus de tout.
  drawTags(ctx, t, A);
}

// Canvas d'échantillon réutilisé (motion blur) — alloué une fois.
let sampleCanvas: HTMLCanvasElement | null = null;
function getSampleCtx(): CanvasRenderingContext2D | null {
  if (!sampleCanvas) {
    sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = MOTION_W;
    sampleCanvas.height = MOTION_H;
  }
  return sampleCanvas.getContext("2d");
}

/**
 * Dessine une frame au temps t (secondes). Aperçu ET export.
 * `blurSamples > 1` = MOTION BLUR façon After Effects : on rend N échantillons
 * répartis sur la fenêtre du shutter (180° = ½ frame) et on les MOYENNE
 * (alpha 1/(j+1) sur des passes opaques = moyenne uniforme exacte) — les
 * éléments rapides filent, les statiques restent nets.
 */
export function drawFrame(ctx: CanvasRenderingContext2D, t: number, A: MotionAssets, blurSamples = 1) {
  if (blurSamples <= 1) {
    renderSample(ctx, t, A);
    return;
  }
  const sctx = getSampleCtx();
  if (!sctx || !sampleCanvas) {
    renderSample(ctx, t, A);
    return;
  }
  const shutter = 0.5 / MOTION_FPS; // 180°, le défaut After Effects
  for (let j = 0; j < blurSamples; j++) {
    const tt = Math.max(0, t - (shutter * (blurSamples - 1 - j)) / (blurSamples - 1));
    renderSample(sctx, tt, A);
    ctx.globalAlpha = 1 / (j + 1);
    ctx.drawImage(sampleCanvas, 0, 0);
  }
  ctx.globalAlpha = 1;
}

// ─── Préchargement des IMAGES uniquement (les réglages de style sont à part) ───
function loadImg(src: string | null | undefined): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    // Évite de tainter le canvas (→ échec d'encodage) si un logo est servi
    // cross-origin. Sans effet sur les dataURLs (screenshots).
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Pré-floute la hero du site UNE FOIS (petit canvas + filter blur) — réutilisée
// telle quelle à chaque frame, coût nul en lecture. Fallback : le simple
// downscale/upscale suffit à flouter si `filter` n'est pas supporté.
function makeHeroBlur(img: HTMLImageElement | null): HTMLCanvasElement | null {
  if (!img || !img.naturalWidth) return null;
  const w = 320;
  const srcH = Math.min(img.naturalHeight, img.naturalWidth * 0.66); // ~zone hero
  const h = Math.round((w * srcH) / img.naturalWidth);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cctx = c.getContext("2d");
  if (!cctx) return null;
  cctx.filter = "blur(10px)";
  cctx.drawImage(img, 0, 0, img.naturalWidth, srcH, 0, 0, w, h);
  return c;
}

export async function preloadMotionImages(src: {
  logo?: string | null;
  desktopFull?: string | null;
  mobiles: string[];
  extraDesktops?: string[];
}): Promise<MotionImages> {
  const [logo, desktopFull, mobiles, extras] = await Promise.all([
    loadImg(src.logo),
    loadImg(src.desktopFull),
    Promise.all(src.mobiles.slice(0, 3).map((m) => loadImg(m))).then((a) =>
      a.filter((m): m is HTMLImageElement => !!m),
    ),
    Promise.all((src.extraDesktops ?? []).slice(0, 2).map((d) => loadImg(d))).then((a) =>
      a.filter((m): m is HTMLImageElement => !!m),
    ),
  ]);
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    /* best effort */
  }
  // Pages à dérouler dans la scène « pages » : la home d'abord, puis les pages
  // additionnelles scrapées (page produit…).
  const pages = [desktopFull, ...extras].filter((m): m is HTMLImageElement => !!m);
  return {
    logo,
    desktopFull,
    mobiles,
    heroBlur: makeHeroBlur(desktopFull),
    pages,
  };
}
