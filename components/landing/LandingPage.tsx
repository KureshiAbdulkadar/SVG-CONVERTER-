'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Sparkles,
  Zap,
  Layers,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sliders,
  Maximize2,
  Lock,
  Cpu,
  Feather,
  Palette,
  Eye,
  FileCode,
  Check,
} from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbench-store';
import { SAMPLE_IMAGES } from '../../lib/samples';
import { ProcessingModal } from '../workbench/ProcessingModal';

export function LandingPage() {
  const router = useRouter();
  const { loadImage, isProcessing } = useWorkbenchStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        await loadImage(dataUrl, file.name);
        router.push('/workbench');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Clipboard Paste Support (Cmd+V / Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              handleFileUpload(file);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleSampleClick = async (sample: typeof SAMPLE_IMAGES[0]) => {
    setIsUploading(true);
    try {
      const dataUrl = sample.generateDataUrl();
      await loadImage(dataUrl, `${sample.id}.png`);
      router.push('/workbench');
    } catch (err) {
      console.error('Error loading sample:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Runway-style Cinematic Processing Modal */}
      <ProcessingModal />

      {/* Navigation */}
      <nav className="border-b border-white/[0.08] bg-[#070709]/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-950/50">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base tracking-tight text-white">
              VectorForge
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/10 font-semibold">
              Studio
            </span>
          </div>

          <div className="flex items-center gap-5 text-xs font-medium">
            <a href="#comparison" className="text-neutral-400 hover:text-white transition-colors">
              Why VectorForge
            </a>
            <a href="#features" className="text-neutral-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-neutral-400 hover:text-white transition-colors">
              Pricing
            </a>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition-all shadow-md text-xs"
            >
              Open Studio
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden flex flex-col items-center text-center">
        {/* Ambient Top Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-cyan-500/15 blur-[140px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-medium text-neutral-300 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Next-Gen Vectorization Engine · Built for Pro Designers & Engineers</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.12]">
            Turn Any Pixel Image Into{' '}
            <span className="bg-gradient-to-r from-white via-neutral-200 to-cyan-400 bg-clip-text text-transparent">
              Figma-Ready Vectors
            </span>
          </h1>

          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed">
            Upload logos, sketches, artwork, or icons. VectorForge calculates smooth mathematical
            Bezier curves with organized layer groups in seconds.
          </p>

          {/* Upload Drop Zone Card */}
          <div className="pt-4 max-w-2xl mx-auto w-full">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/bmp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative p-12 rounded-3xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
                  : 'border-white/15 bg-[#0e0e12]/80 hover:bg-[#131318] hover:border-white/30 shadow-2xl backdrop-blur-xl'
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.07] border border-white/10 flex items-center justify-center text-cyan-400 shadow-2xl">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base sm:text-lg">
                    Drop your image here, <span className="text-cyan-400 underline">browse</span>, or press <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/15 text-white font-mono text-xs">Cmd+V</kbd>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1.5 font-light">
                    Supports PNG, JPG, WebP, BMP · Sub-second Vectorization · 100% Free
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Sample Explore Row */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-neutral-500 font-medium">Or test instant sample:</span>
              {SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  disabled={isUploading}
                  onClick={() => handleSampleClick(sample)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-neutral-300 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>{sample.thumbnail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3 Step Studio Workflow */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs uppercase font-mono font-semibold text-cyan-400 tracking-wider">
            How It Works
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            From Raster Pixels to Production Vectors in 3 Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-3xl bg-[#0e0e12]/60 border border-white/[0.08] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold font-mono text-sm">
              01
            </div>
            <h3 className="text-base font-semibold text-white">Upload or Paste</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Drag in your file or press <kbd className="px-1 py-0.2 rounded bg-white/10 text-neutral-300 font-mono text-[10px]">Cmd+V</kbd> to paste directly from your clipboard.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-[#0e0e12]/60 border border-white/[0.08] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold font-mono text-sm">
              02
            </div>
            <h3 className="text-base font-semibold text-white">Compare & Refine</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Use the interactive split slider to verify exact curve fidelity and select 1-click presets.
            </p>
          </div>

          <div className="p-7 rounded-3xl bg-[#0e0e12]/60 border border-white/[0.08] space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
              03
            </div>
            <h3 className="text-base font-semibold text-white">1-Click Figma Export</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Click &quot;Copy for Figma&quot; to paste organized vector layers directly into your canvas or download SVG/PDF.
            </p>
          </div>
        </div>
      </section>

      {/* Benchmark Matrix */}
      <section id="comparison" className="py-16 px-6 bg-[#0a0a0d] border-y border-white/[0.08]">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs uppercase font-mono font-semibold text-cyan-400 tracking-wider">
              Benchmark
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Why VectorForge Wins Against Legacy Vectorizers
            </h2>
          </div>

          <div className="rounded-3xl border border-white/[0.1] bg-[#0e0e12]/90 overflow-hidden shadow-2xl">
            <div className="grid grid-cols-3 bg-white/[0.03] p-4 border-b border-white/[0.08] text-xs font-semibold text-neutral-300">
              <span>Capability</span>
              <span className="text-neutral-500">Legacy Vectorizers</span>
              <span className="text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> VectorForge Studio
              </span>
            </div>

            <div className="divide-y divide-white/[0.06] text-xs">
              {[
                {
                  feat: 'Layer Organization',
                  old: 'Flat uneditable blob',
                  now: 'Structured Figma & Illustrator groups',
                },
                {
                  feat: 'Curve Smoothness',
                  old: 'Jagged staircase pixels',
                  now: 'Sub-pixel cubic Bezier curves',
                },
                {
                  feat: 'Corner Preservation',
                  old: 'Rounds sharp logo angles',
                  now: 'Preserves sharp 45°/90° corners',
                },
                {
                  feat: 'Processing Speed',
                  old: '15 - 30 seconds wait',
                  now: 'Sub-second real-time vectorization',
                },
                {
                  feat: 'Workflow Integration',
                  old: 'Download only',
                  now: '1-Click Copy directly for Figma',
                },
              ].map((row, idx) => (
                <div key={idx} className="grid grid-cols-3 p-4 items-center hover:bg-white/[0.02]">
                  <span className="font-medium text-white">{row.feat}</span>
                  <span className="text-neutral-500 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
                    {row.old}
                  </span>
                  <span className="text-cyan-400 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    {row.now}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 max-w-7xl mx-auto w-full space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase font-mono font-semibold text-cyan-400 tracking-wider">
            Pricing
          </span>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Simple, Transparent Plans
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free */}
          <div className="p-7 rounded-3xl bg-[#0e0e12] border border-white/[0.08] space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Free</span>
              <div className="text-3xl font-bold text-white">$0</div>
              <p className="text-xs text-neutral-400">Everything you need for quick vector exports.</p>
              <ul className="space-y-2.5 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> 100 conversions / month
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Standard SVG export
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Up to 2,000px resolution
                </li>
              </ul>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-white transition-all"
            >
              Get Started Free
            </button>
          </div>

          {/* Pro */}
          <div className="p-7 rounded-3xl bg-[#121218] border-2 border-indigo-500/80 space-y-5 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </div>
            <div className="space-y-4">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Pro Studio</span>
              <div className="text-3xl font-bold text-white">
                $9 <span className="text-xs font-normal text-neutral-400">/ month</span>
              </div>
              <p className="text-xs text-neutral-300">Unlimited high-precision vectorization for designers.</p>
              <ul className="space-y-2.5 text-xs text-neutral-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Flat Unlimited conversions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> All formats (SVG, PDF, EPS, DXF)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> 1-Click Figma Layer Export
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Up to 8,000px resolution
                </li>
              </ul>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-xs font-semibold text-white shadow-lg transition-all"
            >
              Start Unlimited Pro
            </button>
          </div>

          {/* Studio */}
          <div className="p-7 rounded-3xl bg-[#0e0e12] border border-white/[0.08] space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Agency</span>
              <div className="text-3xl font-bold text-white">
                $29 <span className="text-xs font-normal text-neutral-400">/ month</span>
              </div>
              <p className="text-xs text-neutral-400">For creative teams, batch pipelines, and APIs.</p>
              <ul className="space-y-2.5 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Everything in Pro
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Batch folder processing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> 5,000 API calls / month
                </li>
              </ul>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-white transition-all"
            >
              Get Agency Plan
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#09090b] py-8 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-neutral-300">VectorForge</span>
            <span>— Precision AI Vector Studio</span>
          </div>
          <div>© 2026 VectorForge Studio. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
