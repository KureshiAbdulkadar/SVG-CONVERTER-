'use client';

import React, { useEffect, useState } from 'react';
import { useWorkbenchStore } from '../../stores/workbench-store';
import { Sparkles, Scan, CheckCircle2, Cpu, Zap, Layers, Palette } from 'lucide-react';

export function ProcessingModal() {
  const { isProcessing, imageDataUrl, meta } = useWorkbenchStore();
  const [progress, setProgress] = useState(15);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const steps = [
    {
      title: 'Analyzing Visual Composition',
      desc: 'Detecting contours, shapes, and depth layers',
      icon: Scan,
    },
    {
      title: 'Synthesizing Bezier Curves',
      desc: 'Calculating smooth mathematical vector equations',
      icon: Zap,
    },
    {
      title: 'Extracting Color Palette',
      desc: 'Preserving true brand colors and dynamic range',
      icon: Palette,
    },
    {
      title: 'Organizing Layer Groups',
      desc: 'Building Figma & Illustrator compatible groups',
      icon: Layers,
    },
  ];

  useEffect(() => {
    let progressTimer: any;
    let stepTimer: any;

    if (isProcessing) {
      setProgress(15);
      setActiveStepIndex(0);

      progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return 95;
          return prev + Math.floor(Math.random() * 12) + 6;
        });
      }, 120);

      stepTimer = setInterval(() => {
        setActiveStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 350);
    } else {
      setProgress(100);
    }

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
    };
  }, [isProcessing]);

  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e0e12] border border-white/[0.12] rounded-3xl p-7 shadow-[0_25px_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col items-center text-center">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Thumbnail with Shimmering Laser Scan Beam */}
        <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-2xl mb-6 flex items-center justify-center">
          {imageDataUrl ? (
            <img
              src={imageDataUrl}
              alt="Processing Preview"
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <Cpu className="w-10 h-10 text-indigo-400 animate-pulse" />
          )}

          {/* Sweeping Laser Beam */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute left-0 right-0 h-12 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent -translate-y-full animate-[scanVertical_1.2s_ease-in-out_infinite]">
              <div className="absolute bottom-1/2 left-0 right-0 h-0.5 bg-cyan-300 shadow-[0_0_12px_#38bdf8]" />
            </div>
          </div>

          {/* HUD Corner Accents */}
          <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
          <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
          <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
          <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>Vectorizing Artwork</span>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        </h3>
        <p className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
          Generating high-precision Bezier vector shapes with semantic Figma layers.
        </p>

        {/* Glowing Progress Bar */}
        <div className="w-full mt-6 space-y-2">
          <div className="flex justify-between text-xs font-mono text-neutral-400">
            <span>Synthesis Progress</span>
            <span className="text-cyan-400 font-semibold">{Math.min(100, progress)}%</span>
          </div>
          <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-200 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>

        {/* Step-by-Step Stage Cards */}
        <div className="w-full mt-6 space-y-2 text-left">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = activeStepIndex > idx;
            const isCurrent = activeStepIndex === idx;

            return (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border transition-all flex items-center gap-3 ${
                  isCurrent
                    ? 'bg-surface-50/80 border-cyan-500/40 text-white shadow-sm'
                    : isCompleted
                    ? 'bg-surface-200/40 border-surface-border text-neutral-300'
                    : 'bg-transparent border-transparent text-neutral-600 opacity-60'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isCurrent
                      ? 'bg-cyan-500/20 text-cyan-400 animate-pulse'
                      : 'bg-surface-100 text-neutral-600'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold tracking-tight">{step.title}</div>
                  <div className="text-[11px] text-neutral-400 truncate">{step.desc}</div>
                </div>

                {isCurrent && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    Active
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
