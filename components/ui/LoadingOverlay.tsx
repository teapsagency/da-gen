"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const Prism = dynamic(() => import("@/components/Prism"), { ssr: false });

const LOADING_MESSAGES = [
  "Initialisation de l'analyse...",
  "Extraction des couleurs...",
  "Détection des typographies...",
  "Capture des screenshots HD...",
  "Extraction des logos...",
  "Génération des maquettes...",
  "Application du design system...",
  "Ajustements finaux...",
  "Presque prêt...",
];

export const LoadingOverlay = ({
  isExiting = false,
}: {
  isExiting?: boolean;
}) => {
  const [index, setIndex] = useState(0);
  // This trick allows the browser to register the initial translateX(-100%)
  // before starting the transition, so the slide-in actually animates.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) =>
        prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev,
      );
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const translateX = isExiting ? "-100%" : mounted ? "0%" : "100%";

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

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center">
        {/* Animated pulsing icon box */}
        <div className="w-16 h-16 rounded-2xl bg-card/60 backdrop-blur-xl border border-border shadow-2xl flex items-center justify-center mb-8 animate-pulse">
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
                className="h-[40px] w-full px-2 flex items-center justify-center text-lg md:text-xl font-bold tracking-tight text-foreground transition-opacity duration-300 whitespace-nowrap truncate"
                style={{ opacity: index === i ? 1 : 0.4 }}
              >
                {msg}
              </div>
            ))}
          </div>
        </div>

        {/* Sub text / Progress indicator */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            {[...Array(LOADING_MESSAGES.length)].map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? "w-6 bg-foreground" : i < index ? "w-1.5 bg-foreground/30" : "w-1.5 bg-foreground/10"}`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground/40 mt-2">
            Analyse en cours
          </span>
        </div>
      </div>
    </div>
  );
};
