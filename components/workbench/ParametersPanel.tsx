'use client';

import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Palette,
  Sparkles,
  Zap,
  Grid,
  Maximize,
  RefreshCw,
  Info,
  ShieldCheck,
  SplitSquareVertical,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Sliders,
} from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbench-store';
import { ImageType, VectorPreset } from '../../lib/vector-engine/types';

export function ParametersPanel() {
  const {
    parameters,
    palette,
    isProcessing,
    isParamsOpen,
    toggleParamsPanel,
    updateParam,
    applyPreset,
    setImageType,
    reprocess,
  } = useWorkbenchStore();

  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isParamsOpen) return null;

  const presets: { id: VectorPreset; label: string; icon: any; desc: string }[] = [
    { id: 'sharp', label: 'Crisp Logo', icon: Zap, desc: 'Sharp corners & clean lines' },
    { id: 'balanced', label: 'Balanced', icon: Sparkles, desc: 'Optimal curves & low node count' },
    { id: 'smooth', label: 'Smooth Art', icon: Palette, desc: 'Fluid organic Bezier sweeps' },
  ];

  return (
    <aside className="w-80 bg-sidebar border-l border-surface-border flex flex-col h-full select-none overflow-y-auto animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-12 border-b border-surface-border px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-semibold text-neutral-200">
            Vector Tuning
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => reprocess()}
            disabled={isProcessing}
            title="Reprocess Vectorization"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-100 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-brand-accent' : ''}`} />
          </button>
          <button
            onClick={toggleParamsPanel}
            title="Close Tuning Panel"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-100 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5 text-xs">
        {/* 1. ONE-CLICK STYLE PRESETS */}
        <div>
          <span className="font-semibold text-neutral-300 block mb-2 text-xs">
            1-Click Optimization Style
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {presets.map((p) => {
              const Icon = p.icon;
              const isActive = parameters.preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                    isActive
                      ? 'bg-surface-50 border-brand-accent text-white shadow-md shadow-indigo-950/40 scale-[1.02]'
                      : 'bg-surface-200/50 border-surface-border/70 text-neutral-400 hover:bg-surface-100 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-accent' : 'text-neutral-400'}`} />
                  <span className="text-[11px] font-semibold">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. SIMPLE ESSENTIAL SLIDERS */}
        <div className="space-y-4 p-3.5 bg-surface-200/40 rounded-xl border border-surface-border/70">
          {/* Smoothness */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <span className="text-neutral-300 font-medium">Curve Smoothness</span>
              <span className="font-mono text-brand-400 font-semibold">
                {Math.round(parameters.smoothness * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(parameters.smoothness * 100)}
              onChange={(e) => updateParam('smoothness', parseInt(e.target.value) / 100)}
              className="w-full accent-brand-accent h-1.5 bg-surface-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Corner Sharpness */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <span className="text-neutral-300 font-medium">Corner Sharpness</span>
              <span className="font-mono text-brand-400 font-semibold">
                {Math.round(parameters.cornerSharpness * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(parameters.cornerSharpness * 100)}
              onChange={(e) => updateParam('cornerSharpness', parseInt(e.target.value) / 100)}
              className="w-full accent-brand-accent h-1.5 bg-surface-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Color Count Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <span className="text-neutral-300 font-medium">Color Palette</span>
              <span className="font-mono text-indigo-400 font-semibold">
                {parameters.colorCount === 0 ? 'Auto-Detect' : `${parameters.colorCount} Colors`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={32}
              value={parameters.colorCount}
              onChange={(e) => updateParam('colorCount', parseInt(e.target.value))}
              className="w-full accent-brand-accent h-1.5 bg-surface-100 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* 3. COLOR PALETTE SWATCHES */}
        {palette.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5 text-[11px]">
              <span className="text-neutral-400 font-medium">Extracted Colors</span>
              <span className="font-mono text-neutral-500 text-[10px]">{palette.length} SWATCHES</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2 bg-surface-300/60 rounded-xl border border-surface-border">
              {palette.map((p, idx) => (
                <div
                  key={idx}
                  title={`${p.hex.toUpperCase()} (${p.percentage.toFixed(1)}%)`}
                  className="w-5 h-5 rounded-md border border-white/10 shadow-xs hover:scale-115 transition-transform"
                  style={{ backgroundColor: p.hex }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 4. COLLAPSIBLE ADVANCED PRO TOOLS (Tucked away cleanly) */}
        <div className="rounded-xl border border-surface-border/70 overflow-hidden bg-surface-200/30">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-neutral-300 hover:text-white transition-colors"
          >
            <span className="font-semibold text-xs flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Advanced Pro Controls</span>
            </span>
            {showAdvanced ? (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-3.5 pt-1 space-y-3 border-t border-surface-border/40 text-[11px] animate-in fade-in duration-150">
              {/* Remove Background */}
              <label className="flex items-center justify-between py-1 cursor-pointer">
                <span className="text-neutral-300 flex items-center gap-1.5">
                  <Maximize className="w-3.5 h-3.5 text-emerald-400" />
                  Remove Background Fill
                </span>
                <input
                  type="checkbox"
                  checked={parameters.removeBackground}
                  onChange={(e) => updateParam('removeBackground', e.target.checked)}
                  className="accent-brand-accent rounded cursor-pointer"
                />
              </label>

              {/* Symmetry Snap */}
              <label className="flex items-center justify-between py-1 cursor-pointer">
                <span className="text-neutral-300 flex items-center gap-1.5">
                  <SplitSquareVertical className="w-3.5 h-3.5 text-amber-400" />
                  Symmetry Axis Snap
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
                  Icon Pixel-Grid Align
                </span>
                <input
                  type="checkbox"
                  checked={parameters.gridSnap}
                  onChange={(e) => updateParam('gridSnap', e.target.checked)}
                  className="accent-brand-accent rounded cursor-pointer"
                />
              </label>

              {/* Noise Speckle */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="text-neutral-400">Speckle Noise Filter</span>
                  <span className="font-mono text-neutral-200">{parameters.noiseRemoval} px²</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={parameters.noiseRemoval}
                  onChange={(e) => updateParam('noiseRemoval', parseInt(e.target.value))}
                  className="w-full accent-brand-accent h-1.5 bg-surface-100 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
