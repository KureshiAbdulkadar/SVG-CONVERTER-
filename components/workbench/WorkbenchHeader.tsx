'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Columns2,
  Eye,
  Sparkles,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Sliders,
  CheckCircle2,
  Clock,
  Dot,
} from 'lucide-react';
import { useWorkbenchStore } from '../../stores/workbench-store';

export function WorkbenchHeader() {
  const {
    fileName,
    outputSvg,
    isProcessing,
    meta,
    historyIndex,
    history,
    viewMode,
    showNodes,
    zoom,
    undo,
    redo,
    setViewMode,
    toggleShowNodes,
    setZoom,
    resetView,
    setExportModalOpen,
    setFeedbackModalOpen,
  } = useWorkbenchStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <header className="h-14 bg-surface-200 border-b border-surface-border px-4 flex items-center justify-between select-none z-30">
      {/* Left Section: Back, Title, Meta */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-100 transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit</span>
        </Link>

        <div className="h-4 w-px bg-surface-border" />

        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-white tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            {fileName}
          </span>

          {meta && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-50 text-neutral-300 font-mono border border-surface-border">
              {meta.imageType.toUpperCase()} · {meta.width}×{meta.height}
            </span>
          )}

          {isProcessing ? (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3 animate-spin" /> Vectorizing...
            </span>
          ) : meta ? (
            <span className="flex items-center gap-1 text-[11px] text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> {meta.processingTimeMs}ms
            </span>
          ) : null}
        </div>
      </div>

      {/* Middle Section: Undo/Redo, View Mode, Node Toggle, Zoom */}
      <div className="flex items-center gap-1.5 bg-surface-100 p-1 rounded-xl border border-surface-border">
        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Cmd+Shift+Z)"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-surface-border mx-1" />

        {/* View Modes */}
        <button
          onClick={() => setViewMode('split')}
          title="Split Compare View"
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            viewMode === 'split'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-surface-50'
          }`}
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span>Compare</span>
        </button>

        <button
          onClick={() => setViewMode('vector')}
          title="Vector Result View"
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            viewMode === 'vector'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-surface-50'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Vector</span>
        </button>

        <button
          onClick={() => setViewMode('original')}
          title="Original Raster View"
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            viewMode === 'original'
              ? 'bg-brand-accent text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-surface-50'
          }`}
        >
          <span>Original</span>
        </button>

        <div className="h-4 w-px bg-surface-border mx-1" />

        {/* Node Points Toggle */}
        <button
          onClick={toggleShowNodes}
          title="Toggle Anchor Points Inspector"
          className={`px-2 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1 ${
            showNodes
              ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-surface-50'
          }`}
        >
          <Dot className="w-4 h-4 text-brand-400 -mr-1" />
          <span>Nodes</span>
        </button>

        <div className="h-4 w-px bg-surface-border mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 text-xs text-neutral-400 font-mono">
          <button
            onClick={() => setZoom(zoom - 0.2)}
            className="p-1 hover:text-white hover:bg-surface-50 rounded"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(zoom + 0.2)}
            className="p-1 hover:text-white hover:bg-surface-50 rounded"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            title="Fit to View (100%)"
            className="p-1 hover:text-white hover:bg-surface-50 rounded ml-0.5"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right Section: Rate, Reprocess & Export */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFeedbackModalOpen(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-surface-100 border border-surface-border transition-colors flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Rate Result</span>
        </button>

        <button
          onClick={() => setExportModalOpen(true)}
          disabled={!outputSvg || isProcessing}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-brand-accent to-indigo-600 hover:from-brand-accentHover hover:to-indigo-500 text-white shadow-lg shadow-indigo-950/40 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export SVG / PDF</span>
        </button>
      </div>
    </header>
  );
}
