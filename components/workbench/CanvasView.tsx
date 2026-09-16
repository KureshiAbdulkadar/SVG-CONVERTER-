'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useWorkbenchStore } from '../../stores/workbench-store';
import { Layers, Activity, FileCode, CheckCircle, RefreshCw, ZoomIn } from 'lucide-react';

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
    hoveredPathId,
    meta,
    setSplitPosition,
    setZoom,
    setPan,
    setSelectedLayer,
    setHoveredPath,
  } = useWorkbenchStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

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

  const svgDataUri = outputSvg
    ? `data:image/svg+xml;utf8,${encodeURIComponent(outputSvg)}`
    : null;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
      className="relative flex-1 h-full bg-[#0a0a0d] overflow-hidden select-none cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: `
          linear-gradient(to right, #16161c 1px, transparent 1px),
          linear-gradient(to bottom, #16161c 1px, transparent 1px)
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
          className="relative pointer-events-auto transition-transform duration-75 shadow-2xl rounded-lg overflow-hidden border border-surface-border bg-surface-300"
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
              {layers.map(layer => {
                if (!layer.visible) return null;
                return layer.paths.map(path => {
                  const isLayerSelected = selectedLayerId === layer.id;
                  const isHovered = hoveredPathId === path.id;

                  return (
                    <g key={`nodes_${path.id}`}>
                      {path.points.map((pt, pIdx) => (
                        <circle
                          key={`pt_${path.id}_${pIdx}`}
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered || isLayerSelected ? 2.8 : 1.8}
                          fill={isLayerSelected ? '#6366f1' : '#22c55e'}
                          stroke="#ffffff"
                          strokeWidth={0.7}
                        />
                      ))}
                    </g>
                  );
                });
              })}
            </svg>
          )}

          {/* 4. SPLIT SLIDER DIVIDER LINE & HANDLE */}
          {viewMode === 'split' && (
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-auto"
              style={{ left: `${splitPosition}%` }}
            >
              {/* Divider vertical beam */}
              <div className="absolute top-0 bottom-0 -left-px w-0.5 bg-brand-accent shadow-[0_0_8px_rgba(99,102,241,0.8)]" />

              {/* Central drag pill handle */}
              <div
                onMouseDown={handleSplitMouseDown}
                className="absolute top-1/2 -left-3.5 -translate-y-1/2 w-7 h-7 bg-surface-100 border border-brand-accent text-brand-accent rounded-full flex items-center justify-center shadow-lg cursor-ew-resize hover:scale-110 active:scale-95 transition-transform"
              >
                <div className="flex gap-0.5 items-center">
                  <div className="w-0.5 h-3 bg-brand-accent rounded-full" />
                  <div className="w-0.5 h-3 bg-brand-accent rounded-full" />
                </div>
              </div>
            </div>
          )}

          {/* Split Mode Labels */}
          {viewMode === 'split' && (
            <>
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-neutral-300 pointer-events-none border border-white/10">
                Original Pixel
              </div>
              <div className="absolute top-3 right-3 bg-brand-accent/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white pointer-events-none border border-white/20">
                VectorForge SVG
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Processing Banner */}
      {isProcessing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-surface-100/90 backdrop-blur-md border border-brand-accent/40 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 text-brand-accent animate-spin" />
          <span className="text-xs font-medium text-white">Synthesizing Bezier Curves...</span>
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
            <span className="text-neutral-500">Layers:</span>
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
