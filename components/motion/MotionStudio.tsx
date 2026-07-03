"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import { Play, Pause, Film, Loader2, Download, RotateCcw, Music, X } from "lucide-react";
import { useDAStore } from "@/store/daStore";
import { seedMesh } from "@/lib/meshGradient";
import { sanitizeName } from "@/lib/exportFrames";
import {
  drawFrame,
  preloadMotionImages,
  MOTION_W,
  MOTION_H,
  MOTION_DURATION,
  type MotionImages,
  type MotionAssets,
} from "@/lib/motion/motion";
import { exportMotionMp4, motionExportBlocker } from "@/lib/motion/exportVideo";

const groupCls = "flex items-center gap-2 border border-border bg-card px-3 py-1.5 rounded-md";
const labelCls = "text-[10px] font-bold text-foreground/40 whitespace-nowrap uppercase tracking-wider";

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
      bgSpeed: motionBg.speed,
      bgIntensity: motionBg.intensity,
      domain,
      siteName: scrapeResult.siteName || domain,
      fontLabel: fontName || scrapeResult.font?.name || "",
    };
  }, [images, scrapeResult, palette, showcaseMeshBase, accent, motionBg.speed, motionBg.intensity, fontName]);

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
        if (n >= MOTION_DURATION) {
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
  }, [playing, assets, drawAt, audio]);

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

      {/* Réglages du fond */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <label className={`${groupCls} cursor-pointer`} title="Couleur de fond (partagée avec le Showcase)">
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
        <div className={groupCls} title="Couleur d'accent du fond animé">
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
        <div className={groupCls}>
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
        <div className={groupCls}>
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
        {/* Motion blur (échantillonnage du shutter, façon After Effects) */}
        <button
          onClick={() => setMotionBlur((v) => !v)}
          className={`text-[11px] font-bold border border-border px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer transition-all ${
            motionBlur ? "bg-foreground text-background" : "bg-card text-foreground/50 hover:opacity-70"
          }`}
          title="Motion blur sur les éléments en mouvement (aperçu allégé, export en pleine qualité)"
        >
          Motion blur
        </button>
        {/* Bande-son : incluse dans le MP4 (tronquée + fade-out), aperçu synchronisé */}
        {audio ? (
          <div className={groupCls} title="Bande-son du MP4 (session en cours uniquement)">
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
            className="text-[11px] font-bold border border-border bg-card px-3 py-1.5 rounded-md flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-all"
            title="Ajouter une musique/un son au MP4 (mp3, wav, m4a)"
          >
            <Music className="w-3.5 h-3.5" /> Ajouter un son
          </button>
        )}
        <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioFile} className="hidden" />
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
          max={MOTION_DURATION}
          step={0.05}
          value={time}
          onChange={(e) => onScrub(Number(e.target.value))}
          disabled={!assets || exporting}
          className="flex-1 h-1 accent-foreground cursor-pointer"
        />
        <span className="text-[11px] font-bold text-foreground/50 tabular-nums w-20 text-right">
          {time.toFixed(1)}s / {MOTION_DURATION.toFixed(0)}s
        </span>
      </div>

      {exportBlocker && (
        <p className="mt-3 text-[11px] text-amber-600 dark:text-amber-400">{exportBlocker}</p>
      )}
    </div>
  );
}
