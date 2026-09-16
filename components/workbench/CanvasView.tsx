'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useWorkbenchStore } from '../../stores/workbench-store';
import { Layers, Activity, FileCode, CheckCircle, RefreshCw, ZoomIn, Sparkles, Scan } from 'lucide-react';

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
    selectedLayerId,
    selectedPathId,
    hoveredPathId,
    meta,
    setSplitPosition,
    setZoom,
    setPan,
    setSelectedLayer,
    setSelectedPath,
    setHoveredPath,
  } = useWorkbenchStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Dynamic Scanning step text
  const [scanStep, setScanStep] = useState(0);
  const scanStages = [
    '🔬 Semantic Layer Decomposition...',
    '⚡ Synthesizing Sub-Pixel Bezier Curves...',
    '🎨 Perceptual CIELAB Color Mapping...',
    '✨ Constructing Designer Vector Groups...',
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
      {/* Centered Canvas Container */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <div
          className="relative pointer-events-auto transition-transform duration-75 shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden border border-surface-border bg-surface-300"
          style={{
            width: `${imageWidth || 400}px`,
            height: `${imageHeight || 400}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* 1. ORIGINAL IMAGE LAYER */}
          {imageDataUrl && (viewMode === 'split' || viewMode === 'original') && (
            <img
              src={imageDataUrl}
              alt="Original Input"
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

          {/* 2. VECTOR SVG LAYER */}
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

          {/* 3. NODE POINTS INSPECTOR OVERLAY */}
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

          {/* 4. HOLOGRAPHIC SCANNING & SHADING ANIMATION (when processing) */}
          {isProcessing && (
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
              {/* Shimmer wireframe grid */}
              <div
                className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(99,102,241,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.25)_1px,transparent_1px)] bg-[size:16px_16px] animate-pulse"
              />

              {/* Sweeping Laser Beam Horizontal with Gradient Shading */}
              <div className="absolute left-0 right-0 h-28 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent -translate-y-full animate-[scanVertical_1.8s_ease-in-out_infinite]">
                <div className="absolute bottom-1/2 left-0 right-0 h-0.5 bg-cyan-300 shadow-[0_0_15px_#38bdf8,0_0_30px_#6366f1]" />
              </div>

              {/* HUD Corner Reticles */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-2 left-2 w-4 h-2 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-2 right-2 w-4 h-2 border-b-2 border-r-2 border-cyan-400" />
            </div>
          )}

          {/* 5. SPLIT SLIDER DIVIDER LINE & HANDLE */}
          {viewMode === 'split' && (
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-auto"
              style={{ left: `${splitPosition}%` }}
            >
              {/* Divider vertical beam */}
              <div className="absolute top-0 bottom-0 -left-px w-0.5 bg-brand-accent shadow-[0_0_12px_rgba(99,102,241,0.9)]" />

              {/* Central drag pill handle */}
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
                Original Image
              </div>
              <div className="absolute top-3 right-3 bg-brand-accent/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-white pointer-events-none border border-white/20 shadow-lg shadow-indigo-950/50">
                VectorForge SVG
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Laser Scanning Status Banner */}
      {isProcessing && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 bg-surface-100/95 backdrop-blur-xl border border-cyan-500/40 px-5 py-2.5 rounded-full shadow-[0_10px_40px_rgba(56,189,248,0.2)] flex items-center gap-3 animate-bounce">
          <Scan className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-xs font-semibold text-white tracking-wide">
            {scanStages[scanStep]}
          </span>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        </div>
      )}

      {/* Bottom Floating Stats Badge */}
      {meta && (
        <div className="absolute bottom-4 left-4 z-20 bg-surface-200/90 backdrop-blur-md border border-surface-border rounded-xl px-4 py-2.5 flex items-center gap-5 shadow-2xl text-xs font-mono text-neutral-300">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Nodes:</span>
            <span className="font-semibold text-brand-400">{meta.nodesCount}</span>
          </div>
          <div className="h-3 w-px bg-surface-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Paths:</span>
            <span className="font-semibold text-white">{meta.pathsCount}</span>
          </div>
          <div className="h-3 w-px bg-surface-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Groups:</span>
            <span className="font-semibold text-indigo-400">{meta.layersCount}</span>
          </div>
          <div className="h-3 w-px bg-surface-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Size:</span>
            <span className="font-semibold text-neutral-200">
              {(meta.sizeBytes / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
