import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { drawFrame, MOTION_W, MOTION_H, MOTION_FPS, MOTION_DURATION, type MotionAssets } from "./motion";

// True si l'export MP4 côté navigateur est possible (WebCodecs H.264).
export function canExportMotion(): boolean {
  return typeof window !== "undefined" && typeof window.VideoEncoder !== "undefined";
}

// Encode la bande-son (AAC) et l'ajoute au muxer : tronquée à la durée de la
// vidéo, avec un fondu de sortie sur les 1,2 dernières secondes.
async function encodeAudioTrack(muxer: Muxer<ArrayBufferTarget>, buffer: AudioBuffer, duration: number) {
  const sampleRate = buffer.sampleRate;
  const channels = Math.min(2, buffer.numberOfChannels) as 1 | 2;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
    error: (e) => console.error("AudioEncoder:", e),
  });
  encoder.configure({ codec: "mp4a.40.2", sampleRate, numberOfChannels: channels, bitrate: 192_000 });

  const totalFrames = Math.min(buffer.length, Math.ceil(duration * sampleRate));
  const fadeStart = Math.max(0, (duration - 1.2) * sampleRate);
  const CHUNK = 4800;
  for (let off = 0; off < totalFrames; off += CHUNK) {
    const frames = Math.min(CHUNK, totalFrames - off);
    const data = new Float32Array(frames * channels);
    for (let ch = 0; ch < channels; ch++) {
      const src = buffer.getChannelData(ch);
      for (let i = 0; i < frames; i++) {
        const idx = off + i;
        let v = src[idx] ?? 0;
        if (idx > fadeStart) v *= Math.max(0, 1 - (idx - fadeStart) / Math.max(1, totalFrames - fadeStart));
        data[ch * frames + i] = v;
      }
    }
    const ad = new AudioData({
      format: "f32-planar",
      sampleRate,
      numberOfFrames: frames,
      numberOfChannels: channels,
      timestamp: Math.round((off / sampleRate) * 1_000_000),
      data,
    });
    encoder.encode(ad);
    ad.close();
  }
  await encoder.flush();
}

/**
 * Rend la timeline frame par frame sur un canvas offscreen et l'encode en MP4
 * H.264 via WebCodecs (déterministe, indépendant de la vitesse de rendu).
 * `onProgress` (0..1) pour la barre de progression. `audio` optionnel : bande-son
 * AAC ajoutée au fichier (tronquée + fade-out).
 */
export async function exportMotionMp4(
  assets: MotionAssets,
  onProgress?: (p: number) => void,
  audio?: AudioBuffer | null,
  blurSamples = 4,
): Promise<Blob> {
  if (!canExportMotion()) {
    throw new Error("Export vidéo non supporté par ce navigateur (utilise Chrome).");
  }

  const withAudio = !!audio && typeof window.AudioEncoder !== "undefined";
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: MOTION_W, height: MOTION_H },
    ...(withAudio && audio
      ? { audio: { codec: "aac" as const, sampleRate: audio.sampleRate, numberOfChannels: Math.min(2, audio.numberOfChannels) } }
      : {}),
    fastStart: "in-memory",
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error("VideoEncoder:", e),
  });
  encoder.configure({
    codec: "avc1.640028", // H.264 High @ 4.0 (jusqu'à 1080p)
    width: MOTION_W,
    height: MOTION_H,
    bitrate: 14_000_000, // 1080p60 net
    framerate: MOTION_FPS,
    // Chunks au format avcc (et non annexB) — requis par mp4-muxer.
    avc: { format: "avc" },
  });

  const canvas = document.createElement("canvas");
  canvas.width = MOTION_W;
  canvas.height = MOTION_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponible.");

  const totalFrames = Math.round(MOTION_DURATION * MOTION_FPS);
  const frameDur = 1_000_000 / MOTION_FPS; // µs

  for (let i = 0; i < totalFrames; i++) {
    const t = i / MOTION_FPS;
    drawFrame(ctx, t, assets, blurSamples);
    const frame = new VideoFrame(canvas, { timestamp: Math.round(i * frameDur), duration: Math.round(frameDur) });
    encoder.encode(frame, { keyFrame: i % (MOTION_FPS * 2) === 0 });
    frame.close();

    // Ne pas noyer l'encodeur + laisser respirer l'UI (progression).
    if (encoder.encodeQueueSize > 8) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
    if (i % 4 === 0) {
      onProgress?.(i / totalFrames);
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  await encoder.flush();
  if (withAudio && audio) await encodeAudioTrack(muxer, audio, MOTION_DURATION);
  muxer.finalize();
  onProgress?.(1);
  return new Blob([target.buffer], { type: "video/mp4" });
}
