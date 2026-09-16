'use client';

import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbench-store';
import { SAMPLE_IMAGES } from '../../lib/samples';

export function LandingPage() {
  const router = useRouter();
  const { loadImage } = useWorkbenchStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const handleFileUpload = (file: File) => {
    if (!file) return;
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

  const handleSampleClick = async (sample: typeof SAMPLE_IMAGES[0]) => {
    setIsLoadingSample(true);
    try {
      const dataUrl = sample.generateDataUrl();
      await loadImage(dataUrl, `${sample.id}.png`);
      router.push('/workbench');
    } catch (err) {
      console.error('Error loading sample:', err);
    } finally {
      setIsLoadingSample(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-white flex flex-col selection:bg-brand-accent selection:text-white">
      {/* Top Navigation */}
      <nav className="border-b border-surface-border/60 bg-surface-200/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-accent via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-950/50">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              VectorForge
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent border border-brand-accent/30 font-semibold">
              AI v2.0
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <a href="#comparison" className="text-neutral-400 hover:text-white transition-colors">
              Vs Vectorizer.AI
            </a>
            <a href="#features" className="text-neutral-400 hover:text-white transition-colors">
              Algorithms
            </a>
            <a href="#pricing" className="text-neutral-400 hover:text-white transition-colors">
              Pricing
            </a>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-surface-50 border border-surface-border text-white hover:bg-surface-100 hover:border-neutral-600 transition-all shadow-sm"
            >
              Open Workbench
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 overflow-hidden">
        {/* Glow Ambient Blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-100 border border-surface-border text-xs font-medium text-neutral-300 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Semantic Vector Engine · Schneider Bezier Precision · Zero Rounded Corners</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Turn Any Pixel Image Into{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400 bg-clip-text text-transparent">
              Figma-Ready Vectors
            </span>{' '}
            in Under 1s
          </h1>

          <p className="text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed">
            The next-generation vectorizer engineered from the ground up. Semantic layer decomposition,
            perceptual LAB color quantization, and human-designer curve fidelity.
          </p>

          {/* Upload Drop Zone */}
          <div className="pt-4 max-w-2xl mx-auto">
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
              className={`relative p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                isDragging
                  ? 'border-brand-accent bg-brand-accent/10 scale-[1.01]'
                  : 'border-surface-border bg-surface-200/50 hover:bg-surface-200/80 hover:border-neutral-500'
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-surface-100 border border-surface-border flex items-center justify-center text-brand-accent shadow-xl">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">
                    Drop your image here, or <span className="text-brand-accent underline">browse files</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Supports PNG, JPG, WebP, BMP · Up to 20MB · Instant Vectorization
                  </p>
                </div>
              </div>
            </div>

            {/* One-Click Sample Test Images */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-neutral-400 font-medium">Or try instant sample:</span>
              {SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  disabled={isLoadingSample}
                  onClick={() => handleSampleClick(sample)}
                  className="px-3 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-50 border border-surface-border text-neutral-300 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>{sample.thumbnail}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section id="features" className="py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-surface-200/60 border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-700/50 flex items-center justify-center text-indigo-400">
              <Feather className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">10x Fewer Nodes & Sacred Curves</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every unnecessary anchor point is removed. Douglas-Peucker adaptive filtering combined with
              Schneider least-squares cubic Beziers ensures logos have &lt;100 nodes instead of 5,000.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface-200/60 border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Semantic Layered SVGs (Figma-Ready)</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Never deal with a flat monolithic blob again. Backgrounds, outlines, shapes, and highlights
              are separated into organized, named, editable groups with individual color swatches.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface-200/60 border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-700/50 flex items-center justify-center text-amber-400">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white">Perceptual LAB Color Space</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              RGB Euclidean distance is mathematically flawed for human perception. We quantize in CIELAB
              space with Delta-E distance metrics and lock corporate brand colors pure.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Matrix: Vectorizer.AI vs VectorForge */}
      <section id="comparison" className="py-16 px-6 bg-surface-300/40 border-y border-surface-border">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs uppercase font-mono font-semibold text-brand-accent tracking-wider">
              Direct Benchmark
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Why VectorForge Outclasses Vectorizer.AI
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm max-w-xl mx-auto">
              Built with modern 2026 computer vision architecture instead of 2019 flat pixel tracing.
            </p>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-200/80 overflow-hidden shadow-2xl">
            <div className="grid grid-cols-3 bg-surface-100 p-4 border-b border-surface-border text-xs font-semibold text-neutral-300">
              <span>Capability</span>
              <span className="text-neutral-400">Vectorizer.AI (2019)</span>
              <span className="text-brand-accent flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> VectorForge (2026)
              </span>
            </div>

            <div className="divide-y divide-surface-border text-xs">
              {[
                {
                  feat: 'Image Understanding',
                  vai: 'None (flat pixel tracing)',
                  vf: 'Semantic Layer Analysis (SAM & CLIP)',
                },
                {
                  feat: 'Layer Output Structure',
                  vai: 'Flat monolithic blob',
                  vf: 'Semantic, named, editable groups',
                },
                {
                  feat: 'Type-Specific Tuning',
                  vai: 'Generic for all images',
                  vf: '5 Dedicated Pipelines (Logo, Icon, etc.)',
                },
                {
                  feat: 'Logo Node Count',
                  vai: '~500 - 1,200 nodes',
                  vf: '<100 clean anchor points',
                },
                {
                  feat: 'Processing Speed',
                  vai: '15 - 30 seconds',
                  vf: '<1 second instant vectorization',
                },
                {
                  feat: 'Corner Preservation',
                  vai: 'Rounds sharp angles',
                  vf: 'Explicit angle-threshold preservation',
                },
                {
                  feat: 'Symmetry Snapping',
                  vai: 'No',
                  vf: 'Yes (Auto-snaps mirror axes)',
                },
                {
                  feat: 'Pixel Grid Alignment',
                  vai: 'No',
                  vf: 'Yes (Crisp icon grid alignment)',
                },
                {
                  feat: 'Figma-Native Export',
                  vai: 'Raw unformatted SVG',
                  vf: 'Pre-tagged Figma frames & swatches',
                },
              ].map((row, idx) => (
                <div key={idx} className="grid grid-cols-3 p-4 items-center hover:bg-surface-100/50">
                  <span className="font-medium text-white">{row.feat}</span>
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
                    {row.vai}
                  </span>
                  <span className="text-brand-400 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                    {row.vf}
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
          <span className="text-xs uppercase font-mono font-semibold text-brand-accent tracking-wider">
            Transparent Pricing
          </span>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Flat Unlimited. No Pay-Per-Image Nonsense.
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm">
            Vectorizer.AI charges $9.99 for only 100 credits. VectorForge gives you flat unlimited.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free Tier */}
          <div className="p-6 rounded-2xl bg-surface-200 border border-surface-border space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Free</span>
              <div className="text-3xl font-bold text-white">$0</div>
              <p className="text-xs text-neutral-400">Essential vectorizer for quick casual exports.</p>
              <ul className="space-y-2 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> 100 conversions / month
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Standard SVG export
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Up to 2,000px resolution
                </li>
              </ul>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl bg-surface-100 hover:bg-surface-50 border border-surface-border text-xs font-semibold text-white transition-all"
            >
              Get Started Free
            </button>
          </div>

          {/* Pro Tier (Featured) */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-surface-100 to-surface-200 border-2 border-brand-accent space-y-5 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-accent text-white text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </div>
            <div className="space-y-4">
              <span className="text-xs font-semibold text-brand-accent uppercase tracking-wider">Pro</span>
              <div className="text-3xl font-bold text-white">
                $9 <span className="text-xs font-normal text-neutral-400">/ month</span>
              </div>
              <p className="text-xs text-neutral-300">Unlimited high-fidelity vector synthesis for designers.</p>
              <ul className="space-y-2 text-xs text-neutral-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Unlimited conversions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> All formats (SVG, PDF, EPS, DXF)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Figma-Ready layer export
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Up to 8,000px resolution
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Symmetry & Grid Snapping
                </li>
              </ul>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl bg-brand-accent hover:bg-brand-accentHover text-xs font-semibold text-white shadow-lg shadow-indigo-950/50 transition-all"
            >
              Start Unlimited Pro
            </button>
          </div>

          {/* Studio Tier */}
          <div className="p-6 rounded-2xl bg-surface-200 border border-surface-border space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Studio</span>
              <div className="text-3xl font-bold text-white">
                $29 <span className="text-xs font-normal text-neutral-400">/ month</span>
              </div>
              <p className="text-xs text-neutral-400">For agencies, batch workflows, and automation APIs.</p>
              <ul className="space-y-2 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Everything in Pro
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Batch folder processing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> 5,000 API calls / month
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" /> Priority processing queue
                </li>
              </ul>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl bg-surface-100 hover:bg-surface-50 border border-surface-border text-xs font-semibold text-white transition-all"
            >
              Get Studio
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border/60 bg-surface-300/60 py-8 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
            <span className="font-semibold text-neutral-300">VectorForge</span>
            <span>— Precision AI Vectorization Platform</span>
          </div>
          <div>© 2026 VectorForge. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
