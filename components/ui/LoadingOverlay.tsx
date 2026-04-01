"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2, Square } from "lucide-react";
import { stopScrape } from "./UrlInput";

const Prism = dynamic(() => import("@/components/Prism"), { ssr: false });

const LOADING_MESSAGES = [
  "Connexion au site en cours...",
  "Initialisation de l'analyse...",
  "Lecture du HTML et des styles CSS...",
  "Extraction de la palette de couleurs...",
  "Identification des typographies...",
  "Détection de la grille de mise en page...",
  "Analyse des composants UI...",
  "Capture du screenshot desktop HD...",
  "Recadrage en vue mobile...",
  "Capture du screenshot mobile...",
  "Extraction des logos et des SVG...",
  "Analyse des couleurs d'accentuation...",
  "Construction des maquettes de présentation...",
  "Application du design system détecté...",
  "Mise en forme de la frame identité...",
  "Mise en forme de la frame mockup...",
  "Mise en forme de la frame couverture...",
  "Vérification finale des ressources...",
  "Presque prêt...",
];

// Total visual duration: LOADING_MESSAGES.length * 3000ms = ~57s
const STEP_DURATION = 3000;

export const LoadingOverlay = ({
  isExiting = false,
}: {
  isExiting?: boolean;
}) => {
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Slide-in trigger
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Scroll through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) =>
        prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev,
      );
    }, STEP_DURATION);
    return () => clearInterval(interval);
  }, []);

  // Elapsed timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const translateX = isExiting ? "-100%" : mounted ? "0%" : "100%";
  const progress = Math.min(100, ((index + 1) / LOADING_MESSAGES.length) * 100);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec.toString().padStart(2, "0")}s` : `${sec}s`;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background overflow-hidden"
      style={{
        transform: `translateX(${translateX})`,
        transition: "transform 1100ms cubic-bezier(0.87, 0, 0.13, 1)",
      }}
    >
      {/* Prism Animated WebGL Background */}
      <div className="absolute inset-0 opacity-40">
        <Prism />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6 text-center gap-6">
        {/* Animated pulsing icon box */}
        <div className="w-16 h-16 rounded-2xl bg-card/60 backdrop-blur-xl border border-border shadow-2xl flex items-center justify-center animate-pulse">
          <Loader2 className="w-8 h-8 text-foreground animate-spin" />
        </div>

        {/* Masked Sliding Text Container */}
        <div className="h-10 relative overflow-hidden w-full flex justify-center items-center mask-image-bottom">
          <div
            className="absolute top-0 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.87,0,0.13,1)] w-full"
            style={{ transform: `translateY(-${index * 40}px)` }}
          >
            {LOADING_MESSAGES.map((msg, i) => (
              <div
                key={i}
                className="h-[40px] w-full px-2 flex items-center justify-center text-lg font-bold tracking-tight text-foreground transition-opacity duration-300 whitespace-nowrap truncate"
                style={{ opacity: index === i ? 1 : 0.4 }}
              >
                {msg}
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full flex flex-col gap-2">
          <div className="w-full h-1 bg-foreground/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
              Analyse en cours
            </span>
            <span className="text-[10px] font-bold text-foreground/40">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      {/* Timer + Stop — bottom center */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-foreground/[0.04]"
          style={{ backdropFilter: "blur(8px)" }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-foreground/50 tabular-nums">
            {formatTime(elapsed)}
          </span>
        </div>
        <button
          onClick={stopScrape}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition-all cursor-pointer active:scale-95"
          style={{ backdropFilter: "blur(8px)" }}
        >
          <Square className="w-3 h-3 fill-current" />
          Stopper
        </button>
      </div>
    </div>
  );
};
