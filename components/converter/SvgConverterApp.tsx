'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Sparkles,
  Download,
  Copy,
  Check,
  ArrowLeft,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { useWorkbenchStore, formatFileSize } from '../../stores/workbench-store';

const ROTATING_MESSAGES = [
  'Reading your image…',
  'Finding edges…',
  'Tracing shapes…',
  'Building your SVG…',
  'Almost there…',
];

export function SvgConverterApp() {
  const {
    appState,
    errorMessage,
    fileName,
    imageDataUrl,
    imageWidth,
    imageHeight,
    outputSvg,
    svgBlobUrl,
    svgSizeBytes,
    splitPosition,
    copiedToast,
    convertFile,
    reset,
    setSplitPosition,
    copySvg,
    downloadSvg,
  } = useWorkbenchStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderFrameRef = useRef<HTMLDivElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [statusMessageIndex, setStatusMessageIndex] = useState(0);

  // Rotating status message during conversion
  useEffect(() => {
    if (appState !== 'converting') return;
    setStatusMessageIndex(0);
    const interval = setInterval(() => {
      setStatusMessageIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [appState]);

  // Global Clipboard Paste Support (Cmd+V / Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (appState === 'converting') return;
      if (e.clipboardData?.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              convertFile(file);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [appState, convertFile]);

  // Handle Drag-and-Drop for File Upload
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (appState === 'idle') {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (appState === 'converting') return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      convertFile(e.dataTransfer.files[0]);
    }
  };

  // Compare Slider Drag Handling (Mouse & Touch)
  const updateSplitFromClientX = useCallback(
    (clientX: number) => {
      if (!sliderFrameRef.current) return;
      const rect = sliderFrameRef.current.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const pct = (offsetX / rect.width) * 100;
      setSplitPosition(pct);
    },
    [setSplitPosition]
  );

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSlider(true);
  };

  const handleSliderTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingSlider(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) {
        updateSplitFromClientX(e.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSlider(false);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider && e.touches[0]) {
        updateSplitFromClientX(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      setIsDraggingSlider(false);
    };

    if (isDraggingSlider) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingSlider, updateSplitFromClientX]);

  // Keyboard accessibility for compare slider
  const handleSliderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSplitPosition(Math.max(0, splitPosition - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSplitPosition(Math.min(100, splitPosition + 5));
    }
  };

  // Safe SVG filename format
  const cleanSvgName = fileName ? fileName.replace(/\.[^/.]+$/, '') + '.svg' : 'vector.svg';
  const aspectRatio = imageWidth && imageHeight ? imageWidth / imageHeight : 1;

  return (
    <main className="min-h-screen w-full bg-[#0a0a0c] text-white flex flex-col justify-between selection:bg-indigo-600 selection:text-white relative overflow-hidden">
      {/* Soft ambient background radial glow (No heavy grid canvas) */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      {/* ── TOP HEADER ── */}
      <header className="h-16 px-6 sm:px-8 border-b border-white/[0.06] flex items-center justify-between z-20">
        {/* Top-left: Minimal Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-950/40">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-white">
            VectorForge
          </span>
        </div>

        {/* When Done: Filename & File Size pill */}
        {appState === 'done' && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400">
              <span className="font-medium text-neutral-200 truncate max-w-[200px]">
                {cleanSvgName}
              </span>
              <span className="w-1 h-1 rounded-full bg-neutral-600" />
              <span className="font-mono text-neutral-400">
                {formatFileSize(svgSizeBytes)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copySvg}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Copy SVG code"
              >
                {copiedToast ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Copy SVG</span>
                  </>
                )}
              </button>

              <button
                onClick={downloadSvg}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-white text-black hover:bg-neutral-200 transition-all shadow-md active:scale-95 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download SVG</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── HIDDEN FILE INPUT ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/bmp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            convertFile(e.target.files[0]);
          }
        }}
      />

      {/* ── SCREEN 1: UPLOAD (EMPTY STATE) ── */}
      {appState === 'idle' && (
        <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 z-10 animate-in fade-in duration-200">
          <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center">
            {/* Headline & Subtext */}
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              Turn any image into a clean SVG
            </h1>
            <p className="text-neutral-400 text-sm sm:text-base font-normal mb-8 max-w-md">
              Drop a PNG or JPG here, or click to browse
            </p>

            {/* Centered Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full p-10 sm:p-14 rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-5 text-center ${
                isDraggingFile
                  ? 'border-indigo-400 bg-indigo-950/20 scale-[1.01]'
                  : 'border-white/[0.12] bg-[#0e0e13]/70 hover:bg-[#13131a] hover:border-white/25 shadow-2xl'
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              aria-label="Drop zone for image files"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-neutral-300 shadow-inner">
                <Upload className="w-6 h-6 text-indigo-400" />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {isDraggingFile ? 'Drop to convert' : 'Drop your file here'}
                </p>
                <p className="text-xs text-neutral-400">
                  Supports PNG, JPG, WebP · Up to 25 MB
                </p>
              </div>

              {/* Single Primary Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-2 px-6 py-2.5 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 transition-all shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Choose image
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── SCREEN 2: CONVERTING (THE MAGIC MOMENT) ── */}
      {appState === 'converting' && (
        <section className="flex-1 flex flex-col items-center justify-center px-6 py-8 z-10 animate-in fade-in duration-200">
          <div className="flex flex-col items-center text-center max-w-2xl w-full">
            {/* Centered Preview with GPU-Composited Scanning Line */}
            <div
              className="relative max-h-[55vh] max-w-[85vw] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#0e0e14] flex items-center justify-center"
              style={{
                aspectRatio: aspectRatio,
                width: imageWidth && imageHeight ? `${Math.min(imageWidth, 540)}px` : '420px',
                height: 'auto',
              }}
            >
              {imageDataUrl && (
                <img
                  src={imageDataUrl}
                  alt="Processing image"
                  className="w-full h-full object-contain pointer-events-none opacity-90 transition-opacity"
                />
              )}

              {/* GPU-Composited Scanning Line Overlay */}
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                aria-hidden="true"
              >
                <div className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent -translate-y-full animate-scan-line">
                  <div className="absolute bottom-1/2 left-0 right-0 h-[2px] bg-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.9)]" />
                </div>
              </div>
            </div>

            {/* Rotating Status Text */}
            <div className="mt-8 space-y-3 flex flex-col items-center">
              <p
                className="text-sm font-medium text-neutral-200 tracking-wide transition-all duration-300"
                aria-live="polite"
              >
                {ROTATING_MESSAGES[statusMessageIndex]}
              </p>

              {/* Indeterminate Shimmer Progress Bar */}
              <div className="w-56 h-1 rounded-full bg-white/[0.08] overflow-hidden relative">
                <div className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── SCREEN 3: DONE (RESULT) ── */}
      {appState === 'done' && (
        <section className="flex-1 flex flex-col items-center justify-between px-6 py-6 z-10 animate-in fade-in duration-300">
          <div className="flex-1 w-full flex items-center justify-center my-auto">
            {/* Interactive Before/After Compare Viewport */}
            <div
              ref={sliderFrameRef}
              onClick={(e) => updateSplitFromClientX(e.clientX)}
              className="relative max-h-[66vh] max-w-[90vw] rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/10 bg-checkerboard flex items-center justify-center cursor-ew-resize select-none"
              style={{
                aspectRatio: aspectRatio,
                width: imageWidth && imageHeight ? `${Math.min(imageWidth, 800)}px` : '600px',
                height: 'auto',
              }}
              role="slider"
              tabIndex={0}
              aria-label="Before and after comparison slider"
              aria-valuenow={Math.round(splitPosition)}
              aria-valuemin={0}
              aria-valuemax={100}
              onKeyDown={handleSliderKeyDown}
            >
              {/* Left Side: Original Image (Before) */}
              {imageDataUrl && (
                <img
                  src={imageDataUrl}
                  alt="Original image preview"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{
                    clipPath: `polygon(0% 0%, ${splitPosition}% 0%, ${splitPosition}% 100%, 0% 100%)`,
                  }}
                />
              )}

              {/* Right Side: Clean Vector SVG (After) via Blob URL (Never freezes DOM) */}
              {svgBlobUrl && (
                <img
                  src={svgBlobUrl}
                  alt="Vectorized SVG preview"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{
                    clipPath: `polygon(${splitPosition}% 0%, 100% 0%, 100% 100%, ${splitPosition}% 100%)`,
                  }}
                />
              )}

              {/* Draggable Vertical Handle */}
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-auto"
                style={{ left: `${splitPosition}%` }}
              >
                {/* Thin divider line */}
                <div className="absolute top-0 bottom-0 -left-px w-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]" />

                {/* Touch/Mouse Handle Thumb */}
                <div
                  onMouseDown={handleSliderMouseDown}
                  onTouchStart={handleSliderTouchStart}
                  className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-black shadow-xl flex items-center justify-center cursor-ew-resize hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <div className="flex gap-0.5 items-center">
                    <div className="w-[1.5px] h-3 bg-neutral-600 rounded-full" />
                    <div className="w-[1.5px] h-3 bg-neutral-600 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Floating Comparison Badges */}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-medium text-neutral-300 pointer-events-none border border-white/10">
                Before (PNG)
              </div>
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-medium text-neutral-300 pointer-events-none border border-white/10">
                After (SVG)
              </div>
            </div>
          </div>

          {/* Action Row & Return Link (At most 3 actions) */}
          <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 pt-4">
            <div className="w-full flex items-center justify-center gap-3">
              <button
                onClick={copySvg}
                className="flex-1 py-2.5 px-4 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {copiedToast ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neutral-400" />
                    <span>Copy SVG</span>
                  </>
                )}
              </button>

              <button
                onClick={downloadSvg}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs sm:text-sm font-semibold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <Download className="w-4 h-4" />
                <span>Download SVG</span>
              </button>
            </div>

            <button
              onClick={reset}
              className="text-xs text-neutral-400 hover:text-white transition-colors underline-offset-4 hover:underline py-1"
            >
              Convert another image
            </button>
          </div>
        </section>
      )}

      {/* ── ERROR STATE ── */}
      {appState === 'error' && (
        <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 z-10 animate-in fade-in duration-200">
          <div className="w-full max-w-md mx-auto flex flex-col items-center text-center p-8 rounded-3xl bg-[#0e0e13] border border-white/10 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-white mb-2">
              Conversion failed
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mb-6 leading-relaxed">
              {errorMessage || "We couldn't convert this image. Please try a PNG or JPG under 25 MB."}
            </p>

            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 transition-all shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Try another image
            </button>
          </div>
        </section>
      )}

      {/* ── FOOTER (Empty & Subtle) ── */}
      <footer className="h-10 px-6 flex items-center justify-between text-[11px] text-neutral-600 border-t border-white/[0.04]">
        <span>VectorForge</span>
        <span>Local in-browser conversion · 100% Private</span>
      </footer>
    </main>
  );
}
