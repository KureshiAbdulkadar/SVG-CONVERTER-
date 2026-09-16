'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useWorkbenchStore } from '../../stores/workbench-store';
import {
  Layers,
  Sparkles,
  Zap,
  Palette,
  Maximize,
  SlidersHorizontal,
  Dot,
  Check,
  Scan,
  Columns2,
  Eye,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Download,
} from 'lucide-react';
import { downloadBlob, exportVectorFile } from '../../lib/exporters';

export function CanvasView() {
  const {
    imageDataUrl,
    outputSvg,
    imageWidth,
    imageHeight,
    isProcessing,
    viewMode,
    splitPosition,
    zoom,
    pan,
    showNodes,
    layers,
    parameters,
    selectedLayerId,
    selectedPathId,
    hoveredPathId,
    isLayersOpen,
    isParamsOpen,
    copiedToast,
    meta,
    fileName,
    setSplitPosition,
    setZoom,
    setPan,
    setViewMode,
    toggleShowNodes,
    toggleLayersPanel,
    toggleParamsPanel,
    applyPreset,
    updateParam,
    setSelectedPath,
    setHoveredPath,
    setCopiedToast,
    setExportModalOpen,
  } = useWorkbenchStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Dynamic Scanning step text
  const [scanStep, setScanStep] = useState(0);
  const scanStages = [
    '🔬 Semantic Object Decomposition...',
    '⚡ Fitting Sub-Pixel Bezier Curves...',
    '🎨 Perceptual CIELAB Color Mapping...',
    '✨ Organizing Designer Vector Groups...',
  ];

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      setScanStep(0);
      interval = setInterval(() => {
        setScanStep((prev) => (prev + 1) % scanStages.length);
      }, 550);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Handle Dragging Split Slider
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSplit(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSplit && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const percentage = (offsetX / rect.width) * 100;
        setSplitPosition(Math.max(0, Math.min(100, percentage)));
      }

      if (isPanning) {
        setPan({
          x: pan.x + (e.clientX - startPan.x),
          y: pan.y + (e.clientY - startPan.y),
        });
        setStartPan({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSplit(false);
      setIsPanning(false);
    };

    if (isDraggingSplit || isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplit, isPanning, startPan, pan, setSplitPosition, setPan]);

  // Handle Pan start
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true);
      setStartPan({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(zoom * zoomFactor);
    }
  };

  const handleCopySvg = async () => {
    if (!outputSvg) return;
    await navigator.clipboard.writeText(outputSvg);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
      className="relative flex-1 h-full bg-[#070709] overflow-hidden select-none cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: `
          linear-gradient(to right, #141419 1px, transparent 1px),
          linear-gradient(to bottom, #141419 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }}
    >
      {/* Centered Vector Canvas */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <div
          className="relative pointer-events-auto transition-transform duration-75 shadow-[0_25px_70px_rgba(0,0,0,0.85)] rounded-2xl overflow-hidden border border-surface-border bg-surface-300"
          style={{
            width: `${imageWidth || 400}px`,
            height: `${imageHeight || 400}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* 1. ORIGINAL IMAGE */}
          {imageDataUrl && (viewMode === 'split' || viewMode === 'original') && (
            <img
              src={imageDataUrl}
              alt="Original"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{
                imageRendering: zoom > 2 ? 'pixelated' : 'auto',
                clipPath:
                  viewMode === 'split'
                    ? `polygon(0% 0%, ${splitPosition}% 0%, ${splitPosition}% 100%, 0% 100%)`
                    : 'none',
              }}
            />
          )}

          {/* 2. VECTOR SVG */}
          {outputSvg && (viewMode === 'split' || viewMode === 'vector') && (
            <div
              className="absolute inset-0 w-full h-full"
              style={{
                clipPath:
                  viewMode === 'split'
                    ? `polygon(${splitPosition}% 0%, 100% 0%, 100% 100%, ${splitPosition}% 100%)`
                    : 'none',
              }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: outputSvg }}
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
              />
            </div>
          )}

          {/* 3. NODE POINTS INSPECTOR */}
          {showNodes && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${imageWidth} ${imageHeight}`}
            >
              {layers.map((layer) => {
                if (!layer.visible) return null;
                return layer.paths.map((path) => {
                  const isLayerSelected = selectedLayerId === layer.id;
                  const isPathSelected = selectedPathId === path.id;
                  const isHovered = hoveredPathId === path.id;

                  return (
                    <g key={`nodes_${path.id}`}>
                      {path.points.map((pt, pIdx) => (
                        <circle
                          key={`pt_${path.id}_${pIdx}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={isPathSelected || isHovered ? 3.2 : isLayerSelected ? 2.4 : 1.8}
                          fill={isPathSelected ? '#f59e0b' : isLayerSelected ? '#6366f1' : '#22c55e'}
                          stroke="#ffffff"
                          strokeWidth={0.8}
                        />
                      ))}
                    </g>
                  );
                });
              })}
            </svg>
          )}

          {/* 4. HOLOGRAPHIC SCANNING LASER (when processing) */}
          {isProcessing && (
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
              <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(99,102,241,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.25)_1px,transparent_1px)] bg-[size:16px_16px] animate-pulse" />
              <div className="absolute left-0 right-0 h-28 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent -translate-y-full animate-[scanVertical_1.8s_ease-in-out_infinite]">
                <div className="absolute bottom-1/2 left-0 right-0 h-0.5 bg-cyan-300 shadow-[0_0_15px_#38bdf8,0_0_30px_#6366f1]" />
              </div>
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-2 left-2 w-4 h-2 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-2 right-2 w-4 h-2 border-b-2 border-r-2 border-cyan-400" />
            </div>
          )}

          {/* 5. COMPARE SPLIT SLIDER HANDLE */}
          {viewMode === 'split' && (
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-auto"
              style={{ left: `${splitPosition}%` }}
            >
              <div className="absolute top-0 bottom-0 -left-px w-0.5 bg-brand-accent shadow-[0_0_12px_rgba(99,102,241,0.9)]" />
              <div
                onMouseDown={handleSplitMouseDown}
                className="absolute top-1/2 -left-4 -translate-y-1/2 w-8 h-8 bg-surface-100 border-2 border-brand-accent text-brand-accent rounded-full flex items-center justify-center shadow-2xl cursor-ew-resize hover:scale-110 active:scale-95 transition-transform"
              >
                <div className="flex gap-0.5 items-center">
                  <div className="w-0.5 h-3.5 bg-brand-accent rounded-full" />
                  <div className="w-0.5 h-3.5 bg-brand-accent rounded-full" />
                </div>
              </div>
            </div>
          )}

          {/* Split Mode Floating Labels */}
          {viewMode === 'split' && (
            <>
              <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-neutral-300 pointer-events-none border border-white/10 shadow-lg">
                Original Pixel
              </div>
              <div className="absolute top-3 right-3 bg-brand-accent/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-white pointer-events-none border border-white/20 shadow-lg shadow-indigo-950/50">
                Vector SVG
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Laser Scanning Progress HUD */}
      {isProcessing && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 bg-surface-100/95 backdrop-blur-xl border border-cyan-500/40 px-5 py-2.5 rounded-full shadow-[0_10px_40px_rgba(56,189,248,0.2)] flex items-center gap-3 animate-bounce">
          <Scan className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-xs font-semibold text-white tracking-wide">
            {scanStages[scanStep]}
          </span>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        </div>
      )}

      {/* Floating Copied Celebration Toast */}
      {copiedToast && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 bg-emerald-950/90 backdrop-blur-xl border border-emerald-500/50 px-5 py-2.5 rounded-full shadow-[0_10px_40px_rgba(16,185,129,0.3)] flex items-center gap-2.5 text-xs font-semibold text-emerald-300 animate-in zoom-in-95 duration-150">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Vector SVG code copied! Paste anywhere in Figma (`Cmd+V`).</span>
        </div>
      )}

      {/* FLOATING BOTTOM SMART DOCK (User-Friendly Quick Actions) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 max-w-[95vw] bg-surface-100/95 backdrop-blur-xl border border-surface-border rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-wrap items-center justify-center gap-1 text-xs">
        {/* Quick Style Chips */}
        <button
          onClick={() => applyPreset('sharp')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
            parameters.preset === 'sharp'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-surface-50'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Crisp Logo</span>
        </button>

        <button
          onClick={() => applyPreset('balanced')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
            parameters.preset === 'balanced'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-surface-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Balanced</span>
        </button>

        <button
          onClick={() => applyPreset('smooth')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
            parameters.preset === 'smooth'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-surface-50'
          }`}
        >
          <Palette className="w-3.5 h-3.5 text-indigo-400" />
          <span>Smooth Art</span>
        </button>

        <div className="h-4 w-px bg-surface-border mx-1" />

        {/* Quick Background Removal Toggle */}
        <button
          onClick={() => updateParam('removeBackground', !parameters.removeBackground)}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
            parameters.removeBackground
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'text-neutral-400 hover:text-white hover:bg-surface-50'
          }`}
        >
          <Maximize className="w-3.5 h-3.5" />
          <span>{parameters.removeBackground ? 'Background Removed' : 'Remove BG'}</span>
        </button>

        {/* Nodes Toggle */}
        <button
          onClick={toggleShowNodes}
          className={`px-2.5 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1 ${
            showNodes
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-surface-50'
          }`}
        >
          <Dot className="w-4 h-4 text-brand-400 -mr-1" />
          <span>Nodes</span>
        </button>

        <div className="h-4 w-px bg-surface-border mx-1" />

        {/* Layers Drawer Toggle */}
        <button
          onClick={toggleLayersPanel}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
            isLayersOpen
              ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
              : 'text-neutral-300 hover:text-white hover:bg-surface-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Layers ({layers.length})</span>
        </button>

        {/* Tuning Drawer Toggle */}
        <button
          onClick={toggleParamsPanel}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
            isParamsOpen
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-neutral-300 hover:text-white hover:bg-surface-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-brand-400" />
          <span>Tuning</span>
        </button>
      </div>
    </div>
  );
}
