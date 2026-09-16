'use client';

import React from 'react';
import {
  Sliders,
  Palette,
  Sparkles,
  Zap,
  Grid,
  Maximize,
  RefreshCw,
  Info,
  ShieldCheck,
  SplitSquareVertical,
} from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbench-store';
import { ImageType, VectorPreset } from '../../lib/vector-engine/types';

export function ParametersPanel() {
  const {
    parameters,
    palette,
    isProcessing,
    updateParam,
    applyPreset,
    setImageType,
    reprocess,
  } = useWorkbenchStore();

  const presets: { id: VectorPreset; label: string; desc: string }[] = [
    { id: 'sharp', label: 'Sharp', desc: 'Crisp corners & geometric fidelity' },
    { id: 'balanced', label: 'Balanced', desc: 'Optimal curves & low node count' },
    { id: 'smooth', label: 'Smooth', desc: 'Fluid organic Bezier sweeps' },
    { id: 'custom', label: 'Custom', desc: 'Fine-tuned vector controls' },
  ];

  const imageTypes: { id: ImageType; label: string }[] = [
    { id: 'logo', label: 'Logo' },
    { id: 'icon', label: 'Icon' },
    { id: 'sketch', label: 'Sketch' },
    { id: 'photo', label: 'Photo' },
    { id: 'illustration', label: 'Illustration' },
  ];

  return (
    <aside className="w-80 bg-sidebar border-l border-surface-border flex flex-col h-full select-none overflow-y-auto">
      {/* Header */}
      <div className="h-12 border-b border-surface-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-brand-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
            Vector Parameters
          </span>
        </div>

        <button
          onClick={() => reprocess()}
          disabled={isProcessing}
          title="Reprocess Vectorization"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-100 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-brand-accent' : ''}`} />
        </button>
      </div>

      <div className="p-4 space-y-6 flex-1 text-xs">
        {/* 1. IMAGE TYPE CLASSIFIER */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-neutral-300">Detected Image Type</span>
            <span className="text-[10px] text-brand-400 font-mono">CLIP / Semantic</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {imageTypes.map(t => (
              <button
                key={t.id}
                onClick={() => setImageType(t.id)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  parameters.imageType === t.id
                    ? 'bg-brand-accent text-white shadow-sm'
                    : 'bg-surface-100 text-neutral-400 hover:text-white hover:bg-surface-50 border border-surface-border'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-surface-border" />

        {/* 2. PRESETS */}
        <div>
          <span className="font-semibold text-neutral-300 block mb-2">Optimization Preset</span>
          <div className="grid grid-cols-2 gap-2">
            {presets.map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  parameters.preset === p.id
                    ? 'bg-surface-50 border-brand-accent text-white shadow-sm'
                    : 'bg-surface-200/40 border-surface-border text-neutral-400 hover:bg-surface-100 hover:text-neutral-200'
                }`}
              >
                <div className="font-medium flex items-center justify-between">
                  <span>{p.label}</span>
                  {parameters.preset === p.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                  )}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5 leading-tight">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-surface-border" />

        {/* 3. COLOR INTELLIGENCE (LAB & Perceptual) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              Perceptual Color Intelligence
            </span>
          </div>

          {/* Color Count Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-neutral-400">Color Palette Limit</span>
              <span className="font-mono text-brand-400">
                {parameters.colorCount === 0 ? 'Auto-Detect' : `${parameters.colorCount} Colors`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={32}
              value={parameters.colorCount}
              onChange={(e) => updateParam('colorCount', parseInt(e.target.value))}
              className="w-full accent-brand-accent cursor-pointer"
            />
          </div>

          {/* Brand Color Protection */}
          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-neutral-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
              Preserve Brand Colors
            </span>
            <input
              type="checkbox"
              checked={parameters.preserveBrandColors}
              onChange={(e) => updateParam('preserveBrandColors', e.target.checked)}
              className="accent-brand-accent rounded cursor-pointer"
            />
          </label>

          {/* Extracted Swatches */}
          {palette.length > 0 && (
            <div>
              <span className="text-[10px] text-neutral-500 block mb-1.5 font-mono">
                ACTIVE LAB PALETTE ({palette.length} SWATCHES)
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-surface-300 rounded-lg border border-surface-border">
                {palette.map((p, idx) => (
                  <div
                    key={idx}
                    title={`${p.hex.toUpperCase()} (${p.percentage.toFixed(1)}%)${p.isBrand ? ' · Brand Color' : ''}`}
                    className="group relative w-6 h-6 rounded-md border border-white/10 shadow-sm cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: p.hex }}
                  >
                    {p.isBrand && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-500 rounded-full ring-1 ring-black" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-px bg-surface-border" />

        {/* 4. DETAIL & CURVE TUNING */}
        <div className="space-y-3.5">
          <span className="font-semibold text-neutral-300 block">Curve & Node Precision</span>

          {/* Smoothness */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-neutral-400">Bezier Smoothness</span>
              <span className="font-mono text-neutral-200">
                {Math.round(parameters.smoothness * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(parameters.smoothness * 100)}
              onChange={(e) => updateParam('smoothness', parseInt(e.target.value) / 100)}
              className="w-full accent-brand-accent cursor-pointer"
            />
          </div>

          {/* Corner Sharpness */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-neutral-400">Corner Preservation</span>
              <span className="font-mono text-neutral-200">
                {Math.round(parameters.cornerSharpness * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(parameters.cornerSharpness * 100)}
              onChange={(e) => updateParam('cornerSharpness', parseInt(e.target.value) / 100)}
              className="w-full accent-brand-accent cursor-pointer"
            />
          </div>

          {/* Path Detail */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-neutral-400">Path Detail (Epsilon)</span>
              <span className="font-mono text-neutral-200">
                {Math.round(parameters.detail * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={Math.round(parameters.detail * 100)}
              onChange={(e) => updateParam('detail', parseInt(e.target.value) / 100)}
              className="w-full accent-brand-accent cursor-pointer"
            />
          </div>

          {/* Noise / Speckle Filter */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-neutral-400">Speckle Noise Removal</span>
              <span className="font-mono text-neutral-200">{parameters.noiseRemoval} px²</span>
            </div>
            <input
              type="range"
              min={0}
              max={25}
              value={parameters.noiseRemoval}
              onChange={(e) => updateParam('noiseRemoval', parseInt(e.target.value))}
              className="w-full accent-brand-accent cursor-pointer"
            />
          </div>
        </div>

        <div className="h-px bg-surface-border" />

        {/* 5. ADVANCED FEATURES */}
        <div className="space-y-2.5">
          <span className="font-semibold text-neutral-300 block">Advanced Vector Engine</span>

          {/* Symmetry Snap */}
          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-neutral-300 flex items-center gap-1.5">
              <SplitSquareVertical className="w-3.5 h-3.5 text-amber-400" />
              Symmetry Detection & Snap
            </span>
            <input
              type="checkbox"
              checked={parameters.preserveSymmetry}
              onChange={(e) => updateParam('preserveSymmetry', e.target.checked)}
              className="accent-brand-accent rounded cursor-pointer"
            />
          </label>

          {/* Grid Snap */}
          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-neutral-300 flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5 text-blue-400" />
              Icon Pixel-Grid Snap
            </span>
            <input
              type="checkbox"
              checked={parameters.gridSnap}
              onChange={(e) => updateParam('gridSnap', e.target.checked)}
              className="accent-brand-accent rounded cursor-pointer"
            />
          </label>

          {/* Remove Background */}
          <label className="flex items-center justify-between py-1 cursor-pointer">
            <span className="text-neutral-300 flex items-center gap-1.5">
              <Maximize className="w-3.5 h-3.5 text-emerald-400" />
              Remove Background Layer
            </span>
            <input
              type="checkbox"
              checked={parameters.removeBackground}
              onChange={(e) => updateParam('removeBackground', e.target.checked)}
              className="accent-brand-accent rounded cursor-pointer"
            />
          </label>
        </div>
      </div>
    </aside>
  );
}
