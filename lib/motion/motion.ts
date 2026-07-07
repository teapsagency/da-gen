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
function drawBrowser(ctx: CanvasRenderingContext2D, w: number, h: number, A: MotionAssets, panY: number) {
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
  text(ctx, A.domain, 0, cy, `600 ${Math.round(barH * 0.36)}px Satoshi, sans-serif`, "#111");
  ctx.save();
  roundRectPath(ctx, x + w * 0.008, y + barH, w - w * 0.016, h - barH - w * 0.008, r * 0.5);
  ctx.clip();
  if (A.desktopFull) drawCover(ctx, A.desktopFull, x + w * 0.008, y + barH, w - w * 0.016, h - barH - w * 0.008, panY);
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
        // Toutes les bandes MONTENT du bas (dans le sillage de l'intro qui sort
        // vers le haut) ; couverture complète à p≈0.40 → là le fond passe au blanc.
        const a = easeInOutCubic(clamp((p - 0.02 - i * 0.05) / 0.22)); // montée
        const b = easeInOutCubic(clamp((p - 0.46 - i * 0.02) / 0.2)); // compression
        const oy = (1 - a) * MOTION_H;
        const rectY = lerp(0, stripY, b) + oy + ex * MOTION_H * 0.35; // sortie : glisse en bas
        const rectH = lerp(MOTION_H, stripH, b);
        ctx.fillStyle = hex;
        ctx.fillRect(i * bandW, rectY, bandW + 1, rectH);
        const la = easeOutCubic(clamp((p - 0.16 - i * 0.05) / 0.3));
        const labelY = rectY + rectH - lerp(MOTION_H * 0.12, stripH * 0.5, b);
        ctx.save();
        ctx.globalAlpha *= la;
        text(ctx, hex.toUpperCase(), i * bandW + bandW / 2, labelY, `700 30px Satoshi, sans-serif`, readable(hex));
        ctx.restore();
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
      const pan = easeInOutCubic(clamp((p - 0.26) / 0.38)) * 0.9;
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
  // 4 · MOBILES — traversée COMPLÈTE de l'écran (ils sortent par le haut/bas),
  // gauche monte, droite descend, ralenti au croisement, rotation vivante
  {
    key: "mobile", start: 12.6, dur: 4.2,
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
      const pan = easeInOutCubic(clamp((p - 0.44) / 0.26)) * 0.65; // scroll pendant la pause
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
        // Départ : MÊME direction que l'arrivée (ils continuent leur diagonale)
        // mais vers le HAUT — reprennent leur inclinaison de 45° en sortant.
        const sOut = easeAccel(clamp((p - 0.7 - c.outDelay) / 0.3));
        // Demi-cercle : x rejoint le centre avec un renflement latéral, y monte.
        const x = lerp(c.fromX, c.restX, sIn) + Math.sin(sIn * Math.PI) * c.bulge + sOut * (W / 2 - c.restX) * 1.6;
        const y = lerp(H * 1.2, H * 0.5, sIn) - sOut * H * 1.15;
        const rot = lerp(c.rotIn, 0, sUp) + bob * (1 - sOut) + sOut * c.rotIn * 0.85;
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
    key: "ensemble", start: 16.5, dur: 3.4, fadeOut: 0.55,
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
    key: "outro", start: 19.6, dur: 2.5,
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
}): Promise<MotionImages> {
  const [logo, desktopFull, ...mobiles] = await Promise.all([
    loadImg(src.logo),
    loadImg(src.desktopFull),
    ...src.mobiles.slice(0, 3).map((m) => loadImg(m)),
  ]);
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    /* best effort */
  }
  return {
    logo,
    desktopFull,
    mobiles: mobiles.filter((m): m is HTMLImageElement => !!m),
    heroBlur: makeHeroBlur(desktopFull),
  };
}
