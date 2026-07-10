"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { Play, Pause, Film, Loader2, Download, RotateCcw, Music, X, Tag, ChevronDown } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { seedMesh } from "@/lib/meshGradient";
import { sanitizeName } from "@/lib/exportFrames";
import { ChipSelector } from "@/components/ui/ChipSelector";
import { resolveMotionTags, resolveMotionHeadline } from "@/lib/projectChips";
import {
  drawFrame,
  preloadMotionImages,
  motionDuration,
  MOTION_W,
  MOTION_H,
  type MotionImages,
  type MotionAssets,
} from "@/lib/motion/motion";
import { exportMotionMp4, motionExportBlocker } from "@/lib/motion/exportVideo";

const labelCls = "text-[10px] font-bold text-foreground/40 whitespace-nowrap uppercase tracking-wider";

// Interrupteur on/off — même personnalité que les SlidingTabs : à la pression
// le bouton S'ÉTIRE (ancré de son côté), au relâchement il GLISSE et se cale
// avec un léger dépassement (ressort), le fond suit en douceur.
const TRACK_W = 36, TRACK_PAD = 2, KNOB = 16, KNOB_PRESSED = 21;
function Switch({ checked, onChange, label, title }: { checked: boolean; onChange: (v: boolean) => void; label: string; title?: string }) {
  const [pressed, setPressed] = useState(false);
  const knobW = pressed ? KNOB_PRESSED : KNOB;
  return (
    <button
      onClick={() => onChange(!checked)}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className="flex items-center gap-2 cursor-pointer select-none"
      title={title}
    >
      <span className={labelCls}>{label}</span>
      <span
        className={`relative rounded-full transition-colors duration-200 ${checked ? "bg-foreground" : "bg-foreground/15"}`}
        style={{ width: TRACK_W, height: KNOB + TRACK_PAD * 2 }}
      >
        <span
          className="absolute rounded-full bg-background shadow-sm pointer-events-none"
          style={{
            top: TRACK_PAD,
            height: KNOB,
            width: knobW,
            left: checked ? TRACK_W - TRACK_PAD - knobW : TRACK_PAD,
            transition:
              "left 300ms cubic-bezier(0.34, 1.4, 0.5, 1), width 200ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </span>
    </button>
  );
}

// Carte de section des réglages (titre + contrôles inline).
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-card rounded-md px-3 py-2.5 flex flex-col gap-2">
      <span className="text-[9.5px] font-bold uppercase tracking-widest text-foreground/30">{title}</span>
      <div className="flex items-center gap-4 flex-wrap min-h-[26px]">{children}</div>
    </div>
  );
}

/**
 * Motion Studio : vidéo de présentation cinématique (typo → charte → site →
 * mobiles → planche → outro) générée depuis les assets du projet, sur un fond
 * de marque animé RÉGLABLE (base/accent/vitesse/intensité, persisté par projet).
 * Aperçu canvas en direct + export MP4 60 fps (WebCodecs H.264).
 *
 * Les images (lourdes) sont préchargées à part des réglages de style → bouger
 * un curseur du fond redessine immédiatement, sans recharger les captures.
 */
export function MotionStudio() {
  const scrapeResult = useDAStore((s) => s.scrapeResult);
  const selectedLogo = useDAStore((s) => s.selectedLogo);
  const selectedColors = useDAStore((s) => s.selectedColors);
  const showcaseMeshBase = useDAStore((s) => s.showcaseMeshBase);
  const setShowcaseMeshBase = useDAStore((s) => s.setShowcaseMeshBase);
  const motionBg = useDAStore((s) => s.motionBg);
  const setMotionBg = useDAStore((s) => s.setMotionBg);
  const fontName = useDAStore((s) => s.fontName);
  const motionChips = useDAStore((s) => s.motionChips);
  const setMotionChips = useDAStore((s) => s.setMotionChips);
  const motionCharte = useDAStore((s) => s.motionCharte);
  const setMotionCharte = useDAStore((s) => s.setMotionCharte);
  const projectName = useDAStore((s) => s.projectName);
  const setProjectName = useDAStore((s) => s.setProjectName);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<MotionImages | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  // Bande-son (session uniquement — pas persistée) : buffer décodé pour
  // l'export + élément <audio> pour l'aperçu synchronisé.
  const [audio, setAudio] = useState<{ name: string; buffer: AudioBuffer; el: HTMLAudioElement; url: string } | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  // Motion blur façon AE (échantillonnage du shutter). Aperçu 2 passes, export 4.
  const [motionBlur, setMotionBlur] = useState(true);
  // Panneau « Ce qu'on a réalisé » (pastilles) — replié par défaut.
  const [showTags, setShowTags] = useState(false);

  // Labels courts résolus depuis la sélection (type de site + techno + services),
  // capés à 6 → pastilles affichées dans la vidéo.
  const tags = useMemo(() => resolveMotionTags(motionChips), [motionChips]);
  // Titre de la scène « prestation » (« Création de site vitrine »…).
  const headline = useMemo(() => resolveMotionHeadline(motionChips), [motionChips]);
  // Durée de la timeline active (la scène charte l'allonge de ~3,7 s).
  const duration = motionDuration(motionCharte);

  // Raison du blocage de l'export (HTTPS manquant vs navigateur sans WebCodecs),
  // évaluée après montage pour lire le vrai contexte du navigateur.
  const [exportBlocker, setExportBlocker] = useState<string | null>(null);
  useEffect(() => setExportBlocker(motionExportBlocker()), []);
  const exportable = !exportBlocker;

  // ─── Images (préchargées quand le projet change) ───
  const imageSources = useMemo(() => {
    if (!scrapeResult) return null;
    return {
      logo: selectedLogo || scrapeResult.logo || null,
      desktopFull: scrapeResult.screenshots.desktopFull,
      mobiles: [scrapeResult.screenshots.mobile, ...scrapeResult.extraPages.map((p) => p.mobile)].filter(Boolean) as string[],
      // Captures desktop des pages additionnelles → déroulées dans la scène « pages ».
      extraDesktops: scrapeResult.extraPages.map((p) => p.desktopFull).filter(Boolean) as string[],
    };
  }, [scrapeResult, selectedLogo]);

  useEffect(() => {
    if (!imageSources) return;
    let cancelled = false;
    setImages(null);
    setPlaying(false);
    setTime(0);
    preloadMotionImages(imageSources).then((imgs) => {
      if (!cancelled) setImages(imgs);
    });
    return () => {
      cancelled = true;
    };
  }, [imageSources]);

  // ─── Style (léger — recalculé à chaque réglage, sans rechargement) ───
  const palette = useMemo(
    () => (selectedColors.length ? selectedColors : scrapeResult?.colors.slice(0, 4).map((c) => c.hex) ?? []),
    [selectedColors, scrapeResult],
  );
  const derivedAccent = useMemo(() => seedMesh(palette).accent ?? palette[0] ?? "#6b7280", [palette]);
  const accent = motionBg.accent ?? derivedAccent;

  const assets: MotionAssets | null = useMemo(() => {
    if (!images || !scrapeResult) return null;
    const domain = scrapeResult.domain.replace(/^www\./, "");
    return {
      ...images,
      colors: palette.slice(0, 4),
      base: showcaseMeshBase,
      accent,
      accentLocked: motionBg.accent !== null,
      bgSpeed: motionBg.speed,
      bgIntensity: motionBg.intensity,
      domain,
      // Le nom saisi à la main prime — le siteName scrapé est souvent un title
      // SEO (« Carrelage Toulon - … ») et non le nom de la marque.
      siteName: projectName.trim() || scrapeResult.siteName || domain,
      fontLabel: fontName || scrapeResult.font?.name || "",
      tags,
      headline,
      includeCharte: motionCharte,
      // Home + pages additionnelles (barre du navigateur de la scène « pages »).
      pageLabels: [domain, ...scrapeResult.extraPages.slice(0, 2).map((p) => p.label?.trim() || domain)],
    };
  }, [images, scrapeResult, palette, showcaseMeshBase, accent, motionBg.accent, motionBg.speed, motionBg.intensity, fontName, tags, headline, motionCharte, projectName]);

  const drawAt = useCallback(
    (ti: number) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && assets) drawFrame(ctx, ti, assets, motionBlur ? 2 : 1);
    },
    [assets, motionBlur],
  );

  // Redessine la frame courante à chaque changement d'assets (réglages du fond
  // inclus) — donne le retour immédiat même en pause.
  useEffect(() => {
    if (assets) drawAt(time);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  // Boucle de lecture (rAF) — dessine impérativement.
  useEffect(() => {
    if (!playing || !assets) return;
    let raf = 0;
    let last = 0;
    const tick = (ts: number) => {
      if (!last) last = ts;
      const dt = (ts - last) / 1000;
      last = ts;
      setTime((prev) => {
        let n = prev + dt;
        if (n >= duration) {
          n = 0;
          // Boucle : la bande-son repart du début avec la vidéo.
          if (audio) {
            audio.el.currentTime = 0;
            void audio.el.play().catch(() => {});
          }
        }
        drawAt(n);
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, assets, drawAt, audio, duration]);

  const onScrub = (v: number) => {
    setPlaying(false);
    audio?.el.pause();
    if (audio) audio.el.currentTime = Math.min(v, audio.el.duration || v);
    setTime(v);
    drawAt(v);
  };

  const togglePlay = () => {
    setPlaying((was) => {
      const now = !was;
      if (audio) {
        if (now) {
          audio.el.currentTime = Math.min(time, audio.el.duration || time);
          void audio.el.play().catch(() => {});
        } else {
          audio.el.pause();
        }
      }
      return now;
    });
  };

  // ─── Bande-son ───
  const handleAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const arr = await file.arrayBuffer();
      const actx = new AudioContext();
      const buffer = await actx.decodeAudioData(arr);
      void actx.close();
      // Remplace l'éventuelle piste précédente (et libère son URL).
      setAudio((prev) => {
        if (prev) {
          prev.el.pause();
          URL.revokeObjectURL(prev.url);
        }
        const url = URL.createObjectURL(file);
        return { name: file.name, buffer, el: new Audio(url), url };
      });
      toast.success("Son ajouté — il sera inclus dans le MP4");
    } catch {
      toast.error("Fichier audio illisible (mp3/wav/m4a).");
    }
  };

  const removeAudio = () => {
    setAudio((prev) => {
      if (prev) {
        prev.el.pause();
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
  };

  // Coupe le son si le composant est démonté.
  useEffect(() => () => audio?.el.pause(), [audio]);

  const handleExport = async () => {
    if (!assets) return;
    setPlaying(false);
    audio?.el.pause();
    setExporting(true);
    setProgress(0);
    try {
      const blob = await exportMotionMp4(assets, setProgress, audio?.buffer ?? null, motionBlur ? 4 : 1);
      saveAs(blob, `${sanitizeName(assets.domain)}_motion.mp4`);
      toast.success("Vidéo exportée !");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'export vidéo");
    } finally {
      setExporting(false);
    }
  };

  if (!scrapeResult) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <p className="text-[12.5px] text-foreground/50 leading-relaxed max-w-lg">
          Vidéo de présentation générée depuis le projet (typo, charte, site, mobiles) sur un
          fond de marque animé. Aperçu en direct, export MP4 60 fps.
        </p>
        <button
          onClick={handleExport}
          disabled={!assets || exporting || !exportable}
          className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-2 cursor-pointer disabled:opacity-30 transition-all hover:opacity-70 active:scale-[0.97]"
          title={exportBlocker ?? "Exporter en MP4"}
        >
          {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
          <span>{exporting ? `Export ${Math.round(progress * 100)}%` : "Exporter MP4"}</span>
        </button>
      </div>

      {/* Aperçu */}
      <div className="relative w-full rounded-xl overflow-hidden bg-black shadow-2xl shadow-black/10" style={{ aspectRatio: `${MOTION_W} / ${MOTION_H}` }}>
        <canvas ref={canvasRef} width={MOTION_W} height={MOTION_H} className="w-full h-full block" />
        {!assets && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
        )}
        {exporting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
            <Film className="w-8 h-8" />
            <span className="text-[13px] font-semibold">Encodage MP4… {Math.round(progress * 100)}%</span>
            <div className="w-56 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Transport */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!assets || exporting}
          className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center cursor-pointer disabled:opacity-30 hover:opacity-80 transition-all shrink-0"
          title={playing ? "Pause" : "Lecture"}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.05}
          value={time}
          onChange={(e) => onScrub(Number(e.target.value))}
          disabled={!assets || exporting}
          className="flex-1 h-1 accent-foreground cursor-pointer"
        />
        <span className="text-[11px] font-bold text-foreground/50 tabular-nums w-20 text-right">
          {time.toFixed(1)}s / {duration.toFixed(0)}s
        </span>
      </div>

      {exportBlocker && (
        <p className="mt-3 text-[11px] text-amber-600 dark:text-amber-400">{exportBlocker}</p>
      )}

      {/* ─── Réglages (sous l'aperçu), groupés par thème — une section par ligne ─── */}
      <div className="mt-6 flex flex-col gap-2">
        {/* Texte : nom affiché dans l'intro (le title scrapé est souvent du SEO) */}
        <Section title="Texte">
          <label className="flex items-center gap-2" title="Nom affiché dans l'intro de la vidéo (vide = nom déduit du site)">
            <span className={labelCls}>Nom</span>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={scrapeResult.siteName || scrapeResult.domain.replace(/^www\./, "")}
              className="bg-transparent text-[12px] font-semibold outline-none w-36 border-b border-border focus:border-foreground/40 transition-colors placeholder:text-foreground/25 placeholder:font-medium"
            />
          </label>
        </Section>

        {/* Couleurs & fond animé */}
        <Section title="Couleurs & fond">
          <label className="flex items-center gap-2 cursor-pointer" title="Couleur de fond (partagée avec le Showcase)">
            <span className={labelCls}>Base</span>
            <span className="relative w-6 h-6 rounded-md border border-border overflow-hidden">
              <span className="block w-full h-full" style={{ background: showcaseMeshBase }} />
              <input
                type="color"
                value={showcaseMeshBase}
                onChange={(e) => setShowcaseMeshBase(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </span>
          </label>
          <div className="flex items-center gap-2" title="Couleur d'accent du fond animé">
            <span className={labelCls}>Accent</span>
            <label className="relative w-6 h-6 rounded-md border border-border overflow-hidden cursor-pointer">
              <span className="block w-full h-full" style={{ background: accent }} />
              <input
                type="color"
                value={accent}
                onChange={(e) => setMotionBg({ accent: e.target.value })}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
            {palette.slice(0, 4).map((c) => (
              <button
                key={c}
                onClick={() => setMotionBg({ accent: c })}
                className="w-4 h-4 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform"
                style={{ background: c }}
                title={c}
              />
            ))}
            {motionBg.accent && (
              <button
                onClick={() => setMotionBg({ accent: null })}
                title="Revenir à l'accent dérivé de la palette"
                className="text-foreground/30 hover:text-foreground/60 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>Vitesse</span>
            <input
              type="range"
              min={0.3}
              max={2.2}
              step={0.1}
              value={motionBg.speed}
              onChange={(e) => setMotionBg({ speed: Number(e.target.value) })}
              className="w-24 h-1 accent-foreground cursor-pointer"
              title="Vitesse du fond animé"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={labelCls}>Intensité</span>
            <input
              type="range"
              min={0.3}
              max={1.5}
              step={0.05}
              value={motionBg.intensity}
              onChange={(e) => setMotionBg({ intensity: Number(e.target.value) })}
              className="w-24 h-1 accent-foreground cursor-pointer"
              title="Intensité des couleurs du fond"
            />
          </div>
        </Section>

        {/* Rendu & timeline */}
        <Section title="Vidéo">
          <Switch
            checked={motionBlur}
            onChange={setMotionBlur}
            label="Motion blur"
            title="Motion blur sur les éléments en mouvement (aperçu allégé, export en pleine qualité)"
          />
          <Switch
            checked={motionCharte}
            onChange={(v) => {
              setMotionCharte(v);
              // La timeline raccourcit quand on retire la charte → on ne
              // laisse pas la tête de lecture au-delà de la fin.
              if (!v && time > motionDuration(false)) onScrub(0);
            }}
            label="Scène charte"
            title="Inclure la scène charte graphique (bandes de couleurs) après l'annonce de la prestation (+~4 s)"
          />
        </Section>

        {/* Bande-son : incluse dans le MP4 (tronquée + fade-out), aperçu synchronisé */}
        <Section title="Bande-son">
          {audio ? (
            <div className="flex items-center gap-2" title="Bande-son du MP4 (session en cours uniquement)">
              <Music className="w-3.5 h-3.5 text-foreground/50" />
              <span className="text-[11px] font-semibold text-foreground/70 max-w-[160px] truncate">{audio.name}</span>
              <button
                onClick={removeAudio}
                title="Retirer le son"
                className="text-foreground/30 hover:text-red-500 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => audioInputRef.current?.click()}
              className="text-[11px] font-bold border border-border bg-background/60 px-3 py-1 rounded-md flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-all"
              title="Ajouter une musique/un son au MP4 (mp3, wav, m4a)"
            >
              <Music className="w-3.5 h-3.5" /> Ajouter un son
            </button>
          )}
          <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioFile} className="hidden" />
        </Section>
      </div>

      {/* Ce qu'on a réalisé → pastilles affichées pendant les scènes du site */}
      <div className="mt-4 border border-border bg-card rounded-md">
        <button
          onClick={() => setShowTags((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span className="text-[11px] font-bold text-foreground/60 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5" />
            Ce qu&apos;on a réalisé
            {tags.length > 0 && (
              <span className="text-foreground/35 font-medium">
                · {tags.length} pastille{tags.length > 1 ? "s" : ""}
              </span>
            )}
          </span>
          <ChevronDown className={`w-4 h-4 text-foreground/40 transition-transform ${showTags ? "rotate-180" : ""}`} />
        </button>
        {showTags && (
          <div className="px-3 pb-3 pt-1 border-t border-border">
            <p className="text-[11px] text-foreground/40 mb-3 leading-relaxed">
              Type de site et prestations : affichés en pastilles pendant les scènes du site (6 max).
              Type de projet et secteur restent masqués à l&apos;écran.
            </p>
            <ChipSelector selected={motionChips} onChange={setMotionChips} />
          </div>
        )}
      </div>
    </div>
  );
}
